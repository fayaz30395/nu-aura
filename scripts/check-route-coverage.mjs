#!/usr/bin/env node
/**
 * Route-coverage check (zero dependencies — Node built-ins only).
 *
 * Fails (exit 1) when an internal navigation target (href / router.push / router.replace)
 * points at a path that has no corresponding Next.js App Router page.tsx. This guards against
 * dead nav links like /recruitment/scorecards or /fluence/chat shipping over a built backend.
 *
 * Matching is deliberately conservative: only string/template literals beginning with "/" are
 * checked, query/hash are stripped, ${...} template holes and dynamic [seg] routes are treated
 * as wildcards. Anything ambiguous (variable hrefs, external URLs, /api, mailto) is skipped to
 * avoid false positives.
 *
 * Usage: node scripts/check-route-coverage.mjs   (run from repo root or via npm "check:routes")
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = join(ROOT, 'frontend', 'app');
const SCAN_DIRS = [join(ROOT, 'frontend', 'app'), join(ROOT, 'frontend', 'components')];
const DYN = '1'; // concrete token substituted for a dynamic segment when matching

/** Recursively collect files matching a predicate. */
function walk(dir, pred, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === 'tmp') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, pred, out);
    else if (pred(full)) out.push(full);
  }
  return out;
}

/** Build the set of valid route regexes from every page.tsx under frontend/app. */
function buildRouteMatchers() {
  const pages = walk(APP_DIR, (f) => /[/\\]page\.(tsx|ts|jsx|js)$/.test(f));
  const matchers = [];
  for (const page of pages) {
    const relDir = relative(APP_DIR, dirname(page));
    const segments = relDir === '' ? [] : relDir.split(/[/\\]/);
    const parts = [];
    for (const seg of segments) {
      if (/^\(.+\)$/.test(seg)) continue;            // route group — no URL contribution
      if (seg.startsWith('@')) continue;             // parallel route slot
      if (/^\[\.\.\..+\]$/.test(seg)) parts.push('.+');        // catch-all [...x]
      else if (/^\[.+\]$/.test(seg)) parts.push('[^/]+');      // dynamic [x]
      else parts.push(seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    const pattern = '^/' + parts.join('/') + '/?$';
    matchers.push(new RegExp(pattern));
  }
  return matchers;
}

/** Extract internal href / router.push|replace string-literal targets from a file. */
function extractTargets(file) {
  const src = readFileSync(file, 'utf8');
  // Matches JSX `href=`, object-literal `href:` (nav-config arrays), and router.push/replace.
  const re = /(?:href\s*[=:]\s*\{?\s*|router\.(?:push|replace)\s*\(\s*)["'`](\/[^"'`?#]*)/g;
  const found = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    let path = m[1];
    if (path.startsWith('/api') || path.startsWith('//')) continue; // API / protocol-relative
    path = path.replace(/\$\{[^}]*\}/g, DYN);   // template holes -> dynamic token
    path = path.replace(/\/+$/, '') || '/';      // strip trailing slash
    if (/[${}]/.test(path)) continue;            // leftover interpolation we can't resolve
    found.push({ path, file: relative(ROOT, file) });
  }
  return found;
}

// Known pre-existing dead links (ratchet baseline). Remove a line once its page ships;
// the gate then guarantees that link can never regress. New dead links fail the build.
const ALLOWLIST_FILE = join(ROOT, 'scripts', 'route-coverage-allowlist.txt');

const isSourceFile = (p) =>
  /\.(tsx|ts|jsx|js)$/.test(p) && !p.endsWith('.d.ts') &&
  !/\.(test|spec)\.[jt]sx?$/.test(p) && !/[/\\](__tests__|__mocks__)[/\\]/.test(p);

/** Every distinct internal nav target → the first source file it appeared in. */
function collectInternalTargets() {
  const seen = new Map();
  for (const dir of SCAN_DIRS) {
    for (const file of walk(dir, isSourceFile)) {
      for (const target of extractTargets(file)) {
        if (!seen.has(target.path)) seen.set(target.path, target.file);
      }
    }
  }
  return seen;
}

/** Known dead-link paths to tolerate (ratchet baseline). Missing file → empty set. */
function loadAllowlist() {
  try {
    return new Set(
      readFileSync(ALLOWLIST_FILE, 'utf8')
        .split('\n').map((line) => line.replace(/#.*$/, '').trim()).filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

/** Print the coverage report; exit 1 if any NEW (non-allowlisted) dead link exists. */
function reportAndExit(matchers, seen, allow) {
  const violations = [...seen]
    .filter(([path]) => !matchers.some((rx) => rx.test(path)))
    .map(([path, file]) => ({ path, file }));
  const fresh = violations.filter((v) => !allow.has(v.path));
  const staleAllow = [...allow].filter((p) => !violations.some((v) => v.path === p));

  console.log(`Route coverage: ${matchers.length} routes, ${seen.size} distinct internal targets checked.`);
  console.log(`${violations.length} unresolved (${allow.size} allowlisted), ${fresh.length} new.`);
  if (staleAllow.length) {
    console.log(`\nNote: ${staleAllow.length} allowlist entr(y/ies) now resolve — tighten the gate by removing:`);
    for (const p of staleAllow.sort()) console.log(`  ${p}`);
  }
  if (fresh.length === 0) {
    console.log('\nPASS — no new dead nav links.');
    process.exit(0);
  }
  fresh.sort((a, b) => a.path.localeCompare(b.path));
  console.error(`\nFAIL — ${fresh.length} NEW nav target(s) point at a path with no page.tsx:`);
  for (const v of fresh) console.error(`  ${v.path}   (first seen: ${v.file})`);
  console.error(`\nFix the page, or (if intentional) add the path to scripts/route-coverage-allowlist.txt`);
  process.exit(1);
}

reportAndExit(buildRouteMatchers(), collectInternalTargets(), loadAllowlist());
