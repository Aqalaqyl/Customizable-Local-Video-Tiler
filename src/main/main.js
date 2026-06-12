'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.m4v', '.mkv', '.webm', '.ogv', '.ogg', '.mov', '.avi',
  '.wmv', '.flv', '.mpg', '.mpeg', '.3gp', '.ts', '.m4a', '.mp3',
  '.wav', '.flac', '.aac', '.opus'
]);

let mainWindow = null;

/* ------------------------------------------------------------------ */
/* Config persistence                                                  */
/* ------------------------------------------------------------------ */

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function defaultLibraryPath() {
  let base;
  try {
    base = app.getPath('documents');
  } catch (e) {
    base = app.getPath('userData');
  }
  return path.join(base, 'LocalVideoTiler');
}

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function writeConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write config', e);
    return false;
  }
}

function getLibraryPath() {
  const cfg = readConfig();
  const p = cfg.libraryPath || defaultLibraryPath();
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch (e) {
    /* ignore */
  }
  return p;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function sanitizeFolderName(name) {
  let n = String(name || '').trim();
  // Strip characters that are illegal in folder names on common OSes.
  n = n.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim();
  // Avoid names that are only dots or empty.
  n = n.replace(/^\.+$/, '');
  if (!n) n = 'Untitled';
  // Windows reserved names.
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(n)) n = '_' + n;
  return n.slice(0, 120);
}

async function uniqueFolderPath(libraryPath, desiredName, currentPath) {
  const base = sanitizeFolderName(desiredName);
  let candidate = path.join(libraryPath, base);
  // If it's already the current folder, keep it.
  if (currentPath && path.resolve(currentPath) === path.resolve(candidate)) {
    return candidate;
  }
  let i = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(libraryPath, `${base} (${i})`);
    i += 1;
  }
  return candidate;
}

function isVideoFile(name) {
  return VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#0f1115',
    title: 'Local Video Tiler',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.removeMenu();

  if (process.env.LVT_DIAG) {
    const wc = mainWindow.webContents;
    wc.on('did-finish-load', () => console.log('[diag] renderer finished load'));
    wc.on('did-fail-load', (_e, code, desc) =>
      console.error('[diag] renderer fail load', code, desc));
    wc.on('preload-error', (_e, p, err) =>
      console.error('[diag] preload error', p, err));
    wc.on('console-message', (_e, _lvl, message) =>
      console.log('[diag] console:', message));
    wc.on('render-process-gone', (_e, d) =>
      console.error('[diag] render gone', d));
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen-changed', true);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

ipcMain.handle('library:get', async () => {
  return getLibraryPath();
});

ipcMain.handle('library:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose library folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  const chosen = result.filePaths[0];
  const cfg = readConfig();
  cfg.libraryPath = chosen;
  writeConfig(cfg);
  return chosen;
});

// Ensure a folder exists for a tile. Renames the existing folder when the
// tile's name changes so the folder on disk always matches the tile name.
ipcMain.handle('folder:ensure', async (_evt, { name, currentPath }) => {
  const libraryPath = getLibraryPath();
  fs.mkdirSync(libraryPath, { recursive: true });

  // Folder already exists at currentPath and the name still matches: keep it.
  const sanitized = sanitizeFolderName(name);
  if (currentPath && fs.existsSync(currentPath)) {
    const currentBase = path.basename(currentPath);
    if (currentBase === sanitized) {
      return { path: currentPath, name: sanitized };
    }
    // Name changed -> rename the folder.
    const target = await uniqueFolderPath(libraryPath, name, currentPath);
    try {
      await fsp.rename(currentPath, target);
      return { path: target, name: path.basename(target) };
    } catch (e) {
      console.error('Rename failed, creating new folder', e);
    }
  }

  const target = await uniqueFolderPath(libraryPath, name, currentPath);
  fs.mkdirSync(target, { recursive: true });
  return { path: target, name: path.basename(target) };
});

ipcMain.handle('folder:delete', async (_evt, { folderPath, removeFiles }) => {
  if (!folderPath || !fs.existsSync(folderPath)) return { ok: true };
  if (!removeFiles) return { ok: true }; // keep files on disk by default
  try {
    await fsp.rm(folderPath, { recursive: true, force: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('folder:listVideos', async (_evt, { folderPath }) => {
  if (!folderPath || !fs.existsSync(folderPath)) return [];
  try {
    const entries = await fsp.readdir(folderPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.isFile() && isVideoFile(entry.name)) {
        const full = path.join(folderPath, entry.name);
        let size = 0;
        try {
          size = (await fsp.stat(full)).size;
        } catch (e) { /* ignore */ }
        files.push({ name: entry.name, path: full, size });
      }
    }
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return files;
  } catch (e) {
    console.error('listVideos failed', e);
    return [];
  }
});

ipcMain.handle('folder:open', async (_evt, { folderPath }) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

// Let the user pick video files and copy them into the tile's folder.
ipcMain.handle('videos:add', async (_evt, { folderPath }) => {
  if (!folderPath) return { added: 0 };
  fs.mkdirSync(folderPath, { recursive: true });
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Add videos to this tile',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media', extensions: [...VIDEO_EXTENSIONS].map((e) => e.replace('.', '')) },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return { added: 0 };
  let added = 0;
  for (const src of result.filePaths) {
    const dest = path.join(folderPath, path.basename(src));
    try {
      if (path.resolve(src) === path.resolve(dest)) {
        added += 1;
        continue;
      }
      await fsp.copyFile(src, dest);
      added += 1;
    } catch (e) {
      console.error('copy failed', src, e);
    }
  }
  return { added };
});

ipcMain.handle('layout:load', async () => {
  const cfg = readConfig();
  return cfg.layout || null;
});

ipcMain.handle('layout:save', async (_evt, layout) => {
  const cfg = readConfig();
  cfg.layout = layout;
  return writeConfig(cfg);
});

ipcMain.handle('window:toggleFullscreen', async () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return next;
});

ipcMain.handle('window:isFullscreen', async () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
