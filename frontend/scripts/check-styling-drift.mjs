#!/usr/bin/env node
/**
 * NU-AURA — Styling Drift Checker (T3-13, extended for FR-4)
 *
 * Reports drift from the Mantine + Tailwind rule documented in
 * `frontend/components/ui/README.md`, plus DESIGN.md's "Do's and Don'ts"
 * (section 6, lines 270-291). NEVER fails CI today — emits a report so
 * trends are visible. Wire to `npm run lint:design-system`.
 *
 * Anti-patterns scanned (component code only, not `components/ui/`):
 *   1. Raw `<input>`, `<select>`, `<textarea>` — should use Mantine
 *      TextInput/Select/Textarea or the `components/ui/` wrappers.
 *   2. Inline `style={{...}}` — bypasses tokens. Use Tailwind utilities
 *      or `var(--token)` via className.
 *   3. Hex colors in className (e.g. `text-[#1c2033]`) — should use
 *      a CSS var token (`text-[var(--text-primary)]`).
 *   4. Hex literals in inline style values — same reason.
 *   5. `border-l-N`/`border-r-N` (N>1) as a colored accent stripe —
 *      DESIGN.md Don't: use a full subtle border + tinted bg instead.
 *   6. `bg-clip-text` gradient text — DESIGN.md Don't: solid Aura Navy only.
 *   7. `blur-*`/`backdrop-blur-*` outside `components/ui/` (advisory only —
 *      the structural `blur(6px)` card treatment is CSS, not a Tailwind
 *      class, so this rule is a coarse heuristic for manual review, not
 *      an auto-fixable finding).
 *   8. Hex colour string literals anywhere in JSX/TSX (`'#fff'`, `"#1c2033"`).
 *   9. Arbitrary Tailwind sizes (`text-[13px]`, `w-[42px]`, `p-[0.6rem]`) —
 *      should use the type/space/control scale.
 *  10. Icon-only buttons with no accessible name: `<ActionIcon>` without
 *      aria-label/aria-labelledby/title, or `<button>`/`<Button>` whose only
 *      children are self-closing components (icons) and no label/sr-only text.
 *
 * Ratchet: `--strict` exits 1 when any rule in STRICT_BASELINE exceeds its
 * count. Lower a baseline number whenever drift is migrated; never raise it.
 *
 * FR-4 scope note: the following DESIGN.md Don'ts are NOT automated here —
 * they need semantic/AST-level analysis or a maintained exemption list,
 * not a line-based regex, and would produce false positives (verified
 * against this codebase, see faylo-sdlc story US-2FWVF05WDJVA):
 *   - `.card` nested inside `.card` (needs JSX tree awareness)
 *   - non-navy accent colors in "chrome" vs. permitted sub-app-identity
 *     surfaces (e.g. `var(--prod-hire)` is legitimately used as a chart
 *     data-series color in app/reports/page.tsx, not chrome styling —
 *     a className-only regex can't tell those apart)
 *   - hardcoded spacing/typography duplicating a design-system.ts export
 *     (needs a token-value diff, not a text pattern)
 * Escalate these to a follow-up ticket if broader FR-4 coverage is wanted.
 *
 * Run:  node frontend/scripts/check-styling-drift.mjs
 *       (exits 0 unless --strict; pass --json for machine output, --quiet
 *        for counts only)
 */
import {readdir, readFile, stat} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const FRONTEND_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

// Folders we never scan. Globbed; relative to FRONTEND_ROOT.
const IGNORE_DIRS = new Set([
  'node_modules', '.next', 'playwright-report', 'test-results',
  '__tests__', 'e2e', 'playwright', 'public', 'coverage',
]);

// Files exempt from each rule (the primitives themselves OWN the raw HTML).
const PRIMITIVES_DIR = 'components/ui';
const EXEMPT_FILES = new Set([
  // Root error fallback cannot depend on app CSS/providers; see app/global-error.tsx.
  'app/global-error.tsx',
]);

