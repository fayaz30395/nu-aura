# Nu-HRMS Beta Launch — Discovery Dashboard

> **Sprint:** 1-week internal beta launch | **Start:** 2026-03-22 | **Target:** 2026-03-29
> **Users:** 50-100 internal employees | **Status:** Phase 1 COMPLETE — Transitioning to Phase 2 (Fix Execution)

---

## Sprint Overview

| Phase | Days | Status |
|-------|------|--------|
| Phase 1: Parallel Discovery | Day 1 | COMPLETE |
| Phase 2: Sync & Prioritization | Day 1-2 | IN PROGRESS |
| Phase 3: Micro-Sprints | Days 2-5 | Not Started |
| Phase 4: Hardening | Days 6-7 | Not Started |

---

## Module Status (8 Must-Have)

### NU-HRMS Core (5 modules)

| Module | Backend | Frontend | RBAC | A11Y | QA | Overall |
|--------|---------|----------|------|------|-----|---------|
| Employee Management | OK | OK | OK | WARN (no aria/focus) | OK | Needs A11Y |
| Attendance & Time | OK | OK | WARN (sidebar gate) | WARN | OK | Gaps Found |
| Leave Management | OK | OK | WARN (sidebar gate) | WARN | OK | Gaps Found |
| Benefits Admin | OK | OK | WARN (wrong perms) | WARN | FAIL (0 tests) | Gaps Found |
| Asset Management | OK | OK | WARN (wrong perms) | WARN | OK | Gaps Found |

### NU-Hire (3 modules)

| Module | Backend | Frontend | RBAC | A11Y | QA | Overall |
|--------|---------|----------|------|------|-----|---------|
| Job Posting & Pipeline | OK | OK | OK | WARN | OK | Needs A11Y |
| Interview Scheduling | OK | OK | OK | WARN | FAIL (0 tests) | Gaps Found |
| Onboarding Workflows | OK | OK | WARN (preboarding) | WARN | OK | Gaps Found |

---

## Agent Progress Tracker

| Agent | Role | Discovery Focus | Status | Key Findings |
|-------|------|----------------|--------|--------------|
| Orchestrator | RBAC + Architecture | RBAC matrix validation, permission audit | COMPLETE | 6 RBAC gaps found (see below) |
| UX Research | User Experience | KEKA workflow analysis, user journeys | IN PROGRESS | Awaiting report |
| UI Design | Design System | Component audit, accessibility, design tokens | NOT ACTIVE | Role consolidated into Orchestrator |
| Dev Lead | Implementation | Feature gap analysis, bug triage, code health | NOT ACTIVE | Role consolidated into Orchestrator |
| Integration | API & Services | Service health, API contracts, Kafka flows | NOT ACTIVE | Role consolidated into Orchestrator |
| Code Reviewer | Quality Gates | Code quality baseline, security patterns | NOT ACTIVE | Role consolidated into Orchestrator |
| QA Lead | Testing | Test coverage, critical paths, regression suite | NOT ACTIVE | Role consolidated into Orchestrator |

---

## Priority Classification

### P0 — Critical Blockers (Must fix before beta)

