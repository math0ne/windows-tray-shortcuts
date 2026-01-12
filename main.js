const { app } = require('electron');
const path = require('path');

// Import our custom modules
const ConfigManager = require('./src/config/ConfigManager');
const TrayManager = require('./src/tray/TrayManager');
const IconManager = require('./src/utils/IconManager');
const AutoLaunch = require('./src/utils/AutoLaunch');
const SettingsWindow = require('./src/windows/SettingsWindow');

// Global instances
let configManager;
let trayManager;
let iconManager;
let autoLaunch;
let settingsWindow;

// Initialize application when ready
app.whenReady().then(async () => {
  // Prevent app from showing in taskbar
  app.dock?.hide();

  console.log('Application starting...');

  try {
    // Initialize managers
    configManager = new ConfigManager();
    iconManager = new IconManager();
    autoLaunch = new AutoLaunch(
      'PowerToys Color Picker Tray',
      process.execPath
    );

    // Initialize settings window (but don't open it yet)
    settingsWindow = new SettingsWindow(
      configManager,
      null, // TrayManager will be set after creation
      iconManager,
      autoLaunch
    );

    // Initialize tray manager
    trayManager = new TrayManager(configManager, settingsWindow, autoLaunch);
    settingsWindow.trayManager = trayManager; // Link tray manager to settings window

    // Create tray icons from configuration
    await trayManager.initializeTrays();

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
});

// Prevent app from quitting when all windows are closed
app.on('window-all-closed', (e) => {
  // Prevent default behavior of quitting the app
  e.preventDefault();
});

// Prevent app from quitting on activation
app.on('activate', () => {
  // On macOS it's common to re-create a window when the
  // dock icon is clicked and there are no other windows open.
  // We don't want this behavior for a tray-only app.
});

// Cleanup on quit
app.on('before-quit', () => {
  console.log('Application shutting down...');
  if (trayManager) {
    trayManager.destroyAllTrays();
  }
});
