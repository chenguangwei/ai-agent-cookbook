import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { defaultLocale, locales } from "@/i18n/config";

export const SITE_NAME = 'Agent Cookbook';

const LOCALE_DATE_FORMATS: Record<string, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSiteUrl(): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL || 'https://agent-cookbook.com';
  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  try {
    const urlObj = new URL(url);
    // Clean up any duplicate domain in path (e.g., https://example.com/example.com)
    const cleanPath = urlObj.pathname.replace(new RegExp(urlObj.hostname, 'g'), '').replace(/\/+/g, '/').replace(/\/$/, '');
    return `${urlObj.protocol}//${urlObj.host}${cleanPath}`;
  } catch {
    return 'https://agent-cookbook.com';
  }
}

export function getLocalizedPath(locale: string, path = ''): string {
  const normalizedPath = path
    ? `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`
    : '';

  if (!normalizedPath) {
    return locale === defaultLocale ? '' : `/${locale}`;
  }

  return locale === defaultLocale ? normalizedPath : `/${locale}${normalizedPath}`;
}

export function getCanonicalUrl(locale: string, path = ''): string {
  return `${getSiteUrl()}${getLocalizedPath(locale, path)}`;
}

export function buildLocaleAlternates(
  path = '',
  availableLocales: readonly string[] = locales
): Record<string, string> {
  const siteUrl = getSiteUrl();
  const normalizedLocales = Array.from(
    new Set(availableLocales.filter((locale) => locales.includes(locale as typeof locales[number])))
  );

  const entries = normalizedLocales.map((locale) => [
    locale,
    `${siteUrl}${getLocalizedPath(locale, path)}`,
  ]);
  const defaultAlternateLocale = normalizedLocales.includes(defaultLocale)
    ? defaultLocale
    : normalizedLocales[0];

  if (defaultAlternateLocale) {
    entries.push([
      'x-default',
      `${siteUrl}${getLocalizedPath(defaultAlternateLocale, path)}`,
    ]);
  }

  return Object.fromEntries(entries);
}

export function getLocaleDateFormat(locale: string): string {
  return LOCALE_DATE_FORMATS[locale] || LOCALE_DATE_FORMATS.en;
}
