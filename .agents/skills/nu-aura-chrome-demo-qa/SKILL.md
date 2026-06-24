---
name: "nu-aura-chrome-demo-qa"
description: "Use when asked to test NU-AURA from Chrome using demo accounts, verify all 286 routes + 100% critical use cases across 4 sub-apps and all roles, autonomously fix/deploy/re-verify every defect found, and loop until the app scores 95+ with zero CRITICAL/HIGH open — producing a release-gate verdict. Drives real Chrome against the deployed Vercel app; goal-driven loop, not time-bounded. Starts with code-discovery phase (Phase 0) to generate route inventory, RBAC matrix, and feature map before browser testing begins."
---

# NU-AURA Chrome Demo QA — Autonomous Goal Loop

This skill drives a **goal-driven, multi-iteration autonomous loop** that tests, fixes, deploys, and
re-verifies the NU-AURA Vercel application until it scores 95+ with zero CRITICAL/HIGH findings open.
It uses real Chrome against the live deployed surface — not localhost, not mocks.

---

## North-Star Goal

> **100% solid application**: every demo-account login works, every permitted route renders without
> error, every **critical use case** completes end-to-end (not just renders), every write-path flow
> succeeds, RBAC is fail-closed for all 13 roles, performance is within gate thresholds, zero
> CRITICAL or HIGH defects remain open — proven by screenshots, console evidence, network evidence,
> and live Vercel re-checks across all 286 routes, 4 sub-apps, 13 demo roles, and all NU-AURA
> business-critical flows.

**Done condition (any of):**

- Score ≥ 95 AND zero CRITICAL/HIGH open AND all critical UCs at 100% AND final `RELEASE-GATE.md`
  shows GO → **STOP: success.**
- Hard stop condition hit (see Stop Conditions) → **STOP: write partial verdict.**
- Stagnation stop hit (see Stop Conditions) → **STOP: write partial verdict.**

> **Coverage targets:**
>
> - Critical Use Cases: **100%**
> - RBAC matrix cells: **100%**
> - High-traffic / business-critical routes: **100%**
> - Remaining routes: **80%**
> - Business-critical write-path flows: **100%**

---

## When to Use

- "Test from Chrome using the deployed demo accounts"
- "Run completely autonomous until the app is solid"
- "Check all use cases and features in Vercel"
- "Fix everything found, deploy and test again"
- "Mark what's needed for final release"
- "Loop until 100% solid"
- "Run live browser QA for NU-AURA"
- "Verify RBAC / use-case coverage with demo users"
- "Create USE-CASES.md / COVERAGE.md / VERDICT.md / RELEASE-GATE.md from Chrome testing"

**This skill does NOT:**

- Generate Playwright `.spec.ts` files — use `source-command-skills-nu-e2e-skill` for that.
- Use localhost, mocks, API stubs, or synthetic assertions.
- Mutate shared data except disposable `ZZ QA <yyyy-mm-dd>` records created during the run.
- Make broad refactors, redesigns, or speculative fixes not reproduced in Chrome.
- Use owner, personal, non-demo, seeded SUPER_ADMIN, or remembered browser-profile accounts.

---

## Targets

| Target | URL |
| ------ | --- |
| Frontend (Vercel) | `https://hrms-frontend-vert.vercel.app` |
| Backend health | `https://nu-aura-backend-production.up.railway.app/actuator/health` |
| Browser | Chrome only — clean incognito or cleared profile |

---

## Demo Account Invariant (Hard Rule)

Always use the deployed demo accounts below. Never use `fayaz.m@nulogic.io` or
`sarankarthick.maran@nulogic.io` on the deployed environment.

| Email | Expected role |
|-------|--------------|
| `arun@nulogic.io` | Employee baseline |
| `anshuman@nulogic.io` | Employee |
| `sumit@nulogic.io` | Manager, approvals |
| `mani@nulogic.io` | Team Lead |
| `gokul@nulogic.io` | Team Lead |
| `dhanush@nulogic.io` | Team Lead HR |
| `jagadeesh@nulogic.io` | HR Manager |
| `suresh@nulogic.io` | Recruitment Admin |
| `saran@nulogic.io` | Verify actual role live |
| `raj@nulogic.io` | Verify actual role live |
| `finance@nulogic.io` | Finance Admin, if login works |
| `tenant.admin@nulogic.io` | Tenant Admin, if login works |
| `admin@nulogic.io` | Admin, if login works |

Password for all accounts: `Welcome@123`

**Rules:**

- Verify the actual displayed role after every login — do not assume from the label.
- Clear cookies, `localStorage`, and `sessionStorage` before each role switch.
- If an account fails login, mark that row BLOCKED with screenshot + console + network evidence.
- Never preserve or reuse a previous Chrome session.
- If no demo account reaches a required surface, mark it BLOCKED/UNTESTED with evidence — do not
  bypass the rule with a non-demo account.
- Stop immediately if Chrome lands in an owner/SUPER_ADMIN session unexpectedly.

---

## Required Sources (read before testing, every iteration)

