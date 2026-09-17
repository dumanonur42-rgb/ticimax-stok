import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '@shared/types'

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000

let state: UpdateState = { status: 'idle', current: app.getVersion() }

function set(next: Partial<UpdateState>): void {
  state = { ...state, ...next, current: app.getVersion() }
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('update:changed')
}

export function updateState(): UpdateState {
  return state
}

export function checkForUpdates(): void {
  if (!app.isPackaged) return
  autoUpdater.checkForUpdates().catch((e: Error) => set({ status: 'error', message: e.message }))
}

export function installUpdate(): void {
  if (state.status === 'downloaded') autoUpdater.quitAndInstall(false, true)
}

/** GitHub Releases based auto-update: downloads silently, installs on restart (or when the user asks). */
export function startUpdater(): void {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => set({ status: 'checking', message: undefined }))
  autoUpdater.on('update-not-available', () => set({ status: 'idle', message: undefined }))
  autoUpdater.on('update-available', (info) => set({ status: 'downloading', version: info.version, percent: 0 }))
  autoUpdater.on('download-progress', (p) => set({ status: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => set({ status: 'downloaded', version: info.version, percent: 100 }))
  autoUpdater.on('error', (e) => set({ status: 'error', message: e.message }))

  setTimeout(checkForUpdates, 15_000)
  setInterval(checkForUpdates, CHECK_EVERY_MS)
}
