// Pattern Matcher for Liquid Syntax Highlighter
class PatternMatcher {
  constructor(configManager) {
    this.configManager = configManager;
    this.displayMode = 'friendly'; // Add display mode tracking
    this.liquidPatterns = [
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
  }

  setDisplayMode(mode) {
    this.displayMode = mode;
  }

  findLiquidMatches(text) {
    const allMatches = [];
    
    this.liquidPatterns.forEach(pattern => {
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
        
        console.log(`[PatternMatcher] Found ${pattern.type}: "${fullMatch}" -> "${humanReadable}" (pattern: ${matchedPattern})`);
        
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
    const patterns = this.configManager.getPatterns();
    if (!patterns) return null;
    
    console.log(`[PatternMatcher] Analyzing tag content: "${content}"`);
    
    // Clean up the content - remove extra whitespace but preserve structure
    let cleanContent = content.replace(/\s+/g, ' ').trim();
    
    // Sort patterns by priority to match complex patterns first
    const sortedPatterns = Object.entries(patterns)
      .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));

    for (const [patternName, pattern] of sortedPatterns) {
      try {
        // Make regex case-insensitive and allow for flexible whitespace
        const flags = 'i';
        const flexibleRegex = pattern.regex.replace(/\\s\+/g, '\\s*').replace(/\\s\*/g, '\\s*');
        const regex = new RegExp(flexibleRegex, flags);
        
        console.log(`[PatternMatcher] Testing pattern "${patternName}" with regex: ${flexibleRegex}`);
        
        if (regex.test(cleanContent)) {
          console.log(`[PatternMatcher] ✅ MATCHED pattern: "${patternName}"`);
          return patternName;
        }
      } catch (error) {
        console.warn(`[PatternMatcher] Error testing pattern "${patternName}":`, error);
      }
    }
    
    // Enhanced fallback pattern detection based on keywords
    return this.getFallbackTagPattern(cleanContent);
  }

  getFallbackTagPattern(cleanContent) {
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
        console.log(`[PatternMatcher] ✅ FALLBACK MATCHED: "${pattern}"`);
        return pattern;
      }
    }
    
