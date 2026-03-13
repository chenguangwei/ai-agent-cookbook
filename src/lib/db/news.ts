import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - data folder at project root
const dbPath = path.join(__dirname, '../../..', 'data', 'news.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS rss_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK(category IN ('Articles', 'Podcasts', 'Twitters', 'Videos')),
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_name TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    url TEXT NOT NULL UNIQUE,
    image_url TEXT,
    author TEXT,
    published_at TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    is_featured INTEGER DEFAULT 0,
    approved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES rss_sources(id)
  );

  CREATE INDEX IF NOT EXISTS idx_news_status ON news_items(status);
  CREATE INDEX IF NOT EXISTS idx_news_source ON news_items(source_id);
  CREATE INDEX IF NOT EXISTS idx_news_category ON news_items(source_id, status);
`);

// Types
export type RssSource = {
  id: string;
  name: string;
  url: string;
  category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
  enabled: boolean;
  created_at: string;
};

export type NewsItem = {
  id: string;
  source_id: string;
  source_name?: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  image_url?: string;
  author?: string;
  published_at?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  approved_at?: string;
  created_at: string;
};

// RSS Sources CRUD operations
export function getAllRssSources(): RssSource[] {
  const stmt = db.prepare('SELECT * FROM rss_sources ORDER BY created_at DESC');
  const rows = stmt.all() as Array<{
    id: string;
    name: string;
    url: string;
    category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
    enabled: number;
    created_at: string;
  }>;
  return rows.map(row => ({
    ...row,
    enabled: Boolean(row.enabled)
  }));
}

export function getRssSourceById(id: string): RssSource | undefined {
  const stmt = db.prepare('SELECT * FROM rss_sources WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    name: string;
    url: string;
    category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
    enabled: number;
    created_at: string;
  } | undefined;
  if (!row) return undefined;
  return {
    ...row,
    enabled: Boolean(row.enabled)
  };
}

export function addRssSource(source: Omit<RssSource, 'created_at'>): RssSource {
  const stmt = db.prepare(`
    INSERT INTO rss_sources (id, name, url, category, enabled)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(source.id, source.name, source.url, source.category, source.enabled ? 1 : 0);
  return getRssSourceById(source.id) as RssSource;
}

