import Image from 'next/image';
import Link from 'next/link';
import { Clock, ArrowUpRight, Rss } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getAllNews } from '@/lib/tina';
import { getTranslations } from 'next-intl/server';

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const articles = await getAllNews(locale);
  const t = await getTranslations('News');

  const categories = [
    { key: 'all', label: t('all') },
    { key: 'Tech', label: t('tech') },
    { key: 'Research', label: t('research') },
    { key: 'Industry', label: t('industry') },
  ];

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
            {categories.map((category) => (
              <button
                key={category.key}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category.key === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600 hover:text-primary-600'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <article
                key={article?.id}
                className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300"
              >
                {/* Image */}
                {article?.imageUrl && (
                  <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col gap-3 p-5 flex-1">
                  {/* Source & Time */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-primary-600 dark:text-primary-400">
                      {article?.source}
                    </span>
                    <span>
                      {article?.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : ''}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight">
                    {article?.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 flex-1">
                    {article?.summary}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {article?.readTime}
                    </div>
                    {article?.sourceUrl && (
                      <Link
                        href={article.sourceUrl}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
