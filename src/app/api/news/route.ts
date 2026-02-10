import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOCALE_MAP: Record<string, string> = {
  'English (US)': 'en',
  'Mandarin (ZH)': 'zh',
  'Japanese (JA)': 'ja',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
    const slug = slugify(title);

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

    const mdxContent = `${frontmatter}\n\n${content || ''}`;

    const contentDir = path.join(process.cwd(), 'content', 'news', locale);
    await fs.mkdir(contentDir, { recursive: true });

    const filePath = path.join(contentDir, `${slug}.mdx`);
    await fs.writeFile(filePath, mdxContent, 'utf-8');

    return NextResponse.json({
      message: 'News article created successfully',
      slug,
      filePath: `content/news/${locale}/${slug}.mdx`,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to create news:', err);
    return NextResponse.json(
      { error: 'Failed to create news article' },
      { status: 500 }
    );
  }
}
