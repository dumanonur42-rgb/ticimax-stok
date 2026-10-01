import { randomUUID } from 'node:crypto'
import { getDb } from '../db'
import { cloud, cloudError, isConnectivityError } from './client'
import type { OpReceipt, ProductInsert, ProductRow } from './database.types'
import { markOffline, markOnline, notifyOutbox, upsertLocal } from './sync'

/**
 * Offline outbox for catalogue writes.
 *
 * Every write becomes one op with a client-generated uuid, stored in SQLite *before* anything is sent.
 * Ops are sent in order through `apply_op()`, which commits the change and a receipt for that uuid in one
 * transaction, so a retry after a dropped connection gets the receipt back instead of applying the op twice.
 * An op leaves the outbox only once its receipt has arrived; the mirror is then refreshed from the rows the
 * cloud returns. While offline the mirror is patched optimistically so the screen already shows the change.
 */

export type OpKind = 'quick_entry' | 'bulk_update' | 'delete' | 'save'

export interface QuickEntryOpRow {
  sku: string
  sku_norm: string
  key_norm: string
  name_norm: string
  brand: string
  box: string
  stock: number
  mode: 'add' | 'set'
  shelf: string
  price: number | null
  description: string
  currency: string
}

export interface PatchOpRow {
  id: number
  stock?: number
  shelf?: string
  price?: number
  card_price?: number | null
  active?: boolean
}

export type OpPayload =
  | { kind: 'quick_entry'; rows: QuickEntryOpRow[] }
  | { kind: 'bulk_update'; rows: PatchOpRow[] }
  | { kind: 'delete'; ids: number[] }
  | { kind: 'save'; row: ProductInsert }

export type SubmitResult = { status: 'applied'; receipt: OpReceipt } | { status: 'queued' }

interface OutboxRow {
  seq: number
  id: string
  user_id: string
  kind: OpKind
  payload: string
  attempts: number
  failed: number
  error: string | null
}

/** Server-side transient errors (timeouts, deadlocks, 5xx) tolerated before an op is parked as failed; connectivity failures never count. */
const MAX_ATTEMPTS = 8

let currentUser: string | null = null
let flushing: Promise<Map<string, OpReceipt>> | null = null
let retryTimer: NodeJS.Timeout | null = null

export function setOutboxUser(userId: string | null): void {
  currentUser = userId
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
}

export function outboxCounts(): { pending: number; failed: number } {
  if (!currentUser) return { pending: 0, failed: 0 }
  const r = getDb()
    .prepare('SELECT SUM(failed = 0) pending, SUM(failed = 1) failed FROM outbox WHERE user_id = ?')
    .get(currentUser) as { pending: number | null; failed: number | null }
  return { pending: r.pending ?? 0, failed: r.failed ?? 0 }
}

export function discardFailedOps(): number {
  if (!currentUser) return 0
  const n = getDb().prepare('DELETE FROM outbox WHERE user_id = ? AND failed = 1').run(currentUser).changes
  notifyOutbox()
  return n
}

/** After a full mirror rebuild the optimistic changes are gone; put the still-waiting ops back on top. */
export function reapplyPending(): void {
  if (!currentUser) return
  const rows = getDb()
    .prepare('SELECT id, kind, payload FROM outbox WHERE user_id = ? AND failed = 0 ORDER BY seq')
    .all(currentUser) as Pick<OutboxRow, 'id' | 'kind' | 'payload'>[]
  for (const op of rows) applyLocal({ kind: op.kind, ...JSON.parse(op.payload) } as OpPayload, op.id)
}

/** Store the op, show it locally, then try to send everything that is waiting. */
export async function submit(payload: OpPayload): Promise<SubmitResult> {
  if (!currentUser) throw new Error('Oturum açılmamış.')
  const { kind, ...body } = payload
  const id = randomUUID()
  const db = getDb()
  db.transaction(() => {
    db.prepare('INSERT INTO outbox(id, user_id, kind, payload, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      currentUser,
      kind,
      JSON.stringify(body),
      new Date().toISOString()
    )
    applyLocal(payload, id)
  })()
  const done = await flush()
  const receipt = done.get(id)
  if (receipt) return { status: 'applied', receipt }
  const row = db.prepare('SELECT failed, error FROM outbox WHERE id = ?').get(id) as { failed: number; error: string | null } | undefined
  if (row?.failed) {
    db.prepare('DELETE FROM outbox WHERE id = ?').run(id)
    notifyOutbox()
    throw new Error(row.error ?? 'Kayıt sunucu tarafından reddedildi.')
  }
  notifyOutbox()
  return { status: 'queued' }
}

/**
 * Send waiting ops oldest-first. Stops at the first connectivity problem (retried later); an op the cloud
 * rejects outright is parked as failed and the rest continue. Returns the receipts obtained in this run.
 */
