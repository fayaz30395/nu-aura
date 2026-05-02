#!/usr/bin/env npx tsx
/**
 * NU-AURA — Full Platform Screenshot Capture
 * Logs in as TENANT_ADMIN and captures all 261 pages to docs/screenshots/
 */
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8080';
const OUT_DIR = path.resolve(__dirname, '../../docs/screenshots/qa-sweep-2026-05-02');
const YAML_PATH = path.resolve(__dirname, '../../docs/qa/use-cases.v2.yaml');

const ROLES = [
  { code: 'TENANT_ADMIN', email: 'admin@nuaura.dev' },
  { code: 'EMPLOYEE',     email: 'employee@nuaura.dev' },
];

const PASSWORD = 'Welcome@123';
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Pages to skip (require special state or external deps)
const SKIP_PATTERNS = [
  '/auth/', '/api/', '/_next/', '/reset-password', '/verify-email',
];

async function login(page: Page, email: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, tenantId: TENANT_ID }),
    });
    const data = await res.json() as Record<string, unknown>;
    const token = (data.token || (data.data as Record<string,unknown>)?.token || data.accessToken) as string | undefined;
    if (!token) return false;
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate((t) => {
      document.cookie = `nu_aura_token=${t}; path=/; max-age=86400`;
      localStorage.setItem('nu_aura_token', t);
    }, token);
    return true;
  } catch { return false; }
}

async function screenshot(page: Page, route: string, label: string, outDir: string): Promise<string | null> {
  const url = `${BASE_URL}${route}`;
  const slug = route.replace(/\//g, '_').replace(/^_/, '').replace(/[^a-z0-9_-]/gi, '-') || 'root';
  const file = path.join(outDir, `${label}__${slug}.png`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    // Wait for skeleton loaders to resolve
    await page.waitForTimeout(1500);
    await page.screenshot({ path: file, fullPage: false });
    return file;
  } catch (e) {
    // Try with domcontentloaded
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: file, fullPage: false });
      return file;
    } catch { return null; }
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Load routes from YAML
  const yamlData = yaml.load(fs.readFileSync(YAML_PATH, 'utf8')) as {
    routes: Array<{ path: string; module: string; priority: string }>;
  };
  const allRoutes = yamlData.routes
    .map(r => r.path as string)
    .filter(p => p && !p.startsWith('/api/') && !SKIP_PATTERNS.some(s => p.startsWith(s)));

  // Sort P0 first (auth_core, dashboard)
  const priority0 = ['/me/dashboard', '/auth/login', '/employees', '/attendance', '/leave'];
  const others = allRoutes.filter(r => !priority0.includes(r));
  const routes = [...priority0.filter(r => allRoutes.includes(r)), ...others];

  console.log(`Capturing ${routes.length} pages to ${OUT_DIR}`);

  const browser: Browser = await chromium.launch({ headless: true });
  const results: { route: string; role: string; file: string | null }[] = [];

  for (const role of ROLES) {
    const roleDir = path.join(OUT_DIR, role.code.toLowerCase());
    fs.mkdirSync(roleDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    console.log(`\n[${role.code}] Logging in as ${role.email}...`);
    const loggedIn = await login(page, role.email);
    if (!loggedIn) {
      console.log(`  ✗ Login failed for ${role.code}, skipping`);
      await context.close();
      continue;
    }
    console.log(`  ✓ Logged in`);

    let captured = 0, failed = 0;
    for (const route of routes) {
      const file = await screenshot(page, route, role.code, roleDir);
      results.push({ route, role: role.code, file });
      if (file) {
        captured++;
        if (captured % 20 === 0) console.log(`  [${role.code}] ${captured}/${routes.length} captured`);
      } else {
        failed++;
      }
    }
    console.log(`  ✓ ${captured} captured, ${failed} failed`);
    await context.close();
  }

  await browser.close();

  // Write index
  const indexPath = path.join(OUT_DIR, 'index.md');
  const lines = [
    `# NU-AURA Screenshot Index — ${new Date().toISOString().split('T')[0]}`,
    `Generated: ${new Date().toISOString()}`,
    `Total: ${results.filter(r => r.file).length}/${results.length}`,
    '',
  ];
  for (const role of ROLES) {
    lines.push(`## ${role.code}`);
    const roleResults = results.filter(r => r.role === role.code && r.file);
    for (const r of roleResults) {
      const rel = path.relative(OUT_DIR, r.file!);
      lines.push(`- [${r.route}](${rel})`);
    }
    lines.push('');
  }
  fs.writeFileSync(indexPath, lines.join('\n'));
  console.log(`\nIndex: ${indexPath}`);
  console.log(`Done. ${results.filter(r => r.file).length} screenshots saved to ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
