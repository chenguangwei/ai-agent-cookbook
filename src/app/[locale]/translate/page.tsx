'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  Languages,
  Check,
  X,
  Loader2,
  RefreshCw,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
} from 'lucide-react';

interface ContentItem {
  slug: string;
  title: string;
  sourceLocale: string;
  contentType: string;
  locales: Record<string, boolean>;
}

interface TranslateData {
  items: ContentItem[];
  supportedLocales: string[];
  localeNames: Record<string, string>;
  contentTypes: Record<string, string>;
  configured: boolean;
}

export default function TranslatePage() {
  const [data, setData] = useState<TranslateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [activeType, setActiveType] = useState<string>('all');
  const [filterLocale, setFilterLocale] = useState<string>('all');

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/translate');
      const result = await res.json();
      setData(result);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load translation status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Filtered items
  const filteredItems = data?.items.filter((item) => {
    if (activeType !== 'all' && item.contentType !== activeType) return false;
    if (filterLocale !== 'all') {
      // Show items missing this locale
      if (item.locales[filterLocale]) return false;
    }
    return true;
  }) ?? [];

  // Selection helpers
  const itemKey = (item: ContentItem) => `${item.contentType}:${item.slug}`;

  function toggleSelect(item: ContentItem) {
    const key = itemKey(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAll() {
    const missingItems = filteredItems.filter(
      (item) => !data?.supportedLocales.every((l) => item.locales[l])
    );
    if (selected.size === missingItems.length && missingItems.every((i) => selected.has(itemKey(i)))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(missingItems.map(itemKey)));
    }
  }

  async function handleTranslate(
    slug: string,
    sourceLocale: string,
    targetLocale: string,
    contentType: string
  ) {
    const key = `${contentType}:${slug}-${targetLocale}`;
    setTranslating((prev) => new Set(prev).add(key));
    setMessage(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, sourceLocale, targetLocale, contentType }),
      });

      const result = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: result.message });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error during translation' });
    } finally {
      setTranslating((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleBatchTranslate(targetLocale: string) {
    if (!data) return;

    const selectedItems = data.items.filter((item) => selected.has(itemKey(item)));
    const toTranslate = selectedItems.filter(
      (item) => !item.locales[targetLocale] && item.sourceLocale
    );

    if (toTranslate.length === 0) {
      setMessage({ type: 'success', text: `No items to translate to ${data.localeNames[targetLocale]}` });
      return;
    }

    setMessage(null);

    for (const item of toTranslate) {
      const key = `${item.contentType}:${item.slug}-${targetLocale}`;
      setTranslating((prev) => new Set(prev).add(key));

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: item.slug,
            sourceLocale: item.sourceLocale,
            targetLocale,
            contentType: item.contentType,
          }),
        });

        if (!res.ok) {
          const result = await res.json();
          setMessage({ type: 'error', text: `Failed: ${item.title} - ${result.error}` });
          setTranslating((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          return;
        }
      } catch {
        setMessage({ type: 'error', text: `Network error translating ${item.title}` });
        setTranslating((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return;
      }

      setTranslating((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }

    setMessage({
      type: 'success',
      text: `Translated ${toTranslate.length} items to ${data.localeNames[targetLocale]}`,
    });
    setSelected(new Set());
    await fetchStatus();
  }

  async function handleTranslateAllMissing(sourceLocale: string, targetLocale: string) {
    if (!data) return;

    const missing = (activeType === 'all' ? data.items : data.items.filter(i => i.contentType === activeType))
      .filter((t) => t.locales[sourceLocale] && !t.locales[targetLocale]);

    if (missing.length === 0) {
      setMessage({ type: 'success', text: `All items already translated to ${data.localeNames[targetLocale]}` });
      return;
    }

    setMessage(null);

    for (const item of missing) {
      const key = `${item.contentType}:${item.slug}-${targetLocale}`;
      setTranslating((prev) => new Set(prev).add(key));

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: item.slug,
            sourceLocale,
            targetLocale,
            contentType: item.contentType,
          }),
        });

        if (!res.ok) {
          const result = await res.json();
          setMessage({ type: 'error', text: `Failed: ${item.title} - ${result.error}` });
          setTranslating(new Set());
          return;
        }
      } catch {
        setMessage({ type: 'error', text: `Network error translating ${item.title}` });
        setTranslating(new Set());
        return;
      }

      setTranslating((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }

    setMessage({
      type: 'success',
      text: `Translated ${missing.length} items to ${data.localeNames[targetLocale]}`,
    });
    await fetchStatus();
  }

  const isTranslating = translating.size > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Languages className="w-8 h-8 text-primary-600" />
              <h1 className="text-slate-900 dark:text-white text-3xl font-bold font-display">
                Translation Manager
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl">
              Manage multi-language translations for all content types. Translate from any language to others using AI.
            </p>
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* API Key Warning */}
          {data && !data.configured && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
              <strong>API Key not configured.</strong> Set the following in{' '}
              <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-800 text-xs font-mono">
                .env.local
              </code>
              :
              <pre className="mt-2 p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/50 text-xs font-mono">
{`TRANSLATE_API_KEY=your-api-key
TRANSLATE_BASE_URL=https://api.openai.com/v1  # or any OpenAI-compatible endpoint
TRANSLATE_MODEL=gpt-4o  # or deepseek-chat, etc.`}
              </pre>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : data ? (
            <>
              {/* Toolbar: Type Filter + Locale Filter + Actions */}
              <div className="mb-6 space-y-4">
                {/* Content Type Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setActiveType('all'); setSelected(new Set()); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeType === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600'
                    }`}
                  >
                    All ({data.items.length})
                  </button>
                  {Object.entries(data.contentTypes).map(([key, label]) => {
                    const count = data.items.filter((i) => i.contentType === key).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={key}
                        onClick={() => { setActiveType(key); setSelected(new Set()); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeType === key
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-600'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Locale Filter + Actions Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Locale Filter */}
                  <div className="flex items-center gap-2 text-sm">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={filterLocale}
                      onChange={(e) => setFilterLocale(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <option value="all">All locales</option>
                      {data.supportedLocales.map((l) => (
                        <option key={l} value={l}>
                          Missing {data.localeNames[l]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button variant="outline" size="sm" onClick={fetchStatus} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>

                  {/* Batch translate all missing */}
                  {data.supportedLocales.map((source) =>
                    data.supportedLocales
                      .filter((t) => t !== source)
                      .map((target) => {
                        const items = activeType === 'all' ? data.items : data.items.filter(i => i.contentType === activeType);
                        const missing = items.filter(
                          (t) => t.locales[source] && !t.locales[target]
                        ).length;
                        if (missing === 0) return null;
                        return (
                          <Button
                            key={`${source}-${target}`}
                            size="sm"
                            onClick={() => handleTranslateAllMissing(source, target)}
                            disabled={isTranslating || !data.configured}
                            className="gap-2 bg-primary-600 hover:bg-primary-700 text-white"
                          >
                            {data.localeNames[source].split(' ')[0]}
                            <ArrowRight className="w-3 h-3" />
                            {data.localeNames[target].split(' ')[0]}
                            <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs">
                              {missing}
                            </span>
                          </Button>
                        );
                      })
                  )}
                </div>

                {/* Multi-select Actions */}
                {selected.size > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {selected.size} selected
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    {data.supportedLocales.map((locale) => {
                      const selectedItems = data.items.filter((i) => selected.has(itemKey(i)));
                      const canTranslate = selectedItems.filter(
                        (i) => !i.locales[locale] && i.sourceLocale
                      ).length;
                      if (canTranslate === 0) return null;
                      return (
                        <Button
                          key={locale}
                          size="sm"
                          onClick={() => handleBatchTranslate(locale)}
                          disabled={isTranslating || !data.configured}
                          className="gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs"
                        >
                          Translate to {data.localeNames[locale].split(' ')[0]}
                          <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
                            {canTranslate}
                          </span>
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(new Set())}
                      className="text-xs ml-auto"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {/* Content Translation Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-4 text-left w-10">
                        <button onClick={selectAll} className="text-slate-400 hover:text-primary-600">
                          {filteredItems.filter(i => !data.supportedLocales.every(l => i.locales[l])).length > 0 &&
                           filteredItems.filter(i => !data.supportedLocales.every(l => i.locales[l])).every(i => selected.has(itemKey(i)))
                            ? <CheckSquare className="w-4 h-4" />
                            : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left font-semibold text-slate-900 dark:text-white">
                        Content
                      </th>
                      <th className="px-4 py-4 text-left font-semibold text-slate-900 dark:text-white w-24">
                        Type
                      </th>
                      {data.supportedLocales.map((locale) => (
                        <th
                          key={locale}
                          className="px-4 py-4 text-center font-semibold text-slate-900 dark:text-white w-24"
                        >
                          {data.localeNames[locale].split('(')[0].trim().split(' ')[0]}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white w-48">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const key = itemKey(item);
                      const isComplete = data.supportedLocales.every((l) => item.locales[l]);
                      return (
                        <tr
                          key={key}
                          className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                            selected.has(key) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                          }`}
                        >
                          <td className="px-4 py-4">
                            {!isComplete && (
                              <button
                                onClick={() => toggleSelect(item)}
                                className="text-slate-400 hover:text-primary-600"
                              >
                                {selected.has(key) ? (
                                  <CheckSquare className="w-4 h-4 text-primary-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {item.slug}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {data.contentTypes[item.contentType] || item.contentType}
                            </span>
                          </td>
                          {data.supportedLocales.map((locale) => (
                            <td key={locale} className="px-4 py-4 text-center">
                              {item.locales[locale] ? (
                                <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                              )}
                            </td>
                          ))}
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {data.supportedLocales
                                .filter((locale) => !item.locales[locale])
                                .map((targetLocale) => {
                                  const sourceLocale = data.supportedLocales.find(
                                    (l) => item.locales[l]
                                  );
                                  if (!sourceLocale) return null;
                                  const tKey = `${item.contentType}:${item.slug}-${targetLocale}`;
                                  const isBusy = translating.has(tKey);
                                  return (
                                    <Button
                                      key={targetLocale}
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleTranslate(
                                          item.slug,
                                          sourceLocale,
                                          targetLocale,
                                          item.contentType
                                        )
                                      }
                                      disabled={isTranslating || !data.configured}
                                      className="text-xs h-7 px-2"
                                    >
                                      {isBusy ? (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                      ) : null}
                                      {targetLocale.toUpperCase()}
                                    </Button>
                                  );
                                })}
                              {isComplete && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                  Complete
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredItems.length === 0 && (
                  <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    {data.items.length === 0
                      ? 'No content found. Add content to the content/ directories.'
                      : 'No items match the current filters.'}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
