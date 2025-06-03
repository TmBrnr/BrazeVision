// Event Manager for Liquid Syntax Highlighter
class EventManager {
  constructor(domProcessor, storageManager) {
    this.domProcessor = domProcessor;
    this.storageManager = storageManager;
    this.isEnabled = true;
    this.highlightTimeout = null;
    this.checkInterval = null;
    this.lastContentHash = '';
    this.observers = {
      mutation: null,
      iframe: null,
      iframeSpecific: new Map() // Track individual iframe observers
    };
    this.eventListeners = new Map(); // Track event listeners for cleanup
    this.isInitialized = false; // Prevent double initialization
  }

  initialize() {
    // Prevent double initialization
    if (this.isInitialized) {
      return;
    }

    this.setupEventListeners();
    this.setupMutationObserver();
    this.setupMessageListener();
    this.setupStorageListener();
    this.startPeriodicCheck();
    this.isInitialized = true;
  }

  setupEventListeners() {
    // Clear any existing listeners first
    this.removeEventListeners();

    const events = ['input', 'change', 'keyup', 'paste', 'cut', 'focus', 'blur'];
    
    events.forEach(eventType => {
      const handler = (e) => {
        if (this.isEnabled) {
          this.debounceHighlight();
        }
      };
      
      document.addEventListener(eventType, handler, true);
      
      // Track for cleanup
      if (!this.eventListeners.has(eventType)) {
        this.eventListeners.set(eventType, []);
      }
      this.eventListeners.get(eventType).push({ handler, options: true });
    });

    // Load event for iframes
    const loadHandler = (e) => {
      if (e.target.tagName === 'IFRAME') {
        setTimeout(() => this.debounceHighlight(), 1000);
      }
    };
    document.addEventListener('load', loadHandler, true);
    this.eventListeners.set('load', [{ handler: loadHandler, options: true }]);

    // Visibility change event
    const visibilityHandler = () => {
      if (!document.hidden && this.isEnabled) {
        setTimeout(() => this.refreshHighlighting(), 500);
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    this.eventListeners.set('visibilitychange', [{ handler: visibilityHandler, options: false }]);
  }

  removeEventListeners() {
    // Remove all tracked event listeners
    for (const [eventType, listeners] of this.eventListeners) {
      listeners.forEach(({ handler, options }) => {
        document.removeEventListener(eventType, handler, options);
      });
    }
    this.eventListeners.clear();
  }

  setupMutationObserver() {
    // Disconnect existing observer if it exists
    if (this.observers.mutation) {
      this.observers.mutation.disconnect();
      this.observers.mutation = null;
    }

    this.observers.mutation = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;

      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const hasRelevantChanges = 
            mutation.addedNodes.length > 0 || 
            mutation.removedNodes.length > 0;
          
          if (hasRelevantChanges) {
            shouldUpdate = true;
            
            // Clean up removed elements
            mutation.removedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.cleanupRemovedNode(node);
              }
            });
          }
        }
        
        if (mutation.type === 'characterData') {
          shouldUpdate = true;
        }
        
        if (mutation.type === 'attributes') {
          const relevantAttrs = ['class', 'style', 'contenteditable'];
          if (relevantAttrs.includes(mutation.attributeName)) {
            shouldUpdate = true;
          }
        }
      });

      if (shouldUpdate) {
        this.debounceHighlight();
      }
    });

    this.observers.mutation.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'contenteditable']
    });
  }

  setupMessageListener() {
    // Message handling is now done in the main LiquidHighlighter.js file
    // to avoid duplicate listeners and conflicts
  }

  setupStorageListener() {
    this.storageManager.setupStorageListener((changes) => {
      if (changes.isEnabled !== undefined && changes.isEnabled !== this.isEnabled) {
        this.isEnabled = changes.isEnabled;
        if (changes.isEnabled) {
          this.startHighlighting();
        } else {
          this.stopHighlighting();
        }
      }
      
      if (changes.displayMode) {
        this.changeDisplayMode(changes.displayMode);
      }
    });
  }

  startPeriodicCheck() {
    // Clear existing interval if it exists
    this.stopPeriodicCheck();

    this.checkInterval = setInterval(() => {
      if (this.isEnabled && document.hasFocus()) {
        this.checkForContentChanges();
      }
    }, 2000);
  }

  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkForContentChanges() {
    const currentContent = document.body.textContent || '';
    const currentHash = this.simpleHash(currentContent);
    
    if (currentHash !== this.lastContentHash) {
      this.lastContentHash = currentHash;
      this.debounceHighlight();
    }
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  debounceHighlight() {
    clearTimeout(this.highlightTimeout);
    this.highlightTimeout = setTimeout(() => {
      this.refreshHighlighting();
    }, 300);
  }

  refreshHighlighting() {
    if (!this.isEnabled) return;
    this.domProcessor.refreshHighlights();
  }

  toggleHighlighting(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.startHighlighting();
    } else {
      this.stopHighlighting();
    }
    
    // Save to storage
    this.storageManager.toggleHighlighter(enabled);
  }

  startHighlighting() {
    this.isEnabled = true;
    this.domProcessor.processDocument();
    this.startPeriodicCheck();
    this.monitorIframes();
  }

  stopHighlighting() {
    this.isEnabled = false;
    this.domProcessor.removeHighlights();
    this.stopPeriodicCheck();
    this.stopIframeMonitoring(); // Clean up iframe observers
  }

  changeDisplayMode(mode) {
    // Note: The PatternMatcher mode is updated in LiquidHighlighter.changeMode()
    // Here we just need to refresh all highlights with the new mode
    
    if (this.domProcessor.highlightRenderer) {
      this.domProcessor.highlightRenderer.setDisplayMode(mode);
    }
    
    // Trigger a full refresh to regenerate content with new mode
    this.refreshHighlighting();
    
    // Save to storage
    this.storageManager.setDisplayMode(mode);
  }

  monitorIframes() {
    // Don't create multiple iframe observers
    if (this.observers.iframe) {
      return;
    }

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      this.handleIframe(iframe);
    });

    // Watch for new iframes
    this.observers.iframe = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IFRAME') {
              this.handleIframe(node);
            } else {
              const iframes = node.querySelectorAll('iframe');
              iframes.forEach(iframe => this.handleIframe(iframe));
            }
          }
        });

        // Clean up observers for removed iframes
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IFRAME') {
              this.cleanupIframeObserver(node);
            } else {
              const iframes = node.querySelectorAll('iframe');
              iframes.forEach(iframe => this.cleanupIframeObserver(iframe));
            }
          }
        });
      });
    });

    this.observers.iframe.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  stopIframeMonitoring() {
    // Disconnect main iframe observer
    if (this.observers.iframe) {
      this.observers.iframe.disconnect();
      this.observers.iframe = null;
    }

    // Disconnect all iframe-specific observers
    for (const [iframe, observer] of this.observers.iframeSpecific) {
      observer.disconnect();
    }
    this.observers.iframeSpecific.clear();
  }

  handleIframe(iframe) {
    // Don't create duplicate observers for the same iframe
    if (this.observers.iframeSpecific.has(iframe)) {
      return;
    }

    const processIframeContent = () => {
      if (this.isEnabled) {
        this.domProcessor.processIframeContent(iframe);
      }
    };

    // Create a specific observer for this iframe's content changes
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) {
        const iframeObserver = new MutationObserver(() => {
          if (this.isEnabled) {
            this.debounceHighlight();
          }
        });

        iframeObserver.observe(iframeDoc.body, {
          childList: true,
          subtree: true,
          characterData: true
        });

        this.observers.iframeSpecific.set(iframe, iframeObserver);
      }
    } catch (error) {
      // Cross-origin restriction - can't observe iframe content
    }

    iframe.addEventListener('load', processIframeContent);
    
    // Try to process immediately if already loaded
    if (iframe.contentDocument) {
      setTimeout(processIframeContent, 500);
    }
  }

  cleanupIframeObserver(iframe) {
    const observer = this.observers.iframeSpecific.get(iframe);
    if (observer) {
      observer.disconnect();
      this.observers.iframeSpecific.delete(iframe);
    }
  }

  cleanupRemovedNode(node) {
    // Clean up any highlighted elements that were removed
    if (node.classList && node.classList.contains('liquid-highlighted-container')) {
      this.domProcessor.cleanupElement(node);
    }
    
    // Check child elements too
    const highlightedChildren = node.querySelectorAll('.liquid-highlighted-container');
    highlightedChildren.forEach(child => {
      this.domProcessor.cleanupElement(child);
    });

    // Clean up iframe observers if iframe was removed
    if (node.tagName === 'IFRAME') {
      this.cleanupIframeObserver(node);
    }
  }

  // Performance monitoring
  trackPerformance(operation, duration) {
    if (duration > 100) {
      console.warn(`[EventManager] Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  // Method to temporarily disable highlighting (useful for large operations)
  temporaryDisable(duration = 5000) {
    const wasEnabled = this.isEnabled;
    this.isEnabled = false;
    
    setTimeout(() => {
      this.isEnabled = wasEnabled;
      if (wasEnabled) {
        this.refreshHighlighting();
      }
    }, duration);
  }

  // Cleanup method for when the extension is disabled or page unloads
  cleanup() {
    // Mark as not initialized to prevent further operations
    this.isInitialized = false;

    // Clear intervals and timeouts
    this.stopPeriodicCheck();
    
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = null;
    }
    
    // Remove all event listeners
    this.removeEventListeners();
    
    // Disconnect main observers
    if (this.observers.mutation) {
      this.observers.mutation.disconnect();
      this.observers.mutation = null;
    }
    
    // Stop iframe monitoring (includes cleanup of all iframe observers)
    this.stopIframeMonitoring();
    
    // Remove highlights
    if (this.domProcessor) {
      this.domProcessor.removeHighlights();
    }
  }

  // Get statistics about current state
  getStats() {
    return {
      enabled: this.isEnabled,
      initialized: this.isInitialized,
      highlightedElements: this.domProcessor.getHighlightedElementsCount(),
      lastContentHash: this.lastContentHash,
      observers: {
        mutation: !!this.observers.mutation,
        iframe: !!this.observers.iframe,
        iframeSpecific: this.observers.iframeSpecific.size
      },
      eventListeners: {
        types: Array.from(this.eventListeners.keys()),
        total: Array.from(this.eventListeners.values()).reduce((sum, arr) => sum + arr.length, 0)
      },
      timers: {
        highlightTimeout: !!this.highlightTimeout,
        checkInterval: !!this.checkInterval
      }
    };
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventManager;
} else {
  window.EventManager = EventManager;
} 