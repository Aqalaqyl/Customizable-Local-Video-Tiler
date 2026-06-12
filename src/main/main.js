'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const {
  sortDisplaysInGridOrder,
  arrangeDisplays
} = require('./displays');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.m4v', '.mkv', '.webm', '.ogv', '.ogg', '.mov', '.avi',
  '.wmv', '.flv', '.mpg', '.mpeg', '.3gp', '.ts', '.m4a', '.mp3',
  '.wav', '.flac', '.aac', '.opus'
]);

let mainWindow = null;
/** @type {{ displayIds: string[], cols: number, rows: number, windows: import('electron').BrowserWindow[] } | null} */
let displaySession = null;

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

function describeDisplay(d, index) {
  const primary = screen.getPrimaryDisplay();
  return {
    id: String(d.id),
    label: d.label || `Display ${index + 1}`,
    bounds: { ...d.bounds },
    workArea: { ...d.workArea },
    scaleFactor: d.scaleFactor,
    primary: d.id === primary.id
  };
}

function findDisplayById(id) {
  return screen.getAllDisplays().find((d) => String(d.id) === String(id)) || null;
}

function getPresenterPayload(sliceIndex) {
  const cfg = readConfig();
  return {
    layout: cfg.layout || null,
    libraryPath: getLibraryPath(),
    sliceIndex,
    cols: displaySession ? displaySession.cols : 1,
    rows: displaySession ? displaySession.rows : 1
  };
}

function syncPresenterWindow(win) {
  if (!win || win.isDestroyed() || win.__slice == null) return;
  win.webContents.send('presenter:sync', getPresenterPayload(win.__slice.index));
}

function syncAllPresenters() {
  if (!displaySession) return;
  for (const win of displaySession.windows) {
    syncPresenterWindow(win);
  }
}

function stopDisplaySession() {
  if (!displaySession) return { ok: true, active: false };
  const windows = displaySession.windows.slice();
  displaySession = null;
  for (const win of windows) {
    if (!win.isDestroyed()) win.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('display:session-changed', { active: false });
  }
  return { ok: true, active: false };
}

function createPresenterWindow(display, slice) {
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    show: false,
    backgroundColor: '#000000',
    title: 'Local Video Tiler',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.__slice = slice;
  win.removeMenu();

  win.loadFile(path.join(__dirname, '..', 'renderer', 'presenter.html'), {
    query: {
      slice: String(slice.index),
      cols: String(slice.cols),
      rows: String(slice.rows)
    }
  });

  win.once('ready-to-show', () => {
    win.setBounds(display.bounds);
    win.show();
    win.setFullScreen(true);
    syncPresenterWindow(win);
  });

  win.on('closed', () => {
    if (!displaySession) return;
    displaySession.windows = displaySession.windows.filter((w) => w !== win);
    if (displaySession.windows.length === 0) {
      displaySession = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('display:session-changed', { active: false });
      }
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('display:session-changed', {
        active: true,
        count: displaySession.windows.length,
        cols: displaySession.cols,
        rows: displaySession.rows
      });
    }
  });

  return win;
}

function startDisplaySession(displayIds) {
  stopDisplaySession();

  const ids = [...new Set(displayIds.map(String))].slice(0, 4);
  if (ids.length === 0) {
    return { ok: false, error: 'Select at least one display' };
  }

  const displays = ids.map(findDisplayById).filter(Boolean);
  if (displays.length === 0) {
    return { ok: false, error: 'No matching displays found' };
  }

  const sorted = sortDisplaysInGridOrder(displays);
  const { cols, rows } = arrangeDisplays(sorted);
  const windows = sorted.map((display, index) =>
    createPresenterWindow(display, { index, cols, rows, total: sorted.length })
  );

  displaySession = { displayIds: ids, cols, rows, windows };

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    mainWindow.webContents.send('display:session-changed', {
      active: true,
      count: sorted.length,
      cols,
      rows,
      displayIds: ids
    });
  }

  return { ok: true, active: true, count: sorted.length, cols, rows, displayIds: ids };
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
  const ok = writeConfig(cfg);
  syncAllPresenters();
  return ok;
});

ipcMain.handle('displays:list', async () => {
  return screen.getAllDisplays().map(describeDisplay);
});

ipcMain.handle('displays:status', async () => {
  if (!displaySession) {
    return { active: false, count: 0, cols: 1, rows: 1, displayIds: [] };
  }
  return {
    active: true,
    count: displaySession.windows.length,
    cols: displaySession.cols,
    rows: displaySession.rows,
    displayIds: displaySession.displayIds
  };
});

ipcMain.handle('displays:start', async (_evt, { displayIds }) => {
  return startDisplaySession(displayIds || []);
});

ipcMain.handle('displays:stop', async () => {
  return stopDisplaySession();
});

ipcMain.handle('presenter:ready', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  syncPresenterWindow(win);
  return true;
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

  screen.on('display-added', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('displays:changed');
    }
  });
  screen.on('display-removed', () => {
    if (displaySession) stopDisplaySession();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('displays:changed');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopDisplaySession();
});

module.exports = {
  sortDisplaysInGridOrder,
  arrangeDisplays,
  describeDisplay
};
