#!/usr/bin/env node
import {readdir, readFile} from 'node:fs/promises';
import {join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const FRONTEND_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const APP_ROOT = join(FRONTEND_ROOT, 'app');
const E2E_ROOT = join(FRONTEND_ROOT, 'e2e');
const ROUTES_JSON = join(E2E_ROOT, 'generated', 'routes.json');
const ROUTE_SMOKE_SPEC = join(E2E_ROOT, 'generated', 'route-smoke.spec.ts');
const A11Y_SPEC = join(E2E_ROOT, 'accessibility', 'a11y.spec.ts');

const IGNORE_DIRS = new Set(['node_modules', '.next', 'coverage']);
const FORBIDDEN_TEST_MARKERS = [
  /\btest\.skip\s*\(/,
  /\btest\.fixme\s*\(/,
  /\btest\.only\s*\(/,
  /\bdescribe\.skip\s*\(/,
  /\bdescribe\.only\s*\(/,
];

async function walk(dir, predicate) {
  const entries = await readdir(dir, {withFileTypes: true});
  const files = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full, predicate));
      continue;
    }

    if (!predicate || predicate(full)) {
      files.push(full);
    }
  }

  return files;
}

function routeFromPage(pageFile) {
  const rel = relative(APP_ROOT, pageFile);
  const segments = rel.split(sep).slice(0, -1).filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) return false;
    if (segment.startsWith('@')) return false;
    return true;
  });

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function isDynamicRoute(route) {
  return route.includes('[') || route.includes(']');
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function collectForbiddenMarkers() {
  const specs = await walk(E2E_ROOT, (file) => /\.spec\.ts$/.test(file));
  const findings = [];

  for (const spec of specs) {
    const src = await readFile(spec, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, idx) => {
      if (/^\s*\/\//.test(line)) return;
      if (FORBIDDEN_TEST_MARKERS.some((re) => re.test(line))) {
        findings.push(`${relative(FRONTEND_ROOT, spec)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  return findings;
}

async function main() {
  const pageFiles = await walk(APP_ROOT, (file) => file.endsWith(`${sep}page.tsx`));
  const appRoutes = new Set(pageFiles.map(routeFromPage));
  const staticRoutes = new Set([...appRoutes].filter((route) => !isDynamicRoute(route)));
  const dynamicRoutes = [...appRoutes].filter(isDynamicRoute).sort();

  const routeEntries = await readJson(ROUTES_JSON);
  const smokeRoutes = new Set(routeEntries.map((entry) => entry.path));
  const smokeSpec = await readFile(ROUTE_SMOKE_SPEC, 'utf8');
  const a11ySpec = await readFile(A11Y_SPEC, 'utf8');

  const missingStaticRoutes = [...staticRoutes].filter((route) => !smokeRoutes.has(route)).sort();
  const staleSmokeRoutes = [...smokeRoutes].filter((route) => !appRoutes.has(route)).sort();
  const forbiddenMarkers = await collectForbiddenMarkers();
  const failures = [];

  if (!smokeSpec.includes("routes from './routes.json'")) {
    failures.push('generated/route-smoke.spec.ts must iterate generated/routes.json');
  }

  if (!a11ySpec.includes('@axe-core/playwright')) {
    failures.push('accessibility/a11y.spec.ts must run axe-core checks');
  }

  if (missingStaticRoutes.length > 0) {
    failures.push(`Missing static route-smoke coverage (${missingStaticRoutes.length}): ${missingStaticRoutes.join(', ')}`);
  }

  if (staleSmokeRoutes.length > 0) {
    failures.push(`Stale route-smoke entries (${staleSmokeRoutes.length}): ${staleSmokeRoutes.join(', ')}`);
  }

  if (dynamicRoutes.length > 0) {
    failures.push(`Dynamic routes require explicit fixture-backed UI specs (${dynamicRoutes.length}): ${dynamicRoutes.join(', ')}`);
  }

  if (forbiddenMarkers.length > 0) {
    failures.push(`Skipped/focused UI tests are not allowed (${forbiddenMarkers.length}):\n${forbiddenMarkers.join('\n')}`);
  }

  console.log('NU-AURA UI Coverage 100 Guard');
  console.log('=============================');
  console.log(`App page routes: ${appRoutes.size}`);
  console.log(`Static page routes: ${staticRoutes.size}`);
  console.log(`Dynamic page routes: ${dynamicRoutes.length}`);
  console.log(`Generated route-smoke routes: ${smokeRoutes.size}`);
  console.log(`E2E forbidden markers: ${forbiddenMarkers.length}`);

  if (failures.length > 0) {
    console.error('\nFAIL');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('\nPASS');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
