import { app, BrowserWindow, powerMonitor } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '@shared/types'
import { compareVersions } from '@shared/version'
import { getSettings } from './repo/settings'

const CHECK_EVERY_MS = 30 * 60 * 1000
const FOCUS_CHECK_MIN_GAP_MS = 10 * 60 * 1000
const MAX_RETRY_MS = 30 * 60 * 1000

let state: UpdateState = { status: 'idle', current: app.getVersion() }
let lastCheckAt = 0
let retryDelay = 30_000
let retryTimer: NodeJS.Timeout | null = null
let downloaded = false
let installing = false

function set(next: Partial<UpdateState>): void {
  state = { ...state, ...next, current: app.getVersion() }
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('update:changed')
}

export function updateState(): UpdateState {
  const minimumVersion = process.platform === 'win32' ? getSettings().min_version_windows : undefined
  return {
    ...state,
    required: !!minimumVersion && compareVersions(app.getVersion(), minimumVersion) < 0,
    storeBuild: !!process.windowsStore,
    minimumVersion
  }
}

/** Store (AppX) installs are updated by the Microsoft Store itself; the GitHub updater must stay off there. */
const selfUpdating = (): boolean => app.isPackaged && !process.windowsStore

function retrySilently(): void {
  if (retryTimer) return
  const delay = retryDelay
  retryDelay = Math.min(MAX_RETRY_MS, retryDelay * 2)
  retryTimer = setTimeout(() => {
    retryTimer = null
    checkForUpdates()
  }, delay)
}

export function checkForUpdates(): void {
  if (!selfUpdating()) return
  if (state.status === 'available' || state.status === 'downloading' || state.status === 'downloaded' || state.status === 'installing') return
  lastCheckAt = Date.now()
  autoUpdater.checkForUpdates().catch((error: Error) => {
    console.warn('Güncelleme denetimi başarısız.', error)
    retrySilently()
  })
}

function checkOnFocus(): void {
  if (Date.now() - lastCheckAt >= FOCUS_CHECK_MIN_GAP_MS) checkForUpdates()
}

function installIfIdle(): void {
  if (!downloaded || installing) return
  const windows = BrowserWindow.getAllWindows()
  const allHidden = windows.length === 0 || windows.every((w) => w.isMinimized() || !w.isVisible())
  if (allHidden || powerMonitor.getSystemIdleTime() >= 300) {
    installing = true
    set({ status: 'installing' })
    autoUpdater.quitAndInstall(true, true)
  }
}

export function startUpdater(): void {
  if (!selfUpdating()) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => set({ status: 'checking' }))
  autoUpdater.on('update-not-available', () => {
    retryDelay = 30_000
    set({ status: 'idle', version: undefined, percent: undefined })
  })
  autoUpdater.on('update-available', (info) => set({ status: 'downloading', version: info.version, percent: 0 }))
  autoUpdater.on('download-progress', (p) => set({ status: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => {
    downloaded = true
    set({ status: 'downloaded', version: info.version, percent: 100 })
    if (updateState().required) {
      installing = true
      set({ status: 'installing' })
      setTimeout(() => autoUpdater.quitAndInstall(true, true), 400)
    } else if (powerMonitor.getSystemIdleTime() >= 300) {
      installIfIdle()
    }
  })
  autoUpdater.on('error', (error) => {
    console.warn('Güncelleme başarısız.', error)
    set({ status: 'idle' })
    retrySilently()
  })

  setTimeout(checkForUpdates, 15_000)
  setInterval(checkForUpdates, CHECK_EVERY_MS)
  app.on('browser-window-focus', checkOnFocus)
  setInterval(installIfIdle, 30_000)
}
