const fs = require('fs').promises;
const path = require('path');

class IconManager {
  constructor() {
    this.lightIconsDir = path.join(__dirname, '..', '..', 'icons');
    this.darkIconsDir = path.join(__dirname, '..', '..', 'icons-black');
    this.lightCache = null;
    this.lightCacheTime = null;
    this.darkCache = null;
    this.darkCacheTime = null;
  }

  // List all available icon files by type
  async listIcons(iconType = 'light') {
    try {
      const isLight = iconType === 'light';
      const cache = isLight ? this.lightCache : this.darkCache;
      const cacheTime = isLight ? this.lightCacheTime : this.darkCacheTime;
      const iconsDir = isLight ? this.lightIconsDir : this.darkIconsDir;

      // Use cache if available and less than 5 minutes old
      const now = Date.now();
      if (cache && cacheTime && (now - cacheTime) < 300000) {
        return cache;
      }

      // Read icons directory
      const files = await fs.readdir(iconsDir);

      // Filter for PNG files only
      const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));

      // Sort with priority for commonly used icons
      const sortedIcons = this.sortIcons(pngFiles);

      // Update cache
      if (isLight) {
        this.lightCache = sortedIcons;
        this.lightCacheTime = now;
      } else {
        this.darkCache = sortedIcons;
        this.darkCacheTime = now;
      }

      console.log(`Found ${sortedIcons.length} ${iconType} icon files`);
      return sortedIcons;
    } catch (error) {
      console.error(`Error listing ${iconType} icons:`, error);
      return [];
    }
  }

  // Sort icons with priority for common ones
  sortIcons(icons) {
    // Priority list - these icons appear first
    const priority = [
      'tray-icon.png',
      'Color',
      'Settings',
      'Calculator',
      'Notepad',
      'Chrome',
      'Firefox',
      'Edge'
    ];

    return icons.sort((a, b) => {
      // Check if either icon matches priority list
      const aPriority = priority.findIndex(p => a.includes(p));
      const bPriority = priority.findIndex(p => b.includes(p));

      // Both have priority - sort by priority index
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }

      // Only 'a' has priority
      if (aPriority !== -1) return -1;

      // Only 'b' has priority
      if (bPriority !== -1) return 1;

      // Neither has priority - sort alphabetically
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  }

  // Get full path for an icon
  getIconPath(filename, iconType = 'light') {
    const iconsDir = iconType === 'light' ? this.lightIconsDir : this.darkIconsDir;
    return path.join(iconsDir, filename);
  }

  // Check if an icon exists
  async iconExists(filename, iconType = 'light') {
    try {
      const iconPath = this.getIconPath(filename, iconType);
      await fs.access(iconPath);
      return true;
    } catch {
      return false;
    }
  }

  // Get icon display name (cleaned up for UI)
  getDisplayName(filename) {
    return filename
      .replace(/\.png$/i, '')           // Remove .png extension
      .replace(/_/g, ' ')                // Replace underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
  }

  // Clear cache (useful after adding new icons)
  clearCache() {
    this.lightCache = null;
    this.lightCacheTime = null;
    this.darkCache = null;
    this.darkCacheTime = null;
  }
}

module.exports = IconManager;
