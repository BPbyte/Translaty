/**
 * @file panel.js
 * @description Manages the floating panel UI for the Translaty extension, displayed on web pages.
 *              Handles translation display, history, settings, and panel interactions (drag, resize, collapse).
 * @author [Brett Pottle]
 */


console.log('Panel script loaded on:', window.location.href, 'at:', new Date().toISOString());

let panel;
let isDragging = false;
let isResizing = false;
let dragOffsetX, dragOffsetY;
let resizeStartX, resizeStartY;
let originalHeight = '400px';
let originalWidth = '350px';

async function loadPanelTemplate() {
  try {
    const htmlUrl = chrome.runtime.getURL('panel.html');
    const cssUrl = chrome.runtime.getURL('panel.css');
    const [htmlResponse, cssResponse] = await Promise.all([fetch(htmlUrl), fetch(cssUrl)]);
    const [html, css] = await Promise.all([htmlResponse.text(), cssResponse.text()]);
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return html;
  } catch (e) {
    console.error('Error loading panel template:', e);
    return '<div>Error loading panel</div>';
  }
}

/**
 * @function initializePanel
 * @description Initializes the floating panel, loading its HTML/CSS and setting up event listeners.
 * @returns {Promise<void>} Resolves when the panel is appended to the DOM.
 */
async function initializePanel() {
  if (document.querySelector('#translaty-panel')) return;

  try {
    const template = await loadPanelTemplate();
    panel = document.createElement('div');
    panel.id = 'translaty-panel';
    panel.innerHTML = template;

    // Append with fallback for PDFs
    try {
      document.body.appendChild(panel);
      console.log('Panel appended to body');
    } catch (e) {
      try {
        document.documentElement.appendChild(panel);
        console.log('Panel appended to documentElement (PDF fallback)');
      } catch (fallbackE) {
        console.error('Failed to append panel even in fallback:', fallbackE);
        return;
      }
    }

    // Position
    panel.style.position = 'fixed';
    panel.style.width = originalWidth;
    panel.style.height = originalHeight;
    panel.style.left = `${window.innerWidth - 370}px`;
    panel.style.top = `${window.innerHeight - 420}px`;
    panel.style.display = 'none';

    // Apply browser theme colors
    const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff';
    const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color') || '#ffffff';
    panel.style.setProperty('--theme-color', themeColor);
    panel.style.setProperty('--background-color', backgroundColor);

    // Debug: Check globals before using
    console.log('TRANSLATION_MODES in init:', window.TRANSLATION_MODES);
    if (!window.TRANSLATION_MODES) {
      throw new Error('TRANSLATION_MODES not defined - check modes.js load');
    }

    // Populate mode select
    const modeSelect = panel.querySelector('#mode-select');
    Object.values(window.TRANSLATION_MODES).forEach(mode => {
      const option = document.createElement('option');
      option.value = mode.id;
      option.textContent = mode.label;
      modeSelect.appendChild(option);
    });

    // Populate language select
    const langSelect = panel.querySelector('#language-select');
    Object.keys(window.SUPPORTED_LANGUAGES).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      langSelect.appendChild(option);
    });

    // Event listeners
    const header = panel.querySelector('.header');
    header.onmousedown = dragStart;

    const resizeHandle = panel.querySelector('.resize-handle');
    resizeHandle.onmousedown = resizeStart;

    panel.querySelector('.minimize').onclick = toggleCollapse;
    panel.querySelector('.close').onclick = () => { panel.style.display = 'none'; };

    // Popup button
    const popupBtn = panel.querySelector('#open-popup');
    if (popupBtn) {
      popupBtn.onclick = () => {
        chrome.runtime.sendMessage({ action: 'open-popup' }, response => {
          if (chrome.runtime.lastError) {
            console.error('Failed to send open-popup message:', chrome.runtime.lastError);
          } else {
            console.log('Open popup request sent:', response);
          }
        });
      };
    }

    // Tab switching
    panel.querySelectorAll('.tab').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        panel.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        panel.querySelector(`.${btn.dataset.tab}`).style.display = 'block';
        if (btn.dataset.tab === 'history') updateHistory();
        if (btn.dataset.tab === 'settings') loadSettings();
      };
    });

    // Mode change: Show/hide custom fields, save
    modeSelect.onchange = () => {
      const isCustom = modeSelect.value === 'custom';
      panel.querySelector('#custom-fields').style.display = isCustom ? 'block' : 'none';
      chrome.storage.local.set({ translationMode: modeSelect.value });
      if (isCustom) loadCustomFields();
    };

    // Language change: Save
    langSelect.onchange = () => chrome.storage.local.set({ translationLanguage: langSelect.value });

    // Custom fields change: Save
    const customPrompt = panel.querySelector('#custom-prompt');
    const customTemp = panel.querySelector('#custom-temperature');
    const customTopK = panel.querySelector('#custom-topk');
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

    // Clear history
    panel.querySelector('#clear-history').onclick = () => {
      chrome.storage.local.set({ history: [] }, updateHistory);
    };

    // Copy history to clipboard
    panel.querySelector('#copy-history').onclick = () => {
      chrome.storage.local.get({ history: [] }, (data) => {
        const txt = data.history.map(entry => `Timestamp: ${new Date(entry.timestamp).toLocaleString()}\nMode: ${entry.mode}\nLanguage: ${entry.language}\nOriginal: ${entry.original}\nTranslation: ${entry.translation}\n---\n`).join('\n');
        navigator.clipboard.writeText(txt).then(() => {
          console.log('History copied to clipboard');
        }).catch(e => console.error('Copy failed:', e));
      });
    };

  } catch (e) {
    console.error('Error creating panel:', e);
  }
}

