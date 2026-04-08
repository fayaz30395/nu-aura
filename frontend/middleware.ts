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
  '/auth/forgot-password',
  '/reset-password',
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
  '/home',   // legacy — redirects to /me/dashboard
  '/me',
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
  '/app',
  '/fluence',
  // QA3-002: Routes present in /app directory but previously missing from protection list
  '/approvals',
  '/company-spotlight',
  '/contracts',
  '/dashboard',
  '/letters',
  '/linkedin-posts',
  '/loans',
  '/org-chart',
  '/payments',
  // QA5-001: Routes discovered during frontend code review — missing from protection list
  '/holidays',
  '/integrations',
  '/team-directory',
  '/security',
  // QA6-001: Routes discovered during RBAC audit — missing from protection list
  '/biometric-devices',
  '/compliance',
  '/executive',
  '/goals',
  '/import-export',
  '/letter-templates',
  '/lwf',
  '/one-on-one',
  '/overtime',
  '/preboarding',
  '/predictive-analytics',
  '/probation',
  '/referrals',
  '/restricted-holidays',
  '/shifts',
  '/statutory-filings',
  '/workflows',
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
 * Decode JWT token and extract payload information.
 * This runs only in middleware (edge/runtime) and never on the client.
 *
 * SECURITY NOTE (CRIT-007): This performs base64 decode WITHOUT signature
 * verification. Edge Middleware cannot access the JWT secret (which lives in
 * the Java backend). This is intentionally a "coarse" auth check — the
 * backend JwtAuthenticationFilter verifies the signature on every API call.
 * The middleware only uses the decoded payload for routing decisions (e.g.,
 * redirect unauthenticated users, SUPER_ADMIN bypass). A forged JWT would
 * pass middleware but fail on the first backend API call, so no data leaks.
 */
function decodeJwt(token: string): {
  role?: string;
  roles: string[];
  isExpired: boolean;
} {
  try {
    const [, base64Url] = token.split('.');
    if (!base64Url) return { roles: [], isExpired: true };

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('binary');

    const payload = JSON.parse(
      decodeURIComponent(
        Array.from(jsonPayload)
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );

    const singleRole: string | undefined = payload.role;
    const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];

    // Check token expiry — exp is Unix timestamp in seconds
    const exp: number | undefined = payload.exp;
    const isExpired = exp !== undefined ? Date.now() / 1000 > exp : false;

    return { role: singleRole, roles, isExpired };
  } catch {
    return { roles: [], isExpired: true };
  }
}

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
  
  // Enable HSTS only in production (SEC-004: HSTS on localhost causes HTTPS redirect loop)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Allow OAuth popups (required for Google sign-in)
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Content Security Policy - restrictive but allows necessary resources including Google OAuth
  // Extract origin from API URL for CSP connect-src
  let apiOrigin: string;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1');
    apiOrigin = url.origin;
  } catch {
    apiOrigin = 'http://localhost:8080';
  }

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      process.env.NODE_ENV === 'development'
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://cdn.jsdelivr.net"
        : "script-src 'self' https://accounts.google.com https://apis.google.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      `connect-src 'self' ${apiOrigin} wss: https://accounts.google.com https://accounts.googleapis.com https://www.googleapis.com`,
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src 'self' https://docs.google.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ')
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

  // Legacy /home route — redirect to per-employee dashboard
  if (pathname === '/home' || pathname.startsWith('/home/')) {
    return NextResponse.redirect(new URL('/me/dashboard', request.url));
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    // NOTE: We intentionally do NOT redirect authenticated users from /auth/login
    // to /me/dashboard here. That redirect creates an infinite loop when the
    // access_token cookie is valid but the client-side session (Zustand/sessionStorage)
    // is stale or empty — AuthGuard's restoreSession fails → redirects to login →
    // middleware redirects back to dashboard → loop forever.
    // The login page handles already-authenticated users client-side instead.
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Check for authentication token
  const accessTokenCookie = request.cookies.get(ACCESS_TOKEN_COOKIE);
  const accessToken = accessTokenCookie?.value;

  if (!accessToken) {
    // DEF-27: Deny-by-default — any non-public route without a cookie redirects to login.
    // This covers both known authenticated routes AND unknown/future routes.
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // DEF-29: Decode JWT and check expiry
  const { role, roles, isExpired } = decodeJwt(accessToken);

  // P0-SESSION-FIX: Check if a valid refresh token cookie exists alongside
  // the expired access token. If so, let the page load — the client-side
  // AuthGuard/restoreSession will use the refresh token to get new credentials.
  // Previously, middleware redirected to /auth/login immediately on access token
  // expiry, which prevented the refresh flow from ever running and caused session
  // loss during cross-sub-app navigation.
  const hasRefreshToken = !!request.cookies.get('refresh_token')?.value;

  if (isExpired) {
    if (hasRefreshToken) {
      // Refresh token exists — let the page load so client-side refresh can work.
      // AuthGuard will call restoreSession() which uses the httpOnly refresh cookie.
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // No refresh token — truly expired session, redirect to login
    if (isAuthenticatedRoute(pathname) || !isPublicRoute(pathname)) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // SUPER_ADMIN bypass: if JWT contains SUPER_ADMIN, skip all further route checks
  if (role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Token exists and is not expired - allow the request
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
