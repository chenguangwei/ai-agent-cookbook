'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, BookOpen, Newspaper, X, Loader2 } from 'lucide-react';
import {
  initSearchDB,
  indexDocuments,
  searchDocuments,
  type SearchResult,
  type SearchDocument,
} from '@/lib/search';

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandSearch({ isOpen, onClose }: CommandSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isIndexed, setIsIndexed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Initialize search index from API
  useEffect(() => {
    if (!isIndexed) {
      const initIndex = async () => {
        await initSearchDB();

        try {
          const res = await fetch('/api/search-index');
          const documents: SearchDocument[] = await res.json();
          await indexDocuments(documents);
        } catch (err) {
          console.error('Failed to load search index:', err);
        }
        setIsIndexed(true);
      };

      initIndex();
    }
  }, [isIndexed]);

  // Handle search
  useEffect(() => {
    if (!query.trim() || !isIndexed) {
      setResults([]);
      return;
    }

    startTransition(async () => {
      const searchResults = await searchDocuments(query, { limit: 8 });
      setResults(searchResults);
      setSelectedIndex(0);
    });
  }, [query, isIndexed]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].url);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, results, selectedIndex, router, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tutorial':
        return <BookOpen className="w-4 h-4" />;
      case 'doc':
        return <FileText className="w-4 h-4" />;
      case 'news':
        return <Newspaper className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative max-w-2xl mx-auto mt-[15vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tutorials, docs, and more..."
              className="flex-1 bg-transparent text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              autoFocus
            />
            {isPending && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {!isIndexed ? (
              <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Initializing search...
              </div>
            ) : results.length > 0 ? (
              <ul className="py-2">
                {results.map((result, index) => (
                  <li key={result.id}>
                    <button
                      onClick={() => {
                        router.push(result.url);
                        onClose();
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`mt-0.5 ${
                          index === selectedIndex
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate ${
                            index === selectedIndex
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {result.title}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {result.description}
                        </div>
                        {result.category && (
                          <div className="mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {result.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim() ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                Start typing to search...
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
