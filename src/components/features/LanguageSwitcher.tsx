'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { getLocalizedPath } from '@/lib/utils';
import { Globe } from 'lucide-react';

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function syncLocalePreference(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
  document.documentElement.lang = locale;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleChange = (newLocale: Locale) => {
    setOpen(false);

    if (newLocale === locale) return;

    const localePattern = new RegExp(`^/(${locales.join('|')})(?=/|$)`);
    const pathWithoutLocale = pathname.replace(localePattern, '') || '/';
    const queryString = searchParams.toString();
    const targetPath = getLocalizedPath(newLocale, pathWithoutLocale);

    syncLocalePreference(newLocale);
    router.replace(queryString ? `${targetPath}?${queryString}` : targetPath);
  };

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Change language"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{localeNames[locale as Locale]}</span>
      </button>

      <div
        role="menu"
        className={`absolute right-0 top-full mt-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg transition-all z-50 min-w-[120px] ${
          open ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {locales.map((loc) => (
          <button
            key={loc}
            type="button"
            role="menuitem"
            onClick={() => handleChange(loc)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              locale === loc
                ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {localeNames[loc]}
          </button>
        ))}
      </div>
    </div>
  );
}
