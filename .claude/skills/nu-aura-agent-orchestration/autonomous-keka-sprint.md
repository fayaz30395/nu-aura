# NU-AURA Autonomous Production Hardening Sprint

> **One prompt. Paste it into Claude Code. Walk away.**
> Claude orchestrates architect → dev → reviewer subagents per fix, autonomously.

---

## THE MASTER PROMPT

Copy everything between the `---START---` and `---END---` markers below.
Paste into Claude Code at `~/IdeaProjects/nulogic/nu-aura`.

```
---START---

You are the NU-AURA Sprint Controller. Your job is to AUTONOMOUSLY fix production-quality gaps
by orchestrating subagents. Do NOT ask me questions. Make decisions yourself.
If blocked, skip the fix and move to the next one. Report at the end.

Read these files first (silently — do not output their contents):
- CLAUDE.md (coding rules)
- MEMORY.md (architecture state)
- .claude/skills/nu-aura-agent-orchestration/keka-gap-execution.md (the consolidated fix list)

=== EXECUTION MODEL ===

For EACH fix in priority order, run this autonomous loop:

STEP 1 — ANALYZE (run directly, no subagent):
Read the relevant source files for this fix. Understand current state.
Identify exact files to modify. List them.

STEP 2 — IMPLEMENT (spawn @dev subagent):
Dispatch a dev subagent (model: sonnet) with:
- The fix requirements from keka-gap-execution.md
- Exact file paths to modify (from STEP 1)
- Full NU-AURA context (paste the CONTEXT block below)
- Instruction: implement complete code, write tests where applicable, do NOT commit

STEP 3 — VERIFY (run directly, no subagent):
```bash
cd frontend && npx tsc --noEmit
```

If TypeScript errors: fix them yourself (do NOT spawn a subagent for TSC fixes).
If build breaks: revert changes and retry STEP 2 with more specific instructions.

STEP 4 — REVIEW (spawn @reviewer subagent):
Dispatch a reviewer subagent (model: sonnet) with:

- The files changed in STEP 2
- Review checklist:
  * Every endpoint has @RequiresPermission
  * No entity exposed in API response (DTOs only)
  * tenant_id filter on all queries
  * Pagination on list endpoints (Page<T> not List<T>)
  * No TypeScript `any`
  * No new Axios instances
  * Audit logging on sensitive operations
  * No N+1 queries
  * @Valid on all @RequestBody parameters
  * @Where(clause = "is_active = true") on soft-delete entities
    If reviewer finds CRITICAL issues: spawn a fix subagent, then re-review (max 2 cycles).
    If only MINOR/NIT: proceed.

STEP 5 — COMMIT (run directly):

```bash
git add -A
git commit -m "fix({module}): {fix description}

- {1-line summary of what was fixed}
- Files changed: {count}
{migration line if applicable}

