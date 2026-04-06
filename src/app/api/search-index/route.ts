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

    const rawDocuments = [
      ...tutorials
        .filter(t => t.slug)
        .map(t => ({
          id: `tutorial-${t.locale || 'en'}-${t.slug}`,
          title: t.title || '',
          description: t.description || '',
          content: '',
          url: `/tutorial/${t.slug}`,
          type: 'tutorial' as const,
          category: t.category,
          tags: t.tags.filter((tag): tag is string => tag !== null),
          locale: t.locale || 'en',
        })),
      ...docs
        .filter(d => d.slug)
        .map(d => ({
          id: `doc-${d.locale || 'en'}-${d.slug}`,
          title: d.title || '',
          description: '',
          content: '',
          url: `/docs?doc=${d.slug}`,
          type: 'doc' as const,
          category: d.category,
          tags: [] as string[],
          locale: d.locale || 'en',
        })),
      ...news
        .filter(n => n.slug)
        .map(n => ({
          id: `news-${n.locale || 'en'}-${n.slug}`,
          title: n.title || '',
          description: n.summary || '',
          content: '',
          url: `/news`,
          type: 'news' as const,
          category: n.category,
          tags: [] as string[],
          locale: n.locale || 'en',
        })),
      ...labs
        .filter(l => l.title)
        .map(l => ({
          id: `lab-${l.locale || 'en'}-${l.title.toLowerCase().replace(/\s+/g, '-')}`,
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
      ...showcases
        .filter(s => s.slug)
        .map(s => ({
          id: `showcase-${s.locale || 'en'}-${s.slug}`,
          title: s.title || '',
          description: s.description || '',
          content: '',
          url: `/showcase/${s.slug}`,
          type: 'showcase' as const,
          category: '',
          tags: s.tags.filter((tag): tag is string => tag !== null),
          locale: s.locale || 'en',
        })),
      ...tools
        .filter(t => t.slug)
        .map(t => ({
          id: `tool-${t.locale || 'en'}-${t.slug}`,
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

    // Deduplicate by id (in case the same content appears across locales with identical ids)
    const seen = new Set<string>();
    const documents = rawDocuments.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });

    return NextResponse.json(documents);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
