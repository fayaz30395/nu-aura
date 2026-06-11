#!/usr/bin/env node
/* ======================================================================
   NU-AURA Orchestrator OS — LIVE hierarchical multi-agent control plane.

   You issue a directive to the Lead Orchestrator (a real `claude -p`
   call that PLANS a delegation tree). The server spawns a real agent per
   task; every directive-down, agent→agent handoff, and report-up is a
   real message streamed into the graph over SSE.

   Features:
     · live planning + real claude agents          (a)
     · agent → agent HANDOFFS (cross edges, content)(1)
     · opt-in EDIT mode (agents can modify files)   (2)
     · every run PERSISTED + free client REPLAY      (3)

   Run:  node scripts/orchestrator-os-server.js  →  http://localhost:8789
   ====================================================================== */
'use strict';
const http = require('http');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { norm, extractJson, trimTree, planWaves, incomingFor, fallbackTree } = require('./orchestrator-core');

const ROOT = path.resolve(__dirname, '..');
const PORT = +(process.env.ORCH_OS_PORT || 8789);
const CLAUDE = process.env.CLAUDE_BIN || 'claude';
// Resolve the absolute binary (sandbox-exec needs a real path, not a PATH lookup).
const CLAUDE_PATH = (() => { try { return require('child_process').execFileSync('which', [CLAUDE]).toString().trim() || CLAUDE; } catch (_) { return CLAUDE; } })();
// HARD sandbox: on macOS, run every agent under sandbox-exec denying ALL writes to
// the repo. Agents physically cannot edit your working tree — even via absolute
// paths or Bash. The isolated worktree lives in $TMPDIR (outside the repo) so edit
// agents can still write there. Without sandbox-exec, isolation is worktree-only.
const SANDBOX = process.platform === 'darwin' && (() => { try { require('child_process').execFileSync('which', ['sandbox-exec']); return true; } catch (_) { return false; } })();
const SANDBOX_PROFILE = `(version 1)(allow default)(deny file-write* (subpath "${ROOT}"))`;
// Sandbox mode (in priority order): explicit ORCH_SANDBOX, else docker if forced,
// else macOS sandbox-exec, else none. Docker gives a HARD guarantee on every
// platform — the host repo is simply never mounted into the agent container.
const DOCKER_IMAGE = process.env.ORCH_DOCKER_IMAGE || 'nu-agent-os:latest';
const SANDBOX_MODE = process.env.ORCH_SANDBOX || (SANDBOX ? 'sandbox-exec' : 'none');
const PLAN_TIMEOUT = 90_000, AGENT_TIMEOUT = 180_000;
const AGENT_MAX_TURNS = +(process.env.ORCH_AGENT_MAX_TURNS || 14);   // cost cap per agent
const MAX_CALLS_PER_RUN = +(process.env.ORCH_MAX_CALLS || 24);       // hard per-run spend ceiling
const MAX_RUNS_IN_MEM = 40;                                          // memory eviction
const RUNS_DIR = path.join(ROOT, 'qa-reports', 'runs');
try { fs.mkdirSync(RUNS_DIR, { recursive: true }); } catch (_) {}

/* ---- git worktree isolation (edit-mode agents never touch your tree) --- */
const ex = (args, cwd) => new Promise(res => execFile('git', cwd ? ['-C', cwd, ...args] : args, { maxBuffer: 8 * 1024 * 1024 }, (e, out) => res(e ? '' : (out || ''))));
// Docker Desktop on macOS only bind-shares /Users, so docker-mode worktrees must
// live under $HOME there; everywhere else $TMPDIR is fine.
const WT_BASE = (SANDBOX_MODE === 'docker' && process.platform === 'darwin') ? path.join(os.homedir(), '.orch-os-worktrees') : path.join(os.tmpdir(), 'orch-os-wt');
async function makeWorktree(runId) {
  const dir = path.join(WT_BASE, runId.replace(/[^a-z0-9_]/gi, ''));
  try { fs.mkdirSync(path.dirname(dir), { recursive: true }); } catch (_) {}
  const ok = await new Promise(res => execFile('git', ['-C', ROOT, 'worktree', 'add', '--detach', dir, 'HEAD'], e => res(!e)));
  if (!ok) return null;
  // Copy untracked (non-ignored) files in, so edit agents find the real working
  // state INSIDE the sandbox instead of reaching out to the main checkout.
  try {
    const untracked = (await ex(['ls-files', '--others', '--exclude-standard'], ROOT)).split('\n').filter(Boolean);
    for (const rel of untracked) {
      try { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.copyFileSync(path.join(ROOT, rel), path.join(dir, rel)); } catch (_) {}
    }
  } catch (_) {}
  return dir;
}
async function diffWorktree(dir) {
  await ex(['add', '-A'], dir);
  const stat = (await ex(['diff', '--cached', '--stat'], dir)).trim();
  const full = await ex(['diff', '--cached'], dir);
  return { stat, full };
}
async function removeWorktree(dir) { if (dir) await new Promise(res => execFile('git', ['-C', ROOT, 'worktree', 'remove', '--force', dir], () => res())); }
// Cross-platform guard: hash the main tree's git status so we can detect ANY
// escape after an edit run, even where sandbox-exec isn't available.
async function mainTreeFingerprint() {
  const s = await ex(['status', '--porcelain'], ROOT);
  return require('crypto').createHash('sha1').update(s).digest('hex');
}

const READONLY_TOOLS = ['Read', 'Grep', 'Glob'];
const EDIT_TOOLS = ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash'];
const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash'];  // denied in read-only mode

