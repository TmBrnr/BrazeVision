# Liquid Syntax Highlighter

A Chrome browser extension that transforms liquid templating syntax into **human-readable descriptions** for non-technical users. Instead of showing confusing code, it displays plain language explanations of what the liquid syntax does.

## ✨ Features

### 🎯 Human-Readable Display
- **Simple Mode**: "Show 4 products from catalog" instead of `{% for product in products limit:4 %}`
- **Friendly Mode**: "Loop through products (show 4 items)" with readable context
- **Technical Mode**: Clean original syntax for developers

### 🔧 Fully Configurable
- **JSON Configuration**: Easy to customize patterns, variables, and display modes
- **Scalable**: Add new liquid patterns and transformations without code changes
- **User-Friendly**: Perfect for content creators, marketers, and non-technical users

### 🌐 Universal Compatibility
- Works across **all websites** and **iframe content**
- **Real-time highlighting** with automatic content detection
- **Cross-frame synchronization** for consistent experience

## 🚀 Quick Start

1. **Install** the extension (load unpacked from Chrome's developer mode)
2. **Visit any page** with liquid syntax like `{{email_address}}` or `{% if condition %}`
3. **Choose your display mode**:
   - **Simple**: Plain language (recommended for non-technical users)
   - **Friendly**: Readable with context
   - **Technical**: Clean original syntax

## 📖 Display Mode Examples

| Original Syntax | Simple Mode | Friendly Mode | Technical Mode |
|----------------|-------------|---------------|----------------|
| `{{${email_address}}}` | "email" | "email address" | "email_address" |
| `{% for product in products limit:4 %}` | "Show 4 products from catalog" | "Loop through products (show 4 items)" | "for product in products limit:4" |
| `{{custom_attribute.${cart}.total}}` | "user data cart.total" | "custom attribute cart.total" | "custom_attribute.cart.total" |
| `{% if first_name %}` | "Show this if first name" | "Display when: first name" | "if first_name" |

## ⚙️ Configuration System

### Display Modes
The extension supports three display modes defined in `liquid-config.json`:

```json
{
  "displayModes": {
    "simple": {
      "name": "Simple",
      "description": "Plain language descriptions for non-technical users",
      "showTechnical": false,
      "showTooltips": true
    },
    "friendly": {
      "name": "Friendly", 
      "description": "Readable with some technical context",
      "showTechnical": true,
      "showTooltips": true
    },
    "technical": {
      "name": "Technical",
      "description": "Original syntax with minimal cleaning",
      "showTechnical": true,
      "showTooltips": false
    }
  }
}
```

### Pattern Transformations
Define how different liquid patterns should be transformed:

```json
{
  "patterns": {
    "forLoop": {
      "regex": "for\\s+(\\w+)\\s+in\\s+([^\\s]+)(?:\\s+limit:(\\d+))?",
      "simple": "Show {limit} {items} from {collection}",
      "friendly": "Loop through {collection} (show {limit} {items})",
      "technical": "for {item} in {collection} limit:{limit}"
    }
  }
}
```

### Variable Glossary
Map technical variable names to human-readable descriptions:

```json
{
  "variables": {
    "email_address": {
      "simple": "email",
      "friendly": "email address",
      "description": "User's email address"
    },
    "custom_attribute": {
      "simple": "user data",
      "friendly": "custom attribute",
      "description": "Custom user information"
    }
  }
}
```

### Visual Styling
Customize appearance for each display mode:

```json
{
  "styling": {
    "simple": {
      "backgroundColor": "rgba(59, 130, 246, 0.08)",
      "color": "#1e40af",
      "fontWeight": "500",
      "padding": "2px 6px",
      "borderRadius": "4px",
      "border": "1px solid rgba(59, 130, 246, 0.2)"
    }
  }
}
```

## 🎨 UX Design Principles

### For Non-Technical Users
- **Plain Language**: No jargon or technical terminology
- **Clear Intent**: Shows what the code will do, not how it does it
- **Visual Hierarchy**: Subtle highlighting that doesn't overwhelm
- **Contextual Help**: Tooltips with original syntax when needed

### Accessibility
- **Keyboard Navigation**: Full keyboard support in popup
- **Screen Readers**: Proper ARIA labels and roles
- **Color Blind Friendly**: Uses patterns and typography, not just color
- **Dark Mode**: Automatic adaptation to system preferences

### Performance
- **Debounced Updates**: Prevents excessive highlighting during typing
- **Smart Detection**: Only processes relevant content changes
- **Memory Efficient**: Cleans up highlights when disabled
- **Cross-Frame Sync**: Minimal overhead communication between frames

## 🔧 Technical Architecture

### Files Structure
```
├── manifest.json          # Extension configuration
├── content.js             # Main highlighting logic
├── liquid-config.json     # Human-readable transformations
├── popup.html             # User interface
├── popup.js               # Popup logic and mode switching
├── styles.css             # Visual styling
└── README.md              # Documentation
```

### Key Components

1. **LiquidHighlighter Class** (`content.js`)
   - Pattern detection and transformation
   - Configuration-driven text processing
   - Cross-frame synchronization
   - Real-time content monitoring

2. **Configuration System** (`liquid-config.json`)
   - Display mode definitions
   - Pattern transformation rules
   - Variable glossary
   - Visual styling options

3. **PopupController Class** (`popup.js`)
   - Mode switching interface
   - Real-time preview
   - Settings persistence

## 🌟 Use Cases

### Content Creators
- **Email Marketers**: Understand what personalization tags do
- **Template Designers**: See the intent behind liquid code
- **Content Writers**: Easily identify dynamic content areas

### Developers & Agencies
- **Code Reviews**: Quickly understand liquid template logic
- **Client Presentations**: Show functionality in plain language
- **Training**: Help non-technical team members understand templates

### Enterprise Teams
- **Documentation**: Visual aid for template documentation
- **Quality Assurance**: Verify dynamic content behavior
- **Stakeholder Reviews**: Communicate template functionality clearly

## 🛠️ Advanced Configuration

### Adding New Patterns
1. Define regex pattern in `liquid-config.json`
2. Specify transformations for each display mode
3. Add variable mappings if needed
4. Test with the refresh button

### Custom Styling
1. Modify styling section in config
2. Use CSS properties for each display mode
3. Support for dark mode variants
4. Ensure accessibility compliance

### Extending Variables
1. Add entries to variables section
2. Define simple, friendly, and technical versions
3. Include helpful descriptions
4. Consider internationalization needs

## 📝 Browser Support

- **Chrome**: Full support (primary target)
- **Edge**: Compatible with Chromium-based version
- **Firefox**: Adaptable with manifest v2 changes

## 🔒 Privacy & Security

- **No Data Collection**: Extension works entirely locally
- **No External Requests**: All processing happens on-device
- **Secure by Design**: Follows Chrome extension security best practices
- **Cross-Origin Safe**: Respects browser security boundaries

## 🤝 Contributing

1. **Fork** the repository
2. **Configure** new patterns in `liquid-config.json`
3. **Test** with various liquid syntax examples
4. **Submit** pull request with clear description

### Development Setup
```bash
# Load extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension directory
```

## 📄 License

MIT License - Feel free to use and modify for any purpose.

---

**Transform confusing liquid syntax into clear, human-readable descriptions. Perfect for teams with mixed technical expertise.** 