1. `AGENTS.md`
2. `CLAUDE.md`
3. `MEMORY.md` — current QA/deploy state
4. `tools/PROCESS-RULES.md`
5. `tools/CONSTRAINT.md`
6. `docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md`
7. `docs/obsidian/03-Frontend/Route-Map-Full.md` — 286 routes
8. `docs/obsidian/05-RBAC/` — role permission matrix
9. `frontend/e2e/fixtures/testData.ts`
10. For fixes: `docs/obsidian/01-Architecture/Code-Patterns.md` + relevant module note
11. For auth/RBAC/security fixes: `docs/obsidian/08-Security/Security-Audit.md` + `docs/obsidian/11-Decisions/ADR-005.md`

---

## Run Folder Structure

Create one dated run folder at session start. Iterations live inside it:

```text
docs/qa/ui-e2e-run-<yyyy-mm-dd>/
├── ROUTE-INVENTORY.md    # All discovered routes with source, permission, module, nav visibility
├── RBAC-MATRIX.md        # Role × permission matrix generated from code, verified in browser
├── FEATURE-MAP.md        # Module → feature flag → use-case mapping from codebase scan
├── USE-CASES.md          # Full ledger: UC id, module, role, steps, expected, actual, status, evidence
├── COVERAGE.md           # Role × module × flow matrix — PASS/FAIL/BLOCKED/SKIPPED/TODO/UNTESTED
├── FINDINGS.md           # Bugs: severity, root cause, affected modules, repro, fix, regression coverage
├── PROGRESS.md           # Timestamped log: account, route, result, coverage count, iter notes
├── ROLLBACK.md           # Per-deploy: commit SHA, deploy ID, rollback command (updated each deploy)
├── VERDICT.md            # Score, coverage %, risk register, blocker list, residual risk, iteration history
├── RELEASE-GATE.md       # Binary GO / NO-GO per gate item; final release readiness assessment
├── iter-1/
│   ├── FINDINGS-DELTA.md     # New findings this iteration only
│   ├── FIXES-APPLIED.md      # Diffs, commit SHAs, deploy IDs, root causes applied this iteration
│   ├── REGRESSION-RESULTS.md # Regression pack results after every deploy in this iteration
│   ├── SCREENS/              # All screenshots for this iteration
│   └── SCORE.md              # Score at end of this iteration (with arithmetic)
├── iter-2/
│   └── ...
└── SCREENS/              # Master screenshots directory (canonical, non-iter screenshots)
```

Screenshot naming: `<ROLE>__<MODULE>__<STATE>__<VIEWPORT>.png`
Use `__before` and `__after` suffixes for fix evidence.

Never mark unvisited use cases as PASS. Use TODO/UNTESTED with a concrete reason.

---

## Gap Preflight (every iteration start)

```bash
cd frontend
python3 e2e/generated/generate.py
node scripts/check-ui-coverage-100.mjs
```

Record output in `PROGRESS.md`. If a command fails, continue only if the failure still leaves a
usable route/use-case list; otherwise mark the run BLOCKED in `VERDICT.md`.

---

## Autonomous Goal Loop

Run this loop until the done condition is met or a stop condition is hit:

```
PHASE 0 (first iteration only):
  Discover → code scan → generate ROUTE-INVENTORY.md, RBAC-MATRIX.md, FEATURE-MAP.md

ITERATION N:
  Phase A → Preflight + health check
  Phase B → Login smoke all accounts + RBAC boundary matrix
  Phase C → Route sweep (prioritize UNTESTED, FAIL, BLOCKED from prior iter)
  Phase D → Page behavior + write-path flows + API network validation
  Phase E → Responsive (320/768/1024/1440) + accessibility + performance gate
  Phase F → Fix queue: reproduce → root cause → fix → gate → commit → deploy →
             regression pack → re-verify
  Phase G → Score + risk register + delta report for this iteration
  Phase H → Cleanup: delete or document all ZZ QA records created this iteration
  IF score ≥ 95 AND zero CRITICAL/HIGH open AND critical UCs 100% → Final Release Gate
  ELSE IF improvement delta < 3 AND no fix made AND no new UC covered → increment stall counter
       IF stall counter ≥ 3 → stop (no further progress possible)
  ELSE → start ITERATION N+1
```

> **No hard iteration cap.** Stop is stagnation-based: 3 consecutive iterations with score delta < 3
> AND no new fix deployed AND no new use cases covered.

---

## Phase 0 — Code Discovery (First Iteration Only)

Before any browser session opens, scan the codebase to generate ground truth.

### 0.1 Route Inventory

```bash
# Discover all frontend routes from the App Router file system
find frontend/src/app -name "page.tsx" | sort
# Also scan navigation config
grep -r "href\|path\|route" frontend/src --include="*.tsx" --include="*.ts" \
  -l | head -40
```

For each discovered route, record in `ROUTE-INVENTORY.md`:

- Route path
- Source file (`app/.../page.tsx`)
- Module (HRMS / Hire / Grow / Fluence / Admin / Auth)
- Minimum permission required (from guards / middleware)
- Whether it appears in sidebar navigation or is deep-link only
- Dynamic segments (e.g. `[jobId]`, `[employeeId]`)
- Feature flag gating (if any)
- Hidden / draft routes

### 0.2 RBAC Matrix

```bash
# Extract permission constants
grep -r "PERMISSION\|hasRole\|hasPermission\|role ==" \
  frontend/src --include="*.tsx" --include="*.ts" | grep -v ".test." | head -80
# Backend: permission seeds
find backend/src -name "*.sql" -o -name "*.java" | \
  xargs grep -l "INSERT.*permission\|RolePermission\|PERMISSION" 2>/dev/null | head -20
```

