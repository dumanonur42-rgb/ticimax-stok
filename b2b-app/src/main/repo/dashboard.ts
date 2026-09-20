import type { DashboardStats, FacetValue, Product } from '@shared/types'
import { cloud, must } from '../cloud/client'
import { toImportLog, toOrder } from '../cloud/map'
import { getDb } from '../db'
import { getSettings } from './settings'

/** Product figures come from the local mirror; order/user figures from the cloud (RLS scopes dealers to their own). */
export async function dashboardStats(): Promise<DashboardStats> {
  const db = getDb()
  const s = getSettings()
  const c = (sql: string, ...p: unknown[]): number => (db.prepare(sql).get(...p) as { c: number }).c
  const o = must(await cloud().rpc('dashboard_orders', { p_customer: null }))
  return {
    productCount: c('SELECT COUNT(*) c FROM products WHERE active=1'),
    inStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock > 0'),
    lowStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock > 0 AND stock <= ?', s.low_stock_threshold),
    outOfStockCount: c('SELECT COUNT(*) c FROM products WHERE active=1 AND stock <= 0'),
    customerCount: Number(o.customerCount),
    pendingUsers: Number(o.pendingUsers),
    openOrders: Number(o.openOrders),
    ordersToday: Number(o.ordersToday),
    brands: db
      .prepare(`SELECT brand value, COUNT(*) count FROM products WHERE active=1 AND brand<>'' GROUP BY brand ORDER BY count DESC LIMIT 8`)
      .all() as FacetValue[],
    recentOrders: (o.recentOrders ?? []).map((r) => toOrder(r)),
    lowStock: db
      .prepare('SELECT * FROM products WHERE active=1 AND stock > 0 AND stock <= ? ORDER BY stock, sku LIMIT 10')
      .all(s.low_stock_threshold) as Product[],
    lastImport: o.lastImport ? toImportLog(o.lastImport) : null
  }
}