/* ---- run registry + SSE ---------------------------------------------- */
let RUNSEQ = 0;
const runs = new Map(); // runId -> { directive, events:[], clients:Set, status, procs:Set, edit }
function emit(run, ev, data) {
  run.events.push({ ev, data });
  const payload = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of run.clients) { try { res.write(payload); } catch (_) {} }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function evictRuns() {  // bound in-memory runs; transcripts stay on disk
  if (runs.size <= MAX_RUNS_IN_MEM) return;
  for (const [id, r] of runs) { if (runs.size <= MAX_RUNS_IN_MEM) break; if (r.status !== 'running') runs.delete(id); }
}

function saveRun(runId) {
  const run = runs.get(runId); if (!run) return;
  try {
    fs.writeFileSync(path.join(RUNS_DIR, runId + '.json'),
      JSON.stringify({ runId, directive: run.directive, ts: Date.now(), status: run.status, edit: run.edit, events: run.events }));
    const idxP = path.join(RUNS_DIR, 'index.json');
    let idx = []; try { idx = JSON.parse(fs.readFileSync(idxP, 'utf8')); } catch (_) {}
    idx = idx.filter(r => r.runId !== runId);
    idx.unshift({ runId, directive: run.directive, ts: Date.now(), status: run.status, edit: run.edit,
      messages: run.events.filter(e => e.ev === 'message').length });
    fs.writeFileSync(idxP, JSON.stringify(idx.slice(0, 60)));
  } catch (e) { console.error('saveRun', e.message); }
}

/* ---- claude helper (cost-counted, turn-capped, optional streaming) ----- */
function runClaude(task, { timeout, run, edit, maxTurns, stream, onText, cwd }) {
  return new Promise(resolve => {
    if (run && (run.calls || 0) >= MAX_CALLS_PER_RUN) {   // hard spend ceiling
      run.killed = true;
      return resolve({ ok: false, text: `cost ceiling reached (${MAX_CALLS_PER_RUN} calls) — run halted` });
    }
    if (run) { run.calls = (run.calls || 0) + 1; emit(run, 'cost', { calls: run.calls }); }
    const tools = edit ? EDIT_TOOLS : READONLY_TOOLS;
    const fmt = stream ? ['--output-format', 'stream-json', '--verbose'] : ['--output-format', 'json'];
    const args = ['-p', task, ...fmt, '--allowedTools', ...tools];
    if (maxTurns) args.push('--max-turns', String(maxTurns));
    if (edit) {
      args.push('--permission-mode', 'acceptEdits');
    } else {
      // HARD block writes — an allowlist alone does NOT sandbox; project
      // permission settings can still grant Edit/Write/Bash. disallowedTools
      // explicitly denies them so "read-only" is actually read-only.
      args.push('--permission-mode', 'plan', '--disallowedTools', ...WRITE_TOOLS);
    }
    // stdin must be closed — headless `claude -p` otherwise blocks ~3s waiting for piped input.
    // Isolate the agent so it cannot write the host repo (see SANDBOX_MODE).
    let bin, fullArgs, spawnCwd = cwd || ROOT;
    if (SANDBOX_MODE === 'docker') {
      // Mount ONLY /work — the host repo is never mounted, so the agent can't reach
      // it on any platform. Edit agents get the worktree rw; everyone else gets the
      // repo read-only.
      const mount = edit && cwd ? `${cwd}:/work` : `${cwd || ROOT}:/work:ro`;
      // Auth passthrough: an API key OR a subscription OAuth token (from
      // `claude setup-token`) — both use your existing plan, no extra cost.
      const authEnv = [];
      if (process.env.ANTHROPIC_API_KEY) authEnv.push('-e', 'ANTHROPIC_API_KEY');
      if (process.env.CLAUDE_CODE_OAUTH_TOKEN) authEnv.push('-e', 'CLAUDE_CODE_OAUTH_TOKEN');
      bin = 'docker';
      fullArgs = ['run', '--rm', '-v', mount, '-w', '/work', ...authEnv, DOCKER_IMAGE, 'claude', ...args];
      spawnCwd = ROOT;
    } else if (SANDBOX_MODE === 'sandbox-exec') {
      bin = 'sandbox-exec'; fullArgs = ['-p', SANDBOX_PROFILE, CLAUDE_PATH, ...args];
    } else {
      bin = CLAUDE_PATH; fullArgs = args;
    }
    const proc = spawn(bin, fullArgs, { cwd: spawnCwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    run && run.procs.add(proc);
    let out = '', err = '', buf = '', result = null;
    const killer = setTimeout(() => { try { proc.kill('SIGTERM'); } catch (_) {} }, timeout);
    proc.stdout.on('data', d => {
      out += d;
      if (!stream) return;
      buf += d; let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'assistant' && ev.message && ev.message.content) {
            const txt = ev.message.content.map(c => c.text || (c.type === 'tool_use' ? '↳ ' + c.name : '')).join(' ').trim();
            if (txt && onText) onText(txt.slice(0, 240));
          } else if (ev.type === 'result') { result = ev.result != null ? ev.result : result; }
        } catch (_) {}
      }
    });
    proc.stderr.on('data', d => err += d);
    proc.on('error', e => { clearTimeout(killer); resolve({ ok: false, text: 'spawn error: ' + e.message }); });
    proc.on('close', code => {
      clearTimeout(killer); run && run.procs.delete(proc);
      if (code !== 0 && !out) return resolve({ ok: false, text: (err || `claude exited ${code}`).slice(0, 300) });
      let text = result;
      if (text == null) { try { const env = JSON.parse(out); text = env.result != null ? env.result : (env.text != null ? env.text : out); } catch (_) { text = out; } }
      resolve({ ok: code === 0, text: String(text || '').trim() });
    });
  });
}
// retry a claude call once on failure (cheap resilience for flaky agents)
async function runClaudeRetry(task, opts) {
  let res = await runClaude(task, opts);
  if (!res.ok) { opts.run && emit(opts.run, 'log', { id: opts._nodeId, text: '↻ retrying after error…' }); res = await runClaude(task, opts); }
  return res;
}

