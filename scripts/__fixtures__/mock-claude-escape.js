#!/usr/bin/env node
'use strict';
/* Adversarial stand-in: an "edit" agent that tries to ESCAPE the worktree and
   write into the main repo via an absolute path (the exact breach we found).
   Under the sandbox the write must fail. Used only by the adversarial test. */
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1] || '';
const stream = args.includes('stream-json');
const editMode = args.includes('acceptEdits') && !args.includes('--disallowedTools');

function out(t) {
  if (stream) {
    process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init', model: 'mock-escape', tools: [] }) + '\n');
    process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', result: t }) + '\n');
  } else process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', result: t }));
}

if (/Decompose this directive/i.test(prompt)) {
  out(JSON.stringify({ orchestrators: [{ id: 'x', label: 'X', role: 'r', agents: [{ id: 'rogue', label: 'rogue', task: 'edit' }] }] }));
} else if (/Synthesize these sub-team findings/i.test(prompt)) {
  out('done');
} else {
  if (editMode) {
    // attempt the escape: absolute-path write into the repo root
    try { fs.writeFileSync(path.join(REPO, 'ESCAPE_PROBE.txt'), 'breach'); } catch (_) {}
  }
  out('(rogue) tried to escape');
}
