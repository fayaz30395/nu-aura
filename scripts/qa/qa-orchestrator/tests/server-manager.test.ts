import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {checkServer, getServerStatus, waitForServer} from '../src/server-manager.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('checkServer', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns true when server responds with 200', async () => {
    mockFetch.mockResolvedValueOnce({ok: true, status: 200});
    const result = await checkServer('http://localhost:3000');
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000',
      expect.objectContaining({signal: expect.any(AbortSignal)}),
    );
  });

  it('returns true when server responds with non-200 (port is listening)', async () => {
    // Any HTTP response means the port is up, even 500 (e.g. Next.js dev startup error page)
    mockFetch.mockResolvedValueOnce({ok: false, status: 500});
    const result = await checkServer('http://localhost:3000');
    expect(result).toBe(true);
  });

  it('returns false when connection is refused (fetch throws)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await checkServer('http://localhost:3000');
    expect(result).toBe(false);
  });

  it('returns false on network timeout (AbortError)', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);
    const result = await checkServer('http://localhost:3000');
    expect(result).toBe(false);
  });

  it('uses the provided URL in the fetch call', async () => {
    mockFetch.mockResolvedValueOnce({ok: true, status: 200});
    await checkServer('http://localhost:8080/actuator/health');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/actuator/health',
      expect.any(Object),
    );
  });
});

describe('waitForServer', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when server is already up', async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});
    const promise = waitForServer('http://localhost:3000', 5000);
    // Advance time slightly to allow the first check to complete
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves when server comes up within timeout', async () => {
    // First two calls fail, third succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ok: true, status: 200});

    const promise = waitForServer('http://localhost:3000', 10000);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects with timeout error when server never comes up', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    // Attach the rejection handler before advancing timers to avoid an
    // unhandled-rejection warning from vitest's async event-loop tracking.
    const promise = waitForServer('http://localhost:3000', 100);
    const caught = promise.catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/timeout/i);
  });
});

describe('getServerStatus', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns { frontend: true, backend: true } when both servers are up', async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});
    const status = await getServerStatus();
    expect(status).toEqual({frontend: true, backend: true});
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns { frontend: false, backend: true } when only frontend is down', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED')) // frontend
      .mockResolvedValueOnce({ok: true, status: 200}); // backend
    const status = await getServerStatus();
    expect(status).toEqual({frontend: false, backend: true});
  });

  it('returns { frontend: true, backend: false } when only backend is down', async () => {
    mockFetch
      .mockResolvedValueOnce({ok: true, status: 200}) // frontend
      .mockRejectedValueOnce(new Error('ECONNREFUSED')); // backend
    const status = await getServerStatus();
    expect(status).toEqual({frontend: true, backend: false});
  });

  it('returns { frontend: false, backend: false } when both servers are down', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const status = await getServerStatus();
    expect(status).toEqual({frontend: false, backend: false});
  });

  it('checks frontend URL (localhost:3000) and backend URL (localhost:8080)', async () => {
    mockFetch.mockResolvedValue({ok: true, status: 200});
    await getServerStatus();
    const calledUrls = mockFetch.mock.calls.map((call) => call[0] as string);
    expect(calledUrls.some((url) => url.includes('3000'))).toBe(true);
    expect(calledUrls.some((url) => url.includes('8080'))).toBe(true);
  });
});
