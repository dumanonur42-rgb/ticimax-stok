import type { Currency, OrderStatus, PaymentType } from '@shared/types'
import { getDb, hasTable, LEGACY_TABLES } from '../db'
import { cloud, must, mustVoid } from './client'
import type { CustomerInsert, ProductInsert } from './database.types'

const BATCH = 500

interface LegacyProduct {
  sku: string
  sku_norm: string
  name: string
  name_norm: string
  brand: string
  category: string
  type: string
  seal: string
  d_inner: number | null
  d_outer: number | null
  width: number | null
  stock: number
  unit: string
  price: number
  currency: Currency
  list_price: number | null
  card_price: number | null
  min_order: number
  shelf: string
  barcode: string
  image: string
  description: string
  equivalents: string
  active: number
}

interface LegacyCustomer {
  id: number
  code: string
  name: string
  contact: string
  phone: string
  email: string
  address: string
  city: string
  tax_no: string
  tax_office: string
  discount_pct: number
  currency: Currency
  notes: string
  active: number
}

interface LegacyOrder {
  id: number
  order_no: string
  customer_id: number | null
  customer_name: string
  status: OrderStatus
  note: string
  payment: PaymentType
  currency: Currency
  subtotal: number
  discount: number
  vat_pct: number
  vat: number
  total: number
  created_by: string
  created_at: string
  updated_at: string
}

interface LegacyItem {
  order_id: number
  product_id: number | null
  sku: string
  name: string
  qty: number
  unit_price: number
  discount_pct: number
  line_total: number
}

export interface MigrationReport {
  products: number
  customers: number
  orders: number
}

/** True while the SQLite file still holds pre-cloud data that has not been uploaded. */
export function hasLegacyData(): boolean {
  const db = getDb()
  if (db.prepare("SELECT 1 FROM sync_state WHERE key = 'legacy_migrated'").get()) return false
  const cursor = db.prepare("SELECT 1 FROM sync_state WHERE key = 'products_cursor'").get()
  const legacyProducts = !cursor && (db.prepare('SELECT COUNT(*) c FROM products').get() as { c: number }).c > 0
  return legacyProducts || LEGACY_TABLES.some((t) => hasTable(db, t))
}

/** Dealer devices cannot upload anything; their old local copy is simply discarded. */
export function discardLegacyData(): void {
  const db = getDb()
  db.transaction(() => {
    for (const t of LEGACY_TABLES) db.exec(`DROP TABLE IF EXISTS ${t}`)
    if (!db.prepare("SELECT 1 FROM sync_state WHERE key = 'products_cursor'").get()) db.exec('DELETE FROM products')
    db.prepare("INSERT OR REPLACE INTO sync_state(key, value) VALUES ('legacy_migrated', ?)").run(new Date().toISOString())
  })()
}

/**
 * One-time upload of a single-machine database into the shared cloud (admin only).
 * Products/orders are only uploaded when the cloud is still empty, so a second admin
 * machine does not duplicate what the first one already sent. Customers merge by code.
 */
