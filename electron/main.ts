import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.ogv', '.wmv', '.flv',
]);

interface TileLeaf {
  type: 'leaf';
  id: string;
  name: string;
}

interface TileSplit {
  type: 'split';
  direction: 'horizontal' | 'vertical';
  ratio: number;
  first: TileNode;
  second: TileNode;
}

type TileNode = TileLeaf | TileSplit;

interface AppConfig {
  layout: TileNode;
  version: number;
}

function getDataDir(): string {
  return path.join(app.getPath('userData'), 'tiles-data');
}

function getConfigPath(): string {
  return path.join(getDataDir(), 'config.json');
}

function getTilesRoot(): string {
  return path.join(getDataDir(), 'folders');
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'untitled';
}

function createDefaultLayout(): TileNode {
  const id = uuidv4();
  return { type: 'leaf', id, name: 'Main' };
}

function ensureTileFolder(tileId: string, name: string): string {
  const root = getTilesRoot();
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  const folderName = `${sanitizeFolderName(name)}__${tileId.slice(0, 8)}`;
  const folderPath = path.join(root, folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

function findFolderForTile(tileId: string): string | null {
  const root = getTilesRoot();
  if (!fs.existsSync(root)) return null;
  const entries = fs.readdirSync(root);
  const match = entries.find((e) => e.endsWith(`__${tileId.slice(0, 8)}`));
  return match ? path.join(root, match) : null;
}

function renameTileFolder(tileId: string, newName: string): string {
  const existing = findFolderForTile(tileId);
  const newFolderName = `${sanitizeFolderName(newName)}__${tileId.slice(0, 8)}`;
  const newPath = path.join(getTilesRoot(), newFolderName);
  if (existing && existing !== newPath) {
    if (fs.existsSync(newPath)) {
      fs.rmSync(newPath, { recursive: true, force: true });
    }
    fs.renameSync(existing, newPath);
    return newPath;
  }
  return ensureTileFolder(tileId, newName);
}

function walkLeaves(node: TileNode, fn: (leaf: TileLeaf) => void): void {
  if (node.type === 'leaf') {
    fn(node);
  } else {
    walkLeaves(node.first, fn);
    walkLeaves(node.second, fn);
  }
}

function ensureAllTileFolders(layout: TileNode): void {
  walkLeaves(layout, (leaf) => {
    ensureTileFolder(leaf.id, leaf.name);
  });
}

function loadConfig(): AppConfig {
  const configPath = getConfigPath();
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw) as AppConfig;
      ensureAllTileFolders(config.layout);
      return config;
    } catch {
      // fall through to default
    }
  }
  const layout = createDefaultLayout();
  const config: AppConfig = { layout, version: 1 };
  ensureAllTileFolders(layout);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return config;
}

function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function listVideosInFolder(folderPath: string): { name: string; path: string }[] {
  if (!fs.existsSync(folderPath)) return [];
  return fs
    .readdirSync(folderPath)
    .filter((f) => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => ({ name: f, path: path.join(folderPath, f) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0f0f12',
    title: 'Video Tiler',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpc(): void {
  ipcMain.handle('get-config', () => loadConfig());

  ipcMain.handle('save-layout', (_event, layout: TileNode) => {
    const config = loadConfig();
    config.layout = layout;
    ensureAllTileFolders(layout);
    saveConfig(config);
    return config;
  });

  ipcMain.handle('rename-tile', (_event, tileId: string, newName: string) => {
    const folderPath = renameTileFolder(tileId, newName);
    return { folderPath, folderName: path.basename(folderPath) };
  });

  ipcMain.handle('get-tile-folder', (_event, tileId: string, name: string) => {
    const existing = findFolderForTile(tileId);
    const folderPath = existing ?? ensureTileFolder(tileId, name);
    return {
      folderPath,
      folderName: path.basename(folderPath),
      videos: listVideosInFolder(folderPath),
    };
  });

  ipcMain.handle('list-videos', (_event, tileId: string, name: string) => {
    const folder = findFolderForTile(tileId) ?? ensureTileFolder(tileId, name);
    return listVideosInFolder(folder);
  });

  ipcMain.handle('open-tile-folder', (_event, tileId: string, name: string) => {
    const folder = findFolderForTile(tileId) ?? ensureTileFolder(tileId, name);
    shell.openPath(folder);
    return folder;
  });

  ipcMain.handle('get-data-dir', () => getDataDir());
}

app.whenReady().then(() => {
  registerIpc();
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
