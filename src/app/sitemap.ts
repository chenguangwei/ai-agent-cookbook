import { MetadataRoute } from 'next';
import { getAllTools, getAllTutorials, getToolLocalesBySlug, getTutorialLocalesBySlug, getTutorialUpdatedAt } from '@/lib/content';
import { getApprovedNews } from '@/lib/db/news';
import { locales } from '@/i18n/config';
import { buildLocaleAlternates, getCanonicalUrl } from '@/lib/utils';
import { getNewsPathSegment } from '@/lib/news-url';

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

  let newsPages: MetadataRoute.Sitemap = [];
  try {
    const newsItems = await getApprovedNews(undefined, 1000, 0, 'all', 'all');
    newsPages = newsItems
      .filter((item) => item.id)
      .map((item) => {
        const locale = item.language || 'en';
        const path = `news/${getNewsPathSegment(item)}`;

        return {
          url: getCanonicalUrl(locale, path),
          lastModified: item.published_at ? new Date(item.published_at) : now,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
          alternates: {
            languages: buildLocaleAlternates(path, [locale]),
          },
        };
      });
  } catch (error) {
    console.warn('Failed to include news items in sitemap:', error);
  }

  return [...staticPages, ...tutorialPages, ...toolPages, ...newsPages];
}
