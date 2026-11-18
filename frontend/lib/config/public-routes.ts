/**
 * Single list of routes reachable without a session.
 *
 * Two matchers consume it and they intentionally keep their own semantics:
 *  - Edge (proxy.ts `matchesPattern`): an entry matches itself and any
 *    sub-path; a trailing `/` entry matches any sub-path plus the bare path.
 *  - Client (routes.ts `matchRoute`): exact match, `[param]` = one segment.
 *
 * Must stay dependency-free: proxy.ts runs on the edge runtime.
 * Parity with the pre-unification lists is pinned by
 * lib/config/__tests__/public-routes.test.ts.
 */
interface PublicRoute {
  path: string;
  /** Token portal: edge allows `${path}/…`, client matches `${path}/[token]`. */
  token?: boolean;
  /** Client also lists `${path}/` because its matcher is exact. */
  clientTrailingSlash?: boolean;
  /** Client also lists `${path}/[slug]` so unknown sub-paths reach Next's 404 instead of the login redirect. */
  clientSubpath?: boolean;
}

const PUBLIC_ROUTE_DEFS: readonly PublicRoute[] = [
  {path: '/auth/login'},
  {path: '/auth/forgot-password'},
  {path: '/auth/reset-password'},
  {path: '/reset-password'},
  {path: '/'},
  {path: '/terms'},
  {path: '/privacy'},
  {path: '/offer-portal'},
  {path: '/careers', clientTrailingSlash: true, clientSubpath: true},
  {path: '/preboarding/portal', token: true},
  {path: '/exit-interview', token: true},
  {path: '/sign', token: true},
];

export const EDGE_PUBLIC_ROUTES: readonly string[] = Object.freeze(
  PUBLIC_ROUTE_DEFS.map((r) => (r.token ? `${r.path}/` : r.path)),
);

export const CLIENT_PUBLIC_ROUTES: readonly string[] = Object.freeze(
  PUBLIC_ROUTE_DEFS.flatMap((r) => {
    if (r.token) return [`${r.path}/[token]`];
    const base = r.clientTrailingSlash ? [r.path, `${r.path}/`] : [r.path];
    return r.clientSubpath ? [...base, `${r.path}/[slug]`] : base;
  }),
);
