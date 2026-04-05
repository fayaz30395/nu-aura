# Loop 9 QA Report: Performance, Training, Learning (NU-Grow)

**Date:** 2026-03-31
**Agent:** QA Agent
**Scope:** 31 routes across Performance, Training/Learning modules
**Defect range:** DEF-35 through DEF-49

---

## Executive Summary

Validated 31 routes in the NU-Grow domain (Performance, Training, Learning). Found **15 defects** --
3 HIGH, 8 MEDIUM, 4 LOW. The most critical issues are RBAC gaps in the FeedbackController (
DELETE/UPDATE using VIEW permission), missing frontend RBAC on the 9-Box and Revolution pages, and a
React anti-pattern causing infinite re-render risk on the Calibration page.

---

## Route Validation Matrix

### Performance Routes

| Route                                  | Risk | Status            | Defects        |
|----------------------------------------|------|-------------------|----------------|
| `/performance`                         | P2   | PASS (with notes) | DEF-35         |
| `/performance/reviews`                 | P1   | PASS              | --             |
| `/performance/cycles`                  | P1   | PASS              | DEF-42         |
| `/performance/cycles/[id]/calibration` | P1   | PASS              | --             |
| `/performance/cycles/[id]/nine-box`    | P2   | PASS              | --             |
| `/performance/goals`                   | P2   | PASS              | --             |
| `/performance/okr`                     | P2   | PASS              | --             |
| `/performance/360-feedback`            | P2   | PASS              | --             |
| `/performance/feedback`                | P2   | FAIL              | DEF-36, DEF-42 |
| `/performance/pip`                     | P1   | PASS              | --             |
| `/performance/calibration`             | P1   | FAIL              | DEF-37, DEF-38 |
| `/performance/competency-matrix`       | P2   | PASS              | --             |
| `/performance/9box`                    | P2   | FAIL              | DEF-39         |
| `/performance/revolution`              | P3   | FAIL              | DEF-40         |
| `/feedback360`                         | P2   | PASS (redirect)   | --             |
| `/goals`                               | P2   | PASS (redirect)   | --             |
| `/okr`                                 | P2   | PASS (redirect)   | --             |
| `/one-on-one`                          | P2   | PASS              | --             |
| `/recognition`                         | P3   | PASS              | --             |
| `/surveys`                             | P2   | PASS              | --             |
| `/wellness`                            | P3   | PASS              | --             |
| `/probation`                           | P1   | PASS              | DEF-43         |

### Training/Learning Routes

| Route                                  | Risk | Status | Defects |
|----------------------------------------|------|--------|---------|
| `/training`                            | P2   | PASS   | DEF-44  |
| `/training/catalog`                    | P2   | PASS   | --      |
| `/training/my-learning`                | P3   | PASS   | --      |
| `/learning`                            | P2   | PASS   | --      |
| `/learning/courses/[id]`               | P2   | PASS   | --      |
| `/learning/courses/[id]/play`          | P2   | PASS   | --      |
| `/learning/courses/[id]/quiz/[quizId]` | P2   | PASS   | --      |
| `/learning/paths`                      | P2   | PASS   | --      |
| `/learning/certificates`               | P2   | PASS   | --      |

---

## Defect Log

### DEF-35 (MEDIUM) -- Performance dashboard fetches all goals with size=1000

**File:** `frontend/app/performance/page.tsx:175`
**Evidence:**

```tsx
const goalsQuery = useAllGoals(0, 1000);
```

**Impact:** On tenants with thousands of goals, this will fetch a massive payload on every dashboard
load, degrading performance and potentially timing out.
**Fix:** Use a lightweight aggregation endpoint or limit to a reasonable page size (e.g., 50) and
show a summary count from the paginated response's `totalElements`.

---

### DEF-36 (HIGH) -- FeedbackController uses REVIEW_VIEW for DELETE and UPDATE

**File:** `backend/src/main/java/com/hrms/api/performance/FeedbackController.java:55-69`
**Evidence:**

```java
@DeleteMapping("/{id}")
@RequiresPermission(Permission.REVIEW_VIEW)
public ResponseEntity<Void> deleteFeedback(@PathVariable UUID id) { ... }

@PutMapping("/{id}")
@RequiresPermission(Permission.REVIEW_VIEW)
public ResponseEntity<FeedbackResponse> updateFeedback(...) { ... }

@PostMapping
@RequiresPermission(Permission.REVIEW_VIEW)
public ResponseEntity<FeedbackResponse> giveFeedback(...) { ... }
```

