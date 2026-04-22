/**
 * NU-AURA Design Token Codemod
 * ============================================================================
 * Mass-migrates legacy Tailwind color classes to the new bridge tokens that
 * read from CSS variables in `frontend/app/globals.css`.
 *
 * Scope:
 *   - Rewrites className="..." JSX string literals
 *   - Rewrites className={`... ${x} ...`} template literals
 *   - Rewrites cn("...", "...") / clsx("...", "...") string args
 *   - Drops dark:<legacy-class> segments (tokens auto-switch via .dark)
 *
 * Hard boundaries (DO NOT MODIFY):
 *   - frontend/tailwind.config.js
 *   - frontend/app/globals.css
 *   - frontend/lib/design-system.ts
 *
 * Usage:
 *   cd frontend
 *   npx jscodeshift -t scripts/codemod-design-tokens.ts 'app/**\/*.tsx' 'components/**\/*.tsx'
 *   npx jscodeshift --dry -t scripts/codemod-design-tokens.ts 'app/**\/*.tsx'
 *   npx jscodeshift --file=app/me/dashboard/page.tsx -t scripts/codemod-design-tokens.ts
 *
 * Report:
 *   After a run, a `migration-report.md` (at repo root of where jscodeshift was
 *   invoked) and an `unconvertible-classes.json` are emitted summarizing:
 *     - Per-file before/after class counts
 *     - Flat JSON of classes we intentionally left alone (ambiguous context)
 * ============================================================================
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// Type shims for jscodeshift
// ---------------------------------------------------------------------------
// We intentionally avoid a hard `import type` dependency on jscodeshift so this
// file type-checks cleanly BEFORE the caller installs the dev dep. At runtime
// jscodeshift passes us real instances; internally we treat them as `any`.
// If `@types/jscodeshift` is installed later, these shims do no harm — the
// codemod is entry-point-shaped the same way.
type FileInfo = { path: string; source: string };
type API = { jscodeshift: any };
type Options = Record<string, any>;
type JSCodeshift = any;
type Collection = any;

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Mapping tables
// ---------------------------------------------------------------------------

/**
 * Simple 1:1 exact-match mappings. Checked before regex buckets.
 */
const EXACT_MAP: Record<string, string> = {
  'bg-white': 'bg-card',
  'text-white': 'text-inverse',
  'border-white': 'border-[var(--bg-card)]',
  'shadow-sm': 'shadow-[var(--shadow-card)]',
  'shadow-md': 'shadow-[var(--shadow-card-hover)]',
  'shadow-lg': 'shadow-[var(--shadow-elevated)]',
};

/**
 * For legacy scales (surface-*, gray-*, slate-*, semantic-*, accent-*, and
 * alias palettes blue/red/green/yellow/amber), we map by (prefix, scale bucket).
 *
 * Each entry returns either a fixed token, the literal "__DROP__" (remove this
 * class entirely — used for dark: variants), or undefined (unconvertible).
 */
type PrefixHandler = (
  scale: number,
  rawClass: string,
) => string | '__DROP__' | undefined;

/** Maps a numeric Tailwind scale step to an arbitrary keyword bucket. */
function bucket(
  scale: number,
  ranges: { min: number; max: number; value: string }[],
): string | undefined {
  for (const r of ranges) {
    if (scale >= r.min && scale <= r.max) return r.value;
  }
  return undefined;
}

/**
 * Surface scale mapping.
 * - 0..50     → bg-base / text-muted / border-subtle
 * - 100       → bg-surface
 * - 200       → bg-elevated (bg) / bg-surface (generic)
 * - 300..500  → bg-card (visually matched — flag for audit if context odd)
 * - 600..700  → text-secondary (text) / border-default (border)
 * - 700..950  → bg-inverse / text-primary / border-strong
 */
const surfaceBgBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 50, value: 'bg-base' },
    { min: 100, max: 100, value: 'bg-surface' },
    { min: 200, max: 200, value: 'bg-elevated' },
    { min: 300, max: 500, value: 'bg-card' },
    { min: 600, max: 950, value: 'bg-inverse' },
  ]);

const surfaceTextBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 300, value: 'text-muted' },
    { min: 400, max: 500, value: 'text-muted' },
    { min: 600, max: 700, value: 'text-secondary' },
    { min: 800, max: 950, value: 'text-primary' },
  ]);

const surfaceBorderBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 300, value: 'border-subtle' },
    { min: 400, max: 600, value: 'border-default' },
    { min: 700, max: 950, value: 'border-strong' },
  ]);

// gray/slate maps (similar, slightly different grouping per spec)
const grayBgBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 100, value: 'bg-base' },
    { min: 200, max: 300, value: 'bg-surface' },
    { min: 400, max: 700, value: 'bg-card' },
    { min: 800, max: 950, value: 'bg-inverse' },
  ]);

const grayTextBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 300, value: 'text-muted' },
    { min: 400, max: 500, value: 'text-muted' },
    { min: 600, max: 700, value: 'text-secondary' },
    { min: 800, max: 950, value: 'text-primary' },
  ]);

const grayBorderBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 300, value: 'border-subtle' },
    { min: 400, max: 600, value: 'border-default' },
    { min: 700, max: 950, value: 'border-strong' },
  ]);

// accent maps
const accentBgBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 100, value: 'bg-accent-subtle' },
    { min: 200, max: 400, value: 'bg-accent-subtle' },
    { min: 500, max: 700, value: 'bg-accent' },
    { min: 800, max: 950, value: 'bg-accent-hover' },
  ]);

const accentTextBucket = (scale: number): string | undefined =>
  bucket(scale, [
    { min: 0, max: 500, value: 'text-accent' },
    { min: 600, max: 950, value: 'text-accent' },
  ]);

const accentBorderBucket = (_scale: number): string | undefined =>
  'border-[var(--accent-primary)]';

// Semantic status scales (success / danger / warning / info) are uniform:
//   bg-<status>-50..100 → bg-status-<status>-bg
//   text-<status>-600..700 → text-status-<status>-text
//   border-<status>-*   → border-status-<status>-border
function statusBgBucket(status: string): PrefixHandler {
  return (scale: number) => {
    if (scale >= 0 && scale <= 400) return `bg-status-${status}-bg`;
    if (scale >= 500 && scale <= 700) return `bg-status-${status}-bg`;
    if (scale >= 800 && scale <= 950) return `bg-status-${status}-bg`;
    return `bg-status-${status}-bg`;
  };
}

function statusTextBucket(status: string): PrefixHandler {
  return (scale: number) => {
    // Everything funnels to the single status text token
    if (scale >= 0 && scale <= 500) return `text-status-${status}-text`;
    if (scale >= 600 && scale <= 950) return `text-status-${status}-text`;
    return `text-status-${status}-text`;
  };
}

function statusBorderBucket(status: string): PrefixHandler {
  return (_scale: number) => `border-status-${status}-border`;
}

// Palette aliases: blue→info, red→danger, green→success, yellow→warning, amber→warning.
// The tailwind.config already aliases these palettes at the color level, so the
// codemod applies the corresponding semantic bucket.
const PALETTE_ALIASES: Record<string, 'info' | 'danger' | 'success' | 'warning'> = {
  blue: 'info',
  red: 'danger',
  green: 'success',
  yellow: 'warning',
  amber: 'warning',
};

// Convertible color prefixes recognized by the parser.
const KNOWN_COLOR_ROOTS = new Set<string>([
  'surface',
  'gray',
  'slate',
  'accent',
  'success',
  'danger',
  'warning',
  'info',
  'blue',
  'red',
  'green',
  'yellow',
  'amber',
]);

// Utility prefixes we will touch (bg / text / border) + shadow suffixes handled in EXACT_MAP.
const UTILITY_PREFIXES = new Set<string>(['bg', 'text', 'border']);

// Regex for a single Tailwind color class, optionally with a state prefix like
// "hover:", "focus:", "md:", "dark:". We parse the state prefix chain separately.
const STATE_PREFIX_CHARS = /^[a-zA-Z0-9:\-\[\]\/]+$/;
const COLOR_CLASS_PATTERN =
  /^(bg|text|border|ring|fill|stroke|from|to|via)-([a-zA-Z]+)-(\d+)(\/\d+)?$/;

