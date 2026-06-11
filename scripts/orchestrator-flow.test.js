'use strict';
/* End-to-end orchestrate flow with a MOCKED claude (CLAUDE_BIN) — zero tokens.
   Proves: planning → agent spawn → agent→agent handoff → edit-mode worktree
   isolation → reviewable patch, with the main working tree left untouched and
   the cost ceiling honoured. Run: node --test scripts/ */
const test = require('node:test');
const assert = require('node:assert');
const { spawn, execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(__dirname, 'orchestrator-os-server.js');
const MOCK = path.join(__dirname, '__fixtures__', 'mock-claude.js');
const MOCK_ESCAPE = path.join(__dirname, '__fixtures__', 'mock-claude-escape.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const treeFingerprint = () => execFileSync('git', ['status', '--porcelain'], { cwd: ROOT }).toString().split('\n').sort().join('\n');

function req(port, method, p, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      resp => { let d = ''; resp.on('data', c => d += c); resp.on('end', () => res({ status: resp.statusCode, body: d })); });
    r.on('error', rej); if (data) r.write(data); r.end();
  });
}
function streamUntilDone(port, runId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const events = [];
    const r = http.get({ host: '127.0.0.1', port, path: '/api/stream/' + runId }, resp => {
      let buf = '', ev = null;
      const to = setTimeout(() => { resp.destroy(); resolve(events); }, timeoutMs);
      resp.on('data', c => {
        buf += c; let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.startsWith('event: ')) ev = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            const d = JSON.parse(line.slice(6));
            events.push({ ev, data: d });
            if (ev === 'status') { clearTimeout(to); resp.destroy(); resolve(events); }
          }
        }
      });
      resp.on('error', () => {});
    });
    r.on('error', reject);
  });
}

test('orchestrate (mocked): plan→agents→handoff→edit→patch, tree untouched, ceiling honoured', async () => {
  const port = 8802;
  const srv = spawn('node', [SERVER], { env: { ...process.env, ORCH_OS_PORT: String(port), CLAUDE_BIN: MOCK }, stdio: 'ignore' });
  let runId = null;
  try {
    let up = false;
    for (let i = 0; i < 50; i++) { try { if ((await req(port, 'GET', '/api/health')).status === 200) { up = true; break; } } catch (_) {} await sleep(120); }
    assert.ok(up, 'server did not boot');

    const before = treeFingerprint();

    const r = await req(port, 'POST', '/api/orchestrate', { directive: 'Mock readiness check', edit: true });
    runId = JSON.parse(r.body).runId;
    assert.ok(runId, 'got a runId');

    const events = await streamUntilDone(port, runId);
    const kinds = ev => events.filter(e => e.ev === ev);

    // structure: principal + lead + orchestrator + 2 agents all created
    const nodeIds = kinds('node').map(e => e.data.id);
    ['you', 'lead', 'qa', 'scan', 'synth'].forEach(id => assert.ok(nodeIds.includes(id), `node ${id} created`));

    // agent → agent handoff happened (edge + handoff message), scan → synth
    assert.ok(kinds('edge').some(e => e.data.from === 'scan' && e.data.to === 'synth'), 'handoff edge drawn');
    assert.ok(kinds('message').some(e => e.data.k === 'handoff' && e.data.f === 'scan' && e.data.t === 'synth'), 'handoff message carries content');

    // verdict delivered to You, run finished
    assert.ok(kinds('message').some(e => e.data.k === 'verdict' && e.data.t === 'you'), 'verdict returned to principal');
    assert.equal(kinds('status').pop().data.status, 'done', 'run completed');

    // cost was counted and stayed under the ceiling
    const calls = kinds('cost').pop().data.calls;
    assert.ok(calls > 0 && calls <= 24, `cost counted and under ceiling (${calls})`);

    // EDIT MODE: a reviewable patch exists and the MAIN tree is byte-identical
    const patch = path.join(ROOT, 'qa-reports', 'runs', runId + '.patch');
    assert.ok(fs.existsSync(patch), 'reviewable patch produced');
    assert.ok(fs.readFileSync(patch, 'utf8').includes('MOCK_AGENT_EDIT.txt'), 'patch captures the agent edit');
    assert.equal(treeFingerprint(), before, 'main working tree untouched by edit-mode agents');

    // the cross-platform guard verified isolation and reported it
    assert.ok(kinds('message').some(e => /isolation verified/i.test(e.data.s)), 'server confirms main tree unchanged');

    // no worktree leaked
    const wt = execFileSync('git', ['worktree', 'list'], { cwd: ROOT }).toString();
    assert.ok(!wt.includes('orch-os-wt'), 'worktree cleaned up');
  } finally {
    srv.kill('SIGKILL');
    if (runId) { try { fs.unlinkSync(path.join(ROOT, 'qa-reports', 'runs', runId + '.patch')); } catch (_) {} try { fs.unlinkSync(path.join(ROOT, 'qa-reports', 'runs', runId + '.json')); } catch (_) {} }
  }
});

