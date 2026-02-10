import type { Draft, HistoryItem, Settings, StorageSchema, ContentType } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { generateId } from './utils';

// ============================================================
// Chrome Storage wrapper with typed access
// ============================================================

async function get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
  const result = await chrome.storage.local.get(key);
  if (key === 'settings') return (result[key] ?? DEFAULT_SETTINGS) as StorageSchema[K];
  if (key === 'drafts' || key === 'history') return (result[key] ?? []) as StorageSchema[K];
  return result[key] as StorageSchema[K];
}

async function set<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// ============================================================
// Settings
// ============================================================

export async function getSettings(): Promise<Settings> {
  return get('settings');
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await set('settings', updated);
  return updated;
}

// ============================================================
// Drafts
// ============================================================

export async function getDrafts(): Promise<Draft[]> {
  return get('drafts');
}

export async function saveDraft(
  contentType: ContentType,
  data: Draft['data'],
  extractedFrom: string,
  existingId?: string
): Promise<Draft> {
  const drafts = await getDrafts();
  const now = new Date().toISOString();

  if (existingId) {
    const idx = drafts.findIndex((d) => d.id === existingId);
    if (idx !== -1) {
      drafts[idx] = { ...drafts[idx], data, contentType, updatedAt: now };
      await set('drafts', drafts);
      return drafts[idx];
    }
  }

  const draft: Draft = {
    id: generateId(),
    contentType,
    data,
    extractedFrom,
    createdAt: now,
    updatedAt: now,
  };

  drafts.unshift(draft);
  await set('drafts', drafts);
  return draft;
}

export async function deleteDraft(id: string): Promise<void> {
  const drafts = await getDrafts();
  await set(
    'drafts',
    drafts.filter((d) => d.id !== id)
  );
}

// ============================================================
// History
// ============================================================

export async function getHistory(): Promise<HistoryItem[]> {
  return get('history');
}

export async function addHistory(item: Omit<HistoryItem, 'id'>): Promise<HistoryItem> {
  const history = await getHistory();
  const entry: HistoryItem = { ...item, id: generateId() };
  history.unshift(entry);
  // Keep max 100 history items
  if (history.length > 100) history.length = 100;
  await set('history', history);
  return entry;
}

export async function clearHistory(): Promise<void> {
  await set('history', []);
}