    console.log(`[PatternMatcher] ❌ No pattern matched for: "${cleanContent}"`);
    return null;
  }

  identifyOutputPattern(content) {
    if (!content) return null;
    
    console.log(`[PatternMatcher] Analyzing output content: "${content}"`);
    
    const cleanContent = content.trim();
    
    // First, handle ${variable} patterns - these should be treated as variables
    if (/\$\{[^}]+\}/i.test(cleanContent)) {
      console.log(`[PatternMatcher] ✅ MATCHED: Variable with \${} syntax`);
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
      'recommendedProducts': /recommended_products/i,
      'variable': /^\w+$/ // simple word variable
    };
    
    for (const [pattern, regex] of Object.entries(outputPatterns)) {
      if (regex.test(cleanContent)) {
        console.log(`[PatternMatcher] ✅ MATCHED output pattern: "${pattern}"`);
        return pattern;
      }
    }
    
    console.log(`[PatternMatcher] ❌ No output pattern matched for: "${cleanContent}"`);
    return 'variable'; // Default fallback
  }

  transformToHumanReadable(content, type) {
    if (type === 'tag') {
      return this.transformTagContent(content);
    } else if (type === 'output') {
      return this.transformOutputContent(content);
    }
    return content;
  }

  transformTagContent(content) {
    const patterns = this.configManager.getPatterns();
    if (!patterns) return content;

    // Clean the content
    let cleanContent = content.replace(/\s+/g, ' ').trim();
    
    // Try to match against configured patterns
    for (const [patternName, pattern] of Object.entries(patterns)) {
      try {
        const regex = new RegExp(pattern.regex, 'i');
        const match = regex.exec(cleanContent);
        
        if (match) {
          // Use mode-appropriate template
          const template = this.displayMode === 'technical' 
            ? (pattern.technical || pattern.friendly || cleanContent)
            : (pattern.friendly || pattern.technical || cleanContent);
          return this.fillTemplate(template, match, pattern);
        }
      } catch (error) {
        console.warn(`[PatternMatcher] Error processing pattern "${patternName}":`, error);
      }
    }
    
    // Fallback transformations
    return this.getFallbackTransformation(cleanContent);
  }

  fillTemplate(template, match, pattern) {
    let result = template;
    
    console.log(`[PatternMatcher] fillTemplate called with template: "${template}", match groups:`, match);
    
    if (pattern.placeholderMap) {
      for (const [placeholder, groupIndex] of Object.entries(pattern.placeholderMap)) {
        let value = match[groupIndex] || pattern.defaults?.[placeholder] || placeholder;
        
        // Process the value through humanizeNestedLiquid if it contains liquid syntax
        if (typeof value === 'string' && (value.includes('{{') || value.includes('${')) ) {
          console.log(`[PatternMatcher] Processing value "${value}" through humanizeNestedLiquid`);
          value = this.humanizeNestedLiquid(value);
          console.log(`[PatternMatcher] Processed value result: "${value}"`);
        }
        
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
        console.log(`[PatternMatcher] Replaced {${placeholder}} with "${value}" -> "${result}"`);
      }
    }
    
    console.log(`[PatternMatcher] fillTemplate final result: "${result}"`);
    return result;
  }

  getFallbackTransformation(content) {
    console.log(`[PatternMatcher] getFallbackTransformation called with: "${content}" in mode: ${this.displayMode}`);
    
    // Mode-aware transformations
    const friendlyTransformations = [
      {
        regex: /^for\s+(\w+)\s+in\s+(.+?)(?:\s+limit:\s*(\d+))?$/i,
        transform: (match) => {
          const collection = this.humanizeNestedLiquid(match[2]);
          const limit = match[3] ? ` (show ${match[3]} items)` : '';
          return `Loop through ${collection}${limit}`;
        }
      },
      {
        regex: /^if\s+(.+)$/i,
        transform: (match) => {
          const condition = this.humanizeNestedLiquid(match[1]);
          return `Display when: ${condition}`;
        }
      },
      {
        regex: /^assign\s+(\w+)\s*=\s*(.+)$/i,
        transform: (match) => {
          console.log(`[PatternMatcher] Assignment pattern matched:`, {
            full: match[0],
            variable: match[1], 
            value: match[2]
          });
          const value = this.humanizeNestedLiquid(match[2]);
          const result = `Create variable: ${match[1]} = ${value}`;
          console.log(`[PatternMatcher] Assignment result: "${result}"`);
          return result;
        }
      },
      {
        regex: /^include\s+['"]*([^'"]+)['"]*$/i,
        transform: (match) => `Include template: ${match[1]}`
      },
      {
        regex: /^catalog_items\s+(\w+)\s+(.+)$/i,
        transform: (match) => {
          const source = this.humanizeNestedLiquid(match[2]);
          return `Fetch ${match[1]}: ${source}`;
        }
      }
    ];

    const technicalTransformations = [
      {
        regex: /^for\s+(\w+)\s+in\s+(.+?)(?:\s+limit:\s*(\d+))?$/i,
        transform: (match) => `for ${match[1]} in ${match[2]}${match[3] ? ` limit:${match[3]}` : ''}`
      },
      {
        regex: /^if\s+(.+)$/i,
        transform: (match) => `if ${match[1]}`
      },
      {
        regex: /^assign\s+(\w+)\s*=\s*(.+)$/i,
        transform: (match) => `assign ${match[1]} = ${match[2]}`
      },
      {
        regex: /^include\s+['"]*([^'"]+)['"]*$/i,
        transform: (match) => `include '${match[1]}'`
      },
      {
        regex: /^catalog_items\s+(\w+)\s+(.+)$/i,
        transform: (match) => `catalog_items ${match[1]} ${match[2]}`
      }
    ];
    
    const transformations = this.displayMode === 'technical' ? technicalTransformations : friendlyTransformations;
    
    console.log(`[PatternMatcher] Using ${this.displayMode} transformations, testing ${transformations.length} patterns`);
    
    for (const transformation of transformations) {
      const match = content.match(transformation.regex);
      if (match) {
        console.log(`[PatternMatcher] ✅ Pattern matched:`, transformation.regex, 'with groups:', match);
        const result = transformation.transform(match);
        console.log(`[PatternMatcher] ✅ Transformation result: "${result}"`);
        return result;
      } else {
        console.log(`[PatternMatcher] ❌ Pattern did not match:`, transformation.regex);
      }
    }
    
    console.log(`[PatternMatcher] ❌ No fallback patterns matched, returning original: "${content}"`);
    return content;
  }

  humanizeNestedLiquid(content) {
    if (this.displayMode === 'technical') {
      return content;
    }
    
    console.log(`[PatternMatcher] humanizeNestedLiquid input: "${content}"`);
    
    // Handle the special case {{${variable}}} - direct variable reference
    const directVarPattern = /\{\{\$\{([^}]+)\}\}\}/g;
    let result = content.replace(directVarPattern, (match, variable) => {
      console.log(`[PatternMatcher] Found direct variable pattern: "${match}" -> variable: "${variable}"`);
      
      // Convert variable to friendly format
      const friendlyVar = this.createSimpleDescription(variable);
      console.log(`[PatternMatcher] Converted "${variable}" to friendly: "${friendlyVar}"`);
      
      return friendlyVar;
    });
    
    // Handle the common case: {{custom_attribute.${variable}}}
    const commonPattern = /\{\{([^}]+\$\{[^}]+\}[^}]*)\}\}/g;
    result = result.replace(commonPattern, (match, innerContent) => {
      console.log(`[PatternMatcher] Found common nested pattern: "${match}" -> inner: "${innerContent}"`);
      const transformed = this.transformOutputContent(innerContent);
      console.log(`[PatternMatcher] Transformed to: "${transformed}"`);
      return transformed;
    });
    
    // Handle any remaining {{...}} patterns (without ${} inside)
    result = result.replace(/\{\{([^{}]+)\}\}/g, (match, innerContent) => {
      console.log(`[PatternMatcher] Found simple nested pattern: "${match}" -> inner: "${innerContent}"`);
      const transformed = this.transformOutputContent(innerContent);
      console.log(`[PatternMatcher] Transformed to: "${transformed}"`);
      return transformed;
    });
    
    // Handle standalone ${variable} syntax - convert to just the variable name
    result = result.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      console.log(`[PatternMatcher] Converting standalone \${${variable}} to: ${variable}`);
      return variable;
    });
    
    console.log(`[PatternMatcher] humanizeNestedLiquid result: "${result}"`);
    return result;
  }

  transformOutputContent(content) {
    const variables = this.configManager.getVariables();
    const cleanContent = content.trim();
    
    // Handle pipes/filters first
    const [mainContent, ...filters] = cleanContent.split('|').map(part => part.trim());
    
    let result;
    
    // Handle complex variable paths
    if (mainContent.includes('.')) {
      result = this.transformComplexVariable(mainContent);
    }
    // Handle ${variable} syntax
    else if (mainContent.includes('${')) {
      result = this.processDoubleBraceVariables(mainContent);
    }
    // Simple variable lookup
    else if (variables[mainContent]) {
      result = this.displayMode === 'technical' 
        ? mainContent 
        : (variables[mainContent].friendly || mainContent);
    }
    else {
      result = this.displayMode === 'technical'
        ? mainContent
        : this.createSimpleDescription(mainContent);
    }
    
    // Add filter information
    if (filters.length > 0) {
      const filterDescriptions = filters.map(filter => this.transformFilter(filter));
      if (this.displayMode === 'technical') {
        result += ' | ' + filters.join(' | ');
      } else {
        result += ' (' + filterDescriptions.join(', ') + ')';
      }
    }
    
    return result;
  }

  transformComplexVariable(variable) {
    // Handle pipes first
    const [mainVar, ...filters] = variable.split('|').map(part => part.trim());
    
    if (this.displayMode === 'technical') {
      return mainVar + (filters.length > 0 ? ' | ' + filters.join(' | ') : '');
    }
    
    const parts = mainVar.split('.');
    const basePart = parts[0];
    const variables = this.configManager.getVariables();
    
    let description = variables[basePart]?.friendly || basePart;
    
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        
        // Handle ${variable} syntax - preserve the variable name
        if (part.includes('${')) {
          const varMatch = part.match(/\$\{([^}]+)\}/);
          if (varMatch) {
            description += ` → ${varMatch[1]}`;
          } else {
            description += ` → ${part}`;
          }
        } else {
          description += ` → ${part}`;
        }
      }
    }
    
    return description;
  }

  processDoubleBraceVariables(content) {
    if (this.displayMode === 'technical') {
      return content;
    }
    
    console.log(`[PatternMatcher] processDoubleBraceVariables input: "${content}"`);
    
    const result = content.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      console.log(`[PatternMatcher] Processing \${${variable}}`);
      
      // Convert to friendly format using our description method
      const friendlyVar = this.createSimpleDescription(variable);
      console.log(`[PatternMatcher] Converted "${variable}" to "${friendlyVar}"`);
      
      return friendlyVar;
    });
    
    console.log(`[PatternMatcher] processDoubleBraceVariables result: "${result}"`);
    return result;
  }

  transformFilter(filter) {
    const filters = this.configManager.getFilters();
    
    // Parse filter with potential arguments - handle quoted strings properly
    const colonIndex = filter.indexOf(':');
    let filterName, args = [];
    
    if (colonIndex !== -1) {
      filterName = filter.substring(0, colonIndex).trim();
      const argString = filter.substring(colonIndex + 1).trim();
      
      // Parse arguments, handling quoted strings
      if (argString) {
        // Split by comma but respect quoted strings
        args = this.parseFilterArguments(argString);
      }
    } else {
      filterName = filter.trim();
    }
    
    if (this.displayMode === 'technical') {
      return `${filterName}${args.length > 0 ? ': ' + args.join(', ') : ''}`;
    }
    
    // Friendly descriptions with actual values
    const filterDescriptions = {
      'id': (args) => args.length > 0 ? `ID: ${args[0]}` : 'with ID',
      'default': (args) => args.length > 0 ? `default: ${args[0]}` : 'with default value',
      'capitalize': () => 'capitalized',
      'upcase': () => 'uppercase', 
      'downcase': () => 'lowercase',
      'truncate': (args) => args.length > 0 ? `truncated to ${args[0]} characters` : 'truncated',
      'limit': (args) => args.length > 0 ? `limited to ${args[0]} items` : 'limited',
      'strip': () => 'whitespace removed',
      'escape': () => 'HTML escaped',
      'join': (args) => args.length > 0 ? `joined with ${args[0]}` : 'joined',
      'split': (args) => args.length > 0 ? `split by ${args[0]}` : 'split',
      'replace': (args) => args.length >= 2 ? `replace ${args[0]} with ${args[1]}` : 'replaced',
      'remove': (args) => args.length > 0 ? `remove ${args[0]}` : 'removed',
      'append': (args) => args.length > 0 ? `append ${args[0]}` : 'appended',
      'prepend': (args) => args.length > 0 ? `prepend ${args[0]}` : 'prepended'
    };
    
    if (filters[filterName]) {
      // Use config-defined friendly description
      let description = filters[filterName].friendly || filterName;
      // Replace {value} placeholder with actual first argument
      if (args.length > 0) {
        description = description.replace(/\{value\}/g, args[0]);
      }
      return description;
    } else if (filterDescriptions[filterName]) {
      return filterDescriptions[filterName](args);
    }
    
    // Fallback - show filter name with arguments
    return args.length > 0 ? `${filterName} ${args.join(' ')}` : filterName;
  }

  parseFilterArguments(argString) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < argString.length; i++) {
      const char = argString[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char; // Keep the quotes for display
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        current += char;
      } else if (!inQuotes && char === ',') {
        if (current.trim()) {
          args.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      args.push(current.trim());
    }
    
    return args;
  }

  createSimpleDescription(variable) {
    if (this.displayMode === 'technical') {
      return variable;
    }
    
    // Check if we have a friendly name in config first
    const variables = this.configManager.getVariables();
    if (variables[variable]) {
      return variables[variable].friendly;
    }
    
    // Enhanced conversion for better readability
    let readable = variable
      // Handle camelCase: firstName -> first Name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Handle snake_case: first_name -> first name  
      .replace(/_/g, ' ')
      // Handle numbers: user2 -> user 2
      .replace(/([a-z])(\d)/g, '$1 $2')
      // Convert to lowercase
      .toLowerCase()
      // Handle special cases
      .replace(/\bid\b/g, 'ID')
      .replace(/\burl\b/g, 'URL') 
      .replace(/\bapi\b/g, 'API')
      .replace(/\bemail\b/g, 'email')
      .replace(/\bphone\b/g, 'phone')
      .replace(/\baddress\b/g, 'address');
    
    // Capitalize first letter
    readable = readable.charAt(0).toUpperCase() + readable.slice(1);
    
    console.log(`[PatternMatcher] createSimpleDescription: "${variable}" -> "${readable}"`);
    return readable;
  }

  resolveOverlaps(matches) {
    if (matches.length <= 1) return matches;
    
    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);
    
    const resolved = [];
    let lastEnd = 0;
    
    for (const match of matches) {
      if (match.start >= lastEnd) {
        resolved.push(match);
        lastEnd = match.end;
      }
    }
    
    return resolved;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PatternMatcher;
} else {
  window.PatternMatcher = PatternMatcher;
} 