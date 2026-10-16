import type { ApiArgs, ApiChannel, ApiResult, AppEvent } from '@shared/api'
import { hasPerm } from '@shared/perms'
import type { ActivityEvent, ActivityKind, ActivityListQuery, ActivityRow, ActivitySummary, ActivityPerson, ActivityPlatform, StockLogQuery, StockLogRow, Order, Perm, Session } from '@shared/types'
import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { discardFailedOps, flush, setOutboxUser } from './cloud/outbox'
import { cloud } from './cloud/client'
import { flushActivity, logActivity, setActivitySession } from './activity'
import { onSyncEvent, pullProducts, startRealtime, stopRealtime, syncStatus } from './cloud/sync'
import { dbPath } from './db'
import { setBackgroundMode, startAdminNotifications, stopAdminNotifications } from './notify'
import { deleteCustomer, getCustomer, listCustomers, saveCustomer, updateMyCompany } from './repo/customers'
import { dashboardStats } from './repo/dashboard'
import { orderHtml, orderToXlsx, productsToXlsx, templateXlsx } from './repo/exporter'
import { importLogs, previewFile, runImport } from './repo/importer'
import { createOrder, getOrder, listOrders, setOrderStatus } from './repo/orders'
import {
  allProductsForExport,
  bulkUpdateProducts,
  deleteProduct,
  deleteProducts,
  duplicateGroups,
  getProduct,
  mergeProducts,
  productFacets,
  productsBySkus,
  purgeAllProducts,
  quickEntry,
  saveProduct,
  searchProducts,
  similarProducts
} from './repo/products'
import { seedDemo } from './repo/seed'
import { getSettings, isLocalSetting, pullSettings, setLocalSettings, setSettings } from './repo/settings'
import { approveUser, changePassword, createDealerAccount, currentSession, deleteUser, listUsers, login, logout, registerUser, revealPassword, saveUser } from './repo/users'
import { updateState } from './updater'

let session: Session | null = null

const EXTERNAL_HOSTS = new Set(['wa.me', 'api.whatsapp.com', 'github.com', 'www.microsoft.com'])

/** Only phone/mail links and a handful of https hosts may leave the app; everything else is rejected before reaching the OS. */
export function isAllowedExternal(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol === 'tel:' || url.protocol === 'mailto:') return true
  return url.protocol === 'https:' && EXTERNAL_HOSTS.has(url.hostname)
}

type Handler<C extends ApiChannel> = (args: ApiArgs<C>, event: Electron.IpcMainInvokeEvent) => ApiResult<C> | Promise<ApiResult<C>>

function handle<C extends ApiChannel>(channel: C, fn: Handler<C>): void {
  ipcMain.handle(channel, (event, args) => fn(args as ApiArgs<C>, event))
}

function requireRole(...roles: Session['user']['role'][]): Session {
  if (!session) throw new Error('Oturum açılmamış.')
  if (roles.length && !roles.includes(session.user.role)) throw new Error('Bu işlem için yetkiniz yok.')
  return session
}

function requireAdmin(): Session {
  if (!session) throw new Error('Oturum açılmamış.')
  if (session.user.role !== 'admin') throw new Error('Bu işlem için yetkiniz yok.')
  return session
}

function pageBounds(offset: number, limit: number): { offset: number; limit: number } {
  return {
    offset: Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0,
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 50
  }
}

