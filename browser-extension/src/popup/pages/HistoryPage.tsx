import React, { useState, useEffect } from 'react';
import type { HistoryItem } from '../../shared/types';
import { getHistory, clearHistory } from '../../shared/storage';
import { StatusBadge } from '../components/StatusBadge';
import { CONTENT_TYPES } from '../../shared/constants';

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  async function handleClear() {
    if (confirm('Clear all history?')) {
      await clearHistory();
      setHistory([]);
    }
  }

  const getIcon = (type: string) =>
    CONTENT_TYPES.find((t) => t.id === type)?.icon || '📄';

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <span className="text-3xl mb-2">📋</span>
        <p className="text-sm">No collection history yet</p>
        <p className="text-xs mt-1">Collected items will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs text-gray-500">{history.length} items</span>
        <button className="text-xs text-red-500 hover:text-red-700" onClick={handleClear}>
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50"
          >
            <span className="text-sm mt-0.5">{getIcon(item.contentType)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">{item.title}</h4>
              <p className="text-xs text-gray-400 truncate mt-0.5">{item.sourceUrl}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={item.status} />
                <span className="text-xs text-gray-400">
                  {new Date(item.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
