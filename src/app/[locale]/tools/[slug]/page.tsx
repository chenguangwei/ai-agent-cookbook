import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ExternalLink, ArrowLeft, BookOpen, Github } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllTools } from '@/lib/tina';
import { getTranslations } from 'next-intl/server';

interface ToolDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

function isValidUrl(url: string | null | undefined): url is string {
  return !!url && url !== '#' && url.startsWith('http');
}

async function getTool(locale: string, slug: string) {
  const tools = await getAllTools(locale);
  return tools.find(t => t?.slug === slug) ?? null;
}

// Custom MDX components for tool content
const toolMdxComponents = {
  // Enhanced code block with syntax highlighting and copy button
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="relative overflow-x-auto rounded-lg bg-slate-900 p-4 my-4">
      {children}
    </pre>
  ),
  // Enhanced links
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => {
    if (href && isValidUrl(href)) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {children}
        </a>
      );
    }
    return <span className="text-primary-600 dark:text-primary-400">{children}</span>;
  },
  // Enhanced images
  img: ({ src, alt }: { src?: string; alt?: string }) => {
    if (src) {
      return (
        <span className="block my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ''}
            className="max-w-full h-auto rounded-lg"
            loading="lazy"
          />
        </span>
      );
    }
    return null;
  },
};

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { locale, slug } = await params;
  const tool = await getTool(locale, slug);
  const t = await getTranslations('Tools');

  if (!tool) {
    notFound();
  }

  const websiteUrl = isValidUrl(tool.websiteUrl) ? tool.websiteUrl : null;
  const repoUrl = isValidUrl(tool.repoUrl) ? tool.repoUrl : null;
  const docsUrl = isValidUrl(tool.docsUrl) ? tool.docsUrl : null;
  const hasActions = websiteUrl || repoUrl || docsUrl;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8 lg:py-12">
          {/* Back Button */}
          <Link
            href={`/${locale}/tools`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToTools')}
          </Link>

          {/* Header */}
          <div className="mb-8">
            {/* Logo */}
            <div className="relative w-full aspect-[3/1] bg-gradient-to-br from-primary-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden mb-6 flex items-center justify-center p-8">
              {tool.logoUrl ? (
                <Image
                  src={tool.logoUrl}
                  alt={tool.title}
                  width={200}
                  height={200}
                  className="object-contain max-h-32"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-5xl font-bold text-primary-600 dark:text-primary-400">
                    {tool.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-slate-900 dark:text-white text-4xl font-bold mb-3 font-display">
                  {tool.title}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  {tool.description}
                </p>
              </div>
              {tool.stars != null && tool.stars > 0 && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 flex-shrink-0">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-xl font-bold">{tool.stars.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3 mb-6">
              {tool.category && (
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium">
                  {tool.category}
                </span>
              )}
              {tool.pricing && (
                <span className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-bold">
                  {tool.pricing}
                </span>
              )}
              {tool.license && (
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium">
                  {tool.license}
                </span>
              )}
            </div>

            {/* Tags */}
            {tool.tags && tool.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {tool.tags.filter((t): t is string => t !== null).map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {hasActions && (
              <div className="flex flex-wrap gap-3">
                {websiteUrl && (
                  <Button asChild size="lg" className="bg-primary-600 hover:bg-primary-700">
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('viewWebsite')}
                    </a>
                  </Button>
                )}
                {docsUrl && (
                  <Button
                    asChild
                    size="lg"
                    variant={websiteUrl ? 'outline' : 'default'}
                    className={websiteUrl ? '' : 'bg-primary-600 hover:bg-primary-700'}
                  >
                    <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="w-4 h-4 mr-2" />
                      {t('viewDocs')}
                    </a>
                  </Button>
                )}
                {repoUrl && (
                  <Button asChild variant="outline" size="lg">
                    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4 mr-2" />
                      {t('viewRepo')}
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {tool.body && (
            <article className="prose prose-slate dark:prose-invert max-w-none">
              <Suspense fallback={<div>Loading content...</div>}>
                <MDXRemote source={tool.body} components={toolMdxComponents} />
              </Suspense>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
