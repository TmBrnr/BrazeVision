// Configuration Manager for Liquid Syntax Highlighter
class ConfigManager {
  constructor() {
    this.config = null;
    this.processedConfig = null; // Cache for processed configuration
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
      
      // Process and cache the configuration immediately after loading
      this.processedConfig = this.processConfiguration(this.config);
      
      return this.config;
    } catch (error) {
      console.error('[ConfigManager] Failed to load liquid config:', error);
      this.config = this.defaultConfig;
      this.processedConfig = this.processConfiguration(this.config);
      return this.config;
    }
  }

  processConfiguration(config) {
    const processed = {
      // Pre-process patterns: sort by priority and compile regex
      sortedPatterns: this.processPatterns(config.patterns || {}),
      
      // Process fallback patterns
      fallbackTagPatterns: this.compileFallbackPatterns(config.fallbackTagPatterns || {}),
      outputPatterns: this.compileFallbackPatterns(config.outputPatterns || {}),
      fallbackTransformations: config.fallbackTransformations || {},
      
      // Cache direct access objects
      variables: config.variables || {},
      filters: config.filters || {},
      operators: config.operators || {},
      dynamicPatterns: config.dynamicPatterns || {},
      variablePatterns: this.compileVariablePatterns(config.variablePatterns || {}),
      
      // Fallback mappings
      fallbackFilterDescriptions: config.fallbackFilterDescriptions || {},
      commonVariableMappings: config.commonVariableMappings || {},
      
      // Other cached data
      displayModes: config.displayModes || this.defaultConfig.displayModes,
      styling: config.styling || this.defaultConfig.styling,
      replacements: config.replacements || {}
    };

    return processed;
  }

  processPatterns(rawPatterns) {
    // Convert patterns object to sorted array with compiled regex
    const patternsArray = Object.entries(rawPatterns).map(([name, pattern]) => {
      try {
        return {
          name,
          ...pattern,
          compiledRegex: new RegExp(pattern.regex, 'i'), // Pre-compile with case-insensitive flag
          priority: pattern.priority || 999
        };
      } catch (error) {
        console.warn(`[ConfigManager] Invalid regex in pattern "${name}":`, error);
        return null;
      }
    }).filter(Boolean); // Remove invalid patterns

    // Sort by priority (lower numbers = higher priority)
    patternsArray.sort((a, b) => a.priority - b.priority);
    
    return patternsArray;
  }

  compileVariablePatterns(variablePatterns) {
    const compiled = {};
    for (const [name, pattern] of Object.entries(variablePatterns)) {
      try {
        compiled[name] = new RegExp(pattern, 'i');
      } catch (error) {
        console.warn(`[ConfigManager] Invalid variable pattern "${name}":`, error);
      }
    }
    return compiled;
  }

  compileFallbackPatterns(patterns) {
    const compiled = {};
    for (const [name, pattern] of Object.entries(patterns)) {
      try {
        compiled[name] = new RegExp(pattern, 'i');
      } catch (error) {
        console.warn(`[ConfigManager] Invalid fallback pattern "${name}":`, error);
      }
    }
    return compiled;
  }

  // New method to get processed configuration
  getProcessedConfig() {
    return this.processedConfig;
  }

  // Enhanced methods that return processed data
  getPatterns() {
    return this.processedConfig?.sortedPatterns || [];
  }

  getVariables() {
    return this.processedConfig?.variables || {};
  }

  getFilters() {
    return this.processedConfig?.filters || {};
  }

  getOperators() {
    return this.processedConfig?.operators || {};
  }

  getDynamicPatterns() {
    return this.processedConfig?.dynamicPatterns || {};
  }

  getVariablePatterns() {
    return this.processedConfig?.variablePatterns || {};
  }

  // Legacy methods for backwards compatibility
  getConfig() {
    return this.config;
  }

  getDisplayModes() {
    return this.processedConfig?.displayModes || this.defaultConfig.displayModes;
  }

  getStyling(mode) {
    return this.processedConfig?.styling?.[mode] || this.defaultConfig.styling.friendly;
  }

  getReplacements() {
    return this.processedConfig?.replacements || {};
  }

  // New methods for fallback data
  getFallbackTagPatterns() {
    return this.processedConfig?.fallbackTagPatterns || {};
  }

  getOutputPatterns() {
    return this.processedConfig?.outputPatterns || {};
  }

  getFallbackTransformations() {
    return this.processedConfig?.fallbackTransformations || {};
  }

  getFallbackFilterDescriptions() {
    return this.processedConfig?.fallbackFilterDescriptions || {};
  }

  getCommonVariableMappings() {
    return this.processedConfig?.commonVariableMappings || {};
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