const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');

const VIDEO_EXTENSIONS = new Set([
  '.avi',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.ogv',
  '.webm'
]);

let mainWindow;
let state;

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultWorkspaceRoot() {
  return path.join(app.getPath('videos'), 'Customizable Local Video Tiler');
}

function statePath() {
  return path.join(app.getPath('userData'), 'layout.json');
}

function createDefaultState() {
  const tileId = createId('tile');

  return {
    workspaceRoot: defaultWorkspaceRoot(),
    layout: {
      kind: 'leaf',
      tileId
    },
    tiles: {
      [tileId]: {
        id: tileId,
        name: 'Main'
      }
    }
  };
}

function sanitizeFolderName(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '');

  return cleaned || 'Tile';
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function tileFolderPath(tile) {
  return path.join(state.workspaceRoot, tile.name);
}

function cloneStateForRenderer() {
  const tiles = {};

  for (const [tileId, tile] of Object.entries(state.tiles)) {
    tiles[tileId] = {
      ...tile,
      folderPath: tileFolderPath(tile)
    };
  }

  return {
    workspaceRoot: state.workspaceRoot,
    layout: state.layout,
    tiles
  };
}

async function saveState() {
  await fsp.mkdir(path.dirname(statePath()), { recursive: true });
  await fsp.writeFile(statePath(), JSON.stringify(state, null, 2));
}

async function ensureTileFolders() {
  await fsp.mkdir(state.workspaceRoot, { recursive: true });

  await Promise.all(
    Object.values(state.tiles).map((tile) =>
      fsp.mkdir(tileFolderPath(tile), { recursive: true })
    )
  );
}

async function loadState() {
  try {
    const raw = await fsp.readFile(statePath(), 'utf8');
    state = JSON.parse(raw);
  } catch {
    state = createDefaultState();
    await saveState();
  }

  await ensureTileFolders();
}

function findLeaf(node, tileId) {
  if (node.kind === 'leaf') {
    return node.tileId === tileId ? node : null;
  }

  return findLeaf(node.first, tileId) || findLeaf(node.second, tileId);
}

function replaceLeafWithSplit(node, tileId, splitNode) {
  if (node.kind === 'leaf') {
    return node.tileId === tileId ? splitNode : node;
  }

  return {
    ...node,
    first: replaceLeafWithSplit(node.first, tileId, splitNode),
    second: replaceLeafWithSplit(node.second, tileId, splitNode)
  };
}

function updateSplitRatio(node, splitId, ratio) {
  if (node.kind === 'leaf') {
    return false;
  }

  if (node.id === splitId) {
    node.ratio = Math.min(0.85, Math.max(0.15, ratio));
    return true;
  }

  return updateSplitRatio(node.first, splitId, ratio) || updateSplitRatio(node.second, splitId, ratio);
}

async function uniqueTileName(baseName, ignoredTileId) {
  const base = sanitizeFolderName(baseName);
  const ignoredName = state.tiles[ignoredTileId]?.name.toLowerCase();
  const existingNames = new Set(
    Object.values(state.tiles)
      .filter((tile) => tile.id !== ignoredTileId)
      .map((tile) => tile.name.toLowerCase())
  );

  let nextName = base;
  let suffix = 2;

  while (
    existingNames.has(nextName.toLowerCase()) ||
    (nextName.toLowerCase() !== ignoredName && (await pathExists(path.join(state.workspaceRoot, nextName))))
  ) {
    nextName = `${base} ${suffix}`;
    suffix += 1;
  }

  return nextName;
}

function uniqueFileName(directory, originalName) {
  const parsed = path.parse(originalName);
  let candidate = path.basename(originalName);
  let index = 2;

  while (fs.existsSync(path.join(directory, candidate))) {
    candidate = `${parsed.name} ${index}${parsed.ext}`;
    index += 1;
  }

  return candidate;
}

function requireTile(tileId) {
  const tile = state.tiles[tileId];

  if (!tile) {
    throw new Error(`Unknown tile: ${tileId}`);
  }

  return tile;
}

