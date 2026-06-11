/// <reference types="vite/client" />

interface VideoFile {
  name: string
  path: string
}

interface ElectronAPI {
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

interface Window {
  electronAPI: ElectronAPI
}
