import { contextBridge, ipcRenderer } from 'electron'

export interface VideoFile {
  name: string
  path: string
}

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>
  listVideos: (folderPath: string) => Promise<VideoFile[]>
  createFolder: (basePath: string, name: string) => Promise<string>
  renameFolder: (basePath: string, oldName: string, newName: string) => Promise<string>
  ensureDir: (dirPath: string) => Promise<boolean>
  folderExists: (folderPath: string) => Promise<boolean>
  loadState: () => Promise<unknown>
  saveState: (state: unknown) => Promise<boolean>
  getDefaultBasePath: () => Promise<string>
  openPath: (filePath: string) => Promise<void>
}

const api: ElectronAPI = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  listVideos: (folderPath) => ipcRenderer.invoke('fs:listVideos', folderPath),
  createFolder: (basePath, name) => ipcRenderer.invoke('fs:createFolder', basePath, name),
  renameFolder: (basePath, oldName, newName) => ipcRenderer.invoke('fs:renameFolder', basePath, oldName, newName),
  ensureDir: (dirPath) => ipcRenderer.invoke('fs:ensureDir', dirPath),
  folderExists: (folderPath) => ipcRenderer.invoke('fs:folderExists', folderPath),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  getDefaultBasePath: () => ipcRenderer.invoke('app:getDefaultBasePath'),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath)
}

contextBridge.exposeInMainWorld('electronAPI', api)
