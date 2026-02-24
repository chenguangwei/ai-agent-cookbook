import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, PlayCircle, BookOpen } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { TutorialBadge } from '@/components/features/TutorialBadge';
import { getAllTutorials } from '@/lib/tina';
import { TUTORIAL_CATEGORIES, categoryIdToValue } from '@/lib/categories';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Tutorials',
  description: 'Explore our comprehensive collection of AI agent tutorials covering LangChain, CrewAI, AutoGPT, and more.',
  openGraph: {
    title: 'Explore AI Agent Tutorials | Agent Hub',
    description: 'Explore our comprehensive collection of AI agent tutorials covering LangChain, CrewAI, AutoGPT, and more.',
  },
};

interface ExplorePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; locale?: string; difficulty?: string }>;
}

export default async function ExplorePage({ params, searchParams }: ExplorePageProps) {
  const resolvedParams = await params;
  const search = await searchParams;
  const categoryParam = search.cat;
  const localeFilter = search.locale !== undefined ? search.locale : resolvedParams.locale;
  const difficultyFilter = search.difficulty;
  const t = await getTranslations('Explore');
  const tCat = await getTranslations('Categories');

  // Map category id (URL param) to category value (stored in content)
  const categoryValue = categoryParam ? categoryIdToValue[categoryParam] : null;
  const currentCategory = TUTORIAL_CATEGORIES.find(
    (c) => c.id === categoryParam
  );

  // Fetch and filter tutorials
  let tutorials = await getAllTutorials();

  if (categoryValue) {
    tutorials = tutorials.filter((t) => t?.category === categoryValue);
  }
  if (localeFilter) {
    tutorials = tutorials.filter((t) => t?.locale === localeFilter);
  }
  if (difficultyFilter) {
    tutorials = tutorials.filter((t) => t?.difficulty === difficultyFilter);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          <div className="flex gap-8">
            {/* Sidebar */}
            <Suspense fallback={<div className="w-64 flex-shrink-0" />}>
              <Sidebar />
            </Suspense>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Category Header */}
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
                  currentParams={search}
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
                  currentParams={search}
                />
                <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                  {t('tutorialsCount', { count: tutorials.length })}
                </div>
              </div>

              {/* Tutorials Grid */}
              {tutorials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {tutorials.map((tutorial) => (
                    <Link
                      href={`/tutorial/${tutorial?.slug}`}
                      key={tutorial?.id}
                      className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
                    >
                      {/* Thumbnail */}
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

                      {/* Content */}
                      <div className="flex flex-col gap-3 p-5">
                        {/* Tags */}
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

                        {/* Title */}
                        <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {tutorial?.title}
                        </h3>

                        {/* Description */}
                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                          {tutorial?.description}
                        </p>

                        {/* Meta */}
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

// Server-side filter select component using links
function FilterSelect({
  name,
  defaultValue,
  options,
  currentParams,
}: {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  currentParams: Record<string, string | undefined>;
}) {
  return (
    <div className="relative">
      <select
        className="h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        defaultValue={defaultValue || ''}
      >
        {options.map((option) => {
          const newParams = new URLSearchParams();
          Object.entries(currentParams).forEach(([k, v]) => {
            if (v && k !== name) newParams.set(k, v);
          });
          if (option.value) newParams.set(name, option.value);
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
