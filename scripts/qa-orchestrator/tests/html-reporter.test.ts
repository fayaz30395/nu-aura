import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  generateSummaryBadge,
  generateTestRow,
  generateReport,
  saveReport,
} from '../src/html-reporter.js';
import type { CycleResult, TestResult } from '../src/severity-classifier.js';

vi.mock('node:fs');
vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof path>();
  return {
    ...original,
    join: original.join,
    resolve: original.resolve,
  };
});

const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);

// ── fixtures ─────────────────────────────────────────────────────────────────

const makeTestResult = (overrides: Partial<TestResult> = {}): TestResult => ({
  testTitle: 'should render the dashboard',
  status: 'failed',
  severity: 'P1',
  agentGroup: 'hrms-core',
  durationMs: 1234,
  retries: 0,
  errorMessage: 'Expected element to be visible',
  specFile: 'dashboard.spec.ts',
  ...overrides,
});

const makeCycleResult = (overrides: Partial<CycleResult> = {}): CycleResult => ({
  cycleId: 'cycle-2026-05-02T10-00-00',
  startedAt: new Date('2026-05-02T10:00:00Z'),
  completedAt: new Date('2026-05-02T10:05:00Z'),
  releaseDecision: 'FAIL',
  tests: [
    makeTestResult({ testTitle: 'login works', status: 'passed', severity: 'P0', agentGroup: 'smoke', errorMessage: undefined }),
    makeTestResult({ testTitle: 'dashboard loads', status: 'failed', severity: 'P0', agentGroup: 'hrms-core', errorMessage: 'Element not found' }),
    makeTestResult({ testTitle: 'employee list', status: 'failed', severity: 'P1', agentGroup: 'hrms-core', errorMessage: 'Timeout' }),
    makeTestResult({ testTitle: 'wiki renders', status: 'passed', severity: 'P2', agentGroup: 'fluence-edge', errorMessage: undefined }),
  ],
  summary: {
    total: 4,
    passed: 2,
    failed: 2,
    p0: 1,
    p1: 1,
    p2: 0,
    durationMs: 5000,
  },
  ...overrides,
});

// ── generateSummaryBadge ──────────────────────────────────────────────────────