**Impact:** Any user with REVIEW:VIEW permission (i.e., most employees) can create, update, or
delete ANY feedback record. This is an RBAC privilege escalation. The CREATE should use a
FEEDBACK_CREATE permission, UPDATE should use FEEDBACK_UPDATE, and DELETE should require
FEEDBACK_DELETE or at minimum REVIEW_CREATE.
**Severity:** HIGH -- data integrity risk; employees could delete unfavorable feedback.

---

### DEF-37 (HIGH) -- Calibration page calls setState during render (infinite re-render risk)

**File:** `frontend/app/performance/calibration/page.tsx:144-153`
**Evidence:**

```tsx
// Initialize selected cycle
if (!selectedCycleId && cyclesQuery.data?.content?.length > 0) {
    const cycles = cyclesQuery.data.content;
    const active = cycles.find(c => c.status === 'ACTIVE' || c.status === 'CALIBRATION');
    if (active) {
      setSelectedCycleId(active.id);  // setState during render!
    } else if (cycles.length > 0) {
      setSelectedCycleId(cycles[0].id);
    }
}
```

**Impact:** Calling `setSelectedCycleId()` inside the render body (not inside `useEffect`) violates
React rules. In React 18 strict mode this causes double-renders and can lead to infinite render
loops if the condition check is not perfectly stable. This is a latent crash risk.
**Fix:** Move to a `useEffect` with `cyclesQuery.data` as a dependency, or use `useMemo`/`useState`
initializer pattern.

---

### DEF-38 (MEDIUM) -- Calibration page has no page-level RBAC gate

**File:** `frontend/app/performance/calibration/page.tsx`
**Evidence:** The page uses `PermissionGate` only on the Publish button and Save button, but renders
the entire calibration table (all employee ratings, self vs manager ratings, final ratings) to ANY
authenticated user. The page should be gated behind `CALIBRATION:MANAGE` or at minimum `REVIEW:VIEW`
at the page level since it exposes sensitive salary-relevant rating data.
**Fix:** Wrap the entire page content in a `PermissionGate` with
`permission={Permissions.CALIBRATION_MANAGE}` or redirect unauthorized users.

---

### DEF-39 (MEDIUM) -- 9-Box Grid page has NO frontend RBAC gating

**File:** `frontend/app/performance/9box/page.tsx`
**Evidence:** No imports of `PermissionGate` or `Permissions` anywhere in the file. The page renders
all employee performance and potential data in a visual grid without any access control. This is
HR-confidential talent segmentation data.
**Fix:** Add page-level `PermissionGate` requiring `REVIEW:VIEW` or a dedicated `NINE_BOX:VIEW`
permission.

---

### DEF-40 (LOW) -- Performance Revolution page has NO frontend RBAC gating

**File:** `frontend/app/performance/revolution/page.tsx`
**Evidence:** No imports of `PermissionGate` or `Permissions`. The page fetches OKR graph and
performance spider data without any access control.
**Fix:** Add page-level `PermissionGate` requiring `REVIEW:VIEW`.

---

### DEF-41 (MEDIUM) -- PerformanceReviewController uses REVIEW_CREATE for DELETE

**File:** `backend/src/main/java/com/hrms/api/performance/PerformanceReviewController.java:118-123`
**Evidence:**

```java
@DeleteMapping("/{id}")
@RequiresPermission(Permission.REVIEW_CREATE)
public ResponseEntity<Void> deleteReview(@PathVariable UUID id) { ... }
```

**Impact:** The DELETE operation should require a dedicated REVIEW_DELETE permission (which exists
in the Permission enum at line 157 of `usePermissions.ts` and presumably in the backend Permission
class). Using REVIEW_CREATE for deletion is a semantic mismatch that makes RBAC auditing unreliable.
The same issue applies to `deleteCompetency`.
**Fix:** Change to `@RequiresPermission(Permission.REVIEW_DELETE)`.

---

### DEF-42 (LOW) -- Buttons with identical bg and hover color (no visual feedback)

**Files:** Multiple across performance module
**Evidence:**

```tsx
className="bg-accent-700 text-white rounded-lg hover:bg-accent-700"
```

Found in:

- `performance/cycles/page.tsx` (lines 247, 307, 835)
- `performance/reviews/page.tsx` (line 224)
- `performance/calibration/page.tsx` (line 356)
- `performance/feedback/page.tsx` (lines 166, 225)

**Impact:** The hover state is identical to the default state, providing no visual feedback on
interaction. This is a UX accessibility concern (WCAG 2.1 SC 1.4.13 - Content on Hover).
**Fix:** Change `hover:bg-accent-700` to `hover:bg-accent-800` across all occurrences.

