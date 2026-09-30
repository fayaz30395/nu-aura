#!/usr/bin/env node
// Runs every story's `Verify:` shell line from faylo-sdlc/stories in parallel and
// reports pass/fail per story. Read-only: never touches the ledger — `python3 -m faylo
// verify run` stays the only writer of Verified: lines.
// Usage: node scripts/faylo-qa-verify.mjs [outJson] [concurrency]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(root, 'qa-verify.json');
const limit = Number(process.argv[3] ?? 8);
const TIMEOUT_MS = 120_000;

const files = readdirSync(join(root, 'faylo-sdlc', 'stories')).filter((f) => f.endsWith('.md'));
const stories = files.map((f) => {
  const text = readFileSync(join(root, 'faylo-sdlc', 'stories', f), 'utf8');
  return {
    id: text.match(/^# (\S+):/m)?.[1] ?? f,
    title: text.match(/^# \S+: (.+)$/m)?.[1] ?? '',
    checks: [...text.matchAll(/^\s+- \*\*Verify:\*\* (shell|manual) ?(.*)$/gm)]
      .map((m) => ({ kind: m[1], cmd: m[2].trim() })),
  };
});

const run = (cmd) => new Promise((resolve) => {
  execFile('bash', ['-c', cmd], { cwd: root, timeout: TIMEOUT_MS, maxBuffer: 4 << 20 },
    (err, stdout, stderr) => resolve({
      ok: !err,
      // ponytail: a timeout kill reads as a plain failure otherwise — name it.
      detail: err ? (err.killed ? 'timed out' : (stderr || stdout || err.message).trim().slice(0, 300)) : '',
    }));
});

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }));
  return results;
}

let finished = 0;
const results = await pool(stories, async (s) => {
  const checks = [];
  for (const c of s.checks) {
    checks.push(c.kind === 'manual'
      ? { kind: 'manual', cmd: c.cmd, ok: null, detail: 'manual check — not run' }
      : { kind: 'shell', cmd: c.cmd, ...(await run(c.cmd)) });
  }
  const verdict = checks.length === 0 ? 'none'
    : checks.some((c) => c.ok === false) ? 'fail'
    : checks.every((c) => c.ok === true) ? 'pass' : 'manual';
  process.stderr.write(`[${++finished}/${stories.length}] ${verdict.padEnd(6)} ${s.id}\n`);
  return { id: s.id, title: s.title, verdict, checks };
});

const tally = (v) => results.filter((r) => r.verdict === v).length;
writeFileSync(out, JSON.stringify({ ran: new Date().toISOString(), results }, null, 2));
console.log(`pass ${tally('pass')} · fail ${tally('fail')} · manual ${tally('manual')} · none ${tally('none')} -> ${out}`);
for (const r of results.filter((r) => r.verdict === 'fail')) {
  console.log(`FAIL ${r.id} ${r.title}`);
  for (const c of r.checks.filter((c) => c.ok === false)) console.log(`     ${c.cmd}\n     ↳ ${c.detail || 'non-zero exit'}`);
}
