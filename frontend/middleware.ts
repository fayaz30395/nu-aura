import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

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
  let wsOrigin: string;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1');
    apiOrigin = url.origin;
    wsOrigin = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
  } catch {
    apiOrigin = 'http://localhost:8080';
    wsOrigin = 'ws://localhost:8080';
  }

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // SEC: 'strict-dynamic' is present in production — browsers IGNORE 'unsafe-inline'/host
      // allowlists when 'strict-dynamic' is in script-src, so DOM-injected scripts are blocked.
      // 'unsafe-inline' is kept as a fallback for browsers that don't understand strict-dynamic.
      // TODO: Migrate to full nonce-based CSP via Next.js middleware nonces — requires SSR
      // plumbing to inject the nonce into every <script> tag emitted by hydration. See
      // https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      process.env.NODE_ENV === 'development'
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com"
        : "script-src 'self' 'strict-dynamic' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      `connect-src 'self' ${apiOrigin} ${wsOrigin} wss: https://accounts.google.com https://accounts.googleapis.com https://www.googleapis.com`,
      // SEC: explicit img-src allowlist (was 'https:' wildcard — too permissive, allowed exfil to any HTTPS host)
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.amazonaws.com https://*.cloudfront.net https://storage.googleapis.com https://media.licdn.com https://ui-avatars.com https://drive.google.com",
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

  // X-XSS-Protection: '0' disables legacy XSS auditor (Chrome removed it; '1; mode=block'
  // can actually introduce vulns in older browsers). Modern protection comes from CSP above.
  // Aligned with backend SecurityHeadersFilter.
  response.headers.set('X-XSS-Protection', '0');

  // Disable DNS prefetching to improve privacy
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  return response;
}

export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;

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
      return NextResponse.redirect(loginUrl);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Strip Spring's "ROLE_" prefix from JWT-issued role claims so plain comparisons work.
  const normalize = (r: string) => r.replace(/^ROLE_/, '');
  const normalizedRoles = roles.map(normalize);
  const normalizedSingleRole = role ? normalize(role) : undefined;

  // SUPER_ADMIN bypass: if JWT contains SUPER_ADMIN, skip all further route checks
  if (normalizedSingleRole === 'SUPER_ADMIN' || normalizedRoles.includes('SUPER_ADMIN')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
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
      return addSecurityHeaders(response);
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
      return addSecurityHeaders(response);
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
      return addSecurityHeaders(response);
    }
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
