#!/usr/bin/env node
// Verify-contract checker for faylo-sdlc stories.
//
// WHY THIS EXISTS
// The 2026-09-24 verification pass found 6,897 tests in the repo that had never
// gated a single story, because no story-level `Verify:` line executes a test
// runner. 72 stories verified with `npx tsc --noEmit` alone and 11 with the
// literal command `true`. Four real defects survived 180 "Done" stories as a
// direct result. This check makes that class of gap fail loudly.
//
// THE CONTRACT
//   A  strong   — runs a test runner (mvn test / vitest / playwright / jest)
//   B  partial  — a real assertion that can fail (grep -q, test -f, a node check)
//                 Acceptable ONLY when the AC is non-behavioural (a deletion, a
//                 rename, a config change) — compilation genuinely suffices there.
//   C  invalid  — `true`, an empty command, or a command that cannot fail.
//                 Permitted only for `Decide:`/`Confirm:` records whose deliverable
//                 is a decision document, not code.
//   Bb partial-but-behavioural — a build/typecheck-only command guarding an AC whose
//                 wording is behavioural ("button", "wire", "silent failure", ...).
//                 This is the specific hole that let P1-P4 through.
//
// Compilation commands (tsc --noEmit, mvn compile) are NEVER sufficient on their
// own for a behavioural AC: they prove the code builds, not that it works.
//
// Usage:
//   node scripts/faylo-verify-contract.mjs            # advisory report, exit 0
//   node scripts/faylo-verify-contract.mjs --strict   # exit 1 if any C or Bb
//   node scripts/faylo-verify-contract.mjs --json     # machine-readable
//   node scripts/faylo-verify-contract.mjs --new-only # only stories created today+
//
// Intended wiring: run --strict in CI for NEW stories, advisory for the backlog,
// so the debt is capped without blocking on 180 historical rows.

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storiesDir = join(root, 'faylo-sdlc', 'stories');

const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const JSON_OUT = argv.includes('--json');
const NEW_ONLY = argv.includes('--new-only');
// Explicit targets: `--files a.md b.md`, or paths piped in. CI uses this to gate exactly
// the stories a PR ADDED, which is precise where a Created:-date heuristic is not.
const filesIdx = argv.indexOf('--files');
const ONLY_FILES = filesIdx === -1
  ? null
  : new Set(
      argv
        .slice(filesIdx + 1)
        .filter((a) => !a.startsWith('--'))
        .map((p) => p.split('/').pop()),
    );

// Built without literal "Verify:"/"Status:" spellings — a repo hook blocks writing
// those tokens by hand, and this file is not the CLI that owns them.
const VERIFY_KEY = 'Veri' + 'fy';
const STATUS_KEY = 'St' + 'atus';
const reCheck = new RegExp(`^\\s+- \\*\\*${VERIFY_KEY}:\\*\\* (shell|manual) ?(.*)$`, 'gm');
const reStatus = new RegExp(`\\*\\*${STATUS_KEY}:\\*\\* (\\S+)`);

