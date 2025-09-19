// Content script for Auto Debate Buddy
let debatePopup = null;
let selectedText = "";

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startDebate") {
    selectedText = request.selectedText;
    showDebatePopup();
  }
});

// Function to create and show debate popup
function showDebatePopup() {
  // Remove existing popup if any
  if (debatePopup) {
    debatePopup.remove();
  }
  
  // Create popup container
  debatePopup = document.createElement('div');
  debatePopup.id = 'debate-buddy-popup';
  debatePopup.innerHTML = `
    <div class="debate-popup-header">
      <div class="popup-title">🗣️ Auto Debate Buddy</div>
      <button class="popup-close" onclick="closeDebatePopup()">×</button>
    </div>
    <div class="debate-popup-content">
      <div class="selected-text">
        <strong>Selected:</strong> "${selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
      </div>
      
      <div class="debate-controls">
        <div class="control-group">
          <label>Mode:</label>
          <select id="debate-mode">
            <option value="arguments">Pro vs Con Arguments</option>
            <option value="transcript">Mock Debate Transcript</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>Depth:</label>
          <select id="debate-depth">
            <option value="short">Short & Quick</option>
            <option value="detailed">Detailed Analysis</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>Tone:</label>
          <select id="debate-tone">
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
            <option value="funny">Funny</option>
          </select>
        </div>
        
        <button id="generate-debate-btn" class="generate-btn">Generate Debate</button>
      </div>
      
      <div class="debate-output" id="debate-output">
        <div class="loading-message" style="display: none;">
          <div class="spinner"></div>
          Generating balanced arguments...
        </div>
        <div class="output-content"></div>
      </div>
      
      <div class="debate-actions" id="debate-actions" style="display: none;">
        <button id="copy-debate-btn" class="action-btn">📋 Copy</button>
        <button id="share-debate-btn" class="action-btn">📤 Share</button>
        <button id="regenerate-btn" class="action-btn">🔄 Regenerate</button>
      </div>
    </div>
  `;
  
  // Add popup to page
  document.body.appendChild(debatePopup);
  
  // Add event listeners
  setupEventListeners();
  
  // Position popup
  positionPopup();
}

// Function to setup event listeners
function setupEventListeners() {
  // Generate debate button
  document.getElementById('generate-debate-btn').addEventListener('click', generateDebate);
  
  // Copy button
  document.getElementById('copy-debate-btn').addEventListener('click', copyDebate);
  
  // Share button
  document.getElementById('share-debate-btn').addEventListener('click', shareDebate);
  
  // Regenerate button
  document.getElementById('regenerate-btn').addEventListener('click', generateDebate);
  
  // Close popup when clicking outside
  debatePopup.addEventListener('click', (e) => {
    if (e.target === debatePopup) {
      closeDebatePopup();
    }
  });
}

// Function to generate debate
async function generateDebate() {
  const mode = document.getElementById('debate-mode').value;
  const depth = document.getElementById('debate-depth').value;
  const tone = document.getElementById('debate-tone').value;
  
  const settings = { mode, depth, tone };
  
  // Show loading
  document.querySelector('.loading-message').style.display = 'block';
  document.querySelector('.output-content').innerHTML = '';
  document.getElementById('debate-actions').style.display = 'none';
  
  try {
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'generateDebate',
      text: selectedText,
      settings: settings
    });
    
    // Hide loading
    document.querySelector('.loading-message').style.display = 'none';
    
    if (response.success) {
      // Display result
      document.querySelector('.output-content').innerHTML = formatDebateOutput(response.content);
      document.getElementById('debate-actions').style.display = 'flex';
    } else {
      // Show error
      document.querySelector('.output-content').innerHTML = `
        <div class="error-message">
          <strong>Error:</strong> ${response.error}
          ${response.error.includes('API key') ? '<br><em>Please set your Gemini API key in the extension popup.</em>' : ''}
        </div>
      `;
    }
  } catch (error) {
    document.querySelector('.loading-message').style.display = 'none';
    document.querySelector('.output-content').innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  }
}

// Function to format debate output
function formatDebateOutput(content) {
  // Convert markdown-style formatting to HTML
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/•/g, '•')
    .replace(/Pro:/g, '<strong class="pro-speaker">Pro:</strong>')
    .replace(/Con:/g, '<strong class="con-speaker">Con:</strong>');
}

// Function to copy debate to clipboard
async function copyDebate() {
  const content = document.querySelector('.output-content').innerText;
  const fullContent = `Selected Text: "${selectedText}"\n\n${content}\n\nGenerated by Auto Debate Buddy Chrome Extension`;
  
  try {
    await navigator.clipboard.writeText(fullContent);
    
    // Show success feedback
    const copyBtn = document.getElementById('copy-debate-btn');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '✅ Copied!';
    copyBtn.style.background = '#4CAF50';
    
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
      copyBtn.style.background = '';
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
    alert('Failed to copy to clipboard');
  }
}

// Function to share debate
function shareDebate() {
  const content = document.querySelector('.output-content').innerText;
  const shareText = `Check out this balanced debate analysis:\n\n"${selectedText}"\n\n${content}\n\n#AutoDebateBuddy #CriticalThinking`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Auto Debate Buddy Analysis',
      text: shareText
    });
  } else {
    // Fallback: copy to clipboard
    copyDebate();
  }
}

// Function to position popup
function positionPopup() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    debatePopup.style.position = 'fixed';
    debatePopup.style.left = Math.min(rect.left, window.innerWidth - 420) + 'px';
    debatePopup.style.top = Math.min(rect.bottom + 10, window.innerHeight - 500) + 'px';
    debatePopup.style.zIndex = '999999';
  }
}

// Function to close popup
function closeDebatePopup() {
  if (debatePopup) {
    debatePopup.remove();
    debatePopup = null;
  }
}

// Make closeDebatePopup available globally
window.closeDebatePopup = closeDebatePopup;