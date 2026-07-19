import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from './channels'
import type { SpriteHostBridge } from '../src/host/bridge'

const bridge: SpriteHostBridge = {
  getHostInfo: () => ipcRenderer.invoke(CHANNELS.getHostInfo),
  listRecentProjects: () => ipcRenderer.invoke(CHANNELS.listRecentProjects),
  openRecentProject: recentId => ipcRenderer.invoke(CHANNELS.openRecentProject, recentId),
  forgetRecentProject: recentId => ipcRenderer.invoke(CHANNELS.forgetRecentProject, recentId),
  chooseProjectFolder: mode => ipcRenderer.invoke(CHANNELS.chooseProjectFolder, mode),
  chooseProjectFile: mode => ipcRenderer.invoke(CHANNELS.chooseProjectFile, mode),
  chooseExportDirectory: () => ipcRenderer.invoke(CHANNELS.chooseExportDirectory),
  readProject: sourceGrantId => ipcRenderer.invoke(CHANNELS.readProject, sourceGrantId),
  saveProject: request => ipcRenderer.invoke(CHANNELS.saveProject, request),
  inspectArchive: sourceGrantId => ipcRenderer.invoke(CHANNELS.inspectArchive, sourceGrantId),
  writeArchive: request => ipcRenderer.invoke(CHANNELS.writeArchive, request),
  writeExport: request => ipcRenderer.invoke(CHANNELS.writeExport, request),
}

contextBridge.exposeInMainWorld('spriteHost', Object.freeze(bridge))