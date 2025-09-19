// Popup script for Auto Debate Buddy
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadStats();
    setupEventListeners();
  });
  
  // Load saved settings
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'geminiApiKey', 
        'autoCopy', 
        'showNotifications'
      ]);
      
      if (result.geminiApiKey) {
        document.getElementById('api-key').value = result.geminiApiKey;
      }
      
      document.getElementById('auto-copy').checked = result.autoCopy !== false;
      document.getElementById('show-notifications').checked = result.showNotifications !== false;
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  // Load usage statistics
  async function loadStats() {
    try {
      const result = await chrome.storage.local.get(['totalDebates', 'todayDebates', 'lastUsedDate']);
      
      const today = new Date().toDateString();
      const lastUsed = result.lastUsedDate || '';
      
      // Reset today's count if it's a new day
      const todayCount = (lastUsed === today) ? (result.todayDebates || 0) : 0;
      
      document.getElementById('total-debates').textContent = result.totalDebates || 0;
      document.getElementById('today-debates').textContent = todayCount;
      
      // Update storage if new day
      if (lastUsed !== today) {
        await chrome.storage.local.set({
          todayDebates: 0,
          lastUsedDate: today
        });
      }
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // API key visibility toggle
    document.getElementById('toggle-visibility').addEventListener('click', () => {
      const input = document.getElementById('api-key');
      const btn = document.getElementById('toggle-visibility');
      
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
    
    // Save settings button
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Clear data link
    document.getElementById('clear-data').addEventListener('click', clearAllData);
    
    // Auto-save API key on input
    document.getElementById('api-key').addEventListener('input', debounce(saveApiKey, 1000));
  }
  
  // Save all settings
  async function saveSettings() {
    try {
      const apiKey = document.getElementById('api-key').value.trim();
      const autoCopy = document.getElementById('auto-copy').checked;
      const showNotifications = document.getElementById('show-notifications').checked;
      
      // Validate API key format (basic check)
      if (apiKey && !apiKey.startsWith('AIza')) {
        showNotification('Invalid API key format. Should start with "AIza"', 'error');
        return;
      }
      
      await chrome.storage.sync.set({
        geminiApiKey: apiKey,
        autoCopy: autoCopy,
        showNotifications: showNotifications
      });
      
      showNotification('Settings saved successfully! 🎉');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Failed to save settings', 'error');
    }
  }
  
  // Save API key separately (for auto-save)
  async function saveApiKey() {
    try {
      const apiKey = document.getElementById('api-key').value.trim();
      
      if (apiKey) {
        await chrome.storage.sync.set({ geminiApiKey: apiKey });
        console.log('API key auto-saved');
      }
    } catch (error) {
      console.error('Error auto-saving API key:', error);
    }
  }
  
  // Clear all data
  async function clearAllData() {
    if (confirm('Are you sure you want to clear all usage data? This cannot be undone.')) {
      try {
        await chrome.storage.local.clear();
        await loadStats();
        showNotification('Usage data cleared successfully');
      } catch (error) {
        console.error('Error clearing data:', error);
        showNotification('Failed to clear data', 'error');
      }
    }
  }
  
  // Show notification
  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
  
  // Debounce function for auto-save
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Update usage statistics (called from background script)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStats') {
      loadStats();
    }
  });