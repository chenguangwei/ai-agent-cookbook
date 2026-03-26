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

/**
 * Fix common markdown formatting issues from web extraction
 * This addresses issues like:
 * - Wrong image syntax: [![Image](url)](link) -> ![](url)
 * - Missing paragraph breaks
 * - Excessive newlines
 */
export function fixMarkdownContent(content: string): string {
  if (!content) return content;

  let result = content;

  // Fix image links: [![Image](url)](link) -> ![Image](url)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\]\([^)]+\)/g, '![$1]($2)');

  // Fix image with no alt but has link: [![Image](url)](link) -> ![](url)
  result = result.replace(/!\[\]\(([^)]+)\]\([^)]+\)/g, '![$1]($1)');

  // Fix image with just "Image" as alt: ![Image](url) - keep as is but clean up
  result = result.replace(/!\[Image\]\(([^)]+)\]/g, '![]($1)');

  // Fix: add newline after headings if missing
  result = result.replace(/^(#{1,6}\s+.+)$/gm, '$1\n');

  // Fix: ensure there's proper spacing before headings
  result = result.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');

  // Fix: remove excessive newlines (3+ -> 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Fix: remove empty links []
  result = result.replace(/\]\(\)/g, '');

  // Fix: clean up trailing whitespace on each line
  result = result.split('\n').map(line => line.trimEnd()).join('\n');

  return result.trim();
}

/**
 * Sanitize MDX content to prevent Next.js server component parse errors.
 *
 * Fixes two classes of MDX parse errors that commonly occur in scraped content:
 *
 * 1. Blockquotes containing { } — MDX interprets these as JSX expressions.
 *    Solution: convert the blockquote to a ```json or ``` code block.
 *
 * 2. Bare --- YAML-like blocks in the body — MDX treats them as frontmatter delimiters.
 *    Solution: wrap them in ```yaml code fences.
 *
 * Lines inside fenced code blocks are never modified.
 */
export function sanitizeMdxContent(content: string): string {
  if (!content) return content;

  const lines = content.split('\n');
  const output: string[] = [];
  let inFencedCode = false;
  let fenceMarker = '';

  // Buffer for consecutive blockquote lines
  let bqBuffer: string[] = [];
  let bqHasBraces = false;

  function flushBlockquote(): void {
    if (bqBuffer.length === 0) return;
    if (bqHasBraces) {
      // Strip the leading "> " and emit as a code block
      const codeLines = bqBuffer.map((l) => l.replace(/^>\s?/, ''));
      const joined = codeLines.join('\n').trim();
      // Detect language for nicer output
      const lang =
        joined.startsWith('{') || joined.startsWith('[')
          ? 'json'
          : joined.includes(':') && joined.includes('\n')
          ? 'yaml'
          : '';
      output.push('```' + lang);
      output.push(...codeLines);
      output.push('```');
    } else {
      output.push(...bqBuffer);
    }
    bqBuffer = [];
    bqHasBraces = false;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Track fenced code block open/close
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!inFencedCode) {
        flushBlockquote();
        inFencedCode = true;
        fenceMarker = fenceMatch[1][0];
        output.push(line);
        i++;
        continue;
      } else if (line.startsWith(fenceMarker)) {
        inFencedCode = false;
        fenceMarker = '';
        output.push(line);
        i++;
        continue;
      }
    }

    if (inFencedCode) {
      output.push(line);
      i++;
      continue;
    }

    // Accumulate blockquote lines
    if (line.startsWith('>')) {
      if (line.includes('{') || line.includes('}')) bqHasBraces = true;
      bqBuffer.push(line);
      i++;
      continue;
    }

    // Non-blockquote line: flush pending blockquote buffer first
    flushBlockquote();

    // Detect bare --- frontmatter-like blocks
    // Pattern: a line that is exactly "---", followed by any lines, followed by another "---"
    if (line.trim() === '---') {
      let j = i + 1;
      const bodyLines: string[] = [];
      while (j < lines.length && lines[j].trim() !== '---') {
        bodyLines.push(lines[j]);
        j++;
      }
      if (j < lines.length) {
        // Found matching closing ---: wrap the whole block in a yaml code fence
        output.push('```yaml');
        output.push('---');
        output.push(...bodyLines);
        output.push('---');
        output.push('```');
        i = j + 1;
        continue;
      }
    }

    output.push(line);
    i++;
  }

  // Flush any remaining blockquote buffer
  flushBlockquote();

  return output.join('\n');
}

/**
 * Truncate description/summary to a reasonable length
 */
export function truncateDescription(text: string, maxLength = 200): string {
  if (!text) return '';

  // If already short, return as-is
  if (text.length <= maxLength) return text;

  // Try to get first sentence or paragraph
  const firstParagraph = text.split('\n')[0];
  if (firstParagraph.length <= maxLength) return firstParagraph;

  // Truncate at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}
