// Configuration Manager for Liquid Syntax Highlighter
class ConfigManager {
  constructor() {
    this.config = null;
    this.defaultConfig = {
      displayModes: {
        friendly: { name: "Friendly", showTechnical: true, showTooltips: true },
        technical: { name: "Technical", showTechnical: true, showTooltips: false }
      },
      patterns: {},
      variables: {},
      styling: {
        friendly: {
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          color: "#1e40af",
          fontWeight: "500"
        }
      }
    };
  }

  async loadConfig() {
    try {
      const response = await fetch(chrome.runtime.getURL('liquid-config.json'));
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('[ConfigManager] Failed to load liquid config:', error);
      this.config = this.defaultConfig;
      return this.config;
    }
  }

  getConfig() {
    return this.config;
  }

  getPatterns() {
    return this.config?.patterns || {};
  }

  getVariables() {
    return this.config?.variables || {};
  }

  getDisplayModes() {
    return this.config?.displayModes || this.defaultConfig.displayModes;
  }

  getStyling(mode) {
    return this.config?.styling?.[mode] || this.defaultConfig.styling.friendly;
  }

  getFilters() {
    return this.config?.filters || {};
  }

  getReplacements() {
    return this.config?.replacements || {};
  }

  getVariablePatterns() {
    return this.config?.variablePatterns || {};
  }

  validateConfig(config) {
    // Basic validation to ensure config has required structure
    const requiredKeys = ['displayModes', 'patterns', 'variables'];
    return requiredKeys.every(key => key in config);
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigManager;
} else {
  window.ConfigManager = ConfigManager;
} 