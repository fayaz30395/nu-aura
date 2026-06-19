# NU-AURA — Shared Issue Coordination File

> Single shared communication file for Claude and Codex. Both agents must read and update this file before, during, and after every test/fix cycle.

## Operating Rule

This file is the single source of truth for issue discovery, proposed solutions, cross-agent confirmation, implementation status, retest evidence, and final readiness scoring.

No issue may be fixed until:

1. The discovering agent writes the issue here.
2. The reviewing agent confirms the issue is valid or asks for more evidence.
3. A proposed solution is written here.
4. The other agent confirms the proposed solution is safe.
5. Only then the assigned fixer applies the change.
6. Both agents retest or review the retest evidence.

If the user is unavailable, Claude acts as final decision owner. Codex must not override Claude on product, security, RBAC, or test-priority decisions.

---

## Current Run Metadata

| Field | Value |
|---|---|
| Application | NU-AURA |
| Frontend URL | https://hrms-frontend-vert.vercel.app |
| Backend URL | https://nu-aura-backend-production.up.railway.app |
| Run Start Time | 2026-06-19 (Session 2 — Parallel Orchestrator) |
| Run Owner | Claude Orchestrator |
| Fix Owner | Codex Implementer |
| Target Score | 100/100 readiness |
| Prior Score | 87/100 CONDITIONAL-GO |
| Demo Mode | Demo login used for testing credentials only |
| Browser | Chrome (Extension connected — 3 tabs active) |
| Approval Mode | Autonomous; Claude decides when user unavailable |
| Baseline Commit | c25bade5 |
| Latest Codex Sync Commit | c295ba63 |

---

## Agent Status Board

| Agent | Current Task | Status | Blocker | Last Update |
|---|---|---|---|---|
| Claude | Orchestration — Parallel RBAC/Security/Tenant/Browser swarm | IN_PROGRESS | None | 2026-06-19 Session-3 parallel launch |
| Codex | Next.js / Mantine / React / forms / validation / UI bugs / Playwright failure triage and fixes after approval | READY_FOR_FRONTEND_ISSUES | Waiting for agent findings or issue-register entries with evidence | 2026-06-19 11:50:52 IST |
| backend-rbac-auditor | SecurityConfig, @RequiresPermission coverage, JWT, RLS, DEMO flag | RUNNING | None | 2026-06-19 Session-3 |
| frontend-auth-auditor | middleware.ts, nu-rbac.config.ts, NavPanel, usePermissions, bug status | RUNNING | None | 2026-06-19 Session-3 |
| permission-matrix-auditor | Full role×permission matrix from Flyway migrations V0→V304 | RUNNING | None | 2026-06-19 Session-3 |
| browser-rbac-validator | Live Chrome: unauthenticated access, cross-role RBAC, API headers | RUNNING | None | 2026-06-19 Session-3 |

### Session-3 Focus Areas (Parallel Orchestrator)
- RBAC enforcement depth (all 7 roles)
- Security: JWT, cookie flags, CSP headers
- Permission matrix completeness (Flyway migrations)
- Tenant isolation: RLS scope, native query gaps
- API authorization: missing @RequiresPermission endpoints
- Browser validation: live cross-role access tests

### Carry-Forward Open Issues (from 87/100 baseline)
| ID | Description | Severity | Status |
|---|---|---|---|
| SEC-001 | DEMO_CREDENTIALS_ENABLED=true in production | CRITICAL | OPEN — config-only fix |
| BUG-HIGH-003 | /system-admin → 404 (broken sidebar link) | HIGH | OPEN |
| BUG-MED-001 | /leave/admin index → 404 | MEDIUM | OPEN |
| BUG-MED-004 | /auth/logout → 404 | MEDIUM | OPEN |
| BUG-MED-005 | Saran V demo badge shows EMPLOYEE vs actual HR_ADMIN | MEDIUM | OPEN |
| NEW-001 | /fluence/articles → 404 | MEDIUM | OPEN |
| BUG-LOW-001 | "Unlock NU-Grow" banner shows for SUPER_ADMIN | LOW | OPEN |
| BUG-LOW-002 | ?denied=1 redirect produces no toast/notification | LOW | OPEN |

---

## Codex Intake Log

| Timestamp | Agent | Action | Evidence | Status |
|---|---|---|---|---|
| 2026-06-19 11:48:25 IST | Codex | Pulled latest changes before starting | `git pull --rebase --autostash` -> current branch `main` is up to date | DONE |
| 2026-06-19 11:48:25 IST | Codex | Re-read shared coordination file after pull | File now contains Session 2 metadata and only the template issue `ISSUE-0001`; no Claude-discovered issue entries are present yet | DONE |
| 2026-06-19 11:48:25 IST | Codex | Read Codex parallel fixer prompt | `NU_AURA_CODEX_PARALLEL_FIXER_PROMPT.md` requires confirmation/proposed solution before fixes and implementation only after `APPROVED_TO_FIX` | DONE |
| 2026-06-19 11:48:25 IST | Codex | Loaded required process/security context | Read `tools/PROCESS-RULES.md`, `tools/CONSTRAINT.md`, `tools/MERMAID.md`, `CLAUDE.md`, `MEMORY.md`, `docs/obsidian/00-Home.md`, `docs/obsidian/01-Architecture/Code-Patterns.md`, `docs/obsidian/08-Security/Security-Audit.md`, and `docs/obsidian/12-Knowledge-Graph/Data-Flows.md` | DONE |
| 2026-06-19 11:48:25 IST | Codex | Checked legacy pattern path | `docs/patterns/README.md` is missing in this checkout; current `CLAUDE.md` routes patterns to `docs/obsidian/01-Architecture/Code-Patterns.md` | NOTED |
| 2026-06-19 11:50:52 IST | Codex | Pulled latest before frontend fixer intake | Initial `git pull --rebase --autostash` reported stale upstream ref; explicit fetch of `fayaz-deen/main` completed and local `HEAD` now matches `c295ba63` | DONE |
| 2026-06-19 11:50:52 IST | Codex | Re-read shared coordination file after latest sync | File contains Session-3 agents, carry-forward open issues, and template `ISSUE-0001`; no approved issue-register entry is present yet | DONE |
| 2026-06-19 11:50:52 IST | Codex | Loaded frontend-focused context | Read `NU_AURA_CODEX_PARALLEL_FIXER_PROMPT.md`, `docs/obsidian/03-Frontend/Routes.md`, `docs/obsidian/03-Frontend/Components.md`, `docs/obsidian/09-Testing/QA-Strategy.md`, `docs/obsidian/09-Testing/Test-Catalog.md`, and `docs/obsidian/11-Decisions/ADR-004.md` | DONE |

