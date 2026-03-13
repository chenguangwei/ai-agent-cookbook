# News RSS 订阅与审核系统实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 News 模块添加 RSS 订阅源管理、自动抓取和人工审核功能

**Architecture:**
- 使用 SQLite 数据库存储 RSS 源和待审核内容 (better-sqlite3)
- API 路由处理 RSS 抓取、审核管理
- 管理后台页面用于审核操作
- 定时任务通过 Vercel Cron 或手动 API 触发

**Tech Stack:** Next.js 16, better-sqlite3, rss-parser, OPML 解析

---

## 阶段 1: 数据库和基础设施

### Task 1: 创建数据库模块

**Files:**
- Create: `src/lib/db/news.ts`

**Step 1: 添加依赖到 package.json**

Run: `npm install better-sqlite3`
Run: `npm install -D @types/better-sqlite3`

**Step 2: 创建数据库模块**

```typescript
// src/lib/db/news.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'news.db');

// 确保 data 目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// 初始化表
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

// RSS 源操作
export function getAllRssSources(): RssSource[] {
  return db.prepare('SELECT * FROM rss_sources ORDER BY created_at DESC').all() as RssSource[];
}

export function getRssSourceById(id: string): RssSource | undefined {
  return db.prepare('SELECT * FROM rss_sources WHERE id = ?').get(id) as RssSource | undefined;
}

export function addRssSource(source: Omit<RssSource, 'created_at'>): RssSource {
  const stmt = db.prepare(`
    INSERT INTO rss_sources (id, name, url, category, enabled)
    VALUES (@id, @name, @url, @category, @enabled)
  `);
  stmt.run(source);
  return getRssSourceById(source.id)!;
}

export function updateRssSource(id: string, updates: Partial<RssSource>): RssSource | undefined {
  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return getRssSourceById(id);

  const setClause = fields.map(f => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE rss_sources SET ${setClause} WHERE id = @id`);
  stmt.run({ ...updates, id });
  return getRssSourceById(id);
}

export function deleteRssSource(id: string): boolean {
  const result = db.prepare('DELETE FROM rss_sources WHERE id = ?').run(id);
  return result.changes > 0;
}

// News 内容操作
export function getAllNewsItems(status?: string): NewsItem[] {
  if (status) {
    return db.prepare('SELECT * FROM news_items WHERE status = ? ORDER BY created_at DESC').all(status) as NewsItem[];
  }
  return db.prepare('SELECT * FROM news_items ORDER BY created_at DESC').all() as NewsItem[];
}

export function getApprovedNews(category?: string, limit = 20, offset = 0): NewsItem[] {
  let query = `
    SELECT n.*, r.name as source_name
    FROM news_items n
    JOIN rss_sources r ON n.source_id = r.id
    WHERE n.status = 'approved'
  `;

  if (category && category !== 'all') {
    query += ` AND r.category = ?`;
  }

  query += ` ORDER BY n.is_featured DESC, n.approved_at DESC LIMIT ? OFFSET ?`;

  if (category && category !== 'all') {
    return db.prepare(query).all(category, limit, offset) as NewsItem[];
  }
  return db.prepare(query).all(limit, offset) as NewsItem[];
}

export function getNewsItemById(id: string): NewsItem | undefined {
  return db.prepare('SELECT * FROM news_items WHERE id = ?').get(id) as NewsItem | undefined;
}

export function addNewsItem(item: Omit<NewsItem, 'created_at' | 'status' | 'is_featured'>): NewsItem | null {
  // 检查是否已存在
  const existing = db.prepare('SELECT id FROM news_items WHERE url = ?').get(item.url);
  if (existing) return null;

  const stmt = db.prepare(`
    INSERT INTO news_items (id, source_id, source_name, title, summary, content, url, image_url, author, published_at)
    VALUES (@id, @source_id, @source_name, @title, @summary, @content, @url, @image_url, @author, @published_at)
  `);
  stmt.run({ ...item, source_name: item.source_name || null });
  return getNewsItemById(item.id)!;
}

export function updateNewsStatus(id: string, status: 'approved' | 'rejected', is_featured = false): NewsItem | undefined {
  const approvedAt = status === 'approved' ? new Date().toISOString() : null;
  const stmt = db.prepare(`
    UPDATE news_items
    SET status = ?, is_featured = ?, approved_at = ?
    WHERE id = ?
  `);
  stmt.run(status, is_featured ? 1 : 0, approvedAt, id);
  return getNewsItemById(id);
}

