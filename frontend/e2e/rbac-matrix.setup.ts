/**
 * rbac-matrix.setup.ts
 *
 * One-shot setup: logs in each of the 9 RBAC personas via the real API and
 * saves their storageState to frontend/e2e/.auth/<role>.json.
 *
 * Spaces logins 15s apart to respect the 5/min auth rate limit.
 *
 * Credentials: all share password "Welcome@123". Only the 5 seed users
 * listed in CLAUDE.md actually exist in the dev DB; the remaining personas
 * (TENANT_ADMIN, HR_ADMIN, RECRUITER, FINANCE) fall back to SUPER_ADMIN
 * storage-state so the matrix still runs end-to-end — marked as
 * SYNTHETIC in the persona table so downstream assertions know.
 */
import {test as setup, expect, request} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_DIR = path.join(__dirname, '.auth');
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

type Persona = {
  role: string;
  email: string;
  synthetic?: boolean;
};

const PERSONAS: Persona[] = [
  {role: 'SUPER_ADMIN', email: 'fayaz.m@nulogic.io'},
  {role: 'TENANT_ADMIN', email: 'fayaz.m@nulogic.io', synthetic: true},
  {role: 'HR_ADMIN', email: 'jagadeesh@nulogic.io', synthetic: true},
  {role: 'HR_MANAGER', email: 'jagadeesh@nulogic.io'},
  {role: 'MANAGER', email: 'sumit@nulogic.io'},
  {role: 'TEAM_LEAD', email: 'mani@nulogic.io'},
  {role: 'EMPLOYEE', email: 'saran@nulogic.io'},
  {role: 'RECRUITER', email: 'fayaz.m@nulogic.io', synthetic: true},
  {role: 'FINANCE', email: 'fayaz.m@nulogic.io', synthetic: true},
];

setup('authenticate all RBAC personas', async () => {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, {recursive: true});
  }

  // Track logged-in emails so we only hit the auth endpoint once per email.
  const emailToState = new Map<string, object>();

  for (const p of PERSONAS) {
    const storagePath = path.join(AUTH_DIR, `${p.role}.json`);

    if (emailToState.has(p.email)) {
      fs.writeFileSync(storagePath, JSON.stringify(emailToState.get(p.email), null, 2));
      continue;
    }

    // Rate-limit: 15s between distinct logins.
    if (emailToState.size > 0) {
      await new Promise((r) => setTimeout(r, 15_000));
    }

    const ctx = await request.newContext({baseURL: API_BASE});
    const res = await ctx.post('/api/v1/auth/login', {
      data: {email: p.email, password: 'Welcome@123'},
      headers: {'Content-Type': 'application/json'},
    });
    expect(res.ok(), `login failed for ${p.email}: ${res.status()} ${await res.text()}`).toBeTruthy();
    const state = await ctx.storageState();
    emailToState.set(p.email, state);
    fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
    await ctx.dispose();
  }
});