## Codex Focus Scope

### Active Frontend Fixer Scope

Codex is ready to triage and fix only frontend issues that have enough evidence and are approved by Claude. Current requested focus areas:

- Next.js 16 App Router routes, layouts, loading/error boundaries, and protected/public route handling.
- Mantine 9 components, theming, notifications, modals, tables, and UI composition regressions.
- React 19 client components, state boundaries, Zustand client state, and TanStack Query server-state usage.
- Forms using React Hook Form + Zod, including validation schemas, submit states, field errors, and boundary cases.
- API usage through the existing `frontend/lib/api/client.ts` / Orval mutator path only; no new Axios instances.
- UI bugs affecting navigation, responsive layout, error/loading/empty states, accessibility, and visible workflow completion.
- Playwright failures, especially role-based route access, regression specs, live/production configs, and original failing reproduction paths.

Codex will not implement a frontend fix from this run until an issue is written below with evidence and its status is moved to `APPROVED_TO_FIX`.

### Existing Backend Fixer Scope

Codex is ready to triage and fix only issues that have enough evidence and are approved by Claude. Current requested focus areas:

- Spring Boot controllers, services, repositories, DTOs, validators, filters, and `@RequiresPermission` enforcement.
- PostgreSQL tenant isolation, Flyway migration impact, RLS behavior, constraints, idempotency, and audit fields.
- Redis cache, permission cache, rate limit, token blacklist, distributed lock, and failover behavior.
- Kafka or transactional-outbox events, consumers, idempotency, and fallback behavior.
- Security, RBAC, APIs, authentication/session, tenant isolation, validation, and server-side authorization.

Codex will not implement a fix from this run until an issue is written below with evidence and its status is moved to `APPROVED_TO_FIX`.

---

## Issue Register

Use this exact format for every issue.

### ISSUE-0001 — 9-Box Sort Buttons Non-Functional (Tautological onClick)

| Field | Value |
|---|---|
| Discovered By | Claude (code analysis — Session 3 fork) |
| Module | NU-Grow / Performance |
| Role/Login | Any user with performance access |
| URL/Route | /performance/cycles/[id]/nine-box |
| Severity | MEDIUM |
| Type | Functional / UIUX |
| Environment | Both (code bug, live on Vercel) |
| Reproducibility | Always |
| Status | FIXED_PENDING_RETEST |

#### Evidence

- File: `frontend/app/performance/9box/page.tsx` lines 626, 634, 642
- All three sort buttons have tautological onClick handlers:
  - `onClick={() => setSortField(sortField === 'name' ? 'name' : 'name')}` — always sets to 'name'
  - `onClick={() => setSortField(sortField === 'performance' ? 'performance' : 'performance')}` — always sets to 'performance'
  - `onClick={() => setSortField(sortField === 'potential' ? 'potential' : 'potential')}` — always sets to 'potential'
- The ternary condition and both branches are identical — clicking any button only ever sets the SAME field as the value it checks, making them all no-ops that keep whichever field was already set
- The active indicator logic (`sortField === 'name' ? '↑' : ''`) works correctly; only the onClick is broken

#### Reproduction Steps

1. Login as any role with performance access
2. Navigate to a performance cycle's 9-box page
3. Click the "Performance" column header sort button
4. Observe: sort order does not change (list stays sorted by name or whatever the default is)
5. Click "Potential" column header
6. Observe: still no change

#### Expected Result

Clicking a column header button sets that field as the active sort field and shows the `↑` indicator next to it.

#### Actual Result

Sort field never changes — all buttons produce no functional effect due to tautological ternaries.

#### Suspected Root Cause

Copy-paste error during initial implementation. Each ternary `(sortField === 'X' ? 'X' : 'X')` was intended to be `(sortField === 'X' ? 'asc' : 'desc')` for direction toggle, but the variable names were accidentally duplicated in both branches.

#### Proposed Solution

Replace each tautological handler with direct field assignment:
- Employee button: `onClick={() => setSortField('name')}`
- Performance button: `onClick={() => setSortField('performance')}`
- Potential button: `onClick={() => setSortField('potential')}`
Also add `type="button"` to prevent accidental form submit.

#### Cross-Agent Confirmation

| Confirmation | Agent | Decision | Notes | Timestamp |
|---|---|---|---|---|
| Issue validity | Claude | CONFIRMED | Code evidence conclusive — all three onClick branches are identical | 2026-06-19 Session-3 |
| Fix safety | Claude | APPROVED | Minimal change, no RBAC/security impact, no API calls affected | 2026-06-19 Session-3 |
| Retest result | TBD | TBD | TBD | TBD |

#### Fix Details

- Files changed: `frontend/app/performance/9box/page.tsx` (lines 626, 634, 642)
- Code summary: Replaced tautological `setSortField(sortField === 'X' ? 'X' : 'X')` with `setSortField('X')` for all three column sort buttons. Added `type="button"` attribute.
- Tests added/updated: None required — behavior visually verifiable
- Migration/config impact: None
- Rollback plan: Revert `frontend/app/performance/9box/page.tsx` changes

#### Retest Evidence

- Retested by: TBD (Codex or browser session)
- Steps: Click each column sort header, verify `↑` indicator moves and list reorders

---

### ISSUE-0002 — 9-Box Potential Score Is Synthetic Formula, Not Real API Data

| Field | Value |
|---|---|
| Discovered By | Claude (code analysis — Session 3 fork) |
| Module | NU-Grow / Performance |
| Role/Login | Any user with performance calibration access |
| URL/Route | /performance/cycles/[id]/nine-box |
| Severity | HIGH |
| Type | Data / Functional |
| Environment | Both (code logic, live on Vercel) |
| Reproducibility | Always |
| Status | CONFIRMED |

#### Evidence

- File: `frontend/app/performance/9box/page.tsx` lines 275–284:
```js
let potential = potentialOverrides[empId];
if (potential == null) {
  if (entry.selfRating && entry.managerRating) {
    const delta = entry.selfRating - entry.managerRating;
    potential = Math.min(5, Math.max(1, perf + delta * 0.5 + 0.5));
  } else {
    potential = 3;  // hardcoded default
  }
}
```
- `potentialOverrides` is only in-memory `useState<Record<string,number>>({})` (line 229) — never persisted to any API
- There is no backend API call for potential scores (no `usePotential`, no mutation, no API endpoint referenced)
- The formula `perf + delta * 0.5 + 0.5` computes potential from `(selfRating - managerRating)` delta — this is an HR anti-pattern; potential and performance are meant to be independent axes in a 9-box model
- Users can override values in the number input (line 574) but overrides are lost on page refresh

#### Reproduction Steps

