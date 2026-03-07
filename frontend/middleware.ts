import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware for route protection and security hardening.
 *
 * This middleware runs at the edge before pages are rendered, providing:
 * 1. Fast authentication checks without client-side JavaScript
 * 2. Immediate redirects for unauthenticated users
 * 3. No flash of protected content before redirect
 * 4. OWASP-compliant security headers on all responses
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
  '/offer-portal',
  '/careers',           // candidate offer sign page
  '/sign/',                  // e-signature portal (token in URL)
];

// Authenticated routes that require authentication
const AUTHENTICATED_ROUTES = [
  '/home',
  '/settings',
  '/settings/security',       // MFA and security settings
  '/learning',
  '/learning/courses',
  '/learning/paths',          // Learning paths
  '/learning/certificates',   // Certificates
  '/employees',
  '/attendance',
  '/leave',
  '/payroll',
  '/expenses',
  '/recruitment',
  '/performance',
  '/projects',
  '/reports',
  '/analytics',
  '/admin',
  '/organization-chart',
  '/dashboards',
  '/benefits',
  '/onboarding',
  '/offboarding',
  '/documents',
  '/helpdesk',
  '/surveys',
  '/recognition',
  '/assets',
  '/travel',
  '/compensation',
  '/okr',
  '/feedback360',
  '/time-tracking',
  '/timesheets',
  '/resources',
  '/psa',
  '/allocations',
  '/announcements',
  '/calendar',
  '/nu-mail',
  '/nu-drive',
  '/nu-calendar',
  '/wellness',
  '/departments',
  '/tax',
  '/statutory',
  '/training',
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

/**
 * Check if the path is an authenticated route
 */
function isAuthenticatedRoute(path: string): boolean {
  return AUTHENTICATED_ROUTES.some((route) => {
    return path === route || path.startsWith(route + '/');
  });
}

/**
 * Add OWASP-compliant security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enable HSTS (Strict-Transport-Security) for HTTPS
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy - restrictive but allows necessary resources
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';"
  );
  
  // Permissions Policy (formerly Feature Policy) - restrict sensitive features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  
  // Prevent XSS attacks (legacy header, still useful for some browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Disable DNS prefetching to improve privacy
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  return response;
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
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Check for authentication token
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE);

  if (!accessToken) {
    // Check if this is an authenticated route that requires login
    if (isAuthenticatedRoute(pathname)) {
      // Not authenticated - redirect to login with return URL
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // For other routes, let them proceed (fine-grained checks happen client-side)
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Token exists - allow the request
  // Fine-grained permission checks happen client-side via AuthGuard
  const response = NextResponse.next();
  return addSecurityHeaders(response);
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
