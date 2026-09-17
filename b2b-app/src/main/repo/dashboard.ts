import type { DashboardStats, FacetValue, ImportLog, Order, Product } from '@shared/types'
import { getDb } from '../db'
import { getSettings } from './settings'

export function dashboardStats(): DashboardStats {
  const db = getDb()
  const s = getSettings()
  const one = <T>(sql: string, ...p: unknown[]): T => db.prepare(sql).get(...p) as T
  const c = (sql: string, ...p: unknown[]): number => one<{ c: number }>(sql, ...p).c
  return {
    productCount: c('SELECT COUNT(*) c FROM products WHERE active=1'),
    inStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock > 0'),
    lowStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock > 0 AND stock <= ?', s.low_stock_threshold),
    outOfStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock <= 0'),
    customerCount: c('SELECT COUNT(*) c FROM customers WHERE active=1'),
    openOrders: c(`SELECT COUNT(*) c FROM orders WHERE status IN ('beklemede','onaylandi','hazirlaniyor')`),
    ordersToday: c(`SELECT COUNT(*) c FROM orders WHERE date(created_at) = date('now','localtime')`),
    brands: db
      .prepare(`SELECT brand value, COUNT(*) count FROM products WHERE active=1 AND brand<>'' GROUP BY brand ORDER BY count DESC LIMIT 8`)
      .all() as FacetValue[],
    recentOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 8').all() as Order[],
    lowStock: db
      .prepare('SELECT * FROM products WHERE active=1 AND stock > 0 AND stock <= ? ORDER BY stock, sku LIMIT 10')
      .all(s.low_stock_threshold) as Product[],
    lastImport: (db.prepare('SELECT * FROM import_logs ORDER BY id DESC LIMIT 1').get() as ImportLog) ?? null
  }
}
