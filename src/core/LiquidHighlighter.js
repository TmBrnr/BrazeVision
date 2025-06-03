// Main Liquid Syntax Highlighter - Orchestrator Class
class LiquidHighlighter {
  constructor() {
    this.isEnabled = true;
    this.displayMode = 'friendly';
    this.isInIframe = window !== window.top;
    
    // Initialize modules
    this.configManager = new ConfigManager();
    this.storageManager = new StorageManager();
    this.patternMatcher = null; // Will be initialized after config loads
    this.highlightRenderer = null; // Will be initialized after config loads
    this.domProcessor = null; // Will be initialized after dependencies
    this.eventManager = null; // Will be initialized last
    
    // Track initialization state
    this.initialized = false;
  }

  async init() {
    try {
      // Step 1: Load configuration
      await this.configManager.loadConfig();
      
      // Step 2: Load user settings
      const userSettings = await this.storageManager.getUserSettings();
      this.isEnabled = userSettings.isEnabled;
      this.displayMode = userSettings.displayMode;
      
      // Step 3: Initialize pattern matching and rendering
      this.patternMatcher = new PatternMatcher(this.configManager);
      this.highlightRenderer = new HighlightRenderer(this.configManager);
      this.highlightRenderer.setDisplayMode(this.displayMode);
      
      // Step 4: Initialize DOM processor
      this.domProcessor = new DOMProcessor(this.patternMatcher, this.highlightRenderer);
      
      // Step 5: Initialize event management
      this.eventManager = new EventManager(this.domProcessor, this.storageManager);
      
      // Step 6: Start the system if enabled
      if (this.isEnabled) {
        this.eventManager.initialize();
      }
      
      this.initialized = true;
      
      return true;
    } catch (error) {
      console.error('[LiquidHighlighter] Initialization failed:', error);
      return false;
    }
  }

  // Public API methods for external control
  async toggle(enabled) {
    if (!this.initialized) {
      console.warn('[LiquidHighlighter] Not initialized yet');
      return false;
    }
    
    this.isEnabled = enabled;
    this.eventManager.toggleHighlighting(enabled);
    return true;
  }

  async changeMode(mode) {
    if (!this.initialized) {
      console.warn('[LiquidHighlighter] Not initialized yet');
      return false;
    }
    
    this.displayMode = mode;
    
    // Update both pattern matcher and renderer with new mode
    if (this.patternMatcher) {
      this.patternMatcher.setDisplayMode(mode);
    }
    if (this.highlightRenderer) {
      this.highlightRenderer.setDisplayMode(mode);
    }
    
    // Refresh highlighting with new mode
    this.eventManager.changeDisplayMode(mode);
    
    return true;
  }

