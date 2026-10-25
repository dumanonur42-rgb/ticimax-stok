import type { SyncStatus, User } from '@shared/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getDb, normalizeText } from '../db'
import { pullSettings } from '../repo/settings'
import { cloud, must } from './client'
import type { OrderRow, ProductRow } from './database.types'
import { flush, outboxCounts, reapplyPending } from './outbox'

const PAGE = 1000
/** Rows per SQLite transaction; the event loop gets a turn between chunks so IPC stays responsive during big pulls. */
const CHUNK = 250
const POLL_MS = 60_000

const yieldToLoop = (): Promise<void> => new Promise((r) => setImmediate(r))

type Listener = (event: 'products' | 'orders' | 'users' | 'customers' | 'settings' | 'status', payload?: unknown) => void

let listener: Listener = () => undefined
let channel: RealtimeChannel | null = null
let timer: NodeJS.Timeout | null = null
let pulling: Promise<number> | null = null
let status: SyncStatus = { online: false, lastSync: null, productCount: 0, pending: 0, failed: 0 }
let connectionChecked = false
let onNewOrder: ((o: OrderRow) => void) | null = null
let storagePolicy = { canSeeShelf: false, hidePrices: false }

export function onSyncEvent(l: Listener): void {
  listener = l
}

export function onNewOrderRow(cb: ((o: OrderRow) => void) | null): void {
  onNewOrder = cb
}

export function setStoragePolicy(user: User, showPricesToDealers: boolean): void {
  const next = {
    canSeeShelf: user.role === 'admin' || user.role === 'ara' || user.perms.includes('shelf'),
    hidePrices: user.role !== 'admin' && !showPricesToDealers && !user.perms.includes('prices')
  }
  storagePolicy = next
}

export function syncStatus(): SyncStatus {
  return { ...status, checked: connectionChecked, ...outboxCounts(), productCount: countLocal() }
}

function setStatus(patch: Partial<SyncStatus>): void {
  if (patch.online !== undefined) connectionChecked = true
  status = { ...status, ...patch }
  listener('status', syncStatus())
}

/** A write reached the cloud (or a probe succeeded): connection is back, tell the UI and refresh lists. */
export function markOnline(): void {
  setStatus({ online: true, message: undefined })
  listener('products')
}

export function markOffline(message: string): void {
  setStatus({ online: false, message })
}

/** Outbox contents changed (queued / sent / discarded): counts in the status bar need a refresh. */
export function notifyOutbox(): void {
  listener('status', syncStatus())
  listener('products')
}

function countLocal(): number {
  return (getDb().prepare('SELECT COUNT(*) c FROM products').get() as { c: number }).c
}

function getState(key: string): string | null {
  const r = getDb().prepare('SELECT value FROM sync_state WHERE key = ?').get(key) as { value: string } | undefined
  return r?.value ?? null
}