Generate `RBAC-MATRIX.md`: rows = 13 demo roles, columns = modules/features,
cells = ALLOWED / DENIED / PARTIAL.

> **RBAC 100% scope definition:** "100% RBAC matrix coverage" means every demo role is verified
> against every module's critical action (read / create / approve / admin) plus at least 3
> representative deny-path routes per role. It does NOT mean every role × every route × every
> action combination — that is impractical at 13 × 286 × N. Cover the critical-action surface;
> sample the rest. Document scope boundaries in `RBAC-MATRIX.md`.

### 0.3 Feature Map

```bash
# Feature flags
grep -r "featureFlag\|feature_flag\|FEATURE_" \
  frontend/src --include="*.tsx" --include="*.ts" | head -40
# Tenant config
grep -r "tenantConfig\|moduleEnabled\|isEnabled" \
  frontend/src --include="*.tsx" --include="*.ts" | head -30
```

Generate `FEATURE-MAP.md`: module → feature flags → use cases.

> After Phase 0, the `ROUTE-INVENTORY.md` replaces any assumption about "286 routes" — use the
> discovered count as the authoritative target for this run.

---

## Phase A — Preflight (every iteration)

1. Check backend health URL → record UP/DOWN.
2. Open frontend URL in clean incognito.
3. Screenshot the landing page.
4. Verify last known deploy is still live (check Vercel dashboard or `vercel ls`).
5. Check for new commits on `main` since last iteration that may affect test state.
6. Confirm `ROLLBACK.md` has the most recent deploy SHA and rollback command before testing begins.

---

## Phase B — Auth + RBAC Matrix

For each demo account:

1. Navigate to `https://hrms-frontend-vert.vercel.app/auth/login`.
2. Login, screenshot the post-login state (URL + role displayed).
3. Record actual role — cross-reference against `RBAC-MATRIX.md`.
4. Visit visible nav entries → screenshot each that loads.
5. Deep-link 3 representative denied/higher-privilege routes → confirm fail-closed (no data visible
   before redirect, no leaked API response in network tab).
6. Logout → screenshot.
7. Record PASS/FAIL/BLOCKED per account in `COVERAGE.md`.

**RBAC Validation Rule:** A route that redirects to `/denied` still requires a network tab check —
confirm the backend API was never called with the denied session, or that it returned 403 before
any data was returned to the client.

---

## Phase C — Route Sweep

Work through all discovered routes from `ROUTE-INVENTORY.md` using the appropriate demo account
for each route's minimum permission level. On each route:

1. Navigate to the route.
2. Wait for content to load (no spinner, no blank, no error boundary).
3. **Take a screenshot** → save to `iter-N/SCREENS/<ROLE>__<MODULE>__<STATE>__1440.png`.
4. Note console errors, 4xx/5xx network failures.
5. Mark cell in `COVERAGE.md`.

**Priority order within sweep:**

1. NU-AURA business-critical flows (see dedicated section below).
2. Routes that were FAIL or BLOCKED in the previous iteration.
3. Routes that were UNTESTED or TODO in the previous iteration.
4. Routes that changed in commits since the last iteration.
5. All remaining routes.

If all routes cannot be covered in a single iteration, cover business-critical flows and
high-traffic routes first.

---

## Phase D — Page Behavior + Write Paths + API Validation

For every tested page, verify:

- Page renders without blank screen, error boundary, infinite spinner, or hydration error.
- Loading, empty, data, and error states are coherent.
- Search, filters, sort, pagination, tabs, modals, drawers, and forms respond.
- Console and network have no untriaged errors (see Console Error Policy below).

### Write Path Flows (disposable `ZZ QA <yyyy-mm-dd>` records only)

Before any Save/Submit/Approve/Reject/Delete/Upload: confirm URL + identity + disposable status.

Minimum verified write paths each iteration:

- Create employee → view → edit profile
- Apply leave (arun) → approve leave (sumit)
- Create job posting → move candidate through pipeline → make offer
- Submit expense → approve expense
- Post on Fluence wall
- Create wiki page (Fluence)
- AI-chat prompt sends and receives response

Screenshot before and after each write action.

**Write-flow dependency order** — always execute write flows in this sequence so later flows can
use data created by earlier ones:

1. Create `ZZ QA` employee (provides the subject for all HR flows)
2. Leave apply + approve using that employee
3. Expense submit + approve using that employee
4. Employee profile view + edit using that employee
5. Create job posting
6. Create candidate under that job
7. Move candidate through kanban stages
8. Generate offer for that candidate
9. Fluence: wall post → reaction → comment
10. Fluence: wiki page create → edit
11. AI chat prompt

Cleanup (Phase H) runs in **reverse order** — delete candidate before job, job before employee.

**Seed-data protection (hard rule):** Never edit, update, or delete any record that was not created with the `ZZ QA` prefix during this run. All write operations must target disposable `ZZ QA <yyyy-mm-dd>` records only. If a flow requires modifying an existing real or demo record, mark that use case BLOCKED/UNTESTED rather than touching the record.

**No direct database mutation (hard rule):** Never run SQL, call the database directly, or use
any admin backdoor to set up or clean up test data. All test data must be created and deleted
exclusively through the application UI. This applies to fixes as well — schema or data repairs
must go through a Flyway migration committed to `main`, not a manual SQL statement.