// ---------------------------------------------------------------------------
// Telemetry: track what we couldn't convert (per-run aggregate)
// ---------------------------------------------------------------------------

interface Unconvertible {
  file: string;
  className: string;
  reason: string;
}

interface FileSummary {
  file: string;
  beforeLegacyCount: number;
  afterLegacyCount: number;
  droppedDarkClasses: number;
  rewritten: number;
}

const TELEMETRY: {
  unconvertibles: Unconvertible[];
  files: FileSummary[];
} = { unconvertibles: [], files: [] };

// ---------------------------------------------------------------------------
// Core: convert one class token (no whitespace) to the new token
// ---------------------------------------------------------------------------

/**
 * Convert a single class token to its bridge-token equivalent.
 *
 * @returns
 *   - A new class string (possibly the same token untouched)
 *   - "__DROP__" to remove the class entirely (dark: variants with legacy)
 *   - undefined when the class is flagged unconvertible
 */
export function convertSingleClass(
  token: string,
  file: string,
): { result: string | '__DROP__'; converted: boolean } {
  if (!token) return { result: token, converted: false };

  // Split state prefixes (hover:, focus:, md:, dark:, etc.)
  const parts = token.split(':');
  const basePart = parts[parts.length - 1];
  const stateChain = parts.slice(0, -1);
  const hasDark = stateChain.includes('dark');

  // 0) Blanket dark:-variant drop for bg-/text-/border-/ring-/shadow- utilities.
  //    CSS vars auto-switch via the .dark root, so explicit dark: overrides of
  //    color-ish utilities are strictly noise to be removed — even when the
  //    base is something we don't otherwise convert (e.g. `bg-accent-950/20`).
  if (hasDark) {
    const isColorUtility =
      /^(bg|text|border|ring|divide|placeholder|from|to|via|fill|stroke|outline|shadow)-/.test(
        basePart,
      );
    if (isColorUtility) {
      return { result: '__DROP__', converted: true };
    }
  }

  // 1) Exact-match table first (order-independent — state prefixes allowed).
  const exact = EXACT_MAP[basePart];
  if (exact) {
    const replaced = [...stateChain, exact].join(':');
    return { result: replaced, converted: true };
  }

  // 2) Shadow suffixes not in EXACT are left alone.
  if (basePart.startsWith('shadow-')) {
    return { result: token, converted: false };
  }

  // 3) Color class parse: e.g. "bg-surface-200", "text-gray-600"
  const match = COLOR_CLASS_PATTERN.exec(basePart);
  if (!match) return { result: token, converted: false };

  const [, util, rootRaw, scaleStr, opacityRaw] = match;
  const root = rootRaw as string;
  const scale = parseInt(scaleStr as string, 10);
  const opacity = (opacityRaw ?? '') as string; // e.g. "/10" or ""

  if (!KNOWN_COLOR_ROOTS.has(root)) return { result: token, converted: false };
  if (!UTILITY_PREFIXES.has(util)) return { result: token, converted: false };

  // Opacity-modified color classes (e.g. `bg-accent-500/10`) cannot be mapped to
  // bridge tokens (which are CSS vars without reliable /opacity support via Tailwind).
  // Rewrite as an arbitrary-value CSS var reference that preserves the opacity.
  if (opacity) {
    const arbitrary = `${util}-[var(--${root}-${scale})]${opacity}`;
    const replaced = [...stateChain, arbitrary].join(':');
    return { result: replaced, converted: true };
  }

  // Resolve the new class based on util × root × scale.
  let mapped: string | undefined;

  if (root === 'surface') {
    if (util === 'bg') mapped = surfaceBgBucket(scale);
    else if (util === 'text') mapped = surfaceTextBucket(scale);
    else if (util === 'border') mapped = surfaceBorderBucket(scale);
  } else if (root === 'gray' || root === 'slate') {
    if (util === 'bg') mapped = grayBgBucket(scale);
    else if (util === 'text') mapped = grayTextBucket(scale);
    else if (util === 'border') mapped = grayBorderBucket(scale);
  } else if (root === 'accent') {
    if (util === 'bg') mapped = accentBgBucket(scale);
    else if (util === 'text') mapped = accentTextBucket(scale);
    else if (util === 'border') mapped = accentBorderBucket(scale);
  } else {
    // success / danger / warning / info OR palette alias
    const status = (PALETTE_ALIASES[root] ?? root) as string;
    const validStatus = ['success', 'danger', 'warning', 'info'].includes(status);
    if (validStatus) {
      if (util === 'bg') mapped = statusBgBucket(status)(scale, token);
      else if (util === 'text') mapped = statusTextBucket(status)(scale, token);
      else if (util === 'border') mapped = statusBorderBucket(status)(scale, token);
    }
  }

  if (!mapped) {
    TELEMETRY.unconvertibles.push({
      file,
      className: token,
      reason: `No mapping for util=${util}, root=${root}, scale=${scale}`,
    });
    return { result: token, converted: false };
  }

  // Note: dark:<color-util> was already dropped at the top of this function.
  const replaced = [...stateChain, mapped].join(':');
  return { result: replaced, converted: true };
}

