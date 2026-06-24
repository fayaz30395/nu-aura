# QA Run Progress — 2026-06-25

**Run folder**: docs/qa/ui-e2e-run-2026-06-25/
**Backend**: UP ({"status":"UP"})
**Last prior gate**: 92/100 GO (2026-06-24 evening)
**Ponytail refactor since last gate**: commit 1b132cef (-1438 lines, 19 files — animation barrel, perf barrel, 5 radix-ui deps)
**Discovered routes**: 290 (from `find frontend/app -name "page.tsx"`)

---

## Iteration 1 — 2026-06-25

Score at start: 92 (prior run)
Routes tested: 0 / 290
Use Cases covered: 0 / 42 critical

### Phase A — Preflight

| Check | Result |
|-------|--------|
| Backend health | ✓ UP |
| Frontend landing | ✓ Loads (Sign In page) |
| TypeScript build | ✓ CLEAN (0 errors) |
| Last Vercel deploy | Active (hrms-frontend-vert.vercel.app) |

---

### Phase B — Auth sweep (in progress)

| Account | Role confirmed | Status | Notes |
|---------|---------------|--------|-------|
| arun@nulogic.io | EMPLOYEE | ✓ PASS | Dashboard /me/dashboard loads, leave widget 7 types |
| anshuman@nulogic.io | EMPLOYEE | PENDING | |
| sumit@nulogic.io | MANAGER | PENDING | |
| mani@nulogic.io | TEAM LEAD | PENDING | |
| gokul@nulogic.io | TEAM LEAD | PENDING | |
| dhanush@nulogic.io | — | PENDING | |
| jagadeesh@nulogic.io | HR MANAGER | PENDING | |
| suresh@nulogic.io | RECRUITMENT ADMIN | PENDING | |
| saran@nulogic.io | HR ADMIN (seen as "SV Saran V") | PENDING | |
| raj@nulogic.io | — | PENDING | not in demo panel |
| finance@nulogic.io | FINANCE ADMIN | PENDING | |
| tenant.admin@nulogic.io | TENANT ADMIN | PENDING | |
| admin@nulogic.io | ADMIN | PENDING | was SUSPENDED in prior gate |

---

### Route Coverage (running tally)

| Route | Role | Status | Notes |
|-------|------|--------|-------|
| /auth/login | — | PASS | Login form, demo panel, SSO buttons |
| /me/dashboard | EMPLOYEE | PASS | Dashboard loads, leave balance, company feed, clock-in |