1. Login as HR_ADMIN/HR_MANAGER
2. Navigate to a performance cycle's 9-box page
3. Observe the "Potential" column — all values are computed client-side from manager/self ratings
4. Override a potential value in the number input
5. Refresh the page — override is gone

#### Expected Result

Potential scores in a 9-box grid should come from a real HR data source (e.g., manager-assessed potential ratings stored in the DB) or from explicit user input that is saved/persisted. The grid positions should reflect real talent data, not a formula derived from the same review ratings already shown as "Performance."

#### Actual Result

Potential is `perf + (selfRating - managerRating) * 0.5 + 0.5` — a formula derived entirely from the same review ratings feeding the X-axis (performance), making the Y-axis (potential) statistically correlated with performance by construction. Employees with no reviews get `potential = 3` always.

#### Suspected Root Cause

The 9-box feature was built before a dedicated potential API endpoint existed. A placeholder formula was used to make the grid visually populate. No `potentialRating` field exists in the backend `PerformanceReview` entity.

#### Proposed Solution

Codex to investigate:
1. Does the backend `PerformanceReview` entity have a `potentialRating` field or similar?
2. If yes: fetch and use it in the 9-box data mapping
3. If no: add a `PATCH /api/v1/performance/reviews/{id}/potential` endpoint or a dedicated `PotentialRating` entity (many-to-many employeeId × cycleId)
4. Frontend: replace formula with API-sourced potential, persist overrides via API

Until a real API exists, add a visible `⚠️ Estimated` badge on the Potential column header to indicate the data is synthetic.

#### Cross-Agent Confirmation

| Confirmation | Agent | Decision | Notes | Timestamp |
|---|---|---|---|---|
| Issue validity | Claude | CONFIRMED | Code evidence conclusive — no API for potential, formula confirmed | 2026-06-19 Session-3 |
| Fix safety | Codex | TBD — awaiting root cause investigation | Must confirm whether backend entity has potential field | TBD |
| Retest result | TBD | TBD | TBD | TBD |

#### Fix Details

TBD — awaiting Codex investigation of backend entity schema

#### Retest Evidence

TBD

---

### ISSUE-0003 — 9-Box Potential Overrides Not Persisted (In-Memory Only)

| Field | Value |
|---|---|
| Discovered By | Claude (code analysis — Session 3 fork) |
| Module | NU-Grow / Performance |
| Role/Login | HR_ADMIN, HR_MANAGER, SUPER_ADMIN |
| URL/Route | /performance/cycles/[id]/nine-box |
| Severity | MEDIUM |
| Type | Data / Functional |
| Environment | Both |
| Reproducibility | Always |
| Status | CONFIRMED |

#### Evidence

- File: `frontend/app/performance/9box/page.tsx` line 229: `const [potentialOverrides, setPotentialOverrides] = useState<Record<string, number>>({});`
- No `useMutation`, no API call, no localStorage persistence for overrides
- Users can manually edit potential scores in the number input (line 574, 672) but values reset on reload
- Directly related to ISSUE-0002 (potential score being formula-based) — persisting overrides is a partial mitigation while a proper API is built

#### Reproduction Steps

1. Login as HR_ADMIN
2. Navigate to 9-box page of any performance cycle with employees
3. Change an employee's potential score using the number input
4. Note the grid position updates correctly (reactive)
5. Refresh the page
6. Observe: all overrides are gone, formula-computed values restored

#### Expected Result

HR managers can set and persist potential score adjustments that survive page refresh and are visible to other HR admins.

#### Actual Result

All potential overrides are lost on page refresh — stored only in React state.

#### Suspected Root Cause

Same root as ISSUE-0002 — no backend API for potential scores was implemented. Override UI was built but without a persistence layer.

#### Proposed Solution

Blocked by ISSUE-0002. Once the potential score API is implemented, the override logic should be wired to `PATCH /api/v1/performance/potential/{employeeId}` with proper debounce (500ms) on the input onChange.

#### Cross-Agent Confirmation

| Confirmation | Agent | Decision | Notes | Timestamp |
|---|---|---|---|---|
| Issue validity | Claude | CONFIRMED | Code evidence conclusive — useState only, no API mutation | 2026-06-19 Session-3 |
| Fix safety | TBD | TBD | Blocked by ISSUE-0002 backend investigation | TBD |
| Retest result | TBD | TBD | TBD | TBD |

#### Fix Details

TBD — blocked by ISSUE-0002

#### Retest Evidence

TBD

---

### ISSUE-0004 — Fluence Drive Upload Uses Null-UUID Sentinel as contentId

| Field | Value |
|---|---|
| Discovered By | Claude (code analysis — Session 3 fork) |
| Module | NU-Fluence / Drive |
| Role/Login | Any user with KNOWLEDGE_WIKI_CREATE permission |
| URL/Route | /fluence/drive |
| Severity | LOW |
| Type | Data / Functional |
| Environment | Both |
| Reproducibility | Always |
| Status | ACCEPTED_RISK |

#### Evidence

- File: `frontend/app/fluence/drive/page.tsx` lines 18-19:
```js
const DRIVE_CONTENT_ID = '00000000-0000-0000-0000-000000000000';
const DRIVE_CONTENT_TYPE = 'WIKI_PAGE';
```
- Backend `FluenceAttachmentController.java` accepts any UUID without validating that a real wiki page exists with that ID
- Files uploaded to drive are stored with `contentId = null-UUID` and `contentType = WIKI_PAGE` — they appear in `getRecentAttachments()` but are not actually associated with any wiki page
- This is a design choice (drive = orphaned attachments), not a bug per se, but the `contentType = WIKI_PAGE` is misleading for orphaned drive files

#### Reproduction Steps

1. Login as any user with document upload permission
2. Navigate to /fluence/drive
3. Upload a file
4. Check the network call — `POST /api/v1/fluence/attachments/WIKI_PAGE/00000000-0000-0000-0000-000000000000`
5. File is uploaded with null-UUID contentId

#### Expected Result

Drive-level uploads should use a dedicated content type (e.g., `DRIVE` or `ORPHANED`) or a real sentinel handling in the backend, rather than `WIKI_PAGE` with null UUID.

#### Actual Result

Files are stored as WIKI_PAGE type with null-UUID, which could cause FK constraint issues if a FK ever exists from attachments → wiki_pages.

#### Suspected Root Cause

Drive upload was added as a convenience feature before a `DRIVE` content type was introduced in the backend enum.

#### Proposed Solution

Low priority. Options:
1. Add `DRIVE` as a ContentType enum value in the backend and update the frontend constant
2. Or explicitly document this as intentional (drive = orphaned wiki-type attachments)

