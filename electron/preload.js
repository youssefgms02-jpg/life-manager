const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('lifeManagerDesktop', {
  getVersion: () => ipcRenderer.invoke('lifemanager:version'),
  checkForUpdates: () => ipcRenderer.invoke('lifemanager:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('lifemanager:update-download'),
  installUpdate: () => ipcRenderer.invoke('lifemanager:update-install'),
  onUpdateStatus: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('lifemanager:update-status', listener);
    return () => ipcRenderer.removeListener('lifemanager:update-status', listener);
  }
});
