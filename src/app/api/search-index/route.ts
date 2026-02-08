import { NextResponse } from 'next/server';
import { getAllTutorials, getAllDocs, getAllNews, getAllPracticeLabs, getAllShowcaseProjects } from '@/lib/tina';

export async function GET() {
  try {
    const [tutorials, docs, news, labs, showcases] = await Promise.all([
      getAllTutorials(),
      getAllDocs(),
      getAllNews(),
      getAllPracticeLabs(),
      getAllShowcaseProjects(),
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
      ...labs.map(l => ({
        id: l?.id || '',
        title: l?.title || '',
        description: l?.description || '',
        content: '',
        url: `/practice`,
        type: 'lab' as const,
        category: l?.environment || '',
        tags: [] as string[],
        locale: l?.locale || 'en',
        environment: l?.environment || '',
        difficulty: l?.difficulty || '',
      })),
      ...showcases.map(s => ({
        id: s?.id || '',
        title: s?.title || '',
        description: s?.description || '',
        content: '',
        url: `/showcase`,
        type: 'showcase' as const,
        category: '',
        tags: (s?.tags || []).filter((tag): tag is string => tag !== null),
        locale: s?.locale || 'en',
      })),
    ];

    return NextResponse.json(documents);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