Co-Authored-By: Claude <noreply@anthropic.com>"
```

STEP 6 — LOG & CONTINUE:
Record what was fixed. Move to the next fix. Do NOT wait for human input.

=== FIX EXECUTION ORDER ===

Execute in this exact order (P0 first, skip any that are already fixed):

PHASE 1 — BROKEN CROSS-MODULE INTEGRATIONS (Critical — users hit dead ends):

1. FIX-001: Overtime → Payroll Integration

- Create OvertimeApprovedEvent, publish from OvertimeService.approve()
- Create PayrollOvertimeListener in com.hrms.application.payroll/
- Add overtime earning component to payroll formula engine
- Files: OvertimeService.java, PayrollOvertimeListener.java (new), PayrollComponent enum

2. FIX-002: Expense Reimbursement → Payroll

- Publish ExpenseApprovedEvent from ExpenseApprovalCallback
- Create PayrollExpenseListener to insert reimbursement earning
- Handle partial vs full reimbursement based on policy limits
- Files: ExpenseApprovalCallback.java, PayrollExpenseListener.java (new)

3. FIX-005: Leave Without Pay → Payroll LOP Deduction

- In LeaveApprovalCallback, check leave type = LOP → publish LopLeaveApprovedEvent
- Create PayrollLopListener for LOP deduction (daily_salary × lop_days)
- Files: LeaveApprovalCallback.java, PayrollLopListener.java (new)

4. FIX-003: Performance Review → Compensation Revision

- Create ReviewCycleClosedEvent, publish from PerformanceReviewService.closeCycle()
- Create CompensationRevisionService for revision recommendations
- Rating-to-increment mapping config
- Frontend: "Generate Revisions" button on compensation page
- Migration: V101__compensation_revision_config.sql
- Files: PerformanceReviewService.java, CompensationRevisionService.java (new), compensation page

5. FIX-004: Training Completion → Performance

- Publish TrainingCompletedEvent from TrainingService.markComplete()
- Create PerformanceTrainingListener to update skill assessments
- Migration: V102__training_skill_mapping.sql
- Files: TrainingService.java, PerformanceTrainingListener.java (new)

6. FIX-006: Approval Notifications Missing

- Add notificationService.send() to ExpenseApprovalCallback, AssetApprovalCallback,
  OvertimeApprovalCallback
- Create notification templates for each workflow type
- Files: ExpenseApprovalCallback.java, AssetApprovalCallback.java, OvertimeApprovalCallback.java

PHASE 2 — BACKEND HARDENING (Production quality):

7. FIX-007: DTO Validation — Add @Valid to all controllers

- Audit all 143 controllers, add @Valid to every @RequestBody
- Add validation annotations to priority DTOs (Payroll, Leave, Expense, Performance)
- Verify MethodArgumentNotValidException handler in @ControllerAdvice
- Files: ALL controllers in com.hrms.api/

8. FIX-010: Soft Delete @Where — Add to all entities with is_active

- Audit all 265 entities, add @Where(clause = "is_active = true")
- Verify custom JPQL queries include is_active filter
- Files: ALL entities in com.hrms.domain/

9. FIX-008: Pagination — Convert List<T> to Page<T> on list endpoints

- Convert all list endpoints returning List<T> to Page<T> with Pageable
- Update repository methods: findAll() → findAll(Pageable)
- Update frontend to pass page/size params and render pagination
- Files: Controllers + Repositories returning List<T>

10. FIX-009: Audit Logging — Add to all sensitive service methods

- Create @Audited annotation + AuditAspect for declarative logging
- Apply to: PayrollService, PermissionService, EmployeeService, CompensationService, RoleService
- Log: userId, actionType, resourceType, resourceId, description, ipAddress
- Files: AuditAspect.java (new), @Audited.java (new), priority service classes

11. FIX-011: Kafka Event Publishing

- Wire Kafka producers for: EmployeeCreated, LeaveApproved, PayrollCompleted, ReviewCycleClosed,
  AttendanceMarked
- Verify DLT handlers work
- Add event schema version header
- Files: Event classes, KafkaProducerService.java, topic configs

PHASE 3 — FRONTEND UX P0 (Table infrastructure):

12. FIX-012: Column Visibility Toggle

- Create ColumnVisibilityToggle component (Mantine Popover + Checkbox)
- Store prefs in localStorage per table
- Apply to: employees, attendance, leave, payroll, expenses, assets, recruitment tables
- Files: components/ui/ColumnVisibilityToggle.tsx (new), all data table pages

13. FIX-013: Bulk Action Toolbar

- Create BulkActionToolbar component with row selection
- Backend batch endpoints: POST /api/v1/{module}/batch-{action} with @RequiresPermission
- Module actions: leave bulk approve/reject, attendance bulk regularize, payroll bulk approve
- Files: components/ui/BulkActionToolbar.tsx (new), batch controllers (new), data table pages

14. FIX-014: CSV/PDF/Excel Export

- Create ExportMenu component (CSV via PapaParse, Excel via ExcelJS, PDF via backend OpenPDF)
- Backend export endpoints: GET /api/v1/{module}/export/{format} with @RequiresPermission("
  module.export")
- Apply to all data tables
- Files: components/ui/ExportMenu.tsx (new), export controllers (new)

PHASE 4 — FRONTEND UX P1 (Forms & Polish):

15. FIX-015: Unsaved Changes Warning

- Create useUnsavedChangesWarning hook using formState.isDirty
- Browser beforeunload + Next.js router interception
- Mantine confirmation dialog
- Apply to all form pages
- Files: lib/hooks/useUnsavedChangesWarning.ts (new), form pages

16. FIX-016: Accessibility Baseline

- aria-label on all interactive elements
- Keyboard navigation: Tab/Enter/Escape for all actions
- Focus management in modals
- Skip-to-content link in AppLayout
- Color contrast audit on Sky palette
- Files: components/layout/AppLayout.tsx, all interactive components

17. FIX-017 through FIX-021: Polish Bundle (run remaining in parallel)

- FIX-017: AdvancedFilterPanel component + saved filter presets
- FIX-018: EditableCell component for inline table editing
- FIX-019: Dashboard widget drag-and-drop layout (@hello-pangea/dnd)
- FIX-020: Notification bell unread count + STOMP real-time push
- FIX-021: EmptyState component with illustrations + CTA buttons

=== PARALLEL OPTIMIZATION ===

Where possible, dispatch subagents in PARALLEL:

- FIX-001 + FIX-002 + FIX-005 can run in parallel — all payroll listeners, different event types
- FIX-007 + FIX-010 can run in parallel — both are annotation sweeps, different annotation types
- FIX-012 + FIX-013 + FIX-014 can run in parallel — different components, same data table pages (
  merge carefully)
- FIX-017 through FIX-021 can ALL run in parallel — fully independent components

When running parallel, use worktree isolation to prevent conflicts:
Agent(isolation: "worktree") for each parallel agent.

=== FAILURE HANDLING ===

If a subagent reports BLOCKED:

- Read the blocker reason
- If it's a missing file/context: provide it and re-dispatch
- If it's an architecture issue: make the decision yourself based on CLAUDE.md locked-in decisions
- If it's genuinely impossible: skip this fix, log the reason, move to next

If TypeScript check fails after implementation:

- Fix the errors yourself (usually import paths or type mismatches)
- Do NOT spawn a new subagent for trivial TSC fixes

If a reviewer blocks with CRITICAL:

- Spawn a fix subagent with the exact issue and file
- Re-review after fix
- Max 2 review cycles per fix — after that, commit with a TODO comment and move on

=== COMPLETION REPORT ===

After all fixes are processed, output a summary table:

| Fix                      | Status  | Migration | Files Changed | Issues |
|--------------------------|---------|-----------|---------------|--------|
| FIX-001 Overtime→Payroll | ✅ Fixed | None      | 3 files       | None   |
| FIX-002 Expense→Payroll  | ✅ Fixed | None      | 2 files       | None   |
| ...                      | ...     | ...       | ...           | ...    |

Then run:

```bash
cd frontend && npx tsc --noEmit
echo "---"
git log --oneline -20
echo "---"
git diff --stat HEAD~17
```

Report the final state. Do NOT push to remote (user will push from local terminal).

=== CONTEXT FOR ALL SUBAGENTS ===

Every subagent you spawn MUST include this context block:

PROJECT: NU-AURA — Multi-tenant enterprise HRMS bundle platform (NU-HRMS, NU-Hire, NU-Grow,
NU-Fluence)
STACK: Next.js 14 + Mantine UI + Tailwind (Sky) + TypeScript strict | Spring Boot 3.4.1 (Java 17) |
PostgreSQL (Neon dev) | Redis 7 | Kafka
PACKAGE ROOT: com.hrms (api/, application/, domain/, common/, infrastructure/)
AUTH: Google OAuth 2.0, JWT in cookies (NOT Authorization header), @RequiresPermission("
module.action")
MULTI-TENANT: tenant_id UUID on ALL tables, PostgreSQL RLS
RBAC: Super Admin > Tenant Admin > HR Admin (85) > App Admin > HR Manager > Hiring Manager > Team
Lead > Employee > Candidate > Viewer
SUPERADMIN: Bypasses ALL permission checks. Never block SuperAdmin.
PERMISSION FORMAT: DB = "module.action" (e.g., employee.read), Code = "MODULE:ACTION" (e.g.,
EMPLOYEE:READ)
FORMS: React Hook Form + Zod only. No uncontrolled inputs.
DATA FETCHING: React Query only. No raw useEffect + fetch.
HTTP: Existing Axios client in frontend/lib/api/ — NEVER create new instances.
TYPES: TypeScript strict. No `any`. Define proper interfaces.
UI: Mantine UI components. Sky palette (sky-700 primary). No purple.
TESTS: JUnit 5 + Mockito (backend), Playwright (E2E). JaCoCo 80% min.
DOMAIN EVENTS: Use DomainEventPublisher (Spring ApplicationEventPublisher with AFTER_COMMIT).
Pattern: Service publishes event → Listener in consuming module handles it.
APPROVAL ENGINE: workflow_def → workflow_step → approval_instance → approval_task. Callback via
ApprovalCallbackHandler implementations.
FLYWAY: Migrations at V100. Next = V101. Format: V{N}__{description}.sql

NOW BEGIN. Start with FIX-001 (Overtime → Payroll). Work autonomously. Do not ask for input.

---END---

```

