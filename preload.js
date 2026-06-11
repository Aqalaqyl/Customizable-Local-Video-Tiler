const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  pickDirectory: () => ipcRenderer.invoke("dialog:pick-directory"),
  loadState: () => ipcRenderer.invoke("state:load"),
  saveState: (state) => ipcRenderer.invoke("state:save", state),
  ensureDirectory: (path) => ipcRenderer.invoke("fs:ensure-directory", path),
  renameDirectory: (payload) => ipcRenderer.invoke("fs:rename-directory", payload),
  listVideos: (rootPath) => ipcRenderer.invoke("media:list-videos", rootPath)
});
