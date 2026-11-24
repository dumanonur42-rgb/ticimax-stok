import { app, BrowserWindow, Menu, nativeTheme, screen, session, shell } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getDb } from './db'
import { isAllowedExternal, registerIpc, restoreSession } from './ipc'
import { isBackgroundMode, isQuitting, registerMainWindow } from './notify'
import { productFacets, searchProducts } from './repo/products'
import { getSettings } from './repo/settings'
import { runSelfCheck } from './selfcheck'
import { startUpdater } from './updater'

const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL
const SPLASH_MIN_MS = 3000
const SPLASH_LEAVE_MS = 450
// A splash that has not painted by now is given up on rather than holding the app back.
const SPLASH_PAINT_LIMIT_MS = 8000
// Resolves once the splash is on screen: its minimum time counts from here, not from when it was created.
let splashVisible: Promise<void> = Promise.resolve()
// Whether the main window has been on screen since the app started; it starts hidden with Windows.
let mainRevealed = false
let mainWin: BrowserWindow | null = null
let activeSplash: BrowserWindow | null = null

interface WindowState {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}

function loadWindowState(): WindowState | null {
  try {
    const parsed = JSON.parse(readFileSync(join(app.getPath('userData'), 'window-state.json'), 'utf8')) as Partial<WindowState>
    if (![parsed.x, parsed.y, parsed.width, parsed.height].every((value) => Number.isFinite(value))) return null
    const state = parsed as WindowState
    if (state.width < 980 || state.height < 640 || state.width > 6000 || state.height > 6000) return null
    const visible = screen.getAllDisplays().some(({ workArea }) => {
      const width = Math.min(state.x + state.width, workArea.x + workArea.width) - Math.max(state.x, workArea.x)
      const height = Math.min(state.y + state.height, workArea.y + workArea.height) - Math.max(state.y, workArea.y)
      return width >= 80 && height >= 80
    })
    return visible ? { ...state, maximized: state.maximized === true } : null
  } catch {
    return null
  }
}

function saveWindowState(state: WindowState): void {
  const path = join(app.getPath('userData'), 'window-state.json')
  const temp = `${path}.tmp`
  try {
    writeFileSync(temp, JSON.stringify(state), 'utf8')
    renameSync(temp, path)
  } catch {
    return
  }
}

const WEB_PREFERENCES = {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  webviewTag: false,
  spellcheck: false
} as const

/** Renderer pages are local files; anything that tries to navigate elsewhere, open a popup, embed a webview or ask for device permissions is refused. */
function hardenWebContents(win: BrowserWindow): void {
  const wc = win.webContents
  wc.on('will-navigate', (e, url) => {
    if (!(isDev && url.startsWith(process.env.ELECTRON_RENDERER_URL!)) && !url.startsWith('file:')) e.preventDefault()
  })
  wc.on('will-attach-webview', (e) => e.preventDefault())
  wc.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternal(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
}

function hardenSession(): void {
  const s = session.defaultSession
  s.setPermissionRequestHandler((_wc, _permission, cb) => cb(false))
  s.setPermissionCheckHandler(() => false)
  s.setDevicePermissionHandler(() => false)
}

function load(win: BrowserWindow, query?: Record<string, string>): void {
  if (isDev) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL!)
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v)
    win.loadURL(url.toString())
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }
}

/** Runs the first catalog queries while the splash is on screen so SQLite's page cache and FTS index are hot. */
function warmUp(): void {
  try {
    const db = getDb()
    searchProducts({ limit: 200 })
    productFacets({})
    searchProducts({ q: '6205 2rs', limit: 50 })
    db.pragma('optimize')
  } catch (e) {
    console.error('warm-up failed', e)
  }
}

/** Frameless transparent window showing only the spinning bearing + globe. */
function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 420,
    height: 420,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    center: true,
    focusable: false,
    title: 'Yamansa Rulman B2B',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: WEB_PREFERENCES
  })
  hardenWebContents(splash)
  splash.setIgnoreMouseEvents(true)
  splashVisible = new Promise((resolve) => {
    splash.once('ready-to-show', () => {
      splash.show()
      resolve()
    })
    splash.once('closed', () => resolve())
    setTimeout(resolve, SPLASH_PAINT_LIMIT_MS)
  })
  activeSplash = splash
  splash.on('closed', () => {
    if (activeSplash === splash) activeSplash = null
  })
  load(splash, { splash: '1' })
  return splash
}

