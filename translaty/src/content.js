/**
 * @file content.js
 * @description Core translation logic for the Translaty extension, running in web page context.
 *              Handles text and image translations using the .prompt API, manages AI sessions,
 *              and updates the panel with results. Includes debouncing for performance.
 * @author [Brett Pottle]
 */

console.log('Content script loaded on:', window.location.href, 'at:', new Date().toISOString());

// Global session for reuse (performance) - text-only
let aiSession = null;

// Debounce mechanism
const lastMessages = new Map();
const DEBOUNCE_MS = 1000;

// Initialize panel on DOM ready
function tryInitializePanel() {
  console.log('Trying to initialize panel...');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.initializePanel) {
        window.initializePanel();
        console.log('Panel initialized after DOMContentLoaded');
      }
    });
  } else {
    if (window.initializePanel) {
      window.initializePanel();
      console.log('Panel initialized');
    }
  }
}

try {
  tryInitializePanel();
} catch (e) {
  console.error('Error initializing panel:', e);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Message received in content.js:', msg);
  try {
    const key = `${msg.action}:${msg.text || msg.imageUrl || ''}`;
    const now = Date.now();
    if (lastMessages.has(key) && now - lastMessages.get(key) < DEBOUNCE_MS) {
      console.log('Ignoring duplicate:', key);
      sendResponse({ status: 'Ignored duplicate' });
      return true;
    }
    lastMessages.set(key, now);

    if (msg.action === 'perform-translation') {
      performTranslation(msg.text).then(() => sendResponse({ status: 'Done' }));
      return true; 
    } else if (msg.action === 'perform-image-translation') {
      performImageTranslation(msg.imageUrl).then(() => sendResponse({ status: 'Done' }));
      return true; 
    } else if (msg.action === 'showPanel') {
      if (window.updatePanel) {
        window.updatePanel({});
        if (window.loadSettings) window.loadSettings();
        sendResponse({ status: 'Panel shown' });
      } else {
        sendResponse({ status: 'Error', error: 'Panel functions not available' });
      }
    } else {
      console.warn('Unknown action:', msg.action);
      sendResponse({ status: 'Unknown action' });
    }
  } catch (e) {
    console.error('Message handling error:', e);
    sendResponse({ status: 'Error', error: e.message });
  }
  return true;
});

/**
 * @function performTranslation
 * @description Translates selected text using the specified mode and language.
 * @param {string} text - The text to translate.
 * @returns {Promise<void>} Updates the panel with the translation result or error.
 */
async function performTranslation(text) {
  try {
    if (!text) throw new Error('No text selected');
    if (text.length > 4000) throw new Error('Text too long (max 4000 chars)');

    window.toggleLoading(true);

    const availability = await LanguageModel.availability();
    if (availability === 'unavailable') throw new Error('Gemini Nano unavailable');

    const { translationMode = 'casual', translationLanguage = 'English', customMode = {} } = await chrome.storage.local.get(['translationMode', 'translationLanguage', 'customMode']);
    let mode = window.TRANSLATION_MODES[translationMode.toUpperCase()] || window.TRANSLATION_MODES.CASUAL;
    if (mode.id === 'custom') {
      mode = { ...mode, ...customMode };
    }

    const langCode = window.SUPPORTED_LANGUAGES[translationLanguage] || 'en';

    const params = await LanguageModel.params();
    const sessionOptions = {
      temperature: mode.temperature || params.defaultTemperature,
      topK: mode.topK || params.defaultTopK,
      expectedOutputs: [{ type: "text", languages: [langCode] }],
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => console.log(`Download: ${e.loaded * 100}%`));
      }
    };

    if (!aiSession) {
      aiSession = await LanguageModel.create(sessionOptions);
    }

    const fullPrompt = mode.prompt.replace('{language}', translationLanguage) + text;
    const result = await aiSession.prompt(fullPrompt);

    // Save history
    const historyEntry = { original: text, translation: result, timestamp: Date.now(), mode: mode.id, language: translationLanguage };
    const { history = [] } = await chrome.storage.local.get({ history: [] });
    history.push(historyEntry);
    if (history.length > 50) history.shift();
    chrome.storage.local.set({ history });

    // Save latest translation for popup
    chrome.storage.local.set({ latestTranslation: { original: text, translation: result } });

    window.updatePanel({ translation: result, original: text });
  } catch (e) {
    console.error('Translation error:', e);
    window.updatePanel({ error: e.message });
  } finally {
    window.toggleLoading(false);
  }
}

