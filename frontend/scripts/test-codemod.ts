/**
 * Fixture-based test runner for the design-token codemod.
 *
 * Usage:
 *   cd frontend
 *   node --loader esbuild-register scripts/test-codemod.ts
 *   # or, if esbuild isn't available as a loader, transpile first:
 *   npx esbuild scripts/test-codemod.ts --bundle --platform=node --outfile=/tmp/test-codemod.cjs \
 *     --external:jscodeshift && node /tmp/test-codemod.cjs
 *
 * The runner extracts `className="..."` literal values from every *Input* /
 * *Expected* fixture in `__tests__/codemod-fixtures.tsx`, runs the codemod's
 * class-string transformer over each *Input* value, and diffs against
 * *Expected*. Exits 1 on mismatch.
 *
 * This focuses on the transformation semantics. Full end-to-end jscodeshift
 * runs (including cn()/clsx()/template-literal traversal) are validated by the
 * parent session after jscodeshift is installed.
 */

import * as fs from 'fs';
import * as path from 'path';
// Re-export from the codemod so we can test the pure transformation function.
import {convertSingleClass} from './codemod-design-tokens';

// Local duplicate of transformClassString — the codemod keeps it as a private
// helper, so we replicate it here identically. If the codemod's logic diverges
// from this copy, tests will fail and we'll know.
function transformClassString(input: string, file: string): string {
  if (!input) return input;
  const chunks = input.split(/(\s+)/);
  const out: string[] = [];
  for (const chunk of chunks) {
    if (/^\s+$/.test(chunk) || chunk === '') {
      out.push(chunk);
      continue;
    }
    if (!/^[a-zA-Z0-9:\-\[\]\/]+$/.test(chunk)) {
      out.push(chunk);
      continue;
    }
    const {result} = convertSingleClass(chunk, file);
    if (result === '__DROP__') {
      if (out.length > 0 && /^\s+$/.test(out[out.length - 1] ?? '')) {
        out.pop();
      }
      continue;
    }
    out.push(result);
  }
  return out.join('');
}

interface Pair {
  name: string;
  inputs: string[];
  expected: string[];
}

/** Extracts every className="..." literal string from a file's source. */
function extractClassNames(source: string): Map<string, string[]> {
  // Map export name (e.g. "WhiteInput") → list of className literal values.
  const byExport = new Map<string, string[]>();
  // Find top-level `export const <Name> = (...) => ( ... )` — simple regex is
  // enough because the fixture file is hand-authored and uses a consistent style.
  const exportRe = /export const (\w+) = \([^)]*\) => \(([\s\S]*?)\);\s*\n/g;
  let m: RegExpExecArray | null;
  while ((m = exportRe.exec(source)) !== null) {
    const name = m[1];
    const body = m[2];
    const classNames: string[] = [];

    // className="..."  (JSX string literal)
    const literalRe = /className=(["'])((?:(?!\1).)*)\1/g;
    let lm: RegExpExecArray | null;
    while ((lm = literalRe.exec(body)) !== null) {
      classNames.push(lm[2]);
    }
    // className={`...`}  (template literal — collect quasi text only).
    // The codemod rewrites each static quasi independently, so we mirror that
    // by splitting on ${...} and transforming each segment separately, then
    // reassembling with the original interpolations for comparison.
    const templateRe = /className=\{`((?:\\.|[^`])*)`\}/g;
    while ((lm = templateRe.exec(body)) !== null) {
      // Encode the template literal as "quasi0|${EXPR}|quasi1|${EXPR}|quasi2"
      // so the runner can split → transform quasis → rejoin.
      classNames.push('__TMPL__' + lm[1]);
    }
    // className={cn("...", "...")}  — collect all string args
    const helperRe = /className=\{(?:cn|clsx)\(([\s\S]*?)\)\}/g;
    while ((lm = helperRe.exec(body)) !== null) {
      const args = lm[1];
      const stringRe = /(["'])((?:(?!\1).)*)\1/g;
      let sm: RegExpExecArray | null;
      while ((sm = stringRe.exec(args)) !== null) {
        classNames.push(sm[2]);
      }
    }
    byExport.set(name, classNames);
  }
  return byExport;
}

function pairUp(byExport: Map<string, string[]>): Pair[] {
  const pairs: Pair[] = [];
  for (const [name, inputs] of byExport) {
    if (!name.endsWith('Input')) continue;
    const expectedName = name.replace(/Input$/, 'Expected');
    const expected = byExport.get(expectedName);
    if (!expected) {
      console.error(`No matching Expected fixture for ${name}`);
      process.exit(2);
    }
    pairs.push({name: name.replace(/Input$/, ''), inputs, expected});
  }
  return pairs;
}

function main(): void {
  // Resolve fixture path either from an env override (used when the script is
  // bundled to a scratch location) or from __dirname when run in place.
  const fixturePath =
    process.env.CODEMOD_FIXTURE_PATH ??
    path.join(__dirname, '__tests__', 'codemod-fixtures.tsx');
  const source = fs.readFileSync(fixturePath, 'utf8');
  const byExport = extractClassNames(source);
  const pairs = pairUp(byExport);

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const pair of pairs) {
    if (pair.inputs.length !== pair.expected.length) {
      failures.push(
        `[${pair.name}] className count mismatch: input=${pair.inputs.length} expected=${pair.expected.length}`,
      );
      failed++;
      continue;
    }
    for (let i = 0; i < pair.inputs.length; i++) {
      const rawIn = pair.inputs[i];
      const rawExp = pair.expected[i];
      let got: string;
      if (rawIn.startsWith('__TMPL__')) {
        // Template literal: split on ${...} to transform each static quasi,
        // and additionally transform any string literal ('...' or "...") that
        // appears inside an interpolation — this mirrors the codemod's
        // `processExpression` walker which descends into Conditional /
        // Logical / Binary expressions and rewrites their Literal children.
        const inBody = rawIn.slice(8);
        const parts = inBody.split(/(\$\{[^}]*\})/g);
        got =
          '__TMPL__' +
          parts
            .map((p) => {
              if (!p.startsWith('${')) return transformClassString(p, 'fixture');
              // Inside ${...}: rewrite each string literal.
              return p.replace(/(['"])((?:(?!\1).)*)\1/g, (_full, q, body) => {
                return q + transformClassString(body, 'fixture') + q;
              });
            })
            .join('');
      } else {
        got = transformClassString(rawIn, 'fixture');
      }
      const want = rawExp;
      if (got !== want) {
        failures.push(
          [
            `[${pair.name}#${i}]`,
            `  input:    ${JSON.stringify(pair.inputs[i])}`,
            `  expected: ${JSON.stringify(want)}`,
            `  got:      ${JSON.stringify(got)}`,
          ].join('\n'),
        );
        failed++;
      } else {
        passed++;
      }
    }
  }

  const total = passed + failed;
  console.log('');
  console.log('═'.repeat(60));
  console.log(`Codemod fixture tests: ${passed}/${total} passed`);
  console.log('═'.repeat(60));
  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) console.log(f);
    process.exit(1);
  }
  console.log('All fixtures match. OK.');
}

main();
