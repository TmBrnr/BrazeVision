// DOM Processor for Liquid Syntax Highlighter
class DOMProcessor {
  constructor(patternMatcher, highlightRenderer) {
    this.patternMatcher = patternMatcher;
    this.highlightRenderer = highlightRenderer;
    this.highlightedElements = new Set();
    this.originalContent = new Map();
    this.skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'];
    this.maxCacheSize = 1000; // Prevent unbounded memory growth
  }

  processDocument() {
    this.processTextNodes(document.body);
  }

  processTextNodes(element) {
    if (!element) return;
    
    if (element.nodeType === Node.TEXT_NODE) {
      this.processTextNode(element);
    } else if (element.nodeType === Node.ELEMENT_NODE) {
      if (this.shouldSkipElement(element)) {
        return;
      }

      const childNodes = Array.from(element.childNodes);
      childNodes.forEach(child => {
        this.processTextNodes(child);
      });
    }
  }

  shouldSkipElement(element) {
    if (!element.tagName) return false;
    
    if (this.skipTags.includes(element.tagName.toUpperCase())) {
      return true;
    }
    
    if (element.classList.contains('liquid-highlighted-container')) {
      return true;
    }
    
    if (element.contentEditable === 'true' && element === document.activeElement) {
      return true;
    }
    
    return false;
  }

  processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text || text.trim().length === 0) return;

    const matches = this.patternMatcher.findLiquidMatches(text);
    if (matches.length === 0) return;

    const container = this.createHighlightedContainer(text, matches);
    if (container && textNode.parentNode) {
      // Check cache size and clean up if needed
      this.enforceMemoryLimits();
      
      this.originalContent.set(container, textNode.textContent);
      textNode.parentNode.replaceChild(container, textNode);
      this.highlightedElements.add(container);
    }
  }

  enforceMemoryLimits() {
    // Prevent unbounded memory growth by cleaning up old entries
    if (this.originalContent.size > this.maxCacheSize) {
      // Remove elements that are no longer in the DOM
      const elementsToRemove = [];
      
      for (const element of this.originalContent.keys()) {
        if (!document.contains(element)) {
          elementsToRemove.push(element);
        }
      }
      
      // Clean up orphaned elements
      elementsToRemove.forEach(element => {
        this.originalContent.delete(element);
        this.highlightedElements.delete(element);
      });
      
      // If still over limit, remove oldest entries (FIFO)
      if (this.originalContent.size > this.maxCacheSize) {
        const entries = Array.from(this.originalContent.keys());
        const toRemove = entries.slice(0, entries.length - this.maxCacheSize + 100); // Keep some buffer
        
        toRemove.forEach(element => {
          this.originalContent.delete(element);
          this.highlightedElements.delete(element);
        });
      }
    }
  }

  createHighlightedContainer(originalText, matches) {
    const container = document.createElement('span');
    container.className = 'liquid-highlighted-container';
    
    // Detect context for styling
    const context = this.detectContext(container);
    container.dataset.liquidContext = context;
    
    let currentIndex = 0;
    
    matches.forEach((match, index) => {
      // Add text before this match
      if (currentIndex < match.start) {
        const beforeText = originalText.substring(currentIndex, match.start);
        if (beforeText.trim()) {
          container.appendChild(document.createTextNode(beforeText));
        }
      }
      
      // Create the highlighted span
      const highlightSpan = this.highlightRenderer.createHighlightSpan(
        match, 
        index, 
        matches.length
      );
      container.appendChild(highlightSpan);
      
      // Add intelligent spacing between adjacent highlights
      if (index < matches.length - 1) {
        const nextMatch = matches[index + 1];
        const spacingNeeded = this.calculateSpacing(match, nextMatch, originalText);
        
        if (spacingNeeded > 0) {
          const spacer = document.createTextNode(' '.repeat(spacingNeeded));
          container.appendChild(spacer);
        }
      }
      
      currentIndex = match.end;
    });
    
    // Add remaining text after last match
    if (currentIndex < originalText.length) {
      const afterText = originalText.substring(currentIndex);
      if (afterText.trim()) {
        container.appendChild(document.createTextNode(afterText));
      }
    }
    
    return container;
  }

  detectContext(element) {
    // Detect if we're in a multi-line context or single line
    const parentElement = element.parentNode;
    if (!parentElement) return 'unknown';
    
    const parentTag = parentElement.tagName?.toLowerCase();
    const parentText = parentElement.textContent || '';
    
    // Check for multi-line contexts
    if (parentTag === 'div' || parentTag === 'p' || parentText.includes('\n')) {
      return 'multiline';
    }
    
    // Check for editor contexts
    if (parentElement.contentEditable === 'true' || 
        parentElement.classList.contains('editor') ||
        parentElement.id?.includes('editor')) {
      return 'editor';
    }
    
    return 'inline';
  }

  calculateSpacing(currentMatch, nextMatch, originalText) {
    // Calculate intelligent spacing based on pattern types and context
    const gap = nextMatch.start - currentMatch.end;
    const textBetween = originalText.substring(currentMatch.end, nextMatch.start);
    
    // If there's already significant spacing, don't add more
    if (gap > 2 || textBetween.includes('\n')) {
      return 0;
    }
    
    // Add spacing between different pattern types for clarity
    if (currentMatch.pattern !== nextMatch.pattern) {
      return 1;
    }
    
    // Minimal spacing for same pattern types
    return gap === 0 ? 1 : 0;
  }

  removeHighlights() {
    // Process in batches to avoid blocking the main thread
    const elements = Array.from(this.highlightedElements);
    
    for (const element of elements) {
      if (element.parentNode) {
        const originalText = this.originalContent.get(element);
        if (originalText) {
          const textNode = document.createTextNode(originalText);
          element.parentNode.replaceChild(textNode, element);
        }
      }
    }

    // Clear all references
    this.highlightedElements.clear();
    this.originalContent.clear();
  }

  refreshHighlights() {
    this.removeHighlights();
    this.processDocument();
  }

  getHighlightedElementsCount() {
    return this.highlightedElements.size;
  }

  getOriginalContent(element) {
    return this.originalContent.get(element);
  }

  isHighlightedElement(element) {
    return this.highlightedElements.has(element);
  }

  // Method to handle iframe content
  processIframeContent(iframe) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc && iframeDoc.body) {
        this.processTextNodes(iframeDoc.body);
      }
    } catch (error) {
      // Silently handle cross-origin restrictions
    }
  }

  // Method to clean up when element is removed - FIXED to properly clean Map
  cleanupElement(element) {
    if (this.highlightedElements.has(element)) {
      this.highlightedElements.delete(element);
      this.originalContent.delete(element); // This was missing before!
    }

    // Also clean up any child highlighted elements
    const childHighlights = element.querySelectorAll('.liquid-highlighted-container');
    childHighlights.forEach(child => {
      this.highlightedElements.delete(child);
      this.originalContent.delete(child);
    });
  }

  // Method to get memory usage statistics
  getMemoryStats() {
    return {
      highlightedElements: this.highlightedElements.size,
      originalContentEntries: this.originalContent.size,
      maxCacheSize: this.maxCacheSize,
      orphanedElements: this.countOrphanedElements()
    };
  }

  countOrphanedElements() {
    let count = 0;
    for (const element of this.originalContent.keys()) {
      if (!document.contains(element)) {
        count++;
      }
    }
    return count;
  }

  // Method to manually trigger memory cleanup
  cleanupOrphanedElements() {
    const elementsToRemove = [];
    
    for (const element of this.originalContent.keys()) {
      if (!document.contains(element)) {
        elementsToRemove.push(element);
      }
    }
    
    elementsToRemove.forEach(element => {
      this.originalContent.delete(element);
      this.highlightedElements.delete(element);
    });
    
    return elementsToRemove.length;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMProcessor;
} else {
  window.DOMProcessor = DOMProcessor;
} 
