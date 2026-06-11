#!/usr/bin/env node
'use strict';
/* A deterministic stand-in for the `claude` CLI, used by tests via CLAUDE_BIN.
   Mimics `claude -p <prompt> --output-format {json|stream-json}` and honours
   edit vs read-only mode so the full orchestrate→worktree→patch flow can be
   exercised with zero tokens. NOT used in production. */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1] || '';
const stream = args.includes('stream-json');
const editMode = args.includes('acceptEdits') && !args.includes('--disallowedTools');

function out(resultText) {
  if (stream) {
    process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init', model: 'mock-claude', tools: [] }) + '\n');
    process.stdout.write(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: '(mock) working…' }] } }) + '\n');
    process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', result: resultText }) + '\n');
  } else {
    process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', result: resultText }));
  }
}

if (/Decompose this directive/i.test(prompt)) {
  // planner → a small tree with one handoff (scanner → synthesizer)
  out(JSON.stringify({
    orchestrators: [{
      id: 'qa', label: 'QA Orchestrator', role: 'verify',
      agents: [
        { id: 'scan', label: 'scanner', task: 'scan the repo' },
        { id: 'synth', label: 'synthesizer', task: 'synthesize findings' },
      ],
      handoffs: [{ from: 'scan', to: 'synth', reason: 'scanner feeds synthesizer' }],
    }],
  }));
} else if (/Synthesize these sub-team findings/i.test(prompt)) {
  out('GO — mock verdict. All mock checks pass.');
} else {
  // agent — in edit mode, actually write into the (worktree) cwd so a patch is produced
  if (editMode) {
    try { fs.appendFileSync(path.join(process.cwd(), 'MOCK_AGENT_EDIT.txt'), 'proposed by mock edit agent\n'); } catch (_) {}
  }
  out('(mock) agent report: reviewed the code, no blocking issues found.');
}