/* ---- one orchestrator's agent team (handoffs + waves + streaming) ----- */
async function runOrchestrator(o, oid, run, edit, cwd) {
  const agents = (o.agents || []).map(a => ({ ...a, _id: norm(a.id || a.label) }));
  const agentIds = agents.map(a => a._id);
  const handoffs = (Array.isArray(o.handoffs) ? o.handoffs : [])
    .map(h => ({ from: norm(h.from), to: norm(h.to), reason: h.reason || '' }));
  const byId = {}; agents.forEach(a => byId[a._id] = a);

  for (const a of agents) { emit(run, 'node', { id: a._id, type: 'agent', parent: oid, label: a.label || a._id, role: (a.task || '').slice(0, 40) }); await sleep(110); }

  const reportBy = {};
  async function runAgent(a) {
    if (run.killed) return;
    let ctx = '';
    for (const h of incomingFor(a._id, agentIds, handoffs)) {
      emit(run, 'edge', { from: h.from, to: a._id });                         // agent→agent handoff edge
      emit(run, 'message', { f: h.from, t: a._id, k: 'handoff', s: 'handoff → ' + (a.label || a._id),
        b: (h.reason ? h.reason + '\n\n' : '') + '--- upstream findings ---\n' + (reportBy[h.from] || '(none)') });
      ctx += `\n\nUpstream finding from ${h.from}:\n${reportBy[h.from] || ''}`;
    }
    emit(run, 'message', { f: oid, t: a._id, k: 'directive', s: (a.label || a._id) + ' · task', b: a.task });
    emit(run, 'state', { id: a._id, state: 'running' });
    const res = await runClaudeRetry(a.task + ctx + '\n\nAnswer concisely in <=120 words.' + (edit ? ' You may edit files in this working copy.' : ' Read-only — do not edit.'),
      { timeout: AGENT_TIMEOUT, run, edit, cwd, maxTurns: AGENT_MAX_TURNS, stream: true, _nodeId: a._id,
        onText: t => emit(run, 'log', { id: a._id, text: t }) });
    reportBy[a._id] = res.text; byId[a._id]._done = true;
    emit(run, 'message', { f: a._id, t: oid, k: 'report', s: res.ok ? 'report ready' : '⚠ agent error', b: res.text || '(no output)' });
    emit(run, 'state', { id: a._id, state: res.ok ? 'done' : 'failed' });
  }
  for (const wave of planWaves(agentIds, handoffs)) {     // tested scheduler — runs each wave in parallel
    if (run.killed) break;
    await Promise.all(wave.map(id => runAgent(byId[id])));
  }
  return agents.map(a => `[${a.label || a._id}] ${reportBy[a._id] || ''}`).join('\n\n');
}

