// Liquid Syntax Highlighter Popup Script

class PopupController {
  constructor() {
    this.isEnabled = false;
    this.currentMode = 'friendly';
    this.modeExamples = {
      friendly: {
        text: 'Loop through user data (show 3 products)',
        description: 'Readable with some technical context'
      },
      technical: {
        text: 'for product in custom_attribute.cart.Products limit:3',
        description: 'Clean original syntax for developers'
      }
    };
    this.init();
  }

  async init() {
    await this.loadCurrentState();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadCurrentState() {
    try {
      // First try to get from storage (most reliable)
      const result = await chrome.storage.sync.get(['liquidHighlighterEnabled', 'liquidDisplayMode']);
      
      // Set defaults if not found
      this.isEnabled = result.liquidHighlighterEnabled !== false; // default to true
      this.currentMode = result.liquidDisplayMode || 'friendly';
      
      // Try to get real-time status from content script as secondary check
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        
        if (response && typeof response.enabled === 'boolean') {
          this.isEnabled = response.enabled;
          this.currentMode = response.mode || this.currentMode;
        }
      } catch (contentScriptError) {
        // Content script not available or not responding - use storage values
        console.log('Content script not available, using storage values');
      }
      
    } catch (error) {
      console.error('Failed to load state:', error);
      // Use safe defaults
      this.isEnabled = true;
      this.currentMode = 'friendly';
    }
  }

  setupEventListeners() {
    // Toggle switch
    const toggleSwitch = document.getElementById('toggleSwitch');
    toggleSwitch.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleHighlighting();
    });

    // Mode selector
    const modeOptions = document.querySelectorAll('.mode-option');
    modeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const mode = option.dataset.mode;
        this.changeMode(mode);
      });
    });

    // Refresh button
    const refreshButton = document.getElementById('refreshButton');
    refreshButton.addEventListener('click', () => {
      this.refresh();
    });
  }

  async toggleHighlighting() {
    const newState = !this.isEnabled;
    
    try {
      // Update storage first
      await chrome.storage.sync.set({ liquidHighlighterEnabled: newState });
      
      // Then try to notify content script
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'toggle', 
          enabled: newState 
        });
      } catch (contentScriptError) {
        console.log('Could not notify content script:', contentScriptError);
        // This is okay - the content script will read from storage when needed
      }
      
      // Update local state and UI
      this.isEnabled = newState;
      this.updateUI();
      
    } catch (error) {
      console.error('Failed to toggle highlighting:', error);
      // Show error feedback
      this.showError('Failed to toggle highlighting');
    }
  }

  async changeMode(mode) {
    if (mode === this.currentMode) return;
    
    const oldMode = this.currentMode;
    this.currentMode = mode;
    
    try {
      // Update storage first
      await chrome.storage.sync.set({ liquidDisplayMode: mode });
      
      // Try to notify content script
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'changeMode', 
          mode: mode 
        });
      } catch (contentScriptError) {
        console.log('Could not notify content script:', contentScriptError);
      }
      
      this.updateUI();
      
    } catch (error) {
      console.error('Failed to change mode:', error);
      // Revert on error
      this.currentMode = oldMode;
      this.updateUI();
    }
  }

  async refresh() {
    const refreshButton = document.getElementById('refreshButton');
    const refreshSpan = refreshButton.querySelector('span');
    
    try {
      refreshButton.classList.add('loading');
      refreshSpan.textContent = 'Refreshing...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'refresh' });
      
      // Brief success feedback
      refreshSpan.textContent = 'Done!';
      setTimeout(() => {
        refreshSpan.textContent = 'Refresh';
        refreshButton.classList.remove('loading');
      }, 500);
      
    } catch (error) {
      console.error('Failed to refresh:', error);
      refreshSpan.textContent = 'Error';
      setTimeout(() => {
        refreshSpan.textContent = 'Refresh';
        refreshButton.classList.remove('loading');
      }, 1000);
    }
  }

  showError(message) {
    const statusText = document.getElementById('statusText');
    const originalText = statusText.textContent;
    statusText.textContent = message;
    statusText.style.color = '#dc2626';
    
    setTimeout(() => {
      statusText.textContent = originalText;
      statusText.style.color = '';
    }, 2000);
  }

  updateUI() {
    this.updateToggleSwitch();
    this.updateStatusText();
    this.updateModeSelector();
    this.updateModeExample();
  }

  updateToggleSwitch() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    if (this.isEnabled) {
      toggleSwitch.classList.add('active');
    } else {
      toggleSwitch.classList.remove('active');
    }
  }

  updateStatusText() {
    const statusText = document.getElementById('statusText');
    if (this.isEnabled) {
      statusText.textContent = 'Active - transforming liquid syntax';
    } else {
      statusText.textContent = 'Disabled - click to enable';
    }
  }

  updateModeSelector() {
    const modeOptions = document.querySelectorAll('.mode-option');
    modeOptions.forEach(option => {
      if (option.dataset.mode === this.currentMode) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  updateModeExample() {
    const modeExample = document.getElementById('modeExample');
    const example = this.modeExamples[this.currentMode];
    
    if (example) {
      modeExample.textContent = example.text;
      modeExample.title = example.description;
    }
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}

// Handle extension installation or update
chrome.runtime.onInstalled?.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({ 
    liquidHighlighterEnabled: true,
    liquidDisplayMode: 'friendly'
  });
}); 