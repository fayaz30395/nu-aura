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

---

## Agent Status Board

| Agent | Current Task | Status | Blocker | Last Update |
|---|---|---|---|---|
| Claude | Orchestration — Parallel RBAC/Security/Tenant/Browser swarm | IN_PROGRESS | None | 2026-06-19 Session-3 parallel launch |
| Codex | Awaiting APPROVED_TO_FIX issues from Session-3 | READY_FOR_ISSUES | Waiting for agent findings | 2026-06-19 11:48:25 IST |
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

## Codex Focus Scope

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
