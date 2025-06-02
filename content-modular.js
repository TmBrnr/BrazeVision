// Modular Content Script Loader for Liquid Syntax Highlighter

(function() {
  'use strict';
  
  console.log('[ModularContent] Starting modular content script initialization');

  // Module loading configuration
  const MODULE_CONFIG = {
    baseUrl: chrome.runtime.getURL('src/'),
    modules: [
      // Core modules (load first)
      'core/ConfigManager.js',
      'core/StorageManager.js',
      
      // Pattern processing modules
      'patterns/PatternMatcher.js',
      
      // UI and DOM modules
      'ui/HighlightRenderer.js',
      'dom/DOMProcessor.js',
      
      // Event management
      'core/EventManager.js',
      
      // Main orchestrator (load last)
      'core/LiquidHighlighter.js'
    ]
  };

  // Module loading state
  let loadedModules = 0;
  let totalModules = MODULE_CONFIG.modules.length;
  let loadingErrors = [];

  // Load modules sequentially to ensure proper dependency order
  async function loadModules() {
    console.log(`[ModularContent] Loading ${totalModules} modules...`);
    
    for (const modulePath of MODULE_CONFIG.modules) {
      try {
        await loadModule(modulePath);
        loadedModules++;
        console.log(`[ModularContent] Loaded module ${loadedModules}/${totalModules}: ${modulePath}`);
      } catch (error) {
        console.error(`[ModularContent] Failed to load module ${modulePath}:`, error);
        loadingErrors.push({ module: modulePath, error });
      }
    }

    if (loadingErrors.length === 0) {
      console.log('[ModularContent] All modules loaded successfully');
      initializeHighlighter();
    } else {
      console.error(`[ModularContent] Failed to load ${loadingErrors.length} modules:`, loadingErrors);
    }
  }

  // Load individual module
  function loadModule(modulePath) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = MODULE_CONFIG.baseUrl + modulePath;
      script.type = 'text/javascript';
      
      script.onload = () => {
        document.head.removeChild(script);
        resolve();
      };
      
      script.onerror = () => {
        document.head.removeChild(script);
        reject(new Error(`Failed to load script: ${modulePath}`));
      };
      
      document.head.appendChild(script);
    });
  }

  // Initialize the main highlighter system
  async function initializeHighlighter() {
    try {
      console.log('[ModularContent] Initializing LiquidHighlighter...');
      
      // Check if all required classes are available
      const requiredClasses = [
        'ConfigManager', 'StorageManager', 'PatternMatcher',
        'HighlightRenderer', 'DOMProcessor', 'EventManager', 'LiquidHighlighter'
      ];

      const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');
      
      if (missingClasses.length > 0) {
        throw new Error(`Missing required classes: ${missingClasses.join(', ')}`);
      }

      // Initialize the highlighter
      const highlighter = await LiquidHighlighter.create();
      
      if (highlighter) {
        console.log('[ModularContent] LiquidHighlighter initialized successfully');
        
        // Make it globally accessible for debugging and popup communication
        window.liquidHighlighter = highlighter;
        
        // Setup message handling for popup
        setupPopupCommunication(highlighter);
        
        // Report successful initialization
        reportInitializationStatus(true, highlighter.getStatus());
      } else {
        throw new Error('LiquidHighlighter.create() returned null');
      }
      
    } catch (error) {
      console.error('[ModularContent] Failed to initialize LiquidHighlighter:', error);
      reportInitializationStatus(false, { error: error.message });
    }
  }

  // Setup communication with popup
  function setupPopupCommunication(highlighter) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('[ModularContent] Received message:', request);
      
      switch (request.action) {
        case 'toggle':
          highlighter.toggle(request.enabled).then(success => {
            sendResponse({ success });
          });
          return true; // Keep message channel open for async response
          
        case 'getStatus':
          sendResponse(highlighter.getStatus());
          break;
          
        case 'refresh':
          const refreshed = highlighter.refresh();
          sendResponse({ success: refreshed });
          break;
          
        case 'changeMode':
          highlighter.changeMode(request.mode).then(success => {
            sendResponse({ success });
          });
          return true; // Keep message channel open for async response
          
        case 'diagnose':
          sendResponse(highlighter.diagnose());
          break;
          
        case 'debugHighlights':
          sendResponse(highlighter.debugHighlights());
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  // Report initialization status (could be used for monitoring/analytics)
  function reportInitializationStatus(success, data) {
    const status = {
      success,
      timestamp: Date.now(),
      url: window.location.href,
      isIframe: window !== window.top,
      data
    };
    
    console.log('[ModularContent] Initialization status:', status);
    
    // Could send to background script for monitoring if needed
    try {
      chrome.runtime.sendMessage({
        action: 'initializationStatus',
        status
      }).catch(error => {
        // Background script might not be listening, which is okay
        console.log('[ModularContent] Background script not listening:', error);
      });
    } catch (error) {
      // Extension context might not be available
      console.log('[ModularContent] Cannot communicate with background script:', error);
    }
  }

  // Graceful cleanup on page unload
  function setupCleanup() {
    const cleanup = () => {
      if (window.liquidHighlighter) {
        console.log('[ModularContent] Cleaning up on page unload');
        window.liquidHighlighter.cleanup();
      }
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
    
    // Also cleanup if extension is disabled/removed
    if (chrome.runtime.onSuspend) {
      chrome.runtime.onSuspend.addListener(cleanup);
    }
  }

  // Feature detection
  function checkEnvironment() {
    const required = {
      chrome: typeof chrome !== 'undefined',
      runtime: typeof chrome?.runtime !== 'undefined',
      storage: typeof chrome?.storage !== 'undefined',
      dom: typeof document !== 'undefined' && document.body,
      mutationObserver: typeof MutationObserver !== 'undefined',
      performance: typeof performance !== 'undefined'
    };

    const missing = Object.entries(required)
      .filter(([key, available]) => !available)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error('[ModularContent] Missing required features:', missing);
      return false;
    }

    return true;
  }

  // Main initialization function
  function main() {
    console.log('[ModularContent] Environment check...');
    
    if (!checkEnvironment()) {
      console.error('[ModularContent] Environment check failed, aborting initialization');
      return;
    }

    console.log('[ModularContent] Environment check passed');
    
    setupCleanup();
    
    // Start loading modules
    loadModules().catch(error => {
      console.error('[ModularContent] Module loading failed:', error);
    });
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    // DOM is already ready
    setTimeout(main, 0);
  }

})(); 