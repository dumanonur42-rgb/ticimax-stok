import { app, Menu, nativeImage, Notification, Tray, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import type { OrderRow } from './cloud/database.types'
import { lastSeenOrderId, markOrderSeen, onNewOrderRow, primeOrderCursor } from './cloud/sync'

/**
 * Admin devices keep running in the tray after the main window closes so that new dealer
 * orders still raise a Windows notification. Each order id is notified at most once per device
 * (the cursor lives in SQLite `sync_state`, so restarts do not replay old orders).
 */

let tray: Tray | null = null
let backgroundMode = false
let quitting = false
let mainRef: { get: () => BrowserWindow | null; create: () => void } | null = null
let selfId: string | null = null

export function isBackgroundMode(): boolean {
  return backgroundMode
}

export function isQuitting(): boolean {
  return quitting
}

export function registerMainWindow(get: () => BrowserWindow | null, create: () => void): void {
  mainRef = { get, create }
}

function iconPath(): string {
  return join(__dirname, '../../resources/icon.png')
}

function showMain(): void {
  const w = mainRef?.get() ?? null
  if (w && !w.isDestroyed()) {
    if (w.isMinimized()) w.restore()
    w.show()
    w.focus()
  } else mainRef?.create()
}

function ensureTray(): void {
  if (tray) return
  const img = nativeImage.createFromPath(iconPath())
  tray = new Tray(process.platform === 'win32' ? img : img.resize({ width: 18, height: 18 }))
  tray.setToolTip('Yamansa Rulman B2B — yeni siparişler için arka planda çalışıyor')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Uygulamayı aç', click: showMain },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => {
          quitting = true
          app.quit()
        }
      }
    ])
  )
  tray.on('click', showMain)
  tray.on('double-click', showMain)
}

function destroyTray(): void {
  tray?.destroy()
  tray = null
}

function money(n: number, cur: string): string {
  return `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${cur}`
}

function notifyOrder(o: OrderRow): void {
  if (o.id <= lastSeenOrderId()) return
  markOrderSeen(o.id)
  if (o.created_by_id === selfId || !Notification.isSupported()) return
  const n = new Notification({
    title: `Yeni sipariş: ${o.order_no}`,
    body: `${o.customer_name || 'Bayi'} — ${money(Number(o.total), o.currency)}`,
    icon: iconPath(),
    silent: false
  })
  n.on('click', showMain)
  n.show()
}

/** Called once an admin session is active. `enabled` mirrors the local `background_notifications` setting. */
export async function startAdminNotifications(userId: string, enabled: boolean): Promise<void> {
  selfId = userId
  await primeOrderCursor().catch(() => undefined)
  onNewOrderRow(notifyOrder)
  setBackgroundMode(enabled)
}

export function stopAdminNotifications(): void {
  onNewOrderRow(null)
  setBackgroundMode(false)
}

export function setBackgroundMode(enabled: boolean): void {
  backgroundMode = enabled
  if (enabled) ensureTray()
  else destroyTray()
  if (process.platform === 'win32' && app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: enabled, args: ['--hidden'] })
  }
}
