import { Suspense } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { getAllTools } from '@/lib/content';
import { TOOL_CATEGORIES, toolCategoryIdToValue, toolCategoryValueToId } from '@/lib/tool-categories';
import { getTranslations } from 'next-intl/server';
import { ToolCard } from './ToolCard';
import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agenthub.dev';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('Tools');
  const path = 'tools';
  const canonicalUrl = locale === 'en' ? `${siteUrl}/${path}` : `${siteUrl}/${locale}/${path}`;

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `${siteUrl}/${path}`,
        'zh': `${siteUrl}/zh/${path}`,
        'ja': `${siteUrl}/ja/${path}`,
      },
    },
  };
}

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

interface ToolsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; pricing?: string; sort?: string }>;
}

export default async function ToolsPage({ params, searchParams }: ToolsPageProps) {
  const { locale } = await params;
  const { cat: categoryParam, pricing: pricingFilter, sort: sortParam = 'alphabetical' } = await searchParams;

  const t = await getTranslations('Tools');
  const tCat = await getTranslations('ToolCategories');

  // Pre-compute category labels to avoid passing functions to Client Components
  const categoryLabels: Record<string, string> = {};
  for (const cat of TOOL_CATEGORIES) {
    categoryLabels[cat.id] = tCat(cat.i18nKey);
  }

  const categoryValue = categoryParam ? toolCategoryIdToValue[categoryParam] : null;
  const currentCategory = TOOL_CATEGORIES.find(c => c.id === categoryParam);

  let tools = getAllTools(locale);

  // Apply filters
  if (categoryValue) {
    tools = tools.filter(t => t?.category === categoryValue);
  }
  if (pricingFilter) {
    tools = tools.filter(t => t?.pricing === pricingFilter);
  }

  // Apply sorting
  if (sortParam === 'stars') {
    tools = tools.sort((a, b) => (b?.stars || 0) - (a?.stars || 0));
  } else if (sortParam === 'newest') {
    tools = tools.sort((a, b) => {
      const dateA = a?.date ? new Date(a.date).getTime() : 0;
      const dateB = b?.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  } else {
    tools = tools.sort((a, b) => (a?.title || '').localeCompare(b?.title || ''));
  }

  const buildFilterUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { cat: categoryParam, pricing: pricingFilter, sort: sortParam, ...overrides };
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    return `/${locale}/tools${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          <div className="flex gap-8">
            {/* Sidebar */}
            <Suspense fallback={<div className="w-64 flex-shrink-0 hidden lg:block" />}>
              <Sidebar />
            </Suspense>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              {currentCategory ? (
                <div className="mb-8">
                  <h1 className="text-slate-900 dark:text-white text-3xl font-bold mb-2 font-display">
                    {tCat(currentCategory.i18nKey)}
                  </h1>
                </div>
              ) : (
                <div className="mb-8">
                  <h1 className="text-slate-900 dark:text-white text-3xl font-bold mb-2 font-display">
                    {t('title')}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl">
                    {t('description')}
                  </p>
                </div>
              )}

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                {/* Pricing Filter */}
                <div className="flex items-center gap-1.5">
                  <Link
                    href={buildFilterUrl({ pricing: undefined })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !pricingFilter
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('allPricing')}
                  </Link>
                  {['Open Source', 'Free', 'Freemium', 'Paid'].map(p => (
                    <Link
                      key={p}
                      href={buildFilterUrl({ pricing: p })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        pricingFilter === p
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t(p === 'Open Source' ? 'openSource' : p === 'Free' ? 'free' : p === 'Freemium' ? 'freemium' : 'paid')}
                    </Link>
                  ))}
                </div>

                {/* Sort */}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">{t('sortBy')}:</span>
                  {(['alphabetical', 'stars', 'newest'] as const).map(s => (
                    <Link
                      key={s}
                      href={buildFilterUrl({ sort: s })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        sortParam === s
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t(s === 'alphabetical' ? 'sortAlphabetical' : s === 'stars' ? 'sortStars' : 'sortNewest')}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                {t('toolsCount', { count: tools.length })}
              </div>

              {/* Tools Grid */}
              {tools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {tools.filter(Boolean).map((tool) => {
                    const categoryId = tool!.category ? toolCategoryValueToId[tool!.category] : null;
                    const categoryLabel = categoryId ? categoryLabels[categoryId] : tool!.category;

                    return (
                      <ToolCard
                        key={tool!.slug}
                        tool={tool!}
                        locale={locale}
                        categoryLabel={categoryLabel || undefined}
                        websiteLabel={t('website')}
                        githubLabel={t('github')}
                        docsLabel={t('documentation')}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">
                    {t('noResults')}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t('noResultsDescription')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
