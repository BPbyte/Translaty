/**
 * @file popup.js
 * @description Manages the popup interface for the Translaty extension, handling mode/language selection,
 *              translation history, and settings. Interacts with chrome.storage.local for data persistence.
 * @author [Brett Pottle]
 */

console.log('Popup script loaded at:', new Date().toISOString());

/**
 * @function initializePopup
 * @description Initializes the popup UI, populating mode/language dropdowns, setting up event listeners,
 *              and loading initial data (settings, history, latest translation).
 */
function initializePopup() {
  const panel = document.getElementById('translaty-panel');
  if (!panel) {
    console.error('Panel element not found - check popup.html');
    return;
  }

  // Check globals from modes.js
  if (!window.TRANSLATION_MODES || !window.SUPPORTED_LANGUAGES) {
    console.error('Modes not loaded - ensure modes.js is included and runs before popup.js');
    return;
  }
  console.log('TRANSLATION_MODES:', window.TRANSLATION_MODES);
  console.log('SUPPORTED_LANGUAGES:', window.SUPPORTED_LANGUAGES);

  // Populate mode select
  const modeSelect = panel.querySelector('#mode-select');
  if (modeSelect) {
    Object.values(window.TRANSLATION_MODES).forEach(mode => {
      const option = document.createElement('option');
      option.value = mode.id;
      option.textContent = mode.label;
      modeSelect.appendChild(option);
    });
    console.log('Mode select populated');
  } else {
    console.error('Mode select not found');
  }

  // Populate language select
  const langSelect = panel.querySelector('#language-select');
  if (langSelect) {
    Object.keys(window.SUPPORTED_LANGUAGES).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      langSelect.appendChild(option);
    });
    console.log('Language select populated');
  } else {
    console.error('Language select not found');
  }

  // Close button: Close window
  const closeBtn = panel.querySelector('.close');
  if (closeBtn) {
    closeBtn.onclick = () => chrome.windows.getCurrent(win => chrome.windows.remove(win.id));
    console.log('Close button set');
  }

  // Tab switching
  const tabs = panel.querySelectorAll('.tab');
  if (tabs.length > 0) {
    tabs.forEach(btn => {
      btn.onclick = () => {
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        panel.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        const targetContent = panel.querySelector(`.tab-content.${btn.dataset.tab}`);
        if (targetContent) targetContent.style.display = 'block';
        if (btn.dataset.tab === 'current') loadLatestTranslation();
        if (btn.dataset.tab === 'history') updateHistory();
        if (btn.dataset.tab === 'settings') loadSettings();
      };
    });
    console.log('Tabs set up');
  } else {
    console.error('No tabs found');
  }

  // Mode change
  if (modeSelect) {
    modeSelect.onchange = () => {
      const isCustom = modeSelect.value === 'custom';
      const customFields = panel.querySelector('#custom-fields');
      if (customFields) customFields.style.display = isCustom ? 'block' : 'none';
      chrome.storage.local.set({ translationMode: modeSelect.value });
      if (isCustom) loadCustomFields();
    };
  }

  // Language change
  if (langSelect) {
    langSelect.onchange = () => chrome.storage.local.set({ translationLanguage: langSelect.value });
  }

  // Custom fields change
  const customPrompt = panel.querySelector('#custom-prompt');
  const customTemp = panel.querySelector('#custom-temperature');
  const customTopK = panel.querySelector('#custom-topk');
  if (customPrompt && customTemp && customTopK) {
    [customPrompt, customTemp, customTopK].forEach(el => {
      el.onchange = () => {
        chrome.storage.local.set({
          customMode: {
            prompt: customPrompt.value,
            temperature: parseFloat(customTemp.value),
            topK: parseInt(customTopK.value)
          }
        });
      };
    });
  } else {
    console.error('Custom fields not found');
  }

  // Clear history
  const clearBtn = panel.querySelector('#clear-history');
  if (clearBtn) {
    clearBtn.onclick = () => {
      chrome.storage.local.set({ history: [] }, updateHistory);
    };
  }

  // Copy history
  const copyBtn = panel.querySelector('#copy-history');
  if (copyBtn) {
    copyBtn.onclick = () => {
      chrome.storage.local.get({ history: [] }, (data) => {
        const txt = data.history.map(entry => `Timestamp: ${new Date(entry.timestamp).toLocaleString()}\nMode: ${entry.mode}\nLanguage: ${entry.language}\nOriginal: ${entry.original}\nTranslation: ${entry.translation}\n---\n`).join('\n');
        navigator.clipboard.writeText(txt).then(() => {
          console.log('History copied');
        }).catch(e => console.error('Copy failed:', e));
      });
    };
  } else {
    console.error('Copy button not found');
  }

  // Load initial data
  loadSettings();
  loadLatestTranslation();
  updateHistory();

  // Default to current tab
  const currentTab = panel.querySelector('.tab[data-tab="current"]');
  if (currentTab) {
    currentTab.click();
  }

  // Listen for storage changes to update in real-time
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.history) updateHistory();
    if (changes.latestTranslation) loadLatestTranslation();
  });
}

