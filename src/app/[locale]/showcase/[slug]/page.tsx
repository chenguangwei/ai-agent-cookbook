import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, GitFork, ExternalLink, ArrowLeft, Globe } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { MDXRenderer } from '@/components/markdown';
import { getAllShowcaseProjects } from '@/lib/content';
import { getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/lib/utils';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const siteUrl = getSiteUrl();
  const projects = getAllShowcaseProjects(locale);
  const project = projects.find(p => p?.slug === slug);
  const path = `showcase/${slug}`;
  const canonicalUrl = locale === 'en' ? `${siteUrl}/${path}` : `${siteUrl}/${locale}/${path}`;

  return {
    title: project?.title,
    description: project?.description,
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

interface ShowcaseDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

function isValidUrl(url: string | null | undefined): url is string {
  return !!url && url !== '#' && url.startsWith('http');
}

async function getShowcaseProject(locale: string, slug: string) {
  const projects = await getAllShowcaseProjects(locale);
  return projects.find(p => p?.slug === slug) ?? null;
}

export default async function ShowcaseDetailPage({ params }: ShowcaseDetailPageProps) {
  const { locale, slug } = await params;
  const project = await getShowcaseProject(locale, slug);
  const t = await getTranslations('Showcase');

  if (!project || !project.body) {
    notFound();
  }

  const websiteUrl = isValidUrl(project.websiteUrl) ? project.websiteUrl : null;
  const demoUrl = isValidUrl(project.demoUrl) ? project.demoUrl : null;
  const repoUrl = isValidUrl(project.repoUrl) ? project.repoUrl : null;
  const hasActions = websiteUrl || demoUrl || repoUrl;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8 lg:py-12">
          {/* Back Button */}
          <Link
            href={`/${locale}/showcase`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToShowcase')}
          </Link>

          {/* Header */}
          <div className="mb-8">
            {/* Hero: Video takes priority over image */}
            {project.videoUrl ? (
              <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden mb-6">
                <iframe
                  src={project.videoUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${project.title} video`}
                />
              </div>
            ) : project.thumbnail ? (
              <div className="relative w-full aspect-[2/1] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden mb-6">
                <Image
                  src={project.thumbnail}
                  alt={project.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : null}

            {/* Title & Metadata */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-slate-900 dark:text-white text-4xl font-bold mb-3 font-display">
                  {project.title}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  {project.description}
                </p>
              </div>
              {project.stars != null && project.stars > 0 && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-xl font-bold">{project.stars.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Author */}
            {project.author && (
              <div className="flex items-center gap-3 mb-6">
                {project.author.avatar && (
                  <Image
                    src={project.author.avatar}
                    alt={project.author.name || ''}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Created by</p>
                  <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                    {project.author.name}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {project.tags.filter((t): t is string => t !== null).map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons - adaptive based on available URLs */}
            {hasActions && (
              <div className="flex flex-wrap gap-3">
                {websiteUrl && (
                  <Button asChild size="lg" className="bg-primary-600 hover:bg-primary-700">
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      {t('visitWebsite')}
                    </a>
                  </Button>
                )}
                {demoUrl && (
                  <Button
                    asChild
                    size="lg"
                    variant={websiteUrl ? 'outline' : 'default'}
                    className={websiteUrl ? '' : 'bg-primary-600 hover:bg-primary-700'}
                  >
                    <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('viewDemo')}
                    </a>
                  </Button>
                )}
                {repoUrl && (
                  <Button asChild variant="outline" size="lg">
                    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                      <GitFork className="w-4 h-4 mr-2" />
                      {t('viewRepo')}
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {project.body && (
            <article className="prose prose-slate dark:prose-invert max-w-none">
              <MDXRenderer content={project.body} />
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