| ID | Issue | Source | Effort | Owner | Status |
|----|-------|--------|--------|-------|--------|
| P0-001 | V67 migration not applied (40 RBAC permissions pending) | RBAC Audit | 5 min | Orchestrator | BLOCKED (backend restart) |
| P0-002 | BUG-006: Team Lead 403 on goals/reviews | QA Round 4 | 5 min (V67) | Orchestrator | Fix Ready |
| P0-003 | SEC-001: Hardcoded password `Welcome@123` in import services (no forced reset) | Security | 30 min | Orchestrator | Open |
| P0-004 | SEC-002: Fluence controllers missing `@RequiresPermission` (upload/delete exposed) | Security | 10 min | Orchestrator | Open |
| P0-005 | RBAC-001: JWT_SECRET uses default value in docker-compose | Security | 10 min | Orchestrator | Open |
| P0-006 | BUG-002: Employee directory search 500 | QA Round 4 | M | Orchestrator | Open |
| P0-007 | BUG-003: Workflow inbox NPE risk | QA Round 4 | M | Orchestrator | Open |
| P0-008 | BUG-004: Expenses empty UUID 500 | QA Round 4 | S | Orchestrator | Open |
| P0-009 | Assets/Benefits controllers use SYSTEM_ADMIN instead of module-specific perms | RBAC Audit | M | Orchestrator | Open |
| P0-010 | Preboarding permissions not assigned to HR/Recruitment roles in V67 | RBAC Audit | S | Orchestrator | Open |
| P0-011 | Sidebar hides Attendance/Leave/Benefits from employees (VIEW_ALL gate) | RBAC Audit | S | Orchestrator | Open |

### P1 — Must Fix (Beta quality)

| ID | Issue | Source | Effort | Owner | Status |
|----|-------|--------|--------|-------|--------|
| P1-001 | A11Y-001: Zero aria-labels on icon-only buttons (5/8 modules) | A11Y Audit | 2 hrs | Orchestrator | Open |
| P1-002 | A11Y-002: Zero explicit focus states (all 8 modules, WCAG violation) | A11Y Audit | 2 hrs | Orchestrator | Open |
| P1-003 | TEST-001: Benefits module has ZERO tests (2 controllers, 2 services) | QA Audit | 4 hrs | Orchestrator | Open |
| P1-004 | TEST-002: Interview Scheduling has ZERO tests (both services) | QA Audit | 3 hrs | Orchestrator | Open |
| P1-005 | BUG-001: LinkedIn endpoint 500 | QA Round 4 | S | Orchestrator | Open |
| P1-006 | BUG-005: Admin hydration mismatch | QA Round 4 | S | Orchestrator | Open |
| P1-007 | MobileAttendanceController /dashboard requires VIEW_ALL — should be VIEW_SELF | RBAC Audit | S | Orchestrator | Open |
| P1-008 | V60 seeds lowercase dot, V67 seeds UPPERCASE:COLON — dual format risk | RBAC Audit | Risk | Orchestrator | Monitor |

### P2 — Post Beta (Nice to have)

| ID | Issue | Source | Effort | Owner | Status |
|----|-------|--------|--------|-------|--------|
| P2-001 | Onboarding uses RECRUITMENT:* permissions instead of ONBOARDING:* | RBAC Audit | M | Orchestrator | Design Debt |
| P2-002 | Preboarding uses hardcoded strings instead of Permission.java constants | RBAC Audit | S | Orchestrator | Debt |
| P2-003 | .env not in .gitignore (commented out) | Security | 2 min | Orchestrator | Open |

---

## Known Issues (from QA Rounds 3-4)

Carried forward from MEMORY.md QA Round 4:

| Bug | Severity | Module | Description | Status |
|-----|----------|--------|-------------|--------|
| BUG-001 | Medium | Dashboard | LinkedIn endpoint 500 | Open |
| BUG-002 | High | People/Org Chart | Employee directory search 500 | Open |
| BUG-003 | High | Approvals | Workflow inbox NPE risk | Open |
| BUG-004 | High | Expenses | Empty UUID path variable | Open |
| BUG-005 | Medium | Admin Users | Hydration mismatch | Open |
| BUG-006 | Critical | Performance RBAC | Team Lead 403 on goals/reviews | Fix Ready (V67) |
| BUG-007 | Medium | Sidebar | SSR hydration mismatch | Fixed |

---

## Decision Log

