const { execSync } = require('child_process');

class AutoLaunch {
  constructor(appName, appPath) {
    this.appName = appName;
    this.appPath = appPath;
    this.registryKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  }

  // Check if auto-launch is enabled
  async isEnabled() {
    try {
      // Query registry for the app entry
      const output = execSync(
        `reg query "${this.registryKey}" /v "${this.appName}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      // Check if the output contains our app path
      return output.includes(this.appPath);
    } catch (error) {
      // Error means the registry key doesn't exist
      return false;
    }
  }

  // Enable auto-launch
  async enable() {
    try {
      console.log(`Enabling auto-launch for: ${this.appName}`);

      // Add registry entry
      execSync(
        `reg add "${this.registryKey}" /v "${this.appName}" /t REG_SZ /d "${this.appPath}" /f`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      console.log('Auto-launch enabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to enable auto-launch:', error.message);
      return false;
    }
  }

  // Disable auto-launch
  async disable() {
    try {
      console.log(`Disabling auto-launch for: ${this.appName}`);

      // Delete registry entry
      execSync(
        `reg delete "${this.registryKey}" /v "${this.appName}" /f`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      console.log('Auto-launch disabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to disable auto-launch:', error.message);
      return false;
    }
  }

  // Toggle auto-launch on/off
  async toggle() {
    const isEnabled = await this.isEnabled();

    if (isEnabled) {
      return await this.disable();
    } else {
      return await this.enable();
    }
  }
}

module.exports = AutoLaunch;
