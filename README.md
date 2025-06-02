# Braze Liquid Highlighter

A Chrome browser extension that transforms liquid templating syntax into human-readable descriptions with clean visual hierarchy. Designed specifically for Braze email and messaging workflows with enterprise-grade architecture and ultra-readable transformations.

## 🚀 Major Features & Improvements

### Advanced Pattern Recognition
- **Intelligent Variable Handling**: Transforms `{{${email_address}}}` → "Email address"
- **Complex Nested Syntax**: Handles `{{content_blocks.${code_createSalutation} | id: 'cb1'}}` → "Content blocks → code createSalutation (ID: 'cb1')"
- **Filter Processing**: Actual values instead of placeholders in filters
- **Dynamic Variable Preservation**: Maintains actual variable names instead of generic placeholders

### Real-World Transformation Examples

#### Before (Technical Code)
```liquid
{% for product in recommended_products limit:4 %}
  {{content_blocks.${code_createSalutation} | id: 'cb1'}}
  {% if custom_attribute.${Recommendations} %}
    {{${email_address}}}
  {% endif %}
{% endfor %}
```

#### After (Friendly Mode)
- Loop through recommended products (show 4 items)
- Content blocks → code createSalutation (ID: 'cb1')  
- Show when: custom attribute → Recommendations
- Email address
- End of loop

### Enterprise-Grade Architecture
- **Modular Design**: 7 specialized modules for maintainability and scalability
- **Performance Optimized**: Efficient DOM processing with memory management
- **Cross-Frame Support**: Works in iframes and embedded editors (Bee Editor, TinyMCE)
- **Real-time Processing**: Instant highlighting with debounced updates

## Core Features

### Visual Intelligence
- **Smart Color Coding**: Context-aware colors for different pattern types
  - 🟡 **Amber**: Loop patterns (`{% for %}`, `{% endfor %}`)
  - 🔴 **Red**: Conditional patterns (`{% if %}`, `{% endif %}`, `{% else %}`)
  - 🟢 **Green**: Assignment patterns (`{% assign %}`, `{% capture %}`) and variables
  - 🔵 **Blue**: Data fetch patterns (`{% catalog_items %}`)
  - 🟣 **Pink**: Include patterns (`{% include %}`, `{% render %}`)
  - 🟣 **Purple**: Comment patterns (`{% comment %}`)

- **Visual Hierarchy**: Five importance levels for optimal readability
  - **Primary Elements**: Control flow (prominent styling)
  - **Secondary Elements**: Data operations and assignments
  - **Tertiary Elements**: Ending tags with friendly names ("End of loop", "End condition")
  - **Minor Elements**: Simple variables (compact styling)
  - **Utility Elements**: Includes and comments (italic styling)

### Dual Display Modes
- **Friendly Mode** (Default): Ultra-readable descriptions
  - `{% assign welcome_message = "Hello " | append: first_name %}` 
  - → "Set variable to: welcome message = Hello appended with first name"
  
- **Technical Mode**: Clean syntax for developers
  - `{% assign welcome_message = "Hello " | append: first_name %}`
  - → "assign welcome_message = Hello | append: first_name"

### Advanced Pattern Support
- **Complex Variables**: `{{custom_attribute.${variable}.Products}}` → "Custom attribute → variable → Products"
- **Filter Chains**: `{{name | upcase | truncate: 20}}` → "Name (uppercase, truncated to 20 characters)"
- **International Support**: German umlauts and special characters
- **Edge Cases**: Graceful handling of malformed syntax

## 🏗️ Technical Architecture

### Modular Structure (7 Components)

1. **ConfigManager.js** (79 lines) - Configuration loading with fallback handling
2. **StorageManager.js** (92 lines) - Chrome storage sync and user preferences  
3. **PatternMatcher.js** (349 lines) - Core syntax recognition and transformation
4. **DOMProcessor.js** (217 lines) - DOM traversal and text node processing
5. **HighlightRenderer.js** (208 lines) - Visual styling and tooltip generation
6. **EventManager.js** (350 lines) - Event handling and performance monitoring
7. **LiquidHighlighter.js** (281 lines) - Main orchestrator and public API

### Key Improvements Over Monolithic Design
- **Maintainability**: Single-responsibility modules
- **Testability**: Individual module unit testing capability
- **Scalability**: Easy feature addition without affecting existing code
- **Performance**: Module-level cleanup and memory management
- **Debugging**: Clear error boundaries and comprehensive logging

### Pattern Recognition Engine
- **Priority-based Matching**: Complex patterns matched first
- **Fallback Detection**: Keyword-based detection for edge cases
- **Context Analysis**: Environment-aware processing
- **Error Handling**: Graceful degradation for malformed syntax

## Installation & Usage

### Development Setup
1. Clone or download the extension files
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select extension directory

### Using the Extension
1. **Automatic Detection**: Highlights liquid syntax on all web pages
2. **Toggle Control**: Click extension icon to enable/disable
3. **Mode Switching**: Choose Friendly or Technical display modes
4. **Dynamic Content**: Handles real-time content updates

### Testing
Open `test.html` to see comprehensive pattern examples and verify transformations.