### API Network Validation

For every critical write-path flow, open DevTools → Network tab and verify:

| Flow | Expected request | Expected status | Evidence |
|------|-----------------|-----------------|----------|
| Apply Leave | `POST /leave/applications` | 200/201 | Response body has `id` |
| Approve Leave | `PUT /leave/applications/{id}/approve` | 200 | Status field updated |
| Create Employee | `POST /employees` | 201 | Response body has `employeeId` |
| Expense Submit | `POST /expense/claims` | 201 | Claim appears in list |
| Wall Post | `POST /fluence/posts` | 201 | Post visible in feed |
| AI Chat | `POST /fluence/ai-chat/query` | 200 | Response text non-empty |

Record: request payload (sanitized), response status, response shape, whether UI reflects it.
A flow is PASS only when UI + network both confirm success.

---

## Phase E — Responsive + Accessibility + Performance

### Responsive

For the 10 highest-traffic route templates, capture at 320 / 768 / 1024 / 1440:

```text
/dashboard  /admin/employees  /leave/my-leaves  /recruitment/[jobId]/kanban
/fluence/ai-chat  /admin  /settings/profile  /payroll  /reports/headcount  /me/dashboard
```

Verify: no overflow, no clipping, no broken grids, readable controls, hamburger menu accessible.

### Accessibility

Run axe or equivalent on each distinct page template where tooling is available.
Keyboard tab order spot-check on login, employee form, and leave form.

### Performance Gate

For the 5 most-visited routes (`/dashboard`, `/admin/employees`, `/leave/my-leaves`,
`/recruitment`, `/fluence/wall`), measure via Chrome DevTools Lighthouse or Performance tab:

| Metric | Gate threshold | Action if exceeded |
|--------|---------------|-------------------|
| LCP | < 4s | Mark HIGH finding |
| CLS | < 0.1 | Mark MEDIUM finding |
| TTFB | < 2s | Mark MEDIUM finding |
| Dashboard load (interactive) | < 8s | Mark HIGH finding |
| API response (critical flows) | < 5s | Mark MEDIUM finding |
| Memory after 5-minute session | No leak (stable heap) | Mark HIGH finding |

Record measurements in `VERDICT.md` under Performance section. Performance gate failures
contribute to release gate RG-16.

---

## Console Error Policy

Not all console errors are equal. Apply this severity mapping before logging a finding:

| Console message pattern | Severity | Action |
|------------------------|----------|--------|
| `Unhandled Promise Rejection` | HIGH | Log finding, investigate |
| `React Hydration Error` | HIGH | Log finding, investigate |
| `ChunkLoadError` / `Loading chunk failed` | HIGH | Log finding, investigate |
| `Cannot read properties of undefined` | HIGH | Log finding, investigate |
| `401 Unauthorized` (expected on protected route deny) | IGNORE | Note only |
| `403 Forbidden` (expected on RBAC deny) | IGNORE | Note only |
| `404` on optional resource (avatar, optional asset) | LOW | Note only |
| `500 Internal Server Error` | HIGH | Log finding, investigate |
| `Warning: Each child in a list should have a unique "key"` | LOW | Note, batch-fix |
| `Warning: componentWillMount` legacy lifecycle | LOW | Note only |
| Intentional `console.log` debug statements | MEDIUM | Log, mark tech debt |

Only log as a finding when severity ≥ MEDIUM. Do not block a route FAIL solely on IGNORE-class
console output.

---

## NU-AURA Business-Critical Flows

These are the highest-priority use cases. Any FAIL here blocks release regardless of route coverage
score. Test these every iteration. All flows require disposable `ZZ QA` records.

### NU-HRMS

| UC ID | Flow | Role | Gate |
|-------|------|------|------|
| UC-HR-01 | Employee Create (name, department, designation, join date) | HR Manager / Admin | Must create + appear in list |
| UC-HR-02 | Employee Edit (profile, personal details) | HR Manager | Field changes persist on reload |
| UC-HR-03 | Employee Archive / Status Change | HR Manager / Admin | Status reflected in list |
| UC-HR-04 | Employee Search + Filter (department, status) | Manager+ | Filters narrow results correctly |
| UC-HR-05 | Employee Profile View (with all tabs) | Employee (own) / HR | All tabs render without error |
| UC-HR-06 | Leave Apply (any type) | Employee | Application created, appears in My Leaves |
| UC-HR-07 | Leave Approve (manager) | Manager / HR Manager | Status flips to Approved; employee notified |
| UC-HR-08 | Leave Reject | Manager / HR Manager | Status flips to Rejected; reason recorded |
| UC-HR-09 | Leave Balance visible | Employee | Balances render; not 0/NaN/undefined |
| UC-HR-10 | Attendance view | Employee / Manager | Attendance table loads with data |
| UC-HR-11 | Expense Submit | Employee | Claim created, status Pending |
| UC-HR-12 | Expense Approve | Manager / Finance | Status flips to Approved |
| UC-HR-13 | Expense Reject | Manager / Finance | Status flips to Rejected |
| UC-HR-14 | Payslip View | Employee | Payslip renders (or clearly unavailable) |
| UC-HR-15 | Payroll Preview (not finalize) | Finance / Admin | Open payroll screen; verify data loads and preview renders — do NOT click finalize/process unless the run is a clearly labelled demo run with no financial side-effects |
| UC-HR-16 | Employee Permissions (role assignment) | Tenant Admin / Admin | Role changes take effect on next login |
| UC-HR-17 | Org Chart renders | Manager+ | Hierarchy visible without blank |
| UC-HR-18 | Reports / Headcount | HR Manager / Admin | Numbers render; no NaN |

