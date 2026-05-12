import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {TestResult} from '../src/severity-classifier.js';
import {
  buildPlaywrightCommand,
  groupResultsBySeverity,
  parsePlaywrightJson,
  shouldBlockRelease,
} from '../src/orchestrator.js';

// ─── Mock fs ─────────────────────────────────────────────────────────────────

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeResult = (
  status: TestResult['status'],
  severity?: TestResult['severity'],
  title = 'some test',
): TestResult => ({
  testTitle: title,
  specFile: 'some.spec.ts',
  agentGroup: 'group-1',
  status,
  severity,
  durationMs: 50,
  retries: 0,
});

// ─── buildPlaywrightCommand ───────────────────────────────────────────────────

describe('buildPlaywrightCommand', () => {
  it('includes all provided spec files in the command', () => {
    const cmd = buildPlaywrightCommand(['e2e/auth.spec.ts', 'e2e/login.spec.ts'], {});
    expect(cmd).toContain('e2e/auth.spec.ts');
    expect(cmd).toContain('e2e/login.spec.ts');
  });

  it('starts with "npx playwright test"', () => {
    const cmd = buildPlaywrightCommand(['e2e/auth.spec.ts'], {});
    expect(cmd.trimStart()).toMatch(/^npx playwright test/);
  });

  it('includes --workers flag when workers option is provided', () => {
    const cmd = buildPlaywrightCommand(['e2e/spec.ts'], {workers: 4});
    expect(cmd).toContain('--workers=4');
  });

  it('includes --reporter flag when reporter option is provided', () => {
    const cmd = buildPlaywrightCommand(['e2e/spec.ts'], {reporter: 'json'});
    expect(cmd).toContain('--reporter=json');
  });

  it('includes --project flag when project option is provided', () => {
    const cmd = buildPlaywrightCommand(['e2e/spec.ts'], {project: 'chromium'});
    expect(cmd).toContain('--project=chromium');
  });

  it('includes --timeout flag when timeout option is provided', () => {
    const cmd = buildPlaywrightCommand(['e2e/spec.ts'], {timeout: 30000});
    expect(cmd).toContain('--timeout=30000');
  });

  it('produces correct full command with all options', () => {
    const cmd = buildPlaywrightCommand(['e2e/auth.spec.ts', 'e2e/dashboard.spec.ts'], {
      workers: 4,
      reporter: 'json',
      project: 'chromium',
    });
    expect(cmd).toContain('npx playwright test');
    expect(cmd).toContain('e2e/auth.spec.ts');
    expect(cmd).toContain('e2e/dashboard.spec.ts');
    expect(cmd).toContain('--workers=4');
    expect(cmd).toContain('--reporter=json');
    expect(cmd).toContain('--project=chromium');
  });

  it('handles empty options without crashing', () => {
    expect(() => buildPlaywrightCommand(['e2e/spec.ts'], {})).not.toThrow();
  });

  it('handles a single spec file', () => {
    const cmd = buildPlaywrightCommand(['e2e/only.spec.ts'], {project: 'chromium'});
    expect(cmd).toContain('e2e/only.spec.ts');
  });
});

// ─── parsePlaywrightJson ──────────────────────────────────────────────────────

