import React, { useState, useEffect } from 'react';
import type { Draft, ContentType } from '../../shared/types';
import { getDrafts, deleteDraft } from '../../shared/storage';
import { StatusBadge } from '../components/StatusBadge';
import { CONTENT_TYPES } from '../../shared/constants';

interface Props {
  onLoadDraft: (draft: Draft) => void;
}

export function DraftsPage({ onLoadDraft }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    getDrafts().then(setDrafts);
  }, []);

  async function handleDelete(id: string) {
    await deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  const getIcon = (type: string) =>
    CONTENT_TYPES.find((t) => t.id === type)?.icon || '📄';

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <span className="text-3xl mb-2">📝</span>
        <p className="text-sm">No drafts saved</p>
        <p className="text-xs mt-1">Save drafts from the collect page</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50"
        >
          <span className="text-sm mt-0.5">{getIcon(draft.contentType)}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {(draft.data as any).title || 'Untitled'}
            </h4>
            <p className="text-xs text-gray-400 truncate mt-0.5">{draft.extractedFrom}</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status="draft" />
              <span className="text-xs text-gray-400">
                {new Date(draft.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              className="text-xs text-primary-600 hover:text-primary-800"
              onClick={() => onLoadDraft(draft)}
            >
              Load
            </button>
            <button
              className="text-xs text-red-500 hover:text-red-700"
              onClick={() => handleDelete(draft.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
