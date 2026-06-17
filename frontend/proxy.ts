import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

/**
 * Next.js Edge Proxy for route protection and security hardening.
 *
 * This proxy runs at the edge before pages are rendered, providing:
 * 1. Fast authentication checks without client-side JavaScript
 * 2. Immediate redirects for unauthenticated users
 * 3. No flash of protected content before redirect
 * 4. OWASP-compliant security headers on all responses
 *
 * Note: This is a "coarse" auth check based on cookie presence.
 * Fine-grained permission checks still happen client-side via AuthGuard.
 */

// Cookie names for the access token (must match backend CookieConfig).
// P1-7: when the backend runs with app.cookie.use-host-prefix=true (prod),
// the auth cookies are issued under hardened __Host- names. The proxy accepts
// EITHER name, preferring the __Host- variant — a __Host- cookie cannot be
// planted by a sibling subdomain, so it is the more trustworthy of the two.
const ACCESS_TOKEN_COOKIE = 'access_token';
const ACCESS_TOKEN_COOKIE_HOST = '__Host-hrms-access';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_COOKIE_HOST = '__Host-hrms-refresh';

// Request header used to forward the per-request CSP nonce to Server Components.
// Read in app/layout.tsx via next/headers `headers()`.
const NONCE_REQUEST_HEADER = 'x-nonce';

/**
 * Generate a cryptographically-strong per-request nonce, base64-encoded.
 *
 * Uses the Web Crypto API (`crypto.getRandomValues`) which is available in the
 * Edge runtime where this proxy executes — Node's `crypto` module is NOT.
 * The output character set (base64 with `+/=`) matches the token grammar
 * Next.js expects when it parses the `Content-Security-Policy` header to
 * propagate the nonce onto its own framework/hydration scripts
 * (see CSP_NONCE_SOURCE_REGEX in next/dist/server/app-render).
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/forgot-password',
  '/reset-password',
  '/',
  '/terms',                  // public legal page (linked from auth/signup)
  '/privacy',                // public legal page (linked from auth/signup)
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
  '/admin/users',      // NAV-005: explicit entry for user management (covered by /admin prefix but explicit for clarity)
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
 * verification. Edge Proxy cannot access the JWT secret (which lives in
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
    if (!base64Url) return {roles: [], isExpired: true};

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

    return {role: singleRole, roles, isExpired};
  } catch {
    return {roles: [], isExpired: true};
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
 * Add OWASP-compliant security headers to response.
 *
 * `nonce` is the per-request CSP nonce. It is embedded into the production
 * `script-src` directive so the app's own inline scripts (and Next.js's
 * framework/hydration scripts) are allowed without `'unsafe-inline'`.
 */
function addSecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  nonce: string,
): NextResponse {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enable HSTS only in production (SEC-004: HSTS on localhost causes HTTPS redirect loop)
  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Allow OAuth popups (required for Google sign-in)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }

  // Content Security Policy - restrictive but allows necessary resources including Google OAuth.
  response.headers.set('Content-Security-Policy', buildCsp(request, nonce));

  // Permissions Policy (formerly Feature Policy) - restrict sensitive features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // X-XSS-Protection: '0' disables legacy XSS auditor (Chrome removed it; '1; mode=block'
  // can actually introduce vulns in older browsers). Modern protection comes from CSP above.
  // Aligned with backend SecurityHeadersFilter.
  response.headers.set('X-XSS-Protection', '0');

  // Disable DNS prefetching to improve privacy
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  return response;
}

function getApiConnectSources(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const fallbackApiUrl = process.env.NODE_ENV === 'production'
    ? undefined
    : 'http://localhost:8080/api/v1';
  const apiUrl = configuredApiUrl || fallbackApiUrl;

  if (!apiUrl) {
    return '';
  }

  try {
    const url = new URL(apiUrl);
    const wsOrigin = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
    return ` ${url.origin} ${wsOrigin}`;
  } catch {
    return process.env.NODE_ENV === 'production'
      ? ''
      : ' http://localhost:8080 ws://localhost:8080';
  }
}

/**
 * Build the Content-Security-Policy header value for a request, embedding the
 * per-request nonce into `script-src`. The exact same string is set on both the
 * forwarded request headers (so Next.js can extract the nonce and stamp it onto
 * its framework scripts) and the response headers (so the browser enforces it).
 */