// Feature Functions
function loadSettings() {
  chrome.storage.local.get({ translationMode: 'casual', translationLanguage: 'English', customMode: {} }, data => {
    panel.querySelector('#mode-select').value = data.translationMode;
    panel.querySelector('#language-select').value = data.translationLanguage;
    const isCustom = data.translationMode === 'custom';
    panel.querySelector('#custom-fields').style.display = isCustom ? 'block' : 'none';
    if (isCustom) {
      panel.querySelector('#custom-prompt').value = data.customMode.prompt || window.TRANSLATION_MODES.CUSTOM.prompt;
      panel.querySelector('#custom-temperature').value = data.customMode.temperature || window.TRANSLATION_MODES.CUSTOM.temperature;
      panel.querySelector('#custom-topk').value = data.customMode.topK || window.TRANSLATION_MODES.CUSTOM.topK;
    }
  });
}

function loadCustomFields() {
  chrome.storage.local.get({ customMode: {} }, data => {
    panel.querySelector('#custom-prompt').value = data.customMode.prompt || window.TRANSLATION_MODES.CUSTOM.prompt;
    panel.querySelector('#custom-temperature').value = data.customMode.temperature || window.TRANSLATION_MODES.CUSTOM.temperature;
    panel.querySelector('#custom-topk').value = data.customMode.topK || window.TRANSLATION_MODES.CUSTOM.topK;
  });
}

// Interaction Functions
function dragStart(e) {
  if (e.target.closest('.minimize, .close, .resize-handle, .loading-indicator')) return;
  isDragging = true;
  dragOffsetX = e.clientX - panel.getBoundingClientRect().left;
  dragOffsetY = e.clientY - panel.getBoundingClientRect().top;
  document.onmousemove = dragPanel;
  document.onmouseup = () => { isDragging = false; document.onmousemove = document.onmouseup = null; };
}

function dragPanel(e) {
  if (isDragging) {
    panel.style.left = `${e.clientX - dragOffsetX}px`;
    panel.style.top = `${e.clientY - dragOffsetY}px`;
  }
}

function resizeStart(e) {
  isResizing = true;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  const startWidth = panel.offsetWidth;
  const startHeight = panel.offsetHeight;
  const startLeft = panel.getBoundingClientRect().left;
  const startTop = panel.getBoundingClientRect().top;
  document.onmousemove = e => {
    const deltaX = resizeStartX - e.clientX;
    const deltaY = resizeStartY - e.clientY;
    const newWidth = Math.max(200, startWidth + deltaX);
    const newHeight = Math.max(150, startHeight + deltaY);
    panel.style.width = `${newWidth}px`;
    panel.style.height = `${newHeight}px`;
    panel.style.left = `${startLeft - (newWidth - startWidth)}px`;
    panel.style.top = `${startTop - (newHeight - startHeight)}px`;
  };
  document.onmouseup = () => { isResizing = false; document.onmousemove = document.onmouseup = null; };
  e.preventDefault();
}

