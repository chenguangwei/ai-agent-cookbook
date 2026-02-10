import React from 'react';
import { CONTENT_TYPES } from '../../shared/constants';
import type { ContentType } from '../../shared/types';

interface Props {
  value: ContentType;
  onChange: (type: ContentType) => void;
}

export function ContentTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1.5">
      {CONTENT_TYPES.map((ct) => (
        <button
          key={ct.id}
          onClick={() => onChange(ct.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs transition-all
            ${
              value === ct.id
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-400'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          title={ct.description}
        >
          <span className="text-base">{ct.icon}</span>
          <span className="font-medium">{ct.label}</span>
        </button>
      ))}
    </div>
  );
}