| # | Date | Decision | Rationale | Impact |
|---|------|----------|-----------|--------|
| 1 | 2026-03-22 | Sprint scope: 8 modules (5 HRMS + 3 Hire) | Minimum viable for internal HR operations | Payroll, Performance, Fluence out of scope |
| 2 | 2026-03-22 | Single tenant deployment for beta | Reduces complexity, multi-tenant tested but not stressed | Can expand post-beta |
| 3 | 2026-03-22 | RBAC validation is P0 — prioritize before bug fixes | Security blocker for beta launch | V67 + controller fixes before feature work |
| 4 | 2026-03-22 | 4-wave fix plan: Quick Wins > RBAC > Bugs > Quality | Unblock fastest path to beta | Waves 1-2 today, Waves 3-4 Days 2-3 |

---

## Prioritized Fix Plan

### Wave 1: Quick Wins (Next 2 hours) — Unblock everything

| # | Task | P0 ID | Est | Files to Change |
|---|------|-------|-----|-----------------|
| 1 | Restart backend to apply V67 migration | P0-001, P0-002 | 5 min | None (ops) |
| 2 | Add `@RequiresFeature(ENABLE_FLUENCE)` to Fluence controllers | P0-004 | 10 min | WikiPageController, BlogPostController, TemplateController, FluenceChatController, KnowledgeSearchController |
| 3 | Rotate JWT_SECRET in docker-compose | P0-005 | 10 min | docker-compose.yml |
| 4 | Fix sidebar permission gates for employees | P0-011 | 30 min | frontend/components/layout/menuSections.tsx |
| 5 | Fix import service default passwords (force password change) | P0-003 | 30 min | EmployeeImportController.java, EmployeeImportService.java |
| 6 | Uncomment .env in .gitignore | P2-003 | 2 min | .gitignore |

### Wave 2: RBAC Fixes (2-4 hours) — Correct permission enforcement

| # | Task | P0 ID | Est | Files to Change |
|---|------|-------|-----|-----------------|
| 7 | Fix AssetManagementController: replace SYSTEM_ADMIN with ASSET:* perms | P0-009 | 30 min | AssetManagementController.java |
| 8 | Fix BenefitManagementController: replace SYSTEM_ADMIN with BENEFIT:* perms | P0-009 | 30 min | BenefitManagementController.java |
| 9 | Create V68 migration: assign PREBOARDING perms to HR/Recruitment roles | P0-010 | 30 min | V68__fix_preboarding_role_assignments.sql |
| 10 | Fix MobileAttendanceController /dashboard: allow VIEW_SELF | P1-007 | 15 min | MobileAttendanceController.java |
| 11 | Fix PreboardingController: use Permission.java constants | P2-002 | 15 min | PreboardingController.java |

### Wave 3: Bug Fixes (4-6 hours) — Resolve QA Round 4 bugs

| # | Task | P0 ID | Est | Files to Change |
|---|------|-------|-----|-----------------|
| 12 | Fix Employee directory search 500 | P0-006 | 1-2 hrs | EmployeeDirectoryService.java |
| 13 | Fix Workflow inbox NPE | P0-007 | 1-2 hrs | WorkflowService.java |
| 14 | Fix Expenses empty UUID 500 | P0-008 | 30 min | ExpenseClaimController.java |
| 15 | Fix LinkedIn endpoint 500 | P1-005 | 30 min | Dashboard API/Service |
| 16 | Fix Admin hydration mismatch | P1-006 | 30 min | admin/page.tsx |

### Wave 4: Quality & A11Y (Day 2-3) — Beta polish

| # | Task | P1 ID | Est | Files to Change |
|---|------|-------|-----|-----------------|
| 17 | Add aria-labels to icon-only buttons (5/8 modules) | P1-001 | 2 hrs | Multiple component files |
| 18 | Add focus-visible styles | P1-002 | 2 hrs | Tailwind config + component files |
| 19 | Write Benefits module tests | P1-003 | 4 hrs | New test files |
| 20 | Write Interview Scheduling tests | P1-004 | 3 hrs | New test files |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| RBAC matrix has undiscovered gaps | High | Critical | Full permission audit across all 8 modules | Architecture |
| Performance under 50-100 users untested | Medium | High | Load test critical endpoints | QA Lead |
| Third-party service instability | Low | Medium | Verify health, set up graceful degradation | Integration |
| V67 migration not yet applied | High | High | Restart backend to apply Flyway | Dev Lead |
| Open bugs from QA Round 4 | High | High | Triage and fix P0 bugs first | Dev Lead |

