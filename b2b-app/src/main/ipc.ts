import type { ApiArgs, ApiChannel, ApiResult } from '@shared/api'
import type { Order, Session } from '@shared/types'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { closeDb, dbPath, getDb, reopenDb } from './db'
import { deleteCustomer, getCustomer, listCustomers, saveCustomer } from './repo/customers'
import { dashboardStats } from './repo/dashboard'
import { orderHtml, orderToXlsx, productsToXlsx, templateXlsx } from './repo/exporter'
import { importLogs, previewFile, runImport } from './repo/importer'
import { createOrder, getOrder, listOrders, setOrderStatus } from './repo/orders'
import { allProductsForExport, deleteProduct, getProduct, productFacets, productsBySkus, saveProduct, searchProducts } from './repo/products'
import { seedDemo } from './repo/seed'
import { getSettings, setSettings } from './repo/settings'
import { approveUser, changePassword, deleteUser, listUsers, login, registerUser, saveUser, sessionFor } from './repo/users'
import { checkForUpdates, installUpdate, updateState } from './updater'

let session: Session | null = null

/** Remembered login: the last signed-in user stays signed in across restarts until they explicitly log out. */
function rememberFile(): string {
  return join(app.getPath('userData'), 'session.json')
}

function rememberUser(userId: number | null): void {
  try {
    if (userId === null) rmSync(rememberFile(), { force: true })
    else writeFileSync(rememberFile(), JSON.stringify({ userId }), 'utf8')
  } catch (e) {
    console.error('session persist failed', e)
  }
}

function restoreSession(): Session | null {
  try {
    if (!existsSync(rememberFile())) return null
    const parsed = JSON.parse(readFileSync(rememberFile(), 'utf8')) as { userId?: unknown }
    if (typeof parsed.userId !== 'number') return null
    const s = sessionFor(parsed.userId)
    if (!s) rememberUser(null)
    return s
  } catch {
    return null
  }
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

function broadcast(channel: string): void {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel)
}

async function saveDialog(win: BrowserWindow | null, defaultName: string, ext: string, label: string): Promise<string | null> {
  const r = await dialog.showSaveDialog(win ?? BrowserWindow.getAllWindows()[0], {
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [{ name: label, extensions: [ext] }]
  })
  return r.canceled || !r.filePath ? null : r.filePath
}

/** Dealers only see their own customer's orders and may not edit master data. */
function scopeCustomer(): number | undefined {
  const s = requireRole()
  return s.user.role === 'bayi' ? (s.user.customer_id ?? -1) : undefined
}

/** Shelf location is internal warehouse data; only admins see it. */
function hideShelf<T extends { shelf: string }>(items: T[]): T[] {
  const s = requireRole()
  return s.user.role === 'admin' ? items : items.map((p) => ({ ...p, shelf: '' }))
}

