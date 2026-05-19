import { MetadataRoute } from 'next';
import { getAllTools, getAllTutorials, getToolLocalesBySlug, getTutorialLocalesBySlug, getTutorialUpdatedAt } from '@/lib/content';
import { locales } from '@/i18n/config';
import { buildLocaleAlternates, getCanonicalUrl } from '@/lib/utils';

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
      alternates: {
        languages: buildLocaleAlternates(path, locales),
      },
    }))
  );

  // Tutorial pages
  const tutorials = getAllTutorials();
  const tutorialPages: MetadataRoute.Sitemap = tutorials.map((tutorial) => {
    const path = `tutorial/${tutorial.slug}`;
    const availableLocales = getTutorialLocalesBySlug(tutorial.slug);

    return {
      url: getCanonicalUrl(tutorial.locale || 'en', path),
      lastModified: new Date(getTutorialUpdatedAt(tutorial)),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: {
        languages: buildLocaleAlternates(path, availableLocales),
      },
    };
  });

  // Tool pages
  const tools = getAllTools();
  const toolPages: MetadataRoute.Sitemap = tools.map((tool) => {
    const path = `tools/${tool.slug}`;
    const availableLocales = getToolLocalesBySlug(tool.slug);

    return {
      url: getCanonicalUrl(tool.locale || 'en', path),
      lastModified: tool.date ? new Date(tool.date) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
      alternates: {
        languages: buildLocaleAlternates(path, availableLocales),
      },
    };
  });

  return [...staticPages, ...tutorialPages, ...toolPages];
}
