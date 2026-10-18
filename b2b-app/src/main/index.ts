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
let splashShownAt = 0
let mainWin: BrowserWindow | null = null

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
  splash.on('ready-to-show', () => {
    splashShownAt = Date.now()
    splash.show()
  })
  load(splash, { splash: '1' })
  return splash
}

function createWindow(showSplash = true): void {
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
    const hidden = process.argv.includes('--hidden')
    const wait = splash ? Math.max(0, SPLASH_MIN_MS - (Date.now() - (splashShownAt || Date.now()))) : 0
    // The splash stays until the minimum time has passed and the cloud session is known; the product mirror syncs in the background.
    Promise.all([new Promise((r) => setTimeout(r, wait)), restoreSession()]).then(() => {
      if (splash && !splash.isDestroyed()) splash.webContents.send('splash:leave')
      setTimeout(
        () => {
          if (splash && !splash.isDestroyed()) splash.close()
          if (!(hidden && isBackgroundMode())) {
            win.show()
            win.focus()
            win.webContents.focus()
            win.webContents.send('window:shown')
          }
        },
        splash ? SPLASH_LEAVE_MS : 0
      )
    })
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
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      if (mainWin.isMinimized()) mainWin.restore()
      mainWin.show()
      mainWin.focus()
    } else createWindow(false)
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    hardenSession()
    getDb()
    const theme = getSettings().theme
    nativeTheme.themeSource = theme === 'dark' || theme === 'contrast' ? 'dark' : theme === 'light' ? 'light' : 'system'
    registerIpc()
    registerMainWindow(
      () => mainWin,
      () => createWindow(false)
    )
    createWindow(!process.argv.includes('--hidden'))
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
