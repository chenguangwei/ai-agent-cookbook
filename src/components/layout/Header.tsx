'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, Moon, Sun, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/features/LanguageSwitcher';
import { useSearch } from '@/components/features/SearchProvider';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { openSearch } = useSearch();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('Navigation');
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Strip locale prefix for comparison
    const cleanPath = pathname.replace(/^\/(en|zh|ja)/, '') || '/';
    if (href === '/') return cleanPath === '/';
    return cleanPath.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    isActive(href)
      ? 'text-primary-600 dark:text-primary-400 text-sm font-bold transition-colors'
      : 'text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-3 lg:px-10 transition-colors">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-8 text-primary-600 transition-transform group-hover:scale-110">
            <Zap className="w-full h-full" />
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white font-display uppercase">
            Agent Hub
          </h2>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/explore" className={navLinkClass('/explore')}>
            {t('tutorials')}
          </Link>
          <Link href="/practice" className={navLinkClass('/practice')}>
            {t('practice')}
          </Link>
          <Link href="/showcase" className={navLinkClass('/showcase')}>
            {t('showcase')}
          </Link>
          <Link href="/tools" className={navLinkClass('/tools')}>
            {t('tools')}
          </Link>
          <Link
            href="/news"
            className={`${navLinkClass('/news')} flex items-center gap-2`}
          >
            {t('news')}
            <div className="size-1.5 rounded-full bg-red-500 animate-pulse"></div>
          </Link>
          <Link href="/docs" className={navLinkClass('/docs')}>
            {t('docs')}
          </Link>
          <Link
            href="/request"
            className="text-primary-600 dark:text-primary-400 text-sm font-bold hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            {t('requestTutorial')}
          </Link>
        </nav>
      </div>

      <div className="flex flex-1 justify-end gap-6 items-center">
        <button
          onClick={openSearch}
          className="hidden lg:flex items-center w-64 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-3 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer"
        >
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <span className="flex-1 text-left text-sm text-slate-400">
            {t('searchPlaceholder')}
          </span>
          <kbd className="hidden xl:inline-block px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-slate-400 dark:text-slate-300 font-bold font-mono">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-slate-500 dark:text-slate-400"
          >
            {mounted ? (
              theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )
            ) : (
              // Render placeholder during SSR to avoid hydration mismatch
              <div className="w-5 h-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            size="sm"
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-md shadow-primary-500/20"
          >
            {t('signIn')}
          </Button>
        </div>
      </div>
    </header>
  );
}