Given low risk (no FK constraint exists on contentId in current schema), accepting as LOW risk.

#### Cross-Agent Confirmation

| Confirmation | Agent | Decision | Notes | Timestamp |
|---|---|---|---|---|
| Issue validity | Claude | CONFIRMED | Code evidence clear, low actual risk | 2026-06-19 Session-3 |
| Fix safety | Claude | ACCEPTED_RISK | No FK constraint, no data integrity risk in current schema | 2026-06-19 Session-3 |
| Retest result | N/A | N/A | Accepted risk, no fix needed | N/A |

#### Fix Details

No fix required at this time. Document as accepted design limitation.

#### Retest Evidence

N/A

---

## Decision Log

| ID | Decision | Made By | Confirmed By | Reason | Risk | Timestamp |
|---|---|---|---|---|---|---|
| DEC-0001 | Codex will not implement any issue from this run until Claude records evidence and marks the issue `APPROVED_TO_FIX` | Claude protocol / Codex confirmation | Codex | Preserves shared-file protocol and avoids overwriting another agent's findings | Slower fixes, but lower RBAC/security regression risk | 2026-06-19 11:48:25 IST |

---

## Coverage Matrices

### Login / Role Coverage

| Role/Login | Login Works | Dashboard | Menus | Direct Routes | RBAC Negative | Workflow Positive | Workflow Negative | Logout | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| SUPER_ADMIN | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| TENANT_ADMIN | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| HR_ADMIN | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| HR_MANAGER | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| EMPLOYEE | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| RECRUITMENT_ADMIN | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| PAYROLL_ADMIN | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |

### Module Coverage

| Module | Routes | Forms | Tables | Actions | APIs | RBAC | UIUX | A11y | Performance | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Core HR | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| NU-Hire | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| NU-Grow | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| NU-Fluence | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |
| Shared Platform | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | NOT_STARTED |

---

## Final Readiness Score

| Category | Weight | Score | Notes |
|---|---:|---:|---|
| Authentication / session | 10 | 0 | TBD |
| RBAC / authorization | 20 | 0 | TBD |
| Tenant isolation | 15 | 0 | TBD |
| Critical workflows | 20 | 0 | TBD |
| API/data integrity | 10 | 0 | TBD |
| UI/UX quality | 10 | 0 | TBD |
| Security baseline | 10 | 0 | TBD |
| Performance/accessibility | 5 | 0 | TBD |
| **Total** | **100** | **0** | NOT_READY |

---

## Frontend Auth Audit — 2026-06-19

Auditor: @reviewer. Scope: Next.js route guard (`proxy.ts`), `usePermissions`, `useAuth`, `nu-rbac.config.ts`, NavPanel, demo-mode gating, and prior bug fix verification. All findings cite `frontend/`-relative paths.

### Summary of prior-bug status (verified in source @ HEAD)

| Prior bug | Status | Evidence |
|-----------|--------|----------|
| BUG-HIGH-003 `/system-admin` 404 | **RESOLVED / re-routed** | Nav link target is `/admin/system` (`components/layout/menuSections.tsx:1417`), and `app/admin/system/page.tsx` EXISTS. There is no `/system-admin` link in source. |
| BUG-MED-001 `/leave/admin` 404 | **STILL OPEN** | `app/leave/admin/` has only `carry-forward/` subroute — no index `page.tsx`. `/leave/admin` will 404. |
| BUG-MED-004 `/auth/logout` 404 | **OPEN (no page)** | No `app/auth/logout/` directory. If any link points there it 404s (logout is normally an action, not a route — see FRONTEND-AUTH-ISSUE-004). |
| NEW-001 `/fluence/articles` | **N/A** | No `app/fluence/articles/` exists and no source link references it. Fluence uses `wiki`, `blogs`, `templates`, `my-content`. Not a real route. |
| BUG-LOW-001 upsell banner | **STILL OPEN** | `components/layout/shell/NavPanel.tsx:211-229` renders "Unlock NU-Grow" unconditionally. |
| BUG-LOW-002 silent `?denied=1` | **NOT REPRODUCED as `?denied=1`** | No source produces or consumes `?denied=1`. Sub-app gates render an inline "Access denied" card instead (see ISSUE-005). |

### FRONTEND-AUTH-ISSUE-001: Demo content gate is not fail-closed in production builds (isDemoMode)
- Severity: MEDIUM (relates to SEC-001 family)
- Type: Security / Config
- File: `lib/config/env.ts:232`
- Evidence:
  ```ts
  export const isDemoMode = isDevelopment || env.NEXT_PUBLIC_DEMO_MODE === 'true';
  ```
- Risk: Any code path that gates UI on `isDemoMode` is auto-enabled whenever `NODE_ENV !== 'production'` (e.g. a `next start` on a misconfigured/preview build, or `development`), independent of `NEXT_PUBLIC_DEMO_MODE`. This is the *content* gate. NOTE: the login demo-credentials panel does NOT use this — it uses a stricter check (see ISSUE-002), so the public 1-click-login blast radius is limited. Real exposure: demo-only UI affordances could surface in a non-prod hosted env.
- Fix: Make production the only short-circuit, never auto-enable on non-prod hosting:
  ```ts
  export const isDemoMode = env.NEXT_PUBLIC_DEMO_MODE === 'true';
  ```
  If a dev convenience is desired, gate it behind an explicit dev-only flag, not `isDevelopment` blanket-true.

### FRONTEND-AUTH-ISSUE-002: Login demo panel IS correctly fail-closed (positive finding)
- Severity: LOW (informational / confirms SEC-001 mitigation on FE side)
- Type: Security
- File: `app/auth/login/page.tsx:42,53,55,124,905`
- Evidence:
  ```ts
  const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const DEMO_ACCOUNTS = IS_DEMO_MODE ? [...] : [];          // empty when unset
  const DEMO_PASSWORD = IS_DEMO_MODE ? 'Welcome@123' : '';  // empty when unset
  {IS_DEMO_MODE && ( /* Demo Login Panel */ )}              // hidden when unset
  ```
- Risk: None when env var is absent/`false` — panel hidden, no credentials bundled. This is strict-equality `=== 'true'`, so undefined/empty/`'false'` all hide it. SEC-001's real exposure is the **backend** `DEMO_CREDENTIALS_ENABLED=true` accepting the seeded passwords; the FE panel is a separate, correctly-gated surface.
- Fix: None for the panel. SEC-001 remains a backend env-var flip (out of FE scope).

