const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const ShortcutExecutor = require('../shortcuts/ShortcutExecutor');

class TrayManager {
  constructor(configManager, settingsWindow, autoLaunch) {
    this.configManager = configManager;
    this.settingsWindow = settingsWindow;
    this.autoLaunch = autoLaunch;
    this.trays = new Map(); // id -> { tray, shortcut }
  }

  // Initialize all tray icons from config
  async initializeTrays() {
    try {
      const config = await this.configManager.load();
      console.log(`Initializing ${config.shortcuts.length} tray icons`);

      for (const shortcut of config.shortcuts) {
        if (shortcut.enabled) {
          await this.createTray(shortcut);
        }
      }

      console.log(`Created ${this.trays.size} tray icons`);
    } catch (error) {
      console.error('Error initializing trays:', error);
    }
  }

  // Create a single tray icon
  async createTray(shortcut) {
    try {
      // Determine icon folder based on iconType (default to 'icons' for light)
      const iconFolder = (shortcut.iconType === 'dark') ? 'icons-black' : 'icons';
      const iconPath = path.join(__dirname, '..', '..', iconFolder, shortcut.icon);
      let icon;

      try {
        icon = nativeImage.createFromPath(iconPath);
        // Check if icon was loaded successfully
        if (icon.isEmpty()) {
          throw new Error('Icon is empty');
        }
      } catch {
        // Fallback to default tray icon
        console.warn(`Icon ${shortcut.icon} not found, using default`);
        const fallbackPath = path.join(__dirname, '..', '..', 'tray-icon.png');
        icon = nativeImage.createFromPath(fallbackPath);
      }

      // Create tray instance
      const tray = new Tray(icon);
      tray.setToolTip(shortcut.name);

      // Build context menu
      const contextMenu = await this.buildContextMenu(shortcut);
      tray.setContextMenu(contextMenu);

      // Handle left-click to execute shortcut
      tray.on('click', () => {
        console.log(`Tray clicked: ${shortcut.name}`);
        this.executeShortcut(shortcut);
      });

      // Store tray reference
      this.trays.set(shortcut.id, { tray, shortcut });

      console.log(`Created tray icon: ${shortcut.name} (${shortcut.id})`);
    } catch (error) {
      console.error(`Error creating tray for ${shortcut.name}:`, error);
    }
  }

  // Build context menu for a tray icon
  async buildContextMenu(shortcut) {
    // Check if run on startup is enabled
    let runOnStartup = false;
    try {
      runOnStartup = await this.autoLaunch.isEnabled();
    } catch (error) {
      console.error('Error checking auto-launch status:', error);
    }

    return Menu.buildFromTemplate([
      {
        label: `Trigger ${shortcut.name}`,
        click: () => {
          this.executeShortcut(shortcut);
        }
      },
      {
        label: 'Run on Windows startup',
        type: 'checkbox',
        checked: runOnStartup,
        click: async () => {
          await this.toggleAutoLaunch();
        }
      },
      {
        label: 'Settings',
        click: () => {
          this.openSettings();
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
  }

  // Toggle auto-launch setting
  async toggleAutoLaunch() {
    try {
      const currentlyEnabled = await this.autoLaunch.isEnabled();

      if (currentlyEnabled) {
        await this.autoLaunch.disable();
        console.log('Auto-launch disabled');
      } else {
        await this.autoLaunch.enable();
        console.log('Auto-launch enabled');
      }

      // Update config
      await this.configManager.updateSettings({ runOnStartup: !currentlyEnabled });

      // Refresh all trays to update checkmark
      await this.refreshTrays();
    } catch (error) {
      console.error('Error toggling auto-launch:', error);
    }
  }

  // Execute a shortcut
  executeShortcut(shortcut) {
    console.log(`Executing shortcut: ${shortcut.name} (${shortcut.type})`);
    ShortcutExecutor.execute(shortcut);
  }

  // Open settings window
  openSettings() {
    if (this.settingsWindow) {
      this.settingsWindow.open();
    } else {
      console.error('Settings window not initialized');
    }
  }

  // Destroy a specific tray icon
  destroyTray(id) {
    const entry = this.trays.get(id);
    if (entry) {
      try {
        entry.tray.destroy();
        this.trays.delete(id);
        console.log(`Destroyed tray: ${entry.shortcut.name}`);
      } catch (error) {
        console.error(`Error destroying tray ${id}:`, error);
      }
    }
  }

  // Destroy all tray icons
  destroyAllTrays() {
    console.log(`Destroying ${this.trays.size} tray icons`);
    for (const id of this.trays.keys()) {
      this.destroyTray(id);
    }
  }

  // Refresh all trays (reload from config)
  async refreshTrays() {
    console.log('Refreshing all tray icons');

    // Destroy all existing trays
    this.destroyAllTrays();

    // Recreate from current config
    await this.initializeTrays();

    console.log('Tray refresh complete');
  }
}

module.exports = TrayManager;
