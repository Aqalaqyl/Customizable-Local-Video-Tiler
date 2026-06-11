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

  // Convert an absolute filesystem path to a file:// URL usable by <video src>.
  toFileURL: (filePath) => pathToFileURL(filePath).href
});