### NU-Hire (Recruitment)

| UC ID | Flow | Role | Gate |
|-------|------|------|------|
| UC-HIRE-01 | Job Creation (title, department, pipeline) | Recruitment Admin / HR Manager | Job appears in job list |
| UC-HIRE-02 | Candidate Create (name, email, source) | Recruitment Admin | Candidate appears in pipeline |
| UC-HIRE-03 | Candidate Pipeline Move (stage change) | Recruitment Admin | Card moves in kanban |
| UC-HIRE-04 | Offer Workflow (generate offer, send) | Recruitment Admin / HR Manager | Offer status updated |
| UC-HIRE-05 | Interview Schedule | Recruitment Admin / Manager | Interview event created |
| UC-HIRE-06 | Candidate Search + Filter | Recruitment Admin | Filters narrow results |
| UC-HIRE-07 | Job Close / Archive | Recruitment Admin | Job no longer in active list |

### NU-Grow (LMS / Performance)

| UC ID | Flow | Role | Gate |
|-------|------|------|------|
| UC-GROW-01 | Goal Create | Employee / Manager | Goal appears in goal list |
| UC-GROW-02 | Goal Update (progress %) | Employee | Progress persists |
| UC-GROW-03 | Review Cycle Create | HR Manager / Admin | Cycle visible in list |
| UC-GROW-04 | Feedback Submit (employee to manager) | Employee | Feedback recorded |
| UC-GROW-05 | Performance Rating Submit | Manager | Rating saved against employee |
| UC-GROW-06 | Learning Module View | Employee | Module content renders |
| UC-GROW-07 | Learning Module Complete (mark done) | Employee | Completion recorded |

### NU-Fluence (Social / Wiki / AI)

| UC ID | Flow | Role | Gate |
|-------|------|------|------|
| UC-FLUENCE-01 | Wall Post (text) | Employee | Post appears in feed |
| UC-FLUENCE-02 | Wall Reaction (like) | Employee | Reaction count increments |
| UC-FLUENCE-03 | Wall Comment | Employee | Comment appears under post |
| UC-FLUENCE-04 | Wiki Page Create | Employee+ | Page saved, appears in wiki tree |
| UC-FLUENCE-05 | Wiki Page Edit | Author / Admin | Changes persist on reload |
| UC-FLUENCE-06 | Blog Post Create | Employee+ | Blog appears in list |
| UC-FLUENCE-07 | AI Chat (prompt + response) | Employee (KNOWLEDGE:SEARCH perm) | Response received without error |
| UC-FLUENCE-08 | Notification Feed renders | Employee | Notifications visible (or empty state clear) |

### Auth + Session

| UC ID | Flow | Role | Gate |
|-------|------|------|------|
| UC-AUTH-01 | Login (all 13 accounts) | All | Each account lands on correct dashboard |
| UC-AUTH-02 | Logout | All | Session cleared; redirect to login |
| UC-AUTH-03 | Session Expiry (wait or force expire) | Any | Graceful redirect to login |
| UC-AUTH-04 | RBAC Deny redirect | Any (wrong role) | Redirect to `/denied`; no data leaked |
| UC-AUTH-05 | Forgot Password flow | Any | Email sent or clear unavailable message |

---

## Phase F — Fix → Root Cause → Gate → Deploy → Regression → Re-Verify

For every reproduced defect in the fix queue:

1. Reproduce in Chrome on the deployed URL.
2. Capture `__before` screenshot + URL + role + steps + console + network evidence.
3. **Root Cause Analysis** — before writing code, identify:
   - Root cause (UI bug / API bug / RBAC config / Flyway migration / cache / state management)
   - Affected modules (list all areas that share the faulty code path)
   - Whether other use cases may be affected by the same root cause
   - Record in `FINDINGS.md` under `Root Cause` and `Affected Modules` fields
4. Confirm `git branch --show-current` = `main` and `git status --short`.
5. Read every touched file before editing. Use graphify for locating source. For any fix that
   touches an API call, response field, or endpoint path, also run an **API contract drift
   check**: grep the backend controller (`RequestMapping`/`PostMapping`/`GetMapping`) and the
   response DTO to confirm the frontend client matches actual field names, types, and status
   codes. If they diverge, fix the contract mismatch — not just the UI symptom. Record the
   check outcome in `iter-N/FIXES-APPLIED.md`.
6. Apply the smallest correct diff. Fix only the reproduced defect. Keep diffs Codex-reviewable.
7. Leave RBAC/auth/security/API-contract defects OPEN unless root cause is fully understood,
   locally gated, and safely re-testable.
8. Run local gates:

   ```bash
   cd frontend
   npm run lint
   npx tsc --noEmit
   npm run build
   ```

   For visual/styling fixes, also run `npm run lint:design-system`. If backend code changed,
   run the narrowest meaningful Maven test first, then the backend gate.

