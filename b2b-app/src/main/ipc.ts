import type { ApiArgs, ApiChannel, ApiResult, AppEvent } from '@shared/api'
import type { Order, Session } from '@shared/types'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { discardLegacyData, hasLegacyData, migrateLegacyData } from './cloud/migrate'
import { initialSync, onSyncEvent, pullProducts, startRealtime, stopRealtime, syncStatus } from './cloud/sync'
import { dbPath } from './db'
import { setBackgroundMode, startAdminNotifications, stopAdminNotifications } from './notify'
import { deleteCustomer, getCustomer, listCustomers, saveCustomer, updateMyCompany } from './repo/customers'
import { dashboardStats } from './repo/dashboard'
import { orderHtml, orderToXlsx, productsToXlsx, templateXlsx } from './repo/exporter'
import { importLogs, previewFile, runImport } from './repo/importer'
import { createOrder, getOrder, listOrders, setOrderStatus } from './repo/orders'
import { allProductsForExport, deleteProduct, getProduct, productFacets, productsBySkus, purgeAllProducts, saveProduct, searchProducts } from './repo/products'
import { seedDemo } from './repo/seed'
import { getSettings, isLocalSetting, setLocalSettings, setSettings } from './repo/settings'
import { approveUser, changePassword, currentSession, deleteUser, listUsers, login, logout, registerUser, saveUser } from './repo/users'
import { checkForUpdates, downloadAndInstall, installUpdate, updateState } from './updater'

let session: Session | null = null

type Handler<C extends ApiChannel> = (args: ApiArgs<C>, event: Electron.IpcMainInvokeEvent) => ApiResult<C> | Promise<ApiResult<C>>

function handle<C extends ApiChannel>(channel: C, fn: Handler<C>): void {
  ipcMain.handle(channel, (event, args) => fn(args as ApiArgs<C>, event))
}

function requireRole(...roles: Session['user']['role'][]): Session {
  if (!session) throw new Error('Oturum açılmamış.')
  if (roles.length && !roles.includes(session.user.role)) throw new Error('Bu işlem için yetkiniz yok.')
  return session
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

/** Shelf location is internal warehouse data; only admins see it. */
function hideShelf<T extends { shelf: string }>(items: T[]): T[] {
  const s = requireRole()
  return s.user.role === 'admin' ? items : items.map((p) => ({ ...p, shelf: '' }))
}

export function currentRole(): Session['user']['role'] | null {
  return session?.user.role ?? null
}

/**
 * Runs after sign-in / session restore: one-time upload of pre-cloud local data (admin),
 * shared settings + product mirror pull, realtime listeners, tray notifications (admin).
 */
async function activate(s: Session): Promise<void> {
  session = s
  try {
    if (hasLegacyData()) {
      if (s.user.role === 'admin') {
        const r = await migrateLegacyData()
        console.log('legacy data migrated', r)
      } else discardLegacyData()
      await pullProducts(true)
    }
    await initialSync()
  } catch (e) {
    console.error('initial sync failed', e)
  }
  startRealtime()
  if (s.user.role === 'admin') await startAdminNotifications(s.user.id, getSettings().background_notifications)
  broadcast('products:changed')
  broadcast('sync:changed')
}

function deactivate(): void {
  session = null
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
        if (s) await activate(s)
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
    deactivate()
    await logout()
  })
  handle('auth:register', async (input) => {
    await registerUser(input)
    broadcast('users:changed')
  })
  handle('auth:session', async () => {
    if (restoring) await restoring
    return session
  })
  handle('auth:changePassword', ({ current, next }) => changePassword(requireRole().user.username, current, next))

  handle('products:search', (f) => {
    requireRole()
    const r = searchProducts(f)
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
  handle('products:exportExcel', async (f, e) => {
    requireRole('admin')
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
    const customer_id = s.user.role === 'bayi' ? s.user.customer_id : input.customer_id
    const r = await createOrder({ ...input, customer_id })
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
  handle('app:syncStatus', () => syncStatus())
  handle('app:resync', async () => {
    requireRole()
    const n = await pullProducts(true)
    broadcast('products:changed')
    return n
  })
  handle('update:state', () => updateState())
  handle('update:check', () => checkForUpdates())
  handle('update:download', () => downloadAndInstall())
  handle('update:install', () => installUpdate())
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
