# Loop 9 Fix Log: Performance, Training, Learning (NU-Grow)

**Date:** 2026-03-31
**Agent:** Developer Agent
**Scope:** Fixes for DEF-36, DEF-37, DEF-38, DEF-39, DEF-40, DEF-41, DEF-44, DEF-48

---

## Fixes Applied

### DEF-36 (HIGH) -- FeedbackController RBAC privilege escalation

**Files changed:**
- `backend/src/main/java/com/hrms/common/security/Permission.java`
- `backend/src/main/java/com/hrms/api/performance/FeedbackController.java`
- `frontend/lib/hooks/usePermissions.ts`

**Changes:**
1. Added three new permission constants to `Permission.java`: `FEEDBACK_CREATE`, `FEEDBACK_UPDATE`, `FEEDBACK_DELETE`
2. Added matching constants to frontend `usePermissions.ts`
3. Changed `@PostMapping` from `Permission.REVIEW_VIEW` to `Permission.FEEDBACK_CREATE`
4. Changed `@PutMapping("/{id}")` from `Permission.REVIEW_VIEW` to `Permission.FEEDBACK_UPDATE`
5. Changed `@DeleteMapping("/{id}")` from `Permission.REVIEW_VIEW` to `Permission.FEEDBACK_DELETE`
6. GET endpoints remain `Permission.REVIEW_VIEW` (read access is intentionally broad)

---

### DEF-37 (HIGH) -- CalibrationPage setState during render

**File changed:** `frontend/app/performance/calibration/page.tsx`

**Changes:**
1. Added `useEffect` to imports
2. Moved the cycle-initialization `setSelectedCycleId()` call from the render body into a `useEffect` with `[selectedCycleId, cyclesQuery.data]` as dependencies
3. This prevents infinite re-render loops in React 18 strict mode

---

### DEF-38 (MEDIUM) -- Calibration page missing page-level RBAC

**File changed:** `frontend/app/performance/calibration/page.tsx`

**Changes:**
1. Wrapped entire page content in `<PermissionGate permission={Permissions.CALIBRATION_MANAGE}>` with an "Access Denied" fallback
2. Existing button-level gates remain as defense-in-depth

---

### DEF-39 (MEDIUM) -- 9-Box page missing frontend RBAC + setState during render

**File changed:** `frontend/app/performance/9box/page.tsx`

**Changes:**
1. Added imports for `useEffect`, `PermissionGate`, `Permissions`
2. Moved cycle-initialization `setSelectedCycleId()` from render body into `useEffect` (same pattern as calibration fix)
3. Wrapped entire page content in `<PermissionGate permission={Permissions.REVIEW_VIEW}>` with "Access Denied" fallback

---

### DEF-40 (LOW) -- Revolution page missing frontend RBAC

**File changed:** `frontend/app/performance/revolution/page.tsx`

**Changes:**
1. Added imports for `PermissionGate`, `Permissions`
2. Wrapped page content in `<PermissionGate permission={Permissions.REVIEW_VIEW}>` with "Access Denied" fallback

---

### DEF-41 (MEDIUM) -- PerformanceReviewController DELETE uses REVIEW_CREATE

**Files changed:**
- `backend/src/main/java/com/hrms/common/security/Permission.java`
- `backend/src/main/java/com/hrms/api/performance/PerformanceReviewController.java`

**Changes:**
1. Added `REVIEW_UPDATE` and `REVIEW_DELETE` permission constants to `Permission.java`
2. Changed `@DeleteMapping("/{id}")` from `Permission.REVIEW_CREATE` to `Permission.REVIEW_DELETE`
3. Changed `@DeleteMapping("/competencies/{id}")` from `Permission.REVIEW_CREATE` to `Permission.REVIEW_DELETE`

---

### DEF-44 (MEDIUM) -- Training page uses user.id instead of user.employeeId

**File changed:** `frontend/app/training/page.tsx`

**Changes:**
1. Changed `useEnrollmentsByEmployee(user?.id || '')` to `useEnrollmentsByEmployee(user?.employeeId || '')`
2. This aligns with the pattern used everywhere else (e.g., `handleSelfEnroll` already uses `user.employeeId`)

---

### DEF-48 (MEDIUM) -- PIP check-in uses REVIEW_SUBMIT instead of PIP-specific permission

**File changed:** `backend/src/main/java/com/hrms/api/performance/PIPController.java`

**Changes:**
1. Changed `@PostMapping("/{id}/check-in")` from `Permission.REVIEW_SUBMIT` to `Permission.PIP_MANAGE`
2. PIP check-ins are legally sensitive operations that should be restricted to assigned managers and HR, not anyone who can submit reviews

---

## Summary

| Defect | Severity | Status | Type |
|--------|----------|--------|------|
| DEF-36 | HIGH | FIXED | Backend RBAC |
| DEF-37 | HIGH | FIXED | React anti-pattern |
| DEF-38 | MEDIUM | FIXED | Frontend RBAC |
| DEF-39 | MEDIUM | FIXED | Frontend RBAC + React anti-pattern |
| DEF-40 | LOW | FIXED | Frontend RBAC |
| DEF-41 | MEDIUM | FIXED | Backend RBAC |
| DEF-44 | MEDIUM | FIXED | Data fetching bug |
| DEF-48 | MEDIUM | FIXED | Backend RBAC |

**Total: 8 defects fixed (2 HIGH, 4 MEDIUM, 1 LOW, plus 1 bonus setState fix on 9-Box page)**

## Not Fixed (out of scope or lower priority)

- DEF-35: Performance dashboard size=1000 fetch (requires new aggregation endpoint)
- DEF-42: Hover color parity (cosmetic)
- DEF-43: Probation client-side auth redirect (low risk, middleware handles it)
- DEF-45: Per-module permission gates on dashboard cards (requires mapping each module card)
- DEF-46: ReviewCycleController permission mismatches (LOW)
- DEF-47: GoalController permission granularity (LOW)
- DEF-49: Tenant filtering defense-in-depth (requires backend service audit)
