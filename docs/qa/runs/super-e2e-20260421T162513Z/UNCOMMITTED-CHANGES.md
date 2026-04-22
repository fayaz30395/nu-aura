# Super E2E — Fixer Swarm Output (Uncommitted)

- **Run:** `super-e2e-20260421T162513Z`
- **Base SHA:** `0b3aee04866bc12dacb7168dfb5590b7d5dc1386`
- **Fixers:** 4 parallel backend-dev/frontend-specialist subagents
- **Status:** All 4 returned — changes on disk, no commit, backend NOT restarted

---

## F-01 (P0) — SuperAdmin `@RequiresPermission` bypass broken on ~10 endpoints

**Fixer:** backend-dev #1 · **Confidence:** M-H

**Root cause:** Role-claim shape drift between the two JWT issuer paths.

- `JwtTokenProvider.generateToken(Authentication,…):111` emits `"ROLE_SUPER_ADMIN"` via
  `GrantedAuthority::getAuthority`.
- `JwtTokenProvider.generateTokenWithAppPermissions:144` emits bare `"SUPER_ADMIN"`.
- `SecurityContext.hasRole()` was a plain `Set.contains()` — returns false for one of the two
  shapes.

Both bypass gates (`PermissionAspect:58`, `PermissionHandlerInterceptor:68`) route through
`hasRole("SUPER_ADMIN")`, so half the time SuperAdmin got 403.

**Fix (one place):**

- Modified `SecurityContext.hasRole(String)` + `hasAnyRole(…)` to accept both bare and `ROLE_`
  -prefixed claims. Role-code value matching still strict (no case folding, no substring).

**Files:**

- `backend/src/main/java/com/hrms/common/security/SecurityContext.java` (M)
- `backend/src/test/java/com/hrms/common/security/SuperAdminBypassTest.java` (NEW — 13 tests)

**Test run:** `mvn test -Dtest='SuperAdminBypassTest,SecurityContextTest'` → 74/74 pass.

---

## F-02 (P0) — `/api/v1/fluence/activities` returns 500

**Fixer:** backend-dev #2 · **Confidence:** H

**Root cause:** Dual `@Transactional` on controller + service. Service exception became
`UnexpectedRollbackException` that bypassed the controller's catch-and-return-empty fallback. Schema
drift (missing `created_by/updated_by` on `fluence_activities`) already addressed by pre-existing
`V134__fix_fluence_lms_missing_columns.sql`.

**Fix:** Removed redundant controller-level `@Transactional`.

**Files:**

- `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceActivityController.java` (M)
- `backend/src/test/java/com/hrms/application/knowledge/FluenceActivityServiceTest.java` (NEW — 3
  empty-page tests)

---

## F-05 (P1) — `/performance/okr` endpoints hang

**Fixer:** backend-dev #2 · **Confidence:** H correctness / M latency

**Root cause:** N+1 query — one key-results fetch per objective + missing composite indexes.

**Fix:** Batch fetch via new `KeyResultRepository.findAllByObjectiveIdIn(…)` + helper
`OkrService.attachKeyResults(…)`, replacing loops in `getObjectivesByOwnerList` and
`getCompanyObjectives`. New Flyway migration with composite indexes.

**Files:**

- `backend/src/main/java/com/hrms/infrastructure/performance/repository/KeyResultRepository.java` (
  M)
- `backend/src/main/java/com/hrms/application/performance/service/OkrService.java` (M)
- `backend/src/main/resources/db/migration/V138__okr_objective_performance_indexes.sql` (NEW)

> Note: task brief said "next V129" but V129–V137 already existed on disk; fixer used next-available
> V138.

---

## F-03 (P1) — `/api/v1/workflow/inbox/count` timeouts / 503

**Fixer:** backend-dev #4 · **Confidence:** H

**Root cause:** Uncached count query serialized under parallel sidebar hydration (10 workers × many
pages).

**Fix:** `@Cacheable(WORKFLOW_INBOX_COUNT)` 30s TTL Redis cache keyed on `tenantId+userId`.

**Files:**

- `backend/src/main/java/com/hrms/common/config/CacheConfig.java` (M — new cache bean)
- `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java` (M)

> Backend restart required to pick up new cache bean.

---

## F-06 (P1) — EMPLOYEE "Access Denied" on `/helpdesk/tickets`

**Fixer:** backend-dev #4 · **Confidence:** H

**Root cause:** Seed gap, not a controller bug. V107 granted EMPLOYEE only legacy
`HELPDESK:VIEW/CREATE`, but the frontend sidebar gate checks granular `HELPDESK:TICKET_VIEW` (added
in V96). Frontend and DB drifted.