/* ---- the orchestration ------------------------------------------------ */
async function orchestrate(runId, directive, edit) {
  const run = runs.get(runId);
  let worktree = null, treeFpBefore = null;
  try {
    if (edit) {
      treeFpBefore = await mainTreeFingerprint();
      worktree = await makeWorktree(runId); run.worktree = worktree;
      emit(run, 'message', { f: 'you', t: 'lead', k: 'query', s: worktree ? '🛡 isolated worktree created' : '⚠ worktree unavailable — using main tree',
        b: worktree ? `Edit-mode agents will work in an ISOLATED git worktree:\n${worktree}\nYour working tree is NOT touched. A reviewable patch is produced at the end.` : 'Could not create a git worktree; edit-mode agents would touch the main tree. Proceeding read-only-safe is recommended.' });
      if (!worktree) edit = false; // fail safe: never silently fall back to editing the real tree
    }
    emit(run, 'node', { id: 'you', type: 'principal', label: 'You', role: 'Principal' });
    emit(run, 'node', { id: 'lead', type: 'orchestrator', parent: 'you', label: 'Lead Orchestrator', role: 'plans & delegates' });
    await sleep(150);
    emit(run, 'message', { f: 'you', t: 'lead', k: 'directive', s: directive.slice(0, 70), b: directive + (edit ? '\n\n[EDIT MODE: agents may modify files]' : '') });
    emit(run, 'state', { id: 'lead', state: 'running' });

    emit(run, 'message', { f: 'lead', t: 'lead', k: 'query', s: 'planning delegation tree…', b: 'Decomposing the directive into sub-orchestrators, agent tasks, and handoffs.' });
    const planPrompt =
      `You are the Lead Orchestrator for the NU-AURA HRMS project (Spring Boot backend + Next.js frontend). ` +
      `Decompose this directive into a delegation tree. Respond with ONLY minified JSON, no prose, shape: ` +
      `{"orchestrators":[{"id":"qa","label":"QA Orchestrator","role":"short role","agents":[{"id":"kebab-id","label":"short","task":"one concrete task, <=100 words"}],"handoffs":[{"from":"agent-id","to":"agent-id","reason":"why"}]}]}. ` +
      `Use 2-3 orchestrators, each 1-2 agents. Add a handoff when one agent's output should feed another (e.g. a scanner feeding a synthesizer). ids unique kebab-case. Directive: ${directive}`;
    const planRes = await runClaude(planPrompt, { timeout: PLAN_TIMEOUT, run, edit: false });
    let tree;
    try { tree = trimTree(extractJson(planRes.text)); }
    catch (_) { emit(run, 'message', { f: 'lead', t: 'lead', k: 'report', s: '⚠ planner fell back to default tree', b: 'Could not parse a tree; using a safe default.\n\nRaw planner output:\n' + (planRes.text || '(empty)').slice(0, 500) }); tree = trimTree(fallbackTree(directive)); }
    emit(run, 'message', { f: 'lead', t: 'lead', k: 'report', s: `plan ready · ${tree.orchestrators.length} orchestrators`,
      b: 'Delegation tree:\n' + tree.orchestrators.map(o => `• ${o.label} (${o.role})\n` + (o.agents || []).map(a => `    – ${a.label}: ${a.task}`).join('\n') + ((o.handoffs && o.handoffs.length) ? '\n    ↳ handoffs: ' + o.handoffs.map(h => `${h.from}→${h.to}`).join(', ') : '')).join('\n') });

    const reports = [];
    for (const o of tree.orchestrators) {
      if (run.killed) break;
      const oid = norm(o.id || o.label);
      emit(run, 'node', { id: oid, type: 'orchestrator', parent: 'lead', label: o.label || oid, role: o.role || '' });
      await sleep(160);
      emit(run, 'message', { f: 'lead', t: oid, k: 'spawn', s: `spin up ${o.label}`, b: `Stand up "${o.label}" — ${o.role}. Spawn its agent team and report findings back to me.` });
      emit(run, 'state', { id: oid, state: 'running' });
      const agg = await runOrchestrator(o, oid, run, edit, worktree);
      reports.push({ orch: o.label, agg });
      emit(run, 'message', { f: oid, t: 'lead', k: 'report', s: `${o.label} findings`, b: agg.slice(0, 1500) });
      emit(run, 'state', { id: oid, state: 'done' });
    }

    emit(run, 'message', { f: 'lead', t: 'lead', k: 'query', s: 'synthesizing verdict…', b: 'Aggregating sub-orchestrator findings into a verdict.' });
    const verdictPrompt =
      `You are the Lead Orchestrator. Synthesize these sub-team findings into a crisp verdict for the directive "${directive}". ` +
      `Give a 1-line headline (GO / NO-GO / NEEDS-WORK) then 3-5 bullets. <=140 words. Findings:\n\n` +
      reports.map(r => `### ${r.orch}\n${r.agg}`).join('\n\n');
    const verdict = await runClaude(verdictPrompt, { timeout: PLAN_TIMEOUT, run, edit: false });
    emit(run, 'message', { f: 'lead', t: 'you', k: 'verdict', s: run.killed ? 'verdict (partial — stopped)' : 'verdict', b: verdict.text || 'orchestration complete' });

    if (worktree) {  // isolate → diff → patch the user can review/apply; main tree untouched
      const d = await diffWorktree(worktree);
      let patchPath = null;
      if (d.stat) { try { patchPath = path.join(RUNS_DIR, runId + '.patch'); fs.writeFileSync(patchPath, d.full); } catch (_) {} }
      emit(run, 'message', { f: 'lead', t: 'you', k: 'report', s: d.stat ? '✎ proposed changes (isolated) — review' : '✎ no file changes',
        b: d.stat
          ? `Edit-mode agents worked in an ISOLATED worktree — your files were NOT touched.\nReview the proposed changes, then apply if you want:\n  git apply ${patchPath}\n\n${d.stat}\n\n--- diff (truncated) ---\n${(d.full || '').slice(0, 4000)}`
          : 'Edit mode was on, but the agents made no file changes.' });
    }
    await removeWorktree(worktree); worktree = null;   // clean up BEFORE signaling done (no leak when client sees 'status')
    if (treeFpBefore) {  // verify the guarantee held — an escape would change the main tree
      const after = await mainTreeFingerprint();
      if (after !== treeFpBefore) emit(run, 'message', { f: 'lead', t: 'you', k: 'report', s: '⚠ SECURITY: main tree changed during run',
        b: 'An agent escaped isolation and modified your working tree (sandbox unavailable on this platform?). Review and revert with `git status` / `git checkout`. On macOS this cannot happen.' });
      else emit(run, 'message', { f: 'lead', t: 'you', k: 'report', s: '✓ isolation verified — main tree unchanged', b: 'The main working tree is byte-identical to before the run. Agents were fully isolated.' });
    }
    emit(run, 'state', { id: 'lead', state: 'done' });
    run.status = run.killed ? 'stopped' : 'done'; emit(run, 'status', { status: run.status, calls: run.calls || 0 });
  } catch (e) {
    emit(run, 'message', { f: 'lead', t: 'you', k: 'report', s: '⚠ orchestration error', b: String(e && e.stack || e) });
    run.status = 'failed'; emit(run, 'status', { status: 'failed' });
  } finally {
    await removeWorktree(worktree);   // always clean up the isolated worktree
  }
  saveRun(runId);
}