---

## Go/No-Go Checkpoints

| Checkpoint | Date | Criteria | Status |
|-----------|------|----------|--------|
| Day 2 Gate | 2026-03-23 | Discovery complete, P0 list finalized, work queue prioritized | Pending |
| Day 5 Gate | 2026-03-26 | All P0 fixed, 8 modules functional, RBAC validated | Pending |
| Day 7 Gate | 2026-03-28 | Full regression pass, monitoring live, rollback plan ready | Pending |

---

## Daily Updates

### Day 1 — 2026-03-22

- Sprint kicked off with parallel discovery
- Team size: 2 active agents (Orchestrator + UX Researcher), 5 roles consolidated
- Known: 7 open bugs from QA Round 4, V67 migration pending
- Dashboard created, tracking active
- **RBAC Validation Complete (Orchestrator):**
  - Audited all controllers for 8 must-have modules
  - Found 6 RBAC gaps, 4 sidebar visibility issues, 2 design debt items
  - V67 migration is well-structured but NOT YET APPLIED
  - Key finding: Assets and Benefits controllers use generic SYSTEM_ADMIN/EMPLOYEE_VIEW_SELF permissions instead of module-specific ones (ASSET:*, BENEFIT:*)
  - Key finding: Sidebar hides Attendance/Leave/Benefits from regular employees due to VIEW_ALL permission gates
  - Key finding: Preboarding permissions exist in V66 but not assigned to roles in V67

---

## RBAC Validation Report (Orchestrator — Day 1)

### Module-by-Module Analysis

**1. Employee Management** — RBAC OK
- Controllers: EmployeeController, DepartmentController, EmploymentChangeRequestController, EmployeeDirectoryController, TalentProfileController, EmployeeImportController
- All endpoints have `@RequiresPermission` annotations
- Uses proper scoped permissions: EMPLOYEE:VIEW_ALL, VIEW_DEPARTMENT, VIEW_TEAM, VIEW_SELF
- V60 seeds: employee.read, employee.create, employee.update, employee.delete for HR roles
- Frontend sidebar: Requires EMPLOYEE:VIEW_ALL (appropriate for admin view)

**2. Attendance** — RBAC GAPS FOUND
- Controllers: AttendanceController (17 endpoints), CompOffController, HolidayController, MobileAttendanceController, OfficeLocationController
- All endpoints have `@RequiresPermission`
- GAP: MobileAttendanceController `/dashboard` requires ATTENDANCE:VIEW_ALL but should be ATTENDANCE:VIEW_SELF (employees need their own dashboard)
- GAP: Sidebar attendance section requires ATTENDANCE:VIEW_ALL, hiding it from employees who only have ATTENDANCE:VIEW_SELF
- V60 seeds: attendance.read, attendance.manage (only for HR/Manager roles)
- V67 adds: ATTENDANCE:VIEW_SELF, VIEW_TEAM, VIEW_ALL, MARK, APPROVE for all role tiers

**3. Leave Management** — RBAC OK
- Controllers: LeaveRequestController, LeaveTypeController, LeaveBalanceController
- Good scoped permissions: LEAVE:VIEW_ALL, VIEW_TEAM, VIEW_SELF, REQUEST, APPROVE, REJECT, CANCEL
- V60 seeds: leave.read, leave.request, leave.approve, leave.manage
- V67 adds: LEAVE:VIEW_ALL, VIEW_TEAM, VIEW_SELF, CANCEL, REJECT
- GAP (minor): Sidebar "Leave Management" requires LEAVE:VIEW_ALL but has "My Leaves" sub-item with LEAVE:VIEW_SELF — parent hides children from employees

