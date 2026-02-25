import client from '../../tina/__generated__/client';

// Simple in-memory cache for TinaCMS data
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data as T);
  }

  return fetcher().then(data => {
    cache.set(key, { data, timestamp: now });
    return data;
  });
}

// Re-export types from generated types for convenience
export type { Tutorial, Doc, News, PracticeLab, Showcase, Tool } from '../../tina/__generated__/types';

export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';
  const match = url.match(/^https?:\/\/[^\/]+\/.*?(https?:\/\/.*)$/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return url;
}

export async function getAllTutorials(locale?: string) {
  const cacheKey = `tutorials-${locale || 'all'}`;

  return getCached(cacheKey, async () => {
    try {
      const result = await client.queries.tutorialConnection({ last: 100 });
      const tutorials = result.data.tutorialConnection.edges?.map(e => {
        const node = e?.node;
        if (node) {
          return { ...node, thumbnail: normalizeImageUrl(node.thumbnail) };
        }
        return null;
      }).filter(Boolean) ?? [];
      if (locale) {
        return tutorials.filter(t => t?.locale === locale);
      }
      return tutorials;
    } catch {
      return [];
    }
  });
}

export async function getTutorialBySlug(slug: string) {
  const all = await getAllTutorials();
  return all.find(t => t?.slug === slug) ?? null;
}

export async function getFeaturedTutorials(limit = 4, locale?: string) {
  const all = await getAllTutorials(locale);
  const featured = all.filter(t => t?.featured);
  const rest = all.filter(t => !t?.featured);
  return [...featured, ...rest].slice(0, limit);
}

export async function getAllDocs(locale?: string) {
  const cacheKey = `docs-${locale || 'all'}`;

  return getCached(cacheKey, async () => {
    try {
      const result = await client.queries.docConnection({ last: 100 });
      let docs = result.data.docConnection.edges?.map(e => e?.node).filter(Boolean) ?? [];
      if (locale) {
        docs = docs.filter(d => d?.locale === locale);
      }
      return docs.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
    } catch {
      return [];
    }
  });
}

export async function getAllNews(locale?: string) {
  const cacheKey = `news-${locale || 'all'}`;

  return getCached(cacheKey, async () => {
    try {
      const result = await client.queries.newsConnection({ last: 100 });
      let news = result.data.newsConnection.edges?.map(e => {
        const node = e?.node;
        if (node) {
          return { ...node, imageUrl: normalizeImageUrl(node.imageUrl) };
        }
        return null;
      }).filter(Boolean) ?? [];
      if (locale) {
        news = news.filter(n => n?.locale === locale);
      }
      return news.sort((a, b) => {
        const dateA = a?.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b?.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch {
      return [];
    }
  });
}

export async function getAllPracticeLabs(locale?: string) {
  const cacheKey = `labs-${locale || 'all'}`;

  return getCached(cacheKey, async () => {
    try {
      const result = await client.queries.practiceLabConnection({ last: 100 });
      const labs = result.data.practiceLabConnection.edges?.map(e => {
        const node = e?.node;
        if (node) {
          return { ...node, thumbnail: normalizeImageUrl(node.thumbnail) };
        }
        return null;
      }).filter(Boolean) ?? [];
      if (locale) {
        return labs.filter(l => l?.locale === locale);
      }
      return labs;
    } catch {
      return [];
    }
  });
}

export async function getAllShowcaseProjects(locale?: string) {
  const cacheKey = `showcase-${locale || 'all'}`;

  return getCached(cacheKey, async () => {
    try {
      const result = await client.queries.showcaseConnection({ last: 100 });
      const projects = result.data.showcaseConnection.edges?.map(e => {
        const node = e?.node;
        if (node) {
          return { ...node, thumbnail: normalizeImageUrl(node.thumbnail) };
        }
        return null;
      }).filter(Boolean) ?? [];
      if (locale) {
        return projects.filter(p => p?.locale === locale);
      }
      return projects;
    } catch {
      return [];
    }
  });
}

export async function getAllTools(locale?: string) {
  const cacheKey = `tools-${locale || 'all'}`;

  return getCached(cacheKey, async () => {
    try {
      const result = await client.queries.toolConnection({ last: 100 });
      const tools = result.data.toolConnection.edges?.map(e => {
        const node = e?.node;
        if (node) {
          return { ...node, logoUrl: normalizeImageUrl(node.logoUrl) };
        }
        return null;
      }).filter(Boolean) ?? [];
      if (locale) {
        return tools.filter(t => t?.locale === locale);
      }
      return tools;
    } catch {
      return [];
    }
  });
}

export async function getToolBySlug(slug: string) {
  const all = await getAllTools();
  return all.find(t => t?.slug === slug) ?? null;
}

export async function getFeaturedTools(limit = 6, locale?: string) {
  const all = await getAllTools(locale);
  const featured = all.filter(t => t?.featured);
  const rest = all.filter(t => !t?.featured);
  return [...featured, ...rest].slice(0, limit);
}

export async function getCategoryCounts(locale?: string) {
  const tutorials = await getAllTutorials(locale);
  const counts: Record<string, number> = {};
  tutorials.forEach(t => {
    if (t?.category) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
  });
  return counts;
}
