// Storage Manager for Liquid Syntax Highlighter
class StorageManager {
  constructor() {
    this.defaultSettings = {
      liquidHighlighterEnabled: true,
      liquidDisplayMode: 'friendly'
    };
  }

  async getUserSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'liquidHighlighterEnabled', 
        'liquidDisplayMode'
      ]);
      
      return {
        isEnabled: result.liquidHighlighterEnabled !== false,
        displayMode: result.liquidDisplayMode || 'friendly'
      };
    } catch (error) {
      return {
        isEnabled: this.defaultSettings.liquidHighlighterEnabled,
        displayMode: this.defaultSettings.liquidDisplayMode
      };
    }
  }

  async saveUserSettings(settings) {
    try {
      await chrome.storage.sync.set(settings);
      return true;
    } catch (error) {
      console.error('[StorageManager] Failed to save settings:', error);
      return false;
    }
  }

  async toggleHighlighter(enabled) {
    return this.saveUserSettings({ liquidHighlighterEnabled: enabled });
  }

  async setDisplayMode(mode) {
    return this.saveUserSettings({ liquidDisplayMode: mode });
  }

  setupStorageListener(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
          const settingsChanged = {};
          
          if (changes.liquidHighlighterEnabled) {
            settingsChanged.isEnabled = changes.liquidHighlighterEnabled.newValue;
          }
          
          if (changes.liquidDisplayMode) {
            settingsChanged.displayMode = changes.liquidDisplayMode.newValue;
          }
          
          if (Object.keys(settingsChanged).length > 0) {
            callback(settingsChanged);
          }
        }
      });
    }
  }

  async clearUserSettings() {
    try {
      await chrome.storage.sync.clear();
      return true;
    } catch (error) {
      console.error('[StorageManager] Failed to clear settings:', error);
      return false;
    }
  }

  async resetToDefaults() {
    return this.saveUserSettings(this.defaultSettings);
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else {
  window.StorageManager = StorageManager;
} 