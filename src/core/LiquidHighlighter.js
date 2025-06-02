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
      console.log('[LiquidHighlighter] Initializing...');
      
      // Step 1: Load configuration
      await this.configManager.loadConfig();
      console.log('[LiquidHighlighter] Configuration loaded');
      
      // Step 2: Load user settings
      const userSettings = await this.storageManager.getUserSettings();
      this.isEnabled = userSettings.isEnabled;
      this.displayMode = userSettings.displayMode;
      console.log('[LiquidHighlighter] User settings loaded:', userSettings);
      
      // Step 3: Initialize pattern matching and rendering
      this.patternMatcher = new PatternMatcher(this.configManager);
      this.highlightRenderer = new HighlightRenderer(this.configManager);
      this.highlightRenderer.setDisplayMode(this.displayMode);
      console.log('[LiquidHighlighter] Pattern matcher and renderer initialized');
      
      // Step 4: Initialize DOM processor
      this.domProcessor = new DOMProcessor(this.patternMatcher, this.highlightRenderer);
      console.log('[LiquidHighlighter] DOM processor initialized');
      
      // Step 5: Initialize event management
      this.eventManager = new EventManager(this.domProcessor, this.storageManager);
      
      // Step 6: Start the system if enabled
      if (this.isEnabled) {
        this.eventManager.initialize();
        console.log('[LiquidHighlighter] Event manager initialized and started');
      }
      
      this.initialized = true;
      console.log('[LiquidHighlighter] Initialization complete');
      
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
    
    console.log(`[LiquidHighlighter] Changed display mode to: ${mode}`);
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
    
    console.log(`[LiquidHighlighter] ${operation} took ${duration.toFixed(2)}ms`);
    
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
    console.log('[LiquidHighlighter] Cleanup completed');
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

// Initialize the highlighter when the page is ready
async function initializeLiquidHighlighter() {
  try {
    console.log('[LiquidHighlighter] Starting initialization...');
    
    // Check if all required classes are available
    const requiredClasses = [
      'ConfigManager', 'StorageManager', 'PatternMatcher',
      'HighlightRenderer', 'DOMProcessor', 'EventManager'
    ];

    const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');
    
    if (missingClasses.length > 0) {
      console.error('[LiquidHighlighter] Missing required classes:', missingClasses);
      return;
    }

    if (!LiquidHighlighter.isSupported()) {
      console.error('[LiquidHighlighter] Browser environment not supported');
      return;
    }

    // Create and initialize the highlighter
    liquidHighlighterInstance = await LiquidHighlighter.create();
    
    if (liquidHighlighterInstance) {
      console.log('[LiquidHighlighter] Successfully initialized');
      
      // Make instance globally accessible for debugging
      window.liquidHighlighter = liquidHighlighterInstance;
      
      // Setup popup communication
      setupPopupCommunication();
    } else {
      console.error('[LiquidHighlighter] Failed to create highlighter instance');
    }
    
  } catch (error) {
    console.error('[LiquidHighlighter] Initialization error:', error);
  }
}

// Setup communication with popup
function setupPopupCommunication() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!liquidHighlighterInstance) {
      sendResponse({ success: false, error: 'Highlighter not initialized' });
      return;
    }

    console.log('[LiquidHighlighter] Received message:', request);
    
    switch (request.action) {
      case 'toggle':
        liquidHighlighterInstance.toggle(request.enabled).then(success => {
          sendResponse({ success });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
        
      case 'getStatus':
        sendResponse(liquidHighlighterInstance.getStatus());
        break;
        
      case 'refresh':
        const refreshed = liquidHighlighterInstance.refresh();
        sendResponse({ success: refreshed });
        break;
        
      case 'changeMode':
        liquidHighlighterInstance.changeMode(request.mode).then(success => {
          sendResponse({ success });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
        
      case 'diagnose':
        sendResponse(liquidHighlighterInstance.diagnose());
        break;
        
      case 'debugHighlights':
        sendResponse(liquidHighlighterInstance.debugHighlights());
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
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