// ─── Types ────────────────────────────────────────────────────────────────────

export type Severity = 'P0' | 'P1' | 'P2';
export type ReleaseDecision = 'P0' | 'P1' | 'PASS';

export interface TestResult {
  testTitle: string;
  specFile: string;
  agentGroup: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky';
  severity?: Severity;
  errorMessage?: string;
  durationMs: number;
  retries: number;
}

export interface CycleResult {
  cycleId: string;
  startedAt: Date;
  completedAt: Date;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    p0: number;
    p1: number;
    p2: number;
  };
  releaseDecision: ReleaseDecision;
}

// ─── Classification patterns ──────────────────────────────────────────────────

/** P0: hard-blocking failures — platform cannot be used for core flows */
const P0_PATTERNS: RegExp[] = [
  /blank\s*page/i,
  /white\s*screen/i,
  /auth.*fail/i,
  /login.*fail/i,
  /fail.*login/i,
  /\b500\b/,
  /\b502\b/,
  /\b503\b/,
  /crash/i,
  /data\s*loss/i,
  /navigation\s*fail/i,
  /page\s*not\s*load/i,
  /not\s*load.*page/i,
];

/** P1: significant failures — feature broken but platform still navigable */
const P1_PATTERNS: RegExp[] = [
  /form.*fail/i,
  /fail.*form/i,
  /submit.*fail/i,
  /fail.*submit/i,
  /save.*fail/i,
  /fail.*save/i,
  /\brbac\b/i,
  /permission/i,
  /unauthorized/i,
  /forbidden/i,
  /api\s*error/i,
  /validation.*fail/i,
  /fail.*validation/i,
  /\b400\b/,
  /\b401\b/,
  /\b403\b/,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesPatterns(patterns: RegExp[], ...texts: string[]): boolean {
  const combined = texts.join(' ');
  return patterns.some((re) => re.test(combined));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify a test failure by examining its title and error message.
 * Returns 'P0' for hard-block failures, 'P1' for significant failures,
 * and 'P2' for cosmetic / visual issues.
 */
export function classifyFailure(testTitle: string, errorMessage: string): Severity {
  if (matchesPatterns(P0_PATTERNS, testTitle, errorMessage)) return 'P0';
  if (matchesPatterns(P1_PATTERNS, testTitle, errorMessage)) return 'P1';
  return 'P2';
}

/**
 * Determine the overall release decision from a set of test results.
 * - 'P0' if any failed result has severity P0
 * - 'P1' if any failed result has severity P1 (and no P0)
 * - 'PASS' if only P2 failures or no failures
 */
export function getReleaseSeverity(results: TestResult[]): ReleaseDecision {
  const failed = results.filter((r) => r.status === 'failed');
  if (failed.some((r) => r.severity === 'P0')) return 'P0';
  if (failed.some((r) => r.severity === 'P1')) return 'P1';
  return 'PASS';
}

/**
 * Group results into counts per bucket: P0, P1, P2, PASS.
 * Non-failed results (passed, skipped, flaky) count toward PASS.
 */
export function groupResultsBySeverity(
  results: TestResult[],
): Record<Severity | 'PASS', number> {
  const counts: Record<Severity | 'PASS', number> = {P0: 0, P1: 0, P2: 0, PASS: 0};

  for (const r of results) {
    if (r.status === 'failed' && r.severity) {
      counts[r.severity]++;
    } else {
      counts.PASS++;
    }
  }

  return counts;
}

/**
 * Returns true when the release should be blocked:
 * any P0 or P1 failure is present.
 */
export function shouldBlockRelease(results: TestResult[]): boolean {
  const decision = getReleaseSeverity(results);
  return decision === 'P0' || decision === 'P1';
}
