// ============================================================
// Background Service Worker
// - Context menu registration
// - Message routing between content script and popup
// ============================================================

import type { ContentType } from '../shared/types';

// ============================================================
// Context Menu Setup
// ============================================================

const MENU_ITEMS: { id: string; title: string; contentType: ContentType }[] = [
  { id: 'collect-tutorial', title: 'Collect as Tutorial', contentType: 'tutorial' },
  { id: 'collect-news', title: 'Collect as News', contentType: 'news' },
  { id: 'collect-showcase', title: 'Collect as Showcase', contentType: 'showcase' },
  { id: 'collect-lab', title: 'Collect as Lab', contentType: 'lab' },
];

chrome.runtime.onInstalled.addListener(() => {
  // Create parent menu
  chrome.contextMenus.create({
    id: 'agent-hub-collect',
    title: 'Agent Hub Collector',
    contexts: ['page', 'selection', 'link'],
  });

  // Create sub-menus for each content type
  for (const item of MENU_ITEMS) {
    chrome.contextMenus.create({
      id: item.id,
      parentId: 'agent-hub-collect',
      title: item.title,
      contexts: ['page', 'selection', 'link'],
    });
  }
});

// ============================================================
// Context Menu Click Handler
// ============================================================

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuItem = MENU_ITEMS.find((m) => m.id === info.menuItemId);
  if (!menuItem || !tab?.id) return;

  // Store the selected content type and any selected text for the popup to read
  await chrome.storage.local.set({
    _pendingCollect: {
      contentType: menuItem.contentType,
      selectedText: info.selectionText || '',
      linkUrl: info.linkUrl || '',
      pageUrl: info.pageUrl || '',
      timestamp: Date.now(),
    },
  });

  // Open the popup (via action)
  // Note: We can't programmatically open the popup, so we use a badge to hint the user
  chrome.action.setBadgeText({ text: '1', tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId: tab.id });

  // Alternatively, inject and extract immediately, storing result for popup
  try {
    const results = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
    if (results?.payload) {
      await chrome.storage.local.set({
        _pendingExtracted: results.payload,
      });
    }
  } catch {
    // Content script may not be injected yet
  }
});

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PENDING_COLLECT') {
    chrome.storage.local.get(['_pendingCollect', '_pendingExtracted'], (result) => {
      sendResponse({
        pendingCollect: result._pendingCollect || null,
        pendingExtracted: result._pendingExtracted || null,
      });
      // Clear pending data and badge
      chrome.storage.local.remove(['_pendingCollect', '_pendingExtracted']);
      if (sender.tab?.id) {
        chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
      }
    });
    return true;
  }

  if (message.type === 'CLEAR_BADGE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
      }
    });
  }
});
