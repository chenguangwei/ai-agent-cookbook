import React from 'react';
import { TUTORIAL_CATEGORIES, NEWS_CATEGORIES } from '../../shared/constants';
import type { ContentType, TutorialCategory, NewsCategory } from '../../shared/types';

interface Props {
  contentType: ContentType;
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelect({ contentType, value, onChange }: Props) {
  if (contentType === 'tutorial') {
    return (
      <div>
        <label className="label-text">Category</label>
        <select
          className="select-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {TUTORIAL_CATEGORIES.map((c) => (
            <option key={c.id} value={c.value}>
              {c.icon} {c.value}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (contentType === 'news') {
    return (
      <div>
        <label className="label-text">Category</label>
        <select
          className="select-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {NEWS_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}
