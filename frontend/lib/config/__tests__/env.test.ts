import {afterEach, describe, expect, it, vi} from 'vitest';
import {validateEnv, withApiV1Prefix} from '../env';

const ORIGINAL_ENV = {...process.env};

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = {...ORIGINAL_ENV};
});

describe('environment validation', () => {
  it('enables realtime WebSocket notifications by default', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.nulogic.com/api/v1');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_WEBSOCKET', '');
    delete process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET;

    const result = validateEnv();

    expect(result.success).toBe(true);
    expect(result.env?.NEXT_PUBLIC_ENABLE_WEBSOCKET).toBe('true');
  });

  it('allows an explicit emergency WebSocket disable flag', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.nulogic.com/api/v1');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_WEBSOCKET', 'false');

    const result = validateEnv();

    expect(result.success).toBe(true);
    expect(result.env?.NEXT_PUBLIC_ENABLE_WEBSOCKET).toBe('false');
  });

  it('rejects loopback API URLs in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8080/api/v1');

    const result = validateEnv();

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'NEXT_PUBLIC_API_URL: NEXT_PUBLIC_API_URL must not point to localhost or loopback when NODE_ENV=production. Set it to the real deployed API URL, for example https://api.company.com/api/v1.'
    );
  });

  it('rejects placeholder API URLs in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.your-domain.com/api/v1');

    const result = validateEnv();

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'NEXT_PUBLIC_API_URL: NEXT_PUBLIC_API_URL must point to the real deployed API, not an example or placeholder domain.'
    );
  });
});

describe('withApiV1Prefix — API base URL normalization (CSRF/login fix)', () => {
  it('appends /api/v1 to a bare origin (the misconfigured-deploy case that 403s login)', () => {
    expect(withApiV1Prefix('https://nu-aura-backend-production.up.railway.app')).toBe(
      'https://nu-aura-backend-production.up.railway.app/api/v1'
    );
  });

  it('is idempotent when the suffix is already present', () => {
    expect(withApiV1Prefix('https://api.nulogic.com/api/v1')).toBe('https://api.nulogic.com/api/v1');
  });

  it('strips a trailing slash before appending', () => {
    expect(withApiV1Prefix('https://api.nulogic.com/')).toBe('https://api.nulogic.com/api/v1');
  });

  it('strips a trailing slash on an already-suffixed URL', () => {
    expect(withApiV1Prefix('https://api.nulogic.com/api/v1/')).toBe('https://api.nulogic.com/api/v1');
  });

  it('normalizes a bare localhost dev origin', () => {
    expect(withApiV1Prefix('http://localhost:8080')).toBe('http://localhost:8080/api/v1');
  });
});
