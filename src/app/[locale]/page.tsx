import Link from 'next/link';
import Image from 'next/image';
import { Search, ArrowUpRight, BookOpen, Wrench, Sparkles, Command, Newspaper, ChevronDown, Quote } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TutorialBadge } from '@/components/features/TutorialBadge';
import { getFeaturedTutorials, getRecentTutorials, getAllTutorials, getAllTools, getAllShowcaseProjects } from '@/lib/content';
import { getFeaturedNewsByCategory } from '@/lib/db/news';
import { getTranslations } from 'next-intl/server';
import { buildLocaleAlternates, getCanonicalUrl, getLocalizedPath, getSiteUrl, SITE_NAME } from '@/lib/utils';
import type { Metadata } from 'next';
import { locales } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('Home');

  return {
    title: t('seoTitle') || t('title'),
    description: t('seoDescription') || t('subtitle'),
    alternates: {
      canonical: getCanonicalUrl(locale),
      languages: buildLocaleAlternates(),
    },
  };
}

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

const repositorySegments = [
  {
    titleKey: 'tutorials',
    descKey: 'tutorialsDesc',
    icon: BookOpen,
    href: '/tutorials',
  },
  {
    titleKey: 'tools',
    descKey: 'toolsDesc',
    icon: Wrench,
    href: '/tools',
  },
  {
    titleKey: 'showcase',
    descKey: 'showcaseDesc',
    icon: Sparkles,
    href: '/showcase',
  },
  {
    titleKey: 'news',
    descKey: 'newsDesc',
    icon: Newspaper,
    href: '/news',
  },
];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Home');
  const tCat = await getTranslations('Home.categories');
  const tStat = await getTranslations('Home.stats');

  const featuredTutorials = getFeaturedTutorials(4, locale);
  const recentTutorials = getRecentTutorials(3, locale);
  const tutorialCount = getAllTutorials(locale).length;
  const toolCount = getAllTools(locale).length;
  const showcaseCount = getAllShowcaseProjects(locale).length;

  let featuredNews: any[] = [];
  try {
    featuredNews = await getFeaturedNewsByCategory(6);
  } catch (e) {
    // 忽略数据库错误
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteUrl(),
    description: t('seoDescription'),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/tutorials?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-6 py-16 lg:py-24">
          {/* Hero Section */}
          <div className="flex flex-col items-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-primary-600 dark:text-primary-400 text-[10px] font-bold mb-8 tracking-[0.2em] uppercase shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              {t('systemStatus')}
            </div>
            <h1 className="text-slate-900 dark:text-white tracking-tighter text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] text-center max-w-5xl mb-8 font-display">
              {t.rich('title', {
                span: (chunks) => (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
                    {chunks}
                  </span>
                )
              })}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl text-center max-w-2xl leading-relaxed font-light mb-8">
              {t('subtitle')}
            </p>
            <div className="flex items-center gap-4 mb-8">
              <Link
                href={getLocalizedPath(locale, 'tutorials')}
                className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors"
              >
                {t('ctaExplore')}
              </Link>
              <Link
                href={getLocalizedPath(locale, 'tools')}
                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-400 dark:hover:border-primary-600 text-sm font-bold transition-colors bg-white dark:bg-slate-900"
              >
                {t('ctaTools')}
              </Link>
            </div>
          </div>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="group relative">
              <Link
                href={getLocalizedPath(locale, 'tutorials')}
                className="flex w-full items-center rounded-2xl h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-text"
                aria-label={t('searchPlaceholder')}
              >
                <div className="pl-6 text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <span className="flex-1 text-lg text-slate-400 px-4">
                  {t('searchPlaceholder')}
                </span>
                <div className="pr-6">
                  <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-400 font-bold font-mono">
                    <Command className="w-3 h-3" /> K
                  </kbd>
                </div>
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-10 mb-20 py-8 border-y border-slate-100 dark:border-slate-800">
            {[
              { value: tutorialCount, label: tStat('tutorials') },
              { value: toolCount, label: tStat('tools') },
              { value: showcaseCount, label: tStat('showcases') },
              { value: locales.length, label: tStat('languages') },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold text-slate-900 dark:text-white font-display">
                  {stat.value}+
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Hot Topics Section */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="h-6 w-1 bg-primary-600 rounded-full"></div>
              <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
                {t('hotTopics')}
              </h2>
            </div>
            <Link
              href={getLocalizedPath(locale, 'tutorials')}
              className="text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-widest hover:underline transition-all flex items-center gap-2"
            >
              {t('viewAll')} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Featured Tutorials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {featuredTutorials.map((tutorial) => (
              <Link
                href={getLocalizedPath(locale, `tutorial/${tutorial?.slug}`)}
                key={tutorial?.slug}
                className="group flex flex-col gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {tutorial?.thumbnail && (
                    <Image
                      src={tutorial.thumbnail}
                      alt={tutorial?.title || ''}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <TutorialBadge type="difficulty" value={tutorial?.difficulty || 'Beginner'} />
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-bold leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {tutorial?.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                    {tutorial?.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recently Added Section */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
              <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
                {t('recentlyAdded')}
              </h2>
            </div>
            <Link
              href={getLocalizedPath(locale, 'tutorials')}
              className="text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-widest hover:underline transition-all flex items-center gap-2"
            >
              {t('viewAll')} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {recentTutorials.map((tutorial) => (
              <Link
                href={getLocalizedPath(locale, `tutorial/${tutorial.slug}`)}
                key={tutorial.slug}
                className="group flex flex-col gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {tutorial.thumbnail && (
                    <Image
                      src={tutorial.thumbnail}
                      alt={tutorial.title || ''}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <TutorialBadge type="difficulty" value={tutorial.difficulty || 'Beginner'} />
                  <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                    {tutorial.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>

          {/* Hot News Section */}
          {featuredNews.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
                  <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
                    {t('hotNews') || '热门资讯'}
                  </h2>
                </div>
                <Link
                  href={getLocalizedPath(locale, 'news')}
                  className="text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-widest hover:underline transition-all flex items-center gap-2"
                >
                  {t('viewAll')} <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
                {featuredNews.map((news) => (
                  <a
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={news.id}
                    className="group flex flex-col gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300"
                  >
                    {(() => {
                      let imageUrl = news.image_url;
                      // Try to extract image from content if not available
                      if (!imageUrl && news.content) {
                        const content = news.content;
                        const ogFormats = [
                          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
                          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
                        ];
                        for (const format of ogFormats) {
                          const ogMatch = content.match(format);
                          if (ogMatch && ogMatch[1] && !ogMatch[1].includes('data:')) {
                            imageUrl = ogMatch[1];
                            break;
                          }
                        }
                        // Try YouTube
                        if (!imageUrl) {
                          const youtubeMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                          if (youtubeMatch) {
                            imageUrl = `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
                          }
                        }
                      }

                      if (!imageUrl) {
                        return (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center p-4">
                            <div className="text-center">
                              <div className="text-3xl mb-2">📄</div>
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium line-clamp-2">{news.title}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <Image
                            src={imageUrl}
                            alt={news.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized
                          />
                        </div>
                      );
                    })()}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-orange-600 dark:text-orange-400 font-medium">
                          {news.source_name}
                        </span>
                        {news.is_featured && (
                          <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] rounded">
                            HOT
                          </span>
                        )}
                      </div>
                      <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                        {news.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2">
                        {news.summary}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}

          {/* Repository Segments Section */}
          <div className="flex items-center gap-4 mb-12">
            <div className="h-6 w-1 bg-primary-600 rounded-full"></div>
            <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
              {t('repositorySegments')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
            {repositorySegments.map((item) => (
              <Link
                href={getLocalizedPath(locale, item.href)}
                key={item.titleKey}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl hover:border-primary-600 dark:hover:border-primary-600 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-6 group-hover:bg-primary-600 transition-colors duration-300">
                  <item.icon className="text-primary-600 dark:text-primary-400 group-hover:text-white w-7 h-7 transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white uppercase tracking-wider font-display">
                  {tCat(item.titleKey as any)}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  {tCat(item.descKey as any)}
                </p>
              </Link>
            ))}
          </div>

          {/* Testimonials Section */}
          <div className="mb-32">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
              <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
                {t('testimonials')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { nameKey: 'testimonial1Name', roleKey: 'testimonial1Role', textKey: 'testimonial1Text' },
                { nameKey: 'testimonial2Name', roleKey: 'testimonial2Role', textKey: 'testimonial2Text' },
                { nameKey: 'testimonial3Name', roleKey: 'testimonial3Role', textKey: 'testimonial3Text' },
              ].map((item) => (
                <div key={item.nameKey} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                  <Quote className="w-6 h-6 text-primary-400 dark:text-primary-600 flex-shrink-0" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed flex-1">
                    {t(item.textKey as any)}
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {t(item.nameKey as any).charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{t(item.nameKey as any)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t(item.roleKey as any)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-32">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-6 w-1 bg-violet-500 rounded-full"></div>
              <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
                {t('faq')}
              </h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {[
                { qKey: 'faq1Q', aKey: 'faq1A' },
                { qKey: 'faq2Q', aKey: 'faq2A' },
                { qKey: 'faq3Q', aKey: 'faq3A' },
                { qKey: 'faq4Q', aKey: 'faq4A' },
              ].map((item, idx) => (
                <details key={idx} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base pr-4">
                      {t(item.qKey as any)}
                    </h3>
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 group-open:rotate-180 transition-transform duration-200" />
                  </summary>
                  <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {t(item.aKey as any)}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Newsletter Section — links to GitHub for now, no fake subscription */}
          <div className="mb-16 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-3xl p-10 text-center">
            <h2 className="text-white text-2xl font-bold mb-3 font-display">
              {t('newsletter')}
            </h2>
            <p className="text-primary-100 mb-8 max-w-lg mx-auto">
              {t('newsletterDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="https://github.com/topics/ai-agents"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-bold text-sm rounded-xl hover:bg-primary-50 transition-colors"
              >
                GitHub AI Agents <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/news"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-bold text-sm rounded-xl hover:bg-white/20 transition-colors"
              >
                {t('hotNews')} <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
