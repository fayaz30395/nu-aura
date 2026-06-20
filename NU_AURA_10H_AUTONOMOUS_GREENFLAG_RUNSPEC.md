# NU-AURA — 10-Hour Autonomous Green-Flag Run Spec

> **How to use:** Open this repo in **Claude Code** and paste the launch command at the
> bottom. This spec is the single source of truth for the run. The agent maintains
> `ISSUE_BOARD.md` and `GREEN_FLAG_REPORT.md` as it goes.

---

## PRIMARY RULE (overrides everything below on conflict)

```
CODE FOR ROOT CAUSE.
BROWSER FOR TRUTH.
Repository determines WHY something is broken.
Vercel + Railway determine WHETHER it is actually fixed.
```

Operational meaning:
- **Never** diagnose a defect from the browser alone — once reproduced in the browser,
  drop into the **repo** to find the real root cause (file:line), and fix it there.
- **Never** trust a code fix as "done" — a fix is only closed once the **live deployed
  app** (Vercel frontend + Railway backend) proves it green in a real browser session.
- Localhost is for root-cause debugging only. **Final validation is always against the
  live deployed URLs.**

---

## Target (LIVE — validate here every iteration)

- Frontend: `https://hrms-frontend-vert.vercel.app`
- Backend:  `https://nu-aura-backend-production.up.railway.app`
- Repo (root cause + fixes): `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura`
- Stack (locked): Next.js 16 + React 19 + Mantine 9 + TanStack Query v5 + RHF/Zod (FE);
  Spring Boot 3.5 + Java 21 + PostgreSQL RLS + Redis + Kafka + Elasticsearch (BE).
- Railway is free-tier → expect ~30s cold start on first hit; warm before asserting failure.

## Accounts & data policy (per owner decision)

- **Use the one-click demo accounts** on the live login screen as test identities only.
- **Create additional test accounts yourself** if a role/scenario is missing — clearly
  named (e.g. `qa.manager.<ts>@test`), tagged as test data.
- **Full CRUD is authorized on the live app** via these demo/test identities. Clean up
  obvious junk where feasible; never touch records that look like genuine customer data.
- SuperAdmin bypasses ALL permission checks — that is **by design**, never a bug.

## Deploy policy (per owner decision)

- **Auto-deploy each fix batch** to Vercel/Railway as fixes land (no manual review gate).
- **Guardrails (mandatory):**
  - Before deploy: `cd frontend && npx tsc --noEmit` clean AND backend build clean.
  - After each deploy: run a **smoke gate** (login as SuperAdmin + Employee + load 3 core
    routes on the live URL). If the smoke gate fails → **halt deploys, mark the batch
    rolled-back, log a CRITICAL, and continue testing only** until a fix restores green.
  - Keep a one-line **kill-switch note** in `ISSUE_BOARD.md` so a bad batch can't cascade.

---

## Time budget — 10h, looped (do not stop early; do not ask for approval mid-run)

| Window | Phase | Work |
|--------|-------|------|
| 0:00–0:30 | **Setup/Discovery** | Resume `ISSUE_BOARD.md`. Warm + open live site in Chrome. Discover routes/roles/permissions **from code first**, confirm in browser. Build coverage matrix. |
| 0:30–4:00 | **Wave 1 — breadth sweep** | Per-role parallel browser sweep (shard via `nu-chrome-super-e2e`): every route × every role, RBAC visibility, forms, empty/loading/error/permission-denied states, console+network. Log every defect. |
| 4:00–7:00 | **Wave 2 — root-cause & fix** | For each defect: reproduce in browser → find root cause in **repo (file:line)** → fix per locked stack → tsc/maven clean → **deploy** → smoke gate → re-test live. |
| 7:00–9:00 | **Wave 3 — lifecycle + regression** | Full CRUD per module + journeys (hire-to-retire, leave approval, payroll, expense, asset, perf review) via `nu-aura-e2e-lifecycle`. Re-run every prior failure for regressions. Loop W2↔W3 until board clear of fixables. |
| 9:00–9:45 | **Final verification** | Clean full-matrix re-run **on the live URL** for evidence. |
| 9:45–10:00 | **Report** | Write `GREEN_FLAG_REPORT.md` with GO/NO-GO verdict. |

## The loop (every iteration)

1. **PLAN** — list cases not yet verified-green this pass.
2. **EXECUTE (browser = truth)** — parallel agents drive Chrome on the **live URL**;
   capture screenshot + console + network per case.
3. **TRIAGE** — every defect → `ISSUE_BOARD.md`: `| ID | Severity | Module | Description | Impact | Exact Fix | Owner | Status |`.
4. **ROOT CAUSE (code = why)** — reproduce, then locate the cause in the repo as `file:line`.
5. **FIX** — smallest correct change; locked stack only (React Query / RHF+Zod / existing
   Axios in `frontend/lib/` / no `any`); work on `main`.
