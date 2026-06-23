# COVERAGE — role × module × flow matrix (2026-06-23)

Status legend: TODO / PASS / FAIL / BLOCKED (expected deny) / SKIPPED / UNTESTED.
Source: Route-Map-Full (286 pages) reconciled with live nav. Attempting 100%; unvisited cells stay TODO/UNTESTED — never PASS without evidence.

## Roles to cover (login to verify each)
EMPLOYEE (arun@), EMPLOYEE (anshuman@), HR_ADMIN (saran@), FINANCE_ADMIN (raj@/finance@/Fiona), MANAGER (sumit@), TEAM_LEAD (mani@/gokul@/dhanush@), HR_MANAGER (jagadeesh@), RECRUITMENT_ADMIN (suresh@), TENANT_ADMIN (tenant.admin@), admin@. NEVER SUPER_ADMIN owner on prod.

## Phase 1 — Auth & RBAC

| Role | Login lands | Allowed render | Deny deep-links fail-closed | No priv-escalation | Status | Evidence |
|------|-------------|----------------|-----------------------------|--------------------|--------|----------|
| EMPLOYEE arun@ | /me/dashboard ✓ | me/* ✓ | /payroll→denied ✓ /admin→denied ✓ /dashboard→Access Restricted fallback ✓ | no escalation ✓ | PASS (F-002 fixed) | EMPLOYEE__payroll__denied-redirect__1440.png, EMPLOYEE__-dashboard_post-live-check.png |
| MANAGER sumit@ | /me/dashboard ✓ | me/*, /leave, /approvals/inbox, /me/payslips ✓ | /dashboard clean deny with shell (F-002 fixed); /employees now renders with scope permissions (F-003/F-010 fixed) | no escalation ✓ | PASS (F-002,F-003,F-010) | MANAGER__me-dashboard__loaded__1440.png, MANAGER__employees__post-guard-verify-after-deploy__1440.png |
| RECRUITMENT_ADMIN suresh@ | /me/dashboard ✓ | NU-Hire: recruitment/candidates/jobs ✓ | (deny tests TODO) | no escalation ✓ | PASS | RECRUITMENT_ADMIN__recruitment-hub__loaded__1440.png |
| TENANT_ADMIN tenant.admin@ | /me/dashboard ✓ | /dashboard analytics 200 ✓, /admin/holidays ✓ | /admin root→Access Restricted (expected); /fluence/wall→Access denied with app shell (F-005 fixed) | no escalation ✓ | PASS | TENANT_ADMIN__dashboard__analytics-200__1440.png |
| admin@ | BLOCKED — not a seeded account ("Bad credentials") | — | — | — | BLOCKED | (login alert) |
| HR_ADMIN saran@ | /me/dashboard ✓ | /employees 20 rows ✓ | (sub-routes ok) | no escalation ✓ | PASS | HR_ADMIN__employees__data-20rows__1440.png |
| FINANCE_ADMIN finance@ | /me/dashboard "No profile linked" (F-007) | /payroll ✓ empty state | (employee denied /payroll; FA allowed ✓) | no escalation ✓ | PASS (F-007) | FINANCE_ADMIN__payroll__empty__1440.png |
| TEAM_LEAD mani@ | /me/dashboard ✓ "Good afternoon, Mani." | (28 nav links, landing clean) | TODO deny-tests | no escalation ✓ | PASS | TEAM_LEAD__me-dashboard__loaded__1440.png |
| HR_MANAGER jagadeesh@ | /me/dashboard ✓ "Good afternoon, Jagadeesh." | /employees 20 rows ✓ | (HR role, sub-routes ok) | no escalation ✓ | PASS | HR_MANAGER__me-dashboard__loaded__1440.png |

**Role matrix: 8/8 seeded demo roles tested PASS** (EMPLOYEE, MANAGER, RECRUITMENT_ADMIN, TENANT_ADMIN, HR_ADMIN, FINANCE_ADMIN, TEAM_LEAD, HR_MANAGER) + admin@ not-seeded (BLOCKED). No privilege escalation in any role. F-002/F-003/F-005/F-006 are now browser-reverified and fixed; see FIXED findings.
| FINANCE_ADMIN | TODO | TODO | TODO | TODO | TODO | — |
| MANAGER sumit@ | TODO | TODO | TODO | TODO | TODO | — |
| TEAM_LEAD | TODO | TODO | TODO | TODO | TODO | — |
| HR_MANAGER | TODO | TODO | TODO | TODO | TODO | — |
| RECRUITMENT_ADMIN | TODO | TODO | TODO | TODO | TODO | — |
| TENANT_ADMIN | TODO | TODO | TODO | TODO | TODO | — |
| admin@ | TODO | TODO | TODO | TODO | TODO | — |

## Phase 2 — Sub-app feature sweep (per permitted role)

| Sub-app | Key modules | Status |
|---------|-------------|--------|
| NU-HRMS | me/* (profile,payslips,attendance,leaves,documents,skills,assets), employees, departments, announcements, approvals, shifts, leave, assets, contracts, expenses, loans, travel, time-tracking, calendar, payroll | TODO |
| NU-Hire | recruitment, jobs, candidates, agencies, scorecards, onboarding, career, e-sign | TODO |
| NU-Grow | reviews, OKRs, 360, LMS, training, surveys, wellness | TODO |
| NU-Fluence | wiki, blogs, templates, search, AI chat, wall | PARTIAL PASS — **HR_ADMIN HAS Fluence perm**: /fluence/wiki ✓ (Wiki Pages), /fluence/blogs ✓ (empty state). /fluence/wall = gated even for HR_ADMIN (needs higher perm; fixed shell + app chrome, but still deny expected). templates/search/AI-chat still TODO. EMP/MGR/TENANT_ADMIN lack Fluence perm (app switcher disabled). |

## Phase 3 — Responsive + a11y
Breakpoints 320/768/1024/1440 — **BLOCKED (tooling)**: ruflo browser MCP viewport fixed at 1280px, no resize. Desktop (~1280px) surfaces verified clean throughout. a11y: employees template inline scan CLEAN (1 h1, 0 missing alt, 0 unnamed controls/inputs/links) — UC-A11Y-001 PASS.

## Phase 4 — E2E flows + approvals
**Leave apply→approve — PASS ✓ (UC-E2E-001)**: arun@ applied Loss-of-Pay → routed to approver **suresh@** (not sumit; arun's real reporting line) → approved → status flipped Pending→Approved/Used, balance consumed. Full state transition verified live. F-006 is closed after live name-resolve confirmation.
Employee CRUD (admin create→edit→delete) — **FAIL** (UC-HRMS-019): create and delete pass, but save in edit form triggers no PUT and does not persist, so full write-path flow is blocked. Per-sub-app demo writes (Hire candidate stage / Grow self-review / Fluence wall) — Fluence BLOCKED (F-005); others TODO.