/* ---- live page (reuses orchestrator-os.html CSS) ---------------------- */
function styleBlock() {
  try { const html = fs.readFileSync(path.join(ROOT, 'qa-reports', 'orchestrator-os.html'), 'utf8');
    const m = html.match(/<style>[\s\S]*?<\/style>/i); return m ? m[0] : '<style></style>'; } catch (_) { return '<style></style>'; }
}
function livePage() {
  return `<!doctype html><html lang="en" data-theme="dark"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>NU-AURA · Orchestrator OS · LIVE</title>
${styleBlock()}
<style>
  .brand .v.live{color:var(--ok);border-color:var(--ok)}
  .node .led.s-running{background:var(--run);animation:pulse 1.1s var(--ease) infinite}
  .node .led.s-done{background:var(--ok)} .node .led.s-failed{background:var(--err)}
  .edge.xedge{stroke:var(--handoff);stroke-dasharray:3 5;opacity:.55}
  .confirm{display:none;align-items:center;gap:10px;flex:1}.confirm.show{display:flex}
  .confirm .warn{font:600 11px/1 var(--mono);color:var(--run);white-space:nowrap}
  .toggle{font:600 10px/1 var(--mono);padding:8px 10px;border-radius:var(--r2);border:1px solid var(--line);background:var(--surface);color:var(--faint);cursor:pointer}
  .toggle.on{color:var(--err);border-color:oklch(56% 0.16 22 /.6)}
  .runsWrap{position:relative}
  .runsMenu{display:none;position:absolute;right:0;top:38px;width:340px;max-height:340px;overflow-y:auto;z-index:9;
    background:var(--surface2);border:1px solid var(--line2);border-radius:var(--r);padding:6px;box-shadow:0 20px 50px -20px #000}
  .runsMenu.show{display:block}
  .runItem{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:8px;padding:9px 10px;cursor:pointer;color:var(--text)}
  .runItem:hover{background:var(--surface)}
  .runItem .rd{font:500 12px/1.3 var(--sans)}
  .runItem .rm{font:600 9px/1.3 var(--mono);color:var(--faint);margin-top:2px;display:flex;gap:8px}
  .runItem .rm .ed{color:var(--err)}
  .cost{font:600 10px/1 var(--mono);color:var(--faint);padding:8px 9px;border:1px solid var(--line);border-radius:var(--r2)}
  .btn.stop{color:var(--err);border-color:oklch(56% 0.16 22 /.6)}
  .nodeLog{margin-top:6px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:8px;max-height:150px;overflow-y:auto;font:500 10.5px/1.5 var(--mono);color:var(--dim);white-space:pre-wrap}
</style></head>
<body>
  <header class="cmd">
    <div class="brand"><b>ORCHESTRATOR&nbsp;OS</b><span class="v live">● LIVE</span></div>
    <div class="chan" id="chanWrap" title="You only talk to the Lead Orchestrator">
      <span class="you">YOU ▸ LEAD</span><span class="arr">›</span>
      <input id="directive" value="Is the audit-log search endpoint production-ready?" spellcheck="false"/>
    </div>
    <div class="confirm" id="confirm">
      <span class="warn" id="warnTxt">⚠ spawns real Claude agents · spends tokens</span>
      <button class="toggle" id="editToggle" title="Allow agents to modify files">read-only</button>
      <button class="btn primary" id="launch">▶ Launch</button>
      <button class="btn" id="cancel">cancel</button>
    </div>
    <div class="ctl" id="ctl">
      <span class="cost" id="cost" title="real claude calls this run">0 calls</span>
      <button class="btn primary" id="issue">▶ Issue directive</button>
      <button class="btn stop" id="stop" style="display:none">⏹ Stop</button>
      <div class="runsWrap"><button class="btn" id="runsBtn">Runs ▾</button><div class="runsMenu" id="runsMenu"></div></div>
      <button class="btn" id="reset">↺ Reset</button>
    </div>
  </header>
  <section class="stage">
    <div class="canvas" id="canvas"><svg class="net" id="net" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 620"><g id="graph"></g><g id="fx"></g></svg></div>
    <aside class="inspect" id="inspect"><div class="h">Inspector</div>
      <div id="insBody"><p class="insHint">Edit the directive and press <b>▶ Issue directive</b>. The Lead Orchestrator plans a delegation tree of real Claude agents — with <b>handoffs</b> between agents. Every agent runs under an <b>OS sandbox</b> that denies writes to this repo; <b>edit mode</b> works in an <b>isolated git worktree</b> and hands you a reviewable patch — agents physically cannot touch your working tree (hard-enforced on macOS, proven by an adversarial test). <b>Stop</b> halts a run, a call-ceiling caps spend, and past runs replay for free under <b>Runs ▾</b>.</p></div>
    </aside>
  </section>
  <footer class="bus">
    <div class="bar"><span class="h">Message bus</span><span id="busCount" style="font:600 10px/1 var(--mono);color:var(--faint)">0 messages</span>
      <div class="legend">
        <span><i style="background:var(--directive)"></i>directive</span><span><i style="background:var(--spawn)"></i>spawn</span>
        <span><i style="background:var(--handoff)"></i>handoff</span><span><i style="background:var(--query)"></i>query</span>
        <span><i style="background:var(--report)"></i>report</span><span><i style="background:var(--verdict)"></i>verdict</span>
      </div></div>
    <div class="feed" id="feed"></div>
  </footer>
<script src="/client-core.js"></script>
<script>
const KIND=OrchClientCore.KIND;                 // unit-tested module, served at /client-core.js
const esc=OrchClientCore.esc, ek=OrchClientCore.edgeKey;
const SVG='http://www.w3.org/2000/svg',$=(s,r=document)=>r.querySelector(s);
const net=$('#net'),G=$('#graph'),FX=$('#fx');
let NODES={},MSGS=[],EXTRA=[],es=null,editMode=false,replayTok=0,CURRENT_RUN=null;
const COLX=OrchClientCore.COLX;
function dims(t){return t==='orchestrator'?[160,58]:t==='principal'?[128,50]:[150,54];}
function layout(){const pos=OrchClientCore.computeLayout(NODES,COLX);for(const id in pos){NODES[id]._x=pos[id].x;NODES[id]._y=pos[id].y;}}
function render(){layout();G.innerHTML='';
  for(const id in NODES){const p=NODES[id].parent;if(!p||!NODES[p])continue;const a=NODES[p],b=NODES[id],mx=(a._x+b._x)/2;
    const path=document.createElementNS(SVG,'path');path.setAttribute('d','M '+a._x+' '+a._y+' C '+mx+' '+a._y+', '+mx+' '+b._y+', '+b._x+' '+b._y);
    path.setAttribute('class','edge');path.dataset.edge=ek(p,id);G.appendChild(path);}
  EXTRA.forEach(([f,t])=>{const a=NODES[f],b=NODES[t];if(!a||!b)return;const bow=Math.max(50,Math.abs(b._y-a._y)*.4);
    const path=document.createElementNS(SVG,'path');path.setAttribute('d','M '+a._x+' '+a._y+' C '+(a._x+bow)+' '+a._y+', '+(b._x+bow)+' '+b._y+', '+b._x+' '+b._y);
    path.setAttribute('class','edge xedge');path.dataset.edge=ek(f,t);G.appendChild(path);});
  for(const id in NODES){const n=NODES[id],[w,h]=dims(n.type);const fo=document.createElementNS(SVG,'foreignObject');
    fo.setAttribute('x',n._x-w/2);fo.setAttribute('y',n._y-h/2);fo.setAttribute('width',w);fo.setAttribute('height',h);
    fo.innerHTML='<div xmlns="http://www.w3.org/1999/xhtml" class="node t-'+n.type+(n._sel?' sel':'')+'" data-node="'+id+'"><div class="nt">'+n.type+'<span class="badge">'+(n._n?' ·'+n._n:'')+'</span></div><div class="nl"><span class="led s-'+(n._state||'')+'"></span>'+esc(n.label)+'</div><div class="nr">'+esc(n.role||'')+'</div></div>';
    G.appendChild(fo);}
  G.querySelectorAll('[data-node]').forEach(el=>el.addEventListener('click',()=>selectNode(el.dataset.node)));}
function edgeEl(k){return G.querySelector('[data-edge="'+k+'"]');}
function nodeEl(id){return G.querySelector('[data-node="'+id+'"]');}
function packet(f,t,color){const a=NODES[f],b=NODES[t];if(!a||!b)return;const c=document.createElementNS(SVG,'circle');
  c.setAttribute('r',5);c.setAttribute('fill',color);c.style.color=color;c.setAttribute('class','packet');FX.appendChild(c);
  const t0=performance.now(),dur=720,mx=(a._x+b._x)/2,bz=(t,p0,p1,p2,p3)=>{const u=1-t;return u*u*u*p0+3*u*u*t*p1+3*u*t*t*p2+t*t*t*p3;};
  (function mv(now){let p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);c.setAttribute('cx',bz(e,a._x,mx,mx,b._x));c.setAttribute('cy',bz(e,a._y,a._y,b._y,b._y));p<1?requestAnimationFrame(mv):c.remove();})(t0);}
function addEdge(f,t){if(NODES[f]&&NODES[f].parent===t||NODES[t]&&NODES[t].parent===f)return;if(EXTRA.some(e=>ek(e[0],e[1])===ek(f,t)))return;EXTRA.push([f,t]);render();}
function onMessage(m){MSGS.push(m);if(m.f!==m.t){const e=edgeEl(ek(m.f,m.t));if(e){e.classList.add('hot');setTimeout(()=>e.classList.remove('hot'),900);}packet(m.f,m.t,KIND[m.k].c);}
  flash(m.f);if(m.f!==m.t)setTimeout(()=>flash(m.t),340);
  if(NODES[m.f])NODES[m.f]._n=(NODES[m.f]._n||0)+1;if(NODES[m.t]&&m.t!==m.f)NODES[m.t]._n=(NODES[m.t]._n||0)+1;
  addRow(MSGS.length-1,m);$('#busCount').textContent=MSGS.length+' messages';selectMsg(MSGS.length-1,false);}
function flash(id){const e=nodeEl(id);if(!e)return;e.classList.add('active');setTimeout(()=>e.classList.remove('active'),1200);}
function addRow(i,m){const r=document.createElement('div');r.className='row';r.dataset.i=i;const kc=KIND[m.k].c;
  const fl=(NODES[m.f]?NODES[m.f].label:m.f).split(' ')[0],tl=(NODES[m.t]?NODES[m.t].label:m.t).split(' ')[0];
  r.innerHTML='<span class="ts">'+String(i).padStart(2,'0')+'</span><span class="route"><span class="a">'+esc(fl)+'</span>→<span class="a">'+esc(tl)+'</span></span><span class="sum"><span class="pill" style="color:'+kc+'">'+KIND[m.k].label+'</span>'+esc(m.s)+'</span>';
  r.addEventListener('click',()=>selectMsg(i,true));$('#feed').appendChild(r);$('#feed').scrollTop=1e9;}
function selectMsg(i,scroll){SELNODE=null;const m=MSGS[i],kc=KIND[m.k].c;$('#feed').querySelectorAll('.row').forEach(r=>r.classList.toggle('sel',+r.dataset.i===i));
  for(const id in NODES)NODES[id]._sel=(id===m.f||id===m.t);render();
  $('#inspect .h').textContent='Message · '+String(i).padStart(2,'0');
  $('#insBody').innerHTML='<div class="insMeta"><span class="k">from</span><span>'+esc(NODES[m.f]?NODES[m.f].label:m.f)+'</span><span class="k">to</span><span>'+esc(NODES[m.t]?NODES[m.t].label:m.t)+'</span><span class="k">kind</span><span><span class="kind" style="color:'+kc+'">'+KIND[m.k].label+'</span></span></div><div class="insBody">'+esc(m.b)+'</div>';
  if(scroll){const r=$('#feed').querySelector('.row[data-i="'+i+'"]');r&&r.scrollIntoView({block:'nearest'});}}
function selectNode(id){SELNODE=id;for(const k in NODES)NODES[k]._sel=(k===id);render();
  const sent=MSGS.map((m,i)=>({m,i})).filter(x=>x.m.f===id&&x.m.f!==x.m.t),recv=MSGS.map((m,i)=>({m,i})).filter(x=>x.m.t===id&&x.m.f!==x.m.t);
  const list=arr=>arr.length?'<div class="miniList">'+arr.map(({m,i})=>'<button class="miniMsg" data-go="'+i+'"><span class="dot" style="background:'+KIND[m.k].c+'"></span><span class="mm">'+esc(m.s)+'<small>'+(m.f===id?'▸ to '+esc(NODES[m.t]?NODES[m.t].label:m.t):'◂ from '+esc(NODES[m.f]?NODES[m.f].label:m.f))+' · '+KIND[m.k].label+'</small></span></button>').join('')+'</div>':'<p class="insHint" style="margin:4px 0 0">none yet</p>';
  $('#inspect .h').textContent='Node · '+NODES[id].label;
  const log=(NODES[id]._log&&NODES[id]._log.length)?'<div class="h" style="margin:16px 2px 8px">Live output</div><div class="nodeLog" id="nodeLog">'+esc(NODES[id]._log.join('\\n'))+'</div>':'';
  $('#insBody').innerHTML='<div class="insMeta"><span class="k">role</span><span>'+esc(NODES[id].role||'')+'</span><span class="k">type</span><span>'+NODES[id].type+'</span><span class="k">reports to</span><span>'+(NODES[id].parent&&NODES[NODES[id].parent]?esc(NODES[NODES[id].parent].label):'—')+'</span></div><div class="h" style="margin:14px 2px 8px">Outbox · '+sent.length+'</div>'+list(sent)+'<div class="h" style="margin:16px 2px 8px">Inbox · '+recv.length+'</div>'+list(recv)+log;
  $('#insBody').querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>selectMsg(+b.dataset.go,true)));}
function setState(id,st){if(NODES[id]){NODES[id]._state=st;render();}}
let SELNODE=null;
function applyEvent(ev,d){
  if(ev==='node')NODES[d.id]=Object.assign(NODES[d.id]||{},d),render();
  else if(ev==='edge')addEdge(d.from,d.to);
  else if(ev==='message')onMessage(d);
  else if(ev==='state')setState(d.id,d.state);
  else if(ev==='cost'){const c=$('#cost');if(c)c.textContent=d.calls+' calls';}
  else if(ev==='log'){const n=NODES[d.id];if(n){n._live=d.text;(n._log=n._log||[]).push(d.text);if(n._log.length>60)n._log.shift();
    const el=nodeEl(d.id);if(el){const nr=el.querySelector('.nr');if(nr&&n._state==='running')nr.textContent=d.text;}
    if(SELNODE===d.id){const lg=$('#nodeLog');if(lg){lg.textContent=n._log.join('\\n');lg.scrollTop=1e9;}}}}
}

function reset(){if(es)es.close();replayTok++;CURRENT_RUN=null;SELNODE=null;NODES={};MSGS=[];EXTRA=[];G.innerHTML='';FX.innerHTML='';$('#feed').innerHTML='';$('#busCount').textContent='0 messages';$('#cost').textContent='0 calls';$('#stop').style.display='none';$('#inspect .h').textContent='Inspector';$('#insBody').innerHTML='<p class="insHint">Edit the directive and press <b>▶ Issue directive</b>.</p>';$('#issue').disabled=false;}
function showConfirm(){$('#ctl').style.display='none';$('#confirm').classList.add('show');}
function hideConfirm(){$('#confirm').classList.remove('show');$('#ctl').style.display='';}
$('#editToggle').addEventListener('click',()=>{editMode=!editMode;const b=$('#editToggle');b.classList.toggle('on',editMode);b.textContent=editMode?'✎ edit (isolated)':'read-only';$('#warnTxt').textContent=editMode?'🛡 edits an isolated worktree → patch · spends tokens':'⚠ spawns real Claude agents · spends tokens';});

async function launch(){hideConfirm();reset();const directive=$('#directive').value.trim();if(!directive)return;$('#issue').disabled=true;
  let res;try{res=await fetch('/api/orchestrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({directive,edit:editMode})});}
  catch(e){$('#insBody').innerHTML='<p class="insHint">control server unreachable</p>';$('#issue').disabled=false;return;}
  const {runId}=await res.json();CURRENT_RUN=runId;$('#stop').style.display='';es=new EventSource('/api/stream/'+runId);
  ['node','edge','message','state','cost','log'].forEach(ev=>es.addEventListener(ev,e=>applyEvent(ev,JSON.parse(e.data))));
  es.addEventListener('status',e=>{es.close();$('#issue').disabled=false;$('#stop').style.display='none';CURRENT_RUN=null;try{const d=JSON.parse(e.data);if(d.calls!=null)$('#cost').textContent=d.calls+' calls';}catch(_){}loadRuns();});es.onerror=()=>{};}
async function stopRun(){if(!CURRENT_RUN)return;$('#stop').disabled=true;try{await fetch('/api/kill/'+CURRENT_RUN,{method:'POST'});}catch(_){}setTimeout(()=>$('#stop').disabled=false,1500);}

async function loadRuns(){try{const r=await fetch('/api/runs');const list=await r.json();
  $('#runsMenu').innerHTML=list.length?list.map(x=>'<button class="runItem" data-run="'+x.runId+'"><div class="rd">'+esc(x.directive||x.runId)+'</div><div class="rm"><span>'+x.messages+' msgs</span><span>'+x.status+'</span>'+(x.edit?'<span class="ed">✎ edit</span>':'')+'</div></button>').join(''):'<div class="insHint" style="padding:10px">no saved runs yet</div>';
  $('#runsMenu').querySelectorAll('[data-run]').forEach(b=>b.addEventListener('click',()=>{$('#runsMenu').classList.remove('show');replay(b.dataset.run);}));}catch(_){}}
async function replay(runId){const r=await fetch('/api/runs/'+runId);const data=await r.json();reset();$('#directive').value=data.directive||'';
  const tok=++replayTok;for(const {ev,data:d} of data.events){if(tok!==replayTok)return;applyEvent(ev,d);await new Promise(z=>setTimeout(z,ev==='message'?620:90));}}

$('#issue').addEventListener('click',showConfirm);
$('#stop').addEventListener('click',stopRun);
$('#launch').addEventListener('click',launch);
$('#cancel').addEventListener('click',hideConfirm);
$('#reset').addEventListener('click',reset);
$('#runsBtn').addEventListener('click',()=>{const m=$('#runsMenu');m.classList.toggle('show');if(m.classList.contains('show'))loadRuns();});
$('#directive').addEventListener('keydown',e=>{if(e.key==='Enter')showConfirm();});
loadRuns();
</script>
</body></html>`;
}

