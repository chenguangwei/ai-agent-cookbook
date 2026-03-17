import Image from 'next/image';
import Link from 'next/link';
import { Clock, ArrowUpRight, Rss } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getAllNews } from '@/lib/content';
import { getApprovedNews, getApprovedNewsCount } from '@/lib/db/news';
import { getTranslations } from 'next-intl/server';

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

export default async function NewsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { category: categoryParam, page: pageParam } = await searchParams;

  const t = await getTranslations('News');

  const category = categoryParam || 'all';
  const page = parseInt(pageParam || '1', 10);
  const limit = 12;
  const offset = (page - 1) * 12;

  // Try to fetch from database (filter by locale/language)
  let articles;
  let total = 0;

  try {
    const categoryFilter = category === 'all' ? undefined : category;
    // Use locale as language filter (en, zh, ja)
    articles = await getApprovedNews(categoryFilter, limit, offset, locale);
    total = await getApprovedNewsCount(categoryFilter, locale);
  } catch (error) {
    // Fall back to getAllNews if database fails
    articles = getAllNews(locale);
    total = articles.length;
  }

  // If database has no data, fall back to getAllNews
  if (!articles || articles.length === 0) {
    articles = getAllNews(locale);
    total = articles.length;
  }

  const categories = [
    { key: 'all', labelKey: 'all' },
    { key: 'Articles', labelKey: 'articles' },
    { key: 'Podcasts', labelKey: 'podcasts' },
    { key: 'Twitters', labelKey: 'twitters' },
    { key: 'Videos', labelKey: 'videos' },
  ];

  const totalPages = Math.ceil(total / limit);
  const currentCategory = category;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-6 py-8 lg:py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Rss className="w-6 h-6 text-primary-600" />
              <h1 className="text-slate-900 dark:text-white text-3xl font-bold font-display">
                {t('title')}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl">
              {t('description')}
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                href={`/news?category=${cat.key}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentCategory === cat.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600 hover:text-primary-600'
                }`}
              >
                {t(cat.labelKey)}
              </Link>
            ))}
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article: any) => (
              <article
                key={article?.slug || article?.id}
                className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300"
              >
                {/* Image - extract from content if not available */}
                {(() => {
                  // Try to get image from various sources
                  let imageUrl = article?.image_url || article?.imageUrl;

                  // If no image, try to extract from content
                  if (!imageUrl && article?.content) {
                    const content = article.content;
                    // Try og:image - multiple formats
                    const ogFormats = [
                      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
                      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
                      /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
                      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image["']/i,
                    ];
                    for (const format of ogFormats) {
                      const ogMatch = content.match(format);
                      if (ogMatch && ogMatch[1] && !ogMatch[1].includes('data:')) {
                        imageUrl = ogMatch[1];
                        break;
                      }
                    }

                    // Try YouTube thumbnail
                    if (!imageUrl) {
                      const youtubeMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      if (youtubeMatch) {
                        imageUrl = `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
                      }
                    }

                    // Try first valid img tag
                    if (!imageUrl) {
                      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
                      let imgMatch;
                      while ((imgMatch = imgRegex.exec(content)) !== null) {
                        const src = imgMatch[1];
                        if (src && !src.startsWith('data:') && !src.includes('pixel') && !src.includes('tracking') && src.length > 20) {
                          imageUrl = src;
                          break;
                        }
                      }
                    }

                    // Try twitter:image
                    if (!imageUrl) {
                      const twitterMatch = content.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
                      if (twitterMatch) {
                        imageUrl = twitterMatch[1];
                      }
                    }
                  }

                  // Show placeholder with title preview if no image
                  if (!imageUrl) {
                    return (
                      <Link
                        href={article.url || article.sourceUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative w-full aspect-video bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center p-4"
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-2">📄</div>
                          <span className="text-xs text-primary-600 dark:text-primary-400 font-medium line-clamp-3">{article?.title}</span>
                          <span className="text-xs text-primary-500 dark:text-primary-500 mt-2 block">{article?.source_name || article?.source}</span>
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      href={article.url || article.sourceUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative w-full aspect-video bg-slate-100 dark:bg-slate-800"
                    >
                      <Image
                        src={imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover hover:opacity-90 transition-opacity"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized
                        onError={(e) => {
                          // Hide broken images, show placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </Link>
                  );
                })()}

                {/* Content */}
                <div className="flex flex-col gap-3 p-5 flex-1">
                  {/* Source & Time - handle both DB (source_name) and MDX (source) */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-primary-600 dark:text-primary-400">
                      {article?.source_name || article?.source}
                    </span>
                    <span>
                      {article?.published_at || article?.publishedAt
                        ? new Date(article.published_at || article.publishedAt).toLocaleDateString()
                        : ''}
                    </span>
                  </div>

                  {/* Title - clickable */}
                  {(article?.url || article?.sourceUrl) ? (
                    <Link
                      href={article.url || article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-900 dark:text-white font-bold text-lg leading-tight hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {article?.title}
                    </Link>
                  ) : (
                    <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight">
                      {article?.title}
                    </h3>
                  )}

                  {/* Summary - clickable */}
                  {(article?.url || article?.sourceUrl) ? (
                    <Link
                      href={article.url || article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 flex-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {article?.summary}
                    </Link>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 flex-1">
                      {article?.summary}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {article?.readTime || ''}
                    </div>
                    {(article?.url || article?.sourceUrl) && (
                      <Link
                        href={article.url || article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {t('readMore')}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-center items-center gap-2 mt-12">
              {page > 1 && (
                <Link
                  href={`/news?category=${currentCategory}&page=${page - 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600 hover:text-primary-600"
                >
                  Previous
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/news?category=${currentCategory}&page=${p}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    p === page
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600 hover:text-primary-600'
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < totalPages && (
                <Link
                  href={`/news?category=${currentCategory}&page=${page + 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600 hover:text-primary-600"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
