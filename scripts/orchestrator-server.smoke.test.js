'use strict';
/* Server smoke test — boots the real server on a throwaway port and checks
   the no-LLM endpoints. No tokens spent. Run: node --test scripts/ */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function get(port, p) {
  return new Promise((res, rej) => {
    const req = http.get({ host: '127.0.0.1', port, path: p }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d }));
    });
    req.on('error', rej);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('server boots and serves health, runs, and the live page', async () => {
  const port = 8799;
  const srv = spawn('node', [path.join(__dirname, 'orchestrator-os-server.js')],
    { env: { ...process.env, ORCH_OS_PORT: String(port) }, stdio: 'ignore' });
  try {
    let healthy = false;
    for (let i = 0; i < 50; i++) {
      try { const h = await get(port, '/api/health'); if (h.status === 200) { healthy = true; break; } } catch (_) {}
      await sleep(120);
    }
    assert.ok(healthy, 'server never became healthy');

    const h = JSON.parse((await get(port, '/api/health')).body);
    assert.equal(h.ok, true);
    assert.ok(h.maxCallsPerRun > 0, 'cost ceiling exposed');
    assert.ok(h.agentMaxTurns > 0, 'turn cap exposed');

    const runs = await get(port, '/api/runs');
    assert.equal(runs.status, 200);
    assert.ok(Array.isArray(JSON.parse(runs.body)), '/api/runs returns an array');

    const root = await get(port, '/');
    assert.equal(root.status, 200);
    assert.ok(root.body.includes('ORCHESTRATOR') && root.body.includes('Message bus'), 'live page renders the app shell');

    const missing = await get(port, '/api/runs/does_not_exist');
    assert.equal(missing.status, 404, 'unknown run is 404');
  } finally {
    srv.kill('SIGKILL');
  }
});
