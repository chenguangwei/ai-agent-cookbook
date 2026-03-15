import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin route protection via HTTP Basic Auth.
 *
 * Behavior:
 * - In production (NODE_ENV === 'production'):
 *   - If ADMIN_USERNAME + ADMIN_PASSWORD are set → require Basic Auth
 *   - If not set → block all access (fail-closed)
 * - In development:
 *   - If credentials are set → require Basic Auth
 *   - If not set → allow access freely
 */

const ADMIN_PATHS = ['/admin', '/api/translate', '/api/news'];

/**
 * Check if a pathname is an admin-protected route.
 * Matches: /admin, /admin/*, /api/translate, /{locale}/translate
 */
export function isAdminRoute(pathname: string, locales: readonly string[]): boolean {
  // /admin and /admin/*
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;

  // /api/translate
  if (pathname === '/api/translate' || pathname.startsWith('/api/translate/')) return true;

  // /api/news (all news admin APIs)
  if (pathname === '/api/news' || pathname.startsWith('/api/news/')) return true;

  // /{locale}/translate or /translate (default locale)
  if (pathname === '/translate' || pathname.startsWith('/translate/')) return true;
  for (const locale of locales) {
    if (pathname === `/${locale}/translate` || pathname.startsWith(`/${locale}/translate/`)) {
      return true;
    }
  }

  return false;
}

/**
 * Verify HTTP Basic Auth credentials against environment variables.
 * Returns a 401 response if auth fails, or null if auth passes.
 */
export function verifyAdminAuth(request: NextRequest): NextResponse | null {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';

  // If no credentials configured
  if (!username || !password) {
    if (isProduction) {
      // Fail-closed in production: block access
      const missing = [];
      if (!username) missing.push('ADMIN_USERNAME');
      if (!password) missing.push('ADMIN_PASSWORD');

      return new NextResponse(
        `Admin access is not configured. Missing: ${missing.join(', ')}. Set these variables in Vercel and REDEPLOY.`,
        { status: 403 }
      );
    }
    // Allow access in development
    return null;
  }

  // Verify Basic Auth header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice(6);
  let decoded: string;
  try {
    decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  } catch {
    return unauthorizedResponse();
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return unauthorizedResponse();
  }

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(user, username) || !timingSafeEqual(pass, password)) {
    return unauthorizedResponse();
  }

  return null; // Auth passed
}

function unauthorizedResponse(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin Area", charset="UTF-8"',
    },
  });
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    let result = a.length ^ b.length;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return result === 0;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
