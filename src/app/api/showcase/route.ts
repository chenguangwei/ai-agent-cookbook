import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveUniqueContentFile, slugify } from '@/lib/content-filenames';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      locale = 'en',
      author,
      description,
      tags,
      stars,
      demoUrl,
      repoUrl,
      websiteUrl,
      thumbnail,
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const showcaseData = {
      title,
      locale,
      author: author || { name: '', avatar: '' },
      description,
      tags: tags || [],
      stars: stars || 0,
      demoUrl: demoUrl || '#',
      repoUrl: repoUrl || '#',
      ...(websiteUrl && { websiteUrl }),
      ...(thumbnail && { thumbnail }),
    };

    const contentDir = path.join(process.cwd(), 'content', 'showcase', locale);
    await fs.mkdir(contentDir, { recursive: true });

    const baseSlug = slugify(title);
    const { slug, filePath, relativePath } = await resolveUniqueContentFile(contentDir, baseSlug, '.json');
    await fs.writeFile(filePath, JSON.stringify(showcaseData, null, 2), 'utf-8');

    return NextResponse.json({
      message: 'Showcase project created successfully',
      slug,
      filePath: relativePath,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to create showcase:', err);
    return NextResponse.json(
      { error: 'Failed to create showcase project' },
      { status: 500 }
    );
  }
}