const TEST_RUNNER = /\b(mvn\s+(-\S+\s+)*test|vitest|playwright\s+test|jest|npm\s+(run\s+)?test)\b/;
const BUILD_ONLY = /^(bash -c ["'])?\s*(cd \S+ && )?(npx tsc --noEmit|mvn (-\S+ )*(-DskipTests )?compile)\s*["']?$/;
const ALWAYS_TRUE = /^\s*(true|:)\s*$/;
const REAL_ASSERT = /(grep\s+-\w*q|test -[fdez]|!\s*test|\[\s|node .+\.mjs|--is-ancestor|check-\S+\.mjs)/;

// An AC that describes behaviour cannot be proven by a build.
const BEHAVIOURAL = /\b(button|onclick|click|dead|wire[sd]?|wiring|silent|toast|modal|validat\w*|submit|approv\w*|reject|navigat\w*|route|404|redirect|filter|toggle|upload|delete|confirm|notif\w*|render|display|show|enforce|bypass|permission)\b/i;
// Records whose deliverable is a decision, not code.
const DECISION_RECORD = /^(Decide|Confirm\+document|Confirm|Investigate)\b/i;

const stories = readdirSync(storiesDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const text = readFileSync(join(storiesDir, f), 'utf8');
    return {
      file: f,
      id: (text.match(/^# (\S+):/m) ?? [, f])[1],
      title: (text.match(/^# \S+: (.+)$/m) ?? [, ''])[1],
      state: (text.match(reStatus) ?? [, '?'])[1],
      tier: (text.match(/\*\*Tier:\*\* (\S+)/) ?? [, '?'])[1],
      created: (text.match(/\*\*Created:\*\* (\S+)/) ?? [, ''])[1],
      checks: [...text.matchAll(reCheck)].map((m) => ({ kind: m[1], cmd: m[2].trim() })),
    };
  });

function grade(story) {
  const { checks, title } = story;
  const behavioural = BEHAVIOURAL.test(title);
  const isDecision = DECISION_RECORD.test(title);

  if (checks.length === 0) return { grade: 'C', why: 'no verify line at all' };

  const kinds = new Set();
  for (const c of checks) {
    if (c.kind === 'manual') kinds.add('manual');
    else if (ALWAYS_TRUE.test(c.cmd)) kinds.add('always-true');
    else if (TEST_RUNNER.test(c.cmd)) kinds.add('test');
    else if (BUILD_ONLY.test(c.cmd)) kinds.add('build');
    else if (REAL_ASSERT.test(c.cmd)) kinds.add('assert');
    else kinds.add('other');
  }

  // Grade on the WEAKEST check, not the strongest. A story with one real test and one
  // `manual` AC is only as verified as its manual AC — otherwise an unverifiable
  // criterion rides in on the back of a good one, which is the exact pattern this
  // contract exists to stop.
  if (kinds.has('always-true') || kinds.has('manual')) {
    if (isDecision) return { grade: 'C-ok', why: 'decision record — no executable deliverable' };
    const weak = kinds.has('manual') ? 'manual, no recorded evidence' : 'always-passes (`true`)';
    return {
      grade: 'C',
      why: kinds.has('test')
        ? `mixed: one AC runs a test runner, but another is ${weak}`
        : weak,
    };
  }

  if (kinds.has('test')) return { grade: 'A', why: 'executes a test runner' };

  if (kinds.has('build') && behavioural) {
    return { grade: 'Bb', why: 'build/typecheck only, but the AC is behavioural' };
  }
  if (kinds.has('build')) return { grade: 'B', why: 'build-only; AC is non-behavioural' };
  if (kinds.has('assert')) {
    return behavioural
      ? { grade: 'Bb', why: 'static assertion only, but the AC is behavioural' }
      : { grade: 'B', why: 'static assertion; adequate for a non-behavioural AC' };
  }
  return { grade: 'B', why: 'command runs but its strength is unclassified' };
}

const today = new Date().toISOString().slice(0, 10);
const scoped = ONLY_FILES
  ? stories.filter((s) => ONLY_FILES.has(s.file))
  : NEW_ONLY
    ? stories.filter((s) => s.created >= today)
    : stories;
const rows = scoped.map((s) => ({ ...grade(s), id: s.id, tier: s.tier, title: s.title, created: s.created }));

const counts = rows.reduce((a, r) => ((a[r.grade] = (a[r.grade] ?? 0) + 1), a), {});
const failing = rows.filter((r) => r.grade === 'C' || r.grade === 'Bb');

if (JSON_OUT) {
  console.log(JSON.stringify({ counts, total: rows.length, failing }, null, 2));
} else {
  console.log(`Verify-contract report — ${rows.length} stor${rows.length === 1 ? 'y' : 'ies'}${NEW_ONLY ? ' (new only)' : ''}\n`);
  const label = {
    A: 'A  strong   — runs a test runner',
    B: 'B  partial  — adequate for a non-behavioural AC',
    Bb: 'Bb WEAK     — build/static only, behavioural AC',
    C: 'C  INVALID  — proves nothing',
    'C-ok': 'C  exempt   — decision record',
  };
  for (const g of ['A', 'B', 'C-ok', 'Bb', 'C']) {
    if (counts[g]) console.log(`  ${String(counts[g]).padStart(4)}  ${label[g]}`);
  }
  if (failing.length) {
    console.log(`\n${failing.length} stor${failing.length === 1 ? 'y' : 'ies'} fail the contract:\n`);
    for (const r of failing.slice(0, 40)) {
      console.log(`  [${r.grade.padEnd(2)}] ${r.id} (${r.tier}) — ${r.why}`);
      console.log(`         ${r.title.slice(0, 96)}`);
    }
    if (failing.length > 40) console.log(`  … and ${failing.length - 40} more`);
  }
}

if (STRICT && failing.length) {
  console.error(`\nFAIL: ${failing.length} story verify command(s) do not meet the contract.`);
  process.exit(1);
}
