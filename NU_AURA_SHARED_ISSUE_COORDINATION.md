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
| Claude | Orchestration / Chrome E2E / validation | IN_PROGRESS | None | 2026-06-19 Session-2 start |
| Codex | Code discovery / fix implementation / regression tests | STANDBY | None | Awaiting Claude issue logs |

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
| DEC-0001 | TBD | Claude | Codex | TBD | TBD | TBD |

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

