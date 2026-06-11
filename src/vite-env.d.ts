/// <reference types="vite/client" />

import type {
  AppConfig,
  TileFolderInfo,
  TileNode,
  VideoFile,
} from '../electron/preload';

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<AppConfig>;
      saveLayout: (layout: TileNode) => Promise<AppConfig>;
      renameTile: (
        tileId: string,
        newName: string
      ) => Promise<{ folderPath: string; folderName: string }>;
      getTileFolder: (tileId: string, name: string) => Promise<TileFolderInfo>;
      listVideos: (tileId: string, name: string) => Promise<VideoFile[]>;
      openTileFolder: (tileId: string, name: string) => Promise<string>;
      getDataDir: () => Promise<string>;
    };
  }
}

export {};
