import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from 'electron'
import { join } from 'path'
import fs from 'fs'
import path from 'path'

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm',
  '.m4v', '.wmv', '.flv', '.ts', '.m2ts', '.ogv'
])

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0d0d0d',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#111111',
      symbolColor: '#888888',
      height: 36
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    title: 'Video Tiler'
  })

  win.on('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Allow file:// protocol for video streaming
  protocol.registerFileProtocol('atom', (request, callback) => {
    const filePath = request.url.slice('atom://'.length)
    callback({ path: decodeURIComponent(filePath) })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:listVideos', (_event, folderPath: string) => {
  if (!fs.existsSync(folderPath)) return []
  try {
    return fs.readdirSync(folderPath)
      .filter(f => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(f => ({ name: f, path: path.join(folderPath, f) }))
  } catch {
    return []
  }
})

ipcMain.handle('fs:createFolder', (_event, basePath: string, name: string) => {
  const folderPath = path.join(basePath, name)
  fs.mkdirSync(folderPath, { recursive: true })
  return folderPath
})

ipcMain.handle('fs:renameFolder', (_event, basePath: string, oldName: string, newName: string) => {
  const oldPath = path.join(basePath, oldName)
  const newPath = path.join(basePath, newName)
  if (fs.existsSync(oldPath) && oldName !== newName) {
    fs.renameSync(oldPath, newPath)
  } else if (!fs.existsSync(newPath)) {
    fs.mkdirSync(newPath, { recursive: true })
  }
  return newPath
})

ipcMain.handle('fs:ensureDir', (_event, dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true })
  return true
})

ipcMain.handle('fs:folderExists', (_event, folderPath: string) => {
  return fs.existsSync(folderPath)
})

ipcMain.handle('state:load', () => {
  const statePath = path.join(app.getPath('userData'), 'state.json')
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
})

ipcMain.handle('state:save', (_event, state: unknown) => {
  const statePath = path.join(app.getPath('userData'), 'state.json')
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
  return true
})

ipcMain.handle('app:getDefaultBasePath', () => {
  return path.join(app.getPath('videos'), 'VideoTiler')
})

ipcMain.handle('shell:openPath', (_event, filePath: string) => {
  shell.openPath(filePath)
})
