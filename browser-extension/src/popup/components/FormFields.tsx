import React from 'react';
import { DIFFICULTIES, LOCALES, LAB_ENVIRONMENTS } from '../../shared/constants';
import { CategorySelect } from './CategorySelect';
import { TagInput } from './TagInput';
import type { ContentType } from '../../shared/types';

interface Props {
  contentType: ContentType;
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function FormFields({ contentType, formData, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Common: Title */}
      <div>
        <label className="label-text">Title *</label>
        <input
          className="input-field"
          value={formData.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Resource title"
        />
      </div>

      {/* Common: Locale */}
      <div>
        <label className="label-text">Language</label>
        <select
          className="select-field"
          value={formData.locale || 'en'}
          onChange={(e) => onChange('locale', e.target.value)}
        >
          {LOCALES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Common: Description */}
      <div>
        <label className="label-text">
          {contentType === 'news' ? 'Summary' : 'Description'} *
        </label>
        <textarea
          className="input-field resize-none"
          rows={2}
          value={formData.description || formData.summary || ''}
          onChange={(e) =>
            onChange(contentType === 'news' ? 'summary' : 'description', e.target.value)
          }
          placeholder={contentType === 'news' ? 'Brief summary...' : 'Brief description...'}
        />
      </div>

      {/* Category (tutorial & news) */}
      <CategorySelect
        contentType={contentType}
        value={formData.category || ''}
        onChange={(v) => onChange('category', v)}
      />

      {/* Tutorial-specific fields */}
      {contentType === 'tutorial' && (
        <>
          <TagInput
            tags={formData.tags || []}
            onChange={(t) => onChange('tags', t)}
          />
          <TagInput
            tags={formData.techStack || []}
            onChange={(t) => onChange('techStack', t)}
            label="Tech Stack"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-text">Difficulty</label>
              <select
                className="select-field"
                value={formData.difficulty || 'Beginner'}
                onChange={(e) => onChange('difficulty', e.target.value)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Duration</label>
              <input
                className="input-field"
                value={formData.duration || ''}
                onChange={(e) => onChange('duration', e.target.value)}
                placeholder="e.g. 15 min read"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Video URL (optional)</label>
            <input
              className="input-field"
              value={formData.videoUrl || ''}
              onChange={(e) => onChange('videoUrl', e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>
          <div>
            <label className="label-text">Thumbnail URL (optional)</label>
            <input
              className="input-field"
              value={formData.thumbnail || ''}
              onChange={(e) => onChange('thumbnail', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </>
      )}

      {/* News-specific fields */}
      {contentType === 'news' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-text">Source</label>
              <input
                className="input-field"
                value={formData.source || ''}
                onChange={(e) => onChange('source', e.target.value)}
                placeholder="e.g. OpenAI Blog"
              />
            </div>
            <div>
              <label className="label-text">Author</label>
              <input
                className="input-field"
                value={formData.author || ''}
                onChange={(e) => onChange('author', e.target.value)}
                placeholder="Author name"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Source URL</label>
            <input
              className="input-field"
              value={formData.sourceUrl || ''}
              onChange={(e) => onChange('sourceUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label-text">Image URL (optional)</label>
            <input
              className="input-field"
              value={formData.imageUrl || ''}
              onChange={(e) => onChange('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label-text">Read Time</label>
            <input
              className="input-field"
              value={formData.readTime || ''}
              onChange={(e) => onChange('readTime', e.target.value)}
              placeholder="e.g. 5 min read"
            />
          </div>
        </>
      )}

      {/* Showcase-specific fields */}
      {contentType === 'showcase' && (
        <>
          <div>
            <label className="label-text">Author Name</label>
            <input
              className="input-field"
              value={formData.authorName || ''}
              onChange={(e) => onChange('authorName', e.target.value)}
              placeholder="Project author"
            />
          </div>
          <TagInput
            tags={formData.tags || []}
            onChange={(t) => onChange('tags', t)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-text">Demo URL</label>
              <input
                className="input-field"
                value={formData.demoUrl || ''}
                onChange={(e) => onChange('demoUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="label-text">Repo URL</label>
              <input
                className="input-field"
                value={formData.repoUrl || ''}
                onChange={(e) => onChange('repoUrl', e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
          <div>
            <label className="label-text">Thumbnail URL (optional)</label>
            <input
              className="input-field"
              value={formData.thumbnail || ''}
              onChange={(e) => onChange('thumbnail', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </>
      )}

      {/* Lab-specific fields */}
      {contentType === 'lab' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-text">Environment</label>
              <select
                className="select-field"
                value={formData.environment || 'Python'}
                onChange={(e) => onChange('environment', e.target.value)}
              >
                {LAB_ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Difficulty</label>
              <select
                className="select-field"
                value={formData.difficulty || 'Beginner'}
                onChange={(e) => onChange('difficulty', e.target.value)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-text">Launch URL *</label>
            <input
              className="input-field"
              value={formData.launchUrl || ''}
              onChange={(e) => onChange('launchUrl', e.target.value)}
              placeholder="https://stackblitz.com/... or https://colab.research.google.com/..."
            />
          </div>
          <div>
            <label className="label-text">Launch Mode</label>
            <select
              className="select-field"
              value={formData.launchMode || 'external'}
              onChange={(e) => onChange('launchMode', e.target.value)}
            >
              <option value="external">External (new tab)</option>
              <option value="iframe">Iframe (embedded)</option>
            </select>
          </div>
          <div>
            <label className="label-text">Thumbnail URL (optional)</label>
            <input
              className="input-field"
              value={formData.thumbnail || ''}
              onChange={(e) => onChange('thumbnail', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </>
      )}

      {/* Content / Markdown body (tutorial & news) */}
      {(contentType === 'tutorial' || contentType === 'news') && (
        <div>
          <label className="label-text">Content (Markdown)</label>
          <textarea
            className="input-field resize-none font-mono text-xs"
            rows={5}
            value={formData.content || ''}
            onChange={(e) => onChange('content', e.target.value)}
            placeholder="# Markdown content here..."
          />
        </div>
      )}
    </div>
  );
}
