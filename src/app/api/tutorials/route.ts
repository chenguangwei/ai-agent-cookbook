import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveUniqueContentFile, slugify } from '@/lib/content-filenames';

const LOCALE_MAP: Record<string, string> = {
  'English (US)': 'en',
  'Spanish (ES)': 'es',
  'Mandarin (ZH)': 'zh',
  'Japanese (JA)': 'ja',
};

/**
 * Fix common markdown formatting issues from web extraction
 */
function formatMarkdownContent(content: string): string {
  if (!content) return content;

  return content
    // Fix image links: [![Image](url)](link) -> ![Image](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\]\([^)]+\)/g, '![$1]($2)')
    // Fix image with no alt: [![Image](url)](link) -> ![](url)
    .replace(/!\[\]\(([^)]+)\]\([^)]+\)/g, '![$1]($1)')
    // Fix double newlines
    .replace(/\n{3,}/g, '\n\n')
    // Add newline after headings if missing
    .replace(/(#{1,6}\s+.+)$/gm, '$1\n')
    // Fix common issues with links that have no text
    .replace(/\]\(\)/g, '')
    // Ensure paragraphs have proper spacing - add newline before ## if missing
    .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
    .trim();
}

/**
 * Truncate description to a reasonable length
 */
function truncateDescription(description: string, maxLength = 200): string {
  if (!description) return '';

  if (description.length <= maxLength) return description;

  const firstParagraph = description.split('\n')[0];
  if (firstParagraph.length <= maxLength) return firstParagraph;

  const truncated = description.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, title, markdown, videoUrl, language, tags, thumbnail, category, difficulty } = body;

    if (!action || !['saveDraft', 'publish'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    if (action === 'publish') {
      if (!title || !markdown) {
        return NextResponse.json(
          { error: 'Title and content are required for publishing' },
          { status: 400 }
        );
      }
    }

    const locale = LOCALE_MAP[language] || 'en';
    const baseSlug = slugify(title);
    const date = new Date().toISOString().split('T')[0];

    // Format the markdown content
    const formattedMarkdown = formatMarkdownContent(markdown);

    // Extract description from content (first ~200 chars of first paragraph)
    const contentForDesc = formattedMarkdown.split('\n').find(line => line.trim().length > 0) || '';
    const description = truncateDescription(contentForDesc.replace(/^[#*_\s]+/, '').trim(), 200);

    const contentDir = path.join(process.cwd(), 'content', 'tutorials', locale);
    await fs.mkdir(contentDir, { recursive: true });

    const { slug, filePath, relativePath } = await resolveUniqueContentFile(contentDir, baseSlug, '.mdx');

    // Build MDX frontmatter after the final slug is known.
    const frontmatter = [
      '---',
      `title: "${title.replace(/"/g, '\\"')}"`,
      `slug: "${slug}"`,
      `locale: "${locale}"`,
      `description: "${description.replace(/"/g, '\\"')}"`,
      `category: "${category || 'Frameworks'}"`,
      `tags: [${(tags || []).map((t: string) => `"${t}"`).join(', ')}]`,
      `techStack: []`,
      `difficulty: "${difficulty || 'Beginner'}"`,
      `duration: ""`,
      videoUrl ? `videoUrl: "${videoUrl}"` : null,
      thumbnail ? `thumbnail: "${thumbnail}"` : null,
      `featured: false`,
      `date: ${date}`,
      `updatedAt: ${date}`,
      '---',
    ].filter(Boolean).join('\n');

    const mdxContent = `${frontmatter}\n\n${formattedMarkdown}`;
    await fs.writeFile(filePath, mdxContent, 'utf-8');

    return NextResponse.json(
      {
        message: action === 'saveDraft' ? 'Draft saved successfully' : 'Tutorial published successfully',
        action,
        slug,
        filePath: relativePath,
        savedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Failed to process tutorial:', error);

    // Handle specific errors with user-friendly messages
    let errorMessage = 'Failed to process tutorial';
    const err = error instanceof Error ? error : null;
    const errorCode = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

    if (errorCode === 'ENAMETOOLONG') {
      errorMessage = 'Title is too long. Please shorten the title and try again.';
    } else if (errorCode === 'EISDIR') {
      errorMessage = 'Invalid file path. Please check the title format.';
    } else if (err?.message) {
      errorMessage = `Error: ${err.message}`;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
