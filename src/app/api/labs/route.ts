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
      environment,
      difficulty,
      status: labStatus,
      usersOnline,
      thumbnail,
      launchUrl,
      launchMode,
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const slug = slugify(title);

    const labData = {
      title,
      locale,
      description,
      environment: environment || 'Python',
      difficulty: difficulty || 'Beginner',
      status: labStatus || 'Online',
      usersOnline: usersOnline || 0,
      ...(thumbnail && { thumbnail }),
      launchUrl: launchUrl || '',
      launchMode: launchMode || 'external',
    };

    const contentDir = path.join(process.cwd(), 'content', 'labs', locale);
    await fs.mkdir(contentDir, { recursive: true });

    const filePath = path.join(contentDir, `${slug}.json`);
    await fs.writeFile(filePath, JSON.stringify(labData, null, 2), 'utf-8');

    return NextResponse.json({
      message: 'Practice lab created successfully',
      slug,
      filePath: `content/labs/${locale}/${slug}.json`,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to create lab:', err);
    return NextResponse.json(
      { error: 'Failed to create practice lab' },
      { status: 500 }
    );
  }
}