**Fix:** Flyway V130 grants `HELPDESK:TICKET_VIEW` + `HELPDESK:TICKET_CREATE` to EMPLOYEE (SELF
scope), TEAM_LEAD, HR_MANAGER, HR_ADMIN. Idempotent.

**Files:**

- `backend/src/main/resources/db/migration/V130__add_helpdesk_ticket_permissions_to_employee.sql` (
  NEW)

> Backend restart required for Flyway to apply V130.

---

## F-04 (P1) — BUG-010 regression: `/helpdesk/tickets` renders `<span>` not `<a>`

**Fixer:** frontend-specialist #3 · **Confidence:** H

**Root cause:** Row-level `onClick={router.push(...)}` bypassed the anchor path for the
ticket-number/subject cells — breaking right-click, middle-click, keyboard nav, and accessibility.

**Fix:** Removed the row-level programmatic navigation; ticket number + subject cells are now real
Next `<Link>` anchors to `/helpdesk/tickets/{id}`.

**Files:**

- `frontend/app/helpdesk/tickets/page.tsx` (M)

---

## F-12 (P2) — `/employees?page=N` URL param ignored

**Fixer:** frontend-specialist #3 · **Confidence:** H

**Root cause:** Pagination state held in `useState(0)`, ignored the URL.

**Fix:** Replaced with URL-backed state — reads `?page=` via `useSearchParams`, syncs back via
`router.replace`. 1-based in URL, 0-based on API. Existing `setCurrentPage(…)` call-sites work
unchanged.

**Files:**

- `frontend/app/employees/page.tsx` (M)

---

## Consolidated file list (uncommitted)

**Backend modified (5):**

- `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceActivityController.java`
- `backend/src/main/java/com/hrms/application/performance/service/OkrService.java`
- `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java`
- `backend/src/main/java/com/hrms/common/config/CacheConfig.java`
- `backend/src/main/java/com/hrms/common/security/SecurityContext.java`
- `backend/src/main/java/com/hrms/infrastructure/performance/repository/KeyResultRepository.java`

**Frontend modified (2):**

- `frontend/app/employees/page.tsx`
- `frontend/app/helpdesk/tickets/page.tsx`

**New files (4):**

- `backend/src/main/resources/db/migration/V130__add_helpdesk_ticket_permissions_to_employee.sql`
- `backend/src/main/resources/db/migration/V138__okr_objective_performance_indexes.sql`
- `backend/src/test/java/com/hrms/common/security/SuperAdminBypassTest.java`
- `backend/src/test/java/com/hrms/application/knowledge/FluenceActivityServiceTest.java`

---

## Not fixed in this swarm

| ID   | Why skipped                                                                                               | Suggested owner         |
|------|-----------------------------------------------------------------------------------------------------------|-------------------------|
| F-07 | `/approvals/inbox` 503 for EMPLOYEE — likely side-effect of F-06 seed fix; re-test first                  | TARGETED re-run         |
| F-08 | HR_ADMIN 403 cluster on NU-Hire — test-fixture mismatch (F-11) blocked diagnosis; may be subsumed by F-01 | re-run after F-01 lands |
| F-09 | `/recruitment/jobs/new` 404 — needs frontend route audit                                                  | frontend-specialist     |
| F-10 | Empty `<main>` on /payroll/structures,runs — likely downstream of F-01; re-test first                     | TARGETED re-run         |
| F-11 | Test-fixture mismatch (Saran seeded as EMPLOYEE not HR_ADMIN)                                             | data/seed task          |

---

## Recommended next steps (Release Manager lens)

1. **Review** this document + each per-fixer report in `fixers/`.
2. **Backend restart** to pick up V130 (permission seed), V138 (OKR indexes), and new
   `WORKFLOW_INBOX_COUNT` cache bean.
3. **Re-run TARGETED super-e2e** for hrms, hire, fluence — should auto-close F-07, F-08, F-10 if
   F-01 root-cause fix holds.
4. **Commit in logical slices** if verified:

- `fix(security): normalize JWT role claim shape for SuperAdmin bypass (F-01)`
- `fix(fluence): remove dual @Transactional on activities controller (F-02)`
- `perf(okr): batch key-results fetch + V138 composite indexes (F-05)`
- `perf(workflow): cache inbox count 30s in Redis (F-03)`
- `fix(helpdesk): V130 grant TICKET_VIEW/CREATE to EMPLOYEE+ (F-06)`
- `fix(helpdesk): real Link anchors on tickets list (F-04)`
- `fix(employees): URL-driven pagination (F-12)`

5. Address F-09, F-11 separately.