export function flush(): Promise<Map<string, OpReceipt>> {
  if (flushing) return flushing
  flushing = (async () => {
    const done = new Map<string, OpReceipt>()
    if (!currentUser) return done
    const db = getDb()
    const sb = cloud()
    const queued = db
      .prepare('SELECT id FROM outbox WHERE user_id = ? AND failed = 0 ORDER BY seq')
      .all(currentUser) as Pick<OutboxRow, 'id'>[]
    if (!queued.length) return done
    // Never let a queued op go out with the anonymous key (the cloud would refuse it for good): wait for a session.
    const auth = await sb.auth.getSession()
    if (!auth.data.session) {
      markOffline(auth.error ? cloudError(auth.error).message : 'Oturum süresi doldu, lütfen yeniden giriş yapın.')
      scheduleRetry()
      return done
    }
    for (const { id } of queued) {
      // Re-read right before sending: an earlier op in this run may have rewritten this payload's temp ids.
      const op = db.prepare('SELECT * FROM outbox WHERE id = ? AND failed = 0').get(id) as OutboxRow | undefined
      if (!op) continue
      const payload = JSON.parse(op.payload) as Record<string, unknown>
      const { data, error } = await sb.rpc('apply_op', { p_id: op.id, p_kind: op.kind, p_payload: payload })
      if (!error && data) {
        const full = { kind: op.kind, ...payload } as OpPayload
        db.transaction(() => {
          db.prepare('DELETE FROM outbox WHERE id = ?').run(op.id)
          if (full.kind === 'delete') dropLocal(full.ids)
          upsertLocal(data.rows)
          promoteTempIds(full, op.id, data.rows)
        })()
        done.set(op.id, data)
        continue
      }
      const message = error ? cloudError(error).message : 'Sunucudan yanıt alınamadı.'
      if (error && isConnectivityError(error)) {
        // Nothing reached the server (or its answer was lost): keep the op untouched and try again later.
        db.prepare('UPDATE outbox SET error = ? WHERE id = ?').run(message, op.id)
        markOffline(message)
        scheduleRetry()
        break
      }
      const permanent = !!error && isPermanent(error.code)
      const attempts = op.attempts + 1
      const park = permanent || attempts >= MAX_ATTEMPTS
      db.prepare('UPDATE outbox SET attempts = ?, failed = ?, error = ? WHERE id = ?').run(attempts, park ? 1 : 0, message, op.id)
      if (park) {
        await revertLocal({ kind: op.kind, ...payload } as OpPayload, op.id).catch(() => undefined)
        continue
      }
      markOffline(message)
      scheduleRetry()
      break
    }
    if (done.size) {
      if (done.size === queued.length) markOnline()
      else notifyOutbox()
    }
    return done
  })().finally(() => {
    flushing = null
  })
  return flushing
}

/** SQLSTATE classes that will not succeed on retry: data / integrity / syntax-privilege errors and `raise exception`. */
function isPermanent(code: string): boolean {
  return /^(22|23|42|P0)/.test(code)
}

function scheduleRetry(): void {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    flush().catch(() => undefined)
  }, 15_000)
}

function dropLocal(ids: number[]): void {
  const del = getDb().prepare('DELETE FROM products WHERE id = ?')
  for (const id of ids) del.run(id)
}

/** The cloud refused a parked op: drop its provisional rows and re-read the products it touched. */
async function revertLocal(payload: OpPayload, opId: string): Promise<void> {
  const ids: number[] = []
  const keys: string[] = []
  switch (payload.kind) {
    case 'quick_entry':
      payload.rows.forEach((r, i) => {
        ids.push(tempId(opId, i))
        keys.push(r.key_norm)
      })
      break
    case 'bulk_update':
      ids.push(...payload.rows.map((r) => r.id))
      break
    case 'delete':
      ids.push(...payload.ids)
      break
    case 'save':
      ids.push(payload.row.id || tempId(opId, 0))
      keys.push(payload.row.key_norm)
      break
  }
  dropLocal(ids.filter((id) => id < 0))
  const sb = cloud()
  const real = ids.filter((id) => id > 0)
  const rows: ProductRow[] = []
  if (real.length) {
    const r = await sb.from('products').select('*').in('id', real)
    if (r.data) rows.push(...r.data)
  }
  if (keys.length) {
    const r = await sb.from('products').select('*').in('key_norm', keys)
    if (r.data) rows.push(...r.data)
  }
  upsertLocal(rows)
}

/**
 * Once the cloud has assigned real ids to rows this op created, later ops that were queued offline against the
 * provisional ids (edit/delete of a product that did not exist yet) are rewritten to the real ones.
 */
