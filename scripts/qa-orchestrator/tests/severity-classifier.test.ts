import { describe, it, expect } from 'vitest';
import {
  classifyFailure,
  getReleaseSeverity,
  groupResultsBySeverity,
  shouldBlockRelease,
  type TestResult,
} from '../src/severity-classifier.js';

// ─── classifyFailure ──────────────────────────────────────────────────────────

describe('classifyFailure — P0 (hard blocks)', () => {
  it('classifies auth login failure as P0', () => {
    expect(classifyFailure('auth login failed', 'Expected 200 got 401')).toBe('P0');
  });

  it('classifies blank page detected as P0 (empty error message)', () => {
    expect(classifyFailure('blank page detected', '')).toBe('P0');
  });

  it('classifies white screen as P0', () => {
    expect(classifyFailure('white screen on dashboard', '')).toBe('P0');
  });

  it('classifies 500 error response as P0', () => {
    expect(classifyFailure('checkout fails', 'API returned 500 Internal Server Error')).toBe('P0');
  });

  it('classifies 502 error response as P0', () => {
    expect(classifyFailure('page load', 'received 502 Bad Gateway')).toBe('P0');
  });

  it('classifies 503 error response as P0', () => {
    expect(classifyFailure('service unavailable', '503 service unavailable')).toBe('P0');
  });

  it('classifies application crash as P0', () => {
    expect(classifyFailure('app crash on submit', 'Uncaught error: crash detected')).toBe('P0');
  });

  it('classifies data loss scenario as P0', () => {
    expect(classifyFailure('data loss on save', '')).toBe('P0');
  });

  it('classifies navigation failure as P0', () => {
    expect(classifyFailure('navigation fail to /dashboard', '')).toBe('P0');
  });

  it('classifies page not load as P0', () => {
    expect(classifyFailure('page not load after redirect', '')).toBe('P0');
  });
});

describe('classifyFailure — P1 (significant failures)', () => {
  it('classifies form submit failure as P1', () => {
    expect(classifyFailure('form submit fails', 'API returned 400')).toBe('P1');
  });

  it('classifies RBAC violation as P1', () => {
    expect(classifyFailure('RBAC employee cannot access manager endpoint', '')).toBe('P1');
  });

  it('classifies permission error as P1', () => {
    expect(classifyFailure('permission denied for export action', '')).toBe('P1');
  });

  it('classifies unauthorized access attempt as P1', () => {
    expect(classifyFailure('unauthorized to view payroll', '401 Unauthorized')).toBe('P1');
  });

  it('classifies forbidden response as P1', () => {
    expect(classifyFailure('user accesses admin panel', '403 Forbidden')).toBe('P1');
  });

  it('classifies API error (non-5xx) as P1', () => {
    expect(classifyFailure('create employee', 'API error: 422 Unprocessable Entity')).toBe('P1');
  });

  it('classifies validation fail as P1', () => {
    expect(classifyFailure('form validation fail on required fields', '')).toBe('P1');
  });

  it('classifies save failure as P1', () => {
    expect(classifyFailure('save fail — profile update', '')).toBe('P1');
  });

  it('classifies 400 status in error message as P1', () => {
    expect(classifyFailure('submit timesheet', 'received 400 bad request')).toBe('P1');
  });

  it('classifies 401 status in error message as P1', () => {
    expect(classifyFailure('access report', 'returned 401')).toBe('P1');
  });

  it('classifies 403 status in error message as P1', () => {
    expect(classifyFailure('update settings', 'server returned 403')).toBe('P1');
  });
});

describe('classifyFailure — P2 (visual / cosmetic)', () => {
  it('classifies slight misalignment as P2', () => {
    expect(classifyFailure('button slightly misaligned on mobile', '')).toBe('P2');
  });

  it('classifies tooltip overlap in dark mode as P2', () => {
    expect(classifyFailure('tooltip overlaps in dark mode', '')).toBe('P2');
  });

  it('classifies generic UI glitch as P2', () => {
    expect(classifyFailure('UI glitch on hover', '')).toBe('P2');
  });

  it('classifies visual diff failure as P2', () => {
    expect(classifyFailure('screenshot visual diff mismatch', '')).toBe('P2');
  });

  it('classifies unrecognised failure message as P2 fallback', () => {
    expect(classifyFailure('some unknown test failed', 'unexpected output')).toBe('P2');
  });
});

