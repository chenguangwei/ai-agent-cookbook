'use client';

import { useEffect, useState, use } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, Rss, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

// Types
interface NewsItem {
  id: string;
  source_id: string;
  source_name?: string;
  title: string;
  summary?: string;
  url: string;
  image_url?: string;
  author?: string;
  published_at?: string;
  is_featured: boolean;
  language?: string;
  word_count?: number;
  read_time_minutes?: number;
  quality_score?: number;
  ai_tag?: string;
  source_category?: string;
}

interface Source {
  id: string;
  name: string;
  category: string;
  language?: string;
  articleCount?: number;
}

type TabType = 'daily' | 'featured';

// Category labels - will be set after locale is available
let CATEGORIES: { key: string; label: string }[] = [];

export default function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('News');

  // Initialize categories based on locale
  CATEGORIES = [
    { key: 'all', label: t('all') },
    { key: 'Articles', label: t('articles') },
    { key: 'Podcasts', label: t('podcasts') },
    { key: 'Twitters', label: t('twitters') },
    { key: 'Videos', label: t('videos') },
  ];

  // State
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<NewsItem[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState(locale);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Build URL with params
  const buildUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    return `/news?${params.toString()}`;
  };

  // Fetch articles
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));

      if (category !== 'all') params.set('category', category);
      if (selectedDate) params.set('date', selectedDate);
      if (sourceFilter !== 'all') params.set('sourceId', sourceFilter);
      if (rangeFilter !== 'all') params.set('range', rangeFilter);
      if (languageFilter !== 'all') params.set('language', languageFilter);

      const res = await fetch(`/api/news/list?${params}`);
      const data = await res.json();
      setArticles(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch featured articles
  const fetchFeatured = async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');

      const res = await fetch(`/api/news/featured?${params}`);
      const data = await res.json();
      setFeaturedArticles(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch featured:', error);
    }
  };

  // Fetch dates
  const fetchDates = async () => {
    try {
      const res = await fetch('/api/news/dates');
      const data = await res.json();
      setDates(data.dates || []);
    } catch (error) {
      console.error('Failed to fetch dates:', error);
    }
  };

  // Fetch sources
  const fetchSources = async () => {
    try {
      const res = await fetch('/api/news/sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    // Read initial params from URL
    const tabParam = searchParams.get('tab');
    const categoryParam = searchParams.get('category');
    const dateParam = searchParams.get('date');
    const sourceParam = searchParams.get('source');
    const pageParam = searchParams.get('page');
    const rangeParam = searchParams.get('range');
    const languageParam = searchParams.get('language');

    if (tabParam === 'featured') setActiveTab('featured');
    if (categoryParam) setCategory(categoryParam);
    if (dateParam) setSelectedDate(dateParam);
    if (sourceParam) setSourceFilter(sourceParam);
    if (pageParam) setPage(parseInt(pageParam, 10));
    if (rangeParam) setRangeFilter(rangeParam);
    if (languageParam) setLanguageFilter(languageParam);

    fetchSources();
    fetchDates();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    if (activeTab === 'daily') {
      fetchArticles();
    } else {
      fetchFeatured();
    }
  }, [activeTab, category, selectedDate, sourceFilter, page, locale, rangeFilter, languageFilter]);

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    router.push(`/news?tab=${tab}`);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
    const url = buildUrl({ category: cat, page: null });
    router.push(url);
  };

  const handleDateChange = (date: string | null) => {
    setSelectedDate(date);
    setPage(1);
    const url = buildUrl({ date, page: null });
    router.push(url);
  };

  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
    setPage(1);
    const url = buildUrl({ source, page: null });
    router.push(url);
  };

  const handleRangeChange = (range: string) => {
    setRangeFilter(range);
    setSelectedDate(null); // Clear specific date if choosing a range
    setPage(1);
    const url = buildUrl({ range, date: null, page: null });
    router.push(url);
  };

  const handleLanguageFilterChange = (lang: string) => {
    setLanguageFilter(lang);
    setPage(1);
    const url = buildUrl({ language: lang, page: null });
    router.push(url);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const url = buildUrl({ page: String(newPage) });
    router.push(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const loc = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';
    return date.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr: string) => {
    const loc = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';
    return new Date(dateStr).toLocaleDateString(loc, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Category-specific placeholder images
  const PLACEHOLDER_MAP: Record<string, string> = {
    'Articles': '/images/placeholders/article.png',
    'Videos': '/images/placeholders/video.png',
    'Podcasts': '/images/placeholders/podcast.png',
    'Twitters': '/images/placeholders/twitter.png',
  };

  // Render image for article
  const renderImage = (article: NewsItem, size: 'small' | 'large' = 'small') => {
    let imageUrl = article.image_url;

    if (!imageUrl && article.summary) {
      // Try to extract image from summary HTML
      const imgMatch = article.summary.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) imageUrl = imgMatch[1];
    }

    // Use category-specific placeholder if no image found
    const finalSrc = imageUrl || PLACEHOLDER_MAP[article.source_category || 'Articles'] || PLACEHOLDER_MAP['Articles'];

    return (
      <Image
        src={finalSrc}
        alt={article.title}
        width={size === 'small' ? 160 : 128}
        height={size === 'small' ? 120 : 96}
        className={`object-cover flex-shrink-0 rounded-lg ${size === 'small' ? 'w-[160px] h-[120px]' : 'w-32 h-24'}`}
        unoptimized
      />
    );
  };


  // Strip HTML for summary display
  const stripHtml = (html?: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200">
      <Header />

      <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 py-8">

        {/* Header and Top Filters - Matching Screenshot */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-serif whitespace-nowrap">{t('title')}</h1>

            {/* Tabs as pills next to title */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg ml-4">
              <button
                onClick={() => handleTabChange('daily')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                {t('dailyNews')}
              </button>
              <button
                onClick={() => handleTabChange('featured')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'featured'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                {t('featuredNews')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Filter Buttons like screenshot */}
            <select
              className="h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-no-repeat bg-[position:right_0.75rem_center]"
              value={rangeFilter}
              onChange={(e) => handleRangeChange(e.target.value)}
            >
              <option value="24h">{t('past24h')}</option>
              <option value="week">{t('pastWeek')}</option>
              <option value="month">{t('pastMonth')}</option>
              <option value="all">{t('allTime')}</option>
            </select>

            <select
              className="h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-no-repeat bg-[position:right_0.75rem_center]"
              value={languageFilter}
              onChange={(e) => handleLanguageFilterChange(e.target.value)}
            >
              <option value="all">{t('allLanguages')}</option>
              {/* @ts-ignore */}
              <option value="zh">{t('chinese')}</option>
              {/* @ts-ignore */}
              <option value="en">{t('english')}</option>
            </select>

            <button
              onClick={() => { setCategory('all'); setSourceFilter('all'); setSelectedDate(null); setRangeFilter('all'); setLanguageFilter('all'); }}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <span className="text-lg leading-none">&times;</span> {t('clearFilters')}
            </button>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition-all border ${
                category === cat.key
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              {cat.key === 'all' ? t('allCategories') : cat.label}
            </button>
          ))}
        </div>

        {/* Main Content Area - Split into Left (Articles) and Right (Sources Sidebar) */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left Side: Article List */}
          <div className="flex-1 w-full min-w-0">
            {loading ? (
              <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : articles.length === 0 && activeTab === 'daily' || featuredArticles.length === 0 && activeTab === 'featured' ? (
              <div className="text-center py-20 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Rss className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('noArticles')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(activeTab === 'daily' ? articles : featuredArticles).map((article, idx) => {
                  const summaryText = stripHtml(article.summary);
                  // Use real data from backend, fallback if not yet processed
                  const wordCount = article.word_count || Math.floor((summaryText.length || 2000) * 3);
                  const readTime = article.read_time_minutes || Math.max(1, Math.floor(wordCount / 200));
                  // Deterministic fallback score based on article id to avoid hydration mismatch
                  const fallbackScore = 80 + (article.id.charCodeAt(0) % 15);
                  const score = article.quality_score || fallbackScore;

                  return (
                    <article key={article.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col sm:flex-row gap-5">

                      {/* Image - Left Side */}
                      <div className="flex-shrink-0 relative group">
                        <a href={`/${locale}/news/${article.id}`} className="block overflow-hidden rounded-lg">
                          {renderImage(article, 'small')}
                        </a>
                        {article.is_featured && (
                          <div className="absolute top-1 right-1 bg-orange-500 text-white p-1 rounded-full shadow-md">
                            <Star className="w-3 h-3 fill-current" />
                          </div>
                        )}
                      </div>

                      {/* Content - Right Side */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <a href={`/${locale}/news/${article.id}`} className="group">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {article.title}
                          </h2>
                        </a>

                        {/* Meta Info row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400 mb-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 dark:text-slate-300">((•))</span>
                            <span className="text-slate-700 dark:text-slate-300">{article.source_name || t('sourceUnknown')}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 opacity-70" />
                            <time>{article.published_at ? formatDate(article.published_at) : '...'}</time>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="opacity-70">⏱</span>
                            <span>{wordCount} {t('words')} (~{readTime} {t('minutes')})</span>
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto sm:ml-0 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded text-xs border border-yellow-200 dark:border-yellow-800">
                            <span className="font-bold">{score}</span>
                            <div className="flex">
                              <Star className="w-3 h-3 fill-current" />
                              <Star className="w-3 h-3 fill-current" />
                              <Star className="w-3 h-3 fill-current" />
                              <Star className="w-3 h-3 fill-current" />
                              <Star className="w-3 h-3 fill-current opacity-30" />
                            </div>
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4">
                          {summaryText || t('noSummary')}
                        </p>

                        {/* Tags at bottom */}
                        <div className="flex flex-wrap items-center gap-2 mt-auto">
                          {/* Category Tag */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <span className="w-2 h-2 rounded-sm bg-blue-500/20 text-blue-500 pb-2 flex items-center justify-center">□</span> {
                              CATEGORIES.find(c => c.key === category)?.label || t('all')
                            }
                          </span>

                          {/* Language Tag */}
                          {article.language && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                              ⚑ {article.language === 'zh' ? t('chinese') : t('english')}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                            ❖ {article.ai_tag || t('mediaTag')}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* Pagination */}
                {total > PAGE_SIZE && (
                  <div className="flex justify-center gap-1 pt-4 pb-8">
                    <Button variant="outline" size="icon" disabled={page === 1} onClick={() => handlePageChange(page - 1)} className="w-9 h-9 rounded-lg">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {/* Simplified page numbers for UI */}
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pNum = i + 1;
                      if (totalPages > 5 && page > 3) {
                        pNum = page - 2 + i;
                        if (pNum > totalPages) return null;
                      }
                      return (
                        <Button
                          key={`page-${pNum}`}
                          variant={page === pNum ? "default" : "outline"}
                          className={`w-9 h-9 rounded-lg ${page === pNum ? 'bg-primary-600 hover:bg-primary-700' : ''}`}
                          onClick={() => handlePageChange(pNum)}
                        >
                          {pNum}
                        </Button>
                      )
                    })}
                    {totalPages > 5 && page < totalPages - 2 && (
                      <span className="flex items-center justify-center w-9 h-9 text-slate-400">...</span>
                    )}
                    <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)} className="w-9 h-9 rounded-lg">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Source Filters (Sidebar) */}
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-8">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">{t('subscribedSources')}</h3>

              <div className="space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {/* All Sources Tag */}
                <button
                  onClick={() => handleSourceChange('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${sourceFilter === 'all'
                    ? 'bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    <Rss className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('all')}</span>
                </button>

                {/* Individual Source Tags */}
                {sources.map((source, idx) => {
                  // Generate reliable distinct colors/initials based on source name
                  const colors = ['bg-blue-500', 'bg-red-500', 'bg-emerald-500', 'bg-purple-500', 'bg-sky-500', 'bg-amber-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'];
                  const colorClass = colors[source.id.length % colors.length] || colors[0];
                  const initial = source.name.charAt(0).toUpperCase();

                  return (
                    <button
                      key={source.id}
                      onClick={() => handleSourceChange(source.id)}
                      className={`group w-full flex items-start flex-col gap-1.5 px-3 py-3 rounded-xl transition-all border ${sourceFilter === source.id
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold leading-none flex-shrink-0 ${colorClass}`}>
                          {initial}
                        </div>
                        <span className="line-clamp-1 break-all text-sm font-medium">{source.name}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-8 opacity-60 group-hover:opacity-100 transition-opacity">
                        {source.language && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                            ⚑ {source.language === 'zh' ? t('chinese') : t('english')}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {source.articleCount || 0} {t('itemCount')}
                        </span>
                      </div>
                    </button>
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
