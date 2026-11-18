import {NextRequest} from 'next/server';
import {describe, expect, it} from 'vitest';
import {proxy} from '../../../proxy';
import {CLIENT_PUBLIC_ROUTES, EDGE_PUBLIC_ROUTES} from '../public-routes';
import {Permissions} from '../../hooks/usePermissions';
import {findRouteConfig, isPublicRoute, PUBLIC_ROUTES} from '../routes';

// Literal lists as they stood in proxy.ts and routes.ts before unification.
const EDGE_BEFORE = [
  '/auth/login',
  '/auth/reset-password',
  '/auth/forgot-password',
  '/reset-password',
  '/',
  '/terms',
  '/privacy',
  '/preboarding/portal/',
  '/exit-interview/',
  '/offer-portal',
  '/careers',
  '/sign/',
];

// '/preboarding' was dropped deliberately: it is the authenticated HR console and is
// now gated by its PROTECTED_ROUTES entry. Only the token portal stays public.
const CLIENT_BEFORE = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/reset-password',
  '/careers',
  '/careers/',
  '/careers/[slug]',
  '/offer-portal',
  '/preboarding/portal/[token]',
  '/sign/[token]',
  '/exit-interview/[token]',
  '/terms',
  '/privacy',
  '/',
];

const sorted = (xs: readonly string[]) => [...xs].sort();

function edgeIsPublic(path: string): boolean {
  return proxy(new NextRequest(`http://localhost:3000${path}`)).headers.get('location') === null;
}

describe('public route lists', () => {
  it('edge list is unchanged', () => {
    expect(sorted(EDGE_PUBLIC_ROUTES)).toEqual(sorted(EDGE_BEFORE));
  });

  it('client list is unchanged', () => {
    expect(sorted(CLIENT_PUBLIC_ROUTES)).toEqual(sorted(CLIENT_BEFORE));
    expect(sorted(PUBLIC_ROUTES)).toEqual(sorted(CLIENT_BEFORE));
  });

  it('lists are frozen', () => {
    expect(Object.isFrozen(EDGE_PUBLIC_ROUTES)).toBe(true);
    expect(Object.isFrozen(CLIENT_PUBLIC_ROUTES)).toBe(true);
  });
});

describe('edge and client agree on canonical URLs', () => {
  it.each([
    '/',
    '/auth/login',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/reset-password',
    '/terms',
    '/privacy',
    '/offer-portal',
    '/careers',
    '/careers/',
    '/preboarding/portal/tok123',
    '/exit-interview/tok123',
    '/sign/tok123',
  ])('%s is public on both sides', (path) => {
    expect(edgeIsPublic(path)).toBe(true);
    expect(isPublicRoute(path)).toBe(true);
  });

  it.each(['/me/dashboard', '/admin/users', '/employees', '/careersadmin', '/terms-admin', '/signx/abc'])(
    '%s is protected on both sides',
    (path) => {
      expect(edgeIsPublic(path)).toBe(false);
      expect(isPublicRoute(path)).toBe(false);
    },
  );

  it('/preboarding is protected on both sides and permission-gated on the client', () => {
    expect(edgeIsPublic('/preboarding')).toBe(false);
    expect(isPublicRoute('/preboarding')).toBe(false);
    expect(findRouteConfig('/preboarding')?.anyPermission).toContain(Permissions.PREBOARDING_VIEW);
  });

  it('the preboarding candidate portal stays public and ungated', () => {
    expect(isPublicRoute('/preboarding/portal/tok123')).toBe(true);
    expect(findRouteConfig('/preboarding/portal/tok123')).toBeNull();
  });
});