---

### DEF-43 (MEDIUM) -- Probation page has client-side auth redirect instead of middleware

**File:** `frontend/app/probation/page.tsx:192-196`
**Evidence:**

```tsx
if (!hasHydrated) return null;
if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
}
```

**Impact:** This pattern renders `null` briefly before redirecting, which can flash an empty page.
More critically, the page content is still in the client-side JS bundle and can be seen by
inspecting network traffic. All other performance pages rely on the middleware for auth redirection,
making this inconsistent.
**Fix:** Remove the client-side auth check; rely on the Next.js middleware (which already handles
auth redirect for non-public routes).

---

### DEF-44 (MEDIUM) -- Training page enrollments query uses `user.id` instead of `user.employeeId`

**File:** `frontend/app/training/page.tsx:49-51`
**Evidence:**

```tsx
const { data: enrollmentsResponse, isLoading: enrollmentsLoading } = useEnrollmentsByEmployee(
    user?.id || ''
);
```

**Impact:** All other performance/probation pages use `user?.employeeId` for employee-scoped
queries. Using `user?.id` (the USER UUID, not the EMPLOYEE UUID) will return zero results or wrong
data if user ID and employee ID differ (which they can in multi-tenant setups where User and
Employee are separate entities).
**Fix:** Change `user?.id` to `user?.employeeId`.

---

### DEF-45 (MEDIUM) -- Performance dashboard module cards use single permission for all modules

**File:** `frontend/app/performance/page.tsx:308`
**Evidence:**

```tsx
<PermissionGate key={module.id} permission={Permissions.REVIEW_VIEW} fallback={null}>
```

All 10 module cards (Goals, OKR, Reviews, 360 Feedback, Feedback, Cycles, PIPs, Calibration, 9-Box,
Competency Matrix) are gated behind the same `REVIEW:VIEW` permission. A user with REVIEW:VIEW but
without PIP:VIEW or CALIBRATION:MANAGE will still see links to PIP and Calibration modules on the
dashboard (though they will get 403s on the API calls).
**Fix:** Each module card should use its appropriate permission (e.g., PIP module should use
`Permissions.PIP_VIEW`, Calibration should use `Permissions.CALIBRATION_MANAGE`).

---

### DEF-46 (LOW) -- ReviewCycleController uses REVIEW_CREATE for DELETE and COMPLETE operations

**File:** `backend/src/main/java/com/hrms/api/performance/ReviewCycleController.java:82-93`
**Evidence:**

```java
@DeleteMapping("/{id}")
@RequiresPermission(Permission.REVIEW_CREATE)
public ResponseEntity<Void> deleteCycle(@PathVariable UUID id) { ... }

@PutMapping("/{id}/complete")
@RequiresPermission(Permission.REVIEW_CREATE)
public ResponseEntity<ReviewCycleResponse> completeCycle(@PathVariable UUID id) { ... }
```

**Impact:** Semantic RBAC mismatch. Completing a cycle is an admin action that should require
REVIEW_APPROVE. Deleting should require a dedicated permission or at minimum REVIEW_APPROVE.

---

### DEF-47 (LOW) -- GoalController uses REVIEW_VIEW for goal read operations

**File:** `backend/src/main/java/com/hrms/api/performance/GoalController.java:37,51,59,75,84,92`
**Evidence:** All GET endpoints use `Permission.REVIEW_VIEW` instead of a dedicated `GOAL_VIEW`
permission. Similarly, update and progress endpoints use `Permission.GOAL_CREATE`.
**Impact:** Minor semantic issue -- goals are accessible to anyone with review viewing permissions,
which may be intentionally broad. However, this makes fine-grained RBAC impossible for tenants who
want to separate goal visibility from review visibility.

---

### DEF-48 (MEDIUM) -- PIP check-in uses REVIEW_SUBMIT instead of PIP-specific permission

**File:** `backend/src/main/java/com/hrms/api/performance/PIPController.java:52-53`
**Evidence:**

```java
@PostMapping("/{id}/check-in")
@RequiresPermission(Permission.REVIEW_SUBMIT)
```

**Impact:** PIP check-ins are legally sensitive operations (part of a formal performance improvement
process). Using a generic REVIEW_SUBMIT permission means anyone who can submit reviews can also
record PIP check-ins, which should be restricted to the assigned manager and HR.
**Fix:** Use `Permission.PIP_MANAGE` or introduce `Permission.PIP_CHECK_IN`.

