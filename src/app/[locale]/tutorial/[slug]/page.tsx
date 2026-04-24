import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Clock, Play, ChevronLeft, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TutorialBadge } from '@/components/features/TutorialBadge';
import { TableOfContents } from '@/components/features/TableOfContents';
import { MDXRenderer } from '@/components/markdown';
import { getAllTutorials, getTutorialLocalesBySlug } from '@/lib/content';
import { getTranslations } from 'next-intl/server';
import { buildLocaleAlternates, getCanonicalUrl, getLocaleDateFormat, getLocalizedPath, getSiteUrl, SITE_NAME } from '@/lib/utils';
import type { Metadata } from 'next';

interface TutorialPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateStaticParams() {
  const tutorials = await getAllTutorials();
  return tutorials.map((tutorial) => ({
    slug: tutorial?.slug,
  }));
}

export async function generateMetadata({ params }: TutorialPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const tutorial = (await getAllTutorials(locale)).find((t) => t?.slug === slug);
  const t = await getTranslations('Tutorial');

  if (!tutorial) {
    return {
      title: t('notFound'),
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const availableLocales = getTutorialLocalesBySlug(slug);

  return {
    title: tutorial.title,
    description: tutorial.description,
    keywords: [...(tutorial.tags || []), ...(tutorial.techStack || []), tutorial.category].filter((k): k is string => k !== null && k !== undefined),
    alternates: {
      canonical: getCanonicalUrl(locale, `tutorial/${slug}`),
      languages: buildLocaleAlternates(`tutorial/${slug}`, availableLocales),
    },
    openGraph: {
      title: tutorial.title,
      description: tutorial.description,
      type: 'article',
      publishedTime: tutorial.date,
      images: tutorial.thumbnail ? [tutorial.thumbnail] : [],
      tags: (tutorial.tags || []).filter((t): t is string => t !== null),
    },
    twitter: {
      card: 'summary_large_image',
      title: tutorial.title,
      description: tutorial.description,
      images: tutorial.thumbnail ? [tutorial.thumbnail] : [],
    },
  };
}

export default async function TutorialPage({ params }: TutorialPageProps) {
  const { slug, locale } = await params;
  const tutorials = await getAllTutorials(locale);
  const tutorial = tutorials.find((t) => t?.slug === slug);
  const t = await getTranslations('Tutorial');

  if (!tutorial) {
    notFound();
  }

  // Find adjacent tutorials for navigation
  const currentIndex = tutorials.findIndex((t) => t?.slug === slug);
  const prevTutorial = currentIndex > 0 ? tutorials[currentIndex - 1] : null;
  const nextTutorial = currentIndex < tutorials.length - 1 ? tutorials[currentIndex + 1] : null;

  const siteUrl = getSiteUrl();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: tutorial.title,
    description: tutorial.description,
    ...(tutorial.thumbnail && { image: tutorial.thumbnail }),
    ...(tutorial.date && { datePublished: tutorial.date }),
    inLanguage: locale,
    url: getCanonicalUrl(locale, `tutorial/${slug}`),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
    },
    keywords: [...(tutorial.tags || []), ...(tutorial.techStack || []), tutorial.category]
      .filter((k): k is string => !!k)
      .join(', '),
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
            <Link href={getLocalizedPath(locale)} className="hover:text-primary-600 dark:hover:text-primary-400">
              {t('home')}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={getLocalizedPath(locale, 'tutorials')} className="hover:text-primary-600 dark:hover:text-primary-400">
              {t('tutorials')}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium truncate max-w-xs">
              {tutorial.title}
            </span>
          </nav>

          <div className="flex gap-12">
            {/* Main Content */}
            <article className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-8 lg:px-12 py-10">
              {/* Title Section */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-2 mb-4">
                  <TutorialBadge type="difficulty" value={tutorial.difficulty || 'Beginner'} />
                  {tutorial.videoUrl && (
                    <TutorialBadge type="format" value="Video" />
                  )}
                  {tutorial.featured && (
                    <span className="px-2 py-0.5 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold uppercase tracking-wider">
                      {t('featured')}
                    </span>
                  )}
                </div>
                <h1 className="text-slate-900 dark:text-white text-4xl font-bold mb-4 font-display">
                  {tutorial.title}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-6">
                  {tutorial.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  {tutorial.date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <time dateTime={tutorial.date}>
                        {new Date(tutorial.date).toLocaleDateString(getLocaleDateFormat(locale), { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                    </div>
                  )}
                  {tutorial.duration && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {tutorial.duration}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 ml-auto">
                    {(tutorial.techStack || []).filter((t): t is string => t !== null).map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Video Player (if has video URL) */}
              {tutorial.videoUrl && tutorial.thumbnail && (
                <div className="mb-8 aspect-video rounded-2xl overflow-hidden bg-slate-900 relative group">
                  <Image
                    src={tutorial.thumbnail}
                    alt={tutorial.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <button className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </button>
                  </div>
                </div>
              )}

              {/* MDX Content — strip leading h1 to avoid repeating the page title */}
              <div className="mb-12">
                {tutorial.body && (
                  <MDXRenderer content={tutorial.body.replace(/^\s*#\s+.+\n?/, '')} />
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800">
                {prevTutorial ? (
                  <Link
                    href={getLocalizedPath(locale, `tutorial/${prevTutorial.slug}`)}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-xs uppercase tracking-wider opacity-70">{t('previous')}</div>
                      <div className="font-medium">{prevTutorial.title}</div>
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
                {nextTutorial && (
                  <Link
                    href={getLocalizedPath(locale, `tutorial/${nextTutorial.slug}`)}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-right"
                  >
                    <div>
                      <div className="text-xs uppercase tracking-wider opacity-70">{t('next')}</div>
                      <div className="font-medium">{nextTutorial.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              </div>{/* end px-8 wrapper */}
            </article>

            {/* Right Sidebar - Table of Contents */}
            <aside className="w-64 flex-shrink-0 hidden xl:block">
              <div className="sticky top-24">
                <TableOfContents />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