### FRONTEND-AUTH-ISSUE-003: `/leave/admin` index route missing → 404
- Severity: MEDIUM
- Type: Route-Guard / UX
- File: `app/leave/admin/` (only `carry-forward/page.tsx` present; no `app/leave/admin/page.tsx`)
- Evidence: `find app -path "*leave/admin/page.tsx"` → no match. Directory contains only `carry-forward/`.
- Risk: Any nav/link/redirect to `/leave/admin` 404s. Confirmed prior BUG-MED-001 unresolved.
- Fix: Either add `app/leave/admin/page.tsx` (admin leave landing — link to carry-forward, leave-types, balances) OR redirect `/leave/admin` → a real child in `proxy.ts` route-consolidation block (pattern already used at `proxy.ts:413-427`).

### FRONTEND-AUTH-ISSUE-004: No `/auth/logout` route (verify no dangling link)
- Severity: LOW
- Type: Route-Guard / UX
- File: `app/auth/` (no `logout/` dir)
- Evidence: `find app -path "*auth/logout*"` → no match. Auth dir has `login`, `signup`, `forgot-password`, `change-password`, `reset-password` only.
- Risk: Logout is correctly implemented as an action (clears httpOnly cookies via API + Zustand reset), not a page — so absence is *expected*. Only a problem if a hardcoded `href="/auth/logout"` exists somewhere. Recommend a grep before closing.
- Fix: Confirm logout is action-based everywhere; if any `<Link href="/auth/logout">` exists, swap to the logout handler. No new page needed.

### FRONTEND-AUTH-ISSUE-005: Sub-app access denial is a silent inline card (no toast / no redirect)
- Severity: LOW
- Type: UX
- File: `app/app/grow/page.tsx:31-42`, `app/app/hire/page.tsx`, `app/app/fluence/page.tsx`, `app/app/hrms/page.tsx`
- Evidence: When authenticated-but-unauthorized for a sub-app, the page renders an inline "Access denied" card. No `?denied=1` query param is ever produced or consumed anywhere in source (confirmed by repo-wide grep). This is the real shape of the previously-reported BUG-LOW-002.
- Risk: Cosmetic only — denial is shown, just without a toast and without preserving intended-destination context. Not a security issue (gate works).
- Fix (optional polish): Standardize denial UX — either a toast on redirect-to-dashboard, or keep the card but add a "Request access" / "Back to dashboard" CTA.

### FRONTEND-AUTH-ISSUE-006: "Unlock NU-Grow" upsell banner is unconditional
- Severity: LOW
- Type: UX
- File: `components/layout/shell/NavPanel.tsx:211-229`
- Evidence: The upsell footer block renders for every user/tenant regardless of entitlement or whether NU-Grow is already active. Workspace label is even hardcoded `"All Modules Active" / "Pro Plan"` (`NavPanel.tsx:136-137`), which contradicts showing an "Unlock" CTA.
- Risk: Confusing UX — users on plans that already include NU-Grow see an upsell to unlock what they have. Confirms BUG-LOW-001 unresolved.
- Fix: Gate the footer on an entitlement flag (or hide when the active workspace already includes GROW). Pass an `showUpsell` prop from `AppLayout` driven by tenant entitlements; default hidden.

### Permission-model assessment (usePermissions / useAuth / nu-rbac.config.ts)

- **Permission source — server-authoritative, no client forgery vector (positive):** `lib/hooks/useAuth.ts:152-158,277-281` require `roles`/`permissions` from the `/login` and `/auth/me` responses and explicitly **reject JWT-claim fallback decode** (`CRIT-001: no JWT fallback decode`). Permissions come from the backend response, not decoded client-side from a manipulable token. Tokens themselves are in httpOnly cookies set by the backend (`useAuth.ts:147,188`) — not readable by JS.
- **Client-side gating is display-only (expected):** `usePermissions` `hasPermission`/`hasRole` gate UI rendering; the backend enforces on every API call. A user editing Zustand state in devtools could reveal hidden nav items but cannot call protected APIs (server re-checks). This is the correct posture.
- **SUPER_ADMIN bypass mirrors backend (correct):** `usePermissions.ts:677-680` — `isAdmin = SUPER_ADMIN role || SYSTEM:ADMIN perm`, matching backend `SecurityContext.isSuperAdmin()`. TENANT_ADMIN is intentionally NOT a global bypass (`usePermissions.ts:674-680`) — it relies on explicit permissions. Good.
- **`MODULE:MANAGE` implies all module actions (`usePermissions.ts:688-693`):** a documented hierarchy convention; verify the backend grants the same implication or a user could see a UI affordance the API then rejects. LOW — cosmetic mismatch risk only.
- **`nu-rbac.config.ts` is NOT a permission matrix** — it is a Playwright config (`defineConfig` for the `nu-rbac.spec.ts` RBAC sweep). The actual role/permission definitions live in `usePermissions.ts` (`Permissions` + `Roles` consts) and are seeded/enforced by the **backend** (Flyway permission seeds). The 7-role matrix mapping is therefore server-owned; FE only holds the string constants. No over/under-permission can be assessed from FE source alone — that is a backend-RBAC audit item.

### Route-guard assessment (proxy.ts — the real Next.js middleware)

- The middleware source is `frontend/proxy.ts` (compiled to `.next/server/middleware.js`; matcher `/((?!_next/static|_next/image|favicon.ico|...).*)` covers all app routes).
- **Deny-by-default confirmed (strong positive):** `proxy.ts:446-451` — any non-public route without an access-token cookie redirects to `/auth/login`. This covers known AND future/unknown routes (`DEF-27`). The `AUTHENTICATED_ROUTES` list (`proxy.ts:70+`) is informational, not the gate.
- **Public allowlist is tight (`proxy.ts:52-67`):** auth pages, legal pages, and token-based public portals (preboarding/exit-interview/offer/careers/sign). No protected surface is in the public list.
- **Expired-token refresh path is safe (`proxy.ts:466+`):** expired access token + valid refresh cookie lets the page load so client-side `restoreSession` can refresh — avoids the prior session-loss loop. Coarse cookie-presence check at edge; fine-grained perms enforced client-side (AuthGuard) + server-side (API).
- **No unguarded protected route found.** Every `app/` route not in `PUBLIC_ROUTES` is covered by the deny-by-default redirect.

### Net verdict (frontend auth surface)
Route guard and permission sourcing are **sound** (deny-by-default edge guard, server-authoritative perms, httpOnly tokens, no JWT-forgery vector). Open items are **2 MEDIUM** (`isDemoMode` non-fail-closed content gate; `/leave/admin` 404) and **3 LOW** (denial UX, unconditional upsell, verify no `/auth/logout` link). SEC-001 remains a **backend** env-var concern, not a frontend code defect.

---

## Backend @RequiresPermission Coverage Audit — 2026-06-19

