import React from 'react';
import type { ContentType } from '../../shared/types';
import { CONTENT_TYPES } from '../../shared/constants';
import { truncate } from '../../shared/utils';

interface Props {
  contentType: ContentType;
  title: string;
  description: string;
  sourceUrl: string;
  thumbnail?: string;
}

export function PreviewCard({ contentType, title, description, sourceUrl, thumbnail }: Props) {
  const typeDef = CONTENT_TYPES.find((t) => t.id === contentType);

  return (
    <div className="card flex gap-3">
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          className="w-16 h-16 rounded object-cover flex-shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs">{typeDef?.icon}</span>
          <span className="text-xs font-medium text-primary-600">{typeDef?.label}</span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {title || 'Untitled'}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {truncate(description || 'No description', 100)}
        </p>
        <p className="text-xs text-gray-400 mt-1 truncate">{sourceUrl}</p>
      </div>
    </div>
  );
}
