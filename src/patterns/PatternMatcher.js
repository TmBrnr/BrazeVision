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
        regex: /\{%\s*((?:[^%]|%(?!\s*\}))*?)\s*%\}/g,
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

  // Generic pattern matching function to eliminate duplication
  findBestMatch(content, patterns, fallbackPatterns = null) {
    const cleanContent = content.replace(/\s+/g, ' ').trim();
    
    // Try main patterns first (already sorted by priority)
    for (const pattern of patterns) {
      try {
        if (pattern.compiledRegex && pattern.compiledRegex.test(cleanContent)) {
          return {
            name: pattern.name,
            pattern: pattern,
            match: pattern.compiledRegex.exec(cleanContent)
          };
        }
      } catch (error) {
        console.warn(`[PatternMatcher] Error testing pattern "${pattern.name}":`, error);
      }
    }
    
    // Try fallback patterns if no main pattern matches
    if (fallbackPatterns) {
      for (const [patternName, compiledRegex] of Object.entries(fallbackPatterns)) {
        try {
          if (compiledRegex.test(cleanContent)) {
            return {
              name: patternName,
              pattern: null,
              match: null
            };
          }
        } catch (error) {
          console.warn(`[PatternMatcher] Error testing fallback pattern "${patternName}":`, error);
        }
      }
    }
    
    return null;
  }

  identifyTagPattern(content) {
    const patterns = this.configManager.getPatterns();
    const fallbackPatterns = this.configManager.getFallbackTagPatterns();
    
    const result = this.findBestMatch(content, patterns, fallbackPatterns);
    return result ? result.name : null;
  }

  identifyOutputPattern(content) {
    if (!content) return null;
    
    const cleanContent = content.trim();
    const outputPatterns = this.configManager.getOutputPatterns();
    
    // Check output patterns first
    for (const [patternName, compiledRegex] of Object.entries(outputPatterns)) {
      try {
        if (compiledRegex.test(cleanContent)) {
          return patternName;
        }
      } catch (error) {
        console.warn(`[PatternMatcher] Error testing output pattern "${patternName}":`, error);
      }
    }
    
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
    if (!patterns || patterns.length === 0) return content;

    // Clean the content
    let cleanContent = content.replace(/\s+/g, ' ').trim();
    
    // Use the generic findBestMatch function
    const result = this.findBestMatch(cleanContent, patterns);
    
    if (result && result.pattern && result.match) {
      // Use mode-appropriate template
      const template = this.displayMode === 'technical' 
        ? (result.pattern.technical || result.pattern.friendly || cleanContent)
        : (result.pattern.friendly || result.pattern.technical || cleanContent);
      return this.fillTemplate(template, result.match, result.pattern);
    }
    
    // Fallback transformations using config data
    return this.getFallbackTransformation(cleanContent);
  }

  getFallbackTransformation(content) {
    const fallbackTransformations = this.configManager.getFallbackTransformations();
    const transformations = this.displayMode === 'technical' 
      ? fallbackTransformations.technical || []
      : fallbackTransformations.friendly || [];
    
    for (const transformation of transformations) {
      try {
        const regex = new RegExp(transformation.regex, 'i');
        const match = content.match(regex);
        if (match) {
          let result = transformation.template;
          
          // Replace numbered placeholders with match groups
          for (let i = 1; i < match.length; i++) {
            const value = match[i] || (transformation.defaults && transformation.defaults[i.toString()]) || '';
            result = result.replace(new RegExp(`\\{${i}\\}`, 'g'), value);
          }
          
          // Process any nested liquid in the result
          return this.humanizeNestedLiquid(result);
        }
      } catch (error) {
        console.warn(`[PatternMatcher] Error processing fallback transformation:`, error);
      }
    }
    
    return content;
  }

  fillTemplate(template, match, pattern) {
    let result = template;
    
    if (pattern.placeholderMap) {
      for (const [placeholder, groupIndex] of Object.entries(pattern.placeholderMap)) {
        let value = match[groupIndex] || pattern.defaults?.[placeholder] || placeholder;
        
        // UNIVERSAL CLEANUP: Apply comprehensive liquid syntax cleanup to ALL values
        if (typeof value === 'string') {
          value = this.cleanLiquidSyntax(value);
          
          // Apply pattern-specific processing after universal cleanup
          if (placeholder === 'condition') {
            value = this.processConditionalExpression(value);
          }
        }
        
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
      }
    }
    
    return result;
  }

  processConditionalExpression(expression) {
    if (this.displayMode === 'technical') {
      return expression;
    }

    const operators = this.configManager.getOperators();
    let processedExpression = expression.trim();

    // Process operators in order of precedence (longer operators first to avoid conflicts)
    const operatorKeys = Object.keys(operators).sort((a, b) => b.length - a.length);
    
    for (const operator of operatorKeys) {
      const operatorConfig = operators[operator];
      const friendlyOperator = operatorConfig.friendly || operator;
      
      // Create regex pattern to match the operator
      let regex;
      if (/^[a-zA-Z]+$/.test(operator)) {
        // Text operators like 'and', 'or', 'contains' - use word boundaries
        regex = new RegExp(`\\b${this.escapeRegex(operator)}\\b`, 'gi');
      } else {
        // Symbol operators like '==', '!=', '>=', etc. - be careful with spacing
        regex = new RegExp(`\\s*${this.escapeRegex(operator)}\\s*`, 'g');
      }
      
      processedExpression = processedExpression.replace(regex, ` ${friendlyOperator} `);
    }

    // Clean up extra spaces
    processedExpression = processedExpression.replace(/\s+/g, ' ').trim();

    // NOTE: Liquid syntax cleanup is now handled by cleanLiquidSyntax() before this method is called
    return processedExpression;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  cleanLiquidSyntax(content) {
    if (this.displayMode === 'technical') {
      return content;
    }

    if (!content || typeof content !== 'string') {
      return content;
    }

    let result = content.trim();

    // PHASE 1: Clean up ALL ${} constructs first (most aggressive cleanup)
    result = result.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      const cleanVar = variable.replace(/['"]/g, '').trim();
      return this.createSimpleDescription(cleanVar);
    });

    // PHASE 2: Clean up ALL {{}} constructs with their filters
    // Handle complex patterns with filters: {{variable | filter: args}}
    result = result.replace(/\{\{([^}]+)\}\}\s*\|\s*([^|]+(?:\s*\|\s*[^|]+)*)/g, (match, variable, filters) => {
      // First clean the variable of any remaining liquid syntax
      let cleanVariable = variable.trim();
      cleanVariable = cleanVariable.replace(/\$\{([^}]+)\}/g, (match, variable) => {
        return this.createSimpleDescription(variable.replace(/['"]/g, '').trim());
      });
      cleanVariable = this.transformOutputContent(cleanVariable);
      
      const filterParts = filters.split('|').map(f => f.trim());
      const filterDescriptions = filterParts.map(filter => this.transformFilter(filter));
      return `${cleanVariable} (${filterDescriptions.join(', ')})`;
    });

    // Handle simple {{variable}} patterns
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      let cleanVariable = variable.trim();
      // Clean any nested ${} first
      cleanVariable = cleanVariable.replace(/\$\{([^}]+)\}/g, (match, variable) => {
        return this.createSimpleDescription(variable.replace(/['"]/g, '').trim());
      });
      return this.transformOutputContent(cleanVariable);
    });

    // PHASE 3: Process remaining filters that weren't caught above
    result = result.replace(/\|\s*([^|]+)/g, (match, filter) => {
      const transformedFilter = this.transformFilter(filter.trim());
      return ` (${transformedFilter})`;
    });

    // PHASE 4: Transform complex dot notation patterns
    result = this.transformDotNotationPatterns(result);

    // PHASE 5: Final aggressive cleanup for any remaining liquid syntax
    // Clean up any remaining ${} that might have been missed
    result = result.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      return this.createSimpleDescription(variable.replace(/['"]/g, '').trim());
    });

    // Clean up any remaining {{}} that might have been missed
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      return this.createSimpleDescription(variable.replace(/['"]/g, '').trim());
    });

    // PHASE 6: Clean up extra whitespace and normalize
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  transformDotNotationPatterns(content) {
    if (this.displayMode === 'technical') {
      return content;
    }

    let result = content;

    // Handle catalog_items patterns specifically
    result = result.replace(/\bcatalog_items\.([^.\s]+(?:\.[^.\s]+)*)/g, (match, categoryPath) => {
      // Split the category path and clean each part
      const parts = categoryPath.split('.');
      const cleanParts = parts.map(part => this.createSimpleDescription(part));
      
      // Special cases for common patterns
      if (cleanParts.length >= 2 && cleanParts[0].toLowerCase().includes('custom') && cleanParts[0].toLowerCase().includes('attribute')) {
        // "Custom attribute.Favorite category" → "favorite category"
        const relevantParts = cleanParts.slice(1);
        return `products from ${relevantParts.join(' ').toLowerCase()}`;
      } else if (cleanParts.length === 1) {
        return `products from ${cleanParts[0].toLowerCase()}`;
      } else {
        return `products from ${cleanParts.join(' → ').toLowerCase()}`;
      }
    });

    // Handle event_properties patterns
    result = result.replace(/\bevent_properties\.([^.\s]+(?:\.[^.\s]+)*)/g, (match, propertyPath) => {
      const parts = propertyPath.split('.');
      const cleanParts = parts.map(part => this.createSimpleDescription(part));
      return `event: ${cleanParts.join(' ').toLowerCase()}`;
    });

    // Handle "event data" (friendly form) patterns that might have been partially processed  
    result = result.replace(/\bevent data\.([^.\s]+(?:\.[^.\s]+)*)/g, (match, propertyPath) => {
      const parts = propertyPath.split('.');
      const cleanParts = parts.map(part => this.createSimpleDescription(part));
      return `event: ${cleanParts.join(' ').toLowerCase()}`;
    });

    // Handle "event:" patterns that might have arrows
    result = result.replace(/\bevent:\s*([^.\s]+)\s*→\s*([^.\s]+(?:\s+[^.\s]+)*)/g, (match, firstPart, restParts) => {
      return `event: ${firstPart.toLowerCase()} ${restParts.toLowerCase()}`;
    });

    // Handle custom_attribute patterns  
    result = result.replace(/\bcustom_attribute\.([^.\s]+(?:\.[^.\s]+)*)/g, (match, attributePath) => {
      const parts = attributePath.split('.');
      const cleanParts = parts.map(part => this.createSimpleDescription(part));
      return `custom ${cleanParts.join(' ').toLowerCase()}`;
    });

    // Handle "Custom attribute" (friendly form) patterns that might have been partially processed
    result = result.replace(/\bCustom attribute\.([^.\s]+(?:\.[^.\s]+)*)/g, (match, attributePath) => {
      const parts = attributePath.split('.');
      const cleanParts = parts.map(part => this.createSimpleDescription(part));
      return `custom ${cleanParts.join(' ').toLowerCase()}`;
    });

    // Handle other common Braze object patterns
    result = result.replace(/\b(user|campaign|canvas|sms|whats_app|card|app|most_recently_used_device|targeted_device)\.([^.\s]+(?:\.[^.\s]+)*)/g, 
      (match, objectName, propertyPath) => {
        const objectFriendly = this.createSimpleDescription(objectName);
        const parts = propertyPath.split('.');
        const cleanParts = parts.map(part => this.createSimpleDescription(part));
        
        if (cleanParts.length === 1) {
          return `${objectFriendly.toLowerCase()} ${cleanParts[0].toLowerCase()}`;
        } else {
          return `${objectFriendly.toLowerCase()} → ${cleanParts.join(' → ').toLowerCase()}`;
        }
      }
    );

    // Handle remaining dot notation patterns (generic case)
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, 
      (match, objectName, propertyPath) => {
        // Skip if this looks like it's already been processed or contains friendly text
        if (match.includes(' ') || objectName.includes(' ')) {
          return match;
        }
        
        // Skip URLs - check if this is part of a URL pattern
        const fullContext = result;
        const matchIndex = fullContext.indexOf(match);
        const beforeMatch = fullContext.substring(Math.max(0, matchIndex - 10), matchIndex);
        const afterMatch = fullContext.substring(matchIndex + match.length, Math.min(fullContext.length, matchIndex + match.length + 10));
        
        // Check for URL patterns (http://, https://, or common URL structures)
        if (beforeMatch.includes('http') || beforeMatch.includes('://') || 
            afterMatch.includes('/') || match.includes('com') || match.includes('org') || 
            match.includes('net') || match.includes('api')) {
          return match;
        }
        
        const objectFriendly = this.createSimpleDescription(objectName);
        const parts = propertyPath.split('.');
        const cleanParts = parts.map(part => this.createSimpleDescription(part));
        
        if (cleanParts.length === 1) {
          return `${objectFriendly.toLowerCase()} ${cleanParts[0].toLowerCase()}`;
        } else {
          return `${objectFriendly.toLowerCase()} → ${cleanParts.join(' → ').toLowerCase()}`;
        }
      }
    );

    return result;
  }

  humanizeNestedLiquid(content) {
    if (this.displayMode === 'technical') {
      return content;
    }
    
    let result = content;
    
    // First pass: Handle complex patterns with filters
    // Pattern: {{object.${property}}} | filter: "args"
    const complexWithFilterPattern = /\{\{([^}]+\.\$\{[^}]+\}[^}]*)\}\}\s*\|\s*([^|]+)/g;
    result = result.replace(complexWithFilterPattern, (match, innerContent, filterPart) => {
      const transformedVariable = this.transformOutputContent(innerContent);
      const transformedFilter = this.transformFilter(filterPart.trim());
      return `${transformedVariable} (${transformedFilter})`;
    });
    
    // Second pass: Handle the special case {{${variable}}} - direct variable reference
    const directVarPattern = /\{\{\$\{([^}]+)\}\}\}/g;
    result = result.replace(directVarPattern, (match, variable) => {
      const friendlyVar = this.createSimpleDescription(variable);
      return friendlyVar;
    });
    
    // Third pass: Handle the common case: {{custom_attribute.${variable}}} (without filters)
    const commonPattern = /\{\{([^}]+\$\{[^}]+\}[^}]*)\}\}/g;
    result = result.replace(commonPattern, (match, innerContent) => {
      const transformed = this.transformOutputContent(innerContent);
      return transformed;
    });
    
    // Fourth pass: Handle any remaining {{...}} patterns with filters
    const simpleWithFilterPattern = /\{\{([^{}]+)\}\}\s*\|\s*([^|]+)/g;
    result = result.replace(simpleWithFilterPattern, (match, innerContent, filterPart) => {
      const transformedVariable = this.transformOutputContent(innerContent);
      const transformedFilter = this.transformFilter(filterPart.trim());
      return `${transformedVariable} (${transformedFilter})`;
    });
    
    // Fifth pass: Handle any remaining {{...}} patterns (without ${} inside and without filters)
    result = result.replace(/\{\{([^{}]+)\}\}/g, (match, innerContent) => {
      const transformed = this.transformOutputContent(innerContent);
      return transformed;
    });
    
    // Sixth pass: Handle standalone ${variable} syntax - convert to just the variable name
    result = result.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      return this.createSimpleDescription(variable);
    });
    
    // Seventh pass: Handle remaining filters that weren't caught by the patterns above
    const remainingFilterPattern = /\|\s*([^|]+)/g;
    result = result.replace(remainingFilterPattern, (match, filterPart) => {
      const transformedFilter = this.transformFilter(filterPart.trim());
      return ` (${transformedFilter})`;
    });
    
    // Final cleanup passes to ensure all liquid constructs are cleaned up
    // Remove any remaining double curly braces that might have been missed
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, innerContent) => {
      return this.transformOutputContent(innerContent.trim());
    });
    
    // Clean up any remaining ${} constructs that weren't caught
    result = result.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      return this.createSimpleDescription(variable.trim());
    });
    
    // Clean up extra spaces and normalize whitespace
    result = result.replace(/\s+/g, ' ').trim();
    
    return result;
  }

  transformOutputContent(content) {
    const variables = this.configManager.getVariables();
    const cleanContent = content.trim();
    
    // Handle pipes/filters first
    const [mainContent, ...filters] = cleanContent.split('|').map(part => part.trim());
    
    let result;
    
    // Check if this is a quoted string literal - preserve as-is
    if ((mainContent.startsWith('"') && mainContent.endsWith('"')) || 
        (mainContent.startsWith("'") && mainContent.endsWith("'"))) {
      result = this.displayMode === 'technical' ? mainContent : mainContent.slice(1, -1); // Remove quotes in friendly mode
    }
    // Handle ${variable} syntax first (Braze personalization tags)
    else if (mainContent.includes('${')) {
      result = this.processBrazeVariablePattern(mainContent);
    }
    // Handle complex variable paths
    else if (mainContent.includes('.')) {
      result = this.transformComplexVariable(mainContent);
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
    
    // Ensure no liquid syntax remains in the result (final cleanup)
    if (this.displayMode === 'friendly') {
      // Clean up any remaining ${} constructs
      result = result.replace(/\$\{([^}]+)\}/g, (match, variable) => {
        return this.createSimpleDescription(variable.trim());
      });
      
      // Clean up any remaining {{}} constructs
      result = result.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        return this.createSimpleDescription(variable.trim());
      });
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
    
    const variables = this.configManager.getVariables();
    
    // Try exact match first (for complex Braze patterns)
    if (variables[mainVar]) {
      return variables[mainVar].friendly || mainVar;
    }
    
    // Handle Braze-specific patterns
    if (mainVar.includes('${')) {
      return this.processBrazeVariablePattern(mainVar);
    }
    
    // Handle dot notation
    if (mainVar.includes('.')) {
      return this.processDotNotationVariable(mainVar, variables);
    }
    
    // Simple variable fallback
    return this.createSimpleDescription(mainVar);
  }

  processBrazeVariablePattern(variable) {
    const variables = this.configManager.getVariables();
    const dynamicPatterns = this.configManager.getDynamicPatterns();
    
    // First, let's handle more complex patterns that might have multiple ${} constructs
    let workingVariable = variable;
    
    // Clean up any remaining ${} constructs by converting them to their friendly names
    workingVariable = workingVariable.replace(/\$\{([^}]+)\}/g, (match, property) => {
      const cleanProperty = property.replace(/['"]/g, ''); // Remove quotes
      if (variables[cleanProperty]) {
        return variables[cleanProperty].friendly || this.createSimpleDescription(cleanProperty);
      }
      return this.createSimpleDescription(cleanProperty);
    });
    
    // Pattern: object.${property} (after ${} cleanup, this becomes object.friendlyProperty)
    const objectPropertyMatch = variable.match(/^([^.]+)\.\$\{([^}]+)\}$/);
    if (objectPropertyMatch) {
      const [, objectName, property] = objectPropertyMatch;
      
      // Try full pattern match first in variables
      const fullKey = `${objectName}.${property}`;
      if (variables[fullKey]) {
        return variables[fullKey].friendly;
      }
      
      // Check dynamic patterns
      if (dynamicPatterns[objectName]) {
        const pattern = dynamicPatterns[objectName];
        let friendly = pattern.friendly || pattern.pattern;
        
        // Replace placeholder with actual property name
        friendly = friendly.replace(/\{[^}]+\}/g, this.createSimpleDescription(property));
        return friendly;
      }
      
      // Build friendly description from parts
      let objectDescription = variables[objectName]?.friendly || this.createSimpleDescription(objectName);
      let propertyDescription = this.createSimpleDescription(property);
      
      // Special handling for common Braze patterns
      if (objectName === 'most_recently_used_device') {
        return `${propertyDescription} (from current device)`;
      } else if (objectName === 'targeted_device') {
        return `${propertyDescription} (from target device)`;
      } else if (objectName === 'campaign') {
        return `campaign ${propertyDescription}`;
      } else if (objectName === 'canvas') {
        return `Canvas ${propertyDescription}`;
      } else if (objectName === 'event_properties') {
        return `event: ${propertyDescription}`;
      } else if (objectName === 'custom_attribute') {
        return `custom ${propertyDescription}`;
      } else if (objectName === 'subscribed_state') {
        return `subscription status for ${propertyDescription}`;
      } else if (objectName === 'sms') {
        return `SMS ${propertyDescription}`;
      } else if (objectName === 'whats_app') {
        return `WhatsApp ${propertyDescription}`;
      } else if (objectName === 'card') {
        return `card ${propertyDescription}`;
      } else if (objectName === 'app') {
        return `app ${propertyDescription}`;
      }
      
      return `${objectDescription} → ${propertyDescription}`;
    }
    
    // Pattern: standalone ${property}
    const standaloneMatch = variable.match(/^\$\{([^}]+)\}$/);
    if (standaloneMatch) {
      const property = standaloneMatch[1];
      
      // First check if the exact property exists in variables
      if (variables[property]) {
        return variables[property].friendly;
      }
      
      // Then try common variable name cleanup
      const cleanProperty = property.replace(/['"]/g, ''); // Remove quotes
      if (variables[cleanProperty]) {
        return variables[cleanProperty].friendly;
      }
      
      return this.createSimpleDescription(property);
    }
    
    // If it's a complex pattern that wasn't caught by the above, return the cleaned version
    if (workingVariable !== variable) {
      return workingVariable;
    }
    
    // Fallback: try to clean up any remaining liquid syntax
    let result = variable;
    
    // Handle dot notation with remaining constructs
    if (result.includes('.')) {
      const parts = result.split('.');
      const transformedParts = parts.map(part => {
        if (variables[part]) {
          return variables[part].friendly || this.createSimpleDescription(part);
        }
        return this.createSimpleDescription(part);
      });
      return transformedParts.join(' → ');
    }
    
    return this.createSimpleDescription(result);
  }

  processDotNotationVariable(variable, variables) {
    const parts = variable.split('.');
    const basePart = parts[0];
    
    // Try exact match for full variable path
    if (variables[variable]) {
      return variables[variable].friendly;
    }
    
    let description = variables[basePart]?.friendly || this.createSimpleDescription(basePart);
    
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        
        // Check if we have a friendly name for this specific part
        const partKey = parts.slice(0, i + 1).join('.');
        if (variables[partKey]) {
          return variables[partKey].friendly;
        }
        
        // Build description incrementally
        const partDescription = this.createSimpleDescription(part);
        description += ` → ${partDescription}`;
      }
    }
    
    return description;
  }

  processDoubleBraceVariables(content) {
    if (this.displayMode === 'technical') {
      return content;
    }
    
    const result = content.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      // Convert to friendly format using our description method
      const friendlyVar = this.createSimpleDescription(variable);
      return friendlyVar;
    });
    
    return result;
  }

  transformFilter(filter) {
    const filters = this.configManager.getFilters();
    const fallbackFilterDescriptions = this.configManager.getFallbackFilterDescriptions();
    
    // Parse filter with potential arguments - handle quoted strings properly
    const colonIndex = filter.indexOf(':');
    let filterName, args = [];
    
    if (colonIndex !== -1) {
      filterName = filter.substring(0, colonIndex).trim();
      const argString = filter.substring(colonIndex + 1).trim();
      
      // Parse arguments, handling quoted strings
      if (argString) {
        args = this.parseFilterArguments(argString);
      }
    } else {
      filterName = filter.trim();
    }
    
    if (this.displayMode === 'technical') {
      return `${filterName}${args.length > 0 ? ': ' + args.join(', ') : ''}`;
    }
    
    // Check configured filters first
    if (filters[filterName]) {
      let description = filters[filterName].friendly || filterName;
      // Replace {value} placeholder with actual first argument
      if (args.length > 0) {
        description = description.replace(/\{value\}/g, args[0]);
      }
      return description;
    }
    
    // Check fallback filter descriptions
    if (fallbackFilterDescriptions[filterName]) {
      const fallback = fallbackFilterDescriptions[filterName];
      if (args.length > 0 && fallback.withArgs) {
        let result = fallback.withArgs;
        // Replace numbered placeholders {0}, {1}, etc.
        for (let i = 0; i < args.length; i++) {
          result = result.replace(new RegExp(`\\{${i}\\}`, 'g'), args[i]);
        }
        return result;
      } else if (fallback.withoutArgs) {
        return fallback.withoutArgs;
      }
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
    
    // Check common variable mappings from config
    const commonMappings = this.configManager.getCommonVariableMappings();
    if (commonMappings[variable.toLowerCase()]) {
      return commonMappings[variable.toLowerCase()];
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
      .replace(/\baddress\b/g, 'address')
      .replace(/\bsms\b/g, 'SMS')
      .replace(/\bios\b/g, 'iOS')
      .replace(/\busb\b/g, 'USB');
    
    // Capitalize first letter
    readable = readable.charAt(0).toUpperCase() + readable.slice(1);
    
    return readable;
  }

  resolveOverlaps(matches) {
    if (matches.length <= 1) return matches;
    
    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);
    
    const resolved = [];
    
    for (const match of matches) {
      let shouldAdd = true;
      
      // Check if this match overlaps with any already resolved matches
      for (let i = resolved.length - 1; i >= 0; i--) {
        const existing = resolved[i];
        
        // Check for overlap
        if (match.start < existing.end && match.end > existing.start) {
          // Overlap detected - decide which one to keep
          
          // Priority 1: Keep tag matches over output matches (outer syntax over inner)
          if (match.type === 'tag' && existing.type === 'output') {
            // Remove the existing output match and add the tag match
            resolved.splice(i, 1);
            continue;
          } else if (match.type === 'output' && existing.type === 'tag') {
            // Keep the existing tag match, skip this output match
            shouldAdd = false;
            break;
          }
          
          // Priority 2: Keep longer matches (more comprehensive)
          const matchLength = match.end - match.start;
          const existingLength = existing.end - existing.start;
          
          if (matchLength > existingLength) {
            // This match is longer, replace the existing one
            resolved.splice(i, 1);
            continue;
          } else {
            // Existing match is longer or equal, skip this one
            shouldAdd = false;
            break;
          }
        }
      }
      
      if (shouldAdd) {
        resolved.push(match);
      }
    }
    
    // Sort by start position again after resolution
    resolved.sort((a, b) => a.start - b.start);
    
    return resolved;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PatternMatcher;
} else {
  window.PatternMatcher = PatternMatcher;
} 