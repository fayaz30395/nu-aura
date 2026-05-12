import {spawn} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  classifyFailure,
  type CycleResult,
  getReleaseSeverity,
  groupResultsBySeverity,
  shouldBlockRelease,
  type TestResult,
} from './severity-classifier.js';

// Re-export utilities so consumers only need one import
export {groupResultsBySeverity, shouldBlockRelease};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunOptions {
  workers?: number;
  reporter?: 'json' | 'html' | 'list';
  project?: string;
  timeout?: number;
}

// ─── Internal Playwright JSON shapes ─────────────────────────────────────────

interface PlaywrightResult {
  status: string;
  duration: number;
  retry: number;
  error?: { message?: string };
}

interface PlaywrightTest {
  status: string;
  results: PlaywrightResult[];
}

interface PlaywrightSpec {
  title: string;
  ok: boolean;
  file?: string;
  tests: PlaywrightTest[];
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightReport {
  suites: PlaywrightSuite[];
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const FRONTEND_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../../frontend',
);
const DEFAULT_REPORT_DIR = path.join(FRONTEND_DIR, 'playwright-report', 'autonomous');

// ─── buildPlaywrightCommand ───────────────────────────────────────────────────

/**
 * Builds the CLI command string to run Playwright for the given spec files.
 */
export function buildPlaywrightCommand(specFiles: string[], options: RunOptions): string {
  const parts: string[] = ['npx', 'playwright', 'test', ...specFiles];

  if (options.workers !== undefined) parts.push(`--workers=${options.workers}`);
  if (options.reporter !== undefined) parts.push(`--reporter=${options.reporter}`);
  if (options.project !== undefined) parts.push(`--project=${options.project}`);
  if (options.timeout !== undefined) parts.push(`--timeout=${options.timeout}`);

  return parts.join(' ');
}

// ─── parsePlaywrightJson ──────────────────────────────────────────────────────

/**
 * Reads a Playwright JSON report from disk and maps every spec entry to a
 * TestResult. Failed tests are automatically severity-classified.
 */
export function parsePlaywrightJson(jsonPath: string): TestResult[] {
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const report = JSON.parse(raw) as PlaywrightReport;

  const results: TestResult[] = [];
  flattenSuites(report.suites ?? [], results);
  return results;
}

function flattenSuites(suites: PlaywrightSuite[], out: TestResult[], parentFile = ''): void {
  for (const suite of suites) {
    const file = suite.file ?? parentFile;

    // Recurse into nested suites (e.g. describe blocks)
    if (suite.suites && suite.suites.length > 0) {
      flattenSuites(suite.suites, out, file);
    }

    for (const spec of suite.specs ?? []) {
      const specFile = spec.file ?? file;
      mapSpec(spec, specFile, out);
    }
  }
}

function mapSpec(spec: PlaywrightSpec, specFile: string, out: TestResult[]): void {
  // Each spec may have multiple test entries (per project/retry). Take the
  // first meaningful result per spec to avoid duplicates in the output.
  const test = spec.tests?.[0];
  if (!test) {
    // Spec with no test entries — treat as skipped
    out.push(makeSkipped(spec.title, specFile));
    return;
  }

  const result = test.results?.[0];
  const durationMs = result?.duration ?? 0;
  const retries = result?.retry ?? 0;
  const rawStatus = test.status ?? (spec.ok ? 'expected' : 'unexpected');

  const status = mapStatus(rawStatus, spec.ok);
  const errorMessage = result?.error?.message ?? '';

  const entry: TestResult = {
    testTitle: spec.title,
    specFile,
    agentGroup: '', // caller fills this in if needed
    status,
    durationMs,
    retries,
  };

  if (status === 'failed') {
    entry.severity = classifyFailure(spec.title, errorMessage);
    entry.errorMessage = errorMessage;
  }

  out.push(entry);
}

function mapStatus(
  raw: string,
  ok: boolean,
): 'passed' | 'failed' | 'skipped' | 'flaky' {
  if (raw === 'flaky') return 'flaky';
  if (raw === 'skipped') return 'skipped';
  if (ok || raw === 'expected' || raw === 'passed') return 'passed';
  return 'failed';
}

function makeSkipped(title: string, specFile: string): TestResult {
  return {
    testTitle: title,
    specFile,
    agentGroup: '',
    status: 'skipped',
    durationMs: 0,
    retries: 0,
  };
}

// ─── runAgentGroup ────────────────────────────────────────────────────────────

/**
 * Runs Playwright for a named group of spec files.
 * Returns the classified TestResult[] for that group.
 */
export async function runAgentGroup(
  groupName: string,
  specFiles: string[],
  outputDir: string,
): Promise<TestResult[]> {
  fs.mkdirSync(outputDir, {recursive: true});

  const timestamp = Date.now();
  const jsonPath = path.join(outputDir, `${groupName}-${timestamp}.json`);

  const args = [
    'playwright',
    'test',
    ...specFiles,
    '--workers=4',
    '--reporter=json',
    '--project=chromium',
    '--no-deps',  // auth setup runs once before parallel groups
  ];

  await spawnPlaywright(args, FRONTEND_DIR, {PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath});

  if (!fs.existsSync(jsonPath)) {
    console.warn(`[qa-orchestrator] No JSON output found for group ${groupName}`);
    return [];
  }

  const results = parsePlaywrightJson(jsonPath);
  // Tag each result with the group name
  return results.map((r) => ({...r, agentGroup: groupName}));
}

/** Runs `npx <args>` in cwd, resolves when the process exits (regardless of code). */
function spawnPlaywright(args: string[], cwd: string, env: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn('npx', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {...process.env, ...env},
    });