9. Commit small, scoped, conventional commits to `main`.
10. **Update `ROLLBACK.md` before deploying:**

    ```markdown
    ## Deploy <N> — <timestamp>
    Commit SHA: <sha>
    Files changed: <list>
    Deploy command: vercel --prod --archive=tgz [from repo root]
    Railway deploy: railway up [if backend changed]
    Rollback command: git revert <sha> && vercel --prod --archive=tgz
    Rollback railway: git revert <sha> && railway up
    ```

11. Deploy frontend to Vercel (`vercel --prod --archive=tgz` from repo root). Deploy backend to
    Railway only when backend code changed (`railway up` from repo root).
12. Wait for deploy readiness (Vercel deployment URL live or Railway service green).
13. **Run Regression Pack** (mandatory after every deploy) — test the following on the
    just-deployed surface before re-testing the fixed defect:

    ```text
    UC-AUTH-01  Login (arun + sumit)
    UC-HR-01    Dashboard renders for Employee
    UC-HR-06    Leave Apply visible
    UC-HR-07    Approve Leave visible
    UC-HR-18    Reports / Headcount
    UC-HIRE-01  Job list loads
    UC-GROW-01  Goal list loads
    UC-FLUENCE-01 Wall feed loads
    ```

    Record results in `iter-N/REGRESSION-RESULTS.md`. If regression pack has any FAIL, prioritize
    fixing the regression before the original defect.

14. Re-open deployed Vercel URL in clean Chrome.
15. Re-test original fix steps with same role.
16. Capture `__after` screenshot.
17. Mark finding `FIXED (deployed+verified)` only when deployed re-check passes AND regression
    pack is clean.
18. Record commit SHA, deploy ID, revert command in `FINDINGS.md` and `iter-N/FIXES-APPLIED.md`.

If a fix fails local gates or live re-check, either iterate immediately or revert. Never mark a
fix as done from a local-only result.

---

## Phase H — Test Data Cleanup (every iteration end)

After Phase G scoring, before closing the iteration:

1. List all `ZZ QA <yyyy-mm-dd>` records created during this iteration (employees, leave
   applications, job postings, candidates, expense claims, wall posts, wiki pages, blog posts).
2. For each record: attempt deletion via the UI with the same role that created it.
3. If deletion is not available in the UI, mark the record in `PROGRESS.md` as "retained —
   deletion not exposed in UI" and leave it. Do not call the API directly to delete.
4. For records that cannot be deleted (e.g. approved leave applications where the workflow
   prevents reversal), document them in `PROGRESS.md` as retained test data with reason.
5. After cleanup attempt, record final retained-test-data list in `iter-N/FIXES-APPLIED.md`
   under "Retained test data".

This satisfies release gate RG-22.

---

## Parallel Agent Architecture (when orchestrating sub-agents)

For large sweeps (full 13-role × 4-module matrix), spawn parallel agents. Each agent owns a
dedicated scope and reports findings back to the master findings ledger.

```
ORCHESTRATOR (you)
│  owns: FINDINGS.md, VERDICT.md, RELEASE-GATE.md, ROLLBACK.md, SCORE.md
│
├── Agent A  → Auth + Session (UC-AUTH-01 to UC-AUTH-05)
├── Agent B  → RBAC boundary matrix (all 13 roles, deny-path verification)
├── Agent C  → NU-HRMS flows (UC-HR-01 to UC-HR-18)
├── Agent D  → NU-Hire flows (UC-HIRE-01 to UC-HIRE-07)
├── Agent E  → NU-Grow flows (UC-GROW-01 to UC-GROW-07)
├── Agent F  → NU-Fluence flows (UC-FLUENCE-01 to UC-FLUENCE-08)
├── Agent G  → Responsive (320/768/1024/1440 across 10 templates)
├── Agent H  → Accessibility (axe sweeps + keyboard nav)
└── Agent I  → Performance gate (LCP/CLS/TTFB/API latency for 5 routes)
```

**Orchestrator rules:**

- **If the execution environment supports parallel/background agents** (e.g. Claude Code with
  `run_in_background: true`): spawn all agents in one message so they run concurrently. Each
  agent writes findings tagged `[AGENT-X]` to `FINDINGS.md`.
- **If the environment does not support parallel agents** (Codex or single-thread execution):
  run each module track sequentially in the order above, merge findings into `FINDINGS.md`
  after each track, then continue to the fix phase.
- After all agents/tracks complete, orchestrator deduplicates, assigns severity, plans fix queue.
- Fix queue is always orchestrator-owned — sub-agents/tracks do not deploy.

---

## Screenshot Mandate (Non-Negotiable)

Every route visited in Chrome **must** produce at least one screenshot saved to
`iter-N/SCREENS/`. No route may be marked PASS in `COVERAGE.md` without a screenshot proving it.

**Required screenshots per iteration:**

- Post-login state for every account that successfully logs in.
- Every route visited (at 1440px minimum).
- Before+after for every fix applied.
- Any console error or 4xx/5xx network failure (browser DevTools open).
- Responsive breakpoints for Phase E routes.
- Final dashboard state for each sub-app (HRMS/Hire/Grow/Fluence) per iteration.
- Network tab for every critical write-path flow.
- `RELEASE-GATE.md` completion evidence (final passing state).

---

## FINDINGS.md Entry Format

Each finding must include:

```markdown
## F-<NNN> — <Title>

**Severity**: CRITICAL / HIGH / MEDIUM / LOW
**Status**: OPEN / FIXED (deployed+verified) / WONT-FIX / DEFERRED
**UC IDs affected**: UC-HR-06, UC-HR-07
**Reproduced by**: <role> / <route> / <steps>
**Root Cause**: <one-line root cause — UI / API / RBAC / DB / State / Config>
**Affected Modules**: <list of modules that share this code path>
**Evidence**:
  - Screenshot (before): iter-N/SCREENS/<file>.png
  - Console: <error text>
  - Network: <request + status + response snippet>
**Fix**:
  - Commit SHA: <sha>
  - Deploy ID: <vercel-url>
  - Regression Pack: CLEAN / REGRESSION (see iter-N/REGRESSION-RESULTS.md)
**Screenshot (after)**: iter-N/SCREENS/<file>__after.png
```

**Evidence minimum (hard rule):** A finding is invalid and must not be logged unless it
contains at minimum one of the following:

- Repro steps + at least one screenshot, OR
- Exact console error text + route + role, OR
- Network tab evidence (request method + URL + status code + response snippet).

Findings without evidence are discarded, not logged as OPEN.

---

## Risk Register (VERDICT.md)

Maintain a risk register section in `VERDICT.md`. Every OPEN finding maps to a risk category:

| Risk Category | Definition | Findings |
|--------------|------------|----------|
| SECURITY | Auth bypass, RBAC leak, token exposure, tenant isolation | F-xxx |
| DATA LOSS | Save fails silently, delete without confirmation, corrupt state | F-xxx |
| RBAC | Role sees data it should not; route accessible without permission | F-xxx |
| PERFORMANCE | LCP > 4s, API > 5s, memory leak | F-xxx |
| AVAILABILITY | Page blank/crash, service error, deploy failure | F-xxx |
| UX | Broken flow, misleading state, unusable on mobile | F-xxx |
| ACCESSIBILITY | Keyboard trap, missing ARIA, contrast failure | F-xxx |

Use this register in the release gate decision.

---

## Final Release Gate

After reaching score ≥ 95 with zero CRITICAL/HIGH open, run the **Artifact Consistency Check**
before generating `RELEASE-GATE.md`:

- Count of findings in `FINDINGS.md` = count referenced in `VERDICT.md` = count in gate checklist.
- Every finding marked PASS in `COVERAGE.md` has an evidence link (screenshot path or network log).
- Every finding marked `FIXED (deployed+verified)` has: commit SHA + Vercel deploy URL + `__after`
  screenshot. Any finding missing these fields must be downgraded to OPEN before proceeding.
- No UC is marked PASS in `USE-CASES.md` without an evidence reference.
- `ROLLBACK.md` reflects the most recent deploy.

If any inconsistency is found, resolve it before generating `RELEASE-GATE.md`. Do not issue a GO
verdict with internally inconsistent artifacts.

Then generate `RELEASE-GATE.md`:

### Gate Checklist

| # | Gate Item | Requirement | Status | Evidence |
|---|-----------|------------|--------|----------|
| RG-01 | All demo accounts login successfully | 100% | PASS/FAIL | Screenshots + iter |
| RG-02 | Zero CRITICAL findings open | 0 | PASS/FAIL | FINDINGS.md |
| RG-03 | Zero HIGH findings open | 0 | PASS/FAIL | FINDINGS.md |
| RG-04 | Critical Use Cases covered | 100% | PASS/FAIL | USE-CASES.md |
| RG-05 | RBAC matrix cells verified | 100% | PASS/FAIL | RBAC-MATRIX.md |
| RG-06 | High-traffic / business-critical routes | 100% | PASS/FAIL | COVERAGE.md |
| RG-07 | Remaining route coverage | ≥ 80% | PASS/FAIL | COVERAGE.md |
| RG-08 | Employee CRUD (create + view + edit) | Complete | PASS/FAIL | Screenshots + network |
| RG-09 | Leave apply → approve cycle end-to-end | Complete | PASS/FAIL | Screenshots + network |
| RG-10 | Expense submit → approve cycle | Complete | PASS/FAIL | Screenshots + network |
| RG-11 | Recruitment job → kanban → offer | Complete | PASS/FAIL | Screenshots + network |
| RG-12 | Fluence wall post + wiki + AI-chat | All render + write | PASS/FAIL | Screenshots + network |
| RG-13 | No 500/503 server errors on any tested route | 0 | PASS/FAIL | Network evidence |
| RG-14 | Responsive: no overflow/clipping at 320px on all dashboard variants | Pass | PASS/FAIL | Screenshots |
| RG-15 | RBAC deny flows fail-closed (no data before redirect, API 403 confirmed) | Pass | PASS/FAIL | Screenshots + network |
| RG-16 | Performance gate (LCP < 4s, dashboard < 8s, API < 5s) | Pass | PASS/FAIL | Lighthouse / DevTools |
| RG-17 | Regression pack clean after last deploy | Clean | PASS/FAIL | iter-N/REGRESSION-RESULTS.md |
| RG-18 | Console error policy — zero HIGH-class errors on critical routes | 0 HIGH errors | PASS/FAIL | Console evidence |
| RG-19 | `ROLLBACK.md` has current SHA + rollback command | Present | PASS/FAIL | ROLLBACK.md |
| RG-20 | `DEMO_CREDENTIALS_ENABLED=true` on Railway — **must flip to `false` before real prod go-live** | NOTED | NOTED | Railway env |
| RG-21 | Vercel GitHub repo connection pending (`hrms-frontend` project) | NOTED | NOTED | Vercel dashboard |
| RG-22 | Disposable ZZ QA test data cleaned or documented (Phase H) | Clean / Documented | PASS/FAIL | iter-N/FIXES-APPLIED.md |