export function updateRssSource(id: string, updates: Partial<RssSource>): RssSource | undefined {
  const existing = getRssSourceById(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.url !== undefined) {
    fields.push('url = ?');
    values.push(updates.url);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (fields.length === 0) return existing;

  values.push(id);
  const stmt = db.prepare(`UPDATE rss_sources SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getRssSourceById(id);
}

export function deleteRssSource(id: string): boolean {
  const stmt = db.prepare('DELETE FROM rss_sources WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// News Items CRUD operations
export function getAllNewsItems(status?: string): NewsItem[] {
  let stmt;
  if (status) {
    stmt = db.prepare('SELECT * FROM news_items WHERE status = ? ORDER BY published_at DESC, created_at DESC');
    const rows = stmt.all(status) as Array<{
      id: string;
      source_id: string;
      source_name: string | null;
      title: string;
      summary: string | null;
      content: string | null;
      url: string;
      image_url: string | null;
      author: string | null;
      published_at: string | null;
      status: string;
      is_featured: number;
      approved_at: string | null;
      created_at: string;
    }>;
    return rows.map(mapNewsItem);
  } else {
    stmt = db.prepare('SELECT * FROM news_items ORDER BY published_at DESC, created_at DESC');
    const rows = stmt.all() as Array<{
      id: string;
      source_id: string;
      source_name: string | null;
      title: string;
      summary: string | null;
      content: string | null;
      url: string;
      image_url: string | null;
      author: string | null;
      published_at: string | null;
      status: string;
      is_featured: number;
      approved_at: string | null;
      created_at: string;
    }>;
    return rows.map(mapNewsItem);
  }
}

export function getApprovedNews(category?: string, limit: number = 50, offset: number = 0): NewsItem[] {
  let stmt;
  let rows;

  if (category) {
    // Get category from rss_sources and filter
    stmt = db.prepare(`
      SELECT ni.* FROM news_items ni
      JOIN rss_sources rs ON ni.source_id = rs.id
      WHERE ni.status = 'approved' AND rs.category = ?
      ORDER BY ni.is_featured DESC, ni.published_at DESC, ni.created_at DESC
      LIMIT ? OFFSET ?
    `);
    rows = stmt.all(category, limit, offset) as Array<{
      id: string;
      source_id: string;
      source_name: string | null;
      title: string;
      summary: string | null;
      content: string | null;
      url: string;
      image_url: string | null;
      author: string | null;
      published_at: string | null;
      status: string;
      is_featured: number;
      approved_at: string | null;
      created_at: string;
    }>;
  } else {
    stmt = db.prepare(`
      SELECT * FROM news_items
      WHERE status = 'approved'
      ORDER BY is_featured DESC, published_at DESC, created_at DESC
      LIMIT ? OFFSET ?
    `);
    rows = stmt.all(limit, offset) as Array<{
      id: string;
      source_id: string;
      source_name: string | null;
      title: string;
      summary: string | null;
      content: string | null;
      url: string;
      image_url: string | null;
      author: string | null;
      published_at: string | null;
      status: string;
      is_featured: number;
      approved_at: string | null;
      created_at: string;
    }>;
  }

  return rows.map(mapNewsItem);
}

export function getNewsItemById(id: string): NewsItem | undefined {
  const stmt = db.prepare('SELECT * FROM news_items WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    source_id: string;
    source_name: string | null;
    title: string;
    summary: string | null;
    content: string | null;
    url: string;
    image_url: string | null;
    author: string | null;
    published_at: string | null;
    status: string;
    is_featured: number;
    approved_at: string | null;
    created_at: string;
  } | undefined;
  if (!row) return undefined;
  return mapNewsItem(row);
}

export function addNewsItem(item: Omit<NewsItem, 'created_at' | 'status' | 'is_featured'>): NewsItem | null {
  // Check if URL already exists
  const existing = db.prepare('SELECT id FROM news_items WHERE url = ?').get(item.url);
  if (existing) return null;

  const stmt = db.prepare(`
    INSERT INTO news_items (id, source_id, source_name, title, summary, content, url, image_url, author, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    item.id,
    item.source_id,
    item.source_name || null,
    item.title,
    item.summary || null,
    item.content || null,
    item.url,
    item.image_url || null,
    item.author || null,
    item.published_at || null
  );
  const inserted = getNewsItemById(item.id);
  return inserted ?? null;
}

export function updateNewsStatus(
  id: string,
  status: 'approved' | 'rejected',
  is_featured?: boolean
): NewsItem | undefined {
  const approvedAt = status === 'approved' ? new Date().toISOString() : null;

  if (is_featured !== undefined) {
    const stmt = db.prepare(`
      UPDATE news_items SET status = ?, is_featured = ?, approved_at = ? WHERE id = ?
    `);
    stmt.run(status, is_featured ? 1 : 0, approvedAt, id);
  } else {
    const stmt = db.prepare(`
      UPDATE news_items SET status = ?, approved_at = ? WHERE id = ?
    `);
    stmt.run(status, approvedAt, id);
  }

  return getNewsItemById(id);
}

export function toggleFeatured(id: string): NewsItem | undefined {
  const stmt = db.prepare('SELECT is_featured FROM news_items WHERE id = ?');
  const row = stmt.get(id) as { is_featured: number } | undefined;
  if (!row) return undefined;

  const newValue = row.is_featured === 1 ? 0 : 1;
  const updateStmt = db.prepare('UPDATE news_items SET is_featured = ? WHERE id = ?');
  updateStmt.run(newValue, id);

  return getNewsItemById(id);
}

export function deleteNewsItem(id: string): boolean {
  const stmt = db.prepare('DELETE FROM news_items WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getNewsCounts(): { pending: number; approved: number; rejected: number; total: number } {
  const stmt = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      COUNT(*) as total
    FROM news_items
  `);
  const row = stmt.get() as { pending: number; approved: number; rejected: number; total: number };
  return {
    pending: row.pending || 0,
    approved: row.approved || 0,
    rejected: row.rejected || 0,
    total: row.total || 0
  };
}

export function getFeaturedNewsByCategory(limit: number = 10): NewsItem[] {
  const stmt = db.prepare(`
    SELECT ni.* FROM news_items ni
    JOIN rss_sources rs ON ni.source_id = rs.id
    WHERE ni.status = 'approved' AND ni.is_featured = 1
    ORDER BY ni.published_at DESC, ni.created_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as Array<{
    id: string;
    source_id: string;
    source_name: string | null;
    title: string;
    summary: string | null;
    content: string | null;
    url: string;
    image_url: string | null;
    author: string | null;
    published_at: string | null;
    status: string;
    is_featured: number;
    approved_at: string | null;
    created_at: string;
  }>;
  return rows.map(mapNewsItem);
}

export function getApprovedNewsCount(category?: string): number {
  let stmt;
  let row: { count: number } | undefined;

  if (category) {
    stmt = db.prepare(`
      SELECT COUNT(*) as count FROM news_items ni
      JOIN rss_sources rs ON ni.source_id = rs.id
      WHERE ni.status = 'approved' AND rs.category = ?
    `);
    row = stmt.get(category) as { count: number } | undefined;
  } else {
    stmt = db.prepare(`
      SELECT COUNT(*) as count FROM news_items WHERE status = 'approved'
    `);
    row = stmt.get() as { count: number } | undefined;
  }

  return row?.count || 0;
}

// Helper function to map database row to NewsItem type
function mapNewsItem(row: {
  id: string;
  source_id: string;
  source_name: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  status: string;
  is_featured: number;
  approved_at: string | null;
  created_at: string;
}): NewsItem {
  return {
    id: row.id,
    source_id: row.source_id,
    source_name: row.source_name || undefined,
    title: row.title,
    summary: row.summary || undefined,
    content: row.content || undefined,
    url: row.url,
    image_url: row.image_url || undefined,
    author: row.author || undefined,
    published_at: row.published_at || undefined,
    status: row.status as 'pending' | 'approved' | 'rejected',
    is_featured: row.is_featured === 1,
    approved_at: row.approved_at || undefined,
    created_at: row.created_at
  };
}

export default db;
