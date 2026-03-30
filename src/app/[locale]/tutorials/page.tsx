import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, PlayCircle, BookOpen, ChevronLeft, ChevronRight, Tag, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { TutorialBadge } from '@/components/features/TutorialBadge';
import { FilterSelect } from '@/components/features/FilterSelect';
import { getAllTutorials } from '@/lib/content';
import { TUTORIAL_CATEGORIES, categoryIdToValue } from '@/lib/categories';
import { getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/lib/utils';
import type { Metadata } from 'next';

const ITEMS_PER_PAGE = 50;

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const resolvedLocale = locale || 'en';

  const canonicalUrl = resolvedLocale === 'en'
    ? `${siteUrl}/tutorials`
    : `${siteUrl}/${resolvedLocale}/tutorials`;

  return {
    title: 'Explore Tutorials',
    description: 'Explore our comprehensive collection of AI agent tutorials covering LangChain, CrewAI, AutoGPT, and more.',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `${siteUrl}/tutorials`,
        'zh': `${siteUrl}/zh/tutorials`,
        'ja': `${siteUrl}/ja/tutorials`,
      },
    },
    openGraph: {
      title: 'Explore AI Agent Tutorials | Agent Hub',
      description: 'Explore our comprehensive collection of AI agent tutorials covering LangChain, CrewAI, AutoGPT, and more.',
    },
  };
}

interface ExplorePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; locale?: string; difficulty?: string; page?: string; tag?: string }>;
}