async function listVideosForTile(tileId) {
  const tile = requireTile(tileId);
  const folder = tileFolderPath(tile);

  await fsp.mkdir(folder, { recursive: true });

  const entries = await fsp.readdir(folder, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function splitTile(tileId, direction) {
  if (!['vertical', 'horizontal'].includes(direction)) {
    throw new Error(`Unsupported split direction: ${direction}`);
  }

  const currentLeaf = findLeaf(state.layout, tileId);

  if (!currentLeaf) {
    throw new Error(`Cannot split unknown tile: ${tileId}`);
  }

  const newTileId = createId('tile');
  const newName = await uniqueTileName('New Tile', newTileId);

  state.tiles[newTileId] = {
    id: newTileId,
    name: newName
  };

  state.layout = replaceLeafWithSplit(state.layout, tileId, {
    kind: 'split',
    id: createId('split'),
    direction,
    ratio: 0.5,
    first: currentLeaf,
    second: {
      kind: 'leaf',
      tileId: newTileId
    }
  });

  await ensureTileFolders();
  await saveState();

  return cloneStateForRenderer();
}

async function resizeSplit(splitId, ratio) {
  if (!updateSplitRatio(state.layout, splitId, Number(ratio))) {
    throw new Error(`Unknown split: ${splitId}`);
  }

  await saveState();
  return cloneStateForRenderer();
}

async function renameTile(tileId, requestedName) {
  const tile = requireTile(tileId);
  const previousName = tile.name;
  const nextName = await uniqueTileName(requestedName, tileId);

  if (previousName === nextName) {
    return cloneStateForRenderer();
  }

  const previousPath = path.join(state.workspaceRoot, previousName);
  const nextPath = path.join(state.workspaceRoot, nextName);

  if (await pathExists(previousPath)) {
    await fsp.rename(previousPath, nextPath);
  } else {
    await fsp.mkdir(nextPath, { recursive: true });
  }

  tile.name = nextName;
  await saveState();

  return cloneStateForRenderer();
}

async function chooseWorkspace() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose tile folder workspace',
    defaultPath: state.workspaceRoot,
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths[0]) {
    return cloneStateForRenderer();
  }

  state.workspaceRoot = result.filePaths[0];
  await ensureTileFolders();
  await saveState();

  return cloneStateForRenderer();
}

async function importVideos(tileId) {
  const tile = requireTile(tileId);
  const folder = tileFolderPath(tile);

  await fsp.mkdir(folder, { recursive: true });

  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Import videos into ${tile.name}`,
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Video files',
        extensions: Array.from(VIDEO_EXTENSIONS).map((extension) => extension.slice(1))
      },
      {
        name: 'All files',
        extensions: ['*']
      }
    ]
  });

  if (!result.canceled) {
    for (const filePath of result.filePaths) {
      const extension = path.extname(filePath).toLowerCase();

      if (!VIDEO_EXTENSIONS.has(extension)) {
        continue;
      }

      const destinationName = uniqueFileName(folder, path.basename(filePath));
      await fsp.copyFile(filePath, path.join(folder, destinationName));
    }
  }

  return listVideosForTile(tileId);
}

async function showTileFolder(tileId) {
  const tile = requireTile(tileId);
  const folder = tileFolderPath(tile);

  await fsp.mkdir(folder, { recursive: true });
  await shell.openPath(folder);
}

function videoUrl(tileId, fileName) {
  const tile = requireTile(tileId);
  const safeFileName = path.basename(fileName);

  return pathToFileURL(path.join(tileFolderPath(tile), safeFileName)).href;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0d1117',
    title: 'Customizable Local Video Tiler',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(async () => {
  await loadState();

  ipcMain.handle('app:get-state', () => cloneStateForRenderer());
  ipcMain.handle('app:choose-workspace', () => chooseWorkspace());
  ipcMain.handle('tile:split', (_event, payload) => splitTile(payload.tileId, payload.direction));
  ipcMain.handle('tile:resize-split', (_event, payload) => resizeSplit(payload.splitId, payload.ratio));
  ipcMain.handle('tile:rename', (_event, payload) => renameTile(payload.tileId, payload.name));
  ipcMain.handle('tile:list-videos', (_event, tileId) => listVideosForTile(tileId));
  ipcMain.handle('tile:import-videos', (_event, tileId) => importVideos(tileId));
  ipcMain.handle('tile:show-folder', (_event, tileId) => showTileFolder(tileId));
  ipcMain.handle('tile:video-url', (_event, payload) => videoUrl(payload.tileId, payload.fileName));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