function buildCsp(request: NextRequest, nonce: string): string {
  const apiConnectSources = getApiConnectSources();

  const cspDirectives = [
      "default-src 'self'",
      // M-13: Nonce-based script-src removes 'unsafe-inline' in production.
      //
      // Production uses a per-request nonce plus 'strict-dynamic'. Next.js reads
      // this CSP off the (forwarded) request header and stamps the same nonce onto
      // every framework/hydration script it injects, so /_next/static chunks load
      // normally. The two app-owned inline scripts in app/layout.tsx
      // (getThemeScript + Mantine ColorSchemeScript) carry the same nonce.
      // With 'strict-dynamic', allowlisted hosts (Google) are loaded transitively
      // by the nonce'd scripts, so explicit host sources become advisory for
      // CSP3 browsers but are kept for older-browser fallback.
      //
      // Development keeps 'unsafe-inline' + 'unsafe-eval': Next's HMR/React-Refresh
      // runtime injects eval'd and inline scripts that are not nonce-stamped, and
      // dev is not a production-exposed surface.
      process.env.NODE_ENV === 'development'
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com"
        : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://apis.google.com https://www.google.com https://www.gstatic.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      // L-6: removed bare `wss:` wildcard (allowed WebSocket to any origin).
      // getApiConnectSources() already emits the specific allowed origin(s),
      // including the wss:// origin for the STOMP/SockJS backend.
      `connect-src 'self'${apiConnectSources} https://accounts.google.com https://accounts.googleapis.com https://www.googleapis.com`,
      // SEC: explicit img-src allowlist (was 'https:' wildcard — too permissive, allowed exfil to any HTTPS host)
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.amazonaws.com https://*.cloudfront.net https://storage.googleapis.com https://media.licdn.com https://ui-avatars.com https://drive.google.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src 'self' https://docs.google.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
  ];

  if (request.nextUrl.protocol === 'https:') {
    cspDirectives.push('upgrade-insecure-requests');
  }

  return cspDirectives.join('; ');
}

/**
 * Create a "continue to render" response that forwards the per-request nonce and
 * CSP to the rendering layer via request headers.
 *
 * Next.js App Router reads the `Content-Security-Policy` request header during
 * server rendering, extracts the `nonce-…` token, and applies it to every
 * framework/hydration <script> it injects. We also expose the raw nonce via
 * `x-nonce` so Server Components (app/layout.tsx) can read it with
 * next/headers `headers()` and stamp it onto app-owned inline scripts.
 *
 * This MUST be used for every page-rendering pass-through (not redirects), or
 * production browsers would block Next's own scripts under the nonce policy.
 */
function allowWithSecurity(request: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_REQUEST_HEADER, nonce);
  requestHeaders.set('Content-Security-Policy', buildCsp(request, nonce));

  const response = NextResponse.next({request: {headers: requestHeaders}});
  return addSecurityHeaders(response, request, nonce);
}

