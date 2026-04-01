# Loop 7 Fix Log: Recruitment, Onboarding, Offboarding

> Developer Agent | 2026-03-31 | Fixes for loop7-recruitment-qa-report.md

---

## Fixes Applied

### DEF-56 (CRITICAL) -- FnF page exposes financial data
**File:** `frontend/app/offboarding/exit/fnf/page.tsx`
**Fix:** Added `usePermissions` + `useAuth` hooks with a `useEffect` redirect guard (same pattern as executive dashboard DEF-35). Users without `EXIT_VIEW` or `EXIT_MANAGE` are redirected to `/me/dashboard`. Added an early-return loader that blocks rendering until permissions are confirmed, preventing any financial data flash.

### DEF-52 (HIGH) -- Kanban board missing PermissionGate
**File:** `frontend/app/recruitment/[jobId]/kanban/page.tsx`
**Fix:** Wrapped entire page content (inside `AppLayout`) with `<PermissionGate anyOf={[RECRUITMENT_VIEW, CANDIDATE_VIEW]}>`. Unauthorized users see an "Access Denied" alert. Imported `PermissionGate` and `Permissions`.

### DEF-59 (HIGH) -- ExitManagementController uses wrong permissions
**File:** `backend/src/main/java/com/hrms/api/exit/controller/ExitManagementController.java`
**Fix:** Replaced all 37 `@RequiresPermission` annotations from `EMPLOYEE_*` to dedicated `EXIT_*` permissions:
- `EMPLOYEE_UPDATE` on create exit process -> `EXIT_INITIATE`
- `EMPLOYEE_UPDATE` on write operations (update, clearances, interviews, assets) -> `EXIT_MANAGE`
- `EMPLOYEE_DELETE` on approval/payment operations -> `EXIT_APPROVE`
- `EMPLOYEE_DELETE` on delete operations -> `EXIT_MANAGE`
- `{EMPLOYEE_VIEW_ALL, EMPLOYEE_VIEW_SELF}` on read operations -> `EXIT_VIEW`
- `EMPLOYEE_VIEW_ALL` on admin-level reads -> `EXIT_VIEW`

All 4 `EXIT_*` permissions (`EXIT_VIEW`, `EXIT_INITIATE`, `EXIT_MANAGE`, `EXIT_APPROVE`) already exist in `Permission.java` (lines 323-326). No Flyway migration needed.

### DEF-49 (MEDIUM) -- Recruitment dashboard page-level RBAC
**File:** `frontend/app/recruitment/page.tsx`
**Fix:** Wrapped page content with `<PermissionGate anyOf={[RECRUITMENT_VIEW, RECRUITMENT_VIEW_ALL]}>`. Already had `PermissionGate` and `Permissions` imports.

### DEF-50 (MEDIUM) -- Add Candidate button uses wrong permission
**File:** `frontend/app/recruitment/candidates/page.tsx`
**Fix:** Changed "Add Candidate" button gate from `CANDIDATE_VIEW` to `RECRUITMENT_CREATE`. View permission should not grant write access.

### DEF-53 (MEDIUM) -- Pipeline page missing PermissionGate
**File:** `frontend/app/recruitment/pipeline/page.tsx`
**Fix:** Wrapped page content with `<PermissionGate anyOf={[RECRUITMENT_VIEW, RECRUITMENT_VIEW_ALL]}>`. Added imports for `PermissionGate` and `Permissions`.

### DEF-54 (MEDIUM) -- Onboarding detail page missing PermissionGate
**File:** `frontend/app/onboarding/[id]/page.tsx`
**Fix:** Wrapped page content with `<PermissionGate anyOf={[ONBOARDING_VIEW, ONBOARDING_MANAGE]}>`. Added imports for `PermissionGate` and `Permissions`.

### DEF-51 (LOW) -- Candidate edit button uses wrong permission
**File:** `frontend/app/recruitment/candidates/[id]/page.tsx`
**Fix:** Changed "Edit Candidate" button gate from `CANDIDATE_VIEW` to `RECRUITMENT_MANAGE`. Read-only permission should not grant edit access.

### DEF-55 (LOW) -- Onboarding template detail missing page-level gate
**File:** `frontend/app/onboarding/templates/[id]/page.tsx`
**Fix:** Wrapped page content with `<PermissionGate anyOf={[ONBOARDING_VIEW, ONBOARDING_MANAGE]}>`. Added imports for `PermissionGate` and `Permissions`.

---

## Not Fixed (By Design)

### DEF-57 (CRITICAL) -- Candidate-to-employee conversion missing
**Reason:** Multi-day effort requiring new service methods, entity creation, Kafka lifecycle events, and onboarding auto-trigger. Out of scope for sweep.

### DEF-58 (HIGH) -- Dual pipeline systems
**Reason:** Architectural decision needed. Two separate pipeline implementations (`Candidate`-based kanban vs `Applicant`-based pipeline) use different entity models and stages. Requires product decision to consolidate or clearly delineate.

### DEF-60 (MEDIUM) -- Onboarding backend permission mismatch
**Reason:** Backend `OnboardingManagementController` uses `RECRUITMENT_*` permissions while frontend uses `ONBOARDING_*`. Fixing requires changing backend annotations to `ONBOARDING_*` and ensuring the permissions exist in seed data. Risk of breaking existing role assignments -- needs coordinated rollout.

---

## Summary

| Severity | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| CRITICAL | 2 | 1 | 1 (DEF-57: multi-day) |
| HIGH | 3 | 2 | 1 (DEF-58: arch decision) |
| MEDIUM | 5 | 4 | 1 (DEF-60: backend seed) |
| LOW | 2 | 2 | 0 |
| **Total** | **12** | **9** | **3** |

**Files modified:** 9 (8 frontend, 1 backend)
