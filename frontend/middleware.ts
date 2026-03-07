import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware for route protection.
 *
 * This middleware runs at the edge before pages are rendered, providing:
 * 1. Fast authentication checks without client-side JavaScript
 * 2. Immediate redirects for unauthenticated users
 * 3. No flash of protected content before redirect
 *
 * Note: This is a "coarse" auth check based on cookie presence.
 * Fine-grained permission checks still happen client-side via AuthGuard.
 */

// Cookie name for the access token (must match backend CookieConfig)
const ACCESS_TOKEN_COOKIE = 'access_token';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/',
  // Token-based public portals — accessed by candidates/employees without an account session
  '/preboarding/portal/',   // candidate preboarding portal (token in URL)
  '/exit-interview/',        // public exit interview form (token in URL)
  '/offer-portal',           // candidate offer sign page
  '/sign/',                  // e-signature portal (token in URL)
];

// API routes and static assets to skip
const SKIP_PATTERNS = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/static/',
  '/images/',
  '/fonts/',
];

/**
 * Check if the path matches any pattern in the list
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/')) {
      return path.startsWith(pattern) || path === pattern.slice(0, -1);
    }
    return path === pattern || path.startsWith(pattern + '/');
  });
}

/**
 * Check if the path is a public route
 */
function isPublicRoute(path: string): boolean {
  // Exact matches for public routes
  if (PUBLIC_ROUTES.includes(path)) {
    return true;
  }

  // Check if it starts with any public route pattern
  return PUBLIC_ROUTES.some((route) => {
    if (route === '/') return path === '/';
    return path.startsWith(route);
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static assets
  if (matchesPattern(pathname, SKIP_PATTERNS)) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    // If user is already authenticated and tries to access login, redirect to home
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE);
    if (accessToken && pathname === '/auth/login') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Check for authentication token
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE);

  if (!accessToken) {
    // Not authenticated - redirect to login with return URL
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists - allow the request
  // Fine-grained permission checks happen client-side via AuthGuard
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Configure which paths the middleware runs on.
 * We run on all paths except specific exclusions.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