export default async function ExplorePage({ params, searchParams }: ExplorePageProps) {
  const resolvedParams = await params;
  const search = await searchParams;
  const locale = resolvedParams.locale || 'en';
  const categoryParam = search.cat;
  const localeFilter = search.locale !== undefined ? search.locale : (locale);
  const difficultyFilter = search.difficulty;
  const tagFilter = search.tag;
  const currentPage = parseInt(search.page || '1', 10);
  const t = await getTranslations('Explore');
  const tCat = await getTranslations('Categories');
  const tHome = await getTranslations('Home');

  const categoryValue = categoryParam ? categoryIdToValue[categoryParam] : null;
  const currentCategory = TUTORIAL_CATEGORIES.find(
    (c) => c.id === categoryParam
  );

  let tutorials = getAllTutorials(localeFilter);

  // Get all unique tags for the tag filter
  const allTags = new Set<string>();
  tutorials.forEach((tutorial) => {
    if (tutorial?.tags) {
      tutorial.tags.filter((tag): tag is string => tag !== null).forEach((tag) => {
        allTags.add(tag);
      });
    }
  });
  const sortedTags = Array.from(allTags).sort();

  if (categoryValue) {
    tutorials = tutorials.filter((t) => t?.category === categoryValue);
  }
  if (localeFilter) {
    tutorials = tutorials.filter((t) => t?.locale === localeFilter);
  }
  if (difficultyFilter) {
    tutorials = tutorials.filter((t) => t?.difficulty === difficultyFilter);
  }
  if (tagFilter) {
    tutorials = tutorials.filter((t) =>
      t?.tags?.some((tag): boolean => tag !== null && tag === tagFilter)
    );
  }

  const totalItems = tutorials.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTutorials = tutorials.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          <div className="flex gap-8">
            <Suspense fallback={<div className="w-64 flex-shrink-0" />}>
              <Sidebar />
            </Suspense>
            <div className="flex-1 min-w-0">
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
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t('description')}
                  </p>
                </div>
              )}

              {/* Tags Filter Bar */}
              {sortedTags.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-4 h-4 text-slate-400" />
                    {/* All option - default when no tag is selected */}
                    <Link
                      key="all"
                      href={`?${new URLSearchParams({
                        ...(categoryParam && { cat: categoryParam }),
                        ...(localeFilter && { locale: localeFilter }),
                        ...(difficultyFilter && { difficulty: difficultyFilter }),
                      }).toString()}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        !tagFilter
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400'
                      }`}
                    >
                      All
                    </Link>
                    {sortedTags.map((tag) => (
                      <Link
                        key={tag}
                        href={`?${new URLSearchParams({
                          ...(categoryParam && { cat: categoryParam }),
                          ...(localeFilter && { locale: localeFilter }),
                          ...(difficultyFilter && { difficulty: difficultyFilter }),
                          ...(tagFilter !== tag && { tag: tag }),
                        }).toString()}`}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          tagFilter === tag
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400'
                        }`}
                      >
                        {tag}
                        {tagFilter === tag && <X className="w-3 h-3" />}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                <FilterSelect
                  name="locale"
                  defaultValue={localeFilter}
                  options={[
                    { value: '', label: t('allLanguages') },
                    { value: 'en', label: t('english') },
                    { value: 'zh', label: t('chinese') },
                    { value: 'ja', label: t('japanese') },
                  ]}
                />
                <FilterSelect
                  name="difficulty"
                  defaultValue={difficultyFilter}
                  options={[
                    { value: '', label: t('allLevels') },
                    { value: 'Beginner', label: t('beginner') },
                    { value: 'Intermediate', label: t('intermediate') },
                    { value: 'Advanced', label: t('advanced') },
                  ]}
                />
                <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                  {t('tutorialsCount', { count: totalItems })}
                </div>
              </div>

              {paginatedTutorials.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedTutorials.map((tutorial) => (
                    <Link
                      href={`/${locale}/tutorial/${tutorial?.slug}`}
                      key={tutorial?.slug}
                      className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
                    >
                      <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
                        {tutorial?.thumbnail && (
                          <Image
                            src={tutorial.thumbnail}
                            alt={tutorial.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        )}
                        {tutorial?.videoUrl && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle className="w-12 h-12 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 p-5">
                        <div className="flex flex-wrap gap-2">
                          {(tutorial?.techStack || []).filter((t): t is string => t !== null).slice(0, 2).map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {tutorial?.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                          {tutorial?.description}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            {tutorial?.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {tutorial.duration}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <TutorialBadge type="difficulty" value={tutorial?.difficulty || 'Beginner'} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  </div>

                  {totalPages > 1 && (() => {
                    const buildHref = (p: number) => `?${new URLSearchParams({
                      ...(categoryParam && { cat: categoryParam }),
                      ...(localeFilter && { locale: localeFilter }),
                      ...(difficultyFilter && { difficulty: difficultyFilter }),
                      ...(tagFilter && { tag: tagFilter }),
                      page: String(p),
                    }).toString()}`;

                    const pageNumbers: (number | '…')[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
                    } else {
                      pageNumbers.push(1);
                      if (currentPage > 3) pageNumbers.push('…');
                      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                        pageNumbers.push(i);
                      }
                      if (currentPage < totalPages - 2) pageNumbers.push('…');
                      pageNumbers.push(totalPages);
                    }

                    return (
                      <div className="flex flex-col items-center gap-3 mt-12">
                        <div className="flex items-center gap-1">
                          {currentPage > 1 ? (
                            <Link
                              href={buildHref(currentPage - 1)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Link>
                          ) : (
                            <span className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed">
                              <ChevronLeft className="w-4 h-4" />
                            </span>
                          )}

                          {pageNumbers.map((p, i) =>
                            p === '…' ? (
                              <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm select-none">
                                …
                              </span>
                            ) : (
                              <Link
                                key={p}
                                href={buildHref(p)}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                  p === currentPage
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400'
                                }`}
                              >
                                {p}
                              </Link>
                            )
                          )}

                          {currentPage < totalPages ? (
                            <Link
                              href={buildHref(currentPage + 1)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          ) : (
                            <span className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed">
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-600">
                          {tHome('pageOf', { current: currentPage, total: totalPages })}
                        </p>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
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
