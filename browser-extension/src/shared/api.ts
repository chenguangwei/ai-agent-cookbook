import type {
  TutorialData,
  NewsData,
  ShowcaseData,
  LabData,
  ContentType,
  Locale,
} from './types';
import { getSettings } from './storage';
import { slugify, sanitizeMdxContent } from './utils';

// ============================================================
// API response type
// ============================================================

interface ApiResponse {
  success: boolean;
  message: string;
  slug?: string;
  filePath?: string;
}

const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English (US)',
  zh: 'Mandarin (ZH)',
  ja: 'Japanese (JA)',
};

// ============================================================
// Submit content to Agent Hub API
// ============================================================

export async function submitContent(
  contentType: ContentType,
  data: TutorialData | NewsData | ShowcaseData | LabData
): Promise<ApiResponse> {
  const { apiUrl } = await getSettings();

  switch (contentType) {
    case 'tutorial':
      return submitTutorial(apiUrl, data as TutorialData);
    case 'news':
      return submitNews(apiUrl, data as NewsData);
    case 'showcase':
      return submitShowcase(apiUrl, data as ShowcaseData);
    case 'lab':
      return submitLab(apiUrl, data as LabData);
    default:
      return { success: false, message: `Unknown content type: ${contentType}` };
  }
}

async function submitTutorial(apiUrl: string, data: TutorialData): Promise<ApiResponse> {
  const res = await fetch(`${apiUrl}/api/tutorials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'publish',
      title: data.title,
      markdown: data.content,
      language: LOCALE_LABEL[data.locale],
      tags: data.tags,
      category: data.category,
      difficulty: data.difficulty,
      videoUrl: data.videoUrl,
      thumbnail: data.thumbnail,
    }),
  });

  const result = await res.json();
  if (!res.ok) return { success: false, message: result.error || 'Failed to submit tutorial' };
  return { success: true, message: result.message, slug: result.slug, filePath: result.filePath };
}

async function submitNews(apiUrl: string, data: NewsData): Promise<ApiResponse> {
  const res = await fetch(`${apiUrl}/api/news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  if (!res.ok) return { success: false, message: result.error || 'Failed to submit news' };
  return { success: true, message: result.message, slug: result.slug, filePath: result.filePath };
}

async function submitShowcase(apiUrl: string, data: ShowcaseData): Promise<ApiResponse> {
  const res = await fetch(`${apiUrl}/api/showcase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  if (!res.ok) return { success: false, message: result.error || 'Failed to submit showcase' };
  return { success: true, message: result.message, slug: result.slug, filePath: result.filePath };
}

async function submitLab(apiUrl: string, data: LabData): Promise<ApiResponse> {
  const res = await fetch(`${apiUrl}/api/labs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  if (!res.ok) return { success: false, message: result.error || 'Failed to submit lab' };
  return { success: true, message: result.message, slug: result.slug, filePath: result.filePath };
}

// ============================================================
// Content formatting utilities
// ============================================================

/**
 * Fix common markdown formatting issues from web extraction,
 * then sanitize for MDX safety (no bare {} or --- in body).
 */
function formatContent(content: string): string {
  if (!content) return content;

  // Note: intentionally no sentence-splitting heuristics here.
  // Patterns like /([.!?])\s+([A-Z])/ break tweet text, URLs, acronyms (e.g. "U.S. News").
  const cleaned = content
    // Fix image links: [![Image](url)](link) -> ![Image](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\]\([^)]+\)/g, '![$1]($2)')
    // Fix image with no alt: [![Image](url)](link) -> ![](url)
    .replace(/!\[\]\(([^)]+)\]\([^)]+\)/g, '![$1]($1)')
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Add newline after headings if missing
    .replace(/(#{1,6}\s+.+)$/gm, '$1\n')
    // Fix common issues with links that have no text
    .replace(/\]\(\)/g, '')
    // Ensure paragraphs have proper spacing - add newline before headings if missing
    .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
    // Clean up trailing whitespace
    .trim();

  // Sanitize MDX-unsafe patterns: blockquotes with {}, bare --- blocks
  return sanitizeMdxContent(cleaned);
}

/**
 * Truncate description to a reasonable length (first paragraph or ~200 chars)
 */
function truncateDescription(description: string, maxLength = 200): string {
  if (!description) return '';

  // If already short, return as-is
  if (description.length <= maxLength) return description;

  // Try to截取 first sentence or paragraph
  const firstParagraph = description.split('\n')[0];
  if (firstParagraph.length <= maxLength) return firstParagraph;

  // Otherwise truncate at word boundary
  const truncated = description.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

// ============================================================
// Generate file content for local/offline mode
// ============================================================

export function generateFileContent(
  contentType: ContentType,
  data: TutorialData | NewsData | ShowcaseData | LabData
): { filename: string; content: string; format: 'mdx' | 'json' } {
  switch (contentType) {
    case 'tutorial':
      return generateTutorialFile(data as TutorialData);
    case 'news':
      return generateNewsFile(data as NewsData);
    case 'showcase':
      return generateShowcaseFile(data as ShowcaseData);
    case 'lab':
      return generateLabFile(data as LabData);
  }
}

function generateTutorialFile(data: TutorialData) {
  const slug = data.slug || slugify(data.title);
  // Format content and truncate description
  const formattedContent = formatContent(data.content);
  const cleanDescription = truncateDescription(data.description || '', 200);
  const lines = [
    '---',
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `slug: "${slug}"`,
    `locale: "${data.locale}"`,
    `description: "${cleanDescription.replace(/"/g, '\\"')}"`,
    `category: "${data.category}"`,
    `tags: [${data.tags.map((t) => `"${t}"`).join(', ')}]`,
    `techStack: [${data.techStack.map((t) => `"${t}"`).join(', ')}]`,
    `difficulty: "${data.difficulty}"`,
    `duration: "${data.duration}"`,
    data.videoUrl ? `videoUrl: "${data.videoUrl}"` : null,
    data.thumbnail ? `thumbnail: "${data.thumbnail}"` : null,
    `featured: ${data.featured}`,
    `date: ${data.date}`,
    '---',
    '',
    formattedContent,
  ].filter((l) => l !== null).join('\n');

  return {
    filename: `content/tutorials/${data.locale}/${slug}.mdx`,
    content: lines,
    format: 'mdx' as const,
  };
}

function generateNewsFile(data: NewsData) {
  const slug = data.slug || slugify(data.title);
  // Format content
  const formattedContent = formatContent(data.content);
  const cleanSummary = truncateDescription(data.summary || '', 200);
  const lines = [
    '---',
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `slug: "${slug}"`,
    `locale: "${data.locale}"`,
    `summary: "${cleanSummary.replace(/"/g, '\\"')}"`,
    `source: "${data.source}"`,
    `sourceUrl: "${data.sourceUrl}"`,
    `author: "${data.author}"`,
    data.imageUrl ? `imageUrl: "${data.imageUrl}"` : null,
    `publishedAt: "${data.publishedAt}"`,
    `category: "${data.category}"`,
    `readTime: "${data.readTime}"`,
    '---',
    '',
    formattedContent,
  ].filter((l) => l !== null).join('\n');

  return {
    filename: `content/news/${data.locale}/${slug}.mdx`,
    content: lines,
    format: 'mdx' as const,
  };
}

function generateShowcaseFile(data: ShowcaseData) {
  const slug = slugify(data.title);
  return {
    filename: `content/showcase/${data.locale}/${slug}.json`,
    content: JSON.stringify(data, null, 2),
    format: 'json' as const,
  };
}

function generateLabFile(data: LabData) {
  const slug = slugify(data.title);
  return {
    filename: `content/labs/${data.locale}/${slug}.json`,
    content: JSON.stringify(data, null, 2),
    format: 'json' as const,
  };
}