/* ---- HTTP ------------------------------------------------------------- */
function json(res, code, o) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); }
function body(req) { return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); }); }

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, `http://localhost:${PORT}`).pathname;
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(livePage()); }
  if (p === '/replay' || p === '/sim') {  // one server serves every UI
    const file = p === '/replay' ? 'orchestrator-os.html' : 'agent-os.html';
    try { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(path.join(ROOT, 'qa-reports', file))); }
    catch (_) { res.writeHead(404); return res.end('not found'); }
  }
  if (p === '/client-core.js') {  // unit-tested pure client logic, served to the live page
    try { res.writeHead(200, { 'Content-Type': 'application/javascript' }); return res.end(fs.readFileSync(path.join(__dirname, 'orchestrator-client-core.js'))); }
    catch (_) { res.writeHead(404); return res.end('not found'); }
  }
  if (p === '/api/health') return json(res, 200, { ok: true, runs: runs.size, maxCallsPerRun: MAX_CALLS_PER_RUN, agentMaxTurns: AGENT_MAX_TURNS, claude: CLAUDE, sandbox: SANDBOX_MODE !== 'none', sandboxMode: SANDBOX_MODE });
  if (p === '/api/orchestrate' && req.method === 'POST') {
    const { directive, edit } = JSON.parse((await body(req)) || '{}');
    if (!directive) return json(res, 400, { error: 'directive required' });
    const runId = `orun_${++RUNSEQ}_${Date.now().toString(36)}`;
    runs.set(runId, { directive, events: [], clients: new Set(), status: 'running', procs: new Set(), edit: !!edit, killed: false, calls: 0 });
    evictRuns();
    orchestrate(runId, directive, !!edit);
    return json(res, 200, { runId });
  }
  if (p.startsWith('/api/kill/') && req.method === 'POST') {
    const run = runs.get(p.split('/').pop());
    if (run) {
      run.killed = true;
      run.procs.forEach(pr => { try { pr.kill('SIGTERM'); } catch (_) {} });
      // claude can ignore SIGTERM mid-tool-call — escalate to SIGKILL so spend actually stops
      setTimeout(() => run.procs.forEach(pr => { try { pr.kill('SIGKILL'); } catch (_) {} }), 2500);
    }
    return json(res, 200, { ok: !!run });
  }
  if (p === '/api/runs') {
    let idx = []; try { idx = JSON.parse(fs.readFileSync(path.join(RUNS_DIR, 'index.json'), 'utf8')); } catch (_) {}
    return json(res, 200, idx);
  }
  if (p.startsWith('/api/runs/')) {
    const id = p.split('/').pop().replace(/[^a-z0-9_]/gi, '');
    try { return json(res, 200, JSON.parse(fs.readFileSync(path.join(RUNS_DIR, id + '.json'), 'utf8'))); }
    catch (_) { return json(res, 404, { error: 'run not found' }); }
  }
  if (p.startsWith('/api/stream/')) {
    const run = runs.get(p.split('/').pop());
    if (!run) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    run.events.forEach(({ ev, data }) => res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`));
    run.clients.add(res); req.on('close', () => run.clients.delete(res));
    return;
  }
  res.writeHead(404); res.end('not found');
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.error(`\n  ✗ port ${PORT} is in use. Set ORCH_OS_PORT=<free port> and retry.\n`); process.exit(1); }
  throw e;
});
server.listen(PORT, () => {
  console.log(`\n  NU-AURA Orchestrator OS — LIVE`);
  console.log(`  ▸ http://localhost:${PORT}`);
  console.log(`  ▸ worktree-isolated edit mode · read-only sandbox · ${MAX_CALLS_PER_RUN}-call ceiling · persisted replay\n`);
});
// best-effort cleanup of any leftover worktrees on shutdown
function shutdown() { for (const r of runs.values()) { if (r.worktree) try { require('child_process').execFileSync('git', ['-C', ROOT, 'worktree', 'remove', '--force', r.worktree]); } catch (_) {} } process.exit(0); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
