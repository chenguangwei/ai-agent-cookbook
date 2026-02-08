import client from '../../tina/__generated__/client';

// Re-export types from generated types for convenience
export type { Tutorial, Doc, News, PracticeLab, Showcase } from '../../tina/__generated__/types';

export async function getAllTutorials(locale?: string) {
  try {
    const result = await client.queries.tutorialConnection({ last: 100 });
    const tutorials = result.data.tutorialConnection.edges?.map(e => e?.node).filter(Boolean) ?? [];
    if (locale) {
      return tutorials.filter(t => t?.locale === locale);
    }
    return tutorials;
  } catch {
    return [];
  }
}

export async function getTutorialBySlug(slug: string) {
  const all = await getAllTutorials();
  return all.find(t => t?.slug === slug) ?? null;
}

export async function getFeaturedTutorials(limit = 4, locale?: string) {
  const all = await getAllTutorials(locale);
  const featured = all.filter(t => t?.featured);
  const rest = all.filter(t => !t?.featured);
  return [...featured, ...rest].slice(0, limit);
}

export async function getAllDocs(locale?: string) {
  try {
    const result = await client.queries.docConnection({ last: 100 });
    let docs = result.data.docConnection.edges?.map(e => e?.node).filter(Boolean) ?? [];
    if (locale) {
      docs = docs.filter(d => d?.locale === locale);
    }
    return docs.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
  } catch {
    return [];
  }
}

export async function getAllNews(locale?: string) {
  try {
    const result = await client.queries.newsConnection({ last: 100 });
    let news = result.data.newsConnection.edges?.map(e => e?.node).filter(Boolean) ?? [];
    if (locale) {
      news = news.filter(n => n?.locale === locale);
    }
    return news.sort((a, b) => {
      const dateA = a?.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b?.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch {
    return [];
  }
}

export async function getAllPracticeLabs(locale?: string) {
  try {
    const result = await client.queries.practiceLabConnection({ last: 100 });
    const labs = result.data.practiceLabConnection.edges?.map(e => e?.node).filter(Boolean) ?? [];
    if (locale) {
      return labs.filter(l => l?.locale === locale);
    }
    return labs;
  } catch {
    return [];
  }
}

export async function getAllShowcaseProjects(locale?: string) {
  try {
    const result = await client.queries.showcaseConnection({ last: 100 });
    const projects = result.data.showcaseConnection.edges?.map(e => e?.node).filter(Boolean) ?? [];
    if (locale) {
      return projects.filter(p => p?.locale === locale);
    }
    return projects;
  } catch {
    return [];
  }
}

export async function getCategoryCounts(locale?: string) {
  const tutorials = await getAllTutorials(locale);
  const counts: Record<string, number> = {};
  tutorials.forEach(t => {
    if (t?.category) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
  });
  return counts;
}