// className= or class= contexts that contain a bracket-arbitrary hex
const TW_HEX_CLASS_RE = /\b(?:text|bg|border|ring|from|to|via|fill|stroke|shadow|outline|decoration|caret|accent)-\[#[0-9a-fA-F]{3,8}\]/g;
// JSX inline style: style={{ ... }}
const INLINE_STYLE_RE = /\bstyle=\{\{[^}]*\}\}/g;
// border-l-2..9 / border-r-2..9 used as a colored accent stripe (border-l-1/border-r-1 are fine)
const BORDER_ACCENT_RE = /\bborder-[lr]-[2-9]\b/g;
// Gradient text: bg-clip-text (paired with text-transparent in practice)
const BG_CLIP_TEXT_RE = /\bbg-clip-text\b/g;
// Decorative blur outside components/ui (advisory)
const BLUR_CLASS_RE = /\b(?:backdrop-)?blur-(?:xs|sm|md|lg|xl|2xl|3xl|\[[^\]]+\])\b/g;
// Raw native form elements (JSX opening tag — not React.HTMLProps strings)
const RAW_INPUT_RE = /<input(?=[\s/>])/g;
const RAW_SELECT_RE = /<select(?=[\s/>])/g;
const RAW_TEXTAREA_RE = /<textarea(?=[\s/>])/g;
// Hex colour string literal (3/4/6/8 digits) — not inside a Tailwind [..] arbitrary
const HEX_LITERAL_RE = /(?<=['"`(\s:,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
// Arbitrary Tailwind size utility with a px/rem/em value
const ARBITRARY_SIZE_RE = /(?<![\w-])-?(?:text|w|h|min-w|min-h|max-w|max-h|size|p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|space-[xy]|top|left|right|bottom|inset(?:-[xy])?|rounded(?:-[a-z]{1,2})?|leading|tracking)-\[-?\d*\.?\d+(?:px|rem|em)\]/g;
const ICON_BUTTON_OPEN_RE = /<(button|Button|ActionIcon)\b/g;
const ACCESSIBLE_NAME_RE = /aria-label|aria-labelledby|title=|sr-only/;

// Ratchet for --strict (counts as of the WS1 design-foundations pass).
const STRICT_BASELINE = {
  'raw-input': 4,
  'raw-select': 0,
  'raw-textarea': 0,
  'hex-in-className': 0,
  'hex-literal': 66,
  'arbitrary-size': 585,
  'icon-button-no-label': 42,
};

const args = new Set(process.argv.slice(2));
const FORMAT_JSON = args.has('--json');
const QUIET = args.has('--quiet');
const STRICT = args.has('--strict');

/** @typedef {{file: string, rule: string, line: number, snippet: string}} Finding */
/** @type {Finding[]} */
const findings = [];

async function walk(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  await Promise.all(entries.map(async (entry) => {
    const full = join(dir, entry.name);
    const rel = relative(FRONTEND_ROOT, full);
    if (IGNORE_DIRS.has(entry.name)) return;
    if (entry.isDirectory()) return walk(full);
    if (!/\.(tsx|jsx)$/.test(entry.name)) return;
    if (/\.test\.(tsx|jsx)$/.test(entry.name)) return;
    await scanFile(full, rel);
  }));
}

async function scanFile(absPath, rel) {
  if (EXEMPT_FILES.has(rel)) return;

  const src = await readFile(absPath, 'utf8');
  const lines = src.split('\n');
  const isPrimitive = rel.startsWith(PRIMITIVES_DIR);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();
    // Skip obvious comments / imports / TS types
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

    // Rule 1 — Raw native form elements (skip primitives that wrap them)
    if (!isPrimitive) {
      if (RAW_INPUT_RE.test(line)) findings.push({file: rel, rule: 'raw-input', line: lineNo, snippet: trimmed.slice(0, 120)});
      if (RAW_SELECT_RE.test(line)) findings.push({file: rel, rule: 'raw-select', line: lineNo, snippet: trimmed.slice(0, 120)});
      if (RAW_TEXTAREA_RE.test(line)) findings.push({file: rel, rule: 'raw-textarea', line: lineNo, snippet: trimmed.slice(0, 120)});
      RAW_INPUT_RE.lastIndex = RAW_SELECT_RE.lastIndex = RAW_TEXTAREA_RE.lastIndex = 0;
    }

    // Rule 2 — Inline style={{...}}
    if (INLINE_STYLE_RE.test(line)) {
      findings.push({file: rel, rule: 'inline-style', line: lineNo, snippet: trimmed.slice(0, 120)});
      INLINE_STYLE_RE.lastIndex = 0;
    }

    // Rule 3 — Tailwind arbitrary value with hex (e.g. text-[#ff0000])
    if (TW_HEX_CLASS_RE.test(line)) {
      findings.push({file: rel, rule: 'hex-in-className', line: lineNo, snippet: trimmed.slice(0, 120)});
      TW_HEX_CLASS_RE.lastIndex = 0;
    }

    // Rule 5 — border-l/r > 1px as a colored accent stripe (DESIGN.md Don't)
    if (BORDER_ACCENT_RE.test(line)) {
      findings.push({file: rel, rule: 'border-accent-stripe', line: lineNo, snippet: trimmed.slice(0, 120)});
      BORDER_ACCENT_RE.lastIndex = 0;
    }

    // Rule 6 — gradient text via bg-clip-text (DESIGN.md Don't)
    if (BG_CLIP_TEXT_RE.test(line)) {
      findings.push({file: rel, rule: 'gradient-text', line: lineNo, snippet: trimmed.slice(0, 120)});
      BG_CLIP_TEXT_RE.lastIndex = 0;
    }

    // Rule 7 — decorative blur outside components/ui (advisory, manual review)
    if (!isPrimitive && BLUR_CLASS_RE.test(line)) {
      findings.push({file: rel, rule: 'blur-advisory', line: lineNo, snippet: trimmed.slice(0, 120)});
      BLUR_CLASS_RE.lastIndex = 0;
    }

    // Rule 8 — hex colour literal
    if (HEX_LITERAL_RE.test(line)) {
      findings.push({file: rel, rule: 'hex-literal', line: lineNo, snippet: trimmed.slice(0, 120)});
      HEX_LITERAL_RE.lastIndex = 0;
    }

    // Rule 9 — arbitrary Tailwind size
    if (ARBITRARY_SIZE_RE.test(line)) {
      findings.push({file: rel, rule: 'arbitrary-size', line: lineNo, snippet: trimmed.slice(0, 120)});
      ARBITRARY_SIZE_RE.lastIndex = 0;
    }
  });

  // Rule 10 — icon-only buttons without an accessible name (multi-line JSX)
  for (const {line, tag} of findUnlabelledIconButtons(src)) {
    findings.push({file: rel, rule: 'icon-button-no-label', line, snippet: `<${tag}> ${lines[line - 1].trim().slice(0, 100)}`});
  }
}

