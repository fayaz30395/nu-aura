import {afterEach, describe, expect, it, vi} from 'vitest';
import {validateEnv} from '../env';

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