function toggleCollapse() {
  const content = panel.querySelector('.content');
  const tabs = panel.querySelector('.tabs');
  const btn = panel.querySelector('.minimize');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    tabs.style.display = 'flex';
    btn.textContent = '-';
    panel.style.height = originalHeight;
    panel.style.width = originalWidth;
  } else {
    originalHeight = panel.style.height;
    originalWidth = panel.style.width;
    content.style.display = 'none';
    tabs.style.display = 'none';
    btn.textContent = '+';
    panel.style.height = 'auto';
    panel.style.width = 'auto';
  }
}

function toggleLoading(isLoading) {
  const indicator = panel?.querySelector('.loading-indicator');
  if (indicator) {
    indicator.style.display = isLoading ? 'inline-block' : 'none';
  }
}

function updateHistory() {
  chrome.storage.local.get({ history: [] }, data => {
    const list = panel.querySelector('.history-list');
    if (!list) return;
    list.innerHTML = '';
    data.history.reverse().forEach(entry => {
      const li = document.createElement('li');
      const modeLabel = window.TRANSLATION_MODES[entry.mode.toUpperCase()]?.label || 'Unknown';
      li.innerHTML = `
        <small>${new Date(entry.timestamp).toLocaleString()}</small><br>
        Mode: ${modeLabel} | Language: ${entry.language}<br>
        ${entry.imageUrl ? `<img src="${entry.imageUrl}" style="max-width: 100px; margin-bottom: 10px;"><br>` : ''}
        Original: <span style="white-space: pre-wrap; word-wrap: break-word; display: inline-block;">${escapeHtml(entry.original)}</span><br>
        Translation: <span style="white-space: pre-wrap; word-wrap: break-word; display: inline-block;">${escapeHtml(entry.translation)}</span><hr>
      `;
      list.appendChild(li);
    });
  });
}

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/**
 * @function updatePanel
 * @description Updates the panel with translation results, errors, or images.
 * @param {Object} data - Contains translation, original text, imageUrl, or error.
 */
function updatePanel(data) {
  if (!panel) {
    initializePanel();
  }
  if (!panel) return;

  panel.style.display = 'block';

  const clickTab = (selector) => {
    const tab = panel.querySelector(selector);
    if (tab) tab.click();
  };

  if (data.imageUrl) {
    panel.querySelector('.original-image').src = data.imageDataUrl || data.imageUrl;
    panel.querySelector('.translation').textContent = data.translation || 'No translation available';
  } else {
    panel.querySelector('.original-image').style.display = 'none';
  }

  if (data.translation) {
    const currentEl = panel.querySelector('.current');
    const transEl = panel.querySelector('.current .translation');
    const originalEl = panel.querySelector('.current .original');

    if (transEl) {
      transEl.textContent = data.translation;
    } else if (currentEl) {
      currentEl.innerHTML = `<h3>Translation</h3><p>${escapeHtml(data.translation)}</p>`;
    } else {
      panel.innerHTML += `<div style="padding: 15px;"><h3>Translation</h3><p>${escapeHtml(data.translation)}</p></div>`;
    }

    if (data.original && originalEl) {
      originalEl.textContent = data.original;
    }

    clickTab('.tab[data-tab="current"]');
  } else if (data.error) {
    const currentEl = panel.querySelector('.current');

    if (currentEl) {
      currentEl.innerHTML = `<h3>Error</h3><p>${escapeHtml(data.error)}</p>`;
    } else {
      panel.innerHTML = `<div style="padding: 15px; color: red;"><h3>Error</h3><p>${escapeHtml(data.error)}</p></div>`;
    }

    clickTab('.tab[data-tab="current"]');
  } else {
    clickTab('.tab[data-tab="settings"]');
  }

  updateHistory();
}

// Expose functions
window.initializePanel = initializePanel;
window.toggleLoading = toggleLoading;
window.updatePanel = updatePanel;
window.updateHistory = updateHistory;
window.loadSettings = loadSettings;
window.toggleCollapse = toggleCollapse;