## 📋 Supported Liquid Patterns

### Enhanced Control Flow
- **Loops**: `{% for item in collection limit:5 %}` → "Loop through collection (show 5 items)"
- **Conditionals**: `{% if custom_attribute.premium %}` → "Show when: custom attribute → premium"
- **Cases**: `{% case subscription_tier %}` → "Switch on subscription tier"
- **Ending Tags**: `{% endfor %}` → "End of loop", `{% endif %}` → "End condition"

### Advanced Data Operations
- **Assignments**: `{% assign total = price | times: quantity %}` → "Set variable to: total = price (multiply by quantity)"
- **Captures**: `{% capture greeting %}Hello {{first_name}}{% endcapture %}` → "Capture as greeting: Hello first name"
- **Catalog Items**: `{% catalog_items products "product_ids" %}` → "Fetch products: product_ids"

### Complex Output Variables
- **Simple**: `{{email_address}}` → "Email address"
- **Nested**: `{{custom_attribute.${preference}}}` → "Custom attribute → preference"
- **Filtered**: `{{name | capitalize | truncate: 15}}` → "Name (capitalized, truncated to 15 characters)"
- **Dynamic**: `{{content_blocks.${code_greeting}}}` → "Content blocks → code greeting"

### Template System
- **Includes**: `{% include 'header_template' %}` → "Include template: header_template"
- **Renders**: `{% render 'product_card' with product %}` → "Render template: product_card with product"
- **Comments**: `{% comment %}Note{% endcomment %}` → "Comment: Note"

## 🔧 Configuration

Highly configurable through `liquid-config.json`:

### Adding Custom Patterns
```json
{
  "patterns": {
    "customLoop": {
      "regex": "for\\s+(\\w+)\\s+in\\s+(.+?)(?:\\s+limit:\\s*(\\d+))?",
      "friendly": "Loop through {collection} (show {limit} items)",
      "technical": "for {item} in {collection} limit:{limit}",
      "placeholderMap": {
        "item": 1,
        "collection": 2,
        "limit": 3
      },
      "priority": 1
    }
  }
}
```

### Custom Variables
```json
{
  "variables": {
    "subscription_tier": {
      "friendly": "subscription level",
      "description": "User's subscription level"
    }
  }
}
```

### Filter Definitions
```json
{
  "filters": {
    "multiply": {
      "friendly": "multiply by {value}",
      "description": "Multiplies the input by the specified value"
    }
  }
}
```

## 🚀 Performance & Compatibility

### Browser Support
- **Chrome**: Full support (Manifest V3)
- **Edge**: Compatible (Chromium-based)
- **Firefox**: Adaptable with manifest changes
- **Safari**: Convertible to Safari extension

### Performance Features
- **Debounced Processing**: Efficient real-time updates
- **Memory Management**: Proper cleanup and garbage collection
- **Mutation Observers**: Smart DOM change detection
- **Error Boundaries**: Isolated failure handling

## 📊 Version History

### v1.0.0 (Current - Major Release)
- **✅ Modular Architecture**: Refactored from 1,158-line monolithic file to 7 focused modules
- **✅ Enhanced Transformations**: Fixed variable name preservation and filter handling
- **✅ Improved Readability**: `{{${email_address}}}` → "Email address" transformations
- **✅ Filter Support**: Comprehensive pipe operator handling with actual values
- **✅ Mode Switching**: Reliable Friendly/Technical mode toggling
- **✅ Edge Case Handling**: Better support for malformed and complex syntax
- **✅ Friendly Endings**: "End of loop", "End condition" instead of technical tags
- **✅ Performance**: Better memory management and error handling

### v0.0.1 (Initial)
- Basic highlighting functionality
- Two display modes
- Visual hierarchy system
- Cross-frame compatibility

## 🛠️ Development Notes

### Key Design Decisions
- **Ultra-Readable Output**: Non-technical users can understand complex liquid code
- **Modular Architecture**: Enterprise-ready maintainability and scalability  
- **Performance First**: Optimized for real-time editing environments
- **Visual Clarity**: Smart color coding without overwhelming the interface
- **Error Resilience**: Graceful handling of edge cases and malformed syntax

### Future Enhancements
- **Custom Pattern Builder**: Visual interface for creating patterns
- **Team Configuration**: Shared settings across organization
- **Advanced Analytics**: Usage tracking and optimization insights
- **API Integration**: Direct Braze workspace integration
- **Accessibility**: Enhanced screen reader support

## 🤝 Contributing

The extension is designed for easy extensibility through JSON configuration. Most customizations can be made without touching core JavaScript modules.

### Adding New Patterns
1. Edit `liquid-config.json`
2. Add pattern definition with regex and templates
3. Test with `test.html`
4. Submit pull request

### Module Development
Each module has a single responsibility:
- Follow existing error handling patterns
- Add comprehensive logging
- Include unit tests
- Document public methods

## 📄 License

[Add appropriate license information]

---

**Enterprise-Ready**: This extension is built with professional development practices, comprehensive error handling, and modular architecture suitable for enterprise environments. Specifically optimized for Braze liquid templating in email marketing and messaging workflows. 