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

  listLayouts: () => ipcRenderer.invoke('layouts:list'),
  getActiveLayout: () => ipcRenderer.invoke('layouts:active'),
  createLayout: (name) => ipcRenderer.invoke('layouts:create', { name }),
  loadLayoutProfile: (id) => ipcRenderer.invoke('layouts:load', { id }),
  deleteLayout: (id) => ipcRenderer.invoke('layouts:delete', { id }),
  renameLayout: (id, name) => ipcRenderer.invoke('layouts:rename', { id, name }),
  exportLayout: (id) => ipcRenderer.invoke('layouts:export', { id }),
  importLayout: () => ipcRenderer.invoke('layouts:import'),

  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  onFullscreenChanged: (callback) => {
    const listener = (_evt, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window:fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', listener);
  },

  listDisplays: () => ipcRenderer.invoke('displays:list'),
  getDisplayStatus: () => ipcRenderer.invoke('displays:status'),
  getDisplayAssignments: () => ipcRenderer.invoke('displays:getAssignments'),
  saveDisplayAssignments: (map) =>
    ipcRenderer.invoke('displays:saveAssignments', { map }),
  ensureDisplayLayout: (displayId, displayLabel) =>
    ipcRenderer.invoke('displays:ensureLayout', { displayId, displayLabel }),
  startDisplays: (assignments) =>
    ipcRenderer.invoke('displays:start', { assignments }),
  stopDisplays: () => ipcRenderer.invoke('displays:stop'),
  presenterReady: () => ipcRenderer.invoke('presenter:ready'),
  onPresenterSync: (callback) => {
    const listener = (_evt, payload) => callback(payload);
    ipcRenderer.on('presenter:sync', listener);
    return () => ipcRenderer.removeListener('presenter:sync', listener);
  },
  onDisplaySessionChanged: (callback) => {
    const listener = (_evt, status) => callback(status);
    ipcRenderer.on('display:session-changed', listener);
    return () => ipcRenderer.removeListener('display:session-changed', listener);
  },
  onDisplaysChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('displays:changed', listener);
    return () => ipcRenderer.removeListener('displays:changed', listener);
  },

  // Convert an absolute filesystem path to a file:// URL usable by <video src>.
  toFileURL: (filePath) => pathToFileURL(filePath).href
});