---

## WHAT IT DOES

When you paste this into Claude Code, here's what happens:

1. Claude reads CLAUDE.md + MEMORY.md + the fix list
2. For each of the 21 fixes, it runs the 6-step autonomous loop:
   - Analyzes current code state
   - Spawns dev subagent → gets implementation
   - Runs `npx tsc --noEmit` → fixes errors
   - Spawns reviewer subagent → catches issues
   - Commits with proper message
   - Moves to next fix
3. Parallelizes where safe (payroll listeners, annotation sweeps, UI components)
4. Handles failures by skipping and logging
5. Outputs a final summary table with everything fixed

## ESTIMATED RUN

| Phase | Fixes | Est. Time | Token Multiplier |
|-------|-------|-----------|-----------------|
| Phase 1 (Integrations) | 6 | 90–120 min | 8× |
| Phase 2 (Backend) | 5 | 120–180 min | 10× |
| Phase 3 (Frontend P0) | 3 | 60–90 min | 6× |
| Phase 4 (Frontend P1) | 7 | 90–120 min | 8× |
| **TOTAL** | **21 fixes** | **~6–8 hrs** | **~32–40×** |

## IMPORTANT NOTES

- **Run this on Claude Code Pro/Max** — it will burn significant tokens (32–40× a single session)
- **Don't interrupt mid-execution** — the controller tracks state via TodoWrite and git commits
- **Each fix is atomic** — if you need to stop, you can resume by telling Claude to "continue from FIX-00N"
- **Git commits are per-fix** — easy to revert any single change if needed
- **No push happens** — you push from your local terminal when ready
- **Only 2 migrations** — most fixes are code-level (V101 and V102 only)

## SMALLER BITES (If you prefer phases)

Instead of the full 21-fix sprint, you can paste just one phase at a time.
Replace the FIX EXECUTION ORDER section with just the phase you want:

**Phase 1 only (highest impact — broken workflows):**
```

Execute only: FIX-001, FIX-002, FIX-005 (payroll integrations, run in parallel), then FIX-003,
FIX-004, FIX-006 (cross-module events).

```

**Phase 2 only (backend quality):**
```

Execute only: FIX-007 + FIX-010 (parallel annotation sweeps), then FIX-008, FIX-009, FIX-011 (
sequential).

```

**Phase 3 only (frontend table infrastructure):**
```

Execute only: FIX-012 Column Visibility, FIX-013 Bulk Actions, FIX-014 Export. Build in order (
shared table component pattern).

```

**Phase 4 only (frontend polish):**
```

Execute only: FIX-015 through FIX-021. FIX-015 and FIX-016 first, then FIX-017–021 in parallel.

```

This way you can validate the output between phases before continuing.