function promoteTempIds(payload: OpPayload, opId: string, rows: ProductRow[]): void {
  const map = new Map<number, number>()
  const byKey = new Map(rows.map((r) => [r.key_norm, r.id]))
  if (payload.kind === 'quick_entry') {
    payload.rows.forEach((r, i) => {
      const real = byKey.get(r.key_norm)
      if (real !== undefined) map.set(tempId(opId, i), real)
    })
  } else if (payload.kind === 'save' && !(payload.row.id && payload.row.id > 0)) {
    const real = byKey.get(payload.row.key_norm)
    if (real !== undefined) map.set(payload.row.id || tempId(opId, 0), real)
  }
  if (!map.size) return
  const db = getDb()
  const pending = db
    .prepare('SELECT id, kind, payload FROM outbox WHERE user_id = ? AND failed = 0 ORDER BY seq')
    .all(currentUser) as Pick<OutboxRow, 'id' | 'kind' | 'payload'>[]
  const upd = db.prepare('UPDATE outbox SET payload = ? WHERE id = ?')
  for (const p of pending) {
    const body = { kind: p.kind, ...JSON.parse(p.payload) } as OpPayload
    let changed = false
    const fix = (id: number): number => {
      const real = map.get(id)
      if (real === undefined) return id
      changed = true
      return real
    }
    if (body.kind === 'bulk_update') body.rows.forEach((r) => (r.id = fix(r.id)))
    else if (body.kind === 'delete') body.ids = body.ids.map(fix)
    else if (body.kind === 'save' && body.row.id !== undefined && body.row.id < 0) body.row.id = fix(body.row.id)
    if (!changed) continue
    const { kind: _k, ...rest } = body
    upd.run(JSON.stringify(rest), p.id)
  }
}

/** Ids for rows that exist only locally until the cloud assigns real ones; negative so they never collide. */
function tempId(opId: string, i: number): number {
  let h = 0
  for (const c of opId) h = (h * 31 + c.charCodeAt(0)) | 0
  return -(Math.abs(h % 1_000_000) * 1000 + i + 1)
}

/** Optimistic mirror update, replaced by the cloud's rows once the op is acknowledged. */
function applyLocal(payload: OpPayload, opId: string): void {
  const db = getDb()
  const now = new Date().toISOString()
  const insertNew = (id: number, p: ProductInsert): void => {
    const row: ProductRow = {
      id,
      sku: p.sku,
      sku_norm: p.sku_norm,
      key_norm: p.key_norm,
      name: p.name,
      name_norm: p.name_norm,
      brand: p.brand,
      category: p.category,
      type: p.type,
      seal: p.seal,
      d_inner: p.d_inner,
      d_outer: p.d_outer,
      width: p.width,
      stock: p.stock,
      unit: p.unit,
      price: p.price,
      currency: p.currency,
      list_price: p.list_price,
      card_price: p.card_price,
      min_order: p.min_order,
      shelf: p.shelf,
      box: p.box,
      barcode: p.barcode,
      image: p.image,
      description: p.description,
      equivalents: p.equivalents,
      active: p.active,
      deleted: false,
      updated_at: now
    }
    upsertLocal([row])
  }
  switch (payload.kind) {
    case 'quick_entry': {
      const byKey = db.prepare('SELECT id, stock FROM products WHERE key_norm = ?')
      const upd = db.prepare(
        `UPDATE products SET stock = ?, shelf = CASE WHEN ? <> '' THEN ? ELSE shelf END, price = COALESCE(?, price), active = 1, updated_at = ? WHERE id = ?`
      )
      payload.rows.forEach((r, i) => {
        const cur = byKey.get(r.key_norm) as { id: number; stock: number } | undefined
        if (cur) {
          upd.run(r.mode === 'set' ? r.stock : Number(cur.stock) + r.stock, r.shelf, r.shelf, r.price, now, cur.id)
          return
        }
        insertNew(tempId(opId, i), {
          sku: r.sku,
          sku_norm: r.sku_norm,
          key_norm: r.key_norm,
          name: r.sku,
          name_norm: r.name_norm,
          brand: r.brand,
          category: '',
          type: '',
          seal: '',
          d_inner: null,
          d_outer: null,
          width: null,
          stock: r.stock,
          unit: 'Adet',
          price: r.price ?? 0,
          currency: r.currency as ProductRow['currency'],
          list_price: null,
          card_price: null,
          min_order: 1,
          shelf: r.shelf,
          box: r.box,
          barcode: '',
          image: '',
          description: r.description,
          equivalents: '',
          active: true
        })
      })
      break
    }
    case 'bulk_update': {
      const upd = db.prepare(
        `UPDATE products SET stock = COALESCE(?, stock), shelf = COALESCE(?, shelf), price = COALESCE(?, price),
         card_price = CASE WHEN ? THEN ? ELSE card_price END, active = COALESCE(?, active), updated_at = ? WHERE id = ?`
      )
      for (const r of payload.rows) {
        upd.run(
          r.stock ?? null,
          r.shelf ?? null,
          r.price ?? null,
          'card_price' in r ? 1 : 0,
          r.card_price ?? null,
          r.active === undefined ? null : r.active ? 1 : 0,
          now,
          r.id
        )
      }
      break
    }
    case 'delete':
      dropLocal(payload.ids)
      break
    case 'save': {
      const p = payload.row
      insertNew(p.id || tempId(opId, 0), p)
      break
    }
  }
}
