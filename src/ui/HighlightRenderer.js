// Highlight Renderer for Liquid Syntax Highlighter
class HighlightRenderer {
  constructor(configManager) {
    this.configManager = configManager;
    this.displayMode = 'friendly';
  }

  setDisplayMode(mode) {
    this.displayMode = mode;
  }

  createHighlightSpan(match, index = 0, totalMatches = 1) {
    const span = document.createElement('span');
    span.className = `liquid-highlight ${match.className}`;
    
    // Add position context for styling
    if (index === 0) span.classList.add('liquid-first');
    if (index === totalMatches - 1) span.classList.add('liquid-last');
    if (totalMatches === 1) span.classList.add('liquid-single');
    
    // Set the human-readable content
    span.textContent = match.clean;
    
    // Apply styling from config
    const styling = this.configManager.getStyling(this.displayMode);
    if (styling) {
      Object.assign(span.style, styling);
    }
    
    // Store metadata
    span.dataset.liquidOriginal = match.original;
    span.dataset.liquidType = match.type;
    span.dataset.liquidClean = match.clean;
    span.dataset.liquidMode = this.displayMode;
    span.dataset.liquidImportance = this.calculateImportance(match);
    
    // Add pattern-specific data attribute for CSS targeting
    if (match.pattern) {
      span.dataset.liquidPattern = match.pattern;
    }
    
    // Enhanced tooltip with hierarchy info
    this.addTooltip(span, match);
    
    // Accessibility
    span.setAttribute('role', 'mark');
    span.setAttribute('aria-label', `Liquid ${match.type}: ${match.clean}`);
    
    return span;
  }

  addTooltip(span, match) {
    const modes = this.configManager.getDisplayModes();
    const mode = modes[this.displayMode];
    
    if (mode?.showTooltips) {
      const isInIframe = window !== window.top;
      const location = isInIframe ? ' (in iframe)' : '';
      const patternInfo = match.pattern ? ` [${match.pattern}]` : '';
      const importance = span.dataset.liquidImportance;
      
      span.title = `Original: ${match.original}${patternInfo}${location}\nImportance: ${importance}`;
    }
  }

  calculateImportance(match) {
    // Assign importance levels for visual hierarchy
    const importanceMap = {
      // Control flow - highest importance
      'forLoopComplex': 'primary',
      'forLoopSimple': 'primary', 
      'ifStatement': 'primary',
      'unless': 'primary',
      'case': 'primary',
      
      // Data operations - secondary importance
      'assignment': 'secondary',
      'capture': 'secondary',
      'catalogItems': 'secondary',
      'customAttribute': 'secondary',
      
      // Ending tags - tertiary importance
      'endif': 'tertiary',
      'endfor': 'tertiary',
      'endunless': 'tertiary',
      'endcase': 'tertiary',
      'endcapture': 'tertiary',
      'else': 'tertiary',
      'elseif': 'tertiary',
      'when': 'tertiary',
      
      // Variables - minor importance
      'variable': 'minor',
      'emailAddress': 'minor',
      'firstName': 'minor',
      'lastName': 'minor',
      
      // Utilities - utility level
      'include': 'utility',
      'render': 'utility',
      'comment': 'utility',
      'endcomment': 'utility'
    };
    
    return importanceMap[match.pattern] || 'minor';
  }

  updateDisplayMode(newMode) {
    this.displayMode = newMode;
    
    // Update all existing highlighted elements
    const highlightedElements = document.querySelectorAll('.liquid-highlight');
    highlightedElements.forEach(element => {
      element.dataset.liquidMode = newMode;
      
      // Reapply styling
      const styling = this.configManager.getStyling(newMode);
      if (styling) {
        Object.assign(element.style, styling);
      }
      
      // Update tooltip if needed
      const modes = this.configManager.getDisplayModes();
      const mode = modes[newMode];
      
      if (mode?.showTooltips && !element.title) {
        const match = {
          original: element.dataset.liquidOriginal,
          pattern: element.dataset.liquidPattern
        };
        this.addTooltip(element, match);
      } else if (!mode?.showTooltips) {
        element.removeAttribute('title');
      }
    });
  }

  // Method to create custom styled spans for special cases
  createCustomSpan(content, className, attributes = {}) {
    const span = document.createElement('span');
    span.className = `liquid-highlight ${className}`;
    span.textContent = content;
    
    // Apply custom attributes
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
    
    return span;
  }



  // Method to get styling information for debugging
  getElementStyling(element) {
    const computedStyle = window.getComputedStyle(element);
    return {
      backgroundColor: computedStyle.backgroundColor,
      color: computedStyle.color,
      fontWeight: computedStyle.fontWeight,
      fontSize: computedStyle.fontSize,
      padding: computedStyle.padding,
      margin: computedStyle.margin,
      borderRadius: computedStyle.borderRadius
    };
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HighlightRenderer;
} else {
  window.HighlightRenderer = HighlightRenderer;
} 