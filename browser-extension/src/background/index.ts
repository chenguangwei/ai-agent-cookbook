// ============================================================
// Background Service Worker
// - Context menu registration
// - Message routing between content script and popup
// - MDX processing in background (popup-close-safe)
// ============================================================

import type { ContentType, ProcessingTask } from '../shared/types';
import { aiToMdx } from '../shared/llm';
import { getSettings } from '../shared/storage';

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

  // ============================================================
  // MDX Processing Handler (Background Task)
  // ============================================================

  if (message.type === 'START_PROCESS_MDX') {
    const { extractedData, title, contentType } = message.payload as {
      extractedData: { content: string };
      title: string;
      contentType: ContentType;
    };

    const taskId = `mdx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Send immediate response that task has started
    sendResponse({ status: 'started', taskId });

    // Start background processing
    processMdxInBackground({
      taskId,
      url: extractedData.content, // placeholder
      title,
      contentType,
      extractedData,
    });

    return true;
  }

  if (message.type === 'GET_PROCESS_STATUS') {
    chrome.storage.local.get(['processingTask', 'processingStatus'], (result) => {
      sendResponse({
        task: result.processingTask || null,
        status: result.processingStatus || null,
      });
    });
    return true;
  }
});

// ============================================================
// Background MDX Processing (Popup-Close-Safe)
// ============================================================

async function processMdxInBackground(task: {
  taskId: string;
  url: string;
  title: string;
  contentType: ContentType;
  extractedData: { content: string };
}) {
  const processingTask: ProcessingTask = {
    id: task.taskId,
    url: task.url,
    title: task.title,
    contentType: task.contentType,
    status: 'processing',
    timestamp: Date.now(),
  };

  try {
    // Save initial processing state
    await chrome.storage.local.set({
      processingTask,
      processingStatus: {
        taskId: task.taskId,
        status: 'processing',
        progress: 'Starting MDX conversion...',
      },
    });

    // Check if LLM is configured
    const settings = await getSettings();
    if (!settings.llm.enabled || !settings.llm.apiKey) {
      throw new Error('LLM not configured. Please set up your API key in Settings.');
    }

    // Update progress
    await chrome.storage.local.set({
      processingStatus: {
        taskId: task.taskId,
        status: 'processing',
        progress: 'AI is processing content...',
      },
    });

    // Call LLM to convert to MDX (this takes time)
    const mdxContent = await aiToMdx(task.extractedData.content, task.title);

    // Save completed result
    const completedTask: ProcessingTask = {
      ...processingTask,
      status: 'completed',
      result: mdxContent,
    };

    await chrome.storage.local.set({
      processingTask: completedTask,
      processingStatus: {
        taskId: task.taskId,
        status: 'completed',
        result: mdxContent,
        progress: 'Processing complete!',
      },
    });

    // Show notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'MDX Conversion Complete',
        message: `"${task.title}" has been processed.`,
      });
    }

    console.log(`[Background] MDX processing complete for: ${task.title}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Background] MDX processing failed:', errorMessage);

    const failedTask: ProcessingTask = {
      ...processingTask,
      status: 'failed',
      error: errorMessage,
    };

    await chrome.storage.local.set({
      processingTask: failedTask,
      processingStatus: {
        taskId: task.taskId,
        status: 'failed',
        error: errorMessage,
      },
    });

    // Show error notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'MDX Processing Failed',
        message: errorMessage.slice(0, 100),
      });
    }
  }
}
