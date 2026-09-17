import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import { getDb } from './db'
import { registerIpc } from './ipc'
import { runSelfCheck } from './selfcheck'

const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL

function createWindow(): void {
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

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL!)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.setName('Yamansa Rulman B2B')
app.setAppUserModelId('com.yamansarulman.b2b')

if (process.argv.includes('--selfcheck')) {
  app.whenReady().then(() => {
    let code = 1
    try {
      code = runSelfCheck()
    } catch (e) {
      console.error(e)
    }
    app.exit(code)
  })
} else if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0]
    if (w) {
      if (w.isMinimized()) w.restore()
      w.focus()
    }
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    getDb()
    registerIpc()
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
