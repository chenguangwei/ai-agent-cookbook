import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { isAdminRoute, verifyAdminAuth } from './lib/admin-auth';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Only show locale prefix for non-default locale
});

function getCleanDuplicateHostPath(pathname: string): string | null {
  const duplicateHost = 'agent-cookbook.com';
  const segments = pathname.split('/').filter(Boolean);
  const duplicateHostIndex = segments.indexOf(duplicateHost);

  if (duplicateHostIndex === -1) {
    return null;
  }

  const cleanSegments = segments.slice(duplicateHostIndex + 1);
  return cleanSegments.length > 0 ? `/${cleanSegments.join('/')}` : '/';
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cleanPath = getCleanDuplicateHostPath(pathname);

  if (cleanPath && cleanPath !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = cleanPath;
    return NextResponse.redirect(url, 308);
  }

  // --- Admin route protection ---
  if (isAdminRoute(pathname, locales)) {
    const authResponse = verifyAdminAuth(request);
    if (authResponse) return authResponse;

    // Auth passed. For non-intl routes (/admin, /api/*), just continue.
    if (pathname.startsWith('/api/') || pathname === '/admin' || pathname.startsWith('/admin/')) {
      return NextResponse.next();
    }

    // For /translate pages, run through intl middleware for locale handling
    return intlMiddleware(request);
  }

  // --- Skip non-intl paths ---
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // --- Default: next-intl middleware ---
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except internal Next.js and static files
  matcher: ['/((?!_next|_vercel).*)'],
};