export async function migrateLegacyData(): Promise<MigrationReport> {
  const db = getDb()
  const sb = cloud()
  const report: MigrationReport = { products: 0, customers: 0, orders: 0 }

  const cloudProducts = await sb.from('products').select('id', { count: 'exact', head: true })
  if (cloudProducts.error) throw new Error(cloudProducts.error.message)
  const cursor = db.prepare("SELECT 1 FROM sync_state WHERE key = 'products_cursor'").get()
  if (!cursor && (cloudProducts.count ?? 0) === 0) {
    const rows = db.prepare('SELECT * FROM products').all() as LegacyProduct[]
    const seen = new Set<string>()
    const batch: ProductInsert[] = []
    for (const r of rows) {
      if (!r.sku_norm || seen.has(r.sku_norm)) continue
      seen.add(r.sku_norm)
      batch.push({
        sku: r.sku,
        sku_norm: r.sku_norm,
        name: r.name,
        name_norm: r.name_norm,
        brand: r.brand,
        category: r.category,
        type: r.type,
        seal: r.seal,
        d_inner: r.d_inner,
        d_outer: r.d_outer,
        width: r.width,
        stock: r.stock,
        unit: r.unit,
        price: r.price,
        currency: r.currency,
        list_price: r.list_price,
        card_price: r.card_price,
        min_order: r.min_order,
        shelf: r.shelf,
        barcode: r.barcode,
        image: r.image,
        description: r.description,
        equivalents: r.equivalents,
        active: !!r.active,
        deleted: false
      })
    }
    for (let i = 0; i < batch.length; i += BATCH) {
      mustVoid(await sb.from('products').upsert(batch.slice(i, i + BATCH), { onConflict: 'sku_norm' }))
    }
    report.products = batch.length
  }

  const customerIds = new Map<number, number>()
  if (hasTable(db, 'customers')) {
    const rows = db.prepare('SELECT * FROM customers').all() as LegacyCustomer[]
    const existing = must(await sb.from('customers').select('id, code'))
    const byCode = new Map(existing.map((c) => [c.code, c.id]))
    const fresh: CustomerInsert[] = []
    for (const r of rows) {
      const id = byCode.get(r.code)
      if (id !== undefined) {
        customerIds.set(r.id, id)
        continue
      }
      fresh.push({
        code: r.code,
        name: r.name,
        contact: r.contact,
        phone: r.phone,
        email: r.email,
        address: r.address,
        city: r.city,
        tax_no: r.tax_no,
        tax_office: r.tax_office,
        discount_pct: r.discount_pct,
        currency: r.currency,
        notes: r.notes,
        active: !!r.active
      })
    }
    if (fresh.length) {
      const created = must(await sb.from('customers').insert(fresh).select('id, code'))
      const createdByCode = new Map(created.map((c) => [c.code, c.id]))
      for (const r of rows) {
        const id = createdByCode.get(r.code)
        if (id !== undefined) customerIds.set(r.id, id)
      }
      report.customers = created.length
    }
  }

  if (hasTable(db, 'orders') && hasTable(db, 'order_items')) {
    const cloudOrders = await sb.from('orders').select('id', { count: 'exact', head: true })
    if (cloudOrders.error) throw new Error(cloudOrders.error.message)
    if ((cloudOrders.count ?? 0) === 0) {
      const orders = db.prepare('SELECT * FROM orders ORDER BY id').all() as LegacyOrder[]
      const items = db.prepare('SELECT * FROM order_items ORDER BY id').all() as LegacyItem[]
      const skuIds = new Map<string, number>()
      if (items.length) {
        const skus = [...new Set(items.map((i) => i.sku))]
        for (let i = 0; i < skus.length; i += BATCH) {
          const found = must(await sb.from('products').select('id, sku').in('sku', skus.slice(i, i + BATCH)))
          for (const p of found) skuIds.set(p.sku, p.id)
        }
      }
      for (const o of orders) {
        const created = must(
          await sb
            .from('orders')
            .insert({
              order_no: o.order_no,
              customer_id: o.customer_id === null ? null : (customerIds.get(o.customer_id) ?? null),
              customer_name: o.customer_name,
              status: o.status,
              note: o.note,
              payment: o.payment,
              currency: o.currency,
              subtotal: o.subtotal,
              discount: o.discount,
              vat_pct: o.vat_pct,
              vat: o.vat,
              total: o.total,
              created_by: o.created_by,
              created_at: new Date(o.created_at.replace(' ', 'T')).toISOString(),
              updated_at: new Date(o.updated_at.replace(' ', 'T')).toISOString()
            })
            .select('id')
            .single()
        )
        const lines = items
          .filter((i) => i.order_id === o.id)
          .map((i) => ({
            order_id: created.id,
            product_id: skuIds.get(i.sku) ?? null,
            sku: i.sku,
            name: i.name,
            qty: i.qty,
            unit_price: i.unit_price,
            discount_pct: i.discount_pct,
            line_total: i.line_total
          }))
        if (lines.length) mustVoid(await sb.from('order_items').insert(lines))
        report.orders++
      }
    }
  }

  db.transaction(() => {
    for (const t of LEGACY_TABLES) db.exec(`DROP TABLE IF EXISTS ${t}`)
    if (!cursor) db.exec('DELETE FROM products')
    db.prepare("INSERT OR REPLACE INTO sync_state(key, value) VALUES ('legacy_migrated', ?)").run(new Date().toISOString())
  })()
  return report
}