export function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;

  // Per-request CSP nonce — generated once, threaded through every response.
  const nonce = generateNonce();

  // Skip API routes and static assets
  if (matchesPattern(pathname, SKIP_PATTERNS)) {
    return NextResponse.next();
  }

  // Legacy /home route — redirect to per-employee dashboard
  if (pathname === '/home' || pathname.startsWith('/home/')) {
    return NextResponse.redirect(new URL('/me/dashboard', request.url));
  }

  // P3a route consolidation redirects (2026-05-13)
  // Old org-chart routes -> canonical /admin/org-hierarchy (425-line implementation)
  if (pathname === '/org-chart' || pathname.startsWith('/org-chart/')
      || pathname === '/organization-chart' || pathname.startsWith('/organization-chart/')) {
    return NextResponse.redirect(new URL('/admin/org-hierarchy', request.url));
  }
  // Old letter-templates -> nested under letters/templates
  if (pathname === '/letter-templates' || pathname.startsWith('/letter-templates/')) {
    const newPath = pathname.replace('/letter-templates', '/letters/templates');
    return NextResponse.redirect(new URL(newPath, request.url));
  }
  // Old statutory-filings -> nested under statutory/filings
  if (pathname === '/statutory-filings' || pathname.startsWith('/statutory-filings/')) {
    const newPath = pathname.replace('/statutory-filings', '/statutory/filings');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    // NOTE: We intentionally do NOT redirect authenticated users from /auth/login
    // to /me/dashboard here. That redirect creates an infinite loop when the
    // access_token cookie is valid but the client-side session (Zustand/sessionStorage)
    // is stale or empty — AuthGuard's restoreSession fails → redirects to login →
    // middleware redirects back to dashboard → loop forever.
    // The login page handles already-authenticated users client-side instead.
    return allowWithSecurity(request, nonce);
  }

  // Check for authentication token — hardened __Host- name first, legacy fallback (P1-7)
  const accessTokenCookie =
    request.cookies.get(ACCESS_TOKEN_COOKIE_HOST) ?? request.cookies.get(ACCESS_TOKEN_COOKIE);
  const accessToken = accessTokenCookie?.value;

  if (!accessToken) {
    // DEF-27: Deny-by-default — any non-public route without a cookie redirects to login.
    // This covers both known authenticated routes AND unknown/future routes.
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // DEF-29: Decode JWT and check expiry
  const {role, roles, isExpired} = decodeJwt(accessToken);

  // P0-SESSION-FIX: Check if a valid refresh token cookie exists alongside
  // the expired access token. If so, let the page load — the client-side
  // AuthGuard/restoreSession will use the refresh token to get new credentials.
  // Previously, middleware redirected to /auth/login immediately on access token
  // expiry, which prevented the refresh flow from ever running and caused session
  // loss during cross-sub-app navigation.
  const hasRefreshToken =
    !!request.cookies.get(REFRESH_TOKEN_COOKIE_HOST)?.value ||
    !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (isExpired) {
    if (hasRefreshToken) {
      // Refresh token exists — let the page load so client-side refresh can work.
      // AuthGuard will call restoreSession() which uses the httpOnly refresh cookie.
      return allowWithSecurity(request, nonce);
    }

    // No refresh token — truly expired session, redirect to login
    if (isAuthenticatedRoute(pathname) || !isPublicRoute(pathname)) {
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return allowWithSecurity(request, nonce);
  }

  // Strip Spring's "ROLE_" prefix from JWT-issued role claims so plain comparisons work.
  const normalize = (r: string) => r.replace(/^ROLE_/, '');
  const normalizedRoles = roles.map(normalize);
  const normalizedSingleRole = role ? normalize(role) : undefined;

  // SUPER_ADMIN bypass: if JWT contains SUPER_ADMIN, skip all further route checks
  if (normalizedSingleRole === 'SUPER_ADMIN' || normalizedRoles.includes('SUPER_ADMIN')) {
    return allowWithSecurity(request, nonce);
  }

  // RBAC-EDGE-001: Coarse role gate for admin-scoped routes.
  // Low-priv roles (MANAGER, TEAM_LEAD, EMPLOYEE, and any non-admin role) must
  // not render admin pages. Backend @RequiresPermission already gates APIs;
  // this prevents the SSR shell from leaking admin UI to denied users.
  const ADMIN_ROUTE_PATTERNS: RegExp[] = [
    /^\/admin(\/|$)/,
    /^\/payroll\/runs(\/|$)/,
    /^\/payroll\/settings(\/|$)/,
    /^\/recruitment\/(jobs|candidates|agencies|pipeline)(\/|$)/,
    /^\/settings\/(tenants|roles|permissions|integrations|api-keys)(\/|$)/,
  ];

  const ADMIN_ROLES = new Set([
    'SUPER_ADMIN',
    'TENANT_ADMIN',
    'HR_ADMIN',
    'HR_MANAGER',
    'RECRUITMENT_ADMIN',
    'FINANCE_ADMIN',
  ]);

  const isAdminRoute = ADMIN_ROUTE_PATTERNS.some((re) => re.test(pathname));
  const allRoles: string[] = [...normalizedRoles];
  if (normalizedSingleRole) allRoles.push(normalizedSingleRole);

  // Keep NU-Hire-only admins out of NU-Grow direct routes at the edge.
  // Backend permissions remain authoritative; this prevents the client shell
  // from rendering a route the user should never work in.
  if (/^\/performance(\/|$)/.test(pathname)) {
    const isRecruitmentOnly = allRoles.includes('RECRUITMENT_ADMIN')
      && !allRoles.some((r) => ['HR_ADMIN', 'HR_MANAGER', 'TENANT_ADMIN', 'MANAGER', 'DEPARTMENT_MANAGER', 'TEAM_LEAD'].includes(r));
    if (isRecruitmentOnly) {
      const denyUrl = new URL('/recruitment', request.url);
      denyUrl.searchParams.set('denied', '1');
      const response = NextResponse.redirect(denyUrl);
      return addSecurityHeaders(response, request, nonce);
    }
  }

  // Payroll is an HR/finance/admin workspace. Self-service payslips live under
  // /me/payslips, so blocking /payroll does not affect employee payslip access.
  if (/^\/payroll(\/|$)/.test(pathname)) {
    const canAccessPayroll = allRoles.some((r) =>
      ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN'].includes(r)
    );
    if (!canAccessPayroll) {
      const denyUrl = new URL('/me/dashboard', request.url);
      denyUrl.searchParams.set('denied', '1');
      const response = NextResponse.redirect(denyUrl);
      return addSecurityHeaders(response, request, nonce);
    }
  }

  if (isAdminRoute) {
    const hasAdminRole = allRoles.some((r) => ADMIN_ROLES.has(r));
    if (!hasAdminRole) {
      // Deny by redirecting to /me/dashboard. We deliberately do NOT echo the
      // requested path back as a query param — that would defeat tests (and
      // browser history bars) that detect leaks by substring-matching the URL.
      const denyUrl = new URL('/me/dashboard', request.url);
      denyUrl.searchParams.set('denied', '1');
      const response = NextResponse.redirect(denyUrl);
      return addSecurityHeaders(response, request, nonce);
    }
  }

  // Token exists and is not expired - allow the request
  // Fine-grained permission checks happen client-side via AuthGuard
  return allowWithSecurity(request, nonce);
}

/**
 * Configure which paths the middleware runs on.
 * We run on all paths except specific exclusions.
 */
// NAV-001 fix: Next.js 16 requires the exported function to be named `middleware`.
// `proxy` holds the implementation; re-export it under the required name so the
// Edge runtime picks it up and populates middleware-manifest.json correctly.
export { proxy as middleware };

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