describe('generateSummaryBadge', () => {
  it('returns HTML string for P0 containing "P0" and red color', () => {
    const badge = generateSummaryBadge('P0');
    expect(typeof badge).toBe('string');
    expect(badge).toContain('P0');
    expect(badge.toLowerCase()).toMatch(/red|#dc2626|#ef4444|#b91c1c/);
  });

  it('returns HTML string for PASS containing "PASS" and green color', () => {
    const badge = generateSummaryBadge('PASS');
    expect(typeof badge).toBe('string');
    expect(badge).toContain('PASS');
    expect(badge.toLowerCase()).toMatch(/green|#16a34a|#22c55e|#15803d/);
  });

  it('returns HTML string for P1 containing "P1" and orange color', () => {
    const badge = generateSummaryBadge('P1');
    expect(badge).toContain('P1');
    expect(badge.toLowerCase()).toMatch(/orange|#ea580c|#f97316|#d97706|#b45309/);
  });

  it('returns HTML string for P2 containing "P2" and yellow color', () => {
    const badge = generateSummaryBadge('P2');
    expect(badge).toContain('P2');
    expect(badge.toLowerCase()).toMatch(/yellow|#ca8a04|#eab308|#d97706|#f59e0b/);
  });

  it('returns HTML string for FAIL containing "FAIL" and red color', () => {
    const badge = generateSummaryBadge('FAIL');
    expect(badge).toContain('FAIL');
    expect(badge.toLowerCase()).toMatch(/red|#dc2626|#ef4444|#b91c1c/);
  });

  it('returns a non-empty string for every known value', () => {
    for (const val of ['P0', 'P1', 'P2', 'PASS', 'FAIL'] as const) {
      expect(generateSummaryBadge(val).length).toBeGreaterThan(0);
    }
  });
});

// ── generateTestRow ───────────────────────────────────────────────────────────

describe('generateTestRow', () => {
  it('returns a string containing the test title', () => {
    const row = generateTestRow(makeTestResult({ testTitle: 'my test title' }));
    expect(row).toContain('my test title');
  });

  it('includes a severity badge in the row', () => {
    const row = generateTestRow(makeTestResult({ severity: 'P1' }));
    expect(row).toContain('P1');
  });

  it('includes the duration formatted as a number', () => {
    const row = generateTestRow(makeTestResult({ durationMs: 1234 }));
    expect(row).toContain('1234');
  });

  it('includes the agent group', () => {
    const row = generateTestRow(makeTestResult({ agentGroup: 'rbac-security' }));
    expect(row).toContain('rbac-security');
  });

  it('includes "passed" status indicator for passed tests', () => {
    const row = generateTestRow(makeTestResult({ status: 'passed' }));
    expect(row.toLowerCase()).toMatch(/pass/);
  });

  it('includes "failed" status indicator for failed tests', () => {
    const row = generateTestRow(makeTestResult({ status: 'failed' }));
    expect(row.toLowerCase()).toMatch(/fail/);
  });

  it('includes truncated error message when error is present', () => {
    const row = generateTestRow(makeTestResult({ errorMessage: 'Element not found in DOM' }));
    expect(row).toContain('Element not found');
  });

  it('does not throw when error is undefined', () => {
    expect(() => generateTestRow(makeTestResult({ errorMessage: undefined }))).not.toThrow();
  });

  it('returns an HTML table row (contains <tr)', () => {
    const row = generateTestRow(makeTestResult());
    expect(row).toContain('<tr');
  });
});

// ── generateReport ────────────────────────────────────────────────────────────

describe('generateReport', () => {
  it('returns a non-empty HTML string', () => {
    const html = generateReport(makeCycleResult());
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
  });

  it('HTML includes the cycle ID', () => {
    const cycle = makeCycleResult({ cycleId: 'cycle-2026-05-02T10-00-00' });
    const html = generateReport(cycle);
    expect(html).toContain('cycle-2026-05-02T10-00-00');
  });

  it('HTML includes P0 section header', () => {
    const html = generateReport(makeCycleResult());
    expect(html).toContain('P0');
  });

  it('HTML includes P1 section header', () => {
    const html = generateReport(makeCycleResult());
    expect(html).toContain('P1');
  });

  it('HTML includes P2 section header', () => {
    const html = generateReport(makeCycleResult());
    expect(html).toContain('P2');
  });

  it('HTML includes "NU-AURA" brand name in the header', () => {
    const html = generateReport(makeCycleResult());
    expect(html).toContain('NU-AURA');
  });

  it('HTML includes release decision (PASS or FAIL)', () => {
    const html = generateReport(makeCycleResult({ releaseDecision: 'PASS' }));
    expect(html).toContain('PASS');
  });

  it('HTML includes READY FOR RELEASE banner when decision is PASS', () => {
    const html = generateReport(makeCycleResult({ releaseDecision: 'PASS' }));
    expect(html.toUpperCase()).toContain('READY FOR RELEASE');
  });

  it('HTML includes BLOCKED banner when decision is FAIL', () => {
    const html = generateReport(makeCycleResult({ releaseDecision: 'FAIL' }));
    expect(html.toUpperCase()).toContain('BLOCKED');
  });

  it('HTML includes agent group names as section headings or card labels', () => {
    const html = generateReport(makeCycleResult());
    expect(html).toContain('hrms-core');
    expect(html).toContain('smoke');
  });

  it('HTML is a complete document starting with <!DOCTYPE', () => {
    const html = generateReport(makeCycleResult());
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it('HTML includes summary statistics (total, passed, failed)', () => {
    const cycle = makeCycleResult();
    const html = generateReport(cycle);
    expect(html).toContain(String(cycle.summary.total));
    expect(html).toContain(String(cycle.summary.passed));
    expect(html).toContain(String(cycle.summary.failed));
  });

  it('HTML includes test titles from the cycle', () => {
    const html = generateReport(makeCycleResult());
    expect(html).toContain('dashboard loads');
    expect(html).toContain('login works');
  });

  it('does not have external CSS or JS links (self-contained)', () => {
    const html = generateReport(makeCycleResult());
    expect(html).not.toMatch(/<link[^>]+href=["']https?:/i);
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
  });
});

// ── saveReport ────────────────────────────────────────────────────────────────

describe('saveReport', () => {
  beforeEach(() => {
    mockWriteFileSync.mockReset();
    mockMkdirSync.mockReset();
  });

  it('writes an HTML file to the output directory', () => {
    const cycle = makeCycleResult();
    saveReport(cycle, '/tmp/qa-reports');
    expect(mockWriteFileSync).toHaveBeenCalledOnce();
    const [filePath] = mockWriteFileSync.mock.calls[0] as [string, string];
    expect(filePath).toContain('/tmp/qa-reports');
    expect(filePath).toMatch(/\.html$/);
  });

  it('returns the absolute file path that was written', () => {
    const cycle = makeCycleResult();
    const result = saveReport(cycle, '/tmp/qa-reports');
    expect(result).toMatch(/\.html$/);
    expect(result).toContain('/tmp/qa-reports');
  });

  it('file name matches pattern qa-report-{YYYY-MM-DD}-{HH-mm-ss}.html', () => {
    const cycle = makeCycleResult({ startedAt: new Date('2026-05-02T14:35:07Z') });
    const result = saveReport(cycle, '/tmp/qa-reports');
    const filename = result.split('/').pop()!;
    expect(filename).toMatch(/^qa-report-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.html$/);
  });

  it('creates the output directory recursively before writing', () => {
    const cycle = makeCycleResult();
    saveReport(cycle, '/tmp/deeply/nested/dir');
    expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/deeply/nested/dir', { recursive: true });
  });

  it('writes HTML content (not empty string)', () => {
    const cycle = makeCycleResult();
    saveReport(cycle, '/tmp/qa-reports');
    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string];
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(100);
  });
});