function setState(key: string, value: string): void {
  getDb().prepare('INSERT INTO sync_state(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

const INSERT_SQL = `INSERT INTO products(id, sku, sku_norm, key_norm, name, name_norm, brand, brand_norm, category, type, seal, d_inner, d_outer, width, stock, unit,
  price, currency, list_price, card_price, min_order, shelf, box, box_norm, barcode, image, description, equivalents, eq_norm, active, updated_at)
  VALUES (@id,@sku,@sku_norm,@key_norm,@name,@name_norm,@brand,@brand_norm,@category,@type,@seal,@d_inner,@d_outer,@width,@stock,@unit,@price,
  @currency,@list_price,@card_price,@min_order,@shelf,@box,@box_norm,@barcode,@image,@description,@equivalents,@eq_norm,@active,@updated_at)`

/** Mirror a batch of cloud rows into the SQLite search cache (delete + insert keeps the FTS triggers honest). */
export function upsertLocal(rows: ProductRow[]): void {
  if (!rows.length) return
  const db = getDb()
  const delId = db.prepare('DELETE FROM products WHERE id = ?')
  const delKey = db.prepare('DELETE FROM products WHERE key_norm = ?')
  const ins = db.prepare(INSERT_SQL)
  db.transaction((batch: ProductRow[]) => {
    for (const r of batch) {
      delId.run(r.id)
      delKey.run(r.key_norm)
      if (r.deleted) continue
      ins.run({
        id: r.id,
        sku: r.sku,
        sku_norm: r.sku_norm,
        key_norm: r.key_norm,
        name: r.name,
        name_norm: r.name_norm,
        brand: r.brand,
        brand_norm: normalizeText(r.brand),
        category: r.category,
        type: r.type,
        seal: r.seal,
        d_inner: r.d_inner,
        d_outer: r.d_outer,
        width: r.width,
        stock: Number(r.stock),
        unit: r.unit,
        price: storagePolicy.hidePrices ? null : Number(r.price),
        currency: r.currency,
        list_price: storagePolicy.hidePrices || r.list_price === null ? null : Number(r.list_price),
        card_price: storagePolicy.hidePrices || r.card_price === null ? null : Number(r.card_price),
        min_order: Number(r.min_order),
        shelf: storagePolicy.canSeeShelf ? r.shelf : '',
        box: r.box,
        box_norm: normalizeText(r.box),
        barcode: r.barcode,
        image: r.image,
        description: r.description,
        equivalents: r.equivalents,
        eq_norm: normalizeText(r.equivalents),
        active: r.active ? 1 : 0,
        updated_at: r.updated_at
      })
    }
  })(rows)
}

async function upsertLocalChunked(rows: ProductRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    upsertLocal(rows.slice(i, i + CHUNK))
    await yieldToLoop()
  }
}

/** `catalog_generation` is bumped by `purge_all_products()`; a mismatch forces a full refresh so hard deletes reach every cache. */
async function cloudGeneration(): Promise<string> {
  const rows = must(await cloud().from('settings').select('value').eq('key', 'catalog_generation'))
  return rows.length ? String(rows[0].value) : '0'
}

/** Incremental pull: everything changed since the stored cursor (or all rows on first run / `full`). */
export async function pullProducts(full = false): Promise<number> {
  if (pulling) {
    const active = pulling
    const result = await active
    return full ? pullProducts(true) : result
  }
  let n = 0
  pulling = (async () => {
    const sb = cloud()
    const db = getDb()
    const generation = await cloudGeneration()
    if (generation !== (getState('catalog_generation') ?? '0')) full = true
    const storedCursor = full ? null : getState('products_cursor')
    const cursor = storedCursor ? new Date(new Date(storedCursor).getTime() - 5 * 60_000).toISOString() : null
    if (!full && getState('product_storage_policy') !== JSON.stringify(storagePolicy)) full = true
    const seenIds: number[] = []
    let last = cursor
    const fetchPage = async (after: string | null, afterId: number): Promise<ProductRow[]> => {
      let q = sb.from('products').select('*').order('updated_at').order('id').limit(PAGE)
      if (after) q = q.or(`updated_at.gt.${after},and(updated_at.eq.${after},id.gt.${afterId})`)
      return must(await q)
    }
    // The next page downloads while the current one is written, so network and SQLite work overlap.
    let next: Promise<ProductRow[]> | null = fetchPage(last, 0)
    while (next) {
      const rows = await next
      next = null
      if (!rows.length) break
      const tail = rows[rows.length - 1]
      last = tail.updated_at
      if (rows.length > 0) {
        next = fetchPage(tail.updated_at, tail.id)
        next.catch(() => undefined) // surfaces via the await above, not as an unhandled rejection
      }
      await upsertLocalChunked(rows)
      n += rows.length
      for (const r of rows) seenIds.push(r.id)
    }
    if (full) {
      // Full refresh: anything the cloud no longer returned (hard-deleted) leaves the mirror too.
      db.transaction(() => {
        db.exec('CREATE TEMP TABLE IF NOT EXISTS seen_ids (id INTEGER PRIMARY KEY)')
        db.exec('DELETE FROM seen_ids')
        const ins = db.prepare('INSERT OR IGNORE INTO seen_ids(id) VALUES (?)')
        for (const id of seenIds) ins.run(id)
        db.exec('DELETE FROM products WHERE id NOT IN (SELECT id FROM seen_ids)')
        db.exec('DELETE FROM seen_ids')
        reapplyPending()
      })()
    }
    setState('products_cursor', last ?? new Date(0).toISOString())
    setState('catalog_generation', generation)
    setState('product_storage_policy', JSON.stringify(storagePolicy))
    // FTS5 auto-merges small incremental writes; a full merge is only worth its cost after a bulk pull.
    if (full || n >= 500) db.exec("INSERT INTO products_fts(products_fts) VALUES('optimize')")
    return n
  })()
  try {
    await pulling
    setStatus({ online: true, lastSync: new Date().toISOString(), message: undefined })
    if (n > 0 || full) listener('products')
    flush().catch(() => undefined)
  } catch (e) {
    console.warn('Stok eşitleme başarısız.', e)
    setStatus({ online: false, message: undefined })
    throw e
  } finally {
    pulling = null
  }
  return n
}

export function startRealtime(): void {
  stopRealtime()
  const sb = cloud()
  channel = sb
    .channel('yamansa-b2b')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => schedulePull())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => {
      listener('orders')
      onNewOrder?.(p.new as OrderRow)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => listener('orders'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => listener('users'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => listener('customers'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
      pullSettings()
        .then(() => listener('settings'))
        .catch((error) => console.warn('Ayarlar eşitlenemedi.', error))
    })
    .subscribe((state) => {
      if (state === 'SUBSCRIBED') {
        setStatus({ online: true })
        flush().catch(() => undefined)
      } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') setStatus({ online: false })
    })
  timer = setInterval(() => {
    flush()
      .catch((error) => console.warn('Bekleyen kayıtlar gönderilemedi.', error))
      .then(() => pullProducts())
      .catch(() => undefined)
    pollOrders().catch((error) => console.warn('Siparişler eşitlenemedi.', error))
  }, POLL_MS)
}

let pullTimer: NodeJS.Timeout | null = null
function schedulePull(): void {
  if (pullTimer) clearTimeout(pullTimer)
  pullTimer = setTimeout(() => {
    pullTimer = null
    pullProducts().catch(() => undefined)
  }, 800)
}

export function stopRealtime(): void {
  if (channel) {
    cloud().removeChannel(channel).catch(() => undefined)
    channel = null
  }
  if (timer) clearInterval(timer)
  timer = null
}

/** Polling fallback for new-order notifications when the realtime socket is down. */
export async function pollOrders(): Promise<void> {
  if (!onNewOrder) return
  const seen = Number(getState('last_order_id') ?? '0')
  const rows = must(await cloud().from('orders').select('*').gt('id', seen).order('id').limit(50))
  for (const r of rows) onNewOrder(r)
  setStatus({ online: true })
}

export function markOrderSeen(id: number): void {
  const seen = Number(getState('last_order_id') ?? '0')
  if (id > seen) setState('last_order_id', String(id))
}

export function lastSeenOrderId(): number {
  return Number(getState('last_order_id') ?? '0')
}

/** Before a session starts notifying, skip everything that already exists so old orders stay quiet. */
export async function primeOrderCursor(): Promise<void> {
  const rows = must(await cloud().from('orders').select('id').order('id', { ascending: false }).limit(1))
  if (rows.length) markOrderSeen(rows[0].id)
}