describe('parsePlaywrightJson', () => {
  // Minimal Playwright JSON report shape
  const makePlaywrightJson = (suites: unknown[]) =>
    JSON.stringify({
      suites,
      stats: {expected: 0, unexpected: 0, flaky: 0, skipped: 0, ok: false, duration: 0},
    });

  const makeSuite = (file: string, specs: unknown[]) => ({
    title: file,
    file,
    specs,
    suites: [],
  });

  const makeSpec = (title: string, ok: boolean, durationMs = 100, retries = 0) => ({
    title,
    ok,
    tests: [
      {
        status: ok ? 'expected' : 'unexpected',
        results: [
          {
            status: ok ? 'passed' : 'failed',
            duration: durationMs,
            retry: retries,
            error: ok ? undefined : {message: 'Expected element to be visible'},
          },
        ],
      },
    ],
  });

  beforeEach(async () => {
    const fs = await import('fs');
    vi.mocked(fs.readFileSync).mockReset();
    vi.mocked(fs.existsSync).mockReset();
  });

  it('returns an empty array when JSON contains no suites', async () => {
    const fs = await import('fs');
    vi.mocked(fs.readFileSync).mockReturnValue(makePlaywrightJson([]));
    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results).toEqual([]);
  });

  it('maps a passing spec to a TestResult with status "passed"', async () => {
    const fs = await import('fs');
    const json = makePlaywrightJson([makeSuite('auth.spec.ts', [makeSpec('login works', true)])]);
    vi.mocked(fs.readFileSync).mockReturnValue(json);

    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('passed');
    expect(results[0].testTitle).toBe('login works');
  });

  it('maps a failing spec to a TestResult with status "failed"', async () => {
    const fs = await import('fs');
    const json = makePlaywrightJson([
      makeSuite('auth.spec.ts', [makeSpec('login fails silently', false)]),
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue(json);

    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
  });

  it('assigns severity to failed tests', async () => {
    const fs = await import('fs');
    const spec = makeSpec('auth login failed', false);
    const json = makePlaywrightJson([makeSuite('auth.spec.ts', [spec])]);
    vi.mocked(fs.readFileSync).mockReturnValue(json);

    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results[0].severity).toBeDefined();
  });

  it('does not assign severity to passed tests', async () => {
    const fs = await import('fs');
    const json = makePlaywrightJson([makeSuite('auth.spec.ts', [makeSpec('login works', true)])]);
    vi.mocked(fs.readFileSync).mockReturnValue(json);

    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results[0].severity).toBeUndefined();
  });

  it('preserves durationMs from the playwright result', async () => {
    const fs = await import('fs');
    const json = makePlaywrightJson([
      makeSuite('auth.spec.ts', [makeSpec('login works', true, 1500)]),
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue(json);

    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results[0].durationMs).toBe(1500);
  });

  it('sets specFile from the suite file path', async () => {
    const fs = await import('fs');
    const json = makePlaywrightJson([
      makeSuite('e2e/auth/login.spec.ts', [makeSpec('test', true)]),
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue(json);

    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results[0].specFile).toBe('e2e/auth/login.spec.ts');
  });

  it('parses multiple specs across multiple suites', async () => {
    const fs = await import('fs');
    const json = makePlaywrightJson([
      makeSuite('auth.spec.ts', [makeSpec('test 1', true), makeSpec('test 2', false)]),
      makeSuite('dashboard.spec.ts', [makeSpec('test 3', true)]),
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue(json);

    const results = parsePlaywrightJson('/tmp/report.json');
    expect(results).toHaveLength(3);
  });
});

// ─── groupResultsBySeverity ───────────────────────────────────────────────────

describe('groupResultsBySeverity (from orchestrator)', () => {
  it('returns counts for P0/P1/P2/PASS correctly', () => {
    const results: TestResult[] = [
      makeResult('passed'),
      makeResult('passed'),
      makeResult('skipped'),
      makeResult('failed', 'P0'),
      makeResult('failed', 'P1'),
      makeResult('failed', 'P2'),
    ];
    const counts = groupResultsBySeverity(results);
    expect(counts.P0).toBe(1);
    expect(counts.P1).toBe(1);
    expect(counts.P2).toBe(1);
    expect(counts.PASS).toBe(3); // 2 passed + 1 skipped
  });

  it('returns all zero failure counts when all pass', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('passed')];
    const counts = groupResultsBySeverity(results);
    expect(counts.P0).toBe(0);
    expect(counts.P1).toBe(0);
    expect(counts.P2).toBe(0);
    expect(counts.PASS).toBe(2);
  });
});

// ─── shouldBlockRelease ───────────────────────────────────────────────────────

describe('shouldBlockRelease (from orchestrator)', () => {
  it('returns true when any P0 exists', () => {
    const results: TestResult[] = [makeResult('failed', 'P0')];
    expect(shouldBlockRelease(results)).toBe(true);
  });

  it('returns true when any P1 exists and no P0', () => {
    const results: TestResult[] = [makeResult('passed'), makeResult('failed', 'P1')];
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

  it('returns false for empty results', () => {
    expect(shouldBlockRelease([])).toBe(false);
  });
});
