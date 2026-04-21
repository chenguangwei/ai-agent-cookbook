import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveUniqueContentFile, slugify } from '@/lib/content-filenames';

const LOCALE_MAP: Record<string, string> = {
  'English (US)': 'en',
  'Mandarin (ZH)': 'zh',
  'Japanese (JA)': 'ja',
};

/**
 * Fix common markdown formatting issues from web extraction
 */
function formatMarkdownContent(content: string): string {
  if (!content) return content;

  let result = content;

  // Add paragraph breaks: .!?) followed by capital letter -> add newline
  const lines = result.split('\n');
  const processedLines = lines.map(line => {
    return line.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
  });
  result = processedLines.join('\n');

  // Fix merged sentences: "code.You" -> "code.\n\nYou"
  const mergedLines = result.split('\n');
  const processedMerged = mergedLines.map(line => {
    return line.replace(/([.!?])([A-Z])/g, '$1\n\n$2');
  });
  result = processedMerged.join('\n');

  return result
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      locale: rawLocale,
      language,
      summary,
      source,
      sourceUrl,
      author,
      imageUrl,
      publishedAt,
      category,
      readTime,
      content,
    } = body;

    if (!title || !summary) {
      return NextResponse.json(
        { error: 'Title and summary are required' },
        { status: 400 }
      );
    }

    const locale = rawLocale || LOCALE_MAP[language] || 'en';
    const baseSlug = slugify(title);
    const contentDir = path.join(process.cwd(), 'content', 'news', locale);
    await fs.mkdir(contentDir, { recursive: true });

    const { slug, filePath, relativePath } = await resolveUniqueContentFile(contentDir, baseSlug, '.mdx');

    // Format the content after the final slug is known for frontmatter.
    const formattedContent = formatMarkdownContent(content || '');

    const frontmatter = [
      '---',
      `title: '${title.replace(/'/g, "''")}'`,
      `slug: '${slug}'`,
      `locale: '${locale}'`,
      `summary: '${(summary || '').replace(/'/g, "''")}'`,
      `source: '${(source || '').replace(/'/g, "''")}'`,
      `sourceUrl: '${sourceUrl || ''}'`,
      `author: '${(author || '').replace(/'/g, "''")}'`,
      imageUrl ? `imageUrl: '${imageUrl}'` : null,
      `publishedAt: '${publishedAt || new Date().toISOString()}'`,
      `category: '${category || 'Tech'}'`,
      `readTime: '${readTime || '5 min read'}'`,
      '---',
    ].filter(Boolean).join('\n');

    const mdxContent = `${frontmatter}\n\n${formattedContent}`;
    await fs.writeFile(filePath, mdxContent, 'utf-8');

    return NextResponse.json({
      message: 'News article created successfully',
      slug,
      filePath: relativePath,
      savedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Failed to create news:', error);

    // Handle specific errors with user-friendly messages
    let errorMessage = 'Failed to create news article';
    const err = error instanceof Error ? error : null;
    const errorCode = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

    if (errorCode === 'ENAMETOOLONG') {
      errorMessage = 'Title is too long. Please shorten the title and try again.';
    } else if (err?.message) {
      errorMessage = `Error: ${err.message}`;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
