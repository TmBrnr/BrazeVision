# Braze Vision

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/TmBrnr/BrazeVision)

A Chrome extension that transforms Braze's Liquid templating syntax into a human-readable format with a clean visual hierarchy. Designed for both technical and non-technical users, it simplifies complex logic into understandable descriptions, making email and message personalization easier than ever.

## ✨ Features

- **Intelligent Syntax Highlighting**: Automatically detects and highlights Liquid syntax on any webpage.
- **Dual Display Modes**:
    - **Friendly Mode**: Translates Liquid into natural language (e.g., `{% for item in products %}` becomes "Loop through products").
    - **Technical Mode**: Cleans up and color-codes the original Liquid syntax for developers.
- **Complex Pattern Recognition**: Understands nested variables, filter chains, and complex logic.
- **Easy-to-Use Popup**: Toggle highlighting, switch modes, and refresh on the fly.
- **Customizable**: The core highlighting logic is driven by a configurable JSON file.
- **Lightweight & Performant**: Optimized for speed with efficient DOM processing.

---

## 🚀 Installation

Since this extension is not yet on the Chrome Web Store, you can install it manually in developer mode:

1.  **Download/Clone**: Clone this repository or download it as a ZIP file and unzip it.
    ```sh
    git clone https://github.com/TmBrnr/BrazeVision.git
    ```
2.  **Open Chrome Extensions**: Navigate to `chrome://extensions` in your Chrome browser.
3.  **Enable Developer Mode**: Turn on the "Developer mode" toggle in the top-right corner.
4.  **Load the Extension**: Click the "Load unpacked" button and select the directory where you cloned or unzipped the repository.

The Braze Liquid Highlighter icon should now appear in your extensions bar!

---

## 🔧 How to Use

- **Automatic Highlighting**: The extension automatically finds and highlights Liquid on any page you visit.
- **Popup Menu**: Click the extension's icon in the toolbar to:
    - **Enable/Disable**: Turn highlighting on or off globally.
    - **Switch Modes**: Choose between "Friendly" and "Technical" display modes.
    - **Refresh**: Manually re-scan the current page for Liquid.

---

## 🏛️ Project Architecture

This extension is built with a modular architecture to ensure it is maintainable, scalable, and easy to understand.

```
.
├── manifest.json            # Core extension settings, permissions, and scripts
├── liquid-config.json       # All highlighting rules, patterns, and regex
├── popup.html               # UI for the extension popup
├── popup.js                 # Logic for the popup UI (events, storage)
├── popup.css                # Styles for the popup UI
├── styles.css               # CSS injected on web pages for highlighting
├── README.md                # You are here!
└── src/
    ├── core/                # Core orchestration and services
    │   ├── LiquidHighlighter.js # Main content script, orchestrates all modules
    │   ├── ConfigManager.js     # Loads and manages liquid-config.json
    │   ├── StorageManager.js    # Handles Chrome storage for user settings
    │   └── EventManager.js      # Manages communication between scripts
    ├── dom/
    │   └── DOMProcessor.js      # Traverses the DOM to find text to process
    ├── patterns/
    │   └── PatternMatcher.js    # Matches text against patterns from config
    └── ui/
        └── HighlightRenderer.js # Renders the styled highlights into the DOM
```

### File Breakdown

-   **`manifest.json`**: Defines the extension's name, permissions, and tells Chrome which scripts to run.
-   **`popup.html` / `popup.css` / `popup.js`**: The classic HTML/CSS/JS trio that creates the user interface for the popup menu.
-   **`styles.css`**: This stylesheet is injected directly into web pages to provide the colors and styles for the highlighted Liquid code.
-   **`liquid-config.json`**: The "brain" of the highlighter. This JSON file contains all the regular expressions, priority rules, and display templates for transforming Liquid. You can edit this file to add or change highlighting behavior without touching the core JavaScript.
-   **`src/`**: This directory contains the core logic, broken down into modules:
    -   **`LiquidHighlighter.js`**: The main script that loads on a page. It initializes and coordinates the other modules.
    -   **`DOMProcessor.js`**: Scans the web page for potential Liquid code, traversing through DOM nodes efficiently.
    -   **`PatternMatcher.js`**: Takes text found by the `DOMProcessor` and runs it against the rules in `liquid-config.json` to find matches.
    -   **`HighlightRenderer.js`**: Takes the matched patterns and wraps them in styled `<span>` elements to display them on the page.
    -   **`StorageManager.js` & `ConfigManager.js`**: Helper modules for getting user settings and loading the configuration file.
    -   **`EventManager.js`**: Manages the messages passed between the popup and the content scripts.

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, a new feature, or improving documentation, feel free to open an issue or submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

A great place to start is by enhancing the patterns in `liquid-config.json`.

---

## 📞 Contact

Have questions, feedback, or need help?

-   **Issues**: For bugs and feature requests, please [open an issue](https://github.com/TmBrnr/BrazeVision/issues) on GitHub.
-   **Author**: [Tim Boerner](https://github.com/tmbrnr) - tim.boerner@braze.com
