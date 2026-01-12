const { BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');

class SettingsWindow {
  constructor(configManager, trayManager, iconManager, autoLaunch) {
    this.configManager = configManager;
    this.trayManager = trayManager;
    this.iconManager = iconManager;
    this.autoLaunch = autoLaunch;
    this.window = null;

    // Setup IPC handlers
    this.setupIpcHandlers();
  }

  // Open settings window
  open() {
    // If window already exists, just focus it
    if (this.window) {
      this.window.focus();
      return;
    }

    // Create new browser window
    this.window = new BrowserWindow({
      width: 900,
      height: 700,
      title: 'Tray Shortcuts Settings',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '..', '..', 'renderer', 'preload.js')
      },
      autoHideMenuBar: true,
      resizable: true,
      minimizable: true,
      maximizable: true
    });

    // Load the settings HTML file
    this.window.loadFile(path.join(__dirname, '..', '..', 'renderer', 'settings.html'));

    // Handle window closed
    this.window.on('closed', () => {
      this.window = null;
    });

    console.log('Settings window opened');
  }

  // Close settings window
  close() {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  // Setup IPC handlers for renderer communication
  setupIpcHandlers() {
    // Get current configuration
    ipcMain.handle('config:get', async () => {
      try {
        const config = await this.configManager.load();
        return { success: true, config };
      } catch (error) {
        console.error('Error getting config:', error);
        return { success: false, error: error.message };
      }
    });

    // Save configuration and refresh trays
    ipcMain.handle('config:save', async (event, config) => {
      try {
        await this.configManager.save(config);
        await this.trayManager.refreshTrays();
        return { success: true };
      } catch (error) {
        console.error('Error saving config:', error);
        return { success: false, error: error.message };
      }
    });

    // Get list of available icons
    ipcMain.handle('icons:list', async (event, iconType = 'light') => {
      try {
        const icons = await this.iconManager.listIcons(iconType);
        return { success: true, icons };
      } catch (error) {
        console.error('Error listing icons:', error);
        return { success: false, error: error.message };
      }
    });

    // Get icon display name
    ipcMain.handle('icons:getDisplayName', async (event, filename) => {
      try {
        const displayName = this.iconManager.getDisplayName(filename);
        return { success: true, displayName };
      } catch (error) {
        console.error('Error getting display name:', error);
        return { success: false, error: error.message };
      }
    });

    // Open file dialog to select executable
    ipcMain.handle('file:selectExe', async () => {
      try {
        const result = await dialog.showOpenDialog({
          title: 'Select Executable',
          properties: ['openFile'],
          filters: [
            { name: 'Executables', extensions: ['exe'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: true, path: null };
        }

        return { success: true, path: result.filePaths[0] };
      } catch (error) {
        console.error('Error selecting executable:', error);
        return { success: false, error: error.message };
      }
    });

    // Get auto-launch status
    ipcMain.handle('autolaunch:isEnabled', async () => {
      try {
        const enabled = await this.autoLaunch.isEnabled();
        return { success: true, enabled };
      } catch (error) {
        console.error('Error checking auto-launch:', error);
        return { success: false, error: error.message };
      }
    });

    // Set auto-launch status
    ipcMain.handle('autolaunch:set', async (event, enabled) => {
      try {
        let result;
        if (enabled) {
          result = await this.autoLaunch.enable();
        } else {
          result = await this.autoLaunch.disable();
        }

        // Also update config
        await this.configManager.updateSettings({ runOnStartup: enabled });

        return { success: result };
      } catch (error) {
        console.error('Error setting auto-launch:', error);
        return { success: false, error: error.message };
      }
    });

    console.log('IPC handlers registered');
  }
}

module.exports = SettingsWindow;