    child.stdout.on('data', (chunk: Buffer) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));

    // Playwright exits non-zero on test failures — that is expected.
    child.on('close', () => resolve());
    child.on('error', (err) => {
      console.error(`[qa-orchestrator] spawn error: ${err.message}`);
      resolve();
    });
  });
}

// ─── runAllGroups ─────────────────────────────────────────────────────────────

/**
 * Runs all groups in parallel, aggregates results into a CycleResult.
 */
/** Runs auth.setup.ts once to create shared session state before parallel groups. */
async function runAuthSetup(): Promise<void> {
  console.log('[qa-orchestrator] Running auth setup (serial)...');
  await spawnPlaywright(
    ['playwright', 'test', '--project=setup', '--workers=1'],
    FRONTEND_DIR,
  );
  console.log('[qa-orchestrator] Auth setup complete.');
}

export async function runAllGroups(
  groups: Record<string, string[]>,
  outputDir: string = DEFAULT_REPORT_DIR,
): Promise<CycleResult> {
  const cycleId = `cycle-${Date.now()}`;
  const startedAt = new Date();

  // Run auth setup once before parallel groups to avoid race on shared auth state
  await runAuthSetup();

  const groupEntries = Object.entries(groups);
  const allResults = await Promise.all(
    groupEntries.map(([name, specs]) => runAgentGroup(name, specs, outputDir)),
  );

  const tests = allResults.flat();
  const completedAt = new Date();

  const counts = groupResultsBySeverity(tests);
  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const skipped = tests.filter((t) => t.status === 'skipped').length;
  const flaky = tests.filter((t) => t.status === 'flaky').length;

  return {
    cycleId,
    startedAt,
    completedAt,
    tests,
    summary: {
      total: tests.length,
      passed,
      failed,
      skipped,
      flaky,
      p0: counts.P0,
      p1: counts.P1,
      p2: counts.P2,
    },
    releaseDecision: getReleaseSeverity(tests),
  };
}

// ─── startContinuousLoop ──────────────────────────────────────────────────────

/**
 * Runs runAllGroups() in a loop with a configurable cooldown period.
 * Handles SIGINT gracefully.
 */
export async function startContinuousLoop(
  groups: Record<string, string[]>,
  options: {
    cooldownMs?: number;
    outputDir?: string;
    onCycleComplete?: (result: CycleResult) => void;
    stopSignal?: { stop: boolean };
  } = {},
): Promise<void> {
  const {cooldownMs = 30_000, outputDir = DEFAULT_REPORT_DIR, onCycleComplete} = options;
  const stopSignal = options.stopSignal ?? {stop: false};

  // Allow the caller to cancel via SIGINT
  const handleSigint = () => {
    console.log('\n[qa-orchestrator] SIGINT received — stopping after current cycle');
    stopSignal.stop = true;
  };
  process.once('SIGINT', handleSigint);

  let cycleNumber = 0;

  try {
    while (!stopSignal.stop) {
      cycleNumber++;
      const ts = new Date().toISOString();
      console.log(`\n[qa-orchestrator] === Cycle ${cycleNumber} starting at ${ts} ===`);

      const result = await runAllGroups(groups, outputDir);

      const {summary, releaseDecision} = result;
      console.log(
        `[qa-orchestrator] Cycle ${cycleNumber} complete — ` +
        `total=${summary.total} passed=${summary.passed} failed=${summary.failed} ` +
        `P0=${summary.p0} P1=${summary.p1} P2=${summary.p2} decision=${releaseDecision}`,
      );

      onCycleComplete?.(result);

      if (stopSignal.stop) break;

      await sleep(cooldownMs);
    }
  } finally {
    process.removeListener('SIGINT', handleSigint);
    console.log('[qa-orchestrator] Loop stopped.');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