**Final verdict:**

- **GO** — RG-01–RG-19 and RG-22 PASS; RG-20/RG-21 NOTED.
- **CONDITIONAL-GO** — RG-01–RG-13 PASS and RG-14–RG-19/RG-22 have only LOW/MEDIUM residual issues.
- **NO-GO** — any of RG-01–RG-13 FAIL.

RG-20 and RG-21 are "before real production" reminders — they do not block the UAT GO verdict.

---

## Scoring

Start at 100. Apply the strictest cap first:

- Any open CRITICAL → caps at 40.
- Any open HIGH → caps at 70.
- Critical UC coverage < 100% → caps at 65.
- RBAC matrix coverage < 100% → caps at 75.
- Route coverage below 80% → caps at 75.
- Performance gate fail (any HIGH metric) → caps at 80.

Deductions:

- 10 per untested critical RBAC/write-path UC.
- 5 per open MEDIUM.
- 3 per missing regression pack after a deploy.
- 1 per open LOW.

Show arithmetic in `VERDICT.md` and in each `iter-N/SCORE.md`.

---

## Severity

| Severity | Definition |
|----------|------------|
| CRITICAL | Data leak, privilege escalation, broken auth, data loss, tenant isolation failure |
| HIGH | Core flow broken, permitted page crashes, approvals broken, major role path blocked, LCP > 4s, unhandled promise on critical route |
| MEDIUM | Empty/error state broken, filter/pagination broken, responsive content hiding, console warnings on critical route, API > 5s |
| LOW | Spacing, copy, minor contrast, non-blocking polish, key-prop warnings |

---

## Iteration Ledger (in PROGRESS.md)

For each completed iteration, record:

```
## Iteration N — <date> <time>
Score at start: X
Routes tested: Y / <discovered count>
Use Cases covered: P / <total critical UCs>
New findings: CRITICAL=n HIGH=n MEDIUM=n LOW=n
Fixes applied: [commit SHAs]
Deploys: [Vercel deployment URL] [Railway deploy if applicable]
Regression pack result: CLEAN / REGRESSION
Routes re-verified after fix: [list]
Risk register delta: [categories with new findings]
Score at end: Z
Delta: +D / -D
Stall counter: N
Next iter focus: [UNTESTED routes / open MEDIUM findings / responsive gaps / UCs not yet covered]
```

---

## Stop Conditions

Stop immediately and write `VERDICT.md` + partial `RELEASE-GATE.md` if:

- Backend health is not UP.
- Demo login is globally broken (0 accounts work).
- Owner/SUPER_ADMIN session appears unexpectedly.
- Chrome session integrity is unclear.
- An irreversible action on non-disposable data is required.
- The deployed app becomes unavailable (Vercel down/Railway down).
- A deploy cannot be made green after a reproduced fix attempt (revert and record rollback in
  `ROLLBACK.md`).
- Fixing would require broad architecture changes, secret access, or destructive data actions.
- **Stagnation**: 3 consecutive iterations with score delta < 3 AND no new fix deployed AND no
  new use cases covered. (No hard iteration cap — stop is stagnation-based.)

When stopped early: include partial coverage, exact stop reason, screenshots, findings,
risk register state, and next action.

---

## Operating Mode Selection

| User says | Mode |
|-----------|------|
| "fix", "deploy", "autonomous", "loop", "goal", "100% solid", "unattended" | **Autonomous Goal Loop** — no approval between safe test/edit/gate/commit/deploy/re-check steps |
| "test-only" | **Read-only** — skip fix/deploy sections, leave findings OPEN |

Default is **Autonomous Goal Loop** unless user explicitly says `test-only`.

---

## Output

Report after each iteration and at final completion:

1. Iteration number and run folder path.
2. Accounts tested and actual roles confirmed.
3. Coverage counts: PASS, FAIL, BLOCKED, SKIPPED, TODO, UNTESTED (total and delta from prior iter).
4. Use case coverage: critical UCs done / total, per module breakdown.
5. Coverage percentage and score (with arithmetic and caps applied).
6. CRITICAL/HIGH findings — open and resolved.
7. Risk register summary (categories with open findings).
8. Fixes made this iteration: root cause, commit SHAs, deploy IDs, regression pack result,
   live `__after` evidence links.
9. Screenshots index (`iter-N/SCREENS/`).
10. Performance gate measurements (for Phase E routes).
11. Stop reason or next-iteration plan.
12. Links to `ROUTE-INVENTORY.md`, `RBAC-MATRIX.md`, `FEATURE-MAP.md`, `USE-CASES.md`,
    `COVERAGE.md`, `FINDINGS.md`, `PROGRESS.md`, `ROLLBACK.md`, `VERDICT.md`,
    `RELEASE-GATE.md` (when generated), and `iter-N/SCORE.md`.

At final completion, also output:

1. Total iterations run.
2. Total fixes deployed.
3. `RELEASE-GATE.md` final verdict: **GO / CONDITIONAL-GO / NO-GO**.
4. Explicit list of items needed before real production go-live (RG-20, RG-21, any residual items).