// ---------------------------------------------------------------------------
// Transform an entire className string literal (preserves whitespace/ordering)
// ---------------------------------------------------------------------------

/**
 * Tokenize "className content" preserving the whitespace boundaries so we can
 * reassemble the original spacing after rewrite.
 */
function transformClassString(
  input: string,
  file: string,
  state: { beforeLegacy: number; afterLegacy: number; dropped: number; rewritten: number },
): string {
  if (!input) return input;

  // Split on whitespace but keep the whitespace strings as separators.
  // Example: "  bg-white   flex " → ["", "  ", "bg-white", "   ", "flex", " ", ""]
  const chunks = input.split(/(\s+)/);
  const out: string[] = [];

  for (const chunk of chunks) {
    // Whitespace — preserve verbatim
    if (/^\s+$/.test(chunk) || chunk === '') {
      out.push(chunk);
      continue;
    }

    // Not a valid token form — preserve verbatim
    if (!STATE_PREFIX_CHARS.test(chunk)) {
      out.push(chunk);
      continue;
    }

    if (isLegacyClass(chunk)) state.beforeLegacy++;

    const { result, converted } = convertSingleClass(chunk, file);
    if (result === '__DROP__') {
      state.dropped++;
      // Also remove any preceding whitespace chunk so we don't leave double spaces
      if (out.length > 0 && /^\s+$/.test(out[out.length - 1] ?? '')) {
        out.pop();
      }
      continue;
    }

    if (converted && result !== chunk) {
      state.rewritten++;
    }
    if (isLegacyClass(result)) state.afterLegacy++;
    out.push(result);
  }

  return out.join('');
}

/** Detect whether a token is a "legacy" class (one we'd count in the audit). */
function isLegacyClass(token: string): boolean {
  if (!token) return false;
  const parts = token.split(':');
  const base = parts[parts.length - 1];
  if (EXACT_MAP[base]) return true;
  const m = COLOR_CLASS_PATTERN.exec(base);
  if (!m) return false;
  const root = m[2];
  return KNOWN_COLOR_ROOTS.has(root);
}

// ---------------------------------------------------------------------------
// AST walker: apply transformClassString to every className-ish location
// ---------------------------------------------------------------------------

function isHelperName(name: string): boolean {
  return name === 'cn' || name === 'clsx' || name === 'twMerge' || name === 'cva';
}

