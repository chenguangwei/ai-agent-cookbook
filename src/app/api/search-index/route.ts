import { NextResponse } from 'next/server';
import { getAllTutorials, getAllDocs, getAllNews } from '@/lib/tina';

export async function GET() {
  try {
    const [tutorials, docs, news] = await Promise.all([
      getAllTutorials(),
      getAllDocs(),
      getAllNews(),
    ]);

    const documents = [
      ...tutorials.map(t => ({
        id: t?.id || '',
        title: t?.title || '',
        description: t?.description || '',
        content: '',
        url: `/tutorial/${t?.slug}`,
        type: 'tutorial' as const,
        category: t?.category,
        tags: (t?.tags || []).filter((tag): tag is string => tag !== null),
        locale: t?.locale || 'en',
      })),
      ...docs.map(d => ({
        id: d?.id || '',
        title: d?.title || '',
        description: '',
        content: '',
        url: `/docs`,
        type: 'doc' as const,
        category: d?.category,
        tags: [] as string[],
        locale: 'en',
      })),
      ...news.map(n => ({
        id: n?.id || '',
        title: n?.title || '',
        description: n?.summary || '',
        content: '',
        url: `/news`,
        type: 'news' as const,
        category: n?.category,
        tags: [] as string[],
        locale: 'en',
      })),
    ];

    return NextResponse.json(documents);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