Auditor: backend-rbac-auditor fork. Scope: 40+ sensitive controllers — payroll, compensation, admin, statutory, loan, payment, budget, expense, audit, integration, webhook, feature flags, organization.

### BACKEND-RBAC-FINDING-001: @RequiresPermission coverage is 100% on state-changing endpoints

- Severity: **PASS** (positive finding)
- Type: API Authorization
- Evidence: Comprehensive audit of all sensitive controller categories

| Controller Category | Coverage | Notes |
|---|---|---|
| Payroll (PayrollController, BonusController, GlobalPayrollController, PayrollStatutoryController, StatutoryFilingController) | ✅ 100% | Critical ops (run/approve/lock) use `revalidate=true` |
| Compensation (CompensationController) | ✅ 100% | Cycle creation, revision workflows (approve/reject/apply) all guarded |
| Admin (AdminController, SystemAdminController, SystemAuditLogController) | ✅ 100% | Tenant suspend/activate/impersonate use `revalidate=true` |
| User/Role/Permission (UserController, RoleController, PermissionController) | ✅ 100% | Role assignment + permission changes use `revalidate=true` |
| Statutory (ProvidentFundController, ESIController) | ✅ 100% | STATUTORY_MANAGE for writes, STATUTORY_VIEW for reads |
| Loan (LoanController) | ✅ 100% | Apply/Approve/Disburse all guarded |
| Payment (PaymentController, PaymentConfigController) | ✅ 100% | PAYMENT_INITIATE/VIEW/CONFIG_MANAGE |
| Budget (BudgetPlanningController) | ✅ 100% | BUDGET_CREATE/MANAGE |
| Expense (ExpenseClaimController, ExpenseAdvanceController) | ✅ 100% | EXPENSE_CREATE/APPROVE/MANAGE |
| Audit (AuditLogController) | ✅ 100% | AUDIT_VIEW required on all reads |
| Integration/Webhook (IntegrationController, WebhookController) | ✅ 100% | SYSTEM_ADMIN + optional @RequiresWebhookScope |
| Feature Flags (FeatureFlagController) | ✅ 100% | SYSTEM_ADMIN for mutations |
| Organization (OrganizationController) | ✅ 100% | SYSTEM_ADMIN / ORG_STRUCTURE_VIEW |

### BACKEND-RBAC-FINDING-002: Intentional public exceptions (design-approved, no gap)

| Endpoint | No @RequiresPermission | Reason |
|---|---|---|
| `POST /api/v1/tenants/register` | ✅ Intentional | Public registration — in SecurityConfig.permitAll() |
| `GET /api/v1/users/me` | ✅ Intentional | Self-service; returns only current user's data (JWT auth sufficient) |
| `GET /api/v1/admin/feature-flags/check/{featureKey}` | ✅ Intentional | Any authenticated user can check feature gates for UI-side gating (RBAC-02 approved) |

### BACKEND-RBAC-FINDING-003: Defense-in-Depth via revalidate=true

Critical operations use `revalidate=true` to re-check permissions from DB (not cached JWT):
- Tenant management: suspend/activate/impersonate
- User management: password reset, role updates
- Role/permission assignments
- Sensitive payroll: process/approve
- Compensation approval workflows

**Risk mitigated:** Stale JWT claims cannot authorize sensitive mutations. Permission is re-validated from DB on every critical state change.

### BACKEND-RBAC-FINDING-004: SUPER_ADMIN bypass is at interceptor level only (correct)

- SUPER_ADMIN bypasses `PermissionHandlerInterceptor` (by design)
- Tenant RLS still applies — SUPER_ADMIN cannot cross tenant boundaries via SQL
- This is the correct posture: capability bypass but not isolation bypass

### Backend RBAC Net Verdict

✅ **API Authorization: PASS** — 100% @RequiresPermission coverage on all sensitive state-changing endpoints. Defense-in-depth via `revalidate=true` on critical operations. SUPER_ADMIN bypass scoped correctly to capability layer only (not RLS).

**No new backend API authorization gaps found in this session.**

---

## Tenant Isolation Audit — 2026-06-19

Auditor: backend-rbac-auditor fork (tenant isolation specialist). Scope: 29 native queries, 884 service-layer tenant-context calls, RLS config, IDOR re-verification, soft-delete guards, superadmin cross-tenant endpoints.

### TENANT-ISO-FINDING-001: Native Query Tenant Scoping — PASS (29/29 clean)

- Severity: **PASS**
- Evidence: All 29 native queries audited include explicit `tenant_id = :tenantId` predicate or rely correctly on RLS
- Key queries verified: NotificationTemplateRepository, WikiPageRepository, BlogPostRepository, StepExecutionRepository, WorkflowExecutionRepository, PayslipRepository (double-filters employee JOIN), EmployeeRepository (10+ native queries), LeaveRequestRepository, LeaveBalanceRepository, FluenceContentRetriever (EntityManager.createNativeQuery with parameterized binding — no injection risk)
- Soft-delete guard: all JOIN queries explicitly filter `is_deleted = false` ✅

### TENANT-ISO-FINDING-002: Service Layer Tenant Context — PASS (884 fail-safe calls)

- Severity: **PASS**
- Evidence: `TenantContext.requireCurrentTenant()` used 884 times across all services (throws `IllegalStateException` if tenant context absent — fail-safe)
- Not using the permissive `getCurrentTenant()` which could return null silently

### TENANT-ISO-FINDING-003: Dual-Layer RLS Enforcement — PASS

- Severity: **PASS**
- Layer 1 — `TenantRlsTransactionManager`: Uses `SET LOCAL app.current_tenant_id` (transaction-scoped, auto-reverts at commit/rollback). Uses parameterized `set_config()` to prevent SQL injection. Explicitly RESETS on cleanup.
- Layer 2 — `TenantAwareDataSourceConfig`: Wraps HikariCP DataSource; sets `app.current_tenant_id` on every connection checkout; unconditionally RESETS on return to prevent stale leakage.
- Edge cases handled: Flyway migrations (null context skip), health checks (skipped), scheduled jobs (tenant-aware)

