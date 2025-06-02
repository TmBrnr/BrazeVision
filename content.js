// Liquid Syntax Highlighter Content Script

class LiquidHighlighter {
  constructor() {
    this.isEnabled = true;
    this.highlightedElements = new Set();
    this.originalContent = new Map();
    this.isInIframe = window !== window.top;
    this.lastContentHash = '';
    this.checkInterval = null;
    this.config = null;
    this.displayMode = 'friendly'; // Default mode
    this.init();
  }

  async init() {
    // Load configuration
    await this.loadConfig();
    
    // Load user preferences
    try {
      const result = await chrome.storage.sync.get(['liquidHighlighterEnabled', 'liquidDisplayMode']);
      this.isEnabled = result.liquidHighlighterEnabled !== false;
      this.displayMode = result.liquidDisplayMode || 'friendly'; // Default to friendly mode
    } catch (error) {
      console.log('Storage not available, using default settings');
    }

    if (this.isEnabled) {
      this.highlightLiquidSyntax();
      this.observeChanges();
      this.monitorIframes();
      this.startPeriodicCheck();
    }

    // Listen for messages from popup in ALL frames
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggle') {
        this.toggleHighlighting(request.enabled);
        sendResponse({ success: true });
      } else if (request.action === 'getStatus') {
        sendResponse({ enabled: this.isEnabled, mode: this.displayMode });
      } else if (request.action === 'refresh') {
        this.refreshHighlighting();
        sendResponse({ success: true });
      } else if (request.action === 'changeMode') {
        this.changeDisplayMode(request.mode);
        sendResponse({ success: true });
      }
    });

    // Listen for storage changes to sync state across frames
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
          if (changes.liquidHighlighterEnabled) {
            const newEnabled = changes.liquidHighlighterEnabled.newValue;
            if (newEnabled !== this.isEnabled) {
              this.isEnabled = newEnabled;
              if (newEnabled) {
                this.highlightLiquidSyntax();
                this.startPeriodicCheck();
              } else {
                this.removeHighlights();
                this.stopPeriodicCheck();
              }
            }
          }
          
          if (changes.liquidDisplayMode) {
            const newMode = changes.liquidDisplayMode.newValue;
            if (newMode !== this.displayMode) {
              this.displayMode = newMode;
              this.refreshHighlighting();
            }
          }
        }
      });
    }

    this.setupEventListeners();
  }

  async loadConfig() {
    try {
      const response = await fetch(chrome.runtime.getURL('liquid-config.json'));
      this.config = await response.json();
    } catch (error) {
      console.error('Failed to load liquid config:', error);
      // Fallback basic config
      this.config = {
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
    this.removeHighlights();
    this.highlightLiquidSyntax();
  }

  changeDisplayMode(mode) {
    this.displayMode = mode;
    try {
      chrome.storage.sync.set({ liquidDisplayMode: mode });
    } catch (error) {
      console.log('Could not save display mode:', error);
    }
    this.refreshHighlighting();
  }

  highlightLiquidSyntax() {
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
    
    const skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'];
    if (skipTags.includes(element.tagName.toUpperCase())) {
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

    const matches = this.findLiquidMatches(text);
    if (matches.length === 0) return;

    const container = this.createHighlightedContainer(text, matches);
    if (container && textNode.parentNode) {
      this.originalContent.set(container, textNode.textContent);
      textNode.parentNode.replaceChild(container, textNode);
      this.highlightedElements.add(container);
    }
  }

  findLiquidMatches(text) {
    const patterns = [
      {
        regex: /\{\{((?:[^{}]|\{[^{}]*\})*)\}\}/g,
        type: 'output',
        className: 'liquid-output'
      },
      {
        regex: /\{%\s*([^%]+?)\s*%\}/g,
        type: 'tag', 
        className: 'liquid-tag'
      }
    ];

    const allMatches = [];
    
    patterns.forEach(pattern => {
      let match;
      pattern.regex.lastIndex = 0;
      
      while ((match = pattern.regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const rawContent = match[1];
        const humanReadable = this.transformToHumanReadable(rawContent, pattern.type);
        
        // Determine which specific pattern this matches for color coding
        let matchedPattern = null;
        if (pattern.type === 'tag') {
          matchedPattern = this.identifyTagPattern(rawContent);
        } else if (pattern.type === 'output') {
          matchedPattern = this.identifyOutputPattern(rawContent);
        }
        
        console.log(`[findLiquidMatches] Found ${pattern.type}: "${fullMatch}" -> "${humanReadable}" (pattern: ${matchedPattern})`);
        
        if (humanReadable.trim()) {
          allMatches.push({
            start: match.index,
            end: match.index + fullMatch.length,
            original: fullMatch,
            clean: humanReadable,
            type: pattern.type,
            className: pattern.className,
            pattern: matchedPattern
          });
        }
      }
    });

    return this.resolveOverlaps(allMatches);
  }

  identifyTagPattern(content) {
    if (!this.config?.patterns) return null;
    
    console.log(`[Pattern Recognition] Analyzing content: "${content}"`);
    
    // Clean up the content - remove extra whitespace but preserve structure
    let cleanContent = content.replace(/\s+/g, ' ').trim();
    
    // Sort patterns by priority to match complex patterns first
    const patterns = Object.entries(this.config.patterns)
      .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));

    for (const [patternName, pattern] of patterns) {
      try {
        // Make regex case-insensitive and allow for flexible whitespace
        const flags = 'i';
        const flexibleRegex = pattern.regex.replace(/\\s\+/g, '\\s*').replace(/\\s\*/g, '\\s*');
        const regex = new RegExp(flexibleRegex, flags);
        
        console.log(`[Pattern Recognition] Testing pattern "${patternName}" with regex: ${flexibleRegex}`);
        
        if (regex.test(cleanContent)) {
          console.log(`[Pattern Recognition] ✅ MATCHED pattern: "${patternName}"`);
          return patternName;
        } else {
          console.log(`[Pattern Recognition] ❌ No match for pattern: "${patternName}"`);
        }
      } catch (error) {
        console.warn(`[Pattern Recognition] Error testing pattern "${patternName}":`, error);
      }
    }
    
    // Enhanced fallback pattern detection based on keywords
    const fallbackPatterns = {
      // Loop patterns (amber)
      'forLoopSimple': /\bfor\s+\w+\s+in\s+/i,
      'endfor': /\bendfor\b/i,
      
      // Conditional patterns (red)
      'ifStatement': /\bif\s+/i,
      'endif': /\bendif\b/i,
      'else': /\belse\b/i,
      'elseif': /\belseif\s+/i,
      'unless': /\bunless\s+/i,
      'endunless': /\bendunless\b/i,
      'case': /\bcase\s+/i,
      'when': /\bwhen\s+/i,
      'endcase': /\bendcase\b/i,
      
      // Assignment patterns (green)
      'assignment': /\bassign\s+\w+\s*=/i,
      'capture': /\bcapture\s+/i,
      'endcapture': /\bendcapture\b/i,
      
      // Data fetch patterns (blue)
      'catalogItems': /\bcatalog_items\b/i,
      'fetch': /\bfetch\s+/i,
      'api': /\bapi\s+/i,
      
      // Include patterns (pink)
      'include': /\binclude\s+/i,
      'render': /\brender\s+/i,
      
      // Comment patterns (default purple)
      'comment': /\bcomment\b/i,
      'endcomment': /\bendcomment\b/i
    };
    
    for (const [pattern, regex] of Object.entries(fallbackPatterns)) {
      if (regex.test(cleanContent)) {
        console.log(`[Pattern Recognition] ✅ FALLBACK MATCHED: "${pattern}"`);
        return pattern;
      }
    }
    
    console.log(`[Pattern Recognition] ❌ No pattern matched for: "${cleanContent}"`);
    return null;
  }

  identifyOutputPattern(content) {
    if (!content) return null;
    
    console.log(`[Output Pattern Recognition] Analyzing: "${content}"`);
    
    const cleanContent = content.trim();
    
    // First, handle ${variable} patterns - these should be treated as variables
    if (/\$\{[^}]+\}/i.test(cleanContent)) {
      console.log(`[Output Pattern Recognition] ✅ MATCHED: Variable with \${} syntax`);
      return 'variable';
    }
    
    // Pattern detection for output variables
    const outputPatterns = {
      'customAttribute': /custom_attribute/i,
      'emailAddress': /email_address/i,
      'firstName': /first_name/i,
      'lastName': /last_name/i,
      'userId': /user_id/i,
      'userName': /user_name/i,
      'product': /\bproduct\b(?!\s*s)/i, // product but not products
      'products': /\bproducts\b/i,
      'contentBlocks': /content_blocks/i,
      'recommendations': /recommended_products/i,
      'catalogItems': /catalog_items/i,
      'braze': /braze_id|external_id/i,
      'timestamp': /created_at|updated_at|timestamp/i,
      'currency': /currency|price|total|amount/i,
      'location': /city|country|state|region|timezone/i,
      'device': /device|platform|browser|app_version/i,
      'campaign': /campaign|canvas|message/i,
      'variable': /^[a-zA-Z_][a-zA-Z0-9_]*$/ // Simple variable names (keep as last fallback)
    };
    
    for (const [pattern, regex] of Object.entries(outputPatterns)) {
      if (regex.test(cleanContent)) {
        console.log(`[Output Pattern Recognition] ✅ MATCHED: "${pattern}"`);
        return pattern;
      }
    }
    
    // Default for complex expressions or unmatched content
    console.log(`[Output Pattern Recognition] ❌ No pattern matched, using default`);
    return 'variable';
  }

  transformToHumanReadable(content, type) {
    if (!content || !this.config) return content;

    let processed = content.trim();
    
    // Process embedded liquid syntax first
    processed = this.processEmbeddedLiquidAdvanced(processed);
    
    // Handle ${variable} patterns
    processed = processed.replace(/\$\{([^}]+)\}/g, '$1');
    
    // Apply pattern-based transformations
    if (type === 'tag') {
      processed = this.transformTagContent(processed);
    } else {
      processed = this.transformOutputContent(processed);
    }
    
    return processed;
  }

  transformTagContent(content) {
    const mode = this.config.displayModes[this.displayMode];
    if (!mode) return content;

    // Sort patterns by priority (if defined) to handle complex cases first
    const patterns = Object.entries(this.config.patterns || {})
      .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));

    // Try each pattern in order
    for (const [patternName, pattern] of patterns) {
      const regex = new RegExp(pattern.regex, 'i');
      const match = content.match(regex);
      
      if (match) {
        console.log(`Matched pattern: ${patternName}`, match);
        
        let template = pattern[this.displayMode] || pattern.technical || content;
        
        // Use explicit placeholder mapping if available
        if (pattern.placeholderMap) {
          for (const [placeholder, groupIndex] of Object.entries(pattern.placeholderMap)) {
            const rawValue = match[groupIndex] || '';
            
            if (rawValue) {
              let transformedValue = this.transformComplexVariable(rawValue, placeholder);
              
              // Apply defaults if value is missing
              if (!transformedValue && pattern.defaults && pattern.defaults[placeholder]) {
                transformedValue = pattern.defaults[placeholder];
              }
              
              // Special handling for items/item pluralization
              if (placeholder === 'items' && pattern.defaults) {
                const limitValue = match[pattern.placeholderMap.limit];
                if (limitValue === '1') {
                  transformedValue = pattern.defaults.item || 'item';
                } else {
                  transformedValue = pattern.defaults.items || 'items';
                }
              }
              
              template = template.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), transformedValue);
            }
          }
          
          // Apply remaining defaults for missing placeholders
          if (pattern.defaults) {
            for (const [key, defaultValue] of Object.entries(pattern.defaults)) {
              template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), defaultValue);
            }
          }
        } else {
          // Fallback to old logic for patterns without explicit mapping
          if (match.length > 1) {
            for (let i = 1; i < match.length; i++) {
              const placeholder = template.match(/\{(\w+)\}/)?.[1];
              if (placeholder) {
                let replacement = match[i] || '';
                replacement = this.transformComplexVariable(replacement, placeholder);
                template = template.replace(`{${placeholder}}`, replacement);
              }
            }
          }
        }
        
        console.log(`Template result: ${template}`);
        return template;
      }
    }
    
    // Fallback: clean up the content
    return this.cleanTagContent(content);
  }

  transformComplexVariable(variable, context = '') {
    if (!variable) return '';
    
    console.log(`Transforming variable: "${variable}" with context: "${context}"`);
    
    // Step 1: Handle embedded liquid syntax first
    let processed = this.processEmbeddedLiquidAdvanced(variable);
    
    // Step 2: Handle ${variable} patterns
    processed = this.processDoubleBraceVariables(processed);
    
    // Step 3: Apply variable transformations
    processed = this.transformVariableAdvanced(processed);
    
    // Step 4: Clean up whitespace and formatting
    processed = processed.replace(/\s+/g, ' ').trim();
    
    console.log(`Transformed result: "${processed}"`);
    return processed;
  }

  processEmbeddedLiquidAdvanced(content) {
    // Handle nested {{}} within the content
    let processed = content;
    
    // More robust pattern to handle nested braces
    const liquidPattern = /\{\{((?:[^{}]|(?:\{[^{}]*\})|(?:\{[^{}]*\{[^{}]*\}[^{}]*\}))*)\}\}/g;
    
    processed = processed.replace(liquidPattern, (match, innerContent) => {
      console.log(`Processing embedded liquid: ${match}`);
      
      // Clean and transform the inner content
      let cleaned = innerContent.trim();
      
      // Handle ${} patterns within
      cleaned = this.processDoubleBraceVariables(cleaned);
      
      // Transform the variable
      cleaned = this.transformVariableAdvanced(cleaned);
      
      console.log(`Embedded liquid result: ${cleaned}`);
      return cleaned;
    });
    
    return processed;
  }

  processDoubleBraceVariables(content) {
    // Handle ${variable} patterns - be more careful with nested braces
    const dollarBracePattern = /\$\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    return content.replace(dollarBracePattern, (match, innerContent) => {
      console.log(`Processing \${} pattern: ${match}`);
      
      // Clean the inner content
      let cleaned = innerContent.trim();
      // Remove quotes if present
      cleaned = cleaned.replace(/^["']|["']$/g, '');
      
      // Transform if it's a known variable
      cleaned = this.transformVariableAdvanced(cleaned);
      
      return cleaned;
    });
  }

  transformVariableAdvanced(variable) {
    if (!variable) return '';
    
    // Handle complex paths with dots and special characters
    let processed = variable;
    
    // Split by dots to handle path notation
    const pathParts = processed.split('.');
    
    if (pathParts.length > 1) {
      // Transform the base part if it's a known variable
      const basePart = pathParts[0];
      const varConfig = this.config.variables?.[basePart];
      
      if (varConfig) {
        const baseTransform = varConfig[this.displayMode] || varConfig.friendly || basePart;
        const remainingPath = pathParts.slice(1).join('.');
        
        // Clean up the remaining path
        const cleanPath = this.cleanVariablePath(remainingPath);
        
        return `${baseTransform} ${cleanPath}`;
      }
    }
    
    // Check if it's a direct variable match
    const varConfig = this.config.variables?.[processed];
    if (varConfig) {
      return varConfig[this.displayMode] || varConfig.friendly || processed;
    }
    
    // Apply general replacements
    processed = this.applyReplacements(processed);
    
    // Clean up the path
    processed = this.cleanVariablePath(processed);
    
    return processed;
  }

  cleanVariablePath(path) {
    if (!path) return '';
    
    let cleaned = path;
    
    // Remove any remaining ${} patterns that weren't processed
    cleaned = cleaned.replace(/\$\{([^}]+)\}/g, '$1');
    
    // Remove quotes around path parts
    cleaned = cleaned.replace(/["']/g, '');
    
    // Handle special characters in German/international names
    // Keep umlauts and special characters that are part of variable names
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  transformOutputContent(content) {
    // Split by pipes to handle filters
    const parts = content.split('|').map(part => part.trim());
    let variable = parts[0];
    const filters = parts.slice(1);
    
    // Transform the main variable
    variable = this.transformVariable(variable);
    
    // Transform filters based on display mode
    if (filters.length > 0 && this.displayMode === 'simple') {
      // In simple mode, show a more natural description
      return this.createSimpleDescription(variable, filters);
    } else if (filters.length > 0) {
      // In friendly/technical mode, show more detail
      return `${variable} ${this.transformFilters(filters)}`;
    }
    
    return variable;
  }

  transformVariable(variable) {
    if (!variable) return '';
    
    const varConfig = this.config.variables?.[variable];
    if (varConfig) {
      return varConfig[this.displayMode] || varConfig.friendly || variable;
    }
    
    // Handle dot notation (e.g., custom_attribute.something)
    const parts = variable.split('.');
    if (parts.length > 1) {
      const basePart = this.config.variables?.[parts[0]];
      if (basePart) {
        const baseTransform = basePart[this.displayMode] || basePart.friendly || parts[0];
        return `${baseTransform} ${parts.slice(1).join('.')}`;
      }
    }
    
    // Apply general replacements
    return this.applyReplacements(variable);
  }

  transformFilters(filters) {
    return filters.map(filter => {
      const filterParts = filter.split(':').map(p => p.trim());
      const filterName = filterParts[0];
      const filterValue = filterParts[1];
      
      const filterConfig = this.config.filters?.[filterName];
      if (filterConfig) {
        let template = filterConfig[this.displayMode] || filterConfig.friendly || filter;
        if (filterValue) {
          template = template.replace('{value}', filterValue);
        }
        return template;
      }
      
      return filter;
    }).join(', ');
  }

  createSimpleDescription(variable, filters) {
    // Create natural language descriptions for simple mode
    const hasLimit = filters.some(f => f.includes('limit'));
    const hasDefault = filters.some(f => f.includes('default'));
    
    if (hasLimit && hasDefault) {
      return `${variable} (with fallback)`;
    } else if (hasLimit) {
      return variable;
    } else if (hasDefault) {
      return `${variable} (or fallback)`;
    }
    
    return variable;
  }

  applyReplacements(text) {
    const replacements = this.config.replacements || {};
    
    // Apply collection replacements
    if (replacements.collections) {
      for (const [key, value] of Object.entries(replacements.collections)) {
        if (text.includes(key)) {
          text = text.replace(key, value);
        }
      }
    }
    
    // Apply object replacements  
    if (replacements.objects) {
      for (const [key, value] of Object.entries(replacements.objects)) {
        if (text.includes(key)) {
          text = text.replace(key, value);
        }
      }
    }
    
    return text;
  }

  cleanTagContent(content) {
    // Basic cleanup for unmatched patterns
    let cleaned = content;
    cleaned = cleaned.replace(/\$\{([^}]+)\}/g, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  // Legacy method for backward compatibility
  processEmbeddedLiquid(content) {
    return this.processEmbeddedLiquidAdvanced(content);
  }

  resolveOverlaps(matches) {
    if (matches.length <= 1) return matches;
    
    matches.sort((a, b) => a.start - b.start);
    
    const resolved = [];
    let lastEnd = -1;
    
    for (const match of matches) {
      if (match.start >= lastEnd) {
        resolved.push(match);
        lastEnd = match.end;
      }
    }
    
    return resolved;
  }

  createHighlightedContainer(originalText, matches) {
    const container = document.createElement('span');
    container.className = 'liquid-highlighted-container';
    
    // Add mode data attribute for CSS targeting
    container.dataset.liquidMode = this.displayMode;
    
    // Detect context for better spacing
    container.dataset.liquidContext = this.detectContext(container);
    
    let currentIndex = 0;
    
    matches.forEach((match, index) => {
      // Add text before the match
      if (match.start > currentIndex) {
        const beforeText = originalText.substring(currentIndex, match.start);
        if (beforeText.trim()) {
          container.appendChild(document.createTextNode(beforeText));
        }
      }
      
      // Create highlighted span with context awareness
      const highlightSpan = this.createHighlightSpan(match, index, matches.length);
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
    const styling = this.config.styling?.[this.displayMode];
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
      console.log(`[createHighlightSpan] Applied pattern: "${match.pattern}" to span with classes: "${span.className}"`);
      console.log(`[createHighlightSpan] Data attributes:`, {
        pattern: span.dataset.liquidPattern,
        type: span.dataset.liquidType,
        mode: span.dataset.liquidMode,
        importance: span.dataset.liquidImportance
      });
    } else {
      console.log(`[createHighlightSpan] No pattern detected for: "${match.original}"`);
    }
    
    // Enhanced tooltip with hierarchy info
    const mode = this.config.displayModes?.[this.displayMode];
    if (mode?.showTooltips) {
      const location = this.isInIframe ? ' (in iframe)' : '';
      const patternInfo = match.pattern ? ` [${match.pattern}]` : '';
      const importance = span.dataset.liquidImportance;
      span.title = `Original: ${match.original}${patternInfo}${location}\nImportance: ${importance}`;
    }
    
    // Accessibility
    span.setAttribute('role', 'mark');
    span.setAttribute('aria-label', `Liquid ${match.type}: ${match.clean}`);
    
    // Force a style recalculation to ensure CSS applies
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(span);
      console.log(`[createHighlightSpan] Final computed background color for "${match.clean}":`, computedStyle.backgroundColor);
    }, 0);
    
    return span;
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

  observeChanges() {
    const observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;

      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const hasRelevantChanges = 
            mutation.addedNodes.length > 0 || 
            mutation.removedNodes.length > 0;
          
          if (hasRelevantChanges) {
            shouldUpdate = true;
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

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'contenteditable']
    });
  }

  monitorIframes() {
    const iframeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const iframes = node.tagName === 'IFRAME' ? [node] : node.querySelectorAll('iframe');
            iframes.forEach(iframe => {
              this.handleIframe(iframe);
            });
          }
        });
      });
    });

    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.querySelectorAll('iframe').forEach(iframe => {
      this.handleIframe(iframe);
    });
  }

  handleIframe(iframe) {
    if (!iframe.dataset.liquidChecked) {
      iframe.dataset.liquidChecked = 'true';
      
      try {
        iframe.addEventListener('load', () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
              console.log('Liquid Highlighter: Processing same-origin iframe');
              setTimeout(() => this.debounceHighlight(), 1000);
            }
          } catch (e) {
            this.addIframeIndicator(iframe);
          }
        });
      } catch (e) {
        this.addIframeIndicator(iframe);
      }
    }
  }

  addIframeIndicator(iframe) {
    const src = iframe.src || '';
    const id = iframe.id || '';
    
    if (src.includes('editor') || id.includes('editor') || 
        src.includes('bee') || src.includes('tinymce') ||
        iframe.classList.toString().includes('editor')) {
      
      const indicator = document.createElement('div');
      indicator.className = 'liquid-iframe-indicator';
      indicator.textContent = 'Cross-origin iframe detected';
      indicator.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 2px;
        font-size: 10px;
        z-index: 10000;
        pointer-events: none;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 500;
      `;
      
      if (iframe.parentNode) {
        const wrapper = iframe.parentNode;
        if (getComputedStyle(wrapper).position === 'static') {
          wrapper.style.position = 'relative';
        }
        wrapper.appendChild(indicator);
        
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 3000);
      }
    }
  }

  toggleHighlighting(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.highlightLiquidSyntax();
      this.startPeriodicCheck();
    } else {
      this.removeHighlights();
      this.stopPeriodicCheck();
    }

    try {
      chrome.storage.sync.set({ liquidHighlighterEnabled: enabled });
    } catch (error) {
      console.log('Could not save preference:', error);
    }
  }

  removeHighlights() {
    this.highlightedElements.forEach(element => {
      if (element.parentNode && this.originalContent.has(element)) {
        const originalText = this.originalContent.get(element);
        const textNode = document.createTextNode(originalText);
        element.parentNode.replaceChild(textNode, element);
        this.originalContent.delete(element);
      }
    });
    
    this.highlightedElements.clear();

    const remainingHighlights = document.querySelectorAll('.liquid-highlighted-container');
    remainingHighlights.forEach(element => {
      if (element.parentNode) {
        const textContent = element.textContent;
        const textNode = document.createTextNode(textContent);
        element.parentNode.replaceChild(textNode, element);
      }
    });

    const indicators = document.querySelectorAll('.liquid-iframe-indicator');
    indicators.forEach(indicator => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    });
  }
}

// Initialize the highlighter when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LiquidHighlighter();
  });
} else {
  new LiquidHighlighter();
} 