/**
 * @function performImageTranslation
 * @description Extracts text from an image and translates it using the specified mode and language.
 * @param {string} imageUrl - The URL of the image to process.
 * @returns {Promise<void>} Updates the panel with the translation result or error.
 */
async function performImageTranslation(imageUrl) {
  try {
    console.log('Starting image translation for URL:', imageUrl);
    window.toggleLoading(true);
    const { translationMode = 'casual', translationLanguage = 'English', customMode = {} } = await chrome.storage.local.get(['translationMode', 'translationLanguage', 'customMode']);
    let mode = window.TRANSLATION_MODES[translationMode.toUpperCase()] || window.TRANSLATION_MODES.CASUAL;
    if (mode.id === 'custom') mode = { ...mode, ...customMode };

    const langCode = window.SUPPORTED_LANGUAGES[translationLanguage] || 'en';

    // Check availability
    const availability = await LanguageModel.availability();
    if (availability === 'unavailable') throw new Error('Gemini Nano unavailable');

    // Fetch image via background script to bypass CORS
    const imageResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetch-image', imageUrl }, response => {
        if (response.error) reject(new Error(response.error));
        else resolve(response.data);
      });
    });
    const responseBlob = await fetch(imageResponse).then(res => res.blob());
    const imageFile = new File([responseBlob], 'image.png', { type: responseBlob.type || 'image/png' });

  
    const visionSession = await LanguageModel.create({
      expectedInputs: [{ type: 'image' }],
      expectedOutputs: [{ type: 'text', languages: [langCode] }],
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => console.log(`Download: ${e.loaded * 100}%`));
      }
    });

    // Extract text
    const extractionPrompt = `Extract all text from this image, including any meme captions, as plain text. Return only the text, no commentary, no JSON, no extra formatting.`;
    const promptInput = [
      {
        role: 'user',
        content: [
          { type: 'text', value: extractionPrompt },
          { type: 'image', value: imageFile }
        ]
      }
    ];
    const extractedText = await visionSession.prompt(promptInput);
    visionSession.destroy();

    if (!extractedText.trim()) throw new Error('No text detected in image');

    // Translate
    const params = await LanguageModel.params();
    if (!aiSession) {
      aiSession = await LanguageModel.create({
        temperature: mode.temperature || params.defaultTemperature,
        topK: mode.topK || params.defaultTopK,
        expectedOutputs: [{ type: 'text', languages: [langCode] }]
      });
    }
    const fullPrompt = mode.prompt.replace('{language}', translationLanguage) + extractedText;
    const translation = await aiSession.prompt(fullPrompt);

    // Save and update
    const historyEntry = {
      original: extractedText,
      translation,
      timestamp: Date.now(),
      mode: mode.id,
      language: translationLanguage,
      type: 'image',
      imageUrl,
      imageDataUrl: imageResponse
    };
    const { history = [] } = await chrome.storage.local.get({ history: [] });
    history.push(historyEntry);
    if (history.length > 10 && historyEntry.type === 'image') history.shift();
    chrome.storage.local.set({ history });

    chrome.storage.local.set({ latestTranslation: { original: extractedText, translation, imageUrl, imageDataUrl: imageResponse } });

    window.updatePanel({ translation, original: extractedText, imageUrl, imageDataUrl: imageResponse });
  } catch (e) {
    console.error('Image translation error:', e);
    window.updatePanel({ error: e.message });
  } finally {
    window.toggleLoading(false);
  }

}
