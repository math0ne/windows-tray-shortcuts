const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

class ConfigManager {
  constructor() {
    // Store config in AppData
    const userDataPath = app.getPath('userData');
    this.configDir = userDataPath;
    this.configPath = path.join(this.configDir, 'config.json');
    this.tmpConfigPath = path.join(this.configDir, 'config.json.tmp');
  }

  // Get default configuration with existing PowerToys shortcut
  getDefaultConfig() {
    return {
      version: '2.0',
      shortcuts: [
        {
          id: uuidv4(),
          name: 'PowerToys Color Picker',
          type: 'keyboard',
          icon: 'tray-icon.png',
          enabled: true,
          action: {
            keys: ['shift', 'command', 'c']
          }
        }
      ],
      settings: {
        runOnStartup: false
      }
    };
  }

  // Load configuration from file
  async load() {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      // Check if config file exists
      try {
        await fs.access(this.configPath);
      } catch {
        // Config doesn't exist, create default
        console.log('Config not found, creating default configuration');
        const defaultConfig = this.getDefaultConfig();
        await this.save(defaultConfig);
        return defaultConfig;
      }

      // Read and parse config file
      const data = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(data);

      // Validate schema
      if (!this.validateConfig(config)) {
        console.warn('Invalid config schema, using default');
        return this.getDefaultConfig();
      }

      return config;
    } catch (error) {
      console.error('Error loading config:', error);
      // Return default config on error
      return this.getDefaultConfig();
    }
  }

  // Save configuration to file (atomic write)
  async save(config) {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      // Validate before saving
      if (!this.validateConfig(config)) {
        throw new Error('Invalid config schema');
      }

      // Write to temporary file first
      const data = JSON.stringify(config, null, 2);
      await fs.writeFile(this.tmpConfigPath, data, 'utf8');

      // Atomic rename (overwrites existing config.json)
      await fs.rename(this.tmpConfigPath, this.configPath);

      console.log('Config saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving config:', error);

      // Clean up temp file if it exists
      try {
        await fs.unlink(this.tmpConfigPath);
      } catch {}

      return false;
    }
  }

  // Validate configuration schema
  validateConfig(config) {
    if (!config || typeof config !== 'object') return false;
    if (!config.version || !config.shortcuts || !config.settings) return false;
    if (!Array.isArray(config.shortcuts)) return false;

    // Validate each shortcut
    for (const shortcut of config.shortcuts) {
      if (!shortcut.id || !shortcut.name || !shortcut.type || !shortcut.icon) return false;
      if (typeof shortcut.enabled !== 'boolean') return false;
      if (!shortcut.action || typeof shortcut.action !== 'object') return false;

      // Validate based on type
      if (shortcut.type === 'keyboard') {
        if (!Array.isArray(shortcut.action.keys) || shortcut.action.keys.length === 0) {
          return false;
        }
      } else if (shortcut.type === 'executable') {
        if (!shortcut.action.path) return false;
      } else {
        return false; // Unknown type
      }
    }

    return true;
  }

  // Add a new shortcut
  async addShortcut(shortcut) {
    const config = await this.load();
    shortcut.id = uuidv4();
    config.shortcuts.push(shortcut);
    await this.save(config);
    return shortcut.id;
  }

  // Update existing shortcut
  async updateShortcut(id, updates) {
    const config = await this.load();
    const index = config.shortcuts.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error('Shortcut not found');
    }

    config.shortcuts[index] = { ...config.shortcuts[index], ...updates, id };
    await this.save(config);
  }

  // Delete shortcut
  async deleteShortcut(id) {
    const config = await this.load();
    config.shortcuts = config.shortcuts.filter(s => s.id !== id);
    await this.save(config);
  }

  // Update settings
  async updateSettings(settings) {
    const config = await this.load();
    config.settings = { ...config.settings, ...settings };
    await this.save(config);
  }
}

module.exports = ConfigManager;