**4. Benefits Admin** — RBAC GAPS FOUND
- Controllers: BenefitManagementController (uses SYSTEM_ADMIN + EMPLOYEE_VIEW_SELF), BenefitEnhancedController (uses BENEFIT:VIEW, BENEFIT:VIEW_SELF, BENEFIT:ENROLL, SYSTEM_ADMIN)
- GAP: BenefitManagementController uses generic SYSTEM_ADMIN and EMPLOYEE_VIEW_SELF instead of BENEFIT:* permissions
- BenefitEnhancedController is better — uses proper module permissions
- V67 adds: BENEFIT:VIEW, VIEW_SELF, ENROLL, MANAGE for proper role tiers
- Sidebar requires BENEFIT:VIEW — employees with only BENEFIT:VIEW_SELF won't see it

**5. Asset Management** — RBAC GAPS FOUND
- Controller: AssetManagementController
- GAP: Uses generic SYSTEM_ADMIN for admin ops and EMPLOYEE_VIEW_SELF for read ops instead of ASSET:VIEW, ASSET:CREATE, ASSET:ASSIGN, ASSET:MANAGE
- Permission.java defines proper ASSET:* constants but controller doesn't use them
- V66 likely seeds ASSET:* permissions but controller references are to SYSTEM_ADMIN
- Sidebar requires ASSET:VIEW which is correct but controller doesn't use it

**6. Job Posting & Pipeline** — RBAC OK
- Controller: RecruitmentController (21 endpoints), ApplicantController, JobBoardController, AIRecruitmentController
- Uses proper RECRUITMENT:VIEW, CREATE, UPDATE, DELETE, MANAGE and CANDIDATE:VIEW
- V60 seeds: recruitment.read, recruitment.manage
- Well-structured with clear CRUD permission mapping

**7. Interview Scheduling** — RBAC OK
- Part of RecruitmentController (interviews section)
- Uses RECRUITMENT:VIEW for read, RECRUITMENT:CREATE for create, RECRUITMENT:UPDATE for update
- Properly gated

**8. Onboarding Workflows** — RBAC GAPS FOUND
- Controller: OnboardingManagementController, PreboardingController
- Onboarding uses RECRUITMENT:VIEW/MANAGE — technically works but semantically should use ONBOARDING:VIEW/MANAGE
- PreboardingController uses hardcoded strings ("PREBOARDING:VIEW", "PREBOARDING:MANAGE") instead of Permission.java constants
- GAP: V67 does NOT assign PREBOARDING:VIEW/CREATE/MANAGE to any role — V66 created the permissions but only assigned PREBOARDING:VIEW to EMPLOYEE role
- GAP: RECRUITMENT_ADMIN role needs ONBOARDING permissions explicitly

### Frontend Permission System — Analysis

- `usePermissions.ts` correctly implements SuperAdmin bypass (lines 637-641)
- Properly normalizes both dot-separated and colon-separated formats (lines 594-607)
- Supports `MODULE:MANAGE` implying all actions (lines 643-648)
- `menuSections.tsx` MY SPACE section correctly has NO requiredPermission
- Sidebar correctly gates admin sections by permission

### Cross-Cutting Issues

1. **V60 vs V67 format mismatch**: V60 seeds `employee.read` (lowercase dot), V67 seeds `EMPLOYEE:READ` (uppercase colon). Normalization in JwtAuthenticationFilter handles this but it's fragile — both formats coexist in DB.
2. **Sidebar parent-hides-children**: Several sidebar parents require ALL-level permissions, hiding sub-items that employees should see (My Leaves under Leave Management, for example).
3. **Two benefit controllers**: BenefitManagementController (old, uses SYSTEM_ADMIN) and BenefitEnhancedController (new, uses proper BENEFIT:* perms) — which one is active?
