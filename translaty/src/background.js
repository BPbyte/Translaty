/**
 * @file background.js
 * @description Manages background tasks for the Translaty extension, including context menu setup,
 *              image fetching, and popup window creation.
 * @author [Brett Pottle]
 */

/**
 * @function setupContextMenu
 * @description Creates context menu items for text translation, image translation, and panel opening.
 * @returns {Promise<void>} Resolves when menus are created.
 */
async function setupContextMenu() {
  console.log('Setting up context menu at:', new Date().toISOString());
  chrome.contextMenus.create({
    id: "translate-text",
    title: "Translate with Translaty",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating context menu:', chrome.runtime.lastError);
    } else {
      console.log('Context menu created successfully');
    }
  });

  chrome.contextMenus.create({
    id: "open-panel",
    title: "Open Translaty Panel",
    contexts: ["page", "frame", "editable", "image", "video", "audio"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating open panel menu:', chrome.runtime.lastError);
    } else {
      console.log('Open panel menu created successfully');
    }
  });

  chrome.contextMenus.create({
    id: "translate-image",
    title: "Translate Image/Meme with Translaty",
    contexts: ["image"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating image translate menu:', chrome.runtime.lastError);
    } else {
      console.log('Image translate menu created successfully');
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, initializing context menu at:', new Date().toISOString());
  setupContextMenu();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fetch-image') {
    fetch(msg.imageUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        // Convert blob to base64 for easier transfer
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ data: reader.result });
        reader.onerror = () => sendResponse({ error: 'Failed to read image' });
        reader.readAsDataURL(blob);
      })
      .catch(e => sendResponse({ error: e.message }));
    return true; // Async response
  } else if (msg.action === 'open-popup') {
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 500,
      focused: true
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to create popup window:', chrome.runtime.lastError);
        sendResponse({ status: 'Error', error: chrome.runtime.lastError.message });
      } else {
        console.log('Popup window created');
        sendResponse({ status: 'Success' });
      }
    });
    return true; // Async response
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info, 'Tab:', tab);

  if (info.menuItemId === "translate-image" && info.srcUrl) {
    chrome.tabs.sendMessage(tab.id, { action: 'perform-image-translation', imageUrl: info.srcUrl }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Image translation message failed:', chrome.runtime.lastError);
      } else {
        console.log('Image translation request sent:', response);
      }
    });
    return;
  }

  if (info.menuItemId === "translate-text" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, { action: 'perform-translation', text: info.selectionText }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Message send failed:', chrome.runtime.lastError);
      } else {
        console.log('Translation request sent:', response);
      }
    });
  } else if (info.menuItemId === "open-panel") {
    if (info.pageUrl.endsWith('.pdf') || info.pageUrl.startsWith('file://') && info.pageUrl.endsWith('.pdf')) {
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 400,
        height: 500,
        focused: true
      });
    } else {
      chrome.tabs.sendMessage(tab.id, { action: 'showPanel' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Show panel message failed:', chrome.runtime.lastError);
        } else {
          console.log('Show panel message sent successfully:', response);
        }
      });
    }
  } else {
    console.warn('Invalid context menu click or no text selected:', info);
  }
});