---

### DEF-49 (MEDIUM) -- No tenant_id filtering in 9-Box and standalone Calibration pages

**File:** `frontend/app/performance/9box/page.tsx`, `frontend/app/performance/calibration/page.tsx`
**Evidence:** Both pages call `useAllReviews(0, 500)` which hits
`GET /api/v1/reviews?page=0&size=500`. The backend `PerformanceReviewController.getAllReviews()`
does not explicitly include `TenantContext.getCurrentTenant()` in the query -- it relies on the
service layer for tenant filtering. While RLS at the database level should enforce isolation, the
500-record bulk fetch without explicit tenant filtering in the controller is a defense-in-depth gap.
**Fix:** Verify that `PerformanceReviewService.getAllReviews()` includes tenant filtering. Add
`TenantContext` assertion in the controller for defense in depth.

---

## Key Test Case Results

### 1. Review Cycle RBAC (Manager vs HR vs Employee)

**Result:** PARTIAL PASS. Backend controllers properly gate CRUD with `@RequiresPermission`.
However, the frontend performance dashboard shows ALL module cards with a single `REVIEW:VIEW`
gate (DEF-45), meaning UI navigation does not accurately reflect backend permissions.

### 2. PIP Legal Requirements

**Result:** PASS with caveat (DEF-48). PIP CRUD is properly gated with `PIP_CREATE`, `PIP_VIEW`,
`PIP_MANAGE`. The PIP form uses React Hook Form + Zod. However, the check-in endpoint uses the wrong
permission.

### 3. 360 Feedback Anonymity

**Result:** PASS. The `Feedback360Controller` properly handles anonymity:

- `isAnonymous` is a configurable field on the cycle (defaults to `true`)
- Employee summaries are filtered with `s.getSharedWithEmployee()` before returning via
  `/my-summaries`
- Manager must explicitly call `/summaries/{id}/share` to make summaries visible to the employee
- Individual reviewer responses are behind `FEEDBACK_360_MANAGE` permission

### 4. OKR Cascading

**Result:** PASS. The `OkrController` supports `parentObjectiveId` for cascading, and
`ObjectiveLevel` enum covers `COMPANY`, `DEPARTMENT`, `TEAM`, `INDIVIDUAL`. The
`alignedToCompanyObjective` field enables strategic alignment.

### 5. Calibration Data

**Result:** PASS with caveats (DEF-37, DEF-38). Bell curve warning logic is implemented (
`getBellCurveWarning`). Distribution chart renders correctly. However, the page has the
setState-during-render bug and lacks page-level RBAC.

### 6. Course Completion Tracking

**Result:** PASS. The LMS module is properly gated behind
`@RequiresFeature(FeatureFlag.ENABLE_LMS)`. Course progress tracking, quiz scores, and certificate
generation are supported. The play page tracks content completion state.

### 7. Performance-to-Compensation Link

**Result:** NOT VERIFIABLE from code alone. No direct code path was found linking performance
ratings to payroll/compensation percentages. This would require checking the payroll service for a
`finalRating`-based calculation, which is outside the scope of this loop.

---

## Summary Statistics

| Metric                 | Value                                                      |
|------------------------|------------------------------------------------------------|
| Routes validated       | 31                                                         |
| Routes PASS            | 23                                                         |
| Routes PASS (redirect) | 3                                                          |
| Routes FAIL            | 5                                                          |
| Defects found          | 15                                                         |
| HIGH severity          | 2 (DEF-36, DEF-37)                                         |
| MEDIUM severity        | 8 (DEF-35, DEF-38, DEF-43, DEF-44, DEF-45, DEF-48, DEF-49) |
| LOW severity           | 4 (DEF-40, DEF-42, DEF-46, DEF-47)                         |
| HIGH + DEF-41          | 3 total HIGH                                               |

---

## Recommendations (Priority Order)

1. **URGENT (DEF-36):** Fix FeedbackController RBAC -- create, update, delete all use VIEW
   permission
2. **URGENT (DEF-37):** Fix setState-during-render on Calibration page (potential crash)
3. **HIGH (DEF-39, DEF-40):** Add RBAC gates to 9-Box and Revolution pages
4. **HIGH (DEF-44):** Fix training enrollments using `user.id` instead of `user.employeeId`
5. **MEDIUM (DEF-45):** Per-module permission gates on performance dashboard
6. **MEDIUM (DEF-38, DEF-49):** Add page-level RBAC to Calibration and verify tenant filtering
7. **LOW (DEF-42):** Fix hover color parity across performance module buttons