/** Keeps the splash up for its minimum time and until `ready` settles, fades it out, then runs `then`. */
function leaveSplash(splash: BrowserWindow, ready: Promise<unknown>, then: () => void): void {
  const minimum = splashVisible.then(() => new Promise((r) => setTimeout(r, SPLASH_MIN_MS)))
  Promise.allSettled([minimum, ready]).then(() => {
    if (!splash.isDestroyed()) splash.webContents.send('splash:leave')
    setTimeout(() => {
      if (!splash.isDestroyed()) splash.close()
      then()
    }, SPLASH_LEAVE_MS)
  })
}

function showMainWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  mainRevealed = true
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  win.webContents.focus()
  win.webContents.send('window:shown')
}

/** Brings the main window up on request; the first time since a hidden start it comes after the splash, like a normal start. */
function revealMain(): void {
  const win = mainWin
  if (!win || win.isDestroyed()) return createWindow(false)
  if (activeSplash && !activeSplash.isDestroyed()) return activeSplash.show()
  if (mainRevealed) return showMainWindow(win)
  mainRevealed = true
  leaveSplash(createSplash(), Promise.resolve(), () => showMainWindow(win))
}

/** `startHidden`: started with Windows, so the window stays in the tray when there are orders to wait for in the background. */
function createWindow(showSplash = true, startHidden = false): void {
  const splash = showSplash ? createSplash() : null
  const restored = loadWindowState()
  const area = screen.getPrimaryDisplay().workArea
  const initial: WindowState = restored ?? {
    x: Math.round(area.x + (area.width - 1400) / 2),
    y: Math.round(area.y + (area.height - 900) / 2),
    width: 1400,
    height: 900,
    maximized: false
  }

  const win = new BrowserWindow({
    x: initial.x,
    y: initial.y,
    width: initial.width,
    height: initial.height,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'Yamansa Rulman B2B',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: WEB_PREFERENCES
  })
  let normalBounds = { x: initial.x, y: initial.y, width: initial.width, height: initial.height }
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  const persist = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const bounds = win.isMaximized() ? normalBounds : win.getBounds()
      if (!win.isMaximized()) normalBounds = bounds
      saveWindowState({ ...bounds, maximized: win.isMaximized() })
    }, 200)
  }
  const persistImmediately = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    const bounds = win.isMaximized() ? normalBounds : win.getBounds()
    if (!win.isMaximized()) normalBounds = bounds
    saveWindowState({ ...bounds, maximized: win.isMaximized() })
  }
  win.on('move', persist)
  win.on('resize', persist)
  win.on('maximize', persist)
  win.on('unmaximize', persist)
  win.on('close', persistImmediately)
  if (initial.maximized) win.maximize()
  hardenWebContents(win)

  mainWin = win
  win.on('closed', () => {
    if (mainWin === win) mainWin = null
  })
  // Admin background mode: closing the window only hides it; the tray keeps the order watcher alive.
  win.on('close', (e) => {
    if (isBackgroundMode() && !isQuitting()) {
      e.preventDefault()
      win.hide()
    }
  })

  win.on('ready-to-show', () => {
    if (!splash) {
      restoreSession().finally(() => {
        if (!startHidden) showMainWindow(win)
        // Nothing to wait for in the background: open as on a normal start, splash included.
        else if (!isBackgroundMode()) revealMain()
      })
      return
    }
    // The splash stays until the minimum time has passed and the cloud session is known; the product mirror syncs in the background.
    leaveSplash(splash, restoreSession(), () => showMainWindow(win))
  })
  load(win)
}

app.commandLine.appendSwitch('lang', 'tr-TR')
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-transparent-visuals')
app.setName('Yamansa Rulman B2B')
app.setAppUserModelId('com.yamansarulman.b2b')

if (process.argv.includes('--selfcheck')) {
  // Keeps the demo catalogue the self-check seeds out of the real local mirror.
  app.setPath('userData', join(tmpdir(), 'yamansa-b2b-selfcheck'))
  app.whenReady().then(async () => {
    let code = 1
    try {
      code = await runSelfCheck()
    } catch (e) {
      console.error(e)
    }
    app.exit(code)
  })
} else if (!app.requestSingleInstanceLock()) {
  app.exit(0)
} else {
  app.on('second-instance', revealMain)

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    hardenSession()
    getDb()
    const theme = getSettings().theme
    nativeTheme.themeSource = theme === 'dark' || theme === 'contrast' ? 'dark' : theme === 'light' ? 'light' : 'system'
    registerIpc()
    registerMainWindow(revealMain)
    const hidden = process.argv.includes('--hidden')
    createWindow(!hidden, hidden)
    setImmediate(warmUp)
    startUpdater()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(false)
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !isBackgroundMode()) app.quit()
  })
}
