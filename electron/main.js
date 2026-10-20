const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let updateCheckInProgress = false;

function sendUpdateStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('lifemanager:update-status', status);
}

function configureUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }));
  autoUpdater.on('update-available', info => {
    updateCheckInProgress = false;
    sendUpdateStatus({ state: 'available', version: info.version, releaseName: info.releaseName || '' });
  });
  autoUpdater.on('update-not-available', info => {
    updateCheckInProgress = false;
    sendUpdateStatus({ state: 'not-available', version: info && info.version ? info.version : app.getVersion() });
  });
  autoUpdater.on('download-progress', progress => sendUpdateStatus({
    state: 'downloading', percent: Math.max(0, Math.min(100, Math.round(progress.percent || 0)))
  }));
  autoUpdater.on('update-downloaded', info => sendUpdateStatus({ state: 'downloaded', version: info.version }));
  autoUpdater.on('error', error => {
    updateCheckInProgress = false;
    sendUpdateStatus({ state: 'error', message: String(error && error.message || 'Update failed').slice(0, 300) });
  });

  ipcMain.handle('lifemanager:version', () => app.getVersion());
  ipcMain.handle('lifemanager:update-check', async () => {
    if (!app.isPackaged) return { state: 'unavailable-in-development', version: app.getVersion() };
    if (updateCheckInProgress) return { state: 'checking', version: app.getVersion() };
    updateCheckInProgress = true;
    try { await autoUpdater.checkForUpdates(); return { state: 'checking', version: app.getVersion() }; }
    catch (error) {
      updateCheckInProgress = false;
      sendUpdateStatus({ state: 'error', message: String(error && error.message || 'Update check failed').slice(0, 300) });
      throw error;
    }
  });
  ipcMain.handle('lifemanager:update-download', async () => {
    if (!app.isPackaged) throw new Error('Updates are available only in the installed app.');
    await autoUpdater.downloadUpdate();
    return { state: 'downloading' };
  });
  ipcMain.handle('lifemanager:update-install', () => {
    autoUpdater.quitAndInstall(false, true);
    return { state: 'installing' };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 850, minWidth: 360, minHeight: 560,
    backgroundColor: '#f4f7fd',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

configureUpdater();
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