function dateBoundary(value: string, end = false): string {
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`)
  if (Number.isNaN(date.getTime())) throw new Error('Tarih filtresi geçersiz.')
  return date.toISOString()
}

async function resolvePeople(ids: Array<string | null>): Promise<Map<string, ActivityPerson>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  const people = new Map<string, ActivityPerson>()
  if (!unique.length) return people
  const profiles = await cloud().from('profiles').select('id,username,display_name,customer_id').in('id', unique)
  if (profiles.error) throw profiles.error
  const customerIds = [...new Set(profiles.data.map((profile) => profile.customer_id).filter((id): id is number => id !== null))]
  const customers = customerIds.length
    ? await cloud().from('customers').select('id,name').in('id', customerIds)
    : { data: [], error: null }
  if (customers.error) throw customers.error
  const companies = new Map(customers.data.map((customer) => [customer.id, customer.name]))
  for (const profile of profiles.data) {
    people.set(profile.id, {
      display_name: profile.display_name || profile.username,
      username: profile.username,
      company: profile.customer_id === null ? '' : companies.get(profile.customer_id) ?? ''
    })
  }
  return people
}

export function broadcast(channel: AppEvent, payload?: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(channel, payload)
}

async function saveDialog(win: BrowserWindow | null, defaultName: string, ext: string, label: string): Promise<string | null> {
  const r = await dialog.showSaveDialog(win ?? BrowserWindow.getAllWindows()[0], {
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: label, extensions: [ext] }]
  })
  return r.canceled || !r.filePath ? null : r.filePath
}

function requirePerm(perm: Perm): Session {
  const s = requireRole()
  if (!hasPerm(s.user, perm)) throw new Error('Bu işlem için yetkiniz yok.')
  return s
}

/** Shelf location is internal warehouse data; only accounts with the shelf ability see it. */
function hideShelf<T extends { shelf: string }>(items: T[]): T[] {
  const s = requireRole()
  return hasPerm(s.user, 'shelf') ? items : items.map((p) => ({ ...p, shelf: '' }))
}

export function currentRole(): Session['user']['role'] | null {
  return session?.user.role ?? null
}

/**
 * Runs after sign-in / session restore: shared settings + product mirror pull,
 * realtime listeners, tray notifications (admin).
 */
async function activate(s: Session, restored = false): Promise<void> {
  session = s
  setOutboxUser(s.user.id)
  setActivitySession(s.user.id)
  logActivity({ kind: 'login', ...(restored ? { detail: { restored: true } } : {}) })
  try {
    await pullSettings()
  } catch (e) {
    console.error('settings pull failed', e)
  }
  // The product mirror can take a while on a fresh install; the UI opens right away and refreshes on products:changed.
  void (async () => {
    try {
      await pullProducts()
    } catch (e) {
      console.error('initial sync failed', e)
    }
    if (session !== s) return
    startRealtime()
    if (s.user.role === 'admin') await startAdminNotifications(s.user.id, getSettings().background_notifications)
    broadcast('products:changed')
    broadcast('sync:changed')
  })()
}

function deactivate(): void {
  setActivitySession(null)
  session = null
  setOutboxUser(null)
  stopRealtime()
  stopAdminNotifications()
}

/** Restores the remembered cloud session (refresh token on disk) before the window shows. */
let restoring: Promise<Session | null> | null = null

export function restoreSession(): Promise<Session | null> {
  if (session) return Promise.resolve(session)
  if (!restoring) {
    restoring = (async () => {
      try {
        const s = await currentSession()
        if (s) await activate(s, true)
        return s
      } catch (e) {
        console.error('session restore failed', e)
        return null
      } finally {
        restoring = null
      }
    })()
  }
  return restoring
}

export function registerIpc(): void {
  onSyncEvent((event, payload) => {
    if (event === 'status') broadcast('sync:changed', payload)
    else if (event === 'products') broadcast('products:changed')
    else if (event === 'orders') broadcast('orders:changed')
    else if (event === 'users') broadcast('users:changed')
    else if (event === 'customers') broadcast('customers:changed')
    else if (event === 'settings') broadcast('settings:changed')
  })

  handle('auth:login', async ({ username, password }) => {
    const s = await login(username, password)
    await activate(s)
    return s
  })
  handle('auth:logout', async () => {
    await flushActivity()
    deactivate()
    await logout()
  })
  handle('auth:register', async (input) => {
    await registerUser(input)
    broadcast('users:changed')
  })
  handle('activity:log', (event: ActivityEvent) => {
    requireRole()
    logActivity(event)
  })
  let lastPruneDay = ''
  handle('activity:open', async () => {
    requireAdmin()
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
    if (day === lastPruneDay) return
    lastPruneDay = day
    try {
      const { error } = await cloud().rpc('prune_logs')
      if (error) throw error
    } catch (error) {
      console.warn('Log cleanup failed.', error)
    }
  })
  handle('activity:list', async (filters: ActivityListQuery) => {
    requireAdmin()
    const { offset, limit } = pageBounds(filters.offset, filters.limit)
    let query = cloud().from('activity_log').select('*')
    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.kind) query = query.eq('kind', filters.kind)
    if (filters.platform) query = query.eq('platform', filters.platform)
    if (filters.from) query = query.gte('at', dateBoundary(filters.from))
    if (filters.to) query = query.lte('at', dateBoundary(filters.to, true))
    const text = filters.text?.trim().replace(/[%_,()]/g, ' ').trim()
    if (text) query = query.or(`sku.ilike.%${text}%,query.ilike.%${text}%`)
    const result = await query.order('at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1)
    if (result.error) throw result.error
    const people = await resolvePeople(result.data.map((row) => row.user_id))
    const rows: ActivityRow[] = result.data.map((row) => ({
      ...row,
      person: people.get(row.user_id) ?? { display_name: 'Silinmiş kullanıcı', username: '', company: '' }
    }))
    return { rows, hasMore: rows.length === limit }
  })
  handle('activity:summary', async (userId: string): Promise<ActivitySummary> => {
    requireAdmin()
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const result = await cloud()
      .from('activity_log')
      .select('at,kind,platform,product_id,sku,brand,query')
      .eq('user_id', userId)
      .gte('at', since)
      .order('at', { ascending: false })
      .limit(3000)
    if (result.error) throw result.error
    let lastLogin: string | null = null
    const kindCounts: Record<ActivityKind, number> = { login: 0, search: 0, product_view: 0, cart_add: 0, order: 0 }
    const usedPlatforms = new Set<ActivityPlatform>()
    const products = new Map<string, { product_id: number | null; sku: string; brand: string; views: number }>()
    const terms = new Map<string, { query: string; searches: number }>()
    for (const row of result.data) {
      kindCounts[row.kind]++
      usedPlatforms.add(row.platform)
      if (row.kind === 'login' && !lastLogin) lastLogin = row.at
      if (row.kind === 'product_view') {
        const key = row.product_id === null ? `${row.sku}|${row.brand}` : String(row.product_id)
        const item = products.get(key) ?? { product_id: row.product_id, sku: row.sku, brand: row.brand, views: 0 }
        item.views++
        products.set(key, item)
      }
      if (row.kind === 'search' && row.query.trim()) {
        const key = row.query.trim().toLocaleLowerCase('tr-TR')
        const item = terms.get(key) ?? { query: row.query.trim(), searches: 0 }
        item.searches++
        terms.set(key, item)
      }
    }
    return {
      lastLogin,
      lastActivity: result.data[0]?.at ?? null,
      kindCounts,
      platforms: [...usedPlatforms],
      topViewedProducts: [...products.values()].sort((a, b) => b.views - a.views).slice(0, 5),
      topSearchTerms: [...terms.values()].sort((a, b) => b.searches - a.searches).slice(0, 5)
    }
  })
  handle('stock:log', async (filters: StockLogQuery) => {
    requireAdmin()
    const { offset, limit } = pageBounds(filters.offset, filters.limit)
    let query = cloud().from('stock_log').select('*')
    if (filters.sku?.trim()) query = query.ilike('sku', `%${filters.sku.trim().replace(/[%_,()]/g, ' ')}%`)
    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.source) query = query.eq('source', filters.source)
    if (filters.from) query = query.gte('at', dateBoundary(filters.from))
    if (filters.to) query = query.lte('at', dateBoundary(filters.to, true))
    const result = await query.order('at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1)
    if (result.error) throw result.error
    const people = await resolvePeople(result.data.map((row) => row.user_id))
    const rows: StockLogRow[] = result.data.map((row) => ({
      ...row,
      person: row.user_id ? people.get(row.user_id) ?? { display_name: 'Silinmiş kullanıcı', username: '', company: '' } : { display_name: '—', username: '', company: '' }
    }))
    return { rows, hasMore: rows.length === limit }
  })
  handle('auth:session', async () => {
    if (restoring) await restoring
    return session
  })
  handle('auth:changePassword', ({ current, next }) => changePassword(requireRole().user.username, current, next))
  handle('clipboard:writeText', (text) => {
    requireRole()
    if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 2 * 1024 * 1024) throw new Error('Kopyalanacak metin çok büyük.')
    clipboard.writeText(text)
  })

  handle('products:search', (f) => {
    const s = requireRole()
    const r = searchProducts(s.user.role === 'admin' ? f : { ...f, includeInactive: false })
    return { ...r, items: hideShelf(r.items) }
  })
  handle('products:facets', (f) => {
    requireRole()
    return productFacets(f)
  })
  handle('products:get', (id) => {
    requireRole()
    const p = getProduct(id)
    return p ? hideShelf([p])[0] : p
  })
  handle('products:bySkus', (skus) => {
    requireRole()
    return hideShelf(productsBySkus(skus))
  })
  handle('products:save', async (p) => {
    requireRole('admin')
    const r = await saveProduct(p)
    broadcast('products:changed')
    return r
  })
  handle('products:delete', async (id) => {
    requireRole('admin')
    await deleteProduct(id)
    broadcast('products:changed')
  })
  handle('products:bulkUpdate', async (rows) => {
    requireRole('admin')
    const r = await bulkUpdateProducts(rows)
    broadcast('products:changed')
    return r
  })
  handle('products:bulkDelete', async (ids) => {
    requireRole('admin')
    await deleteProducts(ids)
    broadcast('products:changed')
  })
  handle('products:duplicates', () => {
    requireRole('admin')
    return duplicateGroups()
  })
  handle('products:similar', ({ sku, brand, box, excludeId }) => {
    requireRole('admin')
    return similarProducts(sku, brand, box, excludeId)
  })
  handle('products:merge', async (input) => {
    requireRole('admin')
    const r = await mergeProducts(input)
    broadcast('products:changed')
    return r
  })
  handle('products:quickEntry', async (rows) => {
    requireRole('admin')
    const r = await quickEntry(rows)
    broadcast('products:changed')
    return r
  })
  handle('products:exportExcel', async (f, e) => {
    requirePerm('export')
    const path = await saveDialog(BrowserWindow.fromWebContents(e.sender), 'urunler.xlsx', 'xlsx', 'Excel')
    if (!path) return null
    productsToXlsx(hideShelf(allProductsForExport(f)), path)
    return path
  })

  // Customers, orders and users are read straight from the cloud; RLS scopes dealers to their own rows.
  handle('customers:list', ({ q }) => {
    requireRole()
    return listCustomers(q)
  })
  handle('customers:get', (id) => {
    requireRole()
    return getCustomer(id)
  })
  handle('customers:profile', async (p) => {
    const s = requireRole()
    if (s.user.customer_id === null) throw new Error('Bu hesaba bağlı bir cari kart yok.')
    const customer = await updateMyCompany(p)
    session = { ...s, customer }
    broadcast('customers:changed')
    return session
  })
  handle('customers:save', async (c) => {
    requireRole('admin')
    const r = await saveCustomer(c)
    broadcast('customers:changed')
    return r
  })
  handle('customers:createWithLogin', async ({ customer, login: dealerLogin }) => {
    requireRole('admin')
    const r = await createDealerAccount(customer, dealerLogin)
    broadcast('customers:changed')
    broadcast('users:changed')
    return r
  })
  handle('customers:delete', async (id) => {
    requireRole('admin')
    await deleteCustomer(id)
    broadcast('customers:changed')
  })

  handle('orders:list', (o) => {
    requireRole()
    return listOrders(o)
  })
  const scopedOrder = async (id: number): Promise<Order | null> => {
    requireRole()
    return getOrder(id)
  }
  handle('orders:get', (id) => scopedOrder(id))
  handle('orders:create', async (input) => {
    const s = requireRole()
    const customer_id = s.user.role === 'admin' ? input.customer_id : s.user.customer_id
    const r = await createOrder({ ...input, customer_id })
    logActivity({ kind: 'order', order_id: r.id, detail: { order_no: r.order_no } })
    pullProducts().catch(() => undefined)
    broadcast('orders:changed')
    return r
  })
  handle('orders:setStatus', async ({ id, status }) => {
    const s = requireRole()
    if (s.user.role !== 'admin' && status !== 'iptal') throw new Error('Sipariş durumunu yalnızca yöneticiler değiştirebilir.')
    const r = await setOrderStatus(id, status)
    pullProducts().catch(() => undefined)
    broadcast('orders:changed')
    return r
  })
  handle('orders:exportExcel', async (id, e) => {
    requireRole('admin')
    const o = await getOrder(id)
    if (!o) throw new Error('Sipariş bulunamadı.')
    const path = await saveDialog(BrowserWindow.fromWebContents(e.sender), `${o.order_no}.xlsx`, 'xlsx', 'Excel')
    if (!path) return null
    orderToXlsx(o, path)
    return path
  })
  handle('orders:print', async (id, e) => {
    const o = await scopedOrder(id)
    if (!o) throw new Error('Sipariş bulunamadı.')
    const parent = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const win = new BrowserWindow({ show: false, parent, webPreferences: { sandbox: true } })
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(orderHtml(o, getSettings())))
    win.webContents.print({ printBackground: true }, () => win.destroy())
  })

  handle('users:list', () => {
    requireRole('admin')
    return listUsers()
  })
  handle('users:save', async (u) => {
    requireRole('admin')
    const r = await saveUser(u)
    broadcast('users:changed')
    return r
  })
  handle('users:delete', async (id) => {
    requireRole('admin')
    await deleteUser(id)
    broadcast('users:changed')
  })
  handle('users:revealPassword', (id) => {
    requireAdmin()
    return revealPassword(id)
  })
  handle('users:approve', async (id) => {
    requireRole('admin')
    const r = await approveUser(id)
    broadcast('users:changed')
    return r
  })

  handle('settings:get', () => getSettings())
  handle('settings:set', async (patch) => {
    const s = requireRole()
    const shared = Object.keys(patch).some((k) => !isLocalSetting(k))
    if (shared && s.user.role !== 'admin') throw new Error('Bu ayarı yalnızca yönetici değiştirebilir.')
    const out = shared ? await setSettings(patch) : setLocalSettings(patch)
    if (patch.background_notifications !== undefined && s.user.role === 'admin') setBackgroundMode(out.background_notifications)
    broadcast('settings:changed')
    return out
  })

  handle('dashboard:stats', async () => {
    requireRole()
    const s = await dashboardStats()
    return { ...s, lowStock: hideShelf(s.lowStock) }
  })

  handle('import:pick', async (_a, e) => {
    requireRole('admin')
    const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      properties: ['openFile'],
      filters: [
        { name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'xlsm', 'csv', 'txt'] },
        { name: 'Tüm dosyalar', extensions: ['*'] }
      ]
    })
    if (r.canceled || !r.filePaths[0]) return null
    return previewFile(r.filePaths[0])
  })
  handle('import:run', async (opts) => {
    requireRole('admin')
    const r = await runImport(opts)
    broadcast('products:changed')
    return r
  })
  handle('import:logs', () => {
    requireRole('admin')
    return importLogs()
  })
  handle('import:template', async (_a, e) => {
    const path = await saveDialog(BrowserWindow.fromWebContents(e.sender), 'stok-sablonu.xlsx', 'xlsx', 'Excel')
    if (!path) return null
    templateXlsx(path)
    return path
  })

  handle('app:info', () => ({ version: app.getVersion(), dbPath: dbPath(), platform: process.platform }))
  handle('app:openPath', (p) => {
    shell.showItemInFolder(p)
  })
  handle('app:openExternal', async (url) => {
    if (!isAllowedExternal(url)) throw new Error('Bu bağlantı açılamaz.')
    await shell.openExternal(url)
  })
  handle('app:openStoreUpdates', () => shell.openExternal('ms-windows-store://downloadsandupdates'))
  handle('app:syncStatus', () => syncStatus())
  handle('app:flushOutbox', async () => {
    requireRole()
    await flush()
    if (!syncStatus().pending) await pullProducts().catch((error) => console.warn('Stok eşitleme başarısız.', error))
    return syncStatus()
  })
  handle('app:discardFailedOps', () => {
    requireRole('admin')
    return discardFailedOps()
  })
  handle('app:resync', async () => {
    requireRole()
    const n = await pullProducts(true)
    broadcast('products:changed')
    return n
  })
  handle('update:state', () => updateState())
  handle('app:seedDemo', async (n) => {
    requireRole('admin')
    const r = await seedDemo(n)
    broadcast('products:changed')
    return r
  })
  handle('app:purgeProducts', async () => {
    requireRole('admin')
    const n = await purgeAllProducts()
    await pullProducts(true).catch(() => undefined)
    broadcast('products:changed')
    return n
  })
}
