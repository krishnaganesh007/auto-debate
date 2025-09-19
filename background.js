// Background script for ArgueWise
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu item
    chrome.contextMenus.create({
      id: "debateWithAI",
      title: "🗣️ Debate with AI",
      contexts: ["selection"]
    });
  
    console.log("ArgueWise installed successfully!");
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Context menu clicked:", info);
    
    if (info.menuItemId === "debateWithAI" && info.selectionText) {
      console.log("Sending message to content script with text:", info.selectionText);
      // Send selected text to content script
      chrome.tabs.sendMessage(tab.id, {
        action: "startDebate",
        selectedText: info.selectionText
      });
    }
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateDebate") {
      generateDebateArguments(request.text, request.settings)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
    }
  });
  
  // Function to generate debate arguments using AI API
  async function generateDebateArguments(text, settings) {
    try {
      // Get API key from storage
      const result = await chrome.storage.sync.get(['geminiApiKey']);
      const apiKey = result.geminiApiKey;
  
      if (!apiKey) {
        throw new Error("Please set your Gemini API key in the extension popup");
      }
  
      const prompt = createPrompt(text, settings);
  
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });
  
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json();
  
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }
  
      const generatedText = data.candidates[0].content.parts[0].text;
  
      return {
        success: true,
        content: generatedText,
        originalText: text
      };
  
    } catch (error) {
      console.error('Error generating debate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Function to create appropriate prompt based on settings
  function createPrompt(text, settings) {
    const tone = settings.tone || 'formal';
    const depth = settings.depth || 'short';
    const mode = settings.mode || 'arguments';
  
    let basePrompt = `Analyze this statement: "${text}"\n\n`;
  
    if (mode === 'transcript') {
      basePrompt += `Create a ${depth === 'detailed' ? 'detailed' : 'concise'} mock debate transcript between two characters - "Pro" and "Con" - discussing this statement. `;
      basePrompt += `Use a ${tone} tone. Format it as a dialogue with character names followed by colons.\n`;
      basePrompt += `Pro should argue in favor of the statement, Con should argue against it. `;
      basePrompt += `Make it engaging and ${tone === 'funny' ? 'humorous' : tone === 'casual' ? 'conversational' : 'professional'}.`;
    } else {
      basePrompt += `Generate ${depth === 'detailed' ? '4-5' : '3-4'} bullet points supporting this statement (PRO) and ${depth === 'detailed' ? '4-5' : '3-4'} bullet points arguing against it (CON).\n`;
      basePrompt += `Use a ${tone} tone and make arguments ${tone === 'funny' ? 'witty and humorous' : tone === 'casual' ? 'easy to understand and conversational' : 'professional and well-reasoned'}.\n\n`;
      basePrompt += `Format the response as:\n**PRO Arguments:**\n• [argument 1]\n• [argument 2]\n...\n\n**CON Arguments:**\n• [argument 1]\n• [argument 2]\n...`;
    }
  
    return basePrompt;
  }
  