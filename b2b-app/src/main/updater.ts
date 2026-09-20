import { app, BrowserWindow } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import type { UpdateState } from '@shared/types'

const CHECK_EVERY_MS = 30 * 60 * 1000
const FOCUS_CHECK_MIN_GAP_MS = 10 * 60 * 1000

let state: UpdateState = { status: 'idle', current: app.getVersion() }
let lastCheckAt = 0

function set(next: Partial<UpdateState>): void {
  state = { ...state, ...next, current: app.getVersion() }
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('update:changed')
}

export function updateState(): UpdateState {
  return state
}

/** GitHub hands the release body over as HTML; keep one line per bullet/paragraph. */
const stripHtml = (s: string): string =>
  s
    .replace(/<\/(li|p|h\d|div)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

function releaseNotes(notes: UpdateInfo['releaseNotes']): string | undefined {
  if (typeof notes === 'string') return stripHtml(notes) || undefined
  if (Array.isArray(notes)) {
    const s = notes
      .map((n) => (n.note ? stripHtml(n.note) : ''))
      .filter(Boolean)
      .join('\n')
    return s || undefined
  }
  return undefined
}

export function checkForUpdates(): void {
  if (!app.isPackaged) return
  if (state.status === 'available' || state.status === 'downloading' || state.status === 'downloaded' || state.status === 'installing') return
  lastCheckAt = Date.now()
  autoUpdater.checkForUpdates().catch((e: Error) => set({ status: 'error', message: e.message }))
}

function checkOnFocus(): void {
  if (Date.now() - lastCheckAt >= FOCUS_CHECK_MIN_GAP_MS) checkForUpdates()
}

/** User accepted the update: download it, then install over the current version and relaunch. */
export function downloadAndInstall(): void {
  if (!app.isPackaged || state.status !== 'available') return
  set({ status: 'downloading', percent: 0, message: undefined })
  autoUpdater.downloadUpdate().catch((e: Error) => set({ status: 'error', message: e.message }))
}

export function installUpdate(): void {
  if (state.status !== 'downloaded') return
  set({ status: 'installing' })
  setTimeout(() => autoUpdater.quitAndInstall(true, true), 400)
}

/** GitHub Releases based auto-update: asks the user first, then downloads and installs in place. */
export function startUpdater(): void {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => set({ status: 'checking', message: undefined }))
  autoUpdater.on('update-not-available', () => set({ status: 'idle', message: undefined, version: undefined, notes: undefined }))
  autoUpdater.on('update-available', (info) => set({ status: 'available', version: info.version, notes: releaseNotes(info.releaseNotes), percent: 0, message: undefined }))
  autoUpdater.on('download-progress', (p) => set({ status: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => {
    set({ status: 'downloaded', version: info.version, percent: 100 })
    installUpdate()
  })
  autoUpdater.on('error', (e) => set({ status: 'error', message: e.message }))

  setTimeout(checkForUpdates, 15_000)
  setInterval(checkForUpdates, CHECK_EVERY_MS)
  app.on('browser-window-focus', checkOnFocus)
}
