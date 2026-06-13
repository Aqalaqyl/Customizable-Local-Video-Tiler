'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const {
  sortDisplaysInGridOrder,
  arrangeDisplays,
  assignDisplaySlots
} = require('./displays');
const { resolveLibraryRoot, pathWithinRoot, DEFAULT_DISPLAY_SLOT } = require('./library-paths');
const {
  listLayoutFiles,
  readLayoutFile,
  getActiveLayout,
  saveActiveLayout,
  createLayout,
  setActiveLayout,
  deleteLayout,
  importLayoutData,
  validateLayoutFile
} = require('./layouts');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.m4v', '.mkv', '.webm', '.ogv', '.ogg', '.mov', '.avi',
  '.wmv', '.flv', '.mpg', '.mpeg', '.3gp', '.ts', '.m4a', '.mp3',
  '.wav', '.flac', '.aac', '.opus'
]);

let mainWindow = null;
/** @type {{ assignments: object[], windows: import('electron').BrowserWindow[] } | null} */
let displaySession = null;

/* ------------------------------------------------------------------ */
/* Config persistence                                                  */
/* ------------------------------------------------------------------ */

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function defaultLibraryPath() {
  return path.join(app.getPath('userData'), 'media');
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

function userDataPath() {
  return app.getPath('userData');
}

function persistConfig(cfg) {
  writeConfig(cfg);
  return cfg;
}

function readConfigMigrated() {
  return migrateConfigStorage(readConfig());
}

function migrateConfigStorage(cfg) {
  const { cfg: migrated } = getActiveLayout(userDataPath(), cfg);
  if (migrated.activeLayoutId !== cfg.activeLayoutId || cfg.layout) {
    persistConfig(migrated);
  }
  return migrated;
}

function getActiveLayoutTree() {
  const cfg = readConfigMigrated();
  const { entry } = getActiveLayout(userDataPath(), cfg);
  return entry ? entry.layout : null;
}

function getLibraryPath() {
  const cfg = readConfigMigrated();
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

function getDisplayLayoutMap(cfg) {
  return cfg.displayLayoutMap && typeof cfg.displayLayoutMap === 'object'
    ? { ...cfg.displayLayoutMap }
    : {};
}

function saveDisplayLayoutMap(map) {
  const cfg = readConfigMigrated();
  cfg.displayLayoutMap = map;
  persistConfig(cfg);
  return cfg.displayLayoutMap;
}

function resolveLayoutSnapshot(layoutId) {
  if (!layoutId) return null;
  const entry = readLayoutFile(userDataPath(), layoutId);
  return entry ? entry.layout : null;
}

function getPresenterPayload(win) {
  const assignment = win && win.__assignment ? win.__assignment : null;
  return {
    layout: assignment ? assignment.layoutSnapshot : getActiveLayoutTree(),
    libraryPath: getLibraryPath(),
    displayId: assignment ? assignment.displayId : null,
    displaySlot: assignment ? assignment.displaySlot : null,
    layoutId: assignment ? assignment.layoutId : null,
    layoutName: assignment ? assignment.layoutName : null,
    displayLabel: assignment ? assignment.displayLabel : null
  };
}

function syncPresenterWindow(win) {
  if (!win || win.isDestroyed() || win.__assignment == null) return;
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', () => syncPresenterWindow(win));
    return;
  }
  win.webContents.send('presenter:sync', getPresenterPayload(win));
}

function syncAllPresenters() {
  if (!displaySession) return;
  for (const win of displaySession.windows) {
    syncPresenterWindow(win);
  }
}

function syncPresentersForLayout(layoutId, layout, exceptSenderId) {
  if (!displaySession || !layoutId) return;
  let changed = false;
  for (const item of displaySession.assignments) {
    if (item.layoutId === layoutId) {
      item.layoutSnapshot = layout;
      changed = true;
    }
  }
  if (!changed) return;
  for (const win of displaySession.windows) {
    if (win.__assignment && win.__assignment.layoutId === layoutId) {
      win.__assignment.layoutSnapshot = layout;
      if (exceptSenderId != null && win.webContents.id === exceptSenderId) continue;
      syncPresenterWindow(win);
    }
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

function createPresenterWindow(display, assignment) {
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

  win.__assignment = assignment;
  win.removeMenu();

  win.loadFile(path.join(__dirname, '..', 'renderer', 'presenter.html'));

  win.once('ready-to-show', () => {
    win.setBounds(display.bounds);
    win.show();
    win.setFullScreen(true);
  });

  win.webContents.on('did-finish-load', () => {
    syncPresenterWindow(win);
  });

  win.on('enter-full-screen', () => {
    setTimeout(() => syncPresenterWindow(win), 50);
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
        assignments: displaySession.assignments.map((a) => ({
          displayId: a.displayId,
          displaySlot: a.displaySlot,
          layoutId: a.layoutId,
          layoutName: a.layoutName
        }))
      });
    }
  });

  return win;
}

