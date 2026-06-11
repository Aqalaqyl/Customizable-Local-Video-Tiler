import { contextBridge, ipcRenderer } from 'electron';

export interface TileLeaf {
  type: 'leaf';
  id: string;
  name: string;
}

export interface TileSplit {
  type: 'split';
  direction: 'horizontal' | 'vertical';
  ratio: number;
  first: TileNode;
  second: TileNode;
}

export type TileNode = TileLeaf | TileSplit;

export interface AppConfig {
  layout: TileNode;
  version: number;
}

export interface VideoFile {
  name: string;
  path: string;
}

export interface TileFolderInfo {
  folderPath: string;
  folderName: string;
  videos: VideoFile[];
}

const api = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveLayout: (layout: TileNode): Promise<AppConfig> =>
    ipcRenderer.invoke('save-layout', layout),
  renameTile: (
    tileId: string,
    newName: string
  ): Promise<{ folderPath: string; folderName: string }> =>
    ipcRenderer.invoke('rename-tile', tileId, newName),
  getTileFolder: (tileId: string, name: string): Promise<TileFolderInfo> =>
    ipcRenderer.invoke('get-tile-folder', tileId, name),
  listVideos: (tileId: string, name: string): Promise<VideoFile[]> =>
    ipcRenderer.invoke('list-videos', tileId, name),
  openTileFolder: (tileId: string, name: string): Promise<string> =>
    ipcRenderer.invoke('open-tile-folder', tileId, name),
  getDataDir: (): Promise<string> => ipcRenderer.invoke('get-data-dir'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
