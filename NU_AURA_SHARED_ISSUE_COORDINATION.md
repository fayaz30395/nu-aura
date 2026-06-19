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

### ISSUE-0001 — Title

| Field | Value |
|---|---|
| Discovered By | Claude / Codex |
| Module | Core HR / NU-Hire / NU-Grow / NU-Fluence / Shared / Security / RBAC |
| Role/Login | SUPER_ADMIN / TENANT_ADMIN / HR_ADMIN / HR_MANAGER / EMPLOYEE / RECRUITMENT_ADMIN / PAYROLL_ADMIN / Other |
| URL/Route | TBD |
| Severity | BLOCKER / CRITICAL / HIGH / MEDIUM / LOW |
| Type | Functional / RBAC / Security / UIUX / API / Data / Performance / Accessibility / Regression |
| Environment | Live URL / Local / Both |
| Reproducibility | Always / Intermittent / Once |
| Status | NEW / CONFIRMED / NEEDS_MORE_EVIDENCE / SOLUTION_PROPOSED / APPROVED_TO_FIX / FIXING / FIXED_PENDING_RETEST / RETEST_PASSED / RETEST_FAILED / ACCEPTED_RISK |

#### Evidence

- Screenshot/video path:
- Console error:
- Network request/response:
- Test data:
- Browser steps:

#### Reproduction Steps

1. TBD
2. TBD
3. TBD

#### Expected Result

TBD

#### Actual Result

TBD

#### Suspected Root Cause

TBD

#### Proposed Solution

TBD

#### Cross-Agent Confirmation

| Confirmation | Agent | Decision | Notes | Timestamp |
|---|---|---|---|---|
| Issue validity | TBD | CONFIRMED / REJECTED / MORE_EVIDENCE | TBD | TBD |
| Fix safety | TBD | APPROVED / REJECTED / REVISE | TBD | TBD |
| Retest result | TBD | PASSED / FAILED | TBD | TBD |

#### Fix Details

- Files changed:
- Code summary:
- Tests added/updated:
- Migration/config impact:
- Rollback plan:

#### Retest Evidence

- Retested by:
- Browser/role:
- Steps repeated:
- Result:
- Screenshot/video path:
- Regression impact:

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