export function registerIpc(): void {
  session = restoreSession()
  handle('auth:login', ({ username, password }) => {
    const s = login(username, password)
    if (!s) throw new Error('Kullanıcı adı veya şifre hatalı.')
    session = s
    rememberUser(s.user.id)
    return s
  })
  handle('auth:logout', () => {
    session = null
    rememberUser(null)
  })
  handle('auth:register', (input) => {
    registerUser(input)
    broadcast('users:changed')
  })
  handle('auth:session', () => (session ? sessionFor(session.user.id) : null))
  handle('auth:changePassword', ({ current, next }) => changePassword(requireRole().user.id, current, next))

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
  handle('products:save', (p) => {
    requireRole('admin')
    const r = saveProduct(p)
    broadcast('products:changed')
    return r
  })
  handle('products:delete', (id) => {
    requireRole('admin')
    deleteProduct(id)
    broadcast('products:changed')
  })
  handle('products:exportExcel', async (f, e) => {
    requireRole('admin')
    const path = await saveDialog(BrowserWindow.fromWebContents(e.sender), 'urunler.xlsx', 'xlsx', 'Excel')
    if (!path) return null
    productsToXlsx(hideShelf(allProductsForExport(f)), path)
    return path
  })

  handle('customers:list', ({ q }) => {
    const scope = scopeCustomer()
    const list = listCustomers(q)
    return scope === undefined ? list : list.filter((c) => c.id === scope)
  })
  handle('customers:get', (id) => {
    requireRole()
    return getCustomer(id)
  })
  handle('customers:save', (c) => {
    requireRole('admin')
    return saveCustomer(c)
  })
  handle('customers:delete', (id) => {
    requireRole('admin')
    deleteCustomer(id)
  })

  handle('orders:list', (o) => {
    const scope = scopeCustomer()
    return listOrders(scope === undefined ? o : { ...o, customer_id: scope })
  })
  const scopedOrder = (id: number): Order | null => {
    const scope = scopeCustomer()
    const o = getOrder(id)
    if (o && scope !== undefined && o.customer_id !== scope) throw new Error('Bu siparişe erişim yetkiniz yok.')
    return o
  }
  handle('orders:get', (id) => scopedOrder(id))
  handle('orders:create', (input) => {
    const s = requireRole()
    const customer_id = s.user.role === 'bayi' ? s.user.customer_id : input.customer_id
    const r = createOrder({ ...input, customer_id }, s.user.display_name || s.user.username)
    broadcast('orders:changed')
    broadcast('products:changed')
    return r
  })
  handle('orders:setStatus', ({ id, status }) => {
    const s = requireRole()
    if (s.user.role !== 'admin' && status !== 'iptal') throw new Error('Sipariş durumunu yalnızca yöneticiler değiştirebilir.')
    const r = setOrderStatus(id, status)
    broadcast('orders:changed')
    broadcast('products:changed')
    return r
  })
  handle('orders:exportExcel', async (id, e) => {
    requireRole('admin')
    const o = getOrder(id)
    if (!o) throw new Error('Sipariş bulunamadı.')
    const path = await saveDialog(BrowserWindow.fromWebContents(e.sender), `${o.order_no}.xlsx`, 'xlsx', 'Excel')
    if (!path) return null
    orderToXlsx(o, path)
    return path
  })
  handle('orders:print', async (id, e) => {
    const o = scopedOrder(id)
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
  handle('users:save', (u) => {
    requireRole('admin')
    return saveUser(u)
  })
  handle('users:delete', (id) => {
    requireRole('admin')
    deleteUser(id)
  })
  handle('users:approve', (id) => {
    requireRole('admin')
    return approveUser(id)
  })

  handle('settings:get', () => getSettings())
  handle('settings:set', (patch) => {
    const s = requireRole()
    const uiKeys = new Set(['theme', 'font_scale', 'reduce_motion', 'density'])
    if (s.user.role !== 'admin') {
      for (const k of Object.keys(patch)) if (!uiKeys.has(k)) throw new Error('Bu ayarı yalnızca yönetici değiştirebilir.')
    }
    return setSettings(patch)
  })

  handle('dashboard:stats', () => {
    return dashboardStats(scopeCustomer())
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
  handle('import:run', (opts) => {
    requireRole('admin')
    const r = runImport(opts)
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
  handle('app:backup', async (_a, e) => {
    requireRole('admin')
    const stamp = new Date().toISOString().slice(0, 10)
    const path = await saveDialog(BrowserWindow.fromWebContents(e.sender), `yamansa-b2b-yedek-${stamp}.sqlite`, 'sqlite', 'SQLite Yedek')
    if (!path) return null
    await getDb().backup(path)
    return path
  })
  handle('app:restore', async (_a, e) => {
    requireRole('admin')
    const win = BrowserWindow.fromWebContents(e.sender)!
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'SQLite Yedek', extensions: ['sqlite', 'db'] }] })
    if (r.canceled || !r.filePaths[0] || !existsSync(r.filePaths[0])) return false
    const ok = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Vazgeç', 'Geri Yükle'],
      defaultId: 0,
      cancelId: 0,
      message: 'Mevcut tüm veriler yedek dosyasındaki verilerle değiştirilecek. Devam edilsin mi?'
    })
    if (ok.response !== 1) return false
    closeDb()
    copyFileSync(r.filePaths[0], dbPath())
    reopenDb()
    session = null
    rememberUser(null)
    broadcast('session:changed')
    broadcast('products:changed')
    broadcast('orders:changed')
    return true
  })
  handle('update:state', () => updateState())
  handle('update:check', () => {
    requireRole()
    checkForUpdates()
  })
  handle('update:install', () => {
    requireRole()
    installUpdate()
  })
  handle('app:seedDemo', (n) => {
    requireRole('admin')
    const r = seedDemo(n)
    broadcast('products:changed')
    return r
  })
}