6. **VERIFY-BUILD** — `npx tsc --noEmit` + backend build clean.
7. **DEPLOY** — push the batch to Vercel/Railway → **smoke gate** → on fail, halt+rollback.
8. **RE-TEST (browser = truth)** — confirm the fix on the **live deployed app**; check regressions.
9. **REPEAT** until zero open fixable defects.

Post a status line each iteration: `green / red / fixed-this-pass / deployed / unfixable-logged`.

## Coverage — 100% of

- **Roles:** SuperAdmin, TenantAdmin, HR, Manager, Employee + every other role in
  `docs/obsidian/05-RBAC` / `04_RBAC_PERMISSION_MATRIX`. Each role = a **fresh login from
  clean browser state**; never infer one role's behavior from another.
- **Pages:** every route, happy path AND edge/failure (empty, invalid input, permission
  denied, expired session, concurrent edit, boundary values, direct-URL, back/forward/refresh).
- **CRUD:** create/read/update/delete per module + cross-module data flow + tenant isolation.
- **Lifecycles:** hire-to-retire, leave escalation, payroll cycle, performance review,
  expense reimbursement, asset lifecycle.
- **RBAC & tenant isolation** are first-class release blockers.
- **Security:** authN/Z, input validation, data exposure, secrets, session, rate limits,
  injection, OWASP — API-level AND UI-level abuse.

## Evidence rule

A case is **pass** only with a screenshot/log proving it on the **live URL**. A fix is
**closed** only with a post-deploy re-test proving it live. No assumptions, ever.

---

## EXPECTED RESULT — deliverable at 10:00 (`GREEN_FLAG_REPORT.md`)

1. **VERDICT** — `GO` or `NO-GO`, one line at the top.
2. **PRODUCTION READINESS SCORE** — 0–100 with the rubric used.
3. **SCORECARD TABLE** — per module: `Module | Pages | Cases | Pass | Fail | RBAC OK? | Status 🟢/🟡/🔴`.
4. **ROLE × MODULE MATRIX** — pass/fail per cell; confirms SuperAdmin never blocked, every
   other role correctly scoped.
5. **LIFECYCLE RESULTS** — pass/fail for each journey with the data trail.
6. **DEFECTS FIXED** — `file:line`, root cause, change made, **deploy id/commit**, live re-test evidence.
7. **DEFECTS REMAINING** — only genuinely unfixable items: severity, repro, why-unfixable, what unblocks it.
8. **SECURITY / RBAC STATUS** — explicit, incl. demo-credentials state on the deployed env.
9. **EVIDENCE INDEX** — paths to screenshots + logs per case.
10. **METRICS** — cases run, % pass, P0/P1/P2 found vs fixed, # deploys, smoke-gate results, tsc/build status, time per phase.
11. **DEPLOY LOG** — each batch: what shipped, deploy result, smoke-gate outcome.
12. **NEXT ACTIONS** — ranked, if NO-GO.

## Definition of Done (GO requires ALL true, each with live evidence)

- [ ] Every page loads + functions for every role on the **live URL**, zero console/network errors.
- [ ] Every CRUD + all lifecycle journeys pass live.
- [ ] RBAC + tenant isolation enforced; SuperAdmin bypass intact and verified.
- [ ] Zero open CRITICAL/HIGH; MEDIUM/LOW fixed or explicitly accepted with justification.
- [ ] `npx tsc --noEmit` + backend build clean; last deploy passed its smoke gate.
- [ ] Demo credentials state on deployed env documented (and ideally disabled — see SEC-3b).
- [ ] Final full-matrix verification pass is green on the live URL.

**If the 10h budget ends before all-green:** deliver the report marked **NO-GO**, splitting
remaining items into "still fixable, ran out of time" vs "genuinely unfixable", with a
ranked fix plan. **Never fabricate a green result.**

## Known carry-over from last run (2026-06-15, NO-GO 86/100 — verify/close these first)

- **SEC-3b (CRITICAL):** deployed backend may run `DEMO_CREDENTIALS_ENABLED=true` → public
  SuperAdmin takeover. **User action** in Railway env; verify V270/V272 lockdown re-runs.
- **SEC-4 (HIGH):** live Groq API key in `backend/.env` → rotate at console.groq.com.
- **DEV-7 / UI-03 (HIGH):** Railway cold-start login failures + leave-approval notification
  delivery — re-verify on warm deploy.

---

## LAUNCH COMMAND (paste into Claude Code at the repo root)

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
claude "/nu-prod-green-flag — Execute NU_AURA_10H_AUTONOMOUS_GREENFLAG_RUNSPEC.md as the \
operating spec. Run the full 10-hour autonomous campaign against the LIVE app \
(https://hrms-frontend-vert.vercel.app + Railway backend). PRIMARY RULE: code for root \
cause, browser for truth. Use demo accounts only; create extra test accounts as needed; \
full CRUD authorized on live demo/test data. Auto-deploy each fix batch with the tsc/build \
+ smoke-gate guardrails. Loop until all-green or budget spent, then write GREEN_FLAG_REPORT.md \
with an explicit GO/NO-GO verdict. Do not pause for approval mid-run."
```