test('adversarial: an agent trying to escape the worktree CANNOT write the repo', async () => {
  // macOS only — the hard guarantee is sandbox-exec. Elsewhere, skip (worktree-only isolation).
  if (process.platform !== 'darwin') return;
  const port = 8803;
  const srv = spawn('node', [SERVER], { env: { ...process.env, ORCH_OS_PORT: String(port), CLAUDE_BIN: MOCK_ESCAPE }, stdio: 'ignore' });
  let runId = null;
  const probe = path.join(ROOT, 'ESCAPE_PROBE.txt');
  try {
    let up = false;
    for (let i = 0; i < 50; i++) { try { const h = await req(port, 'GET', '/api/health'); if (h.status === 200) { up = true; assert.equal(JSON.parse(h.body).sandbox, true, 'sandbox active'); break; } } catch (_) {} await sleep(120); }
    assert.ok(up, 'server did not boot');
    try { fs.unlinkSync(probe); } catch (_) {}
    const before = treeFingerprint();

    runId = JSON.parse((await req(port, 'POST', '/api/orchestrate', { directive: 'rogue edit', edit: true })).body).runId;
    await streamUntilDone(port, runId);

    assert.ok(!fs.existsSync(probe), 'sandbox BLOCKED the escape — no file written to the repo');
    assert.equal(treeFingerprint(), before, 'main working tree untouched despite an escaping agent');
  } finally {
    srv.kill('SIGKILL');
    try { fs.unlinkSync(probe); } catch (_) {}
    if (runId) { try { fs.unlinkSync(path.join(ROOT, 'qa-reports', 'runs', runId + '.patch')); } catch (_) {} try { fs.unlinkSync(path.join(ROOT, 'qa-reports', 'runs', runId + '.json')); } catch (_) {} }
  }
});

function dockerReady() { try { execFileSync('docker', ['info'], { stdio: 'ignore' }); return true; } catch (_) { return false; } }

test('docker containment: a containerized agent can write /work but CANNOT touch the host repo', () => {
  if (!dockerReady()) { return; } // skip where docker is unavailable
  const probe = path.join(ROOT, 'DOCKER_ESCAPE_PROBE.txt');
  try { fs.unlinkSync(probe); } catch (_) {}
  const before = treeFingerprint();
  // Docker Desktop on macOS only bind-shares /Users by default; on Linux /tmp is fine.
  const tmpBase = process.platform === 'darwin' ? os.homedir() : os.tmpdir();
  const work = fs.mkdtempSync(path.join(tmpBase, '.orch-docker-'));
  try {
    // The exact isolation the server's docker mode uses: mount ONLY the worktree.
    // The container then plays a rogue agent — write the mount (allowed) and try to
    // escape to the host repo's absolute path (impossible: it isn't mounted).
    execFileSync('docker', ['run', '--rm', '-v', `${work}:/work`, '-w', '/work', 'alpine:3.20',
      'sh', '-c', `echo edit > /work/edit.txt; echo breach > '${probe}' 2>/dev/null || true; echo breach > '${ROOT}/X.txt' 2>/dev/null || true`]);
    assert.ok(fs.existsSync(path.join(work, 'edit.txt')), 'container wrote its mounted worktree');
    assert.ok(!fs.existsSync(probe), 'host repo file NOT created — the repo is unreachable from the container');
    assert.ok(!fs.existsSync(path.join(ROOT, 'X.txt')), 'no escape file in repo');
    assert.equal(treeFingerprint(), before, 'host working tree byte-identical after a containerized run');
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
    try { fs.unlinkSync(probe); } catch (_) {}
    try { fs.unlinkSync(path.join(ROOT, 'X.txt')); } catch (_) {}
  }
});
