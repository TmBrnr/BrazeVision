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
      iframe: null
    };
  }

  initialize() {
    this.setupEventListeners();
    this.setupMutationObserver();
    this.setupMessageListener();
    this.setupStorageListener();
    this.startPeriodicCheck();
  }

  setupEventListeners() {
    const events = ['input', 'change', 'keyup', 'paste', 'cut', 'focus', 'blur'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        if (this.isEnabled) {
          this.debounceHighlight();
        }
      }, true);
    });

    document.addEventListener('load', (e) => {
      if (e.target.tagName === 'IFRAME') {
        setTimeout(() => this.debounceHighlight(), 1000);
      }
    }, true);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isEnabled) {
        setTimeout(() => this.refreshHighlighting(), 500);
      }
    });
  }

  setupMutationObserver() {
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
    console.log('[EventManager] Message handling delegated to main highlighter');
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
    
    console.log(`[EventManager] Display mode changed to: ${mode}, highlights refreshed`);
  }

  monitorIframes() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      this.handleIframe(iframe);
    });

    // Watch for new iframes
    const iframeObserver = new MutationObserver((mutations) => {
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
      });
    });

    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.iframe = iframeObserver;
  }

  handleIframe(iframe) {
    console.log('[EventManager] Processing iframe:', iframe.src);
    
    const processIframeContent = () => {
      if (this.isEnabled) {
        this.domProcessor.processIframeContent(iframe);
      }
    };

    iframe.addEventListener('load', processIframeContent);
    
    // Try to process immediately if already loaded
    if (iframe.contentDocument) {
      setTimeout(processIframeContent, 500);
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
    // Clear intervals
    this.stopPeriodicCheck();
    
    // Clear timeouts
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    
    // Disconnect observers
    if (this.observers.mutation) {
      this.observers.mutation.disconnect();
    }
    
    if (this.observers.iframe) {
      this.observers.iframe.disconnect();
    }
    
    // Remove highlights
    this.domProcessor.removeHighlights();
  }

  // Get statistics about current state
  getStats() {
    return {
      enabled: this.isEnabled,
      highlightedElements: this.domProcessor.getHighlightedElementsCount(),
      lastContentHash: this.lastContentHash,
      observers: {
        mutation: !!this.observers.mutation,
        iframe: !!this.observers.iframe
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