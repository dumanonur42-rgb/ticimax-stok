import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import { getDb } from './db'
import { registerIpc, restoreSession } from './ipc'
import { isBackgroundMode, isQuitting, registerMainWindow } from './notify'
import { productFacets, searchProducts } from './repo/products'
import { runSelfCheck } from './selfcheck'
import { startUpdater } from './updater'

const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL
const SPLASH_MIN_MS = 3000
const SPLASH_LEAVE_MS = 450
let splashShownAt = 0
let mainWin: BrowserWindow | null = null

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
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

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'Yamansa Rulman B2B',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

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
    // The splash stays until both the minimum time has passed and the cloud session/product mirror are ready.
    Promise.all([new Promise((r) => setTimeout(r, wait)), restoreSession()]).then(() => {
      if (splash && !splash.isDestroyed()) splash.webContents.send('splash:leave')
      setTimeout(
        () => {
          if (!(hidden && isBackgroundMode())) win.show()
          if (splash && !splash.isDestroyed()) splash.close()
        },
        splash ? SPLASH_LEAVE_MS : 0
      )
    })
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  load(win)
}

if (process.platform === 'linux') app.commandLine.appendSwitch('enable-transparent-visuals')
app.setName('Yamansa Rulman B2B')
app.setAppUserModelId('com.yamansarulman.b2b')

if (process.argv.includes('--selfcheck')) {
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
    getDb()
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
