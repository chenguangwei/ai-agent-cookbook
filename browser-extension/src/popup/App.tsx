import React, { useState } from 'react';
import { CollectPage } from './pages/CollectPage';
import { HistoryPage } from './pages/HistoryPage';
import { DraftsPage } from './pages/DraftsPage';
import type { Draft } from '../shared/types';

type Tab = 'collect' | 'drafts' | 'history';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'collect', label: 'Collect', icon: '📥' },
  { id: 'drafts', label: 'Drafts', icon: '📝' },
  { id: 'history', label: 'History', icon: '📋' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('collect');

  function handleLoadDraft(draft: Draft) {
    // Switch to collect tab — for now, just switch tab
    // TODO: pass draft data to CollectPage
    setActiveTab('collect');
  }

  function handleOpenSettings() {
    chrome.runtime.openOptionsPage();
  }

  return (
    <div className="w-popup h-popup flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h1 className="text-sm font-bold text-gray-900">Agent Hub Collector</h1>
        </div>
        <button
          onClick={handleOpenSettings}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors
              ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'collect' && <CollectPage />}
        {activeTab === 'drafts' && <DraftsPage onLoadDraft={handleLoadDraft} />}
        {activeTab === 'history' && <HistoryPage />}
      </div>
    </div>
  );
}
