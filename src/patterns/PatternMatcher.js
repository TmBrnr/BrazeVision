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

  identifyTagPattern(content) {
    const patterns = this.configManager.getPatterns();
    if (!patterns) return null;
    
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
        
        if (regex.test(cleanContent)) {
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
      'catalogSelectionItems': /\bcatalog_selection_items\b/i,
      'connectedContent': /\bconnected_content\b/i,
      'fetch': /\bfetch\s+/i,
      'api': /\bapi\s+/i,
      
      // Braze-specific patterns (orange)
      'abortMessage': /\babort_message\b/i,
      'promotion': /\bpromotion\b/i,
      
      // Include patterns (pink)
      'include': /\binclude\s+/i,
      'render': /\brender\s+/i,
      
      // Comment patterns (default purple)
      'comment': /\bcomment\b/i,
      'endcomment': /\bendcomment\b/i
    };
    
    for (const [pattern, regex] of Object.entries(fallbackPatterns)) {
      if (regex.test(cleanContent)) {
        return pattern;
      }
    }
    
    return null;
  }

  identifyOutputPattern(content) {
    if (!content) return null;
    
    const cleanContent = content.trim();
    
    // Enhanced Braze pattern detection
    const brazePatterns = {
      // Standard ${variable} patterns
      'brazeStandardVar': /^\$\{([^}]+)\}$/,
      
      // Nested object patterns: object.${property}
      'brazeNestedObject': /^([a-zA-Z_][a-zA-Z0-9_]*)\.\$\{([^}]+)\}$/,
      
      // Complex object paths: object.property
      'brazeObjectProperty': /^([a-zA-Z_][a-zA-Z0-9_]*\.)+[a-zA-Z_][a-zA-Z0-9_]*$/,
      
      // Subscription state patterns
      'brazeSubscriptionState': /^subscribed_state\.\$\{([^}]+)\}$/,
      
      // Device attribute patterns
      'brazeDeviceAttribute': /^(most_recently_used_device|targeted_device)\.\$\{([^}]+)\}$/,
      
      // Campaign/Canvas attribute patterns
      'brazeCampaignAttribute': /^(campaign|canvas|card)\.\$\{([^}]+)\}$/,
      
      // Event properties patterns
      'brazeEventProperty': /^event_properties\.\$\{([^}]+)\}$/,
      
      // SMS/WhatsApp patterns
      'brazeMessageProperty': /^(sms|whats_app)\.\$\{([^}]+)\}$/,
      
      // App information patterns
      'brazeAppProperty': /^app\.\$\{([^}]+)\}$/,
      
      // Custom attribute patterns
      'brazeCustomAttribute': /^custom_attribute\.\$\{([^}]+)\}$/
    };
    
    // Check for specific Braze patterns first
    for (const [patternName, regex] of Object.entries(brazePatterns)) {
      if (regex.test(cleanContent)) {
        return patternName;
      }
    }
    
    // Legacy pattern detection for backwards compatibility
    const legacyPatterns = {
      'customAttribute': /custom_attribute/i,
      'emailAddress': /email_address/i,
      'firstName': /first_name/i,
      'lastName': /last_name/i,
      'userId': /user_id/i,
      'userName': /user_name/i,
      'product': /\bproduct\b(?!\s*s)/i,
      'products': /\bproducts\b/i,
      'contentBlocks': /content_blocks/i,
      'recommendedProducts': /recommended_products/i,
      'campaignName': /campaign\.name/i,
      'canvasName': /canvas\.name/i,
      'deviceCarrier': /(most_recently_used_device|targeted_device)\.carrier/i,
      'deviceModel': /(most_recently_used_device|targeted_device)\.model/i,
      'variable': /^\w+$/
    };
    
    for (const [pattern, regex] of Object.entries(legacyPatterns)) {
      if (regex.test(cleanContent)) {
        return pattern;
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
    if (!patterns) return content;

    // Clean the content
    let cleanContent = content.replace(/\s+/g, ' ').trim();
    
    // Sort patterns by priority to match specific patterns first (SAME AS identifyTagPattern)
    const sortedPatterns = Object.entries(patterns)
      .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));
    
    // Try to match against configured patterns in priority order
    for (const [patternName, pattern] of sortedPatterns) {
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
    
    if (pattern.placeholderMap) {
      for (const [placeholder, groupIndex] of Object.entries(pattern.placeholderMap)) {
        let value = match[groupIndex] || pattern.defaults?.[placeholder] || placeholder;
        
        // Process the value through humanizeNestedLiquid if it contains liquid syntax
        if (typeof value === 'string' && (value.includes('{{') || value.includes('${')) ) {
          value = this.humanizeNestedLiquid(value);
        }
        
        // Process conditional expressions that might contain operators
        if (typeof value === 'string' && placeholder === 'condition') {
          value = this.processConditionalExpression(value);
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

    // Process any nested liquid variables in the expression
    processedExpression = this.humanizeNestedLiquid(processedExpression);

    return processedExpression;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getFallbackTransformation(content) {
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
          const processedCondition = this.processConditionalExpression(condition);
          return `Display when: ${processedCondition}`;
        }
      },
      {
        regex: /^unless\s+(.+)$/i,
        transform: (match) => {
          const condition = this.humanizeNestedLiquid(match[1]);
          const processedCondition = this.processConditionalExpression(condition);
          return `Hide when: ${processedCondition}`;
        }
      },
      {
        regex: /^assign\s+(\w+)\s*=\s*(.+)$/i,
        transform: (match) => {
          const value = this.humanizeNestedLiquid(match[2]);
          const result = `Create variable: ${match[1]} = ${value}`;
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
        regex: /^unless\s+(.+)$/i,
        transform: (match) => `unless ${match[1]}`
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
    
    for (const transformation of transformations) {
      const match = content.match(transformation.regex);
      if (match) {
        const result = transformation.transform(match);
        return result;
      }
    }
    
    return content;
  }

  humanizeNestedLiquid(content) {
    if (this.displayMode === 'technical') {
      return content;
    }
    
    let result = content;
    
    // Handle complex assignment values with filters first
    // Pattern: {{object.${property}}} | filter: "args"
    const complexWithFilterPattern = /\{\{([^}]+\.\$\{[^}]+\}[^}]*)\}\}\s*\|\s*([^|]+)/g;
    result = result.replace(complexWithFilterPattern, (match, innerContent, filterPart) => {
      const transformedVariable = this.transformOutputContent(innerContent);
      const transformedFilter = this.transformFilter(filterPart.trim());
      return `${transformedVariable} (${transformedFilter})`;
    });
    
    // Handle the special case {{${variable}}} - direct variable reference
    const directVarPattern = /\{\{\$\{([^}]+)\}\}\}/g;
    result = result.replace(directVarPattern, (match, variable) => {
      const friendlyVar = this.createSimpleDescription(variable);
      return friendlyVar;
    });
    
    // Handle the common case: {{custom_attribute.${variable}}} (without filters already handled above)
    const commonPattern = /\{\{([^}]+\$\{[^}]+\}[^}]*)\}\}/g;
    result = result.replace(commonPattern, (match, innerContent) => {
      const transformed = this.transformOutputContent(innerContent);
      return transformed;
    });
    
    // Handle any remaining {{...}} patterns (without ${} inside) with filters
    const simpleWithFilterPattern = /\{\{([^{}]+)\}\}\s*\|\s*([^|]+)/g;
    result = result.replace(simpleWithFilterPattern, (match, innerContent, filterPart) => {
      const transformedVariable = this.transformOutputContent(innerContent);
      const transformedFilter = this.transformFilter(filterPart.trim());
      return `${transformedVariable} (${transformedFilter})`;
    });
    
    // Handle any remaining {{...}} patterns (without ${} inside and without filters)
    result = result.replace(/\{\{([^{}]+)\}\}/g, (match, innerContent) => {
      const transformed = this.transformOutputContent(innerContent);
      return transformed;
    });
    
    // Handle standalone ${variable} syntax - convert to just the variable name
    result = result.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      return this.createSimpleDescription(variable);
    });
    
    // Handle remaining filters that weren't caught by the patterns above
    const remainingFilterPattern = /\|\s*([^|]+)/g;
    result = result.replace(remainingFilterPattern, (match, filterPart) => {
      const transformedFilter = this.transformFilter(filterPart.trim());
      return ` (${transformedFilter})`;
    });
    
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
    
    // Pattern: object.${property}
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
    
    return variable;
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
    
    // Handle common variable name mappings first
    const commonMappings = {
      'membership_level': 'membership level',
      'max_display': 'max display',
      'shopping_cart': 'shopping cart',
      'total_points': 'total points',
      'bonus_points': 'bonus points',
      'email_global': 'email global',
      'inbound_message_body': 'inbound message body',
      'variant_name': 'variant name',
      'geofence_name': 'geofence name',
      'user_preferences': 'user preferences',
      'ad_tracking_enabled': 'ad tracking enabled',
      'foreground_push_enabled': 'foreground push enabled',
      'inbound_media_urls': 'inbound media urls',
      'preferred_category': 'preferred category',
      'api_id': 'API ID',
      'most_recent_locale': 'most recent locale'
    };
    
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