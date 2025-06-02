# Braze Liquid Highlighter

A Chrome browser extension that transforms liquid templating syntax into human-readable descriptions with clean visual hierarchy. Designed specifically for Braze email and messaging workflows.

## Overview

The Braze Liquid Highlighter makes liquid syntax more accessible to team members with varying technical backgrounds by converting complex liquid code into readable descriptions while maintaining visual clarity through intelligent color coding and hierarchy.

## Features

### Core Functionality
- **Real-time Highlighting**: Automatically detects and transforms liquid syntax as you type
- **Cross-frame Support**: Works in iframes and embedded editors (including Bee Editor, TinyMCE)
- **Pattern Recognition**: Intelligent detection of different liquid syntax patterns
- **Context Awareness**: Adapts spacing and positioning based on content environment

### Visual System
- **Smart Color Coding**: Different colors for different pattern types
  - 🟡 **Amber**: Loop patterns (`{% for %}`, `{% endfor %}`)
  - 🔴 **Red**: Conditional patterns (`{% if %}`, `{% endif %}`, `{% else %}`)
  - 🟢 **Green**: Assignment patterns (`{% assign %}`, `{% capture %}`) and variables (`{{email_address}}`)
  - 🔵 **Blue**: Data fetch patterns (`{% catalog_items %}`)
  - 🟣 **Pink**: Include patterns (`{% include %}`, `{% render %}`)
  - 🟣 **Purple**: Comment patterns (`{% comment %}`)

- **Visual Hierarchy**: Different sizes and styling based on importance
  - **Primary Elements**: Control flow (larger, more prominent)
  - **Secondary Elements**: Data operations and assignments (medium)
  - **Tertiary Elements**: Ending tags (smaller, subdued with dashed borders)
  - **Minor Elements**: Simple variables (smallest)
  - **Utility Elements**: Includes and comments (italic styling)

### Display Modes
- **Friendly Mode** (Default): Readable descriptions with technical context
  - Example: `{% for product in products limit:3 %}` → "Loop through product list (show 3 items)"
- **Technical Mode**: Clean original syntax for developers
  - Example: `{% for product in products limit:3 %}` → "for product in products limit:3"

### Advanced Pattern Support
- **Complex Nested Syntax**: Handles `{{custom_attribute.${variable}.Products}}`
- **International Characters**: Supports German umlauts and special characters
- **Variable Detection**: Enhanced `{{${last_name}}}` recognition
- **Multi-line Content**: Proper handling of syntax across different divs and containers

## Technical Implementation

### Architecture
- **Manifest V3**: Chrome extension using the latest manifest version
- **Content Script**: Real-time DOM processing and pattern matching
- **Configuration System**: JSON-based pattern definitions for easy extensibility
- **CSS-based Styling**: Comprehensive theming with dark mode support

### Key Files
- `content.js`: Main highlighting logic and pattern recognition
- `styles.css`: Visual hierarchy and color system
- `liquid-config.json`: Pattern definitions and transformations
- `popup.html/js`: Extension interface and controls
- `test.html`: Comprehensive test page for development

### Pattern Recognition System
The extension uses a sophisticated pattern matching system with:
- **Priority-based Matching**: Complex patterns matched first
- **Fallback Detection**: Keyword-based detection for unmatched patterns
- **Context Analysis**: Different handling for multi-line vs inline content
- **Importance Classification**: 5-tier system for visual hierarchy

## Installation & Usage

### Development Setup
1. Clone or download the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

### Using the Extension
1. **Automatic Detection**: The extension automatically highlights liquid syntax on all web pages
2. **Toggle On/Off**: Click the extension icon to enable/disable highlighting
3. **Switch Modes**: Choose between Friendly and Technical display modes
4. **Manual Refresh**: Use the refresh button for dynamic content

### Testing
Open `test.html` in your browser to see examples of all supported patterns and verify the visual hierarchy system.

## Supported Liquid Patterns

### Control Flow
- `{% for item in collection %}` / `{% endfor %}`
- `{% if condition %}` / `{% endif %}`
- `{% unless condition %}` / `{% endunless %}`
- `{% case variable %}` / `{% when value %}` / `{% endcase %}`
- `{% else %}` / `{% elseif condition %}`

### Data Operations
- `{% assign variable = value %}`
- `{% capture variable %}` / `{% endcapture %}`
- `{% catalog_items products "ids" %}`

### Output Variables
- `{{email_address}}`, `{{first_name}}`, `{{last_name}}`
- `{{custom_attribute.property}}`
- `{{${dynamic_variable}}}`
- `{{content_blocks.${variable}}}`

### Templates & Comments
- `{% include 'template_name' %}`
- `{% render 'template_name' %}`
- `{% comment %}` / `{% endcomment %}`

## Configuration

The extension is highly configurable through `liquid-config.json`:

### Adding New Patterns
```json
{
  "patterns": {
    "newPattern": {
      "regex": "pattern_regex",
      "friendly": "Human readable description",
      "technical": "Clean technical syntax",
      "placeholderMap": {
        "placeholder": 1
      }
    }
  }
}
```

### Customizing Variables
```json
{
  "variables": {
    "custom_field": {
      "friendly": "custom field",
      "description": "Custom user field"
    }
  }
}
```

## Browser Compatibility

- **Chrome**: Primary support (Manifest V3)
- **Edge**: Compatible (Chromium-based)
- **Firefox**: Requires manifest adaptation
- **Safari**: Requires Safari extension conversion

## Version History

### v0.0.1 (Current)
- Initial release with core highlighting functionality
- Two display modes (Friendly, Technical)
- Visual hierarchy system with 5 importance levels
- Smart color coding for 6 pattern types
- Context-aware spacing and positioning
- International character support
- Complex nested syntax handling
- Cross-frame compatibility

## Development Notes

### Key Design Decisions
- **No Visual Distractions**: Removed icons and hover effects for clean interface
- **Two-Mode System**: Simplified from three modes to focus on core use cases
- **Pattern-Specific Colors**: Each syntax type has distinct visual identity
- **Context Awareness**: Different spacing rules for different environments
- **Performance Optimized**: Debounced highlighting and efficient DOM processing

### Future Enhancements
- User-defined custom patterns
- Export/import configuration
- Integration with popular email editors
- Advanced tooltip system
- Accessibility improvements

## Contributing

This extension is designed to be easily extensible through the JSON configuration system. Most customizations can be made without touching the core JavaScript code.

## License

[Add appropriate license information]

---

**Note**: This extension is specifically designed for Braze liquid templating syntax and may not cover all standard Liquid features. It focuses on the most commonly used patterns in email marketing and messaging workflows. 