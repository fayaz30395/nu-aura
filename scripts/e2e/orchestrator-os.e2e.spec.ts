import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';

const SCRIPTS = path.resolve(__dirname, '..');
const ROOT = path.resolve(SCRIPTS, '..');
const SERVER = path.join(SCRIPTS, 'orchestrator-os-server.js');
const MOCK = path.join(SCRIPTS, '__fixtures__', 'mock-claude.js');   // no tokens
const PORT = 8807;
const DIRECTIVE = 'E2E browser smoke directive';
let srv: ChildProcess;

function waitHealthy(port: number) {
  return new Promise<void>((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      http.get({ host: '127.0.0.1', port, path: '/api/health' }, r => { r.statusCode === 200 ? resolve() : retry(); }).on('error', retry);
    };
    const retry = () => { Date.now() - t0 > 15000 ? reject(new Error('server health timeout')) : setTimeout(tick, 200); };
    tick();
  });
}

test.beforeAll(async () => {
  srv = spawn('node', [SERVER], { env: { ...process.env, ORCH_OS_PORT: String(PORT), CLAUDE_BIN: MOCK }, stdio: 'ignore' });
  await waitHealthy(PORT);
});

test.afterAll(() => {
  srv?.kill('SIGKILL');
  // clean E2E run transcripts
  try {
    for (const f of fs.readdirSync(path.join(ROOT, 'qa-reports', 'runs'))) {
      if (!f.endsWith('.json')) continue;
      try { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa-reports', 'runs', f), 'utf8')); if (d.directive === DIRECTIVE) fs.unlinkSync(path.join(ROOT, 'qa-reports', 'runs', f)); } catch {}
    }
  } catch {}
});

test('live orchestration in the browser: directive → graph builds → verdict, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`http://localhost:${PORT}/`);
  await expect(page.locator('.brand b')).toContainText('ORCHESTRATOR');

  await page.fill('#directive', DIRECTIVE);
  await page.click('#issue');
  await expect(page.locator('#confirm')).toHaveClass(/show/);
  await page.click('#launch');

  // the delegation graph builds (mock planner → qa orchestrator → scan/synth agents)
  await expect(page.locator('[data-node="you"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-node="lead"]')).toBeVisible();
  await expect(page.locator('[data-node="scan"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-node="synth"]')).toBeVisible();

  // message bus populates and a verdict is delivered to You
  await expect(page.locator('#feed .row').first()).toBeVisible();
  await expect(page.locator('#feed .row .pill', { hasText: 'verdict' })).toBeVisible({ timeout: 30_000 });

  // clicking a message shows its full content in the inspector
  await page.locator('#feed .row').first().click();
  await expect(page.locator('#insBody .insBody')).toBeVisible();

  // run finishes — Issue re-enabled
  await expect(page.locator('#issue')).toBeEnabled({ timeout: 30_000 });

  expect(errors, 'no browser console errors during a live run').toEqual([]);
});
