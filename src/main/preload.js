'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('api', {
  getLibrary: () => ipcRenderer.invoke('library:get'),
  chooseLibrary: () => ipcRenderer.invoke('library:choose'),

  ensureFolder: (name, currentPath) =>
    ipcRenderer.invoke('folder:ensure', { name, currentPath }),
  deleteFolder: (folderPath, removeFiles) =>
    ipcRenderer.invoke('folder:delete', { folderPath, removeFiles }),
  listVideos: (folderPath) =>
    ipcRenderer.invoke('folder:listVideos', { folderPath }),
  openFolder: (folderPath) =>
    ipcRenderer.invoke('folder:open', { folderPath }),
  addVideos: (folderPath) =>
    ipcRenderer.invoke('videos:add', { folderPath }),

  loadLayout: () => ipcRenderer.invoke('layout:load'),
  saveLayout: (layout) => ipcRenderer.invoke('layout:save', layout),

  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  onFullscreenChanged: (callback) => {
    const listener = (_evt, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window:fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', listener);
  },

  // Convert an absolute filesystem path to a file:// URL usable by <video src>.
  toFileURL: (filePath) => pathToFileURL(filePath).href
});
