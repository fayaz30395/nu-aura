import {describe, expect, it} from 'vitest';
import {getQueryClient} from '../queryClient';

/**
 * BUG-L2 regression.
 *
 * The default `retry: 1` applied to every query, including ones that failed with a 4xx.
 * A request for a record that does not exist (a stale course link, a fabricated id) can
 * never succeed on a second attempt, so the retry only doubled the wait — up to 30s (the
 * GET timeout) twice — before the page could reach its not-found branch, which is gated on
 * `isLoading`. Users saw a spinner for up to a minute instead of "not found".
 *
 * Retries must be limited to failures that can plausibly succeed again: network errors and 5xx.
 */
describe('queryClient retry policy', () => {
  const retry = getQueryClient().getDefaultOptions().queries?.retry as
    (failureCount: number, error: unknown) => boolean;

  const withStatus = (status: number) => ({response: {status}});

  it('is configured as a predicate, not a bare count', () => {
    expect(typeof retry).toBe('function');
  });

  it.each([400, 404, 405, 409, 410, 422])('does not retry a terminal %i', (status) => {
    expect(retry(0, withStatus(status))).toBe(false);
  });

  // 401 is owned by the axios interceptor in lib/api/client.ts, which refreshes and replays
  // the request itself — so a recoverable 401 never reaches this predicate, and retrying here
  // only doubles every genuinely-expired request. 403 is authenticated-but-forbidden, which a
  // second identical request cannot change. Permissions come from the Zustand auth store
  // (usePermissions -> useAuth), not from a query, so this predicate cannot affect RBAC gates.
  it.each([401, 403])('does not retry a %i (owned by the axios 401 interceptor)', (status) => {
    expect(retry(0, withStatus(status))).toBe(false);
  });

  it.each([500, 502, 503, 504])('retries a %i once', (status) => {
    expect(retry(0, withStatus(status))).toBe(true);
    expect(retry(1, withStatus(status))).toBe(false);
  });

  it('retries a network error (no response) once', () => {
    const networkError = new Error('Network Error');
    expect(retry(0, networkError)).toBe(true);
    expect(retry(1, networkError)).toBe(false);
  });

  it('retries once when the error shape is unknown', () => {
    expect(retry(0, undefined)).toBe(true);
    expect(retry(0, {response: {}})).toBe(true);
  });
});