  refresh() {
    if (!this.initialized) {
      console.warn('[LiquidHighlighter] Not initialized yet');
      return false;
    }
    
    this.eventManager.refreshHighlighting();
    return true;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      enabled: this.isEnabled,
      mode: this.displayMode,
      isInIframe: this.isInIframe,
      stats: this.initialized ? this.eventManager.getStats() : null
    };
  }

  // Configuration methods
  getConfig() {
    return this.configManager.getConfig();
  }

  getPatterns() {
    return this.configManager.getPatterns();
  }

  getVariables() {
    return this.configManager.getVariables();
  }

  // Diagnostic methods
  diagnose() {
    if (!this.initialized) {
      return {
        status: 'error',
        message: 'Not initialized',
        details: null
      };
    }

    const stats = this.eventManager.getStats();
    const config = this.configManager.getConfig();
    
    return {
      status: 'ok',
      message: 'Highlighter is working properly',
      details: {
        modules: {
          configManager: !!this.configManager,
          storageManager: !!this.storageManager,
          patternMatcher: !!this.patternMatcher,
          highlightRenderer: !!this.highlightRenderer,
          domProcessor: !!this.domProcessor,
          eventManager: !!this.eventManager
        },
        state: {
          enabled: this.isEnabled,
          mode: this.displayMode,
          highlightedElements: stats.highlightedElements,
          lastContentHash: stats.lastContentHash
        },
        config: {
          patternsLoaded: Object.keys(config?.patterns || {}).length,
          variablesLoaded: Object.keys(config?.variables || {}).length,
          modesAvailable: Object.keys(config?.displayModes || {}).length
        }
      }
    };
  }

  // Performance monitoring
  measurePerformance(operation, fn) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (this.eventManager) {
      this.eventManager.trackPerformance(operation, duration);
    }
    
    return result;
  }

  // Cleanup method
  cleanup() {
    if (this.eventManager) {
      this.eventManager.cleanup();
    }
    
    if (this.domProcessor) {
      this.domProcessor.removeHighlights();
    }
    
    this.initialized = false;
  }

  // Static method to create and initialize
  static async create() {
    const highlighter = new LiquidHighlighter();
    const success = await highlighter.init();
    
    if (!success) {
      console.error('[LiquidHighlighter] Failed to create highlighter instance');
      return null;
    }
    
    return highlighter;
  }

  // Static method for feature detection
  static isSupported() {
    return !!(
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.storage &&
      document.body &&
      MutationObserver &&
      performance
    );
  }

  // Debug helper methods
  debugHighlights() {
    if (!this.domProcessor) return [];
    
    const highlights = document.querySelectorAll('.liquid-highlight');
    return Array.from(highlights).map(element => ({
      original: element.dataset.liquidOriginal,
      clean: element.dataset.liquidClean,
      pattern: element.dataset.liquidPattern,
      type: element.dataset.liquidType,
      importance: element.dataset.liquidImportance,
      styling: this.highlightRenderer.getElementStyling(element)
    }));
  }

  debugPatterns(text) {
    if (!this.patternMatcher) return [];
    return this.patternMatcher.findLiquidMatches(text);
  }
}

// Global initialization when all modules are loaded
let liquidHighlighterInstance = null;

// Initialize the highlighter when the content script loads
async function initializeLiquidHighlighter() {
  try {
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }
    
    if (!LiquidHighlighter.isSupported()) {
      return;
    }

    const highlighter = new LiquidHighlighter();
    const success = await highlighter.init();
    
    if (success) {
      window.liquidHighlighter = highlighter;
      setupPopupCommunication();
    }
  } catch (error) {
    console.error('[LiquidHighlighter] Failed to initialize:', error);
  }
}

// Setup communication with popup
function setupPopupCommunication() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!window.liquidHighlighter) {
      sendResponse({ success: false, error: 'Highlighter not initialized' });
      return;
    }

    switch (request.action) {
      case 'toggle':
        window.liquidHighlighter.toggle(request.enabled)
          .then(success => sendResponse({ success }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        break;

      case 'changeMode':
        window.liquidHighlighter.changeMode(request.mode)
          .then(success => sendResponse({ success }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        break;

      case 'refresh':
        const refreshSuccess = window.liquidHighlighter.refresh();
        sendResponse({ success: refreshSuccess });
        break;

      case 'getStatus':
        const status = window.liquidHighlighter.getStatus();
        sendResponse({ success: true, status });
        break;

      case 'diagnose':
        const diagnosis = window.liquidHighlighter.diagnose();
        sendResponse({ success: true, diagnosis });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }

    return true; // Keep the message channel open for async responses
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (liquidHighlighterInstance) {
    liquidHighlighterInstance.cleanup();
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiquidHighlighter;
} else {
  window.LiquidHighlighter = LiquidHighlighter;
}

// Initialize when DOM is ready and all scripts have loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeLiquidHighlighter, 100); // Small delay to ensure all modules are ready
  });
} else {
  // DOM is already ready, initialize with a small delay
  setTimeout(initializeLiquidHighlighter, 100);
} 