// Feature Functions
function loadSettings() {
  chrome.storage.local.get({ translationMode: 'casual', translationLanguage: 'English', customMode: {} }, data => {
    const modeSelect = document.querySelector('#mode-select');
    if (modeSelect) modeSelect.value = data.translationMode;
    const langSelect = document.querySelector('#language-select');
    if (langSelect) langSelect.value = data.translationLanguage;
    const isCustom = data.translationMode === 'custom';
    const customFields = document.querySelector('#custom-fields');
    if (customFields) customFields.style.display = isCustom ? 'block' : 'none';
    if (isCustom) {
      const customPrompt = document.querySelector('#custom-prompt');
      if (customPrompt) customPrompt.value = data.customMode.prompt || window.TRANSLATION_MODES.CUSTOM.prompt;
      const customTemp = document.querySelector('#custom-temperature');
      if (customTemp) customTemp.value = data.customMode.temperature || window.TRANSLATION_MODES.CUSTOM.temperature;
      const customTopK = document.querySelector('#custom-topk');
      if (customTopK) customTopK.value = data.customMode.topK || window.TRANSLATION_MODES.CUSTOM.topK;
    }
  });
}

function loadCustomFields() {
  chrome.storage.local.get({ customMode: {} }, data => {
    const customPrompt = document.querySelector('#custom-prompt');
    if (customPrompt) customPrompt.value = data.customMode.prompt || window.TRANSLATION_MODES.CUSTOM.prompt;
    const customTemp = document.querySelector('#custom-temperature');
    if (customTemp) customTemp.value = data.customMode.temperature || window.TRANSLATION_MODES.CUSTOM.temperature;
    const customTopK = document.querySelector('#custom-topk');
    if (customTopK) customTopK.value = data.customMode.topK || window.TRANSLATION_MODES.CUSTOM.topK;
  });
}

function updateHistory() {
  chrome.storage.local.get({ history: [] }, data => {
    const list = document.querySelector('.history-list');
    if (list) {
      list.innerHTML = '';
      data.history.reverse().forEach(entry => {
        const li = document.createElement('li');
        const modeLabel = window.TRANSLATION_MODES[entry.mode.toUpperCase()]?.label || 'Unknown';
        li.innerHTML = `
          <small>${new Date(entry.timestamp).toLocaleString()}</small><br>
          Mode: ${modeLabel} | Language: ${entry.language}<br>
          Original: <span style="white-space: pre-wrap; word-wrap: break-word; display: inline-block;">${escapeHtml(entry.original)}</span><br>
          Translation: <span style="white-space: pre-wrap; word-wrap: break-word; display: inline-block;">${escapeHtml(entry.translation)}</span><hr>
        `;
        list.appendChild(li);
      });
      console.log('History updated');
    } else {
      console.error('History list not found');
    }
  });
}

function loadLatestTranslation() {
  chrome.storage.local.get({ latestTranslation: { original: 'No recent original text.', translation: 'No recent translation.' } }, data => {
    const originalP = document.querySelector('.current .original');
    if (originalP) originalP.textContent = data.latestTranslation.original;
    const translationP = document.querySelector('.current .translation');
    if (translationP) translationP.textContent = data.latestTranslation.translation;
    console.log('Latest translation loaded');
  });
}

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', initializePopup);
console.log('Popup init scheduled');