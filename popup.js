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
      // Get status from active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
      
      this.isEnabled = response.enabled;
      this.currentMode = response.mode || 'friendly';
    } catch (error) {
      console.log('Could not get status from content script:', error);
      
      // Fallback to storage
      try {
        const result = await chrome.storage.sync.get(['liquidHighlighterEnabled', 'liquidDisplayMode']);
        this.isEnabled = result.liquidHighlighterEnabled !== false;
        this.currentMode = result.liquidDisplayMode || 'friendly';
      } catch (storageError) {
        console.log('Could not access storage:', storageError);
        this.isEnabled = false;
        this.currentMode = 'friendly';
      }
    }
  }

  setupEventListeners() {
    // Toggle switch
    const toggleSwitch = document.getElementById('toggleSwitch');
    toggleSwitch.addEventListener('click', () => {
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
    this.isEnabled = !this.isEnabled;
    
    try {
      // Send message to all frames
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggle', 
        enabled: this.isEnabled 
      });
      
      // Also save to storage for persistence
      await chrome.storage.sync.set({ liquidHighlighterEnabled: this.isEnabled });
      
      this.updateUI();
    } catch (error) {
      console.error('Failed to toggle highlighting:', error);
      // Revert on error
      this.isEnabled = !this.isEnabled;
      this.updateUI();
    }
  }

  async changeMode(mode) {
    if (mode === this.currentMode) return;
    
    this.currentMode = mode;
    
    try {
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'changeMode', 
        mode: mode 
      });
      
      // Save to storage
      await chrome.storage.sync.set({ liquidDisplayMode: mode });
      
      this.updateUI();
    } catch (error) {
      console.error('Failed to change mode:', error);
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