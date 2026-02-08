import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOCALE_MAP: Record<string, string> = {
  'English (US)': 'en',
  'Spanish (ES)': 'es',
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
    const slug = slugify(title);
    const date = new Date().toISOString().split('T')[0];

    // Build MDX frontmatter
    const frontmatter = [
      '---',
      `title: "${title.replace(/"/g, '\\"')}"`,
      `slug: "${slug}"`,
      `locale: "${locale}"`,
      `description: ""`,
      `category: "${category || 'Frameworks'}"`,
      `tags: [${(tags || []).map((t: string) => `"${t}"`).join(', ')}]`,
      `techStack: []`,
      `difficulty: "${difficulty || 'Beginner'}"`,
      `duration: ""`,
      videoUrl ? `videoUrl: "${videoUrl}"` : null,
      thumbnail ? `thumbnail: "${thumbnail}"` : null,
      `featured: false`,
      `date: ${date}`,
      '---',
    ].filter(Boolean).join('\n');

    const mdxContent = `${frontmatter}\n\n${markdown}`;

    // Write MDX file to content/tutorials/{locale}/
    const contentDir = path.join(process.cwd(), 'content', 'tutorials', locale);
    await fs.mkdir(contentDir, { recursive: true });

    const filePath = path.join(contentDir, `${slug}.mdx`);
    await fs.writeFile(filePath, mdxContent, 'utf-8');

    return NextResponse.json(
      {
        message: action === 'saveDraft' ? 'Draft saved successfully' : 'Tutorial published successfully',
        action,
        slug,
        filePath: `content/tutorials/${locale}/${slug}.mdx`,
        savedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Failed to process tutorial:', err);
    return NextResponse.json(
      { error: 'Failed to process tutorial' },
      { status: 500 }
    );
  }
}