function startDisplaySession(assignmentsInput) {
  stopDisplaySession();

  const assignments = (assignmentsInput || []).slice(0, 4);
  if (assignments.length === 0) {
    return { ok: false, error: 'Select at least one display' };
  }

  const resolved = [];
  const slotDisplays = [];
  for (const item of assignments) {
    const display = findDisplayById(item.displayId);
    if (!display) continue;
    slotDisplays.push(display);
  }
  const slotMap = assignDisplaySlots(slotDisplays);

  for (const item of assignments) {
    const display = findDisplayById(item.displayId);
    if (!display) continue;
    const layoutId = String(item.layoutId || '');
    const entry = layoutId ? readLayoutFile(userDataPath(), layoutId) : null;
    if (!entry) {
      return { ok: false, error: `Layout not found for display ${display.label || item.displayId}` };
    }
    const displaySlot = slotMap.get(String(item.displayId)) || resolved.length + 1;
    resolved.push({
      displayId: String(item.displayId),
      displaySlot,
      layoutId: entry.id,
      layoutName: entry.name,
      layoutSnapshot: entry.layout,
      displayLabel: display.label || `Display ${displaySlot}`,
      display
    });
  }

  if (resolved.length === 0) {
    return { ok: false, error: 'No matching displays found' };
  }

  const windows = resolved.map((item) => createPresenterWindow(item.display, item));

  displaySession = {
    assignments: resolved,
    windows
  };

  const statusAssignments = resolved.map((a) => ({
    displayId: a.displayId,
    displaySlot: a.displaySlot,
    layoutId: a.layoutId,
    layoutName: a.layoutName,
    displayLabel: a.displayLabel
  }));

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('display:session-changed', {
      active: true,
      count: resolved.length,
      assignments: statusAssignments
    });
  }

  return {
    ok: true,
    active: true,
    count: resolved.length,
    assignments: statusAssignments
  };
}

function ensureDisplayLayout(displayId, displayLabel) {
  const cfg = readConfigMigrated();
  const map = getDisplayLayoutMap(cfg);
  const id = String(displayId);
  if (map[id]) {
    const existing = readLayoutFile(userDataPath(), map[id]);
    if (existing) return { layoutId: existing.id, layoutName: existing.name, created: false };
  }
  const entry = createLayout(userDataPath(), displayLabel || `Display ${id}`);
  map[id] = entry.id;
  saveDisplayLayoutMap(map);
  return { layoutId: entry.id, layoutName: entry.name, created: true };
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
  const cfg = readConfigMigrated();
  cfg.libraryPath = chosen;
  persistConfig(cfg);
  return chosen;
});

// Ensure a folder exists for a tile. Renames the existing folder when the
// tile's name changes so the folder on disk always matches the tile name.
// When displaySlot is omitted, tile folders live under {library}/displays/1/.
ipcMain.handle('folder:ensure', async (_evt, { name, currentPath, displaySlot }) => {
  const libraryPath = resolveLibraryRoot(getLibraryPath(), displaySlot);
  fs.mkdirSync(libraryPath, { recursive: true });

  if (currentPath && !pathWithinRoot(currentPath, libraryPath)) {
    currentPath = null;
  }

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
  return getActiveLayoutTree();
});

ipcMain.handle('layout:save', async (evt, layout) => {
  const cfg = readConfigMigrated();
  saveActiveLayout(userDataPath(), cfg, layout);
  syncPresentersForLayout(cfg.activeLayoutId, layout, evt.sender.id);
  return true;
});

ipcMain.handle('layouts:saveById', async (evt, { id, layout }) => {
  const entry = readLayoutFile(userDataPath(), id);
  if (!entry) return { ok: false, error: 'Layout not found' };
  const { writeLayoutFile } = require('./layouts');
  writeLayoutFile(userDataPath(), {
    id,
    name: entry.name,
    updatedAt: new Date().toISOString(),
    layout
  });
  syncPresentersForLayout(id, layout, evt.sender.id);
  return { ok: true };
});

ipcMain.handle('layouts:list', async () => {
  const cfg = readConfigMigrated();
  const items = listLayoutFiles(userDataPath());
  return items.map((e) => ({
    id: e.id,
    name: e.name,
    updatedAt: e.updatedAt,
    active: e.id === cfg.activeLayoutId
  }));
});

ipcMain.handle('layouts:active', async () => {
  const cfg = readConfigMigrated();
  const { entry } = getActiveLayout(userDataPath(), cfg);
  return {
    id: entry.id,
    name: entry.name,
    layout: entry.layout,
    updatedAt: entry.updatedAt
  };
});

ipcMain.handle('layouts:create', async (_evt, { name }) => {
  const entry = createLayout(userDataPath(), name);
  return { id: entry.id, name: entry.name, layout: entry.layout };
});

ipcMain.handle('layouts:load', async (_evt, { id }) => {
  const cfg = readConfigMigrated();
  const entry = readLayoutFile(userDataPath(), id);
  if (!entry) return { ok: false, error: 'Layout not found' };
  const next = setActiveLayout(userDataPath(), cfg, id);
  persistConfig(next);
  syncPresentersForLayout(entry.id, entry.layout);
  return {
    ok: true,
    id: entry.id,
    name: entry.name,
    layout: entry.layout,
    updatedAt: entry.updatedAt
  };
});