export function toggleFeatured(id: string): NewsItem | undefined {
  const item = getNewsItemById(id);
  if (!item) return undefined;

  const stmt = db.prepare('UPDATE news_items SET is_featured = ? WHERE id = ?');
  stmt.run(item.is_featured ? 0 : 1, id);
  return getNewsItemById(id);
}

export function deleteNewsItem(id: string): boolean {
  const result = db.prepare('DELETE FROM news_items WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getNewsCounts(): { pending: number; approved: number; rejected: number; total: number } {
  const pending = (db.prepare("SELECT COUNT(*) as count FROM news_items WHERE status = 'pending'").get() as any).count;
  const approved = (db.prepare("SELECT COUNT(*) as count FROM news_items WHERE status = 'approved'").get() as any).count;
  const rejected = (db.prepare("SELECT COUNT(*) as count FROM news_items WHERE status = 'rejected'").get() as any).count;
  const total = (db.prepare('SELECT COUNT(*) as count FROM news_items').get() as any).count;
  return { pending, approved, rejected, total };
}

export function getFeaturedNewsByCategory(limit = 4): NewsItem[] {
  return db.prepare(`
    SELECT n.*, r.name as source_name
    FROM news_items n
    JOIN rss_sources r ON n.source_id = r.id
    WHERE n.status = 'approved' AND n.is_featured = 1
    ORDER BY n.approved_at DESC
    LIMIT ?
  `).all(limit) as NewsItem[];
}
```

**Step 3: 测试数据库模块**

Run: `npm run build` (确保没有编译错误)

---

## 阶段 2: RSS 抓取和 OPML 导入

### Task 2: 创建 RSS 抓取和 OPML 解析模块

**Files:**
- Create: `src/lib/rss-parser.ts`

**Step 1: 安装 RSS 解析库**

Run: `npm install rss-parser`

**Step 2: 创建 RSS 解析模块**

```typescript
// src/lib/rss-parser.ts
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
    ],
  },
});

export interface ParsedFeedItem {
  title: string;
  link: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  author?: string;
  imageUrl?: string;
}

export interface ParsedFeed {
  title: string;
  link: string;
  items: ParsedFeedItem[];
}

