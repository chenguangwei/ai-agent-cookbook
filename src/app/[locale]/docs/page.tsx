'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, ExternalLink, BookOpen } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import type { TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { TinaMarkdownRendererClient } from '@/components/markdown';
import { useTranslations, useLocale } from 'next-intl';

interface DocItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  lastUpdated?: string | null;
  body?: TinaMarkdownContent | null;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocItem | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations('Docs');
  const locale = useLocale();

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch(`/api/docs?locale=${locale}`);
        const data = await res.json();
        setDocs(data);
        if (data.length > 0) {
          setActiveDoc(data[0]);
        }
      } catch {
        // Fallback empty
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [locale]);

  // Group docs by category
  const categories = [...new Set(docs.map((doc) => doc.category))];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-slate-500">{t('loading')}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          <div className="flex gap-8">
            {/* Left Sidebar - Navigation */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24">
                {/* Search */}
                <div className="mb-6">
                  <label className="flex items-center w-full h-10 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-3 focus-within:ring-2 focus-within:ring-primary-500">
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                      className="flex-1 bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                      placeholder={t('searchPlaceholder')}
                    />
                  </label>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-6">
                  {categories.map((category) => (
                    <div key={category}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                        {category}
                      </h4>
                      <ul className="flex flex-col gap-1">
                        {docs.filter((doc) => doc.category === category).map((doc) => (
                          <li key={doc.id}>
                            <button
                              onClick={() => setActiveDoc(doc)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeDoc?.id === doc.id
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {doc.title}
                            </button>
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
              {activeDoc && (
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
                    <div>
                      <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white mb-8">
                        <BookOpen className="w-8 h-8 text-primary-600" />
                        {activeDoc.title}
                      </h1>

                      {activeDoc.body && (
                        <TinaMarkdownRendererClient content={activeDoc.body} />
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t('lastUpdated', { date: activeDoc.lastUpdated
                          ? new Date(activeDoc.lastUpdated).toLocaleDateString()
                          : 'N/A' })}
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
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