/** End index of a JSX opening tag starting at `from`, skipping `{…}` and strings. */
function openingTagEnd(src, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (depth > 0 && (c === '"' || c === "'" || c === '`')) quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i;
  }
  return -1;
}

function findUnlabelledIconButtons(src) {
  const out = [];
  ICON_BUTTON_OPEN_RE.lastIndex = 0;
  let m;
  while ((m = ICON_BUTTON_OPEN_RE.exec(src))) {
    const tag = m[1];
    const end = openingTagEnd(src, m.index + m[0].length);
    if (end < 0) continue;
    const open = src.slice(m.index, end + 1);
    const selfClosing = open.endsWith('/>');
    const close = selfClosing ? -1 : src.indexOf(`</${tag}>`, end);
    const inner = close < 0 ? '' : src.slice(end + 1, close);
    if (ACCESSIBLE_NAME_RE.test(open + inner)) continue;

    let iconOnly;
    if (tag === 'ActionIcon') {
      iconOnly = true;
    } else {
      if (selfClosing || close < 0 || inner.length > 400) continue;
      iconOnly = /^\s*(<[A-Z][\w.]*[^>]*\/>\s*)+$/.test(inner);
    }
    if (iconOnly) out.push({line: src.slice(0, m.index).split('\n').length, tag});
  }
  return out;
}

function strictViolations(byRule) {
  return Object.entries(STRICT_BASELINE)
    .filter(([rule, max]) => (byRule[rule] || 0) > max)
    .map(([rule, max]) => ({rule, count: byRule[rule] || 0, max}));
}

function summarize() {
  const byRule = {};
  const byFile = {};
  for (const f of findings) {
    byRule[f.rule] = (byRule[f.rule] || 0) + 1;
    byFile[f.file] = (byFile[f.file] || 0) + 1;
  }
  return {total: findings.length, byRule, byFile};
}

async function main() {
  const start = Date.now();
  try {
    await stat(FRONTEND_ROOT);
  } catch {
    console.error(`frontend root not found at ${FRONTEND_ROOT}`);
    process.exit(0);
  }
  await walk(FRONTEND_ROOT);
  const summary = summarize();
  const elapsed = Date.now() - start;

  const violations = STRICT ? strictViolations(summary.byRule) : [];

  if (FORMAT_JSON) {
    // Exit only after the pipe drains; process.exit() truncates large piped output.
    process.stdout.write(JSON.stringify({summary, findings, violations}, null, 2), () => {
      process.exit(violations.length ? 1 : 0);
    });
    return;
  }

  console.log('\nNU-AURA Styling Drift Report (T3-13)');
  console.log('=====================================');
  console.log(`Scanned in ${elapsed}ms.   Rule: frontend/components/ui/README.md\n`);
  console.log(`Total findings: ${summary.total}`);
  console.log('By rule:');
  for (const [rule, count] of Object.entries(summary.byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule.padEnd(20)} ${count}`);
  }
  if (!QUIET && summary.total > 0) {
    const top = Object.entries(summary.byFile).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('\nTop 10 offenders:');
    for (const [file, count] of top) console.log(`  ${count.toString().padStart(4)}  ${file}`);
    console.log('\nFirst 5 examples:');
    for (const f of findings.slice(0, 5)) {
      console.log(`  [${f.rule}] ${f.file}:${f.line}`);
      console.log(`        ${f.snippet}`);
    }
  }
  if (!STRICT) {
    console.log('\n(Report only — exits 0. Pass --strict to enforce the ratchet.)\n');
    process.exit(0);
  }
  if (violations.length) {
    console.error('\nStyling drift above ratchet baseline:');
    for (const v of violations) console.error(`  ${v.rule.padEnd(22)} ${v.count} > ${v.max}`);
    console.error('Fix the new drift (see --json for locations); do not raise the baseline.\n');
    process.exit(1);
  }
  console.log('\nStrict: all ratcheted rules at or below baseline.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('drift-checker failed:', err);
  process.exit(STRICT ? 1 : 0);
});
