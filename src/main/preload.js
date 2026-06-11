const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('videoTiler', {
  getState: () => ipcRenderer.invoke('app:get-state'),
  chooseWorkspace: () => ipcRenderer.invoke('app:choose-workspace'),
  splitTile: (tileId, direction) => ipcRenderer.invoke('tile:split', { tileId, direction }),
  resizeSplit: (splitId, ratio) => ipcRenderer.invoke('tile:resize-split', { splitId, ratio }),
  renameTile: (tileId, name) => ipcRenderer.invoke('tile:rename', { tileId, name }),
  listVideos: (tileId) => ipcRenderer.invoke('tile:list-videos', tileId),
  importVideos: (tileId) => ipcRenderer.invoke('tile:import-videos', tileId),
  showFolder: (tileId) => ipcRenderer.invoke('tile:show-folder', tileId),
  videoUrl: (tileId, fileName) => ipcRenderer.invoke('tile:video-url', { tileId, fileName })
});
