import { MetadataRoute } from 'next';
import { getAllTools, getAllTutorials, getTutorialUpdatedAt } from '@/lib/content';
import { locales } from '@/i18n/config';
import { getCanonicalUrl } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPaths = [
    { path: '', changeFrequency: 'daily' as const, priority: 1 },
    { path: 'tutorials', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: 'tools', changeFrequency: 'weekly' as const, priority: 0.85 },
    { path: 'practice', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: 'showcase', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: 'news', changeFrequency: 'daily' as const, priority: 0.7 },
    { path: 'docs', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: 'request', changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  const staticPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map(({ path, changeFrequency, priority }) => ({
      url: getCanonicalUrl(locale, path),
      lastModified: now,
      changeFrequency,
      priority,
    }))
  );

  // Tutorial pages
  const tutorials = getAllTutorials();
  const tutorialPages: MetadataRoute.Sitemap = tutorials.map((tutorial) => ({
    url: getCanonicalUrl(tutorial?.locale || 'en', `tutorial/${tutorial?.slug}`),
    lastModified: tutorial ? new Date(getTutorialUpdatedAt(tutorial)) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Tool pages
  const tools = getAllTools();
  const toolPages: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: getCanonicalUrl(tool?.locale || 'en', `tools/${tool?.slug}`),
    lastModified: tool?.date ? new Date(tool.date) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  return [...staticPages, ...tutorialPages, ...toolPages];
}