function processFile(
  j: JSCodeshift,
  root: Collection,
  file: string,
): FileSummary {
  const state = { beforeLegacy: 0, afterLegacy: 0, dropped: 0, rewritten: 0 };

  // 1) className="..." on JSX attributes (string literal value)
  root
    .find(j.JSXAttribute, { name: { name: 'className' } })
    .forEach((p: any) => {
      const value = p.node.value;
      if (!value) return;

      // Recast/babel string literal nodes come in two flavors:
      //   - Legacy ESTree: { type: 'Literal', value: '...' }
      //   - Babel: { type: 'StringLiteral', value: '...' }
      if (
        (value.type === 'Literal' || value.type === 'StringLiteral') &&
        typeof value.value === 'string'
      ) {
        const next = transformClassString(value.value, file, state);
        if (next !== value.value) {
          value.value = next;
          if ('raw' in value) value.raw = JSON.stringify(next);
        }
      } else if (value.type === 'JSXExpressionContainer') {
        // className={...} — handle template literals & helper calls inside.
        processExpression(j, value.expression, file, state);
      }
    });

  // 2) cn(...) / clsx(...) top-level anywhere in the file (not just in JSX).
  root
    .find(j.CallExpression)
    .filter((p: any) => {
      const callee = p.node.callee;
      if (callee.type !== 'Identifier') return false;
      return isHelperName(callee.name);
    })
    .forEach((p: any) => {
      for (const arg of p.node.arguments) {
        processExpression(j, arg, file, state);
      }
    });

  // 3) Any other string literal that *looks like* a Tailwind class list —
  //    strings stored in data maps, theme objects, etc. transformClassString
  //    is a no-op for strings whose tokens aren't recognized Tailwind utilities,
  //    so this pass is safe for non-class strings.
  const looksLikeClassList = (s: string): boolean => {
    if (!s || s.length > 500) return false;
    // Must contain at least one dash-separated token whose first segment is a
    // Tailwind utility root (bg/text/border/shadow/ring/fill/stroke/from/to/via).
    // Also accept legacy palette scales on their own.
    return /(?:^|\s)(?:(?:dark|hover|focus|active|disabled|group-hover|peer|sm|md|lg|xl|2xl):)*(?:bg|text|border|ring|fill|stroke|from|to|via|shadow)-[A-Za-z0-9[_/\-]/.test(s);
  };

  root
    .find(j.Literal)
    .forEach((p: any) => {
      const node = p.node;
      if (typeof node.value !== 'string') return;
      // Already handled by pass #1 and #2 — skip if parent is className JSX attr
      // (value already mutated) or inside a helper call (already walked).
      const parent = p.parent?.node;
      if (!parent) return;
      // Skip JSXAttribute with name "className" (already done)
      if (parent.type === 'JSXAttribute' && parent.name?.name === 'className') return;
      if (!looksLikeClassList(node.value)) return;
      const next = transformClassString(node.value, file, state);
      if (next !== node.value) {
        node.value = next;
        if ('raw' in node) node.raw = JSON.stringify(next);
      }
    });

  root
    .find(j.StringLiteral)
    .forEach((p: any) => {
      const node = p.node;
      if (typeof node.value !== 'string') return;
      const parent = p.parent?.node;
      if (!parent) return;
      if (parent.type === 'JSXAttribute' && parent.name?.name === 'className') return;
      if (!looksLikeClassList(node.value)) return;
      const next = transformClassString(node.value, file, state);
      if (next !== node.value) {
        node.value = next;
      }
    });

  const summary: FileSummary = {
    file,
    beforeLegacyCount: state.beforeLegacy,
    afterLegacyCount: state.afterLegacy,
    droppedDarkClasses: state.dropped,
    rewritten: state.rewritten,
  };
  return summary;
}

/** Recursively rewrite any className-carrying expression. */
function processExpression(
  j: JSCodeshift,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  file: string,
  state: { beforeLegacy: number; afterLegacy: number; dropped: number; rewritten: number },
): void {
  if (!node) return;

  if (node.type === 'Literal' && typeof node.value === 'string') {
    const next = transformClassString(node.value, file, state);
    if (next !== node.value) {
      node.value = next;
      if ('raw' in node) node.raw = JSON.stringify(next);
    }
    return;
  }

  if (node.type === 'StringLiteral') {
    const next = transformClassString(node.value, file, state);
    if (next !== node.value) node.value = next;
    return;
  }

  if (node.type === 'TemplateLiteral') {
    // Template literal: rewrite the static "quasi" chunks only.
    for (const q of node.quasis) {
      const raw = q.value.cooked ?? q.value.raw ?? '';
      const next = transformClassString(raw, file, state);
      if (next !== raw) {
        q.value.cooked = next;
        q.value.raw = next;
      }
    }
    return;
  }

  if (node.type === 'ConditionalExpression') {
    processExpression(j, node.consequent, file, state);
    processExpression(j, node.alternate, file, state);
    return;
  }

  if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
    processExpression(j, node.left, file, state);
    processExpression(j, node.right, file, state);
    return;
  }

  if (node.type === 'ArrayExpression') {
    for (const el of node.elements) processExpression(j, el, file, state);
    return;
  }

  if (node.type === 'ObjectExpression') {
    // Tailwind-merge friendly: object keys like { "bg-white": isActive }
    for (const prop of node.properties) {
      if (!prop) continue;
      if (
        prop.type === 'Property' ||
        prop.type === 'ObjectProperty'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const key = (prop as any).key;
        if (key && (key.type === 'Literal' || key.type === 'StringLiteral')) {
          const kval = typeof key.value === 'string' ? key.value : '';
          const next = transformClassString(kval, file, state);
          if (next !== kval) {
            key.value = next;
            if ('raw' in key) key.raw = JSON.stringify(next);
          }
        }
      }
    }
    return;
  }

  if (node.type === 'CallExpression') {
    // Nested cn()/clsx()
    if (node.callee && node.callee.type === 'Identifier' && isHelperName(node.callee.name)) {
      for (const arg of node.arguments) processExpression(j, arg, file, state);
    }
  }
}

