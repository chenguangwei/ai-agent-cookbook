'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ArrowUpRight, Clock, Eye, Share2, BookmarkPlus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import DOMPurify from 'dompurify';

interface NewsDetail {
    id: string;
    source_name?: string;
    title: string;
    content?: string;
    summary?: string;
    url: string;
    image_url?: string;
    author?: string;
    published_at?: string;
    word_count?: number;
    read_time_minutes?: number;
    quality_score?: number;
    language?: string;
}

export default function ArticleDetailPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const t = useTranslations('News');

    const [article, setArticle] = useState<NewsDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cleanHtml, setCleanHtml] = useState('');

    useEffect(() => {
        async function fetchArticle() {
            try {
                const res = await fetch(`/api/news/${id}`);
                if (!res.ok) throw new Error('Article not found');
                const data = await res.json();
                setArticle(data.article);

                // Safely purify HTML content
                if (data.article.content || data.article.summary) {
                    const rawHtml = data.article.content || data.article.summary;
                    // Run DOMPurify only on client-side
                    if (typeof window !== 'undefined') {
                        const purified = DOMPurify.sanitize(rawHtml, {
                            USE_PROFILES: { html: true },
                            ADD_ATTR: ['target']
                        });
                        // Ensure all links open in new tab
                        const htmlWithBlankTargets = purified.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
                        setCleanHtml(htmlWithBlankTargets);
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (id) fetchArticle();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
                </main>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <p className="mb-4">{error || t('noArticles')}</p>
                    <button
                        onClick={() => router.back()}
                        className="text-primary-600 hover:underline"
                    >
                        ← {t('backToNews')}
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-1000 text-slate-900 dark:text-slate-200">
            <Header />

            <main className="flex-1 max-w-[800px] w-full mx-auto px-4 py-8 md:py-12">

                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" /> {t('backToNews')}
                    </button>

                    <div className="flex items-center gap-3">
                        <button className="w-9 h-9 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button className="w-9 h-9 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <BookmarkPlus className="w-4 h-4" />
                        </button>
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-full transition-colors"
                        >
                            {t('readOriginal')} <ArrowUpRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Article Header */}
                <header className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center gap-2 mb-6 text-sm font-medium">
                        <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300">
                            {article.source_name || t('sourceUnknown')}
                        </span>
                        {article.author && (
                            <>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="text-slate-600 dark:text-slate-400">{article.author}</span>
                            </>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold font-serif leading-tight mb-8 text-slate-900 dark:text-white">
                        {article.title}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{article.published_at ? new Date(article.published_at).toLocaleDateString() : t('recentDate')}</span>
                        </div>

                        {(article.read_time_minutes || article.word_count) && (
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                <span>{t('estimatedRead', { time: article.read_time_minutes || Math.max(1, Math.floor((article.word_count || 1000) / 250)) })}</span>
                            </div>
                        )}

                        {article.quality_score && (
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 font-medium">
                                <span>{t('overallScore', { score: article.quality_score })}</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Hero Image if exists */}
                {article.image_url && !article.image_url.includes('favicon') && (
                    <div className="w-full aspect-video relative rounded-2xl overflow-hidden mb-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                )}

                {/* Reading Content Area using Tailwind Typography */}
                <article
                    className="prose prose-lg prose-slate dark:prose-invert max-w-none 
                      prose-headings:font-serif prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                      prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
                      prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
                      prose-img:rounded-xl prose-img:shadow-md
                      prose-pre:bg-slate-800 prose-pre:text-slate-50 prose-pre:border prose-pre:border-slate-700
                      prose-blockquote:border-l-primary-500 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-900/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:rounded-r-lg"
                    dangerouslySetInnerHTML={{ __html: cleanHtml }}
                />

                {/* End of article marker */}
                <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 mx-1"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 mx-1"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 mx-1"></div>
                </div>

            </main>

            <Footer />
        </div>
    );
}