// ─── getReleaseSeverity ───────────────────────────────────────────────────────

const makeResult = (
  status: TestResult['status'],
  severity?: TestResult['severity'],
): TestResult => ({
  testTitle: 'test',
  specFile: 'spec.ts',
  agentGroup: 'group-1',
  status,
  severity,
  durationMs: 100,
  retries: 0,
});

describe('getReleaseSeverity', () => {
  it('returns P0 if any failed result is classified P0', () => {
    const results: TestResult[] = [
      makeResult('passed'),
      makeResult('failed', 'P0'),
      makeResult('failed', 'P1'),
    ];
    expect(getReleaseSeverity(results)).toBe('P0');
  });

  it('returns P1 if there are P1 failures but no P0', () => {
    const results: TestResult[] = [
      makeResult('passed'),
      makeResult('failed', 'P1'),
      makeResult('failed', 'P2'),
    ];
    expect(getReleaseSeverity(results)).toBe('P1');
  });

  it('returns PASS if only P2 failures exist', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('failed', 'P2')];
    expect(getReleaseSeverity(results)).toBe('PASS');
  });

  it('returns PASS when there are no failures at all', () => {
    const results: TestResult[] = [
      makeResult('passed'),
      makeResult('passed'),
      makeResult('skipped'),
    ];
    expect(getReleaseSeverity(results)).toBe('PASS');
  });

  it('returns PASS for an empty results array', () => {
    expect(getReleaseSeverity([])).toBe('PASS');
  });

  it('returns P0 even when mixed with many passes and P2s', () => {
    const results: TestResult[] = [
      makeResult('passed'),
      makeResult('passed'),
      makeResult('failed', 'P2'),
      makeResult('failed', 'P2'),
      makeResult('failed', 'P0'),
    ];
    expect(getReleaseSeverity(results)).toBe('P0');
  });
});

// ─── groupResultsBySeverity ───────────────────────────────────────────────────

describe('groupResultsBySeverity', () => {
  it('counts P0, P1, P2 and PASS correctly', () => {
    const results: TestResult[] = [
      makeResult('passed'),
      makeResult('passed'),
      makeResult('skipped'),
      makeResult('failed', 'P0'),
      makeResult('failed', 'P1'),
      makeResult('failed', 'P1'),
      makeResult('failed', 'P2'),
    ];
    const counts = groupResultsBySeverity(results);
    expect(counts.P0).toBe(1);
    expect(counts.P1).toBe(2);
    expect(counts.P2).toBe(1);
    expect(counts.PASS).toBe(3); // 2 passed + 1 skipped
  });

  it('returns all-zero counts for P0/P1/P2 when every result passes', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('passed')];
    const counts = groupResultsBySeverity(results);
    expect(counts.P0).toBe(0);
    expect(counts.P1).toBe(0);
    expect(counts.P2).toBe(0);
    expect(counts.PASS).toBe(2);
  });

  it('returns all zero PASS count when every result is a P0 failure', () => {
    const results: TestResult[] = [makeResult('failed', 'P0'), makeResult('failed', 'P0')];
    const counts = groupResultsBySeverity(results);
    expect(counts.P0).toBe(2);
    expect(counts.PASS).toBe(0);
  });
});

// ─── shouldBlockRelease ───────────────────────────────────────────────────────

describe('shouldBlockRelease', () => {
  it('returns true when any P0 result exists', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('failed', 'P0')];
    expect(shouldBlockRelease(results)).toBe(true);
  });

  it('returns true when any P1 result exists (no P0)', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('failed', 'P1')];
    expect(shouldBlockRelease(results)).toBe(true);
  });

  it('returns true when both P0 and P1 exist', () => {
    const results: TestResult[] = [
      makeResult('failed', 'P0'),
      makeResult('failed', 'P1'),
    ];
    expect(shouldBlockRelease(results)).toBe(true);
  });

  it('returns false when only P2 failures exist', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('failed', 'P2')];
    expect(shouldBlockRelease(results)).toBe(false);
  });

  it('returns false when all results pass', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('passed')];
    expect(shouldBlockRelease(results)).toBe(false);
  });

  it('returns false for an empty results array', () => {
    expect(shouldBlockRelease([])).toBe(false);
  });
});