// ---------------------------------------------------------------------------
// jscodeshift entry point
// ---------------------------------------------------------------------------

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: Options,
): string | undefined {
  const filePath = fileInfo.path;

  // Safety: never touch the source-of-truth files.
  const BLOCKLIST = [
    'tailwind.config.js',
    'app/globals.css',
    'lib/design-system.ts',
  ];
  if (BLOCKLIST.some((b) => filePath.endsWith(b))) return undefined;

  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const summary = processFile(j, root, filePath);
  TELEMETRY.files.push(summary);

  const didChange = summary.rewritten > 0 || summary.droppedDarkClasses > 0;

  // Emit side-effect reports on the final file. jscodeshift doesn't tell us
  // when the run finishes, so we append & dedupe summaries on each call.
  if (!options.dry && !options.__skipReport) {
    writeReports(options.reportDir ?? process.cwd());
  }

  // Use double-quote output: Tailwind arbitrary values like `content-['']`
  // contain bare single quotes, and recast's single-quote output escapes them
  // inside JSX attributes, producing invalid JSX. Double-quote output is safe
  // for every Tailwind/cn string we emit.
  return didChange ? root.toSource({ quote: 'double' }) : undefined;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function writeReports(dir: string): void {
  try {
    const md = path.join(dir, 'migration-report.md');
    const jsonPath = path.join(dir, 'unconvertible-classes.json');

    // Build a dedup'd summary keyed by file (latest wins — the AST passes over
    // a file at most once per jscodeshift run).
    const byFile: Record<string, FileSummary> = {};
    for (const s of TELEMETRY.files) byFile[s.file] = s;

    const rows = Object.values(byFile)
      .filter((r) => r.rewritten > 0 || r.droppedDarkClasses > 0)
      .sort((a, b) => b.rewritten - a.rewritten);

    const header = [
      '# NU-AURA Design Token Migration Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Files touched: ${rows.length}`,
      `Total rewrites: ${rows.reduce((n, r) => n + r.rewritten, 0)}`,
      `Total dark:* dropped: ${rows.reduce((n, r) => n + r.droppedDarkClasses, 0)}`,
      `Unconvertible classes flagged: ${TELEMETRY.unconvertibles.length}`,
      '',
      '## Per-file breakdown',
      '',
      '| File | Before legacy | After legacy | Rewrites | Dropped dark:* |',
      '|------|---------------|--------------|----------|----------------|',
    ].join('\n');

    const body = rows
      .map(
        (r) =>
          `| ${r.file} | ${r.beforeLegacyCount} | ${r.afterLegacyCount} | ${r.rewritten} | ${r.droppedDarkClasses} |`,
      )
      .join('\n');

    fs.writeFileSync(md, `${header}\n${body}\n`, 'utf8');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(TELEMETRY.unconvertibles, null, 2),
      'utf8',
    );
  } catch {
    // Reporting is best-effort. Silence to avoid breaking jscodeshift's own output.
  }
}

// Note: the codemod reads custom CLI flags straight off the `options` bag:
//   --dry            (built-in jscodeshift flag)
//   --reportDir=...  (our custom path override for migration-report.md)
// No ambient module augmentation needed — `Options` is typed as
// Record<string, any> via the shim above.