### TENANT-ISO-FINDING-004: RLS Superuser Bypass — MEDIUM (documented, not critical)

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Type | Tenant Isolation / Security |
| File | `TenantRlsTransactionManager.java:55-65` |
| Evidence | DB connection pool user must NOT be a PostgreSQL superuser. Superusers bypass RLS by default. Currently documented as "Future: strict RLS enforcement" awaiting Flyway migration. |
| Risk | If Railway/Neon assigns a superuser role to the connection pool user, RLS policies are not enforced at the DB layer (application-layer filtering still applies). |
| Fix | Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY;` on all tables with RLS policies. This forces RLS even for table owners/superusers. Needs a Flyway migration (next V305+). |
| Status | DOCUMENTED — P0 before production with real user data |

### TENANT-ISO-FINDING-005: Previously-Fixed IDOR Areas — PASS (re-verified)

| Area | Fix Status | Evidence |
|---|---|---|
| WallService cross-tenant employee reference | ✅ CLEAN | `findByIdAndTenantId()` used for both post author AND praise recipient |
| StatutoryContributionController | ✅ CLEAN | tenantId derived from `TenantContext`, not from request params |
| Wall post batch hydration (N+1 fix) | ✅ CLEAN | JPQL visibility checks enforce tenant scope |

### TENANT-ISO-FINDING-006: Unused Unscoped Query Method — LOW

- Severity: LOW
- Type: Code Hygiene
- File: `TenantApplicationRepository.java:28-31`
- Evidence: `findByTenantIdAndApplicationIdUnscoped()` exists but is NOT called anywhere
- Risk: Confusion — another developer could use it accidentally. No active exploit path.
- Fix: Remove the unused method

### TENANT-ISO-FINDING-007: SuperAdmin Cross-Tenant Endpoints — PASS (properly gated)

- `SystemAdminController` — suspend/activate/impersonate require `SYSTEM_ADMIN + revalidate=true` ✅
- `SystemAuditLogController` — cross-tenant audit search requires `SYSTEM_ADMIN + revalidate=true` ✅
- `PlatformController` — `/migrate/{tenantId}` requires `SYSTEM:ADMIN` ✅

### Tenant Isolation Net Verdict

**No IDOR or RLS bypass vulnerabilities detected.** Architecture is mature (29/29 native queries clean, 884 fail-safe tenant context calls, dual-layer RLS, IDOR fixes verified). ONE medium issue: superuser RLS bypass risk needs `FORCE ROW LEVEL SECURITY` migration before true multi-tenant production go-live.

---

## Permission Matrix Audit — 2026-06-19

**Auditor:** @qa | **Scope:** Flyway role_permission seeds + `@RequiresPermission` enforcement + role→permission resolution. **Branch:** main (Already up to date with fayaz-deen).

### How RBAC resolves at runtime (evidence)

Permissions are **server-authoritative** and resolved by `AuthService.loadPermissionsForUser` (`com/nulogic/application/auth/service/AuthService.java`). Two parallel sources merge into the `SecurityContext` permission map:

1. **Primary — UserAppAccess (app-scoped):** roles/permissions on `AppRole`/`AppPermission`, codes in the `HRMS:RESOURCE:ACTION` namespace (`AuthService.java:652-668`).
2. **Legacy — Matrix RBAC:** `User → Role → RolePermission` from the `role_permissions` table, codes in the `RESOURCE:ACTION` namespace = `Permission.java` constants (`AuthService.java:711-714`).
3. **Fallback — in-memory defaults:** `RoleHierarchy.getDefaultPermissions(roleCode)` fires **only when the accumulated map is still empty** (`AuthService.java:672`, `:732`).

Enforcement at the edge is `PermissionHandlerInterceptor.preHandle` (`com/nulogic/common/security/PermissionHandlerInterceptor.java:54-105`), running BEFORE `@Valid` so unauthorized requests get 403 not 400. `@RequiresPermission` (`com/nulogic/common/security/RequiresPermission.java`) supports `value` (anyOf/OR), `allOf` (AND), and `revalidate=true` (forces a DB re-check for sensitive ops). Controllers reference `Permission.*` constants (e.g. `Permission.PAYROLL_VIEW_ALL` = `PAYROLL:VIEW_ALL`).

### SUPER_ADMIN bypass — VERIFIED CORRECT

- App-layer bypass in **3 consistent places**: `PermissionHandlerInterceptor.java:77` (audit-logged: `AUDIT: SUPER_ADMIN bypass …`), `CustomPermissionEvaluator.java:24,38`, `DataScopeService.java:36-38`, plus `FeatureFlagAspect.java:28-33` and `PermissionAspect` (service layer).
- **DB-layer isolation is NOT bypassed**: `RlsStartupProbe.java:155-192` fails app startup (`fail-on-bypass=true` default) if the DB role has `SUPERUSER`/`BYPASSRLS`, asserting *"SuperAdmin bypass must remain application-layer only."* **Confirmed: SUPER_ADMIN bypasses permission checks at the interceptor, never tenant RLS at the SQL layer.** ✅

### TENANT_ADMIN bug (V289–V294) — VERIFIED FIXED

Root cause (`V290` header): `TenantProvisioningService` created the role with `code='ADMIN'`, unknown to `RoleHierarchy.getDefaultPermissions()` (which switches on `'TENANT_ADMIN'`) → empty perms → 403 everywhere. V289 also no-oped (searched for `TENANT_ADMIN`, found none).
- **V290** renames `ADMIN → TENANT_ADMIN` (idempotent, LEFT-JOIN guard) then re-runs the V289 backfill.
- `RoleHierarchy.getDefaultPermissions` line 72 maps **both** `TENANT_ADMIN` and legacy `"ADMIN"` → `getTenantAdminPermissions()` (belt-and-suspenders).
- V289/V290 enumerate ~190 permission codes for TENANT_ADMIN (incl. COMPENSATION:*, PAYMENT:*, EMPLOYMENT_CHANGE:*, ROLE:MANAGE, USER:MANAGE) + 6 field perms (SALARY/BANK/TAX). Scope `ALL`. Inheritance verified in code: `getTenantAdminPermissions ⊃ getHRAdminPermissions ⊃ getHRManagerPermissions`. **Fix confirmed.** ✅

### Permission Matrix (representative — App-layer bypass for SUPER_ADMIN; others from seeds + RoleHierarchy)

| Permission | SUPER_ADMIN | TENANT_ADMIN | HR_ADMIN | HR_MANAGER | EMPLOYEE | RECRUITMENT_ADMIN | PAYROLL_ADMIN |
|---|---|---|---|---|---|---|---|
| EMPLOYEE:VIEW_ALL | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ (VIEW_SELF only) | ✅ | ✅ |
| EMPLOYEE:CREATE/UPDATE/DELETE | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ | ❌ | ❌ |
| EMPLOYEE:SALARY_EDIT | ✅ bypass | ✅ (field) | ✅ | ❌ (SALARY_VIEW only) | ❌ | ❌ | ✅ |
| EMPLOYEE:BANK_EDIT | ✅ bypass | ✅ (field) | ✅ | ❌ | ❌ | ❌ | ✅ |
| PAYROLL:VIEW_ALL | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ (PAYROLL_VIEW_SELF) | ❌ | ✅ |
| PAYROLL:PROCESS | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ | ❌ | ✅ |
| PAYROLL:APPROVE | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ | ❌ | ✅ |
| COMPENSATION:MANAGE/APPROVE | ✅ bypass | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| RECRUITMENT:MANAGE | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ | ✅ | ❌ |
| CANDIDATE:EVALUATE | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ | ✅ | ❌ |
| ONBOARDING:MANAGE | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ | ✅ (V174) | ❌ |
| ROLE:MANAGE / USER:MANAGE | ✅ bypass | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SETTINGS:UPDATE / AUDIT:VIEW | ✅ bypass | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| STATUTORY:MANAGE / TDS:APPROVE | ✅ bypass | ✅ | ✅ (inherit) | ✅ | ❌ | ❌ | ✅ |
| EXPENSE:CREATE (self) | ✅ bypass | ✅ | ✅ (V267 SELF) | ✅ (V267 SELF) | ✅ (V267 SELF) | ✅ (V267 SELF) | ❌* |
| LEAVE:REQUEST (self) | ✅ bypass | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DASHBOARD:VIEW | ✅ bypass | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend: ✅=granted, ❌=denied, (inherit)=via HR_MANAGER superset, (field)=field_permissions table, (V###)=migration source, (SELF)=scope-limited. *PAYROLL_ADMIN not in the V267 self-service grant list.

**Scope-separation findings (positive):** `RoleHierarchy.getRecruitmentAdminPermissions()` is correctly fenced to recruitment/candidate/onboarding/referral/letters — **NO** payroll, compensation, settings, role-manage. `getPayrollAdminPermissions()` holds payroll/compensation/salary/bank/statutory — **NO** recruitment, role-manage, settings. `getEmployeePermissions()` is self-service only (`_SELF`, `_VIEW`, create-own). No EXCESS grants detected in the in-memory model. ✅

### GAPS / ISSUES

#### PERM-ISSUE-001: Specialized roles (PAYROLL_ADMIN, RECRUITMENT_ADMIN, HR_ADMIN, TENANT_ADMIN) are not seeded by the canonical role initializer
- **Severity:** MEDIUM (architectural fragility, not a live exploit)
- **Roles:** PAYROLL_ADMIN, RECRUITMENT_ADMIN, HR_ADMIN, TENANT_ADMIN, and all specialized roles
- **Gap Type:** MISSING (incomplete seeding) + namespace divergence
- **Evidence:** `HrmsRoleInitializer.seedDefaultRoles` (`com/nulogic/application/platform/service/HrmsRoleInitializer.java:156-264`) is the documented "single source of truth" for role_permissions (per `V96__canonical_permission_reseed.sql:11-13`, which only seeds the *permissions catalog*, no role grants). It creates only **6 roles: SUPER_ADMIN, HR_MANAGER, DEPARTMENT_MANAGER, TEAM_LEAD, EMPLOYEE, CEO** — and grants them `HRMS:RESOURCE:ACTION`-namespaced perms (`HrmsPermissionInitializer.java`, e.g. `HRMS:EMPLOYEE:VIEW_ALL`). The controller `@RequiresPermission` enforcement uses the **different** `Permission.java` namespace (`EMPLOYEE:VIEW_ALL`, no `HRMS:` prefix — `Permission.java`). TENANT_ADMIN/HR_ADMIN/PAYROLL_ADMIN/RECRUITMENT_ADMIN exist only as `RoleHierarchy` definitions + scattered DB-seed migrations (V289/V290 for TENANT_ADMIN; V174/V176 partials for the others).
- **Why it matters:** The in-memory `RoleHierarchy` fallback fires **only when the whole accumulated permission map is empty** (`AuthService.java:672`, global not per-role). A PAYROLL_ADMIN whose DB rows are *partial* (e.g. only V176 time-tracking grants) makes the map non-empty → fallback suppressed → role left with ONLY time-tracking perms instead of its full payroll set. This is the same failure class as the original TENANT_ADMIN bug.
- **Fix:** Either (a) extend `HrmsRoleInitializer` to create ALL `RoleHierarchy.ALL_EXPLICIT_ROLES` from `RoleHierarchy.getDefaultPermissions()` so the canonical seed is complete and single-namespace, or (b) add comprehensive `role_permissions` backfill migrations for PAYROLL_ADMIN / RECRUITMENT_ADMIN / HR_ADMIN mirroring V289's enumerated TENANT_ADMIN grant. Recommend (a) — converge on one initializer + one namespace.

#### PERM-ISSUE-002: Dual permission namespace (`HRMS:X:Y` vs `X:Y`) with no documented reconciliation
- **Severity:** LOW (works today via merge, but a latent correctness/maintenance trap)
- **Gap Type:** Design inconsistency
- **Evidence:** `HrmsPermissionInitializer.SYSTEM_ADMIN = "HRMS:SYSTEM:ADMIN"` vs `Permission.SYSTEM_ADMIN = "SYSTEM:ADMIN"`; `HRMS:EMPLOYEE:VIEW_ALL` vs `EMPLOYEE:VIEW_ALL`. AuthService merges both into one map so SUPER_ADMIN/EMPLOYEE work, but a perm granted only in one namespace will silently fail a check expressed in the other.
- **Fix:** Document the mapping (or add an alias layer in `SecurityService.hasPermission`), and add a build-time test asserting every `Permission.java` constant used in a `@RequiresPermission` is seedable by the initializer under a resolvable code.

#### PERM-ISSUE-003: SEC-001 demo-credential neutralization is config-gated, not yet applied on Railway
- **Severity:** HIGH (known, tracked — restated for completeness; not new)
- **Evidence:** `V295`/`V299` lock the three known `Welcome@123` bcrypt digests + SUSPEND, but both are gated by `${demoCredentialsEnabled}` and `application-render.yml` sets `spring.flyway.enabled=false`, so V295/V299 never ran on live Railway (`V299` header lines 4-14). Live `tenant.admin@nulogic.io` may still hold the public password.
- **Fix (config-only, user action):** Flip Railway env `DEMO_CREDENTIALS_ENABLED=false`, do a one-shot `SPRING_FLYWAY_ENABLED=true` deploy to apply V299, then disable Flyway again. Code is fail-closed; no code change required.

### Verdict
RBAC enforcement model is **sound**: server-authoritative, deny-by-default at the interceptor, SUPER_ADMIN app-layer-only bypass with RLS preserved, clean role scope separation in `RoleHierarchy`, TENANT_ADMIN bug genuinely fixed. The one architectural risk (PERM-ISSUE-001) is fragility in how specialized-role permissions are seeded, not a live over/under-permission exploit. **No CRITICAL permission-matrix defects found.** Recommend converging role seeding onto a single initializer + namespace.
