const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process via contextBridge
contextBridge.exposeInMainWorld('api', {
  // Configuration methods
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),

  // Icon methods
  listIcons: (iconType) => ipcRenderer.invoke('icons:list', iconType),
  getIconDisplayName: (filename) => ipcRenderer.invoke('icons:getDisplayName', filename),

  // File selection methods
  selectExeFile: () => ipcRenderer.invoke('file:selectExe'),

  // Auto-launch methods
  isAutoLaunchEnabled: () => ipcRenderer.invoke('autolaunch:isEnabled'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('autolaunch:set', enabled)
});

console.log('Preload script loaded - API exposed to renderer');