export async function parseRssFeed(url: string): Promise<ParsedFeed> {
  try {
    const feed = await parser.parseURL(url);
    return {
      title: feed.title || '',
      link: feed.link || '',
      items: feed.items.map((item) => {
        // 尝试获取图片
        let imageUrl: string | undefined;

        if (item.enclosure?.url) {
          imageUrl = item.enclosure.url;
        } else if (item.mediaContent?.['$']?.url) {
          imageUrl = item.mediaContent['$'].url;
        } else if (item.mediaThumbnail?.['$']?.url) {
          imageUrl = item.mediaThumbnail['$'].url;
        } else {
          // 尝试从内容中提取图片
          const imgMatch = item.content?.match(/<img[^>]+src=["']([^"']+)["']/);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        return {
          title: item.title || '',
          link: item.link || '',
          content: item.content || item['content:encoded'],
          contentSnippet: item.contentSnippet || item.summary,
          summary: item.contentSnippet || item.summary,
          pubDate: item.pubDate,
          isoDate: item.isoDate,
          creator: item.creator || item.author,
          author: item.creator || item.author,
          imageUrl,
        };
      }),
    };
  } catch (error) {
    console.error(`Failed to parse RSS feed: ${url}`, error);
    throw error;
  }
}

// OPML 解析
export interface OmplOutline {
  text: string;
  title?: string;
  xmlUrl: string;
  type?: string;
}

export function parseOpml(opmlContent: string): OmplOutline[] {
  const outlines: OmplOutline[] = [];

  // 简单正则解析 OPML
  const outlineRegex = /<outline[^>]*>/g;
  let match;

  while ((match = outlineRegex.exec(opmlContent))) {
    const text = match[0];

    // 提取属性
    const getAttr = (attr: string) => {
      const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'i');
      const result = text.match(regex);
      return result ? result[1] : null;
    };

    const xmlUrl = getAttr('xmlUrl');
    if (xmlUrl) {
      outlines.push({
        text: getAttr('text') || getAttr('title') || '',
        title: getAttr('title') || undefined,
        xmlUrl,
        type: getAttr('type') || undefined,
      });
    }
  }

  return outlines;
}
```

---

### Task 3: 创建 RSS 抓取 API 路由

**Files:**
- Create: `src/app/api/news/fetch/route.ts`
- Create: `src/app/api/news/import-opml/route.ts`

**Step 1: 创建 RSS 抓取路由**

```typescript
// src/app/api/news/fetch/route.ts
import { NextResponse } from 'next/server';
import { parseRssFeed } from '@/lib/rss-parser';
import { getAllRssSources, addNewsItem, getRssSourceById } from '@/lib/db/news';
import { v4 as uuid } from 'uuid';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceId, sourceUrl } = body;

    if (sourceId) {
      // 抓取指定源
      const source = getRssSourceById(sourceId);
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }

      if (!source.enabled) {
        return NextResponse.json({ error: 'Source is disabled' }, { status: 400 });
      }

      const feed = await parseRssFeed(source.url);
      const added: string[] = [];

      for (const item of feed.items.slice(0, 20)) { // 限制每次抓取数量
        try {
          const newsItem = addNewsItem({
            id: generateId(),
            source_id: source.id,
            source_name: source.name,
            title: item.title,
            summary: item.summary?.substring(0, 500),
            content: item.content?.substring(0, 10000),
            url: item.link,
            image_url: item.imageUrl,
            author: item.author,
            published_at: item.isoDate || item.pubDate,
          });
          if (newsItem) added.push(newsItem.id);
        } catch (e) {
          console.error('Failed to add item:', e);
        }
      }

      return NextResponse.json({
        message: `Fetched ${feed.items.length} items, added ${added.length} new items`,
        added: added.length,
      });
    } else if (sourceUrl) {
      // 临时抓取一个 URL (不保存源)
      const feed = await parseRssFeed(sourceUrl);
      return NextResponse.json({
        title: feed.title,
        items: feed.items.slice(0, 10),
      });
    } else {
      // 抓取所有启用的源
      const sources = getAllRssSources().filter(s => s.enabled);
      const results: { source: string; added: number }[] = [];

      for (const source of sources) {
        try {
          const feed = await parseRssFeed(source.url);
          let added = 0;

          for (const item of feed.items.slice(0, 20)) {
            try {
              const newsItem = addNewsItem({
                id: generateId(),
                source_id: source.id,
                source_name: source.name,
                title: item.title,
                summary: item.summary?.substring(0, 500),
                content: item.content?.substring(0, 10000),
                url: item.link,
                image_url: item.imageUrl,
                author: item.author,
                published_at: item.isoDate || item.pubDate,
              });
              if (newsItem) added++;
            } catch (e) {
              // 忽略重复
            }
          }

          results.push({ source: source.name, added });
        } catch (e) {
          console.error(`Failed to fetch ${source.name}:`, e);
          results.push({ source: source.name, added: 0, error: String(e) });
        }
      }

      return NextResponse.json({
        message: 'Fetch completed',
        results,
      });
    }
  } catch (error: any) {
    console.error('RSS fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: 创建 OPML 导入路由**

```typescript
// src/app/api/news/import-opml/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseOpml } from '@/lib/rss-parser';
import { addRssSource, getAllRssSources } from '@/lib/db/news';
import { v4 as uuid } from 'uuid';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 默认 RSS 源 (来自 BestBlogs)
const DEFAULT_SOURCES = {
  Articles: [
    { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml' },
    { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'Google DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/' },
    { name: 'LangChain Blog', url: 'https://blog.langchain.dev/rss/' },
    { name: 'Microsoft Azure Blog', url: 'https://azure.microsoft.com/en-us/blog/feed/' },
    { name: 'AWS Machine Learning Blog', url: 'https://aws.amazon.com/blogs/amazon-ai/feed/' },
    { name: '量子位', url: 'https://www.qbitai.com/feed' },
    { name: '机器之心', url: 'https://wechat2rss.bestblogs.dev/feed/8d97af31b0de9e48da74558af128a4673d78c9a3.xml' },
    { name: '腾讯技术工程', url: 'https://wechat2rss.bestblogs.dev/feed/1e0ac39f8952b2e7f0807313cf2633d25078a171.xml' },
    { name: '爱范儿', url: 'http://www.ifanr.com/feed' },
  ],
  Podcasts: [
    // 可以后续添加
  ],
  Twitters: [
    // Twitter RSS 源可以后续添加
  ],
  Videos: [
    // 可以后续添加
  ],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opmlPath, category, importDefault } = body;

    let sources: { name: string; url: string }[] = [];

    if (importDefault) {
      // 导入默认源
      sources = DEFAULT_SOURCES[category as keyof typeof DEFAULT_SOURCES] || DEFAULT_SOURCES.Articles;
    } else if (opmlPath) {
      // 从文件路径读取 OPML
      const fullPath = path.join(process.cwd(), opmlPath);
      const opmlContent = await fs.readFile(fullPath, 'utf-8');
      const outlines = parseOpml(opmlContent);
      sources = outlines.map(o => ({ name: o.text || o.title || '', url: o.xmlUrl }));
    }

    // 添加到数据库
    const added: string[] = [];
    const skipped: string[] = [];

    for (const source of sources) {
      if (!source.url) continue;

      const existing = getAllRssSources().find(s => s.url === source.url);
      if (existing) {
        skipped.push(source.name);
        continue;
      }

      try {
        addRssSource({
          id: generateId(),
          name: source.name,
          url: source.url,
          category: (category as 'Articles' | 'Podcasts' | 'Twitters' | 'Videos') || 'Articles',
          enabled: true,
        });
        added.push(source.name);
      } catch (e) {
        console.error(`Failed to add source ${source.name}:`, e);
        skipped.push(source.name);
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      added,
      skipped,
      total: sources.length,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // 返回默认源列表供预览
  return NextResponse.json(DEFAULT_SOURCES);
}
```

**Step 3: 安装 uuid**

Run: `npm install uuid`
Run: `npm install -D @types/uuid`

---

## 阶段 3: 审核管理 API

### Task 4: 创建审核管理 API

**Files:**
- Create: `src/app/api/news/admin/list/route.ts`
- Create: `src/app/api/news/admin/approve/route.ts`
- Create: `src/app/api/news/admin/reject/route.ts`
- Create: `src/app/api/news/admin/featured/route.ts`
- Create: `src/app/api/news/admin/sources/route.ts`
- Create: `src/app/api/news/admin/stats/route.ts`

**Step 1: 创建待审核列表 API**

```typescript
// src/app/api/news/admin/list/route.ts
import { NextResponse } from 'next/server';
import { getAllNewsItems, getAllRssSources, getNewsCounts } from '@/lib/db/news';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const items = getAllNewsItems(status);
    const sources = getAllRssSources();
    const counts = getNewsCounts();

    // 按分类过滤
    let filtered = items;
    if (category && category !== 'all') {
      const categorySources = sources.filter(s => s.category === category).map(s => s.id);
      filtered = items.filter(item => categorySources.includes(item.source_id));
    }

    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      items: paginated,
      total: filtered.length,
      counts,
      sources,
    });
  } catch (error: any) {
    console.error('List error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 2: 创建审核通过 API**

```typescript
// src/app/api/news/admin/approve/route.ts
import { NextResponse } from 'next/server';
import { updateNewsStatus, getNewsItemById } from '@/lib/db/news';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids, isFeatured } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids is required' }, { status: 400 });
    }

    const results: { id: string; success: boolean }[] = [];

    for (const id of ids) {
      const item = updateNewsStatus(id, 'approved', isFeatured);
      results.push({ id, success: !!item });
    }

    return NextResponse.json({
      message: `Approved ${results.filter(r => r.success).length} items`,
      results,
    });
  } catch (error: any) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 3: 创建拒绝 API**

