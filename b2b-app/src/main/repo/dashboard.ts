import type { DashboardStats, FacetValue, ImportLog, Order, Product } from '@shared/types'
import { getDb } from '../db'
import { getSettings } from './settings'
import { pendingUserCount } from './users'

/** `customerId` scopes order figures to one dealer (dealer role). */
export function dashboardStats(customerId?: number): DashboardStats {
  const db = getDb()
  const s = getSettings()
  const one = <T>(sql: string, ...p: unknown[]): T => db.prepare(sql).get(...p) as T
  const c = (sql: string, ...p: unknown[]): number => one<{ c: number }>(sql, ...p).c
  const ow = customerId == null ? '' : 'AND customer_id = ?'
  const op = customerId == null ? [] : [customerId]
  return {
    productCount: c('SELECT COUNT(*) c FROM products WHERE active=1'),
    inStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock > 0'),
    lowStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock > 0 AND stock <= ?', s.low_stock_threshold),
    outOfStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock <= 0'),
    customerCount: c('SELECT COUNT(*) c FROM customers WHERE active=1'),
    pendingUsers: customerId == null ? pendingUserCount() : 0,
    openOrders: c(`SELECT COUNT(*) c FROM orders WHERE status IN ('beklemede','onaylandi','hazirlaniyor') ${ow}`, ...op),
    ordersToday: c(`SELECT COUNT(*) c FROM orders WHERE date(created_at) = date('now','localtime') ${ow}`, ...op),
    brands: db
      .prepare(`SELECT brand value, COUNT(*) count FROM products WHERE active=1 AND brand<>'' GROUP BY brand ORDER BY count DESC LIMIT 8`)
      .all() as FacetValue[],
    recentOrders: db.prepare(`SELECT * FROM orders WHERE 1=1 ${ow} ORDER BY created_at DESC, id DESC LIMIT 8`).all(...op) as Order[],
    lowStock: db
      .prepare('SELECT * FROM products WHERE active=1 AND stock > 0 AND stock <= ? ORDER BY stock, sku LIMIT 10')
      .all(s.low_stock_threshold) as Product[],
    lastImport: (db.prepare('SELECT * FROM import_logs ORDER BY id DESC LIMIT 1').get() as ImportLog) ?? null
  }
}