ipcMain.handle('layouts:delete', async (_evt, { id }) => {
  const cfg = readConfigMigrated();
  const all = listLayoutFiles(userDataPath());
  if (all.length <= 1) {
    return { ok: false, error: 'Cannot delete the only saved layout' };
  }
  if (id === cfg.activeLayoutId) {
    return { ok: false, error: 'Switch to another layout before deleting this one' };
  }
  if (!deleteLayout(userDataPath(), id)) {
    return { ok: false, error: 'Layout not found' };
  }
  return { ok: true };
});

ipcMain.handle('layouts:rename', async (_evt, { id, name }) => {
  const entry = readLayoutFile(userDataPath(), id);
  if (!entry) return { ok: false, error: 'Layout not found' };
  const trimmed = String(name || '').trim().slice(0, 120);
  if (!trimmed) return { ok: false, error: 'Name is required' };
  const { writeLayoutFile } = require('./layouts');
  writeLayoutFile(userDataPath(), {
    id,
    name: trimmed,
    updatedAt: new Date().toISOString(),
    layout: entry.layout
  });
  return { ok: true, id, name: trimmed };
});

ipcMain.handle('layouts:export', async (_evt, { id }) => {
  const entry = readLayoutFile(userDataPath(), id);
  if (!entry) return { ok: false, error: 'Layout not found' };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export layout',
    defaultPath: `${entry.name.replace(/[<>:"/\\|?*]/g, '_')}.lvt-layout.json`,
    filters: [
      { name: 'Layout files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  const payload = {
    version: 1,
    name: entry.name,
    exportedAt: new Date().toISOString(),
    layout: entry.layout
  };
  await fsp.writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { ok: true, path: result.filePath };
});

ipcMain.handle('layouts:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import layout',
    properties: ['openFile'],
    filters: [
      { name: 'Layout files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) {
    return { ok: false, canceled: true };
  }
  const filePath = result.filePaths[0];
  let raw;
  try {
    raw = JSON.parse(await fsp.readFile(filePath, 'utf8'));
  } catch (e) {
    return { ok: false, error: 'Invalid layout file' };
  }
  if (!validateLayoutFile(raw)) {
    return { ok: false, error: 'Layout file is missing a valid layout tree' };
  }
  const fallback = path.basename(filePath, path.extname(filePath));
  const entry = importLayoutData(userDataPath(), raw, fallback);
  if (!entry) return { ok: false, error: 'Could not import layout' };
  const cfg = readConfigMigrated();
  const next = setActiveLayout(userDataPath(), cfg, entry.id);
  persistConfig(next);
  syncPresentersForLayout(entry.id, entry.layout);
  return {
    ok: true,
    id: entry.id,
    name: entry.name,
    layout: entry.layout
  };
});

ipcMain.handle('displays:list', async () => {
  return screen.getAllDisplays().map(describeDisplay);
});

ipcMain.handle('displays:status', async () => {
  if (!displaySession) {
    return { active: false, count: 0, assignments: [] };
  }
  return {
    active: true,
    count: displaySession.windows.length,
    assignments: displaySession.assignments.map((a) => ({
      displayId: a.displayId,
      displaySlot: a.displaySlot,
      layoutId: a.layoutId,
      layoutName: a.layoutName,
      displayLabel: a.displayLabel
    }))
  };
});

ipcMain.handle('displays:assignSlots', async (_evt, { displayIds }) => {
  const ids = Array.isArray(displayIds) ? displayIds : [];
  const displays = ids.map((id) => findDisplayById(id)).filter(Boolean);
  const slotMap = assignDisplaySlots(displays);
  const slots = {};
  for (const [id, slot] of slotMap.entries()) {
    slots[id] = slot;
  }
  return slots;
});

ipcMain.handle('displays:getAssignments', async () => {
  return getDisplayLayoutMap(readConfigMigrated());
});

ipcMain.handle('displays:saveAssignments', async (_evt, { map }) => {
  if (!map || typeof map !== 'object') return { ok: false };
  saveDisplayLayoutMap(map);
  return { ok: true };
});

ipcMain.handle('displays:ensureLayout', async (_evt, { displayId, displayLabel }) => {
  return ensureDisplayLayout(displayId, displayLabel);
});

ipcMain.handle('displays:start', async (_evt, { assignments }) => {
  return startDisplaySession(assignments || []);
});

ipcMain.handle('displays:stop', async () => {
  return stopDisplaySession();
});

ipcMain.handle('app:quit', async () => {
  stopDisplaySession();
  app.quit();
  return true;
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
  assignDisplaySlots,
  describeDisplay,
  validateLayoutFile,
  resolveLibraryRoot,
  pathWithinRoot,
  DEFAULT_DISPLAY_SLOT
};
