'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Newspaper,
  Check,
  X,
  Star,
  Trash2,
  RefreshCw,
  Plus,
  Rss,
  Filter,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

// Interfaces
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
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  language?: 'en' | 'zh' | 'ja';
  approved_at?: string;
  created_at: string;
}

interface Source {
  id: string;
  name: string;
  url: string;
  category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
  language: 'en' | 'zh' | 'ja';
  enabled: boolean;
  created_at: string;
}

type TabType = 'pending' | 'approved' | 'sources';

const CATEGORIES = ['all', 'Articles', 'Podcasts', 'Twitters', 'Videos'] as const;
const LANGUAGES = ['all', 'en', 'zh', 'ja'] as const;

export default function AdminNewsPage() {
  const t = useTranslations('NewsAdmin');
  const tGeneral = useTranslations('General');

  // State
  const [items, setItems] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [category, setCategory] = useState<string>('all');
  const [language, setLanguage] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sourceLanguage, setSourceLanguage] = useState<string>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [fetching, setFetching] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Helper to get effective language (item.language or fallback to source language)
  const getEffectiveLanguage = (item: NewsItem): string => {
    if (item.language) return item.language;
    const source = sources.find(s => s.id === item.source_id);
    return source?.language || 'en';
  };

  // Fetch items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'pending') params.set('status', 'pending');
      if (activeTab === 'approved') params.set('status', 'approved');
      if (category !== 'all') params.set('category', category);
      if (language !== 'all') params.set('language', language);
      if (sourceFilter !== 'all') params.set('sourceId', sourceFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));

      const res = await fetch(`/api/news/admin/list?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setSources(data.sources || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sources
  const fetchSources = async () => {
    try {
      const res = await fetch('/api/news/admin/sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, status, category, language, sourceFilter]);

  useEffect(() => {
    if (activeTab === 'sources') {
      fetchSources();
    } else {
      fetchItems();
    }
  }, [activeTab, status, category, language, sourceFilter, page]);

  // Handle approve
  const handleApprove = async (ids: string[], isFeatured: boolean = false) => {
    try {
      const res = await fetch('/api/news/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, isFeatured })
      });
      const data = await res.json();
      if (res.ok) {
        setSelected([]);
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  // Handle reject
  const handleReject = async (ids: string[]) => {
    try {
      const res = await fetch('/api/news/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (res.ok) {
        setSelected([]);
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  // Handle toggle featured
  const handleToggleFeatured = async (id: string) => {
    try {
      const res = await fetch('/api/news/admin/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok) {
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    }
  };

  // Handle delete news item
  const handleDelete = async (ids: string[]) => {
    try {
      const query = ids.map(id => `id=${encodeURIComponent(id)}`).join('&');
      const res = await fetch(`/api/news/admin/delete?${query}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setSelected([]);
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Handle set language
  const handleSetLanguage = async (ids: string[], language: 'en' | 'zh' | 'ja') => {
    try {
      const res = await fetch('/api/news/admin/set-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, language })
      });
      const data = await res.json();
      if (res.ok) {
        setSelected([]);
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to set language:', error);
    }
  };

  // Handle fetch RSS
  const handleFetchRss = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/news/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        // Show summary with error count
        const results = data.results || [];
        const failedSources = results.filter((r: any) => r.error);
        const errorCount = failedSources.length;
        const successCount = results.length - errorCount;
        
        let message = `成功获取 ${data.totalAdded || 0} 条新新闻\n成功: ${successCount} 个源`;
        if (errorCount > 0) {
          message += `\n失败: ${errorCount} 个源:`;
          failedSources.slice(0, 5).forEach((f: any) => {
            message += `\n- ${f.sourceName}: ${f.error}`;
          });
          if (errorCount > 5) {
            message += `\n... 以及其他 ${errorCount - 5} 个源`;
          }
        }
        alert(message);
        fetchItems();
      } else {
        alert(`获取失败: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to fetch RSS:', error);
      alert('获取失败，请检查网络连接');
    } finally {
      setFetching(false);
    }
  };

  // Handle import default
  const handleImportDefault = async (cat: string) => {
    try {
      const res = await fetch('/api/news/import-opml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importDefault: true, category: cat })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Imported ${data.imported || 0} sources`);
        fetchSources();
      } else {
        alert(`Error: ${data.error || 'Failed to import'}`);
      }
    } catch (error) {
      console.error('Failed to import default:', error);
    }
  };

  // Handle import from BestBlogs OPML
  const handleImportBestBlogs = async (opmlFile: string, category: string) => {
    try {
      const res = await fetch('/api/news/import-opml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opmlPath: `../BestBlogs/${opmlFile}`,
          category
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Imported ${data.imported || 0} sources, skipped ${data.skipped || 0}`);
        fetchSources();
      } else {
        alert(`Error: ${data.error || 'Failed to import'}`);
      }
    } catch (error) {
      console.error('Failed to import from BestBlogs:', error);
      alert('Failed to import from BestBlogs');
    }
  };

  // Handle detect language for all sources
  const handleDetectLanguage = async () => {
    try {
      const res = await fetch('/api/news/admin/sources/detect-lang', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert(`已根据 RSS 名称检测并更新 ${data.updated} 个源的语言`);
        fetchSources();
      } else {
        alert(`Error: ${data.error || 'Failed to detect language'}`);
      }
    } catch (error) {
      console.error('Failed to detect language:', error);
    }
  };

  // Handle delete source
  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    try {
      const res = await fetch(`/api/news/admin/sources?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        fetchSources();
      }
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  // Handle toggle source enabled
  const handleToggleSourceEnabled = async (source: Source) => {
    try {
      const res = await fetch('/api/news/admin/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: source.id, enabled: !source.enabled })
      });
      const data = await res.json();
      if (res.ok) {
        fetchSources();
      }
    } catch (error) {
      console.error('Failed to toggle source:', error);
    }
  };

  // Handle update source language
  const handleUpdateSourceLanguage = async (id: string, language: 'en' | 'zh' | 'ja') => {
    try {
      const res = await fetch('/api/news/admin/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, language })
      });
      const data = await res.json();
      if (res.ok) {
        fetchSources();
      }
    } catch (error) {
      console.error('Failed to update source language:', error);
    }
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map(item => item.id));
    }
  };

  // Toggle item selection
  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Tab config
  const tabs = [
    { key: 'pending' as const, label: '待审核', count: items.filter(i => i.status === 'pending').length },
    { key: 'approved' as const, label: '已通过', count: items.filter(i => i.status === 'approved').length },
    { key: 'sources' as const, label: 'RSS 源管理', count: sources.length }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              News 管理后台
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchRss}
              disabled={fetching}
              className="gap-2"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              抓取 RSS
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.key
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'sources' ? (
          /* Sources Tab */
          <div className="space-y-6">
            {/* Import Buttons */}
            <div className="space-y-4">
              {/* BestBlogs Import */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-slate-600 dark:text-slate-400">从 BestBlogs 导入:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImportBestBlogs('BestBlogs_RSS_Articles.opml', 'Articles')}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Articles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImportBestBlogs('BestBlogs_RSS_Podcasts.opml', 'Podcasts')}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Podcasts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImportBestBlogs('BestBlogs_RSS_Twitters.opml', 'Twitters')}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Twitters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImportBestBlogs('BestBlogs_RSS_Videos.opml', 'Videos')}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Videos
                </Button>
              </div>

              {/* Default Sources Import */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-slate-600 dark:text-slate-400">导入默认源:</span>
                {CATEGORIES.slice(1).map(cat => (
                  <Button
                    key={cat}
                    variant="outline"
                    size="sm"
                    onClick={() => handleImportDefault(cat)}
                    className="gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Language Filter for Sources */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={sourceLanguage}
                  onChange={e => setSourceLanguage(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>
                      {lang === 'all' ? '全部语言' : lang === 'en' ? 'English' : lang === 'zh' ? '中文' : '日本語'}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDetectLanguage}
                className="gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                根据名称检测语言
              </Button>
            </div>

            {/* Sources List */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      名称
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      语言
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        <Rss className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>暂无 RSS 源</p>
                        <p className="text-sm">点击上方按钮导入默认源</p>
                      </td>
                    </tr>
                  ) : (
                    sources.filter(s => sourceLanguage === 'all' || s.language === sourceLanguage).map(source => (
                      <tr key={source.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {source.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 text-sm"
                          >
                            {source.url.slice(0, 40)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${source.category === 'Articles' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              source.category === 'Podcasts' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                source.category === 'Twitters' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {source.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={source.language}
                            onChange={e => handleUpdateSourceLanguage(source.id, e.target.value as 'en' | 'zh' | 'ja')}
                            className={`text-xs font-medium rounded-full px-2 py-1 cursor-pointer border-0 ${source.language === 'en' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                source.language === 'zh' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                              }`}
                          >
                            <option value="en">EN</option>
                            <option value="zh">中文</option>
                            <option value="ja">JA</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleSourceEnabled(source)}
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${source.enabled
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}
                          >
                            {source.enabled ? '启用' : '禁用'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSource(source.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Items Tab (Pending/Approved) */
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? '全部分类' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="h-9 px-3 pr-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>
                    {lang === 'all' ? '全部语言' : lang === 'en' ? 'English' : lang === 'zh' ? '中文' : '日本語'}
                  </option>
                ))}
              </select>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="h-9 px-3 pr-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部来源</option>
                {sources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>

              {selected.length > 0 && (
                <div className="flex items-center gap-2 ml-auto bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">
                  <span className="text-sm text-primary-700 dark:text-primary-300">
                    已选择 {selected.length} 项
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected([])}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Bulk Actions */}
            {selected.length > 0 && activeTab === 'pending' && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  批量操作:
                </span>
                <Button
                  size="sm"
                  onClick={() => handleApprove(selected, false)}
                  className="gap-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  审核通过
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprove(selected, true)}
                  className="gap-1"
                >
                  <Star className="w-4 h-4" />
                  通过并推荐
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(selected)}
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <X className="w-4 h-4" />
                  拒绝
                </Button>
              </div>
            )}

            {/* Bulk Actions for Approved */}
            {selected.length > 0 && activeTab === 'approved' && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  批量操作:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(selected)}
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  设置语言:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetLanguage(selected, 'en')}
                  className="gap-1"
                >
                  English
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetLanguage(selected, 'zh')}
                  className="gap-1"
                >
                  中文
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetLanguage(selected, 'ja')}
                  className="gap-1"
                >
                  日本語
                </Button>
              </div>
            )}

            {/* Items List */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <Newspaper className="w-12 h-12 mb-3 opacity-50" />
                  <p>暂无新闻</p>
                  <p className="text-sm">点击右上角按钮抓取 RSS 源</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.length === items.length && items.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        新闻
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        来源
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        语言
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        发布时间
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {items.map(item => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${selected.includes(item.id) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                          }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt=""
                                className="w-16 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2"
                              >
                                {item.title}
                              </a>
                              {item.summary && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                                  {item.summary}
                                </p>
                              )}
                              {item.is_featured && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  <Star className="w-3 h-3" />
                                  推荐
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {item.source_name || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const lang = getEffectiveLanguage(item);
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${lang === 'en' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                  lang === 'zh' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    lang === 'ja' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                {lang.toUpperCase()}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(item.published_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {activeTab === 'pending' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleApprove([item.id], false)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="通过"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleApprove([item.id], true)}
                                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                  title="通过并推荐"
                                >
                                  <Star className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleReject([item.id])}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="拒绝"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {activeTab === 'approved' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleToggleFeatured(item.id)}
                                  className={item.is_featured ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}
                                  title={item.is_featured ? '取消推荐' : '设为推荐'}
                                >
                                  <Star className="w-4 h-4" fill={item.is_featured ? 'currentColor' : 'none'} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete([item.id])}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    共 {total} 条，第 {page} / {Math.ceil(total / PAGE_SIZE)} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * PAGE_SIZE >= total}
                      onClick={() => setPage(p => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
