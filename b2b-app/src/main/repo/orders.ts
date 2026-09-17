import type { Order, OrderInput, OrderItem, OrderStatus } from '@shared/types'
import { getDb } from '../db'
import { adjustStock } from './products'

const round2 = (n: number): number => Math.round(n * 100) / 100

export function listOrders(opts: { q?: string; status?: OrderStatus; customer_id?: number; limit?: number }): Order[] {
  const clauses: string[] = []
  const params: unknown[] = []
  if (opts.status) {
    clauses.push('status = ?')
    params.push(opts.status)
  }
  if (opts.customer_id) {
    clauses.push('customer_id = ?')
    params.push(opts.customer_id)
  }
  if (opts.q && opts.q.trim()) {
    clauses.push('(order_no LIKE ? OR customer_name LIKE ? OR note LIKE ?)')
    const like = `%${opts.q.trim()}%`
    params.push(like, like, like)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return getDb()
    .prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC, id DESC LIMIT ?`)
    .all(...params, opts.limit ?? 500) as Order[]
}

export function getOrder(id: number): Order | null {
  const db = getDb()
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined
  if (!o) return null
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(id) as OrderItem[]
  return o
}

function nextOrderNo(): string {
  const db = getDb()
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const prefix = `SP-${ymd}-`
  const row = db
    .prepare(`SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY order_no DESC LIMIT 1`)
    .get(`${prefix}%`) as { order_no: string } | undefined
  const seq = row ? Number(row.order_no.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function createOrder(input: OrderInput, createdBy: string): Order {
  const db = getDb()
  const customer = input.customer_id
    ? (db.prepare('SELECT name FROM customers WHERE id = ?').get(input.customer_id) as { name: string } | undefined)
    : undefined

  const lines = input.items
    .filter((i) => i.qty > 0)
    .map((i) => {
      const gross = i.qty * i.unit_price
      const line_total = round2(gross * (1 - (i.discount_pct || 0) / 100))
      return { ...i, gross, line_total }
    })
  if (!lines.length) throw new Error('Sipariş en az bir kalem içermeli.')

  const gross = round2(lines.reduce((s, l) => s + l.gross, 0))
  const subtotal = round2(lines.reduce((s, l) => s + l.line_total, 0))
  const discount = round2(gross - subtotal)
  const vat = round2(subtotal * (input.vat_pct / 100))
  const total = round2(subtotal + vat)

  const tx = db.transaction((): number => {
    const r = db
      .prepare(
        `INSERT INTO orders(order_no, customer_id, customer_name, status, note, currency, subtotal, discount, vat_pct, vat, total, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        nextOrderNo(),
        input.customer_id,
        customer?.name ?? '',
        'beklemede',
        input.note ?? '',
        input.currency,
        subtotal,
        discount,
        input.vat_pct,
        vat,
        total,
        createdBy
      )
    const orderId = Number(r.lastInsertRowid)
    const ins = db.prepare(
      `INSERT INTO order_items(order_id, product_id, sku, name, qty, unit_price, discount_pct, line_total) VALUES (?,?,?,?,?,?,?,?)`
    )
    for (const l of lines) {
      ins.run(orderId, l.product_id, l.sku, l.name, l.qty, l.unit_price, l.discount_pct || 0, l.line_total)
      if (l.product_id) adjustStock(l.product_id, -l.qty)
    }
    return orderId
  })
  return getOrder(tx())!
}

export function setOrderStatus(id: number, status: OrderStatus): Order {
  const db = getDb()
  const current = getOrder(id)
  if (!current) throw new Error('Sipariş bulunamadı.')
  const tx = db.transaction(() => {
    if (status === 'iptal' && current.status !== 'iptal') {
      for (const it of current.items ?? []) if (it.product_id) adjustStock(it.product_id, it.qty)
    } else if (current.status === 'iptal' && status !== 'iptal') {
      for (const it of current.items ?? []) if (it.product_id) adjustStock(it.product_id, -it.qty)
    }
    db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(status, id)
  })
  tx()
  return getOrder(id)!
}
