import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
      locale = 'en',
      description,
      category,
      tags,
      logoUrl,
      websiteUrl,
      repoUrl,
      docsUrl,
      pricing,
      stars,
      license,
      body: content,
    } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    const slug = slugify(title);
    const date = new Date().toISOString().split('T')[0];

    // Build MDX frontmatter
    const frontmatter = [
      '---',
      `title: "${title.replace(/"/g, '\\"')}"`,
      `slug: "${slug}"`,
      `locale: "${locale}"`,
      `description: "${description.replace(/"/g, '\\"')}"`,
      `category: "${category}"`,
      `tags: [${(tags || []).map((t: string) => `"${t}"`).join(', ')}]`,
      logoUrl ? `logoUrl: "${logoUrl}"` : null,
      websiteUrl ? `websiteUrl: "${websiteUrl}"` : null,
      repoUrl ? `repoUrl: "${repoUrl}"` : null,
      docsUrl ? `docsUrl: "${docsUrl}"` : null,
      pricing ? `pricing: "${pricing}"` : null,
      stars != null ? `stars: ${stars}` : null,
      license ? `license: "${license}"` : null,
      `featured: false`,
      `date: ${date}`,
      '---',
    ].filter(Boolean).join('\n');

    const mdxContent = `${frontmatter}\n\n${content || ''}`;

    const contentDir = path.join(process.cwd(), 'content', 'tools', locale);
    await fs.mkdir(contentDir, { recursive: true });

    const filePath = path.join(contentDir, `${slug}.mdx`);
    await fs.writeFile(filePath, mdxContent, 'utf-8');

    return NextResponse.json({
      message: 'Tool created successfully',
      slug,
      filePath: `content/tools/${locale}/${slug}.mdx`,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to create tool:', err);
    return NextResponse.json(
      { error: 'Failed to create tool' },
      { status: 500 }
    );
  }
}
