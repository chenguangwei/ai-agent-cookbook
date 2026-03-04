import { NextResponse } from 'next/server';
import { getAllTutorials, getAllDocs, getAllNews, getAllPracticeLabs, getAllShowcaseProjects, getAllTools } from '@/lib/content';

export async function GET() {
  try {
    const tutorials = getAllTutorials();
    const docs = getAllDocs();
    const news = getAllNews();
    const labs = getAllPracticeLabs();
    const showcases = getAllShowcaseProjects();
    const tools = getAllTools();

    const documents = [
      ...tutorials.map(t => ({
        id: `${t.locale}-${t.slug}`,
        title: t.title || '',
        description: t.description || '',
        content: '',
        url: `/tutorial/${t.slug}`,
        type: 'tutorial' as const,
        category: t.category,
        tags: t.tags.filter((tag): tag is string => tag !== null),
        locale: t.locale || 'en',
      })),
      ...docs.map(d => ({
        id: `${d.locale}-${d.slug}`,
        title: d.title || '',
        description: '',
        content: '',
        url: `/docs?doc=${d.slug}`,
        type: 'doc' as const,
        category: d.category,
        tags: [] as string[],
        locale: d.locale || 'en',
      })),
      ...news.map(n => ({
        id: `${n.locale}-${n.slug}`,
        title: n.title || '',
        description: n.summary || '',
        content: '',
        url: `/news`,
        type: 'news' as const,
        category: n.category,
        tags: [] as string[],
        locale: n.locale || 'en',
      })),
      ...labs.map(l => ({
        id: `${l.locale}-${l.title.toLowerCase().replace(/\s+/g, '-')}`,
        title: l.title || '',
        description: l.description || '',
        content: '',
        url: `/practice`,
        type: 'lab' as const,
        category: l.environment || '',
        tags: [] as string[],
        locale: l.locale || 'en',
        environment: l.environment || '',
        difficulty: l.difficulty || '',
      })),
      ...showcases.map(s => ({
        id: `${s.locale}-${s.slug}`,
        title: s.title || '',
        description: s.description || '',
        content: '',
        url: `/showcase/${s.slug}`,
        type: 'showcase' as const,
        category: '',
        tags: s.tags.filter((tag): tag is string => tag !== null),
        locale: s.locale || 'en',
      })),
      ...tools.map(t => ({
        id: `${t.locale}-${t.slug}`,
        title: t.title || '',
        description: t.description || '',
        content: '',
        url: `/tools/${t.slug}`,
        type: 'tool' as const,
        category: t.category,
        tags: t.tags.filter((tag): tag is string => tag !== null),
        locale: t.locale || 'en',
        pricing: t.pricing,
      })),
    ];

    return NextResponse.json(documents);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
