import type {
  TutorialCategory,
  NewsCategory,
  ContentType,
  ExtractedPageData,
} from './types';
import {
  TUTORIAL_CATEGORY_KEYWORDS,
  NEWS_CATEGORY_KEYWORDS,
  COMMON_TAGS,
} from './constants';

/**
 * Generate a URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Format date as ISO string
 */
export function formatDateTime(date?: Date): string {
  return (date || new Date()).toISOString();
}

/**
 * Estimate read time from content
 */
export function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Detect tutorial category from text content using keyword matching
 */
export function detectTutorialCategory(text: string): {
  category: TutorialCategory;
  confidence: number;
} {
  const lower = text.toLowerCase();
  let bestCategory: TutorialCategory = 'Frameworks';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(TUTORIAL_CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as TutorialCategory;
    }
  }

  return { category: bestCategory, confidence: Math.min(bestScore / 3, 1) };
}

/**
 * Detect news category from text content
 */
export function detectNewsCategory(text: string): NewsCategory {
  const lower = text.toLowerCase();
  let bestCategory: NewsCategory = 'Tech';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(NEWS_CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as NewsCategory;
    }
  }

  return bestCategory;
}

/**
 * Suggest tags based on extracted page content
 */
export function suggestTags(text: string): string[] {
  const lower = text.toLowerCase();
  return COMMON_TAGS.filter((tag) => lower.includes(tag.toLowerCase())).slice(0, 8);
}

/**
 * Detect locale from html lang attribute or content
 */
export function detectLocale(langAttr: string): 'en' | 'zh' | 'ja' {
  const lang = langAttr.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
}

/**
 * Auto-detect content type based on the page URL and content
 */
export function detectContentType(data: ExtractedPageData): ContentType {
  const url = data.url.toLowerCase();
  const text = `${data.title} ${data.description}`.toLowerCase();

  // GitHub repos → showcase
  if (url.includes('github.com') && !url.includes('/blob/') && !url.includes('/issues')) {
    return 'showcase';
  }

  // Notebook/sandbox links → lab
  if (
    url.includes('colab.research.google.com') ||
    url.includes('stackblitz.com') ||
    url.includes('replit.com') ||
    url.includes('codepen.io')
  ) {
    return 'lab';
  }

  // News-like indicators
  if (
    url.includes('/blog/') ||
    url.includes('/news/') ||
    url.includes('/press/') ||
    text.includes('announced') ||
    text.includes('introducing') ||
    text.includes('launch')
  ) {
    return 'news';
  }

  // Default: tutorial
  return 'tutorial';
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}
