import Link from 'next/link';
import { BookOpen, ExternalLink, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MDXRenderer } from '@/components/markdown';
import { getAllDocs } from '@/lib/content';
import { getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/lib/utils';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('Docs');
  const siteUrl = getSiteUrl();
  const path = 'docs';
  const canonicalUrl = locale === 'en' ? `${siteUrl}/${path}` : `${siteUrl}/${locale}/${path}`;

  return {
    title: t('title'),
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

interface DocsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ doc?: string }>;
}

export default async function DocsPage({ params, searchParams }: DocsPageProps) {
  const { locale } = await params;
  const { doc: docSlug } = await searchParams;
  const t = await getTranslations('Docs');

  const docs = getAllDocs(locale);
  const categories = [...new Set(docs.map((d) => d.category).filter(Boolean))] as string[];
  const activeDoc = docs.find((d) => d.slug === docSlug) ?? docs[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          <div className="flex gap-8">
            {/* Left Sidebar - Navigation */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24">
                {/* Navigation */}
                <nav className="flex flex-col gap-6">
                  {categories.map((category) => (
                    <div key={category}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                        {category}
                      </h4>
                      <ul className="flex flex-col gap-1">
                        {docs.filter((doc) => doc.category === category).map((doc) => (
                          <li key={doc.slug}>
                            <Link
                              href={`?doc=${doc.slug}`}
                              className={`block w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeDoc?.slug === doc.slug
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {doc.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {activeDoc ? (
                <>
                  {/* Breadcrumb */}
                  <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                    <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400">
                      {t('home')}
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <Link href="/docs" className="hover:text-primary-600 dark:hover:text-primary-400">
                      {t('docs')}
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-slate-900 dark:text-white font-medium">
                      {activeDoc.title}
                    </span>
                  </nav>

                  {/* Document Content */}
                  <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                    <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white mb-8">
                      <BookOpen className="w-8 h-8 text-primary-600" />
                      {activeDoc.title}
                    </h1>

                    {activeDoc.body && (
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        <MDXRenderer content={activeDoc.body} />
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t('lastUpdated', {
                          date: activeDoc.lastUpdated
                            ? new Date(activeDoc.lastUpdated).toLocaleDateString()
                            : 'N/A',
                        })}
                      </div>
                      <a
                        href="#"
                        className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {t('editOnGithub')}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </article>
                </>
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-center py-16">
                  {t('noDocs')}
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
