import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, GitFork, ExternalLink, ArrowRight, Globe } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { getAllShowcaseProjects } from '@/lib/content';
import { getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/lib/utils';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('Showcase');
  const siteUrl = getSiteUrl();
  const path = 'showcase';
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

function isValidUrl(url: string | null | undefined): url is string {
  return !!url && url !== '#' && url.startsWith('http');
}

interface ShowcasePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string }>;
}

export default async function ShowcasePage({ params, searchParams }: ShowcasePageProps) {
  const { locale } = await params;
  const { tag } = await searchParams;
  let projects = getAllShowcaseProjects(locale);
  const t = await getTranslations('Showcase');

  if (tag) {
    projects = projects.filter(p =>
      (p?.tags || []).some(t => t === tag)
    );
  }

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
              <div className="mb-8">
                <h1 className="text-slate-900 dark:text-white text-3xl font-bold mb-2 font-display">
                  {t('title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl">
                  {t('description')}
                </p>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project) => {
                  const hasDetailPage = !!project?.body;
                  const websiteUrl = isValidUrl(project?.websiteUrl) ? project.websiteUrl : null;
                  const demoUrl = isValidUrl(project?.demoUrl) ? project.demoUrl : null;
                  const repoUrl = isValidUrl(project?.repoUrl) ? project.repoUrl : null;
                  const CardWrapper = hasDetailPage
                    ? ({ children }: { children: React.ReactNode }) => (
                        <Link href={`/${locale}/showcase/${project?.slug}`}>
                          {children}
                        </Link>
                      )
                    : ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

                  return (
                    <CardWrapper key={project?.slug}>
                      <div
                        className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 ${
                          hasDetailPage ? 'cursor-pointer hover:border-primary-400' : ''
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
                          {project?.thumbnail && (
                            <Image
                              src={project.thumbnail}
                              alt={project.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          )}
                          {hasDetailPage && (
                            <div className="absolute top-3 right-3">
                              <span className="px-2 py-1 rounded-lg bg-primary-600 text-white text-xs font-bold">
                                {t('caseStudy')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-4 p-5">
                          {/* Author */}
                          {project?.author && (
                            <div className="flex items-center gap-3">
                              {project.author.avatar && (
                                <Image
                                  src={project.author.avatar}
                                  alt={project.author.name || ''}
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                />
                              )}
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {project.author.name}
                              </span>
                            </div>
                          )}

                          {/* Title & Description */}
                          <div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">
                              {project?.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                              {project?.description}
                            </p>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2">
                            {(project?.tags || []).filter((t): t is string => t !== null).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            {project?.stars != null && project.stars > 0 ? (
                              <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="font-medium">{project.stars.toLocaleString()}</span>
                              </div>
                            ) : (
                              <div />
                            )}
                            {hasDetailPage ? (
                              <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
                                {t('readMore')}
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                {websiteUrl && (
                                  <Button
                                    size="sm"
                                    className="bg-primary-600 hover:bg-primary-700"
                                    asChild
                                  >
                                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                                      <Globe className="w-4 h-4 mr-1" />
                                      {t('website')}
                                    </a>
                                  </Button>
                                )}
                                {demoUrl && (
                                  <Button
                                    size="sm"
                                    variant={websiteUrl ? 'outline' : 'default'}
                                    className={websiteUrl ? '' : 'bg-primary-600 hover:bg-primary-700'}
                                    asChild
                                  >
                                    <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      {t('demo')}
                                    </a>
                                  </Button>
                                )}
                                {repoUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                                      <GitFork className="w-4 h-4 mr-1" />
                                      {t('fork')}
                                    </a>
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardWrapper>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