```typescript
// src/app/api/news/admin/reject/route.ts
import { NextResponse } from 'next/server';
import { updateNewsStatus } from '@/lib/db/news';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids is required' }, { status: 400 });
    }

    const results: { id: string; success: boolean }[] = [];

    for (const id of ids) {
      const item = updateNewsStatus(id, 'rejected');
      results.push({ id, success: !!item });
    }

    return NextResponse.json({
      message: `Rejected ${results.filter(r => r.success).length} items`,
      results,
    });
  } catch (error: any) {
    console.error('Reject error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 4: 创建标记热门 API**

```typescript
// src/app/api/news/admin/featured/route.ts
import { NextResponse } from 'next/server';
import { toggleFeatured, getNewsItemById } from '@/lib/db/news';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const item = toggleFeatured(id);

    return NextResponse.json({
      item,
      message: item?.is_featured ? 'Marked as featured' : 'Unmarked featured',
    });
  } catch (error: any) {
    console.error('Featured error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 5: 创建源管理 API**

```typescript
// src/app/api/news/admin/sources/route.ts
import { NextResponse } from 'next/server';
import { getAllRssSources, addRssSource, updateRssSource, deleteRssSource, getRssSourceById } from '@/lib/db/news';
import { v4 as uuid } from 'uuid';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function GET() {
  try {
    const sources = getAllRssSources();
    return NextResponse.json({ sources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, category, enabled } = body;

    if (!name || !url || !category) {
      return NextResponse.json({ error: 'name, url, category are required' }, { status: 400 });
    }

    const source = addRssSource({
      id: generateId(),
      name,
      url,
      category,
      enabled: enabled !== false,
    });

    return NextResponse.json({ source, message: 'Source added' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const source = updateRssSource(id, updates);

    return NextResponse.json({ source, message: 'Source updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const success = deleteRssSource(id);

    return NextResponse.json({ success, message: success ? 'Source deleted' : 'Source not found' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 6: 创建统计 API**

```typescript
// src/app/api/news/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { getNewsCounts, getAllRssSources, getAllNewsItems } from '@/lib/db/news';

export async function GET() {
  try {
    const counts = getNewsCounts();
    const sources = getAllRssSources();
    const items = getAllNewsItems();

    const categoryStats = sources.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      counts,
      sourcesCount: sources.length,
      categoryStats,
      recentItems: items.slice(0, 5),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 阶段 4: 管理后台页面

### Task 5: 创建审核管理页面

**Files:**
- Create: `src/app/[locale]/admin/news/page.tsx`

**Step 1: 创建管理页面组件**

```tsx
// src/app/[locale]/admin/news/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Newspaper, Check, X, Star, Trash2, RefreshCw, Plus, Rss, Filter } from 'lucide-react';

interface NewsItem {
  id: string;
  source_name: string;
  title: string;
  summary: string;
  url: string;
  image_url?: string;
  published_at: string;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  created_at: string;
}

interface Source {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
}

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('pending');
  const [category, setCategory] = useState<string>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'sources'>('pending');
  const [fetching, setFetching] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      if (category !== 'all') params.set('category', category);

      const res = await fetch(`/api/news/admin/list?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setSources(data.sources || []);
    } catch (e) {
      console.error('Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, [status, category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (ids: string[], isFeatured = false) => {
    await fetch('/api/news/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, isFeatured }),
    });
    fetchItems();
    setSelected([]);
  };

  const handleReject = async (ids: string[]) => {
    await fetch('/api/news/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    fetchItems();
    setSelected([]);
  };

  const handleToggleFeatured = async (id: string) => {
    await fetch('/api/news/admin/featured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchItems();
  };

  const handleFetchRss = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/news/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      alert(`抓取完成: ${JSON.stringify(data.results || data)}`);
      fetchItems();
    } catch (e) {
      alert('抓取失败');
    } finally {
      setFetching(false);
    }
  };

  const handleImportDefault = async (cat: string) => {
    try {
      const res = await fetch('/api/news/import-opml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importDefault: true, category: cat }),
      });
      const data = await res.json();
      alert(`导入完成: 添加 ${data.added?.length || 0} 个源`);
      fetchItems();
    } catch (e) {
      alert('导入失败');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map(i => i.id));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                News 管理后台
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                管理 RSS 订阅源和审核新闻内容
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleFetchRss}
                disabled={fetching}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
                抓取 RSS
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-1 font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-slate-500'
              }`}
            >
              待审核
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`pb-3 px-1 font-medium ${
                activeTab === 'approved'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-slate-500'
              }`}
            >
              已通过
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`pb-3 px-1 font-medium ${
                activeTab === 'sources'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-slate-500'
              }`}
            >
              RSS 源管理
            </button>
          </div>

          {activeTab === 'sources' ? (
            /* RSS 源管理 */
            <div className="space-y-6">
              <div className="flex gap-2">
                <button
                  onClick={() => handleImportDefault('Articles')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm"
                >
                  导入 Articles 源
                </button>
                <button
                  onClick={() => handleImportDefault('Podcasts')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm"
                >
                  导入 Podcasts 源
                </button>
              </div>

              <div className="grid gap-4">
                {sources.map(source => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border"
                  >
                    <div>
                      <div className="font-medium">{source.name}</div>
                      <div className="text-sm text-slate-500">{source.url}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        source.category === 'Articles' ? 'bg-blue-100 text-blue-700' :
                        source.category === 'Podcasts' ? 'bg-purple-100 text-purple-700' :
                        source.category === 'Twitters' ? 'bg-sky-100 text-sky-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {source.category}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        source.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {source.enabled ? '启用' : '禁用'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border rounded-lg"
                >
                  <option value="pending">待审核</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>

              {/* Bulk Actions */}
              {selected.length > 0 && status === 'pending' && (
                <div className="flex gap-2 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    已选择 {selected.length} 项:
                  </span>
                  <button
                    onClick={() => handleApprove(selected, false)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" /> 通过
                  </button>
                  <button
                    onClick={() => handleApprove(selected, true)}
                    className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                  >
                    <Star className="w-4 h-4" /> 通过并热门
                  </button>
                  <button
                    onClick={() => handleReject(selected)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    <X className="w-4 h-4" /> 拒绝
                  </button>
                </div>
              )}

              {/* List */}
              {loading ? (
                <div className="text-center py-12">加载中...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-slate-500">暂无数据</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={selected.length === items.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-500">全选</span>
                  </div>

                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border ${
                        selected.includes(item.id) ? 'border-primary-500 ring-2 ring-primary-500/20' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 mt-1"
                      />

                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-24 h-16 object-cover rounded"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500">{item.source_name}</span>
                          {item.is_featured && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                              热门
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">
                          {item.summary}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">
                            {item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove([item.id])}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              title="通过"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject([item.id])}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="拒绝"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {item.status === 'approved' && (
                          <button
                            onClick={() => handleToggleFeatured(item.id)}
                            className={`p-2 rounded ${
                              item.is_featured
                                ? 'text-yellow-500 bg-yellow-50'
                                : 'text-slate-400 hover:bg-slate-50'
                            }`}
                            title={item.is_featured ? '取消热门' : '标记热门'}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:bg-slate-50 rounded"
                          title="查看原文"
                        >
                          <Rss className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

---

## 阶段 5: 公开页面更新

### Task 6: 更新 News 列表页面

**Files:**
- Modify: `src/app/[locale]/news/page.tsx`

**Step 1: 更新 News 页面**

```tsx
// src/app/[locale]/news/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { Clock, ArrowUpRight, Rss } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getAllNews } from '@/lib/content';
import { getTranslations } from 'next-intl/server';

// 新增: 从数据库获取
import { getApprovedNews, getAllRssSources } from '@/lib/db/news';

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

const CATEGORIES = [
  { key: 'all', labelKey: 'all' },
  { key: 'Articles', labelKey: 'articles' },
  { key: 'Podcasts', labelKey: 'podcasts' },
  { key: 'Twitters', labelKey: 'twitters' },
  { key: 'Videos', labelKey: 'videos' },
];

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { category = 'all', page = '1' } = await searchParams;
  const t = await getTranslations('News');

  const pageNum = parseInt(page) || 1;
  const limit = 12;
  const offset = (pageNum - 1) * limit;

  // 尝试从数据库获取，如果没有数据则回退到原有 MDX 内容
  let items: any[] = [];
  let total = 0;

  try {
    const dbItems = getApprovedNews(category, limit, offset);
    items = dbItems;
    // 计算总数需要单独查询，这里简化处理
    total = items.length >= limit ? total + limit : total + items.length;
  } catch (e) {
    // 回退到原有 MDX 内容
    const newsItems = getAllNews(locale);
    items = newsItems.slice(offset, offset + limit);
    total = newsItems.length;
  }

  const categories = CATEGORIES.map(cat => ({
    key: cat.key,
    label: t(cat.labelKey),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-6 py-8 lg:py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Rss className="w-6 h-6 text-primary-600" />
              <h1 className="text-slate-900 dark:text-white text-3xl font-bold font-display">
                {t('title')}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl">
              {t('description')}
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                href={`/news?category=${cat.key}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === cat.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600 hover:text-primary-600'
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <article
                key={item?.id || item?.slug}
                className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300"
              >
                {/* Image */}
                {item?.image_url && (
                  <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col gap-3 p-5 flex-1">
                  {/* Source & Time */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-primary-600 dark:text-primary-400">
                      {item?.source_name || item?.source}
                    </span>
                    <span>
                      {item?.published_at
                        ? new Date(item.published_at).toLocaleDateString()
                        : item?.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString()
                        : ''}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight">
                    {item?.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 flex-1">
                    {item?.summary || item?.summary}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {item?.readTime || '5 min read'}
                    </div>
                    {item?.url ? (
                      <Link
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {t('readMore')}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href={`/news/${item?.slug}`}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {t('readMore')}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/news?category=${category}&page=${p}`}
                  className={`px-4 py-2 rounded-lg ${
                    p === pageNum
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

---

### Task 7: 更新首页展示 News 热门推荐

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Step 1: 更新首页**

```tsx
// 在现有的 import 后添加
import { getFeaturedNewsByCategory } from '@/lib/db/news';

// 在 Home 组件中添加
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Home');
  const tCat = await getTranslations('Home.categories');
  const tStat = await getTranslations('Home.stats');

  const featuredTutorials = getFeaturedTutorials(4, locale);
  const recentTutorials = getRecentTutorials(3, locale);
  const tutorialCount = getAllTutorials(locale).length;
  const toolCount = getAllTools(locale).length;
  const showcaseCount = getAllShowcaseProjects(locale).length;

  // 新增: 获取热门 News
  let featuredNews: any[] = [];
  try {
    featuredNews = getFeaturedNewsByCategory(6);
  } catch (e) {
    // 忽略数据库错误
  }

  // ... 现有代码 ...

  // 在 repositorySegments 前添加 News 区块
  {featuredNews.length > 0 && (
    <>
      {/* Hot News Section */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
          <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
            {t('hotNews') || '热门资讯'}
          </h2>
        </div>
        <Link
          href="/news"
          className="text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-widest hover:underline transition-all flex items-center gap-2"
        >
          {t('viewAll')} <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
        {featuredNews.map((news) => (
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            key={news.id}
            className="group flex flex-col gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300"
          >
            {news.image_url && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                <Image
                  src={news.image_url}
                  alt={news.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  {news.source_name}
                </span>
                {news.is_featured && (
                  <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] rounded">
                    HOT
                  </span>
                )}
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                {news.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2">
                {news.summary}
              </p>
            </div>
          </a>
        ))}
      </div>
    </>
  )}

  // ... 现有代码 ...
}
```

**Step 2: 添加翻译文本**

在 `messages/zh.json` 和 `messages/en.json` 中添加:

```json
{
  "Home": {
    "hotNews": "热门资讯"
  },
  "News": {
    "all": "全部",
    "articles": "文章",
    "podcasts": "播客",
    "twitters": "推文",
    "videos": "视频"
  }
}
```

---

## 阶段 6: 定时任务 (可选)

### Task 8: 设置 Vercel Cron 定时抓取

**Files:**
- Create: `vercel.json`

**Step 1: 创建 Vercel 配置**

```json
{
  "crons": [
    {
      "path": "/api/news/fetch",
      "schedule": "0 * * * *"
    }
  ]
}
```

这将每小时自动抓取一次 RSS 源。

---

## 测试和验证

### Step 1: 验证构建

Run: `npm run build`

确保没有编译错误。

### Step 2: 测试 API

1. 启动开发服务器: `npm run dev`
2. 访问 `/api/news/admin/stats` 验证数据库连接
3. 访问 `/api/news/import-opml?importDefault=true&category=Articles` 导入默认源
4. 访问 `/api/news/fetch` 触发抓取
5. 访问 `/api/news/admin/list?status=pending` 查看待审核内容

### Step 3: 测试页面

1. 访问 `/admin/news` 审核内容
2. 访问 `/news` 查看公开列表
3. 访问首页查看热门推荐

---

**Plan complete and saved to `docs/plans/2026-03-13-news-rss-implementation.md`.**

## 执行选项

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
