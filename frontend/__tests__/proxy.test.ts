import {NextRequest} from 'next/server';
import {describe, expect, it} from 'vitest';
import {proxy} from '../proxy';

const BASE = 'http://localhost:3000';

function run(path: string) {
  return proxy(new NextRequest(`${BASE}${path}`));
}

function loginRedirect(path: string): URL | null {
  const location = run(path).headers.get('location');
  return location ? new URL(location) : null;
}

describe('proxy public route matching', () => {
  it.each(['/', '/careers', '/careers/senior-engineer', '/terms', '/auth/login', '/preboarding/portal/tok123', '/sign/abc'])(
    'allows public route %s without a session',
    (path) => {
      expect(run(path).headers.get('location')).toBeNull();
    }
  );

  it.each(['/careersadmin', '/terms-admin', '/privacy-settings', '/offer-portalx'])(
    'does not treat %s as public just because it shares a prefix',
    (path) => {
      const url = loginRedirect(path);
      expect(url?.pathname).toBe('/auth/login');
      expect(url?.searchParams.get('returnUrl')).toBe(path);
    }
  );
});

describe('proxy login redirect', () => {
  it('preserves the requested path and query as returnUrl', () => {
    const url = loginRedirect('/employees?tab=docs&page=2');
    expect(url?.pathname).toBe('/auth/login');
    expect(url?.searchParams.get('returnUrl')).toBe('/employees?tab=docs&page=2');
  });
});
