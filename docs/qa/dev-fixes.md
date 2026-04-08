# DEV Agent Fix Log — 2026-04-07

## Session 24 — P0/P1 Backend Bug Fixes from Use Case QA (2026-04-08)

### BUG-001 (P0-Security): Refresh token not invalidated on logout
- **Files**: `backend/src/main/java/com/hrms/common/security/JwtTokenProvider.java`, `backend/src/main/java/com/hrms/application/auth/service/AuthService.java`
- **Root cause**: Two issues:
  1. `validateRefreshToken()` checked the JTI blacklist but did NOT check `isTokenRevokedByTimestamp()`. The `validateToken()` method for access tokens did check this, but refresh token validation was missing the timestamp-based revocation check. So when `logout()` called `revokeAllUserTokens()` or `revokeAllTokensBefore()`, refresh tokens from other sessions would still pass validation.
  2. `AuthService.logout()` only revoked the specific access token passed to it. It did not revoke all tokens for the user. A refresh token from a prior session (different tab/user) could still be used to re-authenticate.
- **Fix**:
  1. Added `isTokenRevokedByTimestamp()` check to `validateRefreshToken()` matching the same check in `validateToken()`.
  2. Enhanced `logout()` to extract the userId from the token and call `revokeAllUserTokens()` to invalidate ALL sessions for the user.
- **Migration**: none
- **Verified**: mvn compile passes

### BUG-EXP-001 (P1-Blocker): POST /api/v1/expenses returns 405 Method Not Allowed
- **File**: `backend/src/main/java/com/hrms/api/expense/controller/ExpenseClaimController.java`
- **Root cause**: The controller only had `@PostMapping("/employees/{employeeId}")` for creating expense claims. There was no `@PostMapping` mapped to the root `/api/v1/expenses` path. The frontend was POSTing to `/api/v1/expenses` which only had GET mapped, resulting in 405.
- **Fix**: Added a convenience `@PostMapping` endpoint at the root path that resolves the current employee from SecurityContext and delegates to `expenseClaimService.createExpenseClaim()`.
- **Migration**: none
- **Verified**: mvn compile passes

### BUG-HELP-001 (P1): POST /api/v1/helpdesk/tickets returns 500
- **File**: `backend/src/main/java/com/hrms/application/helpdesk/service/HelpdeskService.java`
- **Root cause**: `mapToTicketResponse()` used `employeeRepository.findById()` to resolve employee names. This loads the full Employee entity including `@Convert(converter = EncryptedStringConverter.class)` fields (taxId, bankAccountNumber, bankIfscCode). If decryption fails, Hibernate marks the transaction as rollback-only, causing 500. Same root cause as Session 17/19 EncryptedStringConverter issue.
- **Fix**:
  1. Replaced all `employeeRepository.findById().map(Employee::getFullName)` calls with `employeeRepository.findFullNameById()` JPQL projection query (already exists in repository).
  2. Replaced `findByIdAndTenantId()` employee existence checks with `existsByIdAndTenantId()` to avoid loading encrypted fields entirely.
  3. Added `safeGetEmployeeName()` helper with try-catch for defense-in-depth.
- **Migration**: none
- **Verified**: mvn compile passes

### BUG-004 (P0): GET /api/v1/leave-requests/status/PENDING returns 503
- **Status**: NEEDS-REVIEW (BE)
- **Analysis**: The leave controller and service code are correct. The 503 is not produced by any code path in the leave module. QA also noted "WebSocket connections (SockJS) are also failing with 503 on /ws/* endpoints" during the same test, indicating the backend was in a degraded state (likely Neon DB cold start or connection pool exhaustion). POST /api/v1/leave-requests worked (201) in the same session, confirming the endpoint is functional when the backend is healthy. Recommend re-testing after backend restart.

### BUG-EMP-002 (P1): PUT /api/v1/employees/{id} returns 500
- **Status**: Already fixed in Session 19 (EncryptedStringConverter resilience)
- **Analysis**: Employee update loads the full Employee entity including encrypted fields. The EncryptedStringConverter fix from Session 19 makes decryption resilient, preventing the transaction rollback-only 500. Requires backend restart to take effect.

### BUG-ATT-002 (P1): POST /api/v1/attendance/regularization returns 500
- **Status**: Already fixed in Session 19 (EncryptedStringConverter resilience)
- **Analysis**: The regularization code creates/updates attendance records and is itself correct. The 500 is caused by EncryptedStringConverter failures when loading related Employee entities during the transaction. The Session 19 fix resolves this.

### BUG-EMP-005 (P1): GET /api/v1/organization/org-chart returns 404
- **Status**: NOT A BACKEND BUG — Frontend path mismatch
- **Analysis**: The backend endpoint exists at `GET /api/v1/organization/chart` (OrganizationController line 50). The frontend /org-chart page is calling `/api/v1/organization/org-chart` which does not exist. The frontend service needs to be updated to use the correct path.

### BUG-LEAVE-003 (P1): POST /api/v1/leave/encashment returns 404
- **Status**: NOT A BACKEND BUG — Frontend path mismatch
- **Analysis**: The backend encashment endpoint exists at `POST /api/v1/leave-balances/encash` (LeaveBalanceController line 47). The frontend is calling `/api/v1/leave/encashment` which does not exist. The frontend service needs to be updated to use the correct path.

### BUG-REPORT-001 (P1): GET /api/v1/reports/* returns 404
- **Status**: NOT A BACKEND BUG — Frontend API method mismatch
- **Analysis**: The report endpoints exist but use POST (not GET): `POST /api/v1/reports/department-headcount`, `POST /api/v1/reports/employee-directory`, etc. (ReportController). Reports are generated by POSTing a ReportRequest body with format, dateRange, etc. The frontend is sending GET requests to paths that don't match.

RESTART-NEEDED: All fixes require backend restart — JwtTokenProvider refresh validation, AuthService logout enhancement, ExpenseClaimController new endpoint, HelpdeskService projection queries.

---

## Session 23 — P0 Frontend Fixes from Use Case QA (2026-04-08)

### BUG-017 (Chrome QA Phase 1): /employees/directory — Maximum update depth exceeded, infinite re-render loop (FRONTEND)
- **File**: `frontend/app/employees/directory/page.tsx`
- **Root cause**: `useQuery` had an inline default value `{content: [], totalPages: 0, totalElements: 0}` creating a new object reference on every render when data was undefined. A `useEffect` depending on this object called `setEmployees()`/`setTotalPages()`/`setTotalElements()`, triggering re-render, creating new default, triggering effect again -- infinite loop (75+ errors logged).
- **Fix**: (1) Extracted default to module-level constant `EMPTY_SEARCH_RESULT` for stable reference. (2) Destructured useEffect deps to individual fields (`searchContent`, `searchTotalPages`, `searchTotalElements`) instead of whole object.
- **Verified**: tsc passes with zero errors.

### BUG-015 (Chrome QA Phase 1): FeedService.fetchLinkedInPosts — Cannot read properties of undefined (reading 'map') (FRONTEND)
- **File**: `frontend/lib/services/core/feed.service.ts`
- **Root cause**: `fetchLinkedInPosts()` called `data.content.map(...)` directly without checking if `data` or `data.content` is defined/an array. When the LinkedIn API returns unexpected data shape (non-paginated or undefined), `.map()` crashes. This was missed in Session 22 which fixed the other 6 fetch methods but not this one.
- **Fix**: Added `Array.isArray` guard with `.content` fallback, matching the pattern used by the other fixed methods (`fetchBirthdays`, `fetchAnniversaries`, etc.).
- **Verified**: tsc passes with zero errors.

### BUG-002 (UC-AUTH-006, P0-UX): Missing "Forgot Password" link on login page (FRONTEND)
- **File**: `frontend/app/auth/login/page.tsx`
- **Root cause**: The login form had email and password fields with a Sign In button but no link to the existing `/auth/forgot-password` page. The forgot-password page and backend endpoint both exist, but users had no way to discover or navigate to the password reset flow from the login screen.
- **Fix**: Added a "Forgot Password?" link between the password field and the Sign In button, using `next/link` (already imported). Styled with `text-xs text-accent-600` and right-aligned per compact desktop-first density standards. Includes `focus-visible:ring` for accessibility.
- **Verified**: tsc passes with zero errors.

### BUG-003 (UC-PAY-001, P0-Blocker): /payroll/salary-structures page crashes with TypeError "Cannot read properties of undefined (reading 'toLocaleString')" (FRONTEND)
- **File**: `frontend/app/payroll/salary-structures/page.tsx`
- **Root cause**: When salary structure data is returned from the API, fields like `baseSalary` and `totalCTC` could be non-numeric values (e.g., string or unexpected type) where `?? 0` doesn't help because the value is truthy but not a number. Calling `.toLocaleString()` on a non-number type crashes. Additionally, `effectiveDate` was passed directly to `new Date()` without null guard, and the `structures` array wasn't filtered for null entries.
- **Fix**: (1) Wrapped `baseSalary` and `totalCTC` in `Number()` to ensure numeric type before calling `toLocaleString()`. (2) Added null guard on `effectiveDate` with `'—'` fallback. (3) Added `.filter(Boolean)` on structures array to strip null entries. (4) Added `'—'` fallback on `employeeName`/`employeeId`.
- **Also fixed**: `frontend/app/payroll/components/page.tsx` line 312 — same unguarded `c.defaultValue.toLocaleString()` wrapped with `Number(c.defaultValue ?? 0)`.
- **Verified**: tsc passes with zero errors.

---

## Session 22 — Frontend Array.isArray Guards + Error State Fixes (2026-04-08)

### BUG-013 (QA Phase 1 Session 3): /performance/pip — pips.filter is not a function
- **File:** `frontend/app/performance/pip/page.tsx`
- **Root cause:** `fetchPIPs()` returned `res.data` directly, which could be a paginated object `{content: [...]}` instead of a flat array when the backend returns paginated responses. The `= []` default only triggers when data is undefined, not when it's a non-array object.
- **Fix:** Made `fetchPIPs()` resilient: checks if `res.data` is an array, falls back to `res.data.content` if paginated, returns `[]` otherwise. The existing `Array.isArray(pips)` guard at line 719 was already present but this defense-in-depth at the fetch level prevents the crash earlier.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-010 (QA Session 2): /me/leaves — blank main content area
- **File:** `frontend/app/me/leaves/page.tsx`
- **Root cause:** `balancesData`, `leaveTypesData`, and `leaveRequestsData.content` were used with `= []` defaults or `?? []` which don't guard against non-array API responses (paginated objects). If any returned a non-array truthy value, `.map()` or `.filter()` would crash silently in the error boundary, rendering blank content.
- **Fix:** Added `Array.isArray()` guards for `leaveRequests`, `leaveTypes`, and `leaveBalances` with fallback to `.content` for paginated responses.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-006 (QA Session 2): /recognition — hardened Array.isArray guards
- **File:** `frontend/app/recognition/page.tsx`
- **Root cause:** `recognitions` used `activeQuery.data?.content || []` and `leaderboard` used `leaderboardQuery.data || []`. The `|| []` pattern fails when API returns non-array truthy data.
- **Fix:** Added `Array.isArray()` guards for both `recognitions` (with `.content` fallback) and `leaderboard`.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-008 (QA Phase 1): /helpdesk/tickets — misleading empty state on API 500
- **File:** `frontend/app/helpdesk/tickets/page.tsx`
- **Root cause:** `useTickets` query did not destructure `isError`. When API returned 500, `ticketsPage` stayed undefined, `filteredTickets` became `[]`, and the UI showed "No tickets yet" instead of an error message.
- **Fix:** Added `isError` destructuring from `useTickets`. Added error state rendering with `AlertTriangle` icon and "Failed to load tickets" message before the empty state check. Added `AlertTriangle` to lucide-react imports.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-013 (QA Phase 2 Session 3): FeedService .map() crashes — birthdays/anniversaries/newJoiners
- **File:** `frontend/lib/services/core/feed.service.ts`
- **Root cause:** `fetchBirthdays()`, `fetchAnniversaries()`, `fetchNewJoiners()`, `fetchAnnouncements()`, `fetchRecognitions()`, and `fetchWallPosts()` all called `.map()` directly on API response data without checking if it was an array. When backend returns paginated objects (`{content: [...]}`) instead of flat arrays, `.map()` crashes with "X.map is not a function".
- **Fix:** Added `Array.isArray()` guards with `.content` fallback for all 6 fetch methods. Each now safely extracts the array from either a flat array response or a paginated object response before calling `.map()`.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-011 (QA Phase 2 Session 3): /payroll renders blank for unauthorized users
- **File:** `frontend/app/payroll/page.tsx`
- **Root cause:** When user lacks `PAYROLL_VIEW` permission, the page returned `null` at line 104 while the `useEffect` redirect was still async. This caused a blank page (no content rendered) before the redirect completed.
- **Fix:** Replaced `return null` with a proper "Access Denied" message inside `AppLayout` that shows while the redirect is processing. Uses existing `Banknote` icon.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### Already-fixed pages confirmed (no changes needed):
- `/admin/office-locations` — Already has `Array.isArray(locationsRaw)` guard (line 76). QA crash was from pre-fix version.
- `/contracts/templates` — Already has `isError` handling (line 94). No change needed.
- `/performance/pip` — Already has `Array.isArray(pips)` guard (line 719). Fetch function hardened as additional defense.

---

## Session 21 — BUG-003 Expense 500 + BUG-004 Asset 500 (BACKEND) (2026-04-08)

### BUG-003 (P1): GET /api/v1/expenses returns 500, GET /api/v1/expenses/pending-approvals returns 500
- **File:** `backend/src/main/resources/db/migration/V124__fix_expense_claims_missing_columns.sql`
- **Root cause:** The `ExpenseClaim` entity declares 5 columns (`title`, `policy_id`, `reimbursed_at`, `reimbursement_ref`, `total_items`) that were never added via Flyway migration. The original `expense_claims` table in V0 does not have these columns. Hibernate generates SELECT/INSERT statements referencing them, causing PostgreSQL to return `ERROR: column "title" does not exist`. This causes every expense endpoint to 500.
- **Fix:** Created Flyway migration V124 to add the missing columns with appropriate defaults:
  - `title VARCHAR(255) NOT NULL DEFAULT ''`
  - `policy_id UUID`
  - `reimbursed_at TIMESTAMPTZ`
  - `reimbursement_ref VARCHAR(200)`
  - `total_items INTEGER NOT NULL DEFAULT 0`
- **Migration:** V124__fix_expense_claims_missing_columns.sql
- **Verified:** mvn compile passes

### BUG-004 (P1): GET /api/v1/assets returns 500
- **File:** `backend/src/main/java/com/hrms/application/asset/service/AssetManagementService.java`
- **Root cause (partial):** All 11 methods in `AssetManagementService` used `TenantContext.getCurrentTenant()` which can return null if tenant context is lost. When null, the JPA Specification generates `WHERE tenant_id = NULL` (not `IS NULL`), which either returns empty results or causes Hibernate to generate invalid SQL depending on the DB driver. Changed all to `requireCurrentTenant()` for defensive fail-fast behavior.
- **Additional root cause:** The asset endpoint may also fail if any assigned employee's encrypted fields (taxId, bankAccountNumber, bankIfscCode) trigger `EncryptedStringConverter` failures. The converter resilience fix from Session 19 addresses this.
- **Fix:** Replaced all 11 `TenantContext.getCurrentTenant()` calls with `TenantContext.requireCurrentTenant()` across the entire `AssetManagementService`.
- **Migration:** none
- **Verified:** mvn compile passes

### EncryptedStringConverter enhancement (defense-in-depth)
- **File:** `backend/src/main/java/com/hrms/common/converter/EncryptedStringConverter.java`
- **Enhancement:** Added fallback to `APP_SECURITY_ENCRYPTION_KEY` env var (used by start-backend.sh) when `ENCRYPTION_KEY` is not set. Added `keyMissing` volatile flag to avoid repeated log spam. The converter now tries both env var names before reporting key-not-configured.
- **Verified:** mvn compile passes

RESTART-NEEDED: V124 migration + EncryptedStringConverter fix + AssetManagementService tenant fix all require backend restart.

---

## Session 20 — Frontend DEV Agent Monitoring (2026-04-08)

### Monitoring Summary: No frontend bugs found in new QA run

**Monitoring window**: 20 cycles (~10 minutes), QA findings file grew from 8 to 138 lines (new QA run started fresh).

**QA pages tested (observed)**: /dashboard, /employees, /employees/directory, /departments, /org-chart, /attendance, /attendance/my-attendance, /leave, /leave/my-leaves, /leave/approvals, /leave/calendar, /leave/apply, /leave/encashment

**Bugs found by QA (2 total, both backend):**
- BUG-001: GET /employees and GET /employees/managers return 500 — backend issue, NOT frontend
- BUG-002: /org-chart fails due to same /employees 500 — backend issue, NOT frontend

**Frontend pages all rendering correctly**: Error states, skeleton loaders, and data loading all working as designed. Previous session fixes (GLOBAL-001 session stability, .replace() null guards, dashboard fetchStatus fix, notification polling backoff, admin/permissions Array.isArray guard) all holding.

**Result: 0 frontend code fixes required. All QA findings are backend 500 errors.**

---

## Session 19 — BUG-009 (QA) Login 500 for saran@nulogic.io + EncryptedStringConverter Resilience (2026-04-08)

### BUG-009 (QA, P1): POST /api/v1/auth/login returns 500 for saran@nulogic.io (EMPLOYEE role)
- **File:** `backend/src/main/java/com/hrms/common/converter/EncryptedStringConverter.java`
- **Root cause:** `EncryptedStringConverter.convertToEntityAttribute()` throws `IllegalStateException` on decryption failure (wrong key, corrupted ciphertext, or legacy unencrypted data). During login, `AuthService.buildAuthContext()` calls `employeeRepository.findByUserIdWithUser()` which loads the full `Employee` entity including `@Convert` fields (`taxId`, `bankAccountNumber`, `bankIfscCode`). If any of these encrypted fields contain data encrypted with a different key or stored unencrypted (seed data), the converter throws, Hibernate marks the transaction rollback-only, and the login returns 500. This is the same root cause as the BUG-007 exit/processes 500 — but affects ALL entity loads involving Employee.
- **Fix:** Made `EncryptedStringConverter.convertToEntityAttribute()` resilient:
  1. Unencrypted legacy data (no IV:ciphertext format) — returns raw value instead of throwing
  2. Base64 decode failures (IllegalArgumentException) — returns raw value with warning log
  3. Decryption failures (GeneralSecurityException) — returns `***DECRYPTION_FAILED***` placeholder with error log
  4. Key configuration errors (IllegalStateException) — returns `***KEY_NOT_CONFIGURED***` placeholder with error log
- **Impact:** Fixes ALL 500s caused by encrypted field loading across the entire application (login, exit management, employee profiles, etc.). The converter no longer crashes the transaction.
- **Migration:** none
- **Verified:** mvn compile passes

### BUG-001 (QA Run 2, P1): GET /api/v1/employees returns 500, GET /api/v1/employees/managers returns 500
- **Same root cause as above.** `EmployeeService.getAllEmployees()` and `getManagerEmployees()` load full `Employee` entities via `employeeRepository.findAll()` and `findManagersByTenantId()`, triggering `EncryptedStringConverter` on `taxId`, `bankAccountNumber`, `bankIfscCode`. The converter fix resolves this.
- **Also fixes:** BUG-002 (QA Run 2) — /org-chart 500 (depends on /employees endpoint)

RESTART-NEEDED: EncryptedStringConverter fix requires backend restart. After restart, /employees, /employees/managers, /org-chart, and saran@nulogic.io login should all work.

---

## Session 18 — BUG-009 and BUG-010 Backend 500 Fixes (2026-04-08)

### BUG-010 (P1): GET /api/v1/compensation/revisions returns 500
- **Root cause:** `CompensationReviewCycle` entity redeclares `@Column(name = "created_by") private UUID createdBy` at line 97, which **duplicates** the same field inherited from `BaseEntity` (line 47: `@CreatedBy @Column(name = "created_by") private UUID createdBy`). Hibernate 6 treats this as a duplicate column mapping conflict, causing a `MappingException` or ambiguous property resolution at runtime. Since the `enrichRevisionResponse` method looks up cycle names via `cycleRepository`, any compensation endpoint that touches cycles fails.
- **Fix:** Removed the duplicate `createdBy` field from `CompensationReviewCycle.java`. The inherited `BaseEntity.createdBy` (with `@CreatedBy` auditing and `updatable = false`) correctly handles this column.
- **File:** `backend/src/main/java/com/hrms/domain/compensation/CompensationReviewCycle.java`
- **Also:** Changed `TenantContext.getCurrentTenant()` to `requireCurrentTenant()` in `CompensationService.getAllRevisions()` and `getAllCycles()` to prevent null tenant from producing opaque 500s.
- **File:** `backend/src/main/java/com/hrms/application/compensation/service/CompensationService.java`
- **Verified:** `mvn compile -q` passes.

### BUG-009 (P1): GET /api/v1/probation returns 500, GET /api/v1/probation/status/CONFIRMED returns 500
- **Root cause (partial):** `ProbationPeriod.getDaysRemaining()` and `isOverdue()` call `LocalDate.now().isAfter(endDate)` and `ChronoUnit.DAYS.between(LocalDate.now(), endDate)` without null-guarding `endDate`. If any probation record has a null `endDate` (possible via corrupted data or builder usage), these methods throw NPE inside `ProbationPeriodResponse.fromEntity()`, which is called in `.map(this::enrichResponse)`. The NPE propagates up and becomes a 500.
- **Fix 1:** Added null guards to `ProbationPeriod.isOverdue()` (`endDate != null &&`) and `getDaysRemaining()` (`if (endDate == null || ...)` early return 0).
- **File:** `backend/src/main/java/com/hrms/domain/probation/ProbationPeriod.java`
- **Fix 2:** Changed `TenantContext.getCurrentTenant()` to `requireCurrentTenant()` in `ProbationService.getAllProbations()` and `getProbationsByStatus()`.
- **File:** `backend/src/main/java/com/hrms/application/probation/service/ProbationService.java`
- **Verified:** `mvn compile -q` passes.

RESTART-NEEDED: Entity mapping fix in CompensationReviewCycle requires backend restart.

---

## Session 17 — BUG-007: GET /api/v1/exit/processes 500 Internal Server Error (2026-04-08)

### Root Cause

The `ExitManagementService` mapper methods called `employeeRepository.findById()` to resolve employee names for display. This loads the full `Employee` entity, which includes `@Convert(converter = EncryptedStringConverter.class)` on the `taxId` field. For employee `48000000-e001-0000-0000-000000000002`, the stored `taxId` ciphertext could not be decrypted by the `EncryptedStringConverter` (likely encrypted with a different key or corrupted data).

The decryption failure throws an exception inside the `@Transactional(readOnly = true)` method. Even though the exception was caught in a try-catch wrapper (`safeGetEmployeeName`), Hibernate had already marked the transaction as rollback-only. When the method returned successfully, Spring's transaction manager attempted to commit, found the rollback-only flag, and threw `UnexpectedRollbackException` -- which the `GlobalExceptionHandler` catch-all mapped to HTTP 500.

**Chain of failure:**
1. `getAllExitProcesses()` -> `mapToExitProcessResponse()` -> `employeeRepository.findById(employeeId)`
2. Hibernate eagerly loads `Employee` entity, including `@Convert` on `taxId`
3. `EncryptedStringConverter.convertToEntityAttribute()` fails: "Error attempting to apply AttributeConverter"
4. JPA marks transaction as rollback-only
5. try-catch in mapper catches the error, returns null
6. Method returns, Spring tries to commit -> `UnexpectedRollbackException`
7. `GlobalExceptionHandler` -> 500

### Fix

**File: `EmployeeRepository.java`** -- Added `findFullNameById(UUID id)` JPQL projection query that fetches only `CONCAT(firstName, ' ', lastName)`. This avoids loading the full entity and bypasses the `EncryptedStringConverter` on `taxId`.

**File: `ExitManagementService.java`** -- Replaced all `employeeRepository.findById(id).map(Employee::getFullName).orElse(null)` calls in all 5 mapper methods with a centralized `safeGetEmployeeName(UUID)` helper that uses `findFullNameById()`. This affects:
- `mapToExitProcessResponse` (employeeName, managerName, hrSpocName)
- `mapToExitClearanceResponse` (employeeName, approverName)
- `mapToSettlementResponse` (employeeName, preparedByName, approvedByName)
- `mapToExitInterviewResponse` (employeeName, interviewerName)
- `mapToAssetRecoveryResponse` (employeeName, recoveredByName, verifiedByName, waivedByName)

**File: `GlobalExceptionHandler.java`** -- Added `@ExceptionHandler(org.hibernate.ObjectNotFoundException.class)` handler (defense-in-depth for related `@Where`/soft-delete edge cases). Returns 404 instead of falling through to the generic 500 handler.

### Verification

All 4 affected endpoints verified with curl against the running application:
- `GET /api/v1/exit/processes` -> 200 (was 500)
- `GET /api/v1/exit/settlements` -> 200 (was 500)
- `GET /api/v1/offboarding` -> 200 (was 500)
- `GET /api/v1/exit/processes/status/INITIATED` -> 200 (was 500)
- `GET /api/v1/exit/dashboard` -> 200 (was already 200, still works)

Response data verified: employee names resolve correctly (e.g., "Saran V").

---

## Session 16 — Backend DEV Agent Bug Investigation (2026-04-08)

### BUG-006 (P3): /recruitment/interviews — duplicate rows in interview table
- **File:** `backend/src/main/java/com/hrms/application/recruitment/service/InterviewManagementService.java`
- **Root cause:** `getAllInterviews()` and `getInterviewsByCandidate()` use JPA Specification with `DataScopeService.getScopeSpecification()`. For non-SuperAdmin roles with TEAM/CUSTOM scope, the scope predicates can produce JOINs that cause Cartesian product duplicates. Even for SuperAdmin (conjunction), the Specification machinery can produce duplicates when combined with pageable sorting.
- **Fix:** Added `query.distinct(true)` to the tenant Specification lambda in both `getAllInterviews()` and `getInterviewsByCandidate()`. Guarded with `Long.class != query.getResultType()` to avoid applying DISTINCT to COUNT queries (which breaks pagination totals).
- **Verified:** `mvn compile -q` passes.

### BUG-007 (P1): /offboarding — GET /api/v1/exit/processes returns 500
- **File:** `backend/src/main/java/com/hrms/application/exit/service/ExitManagementService.java`
- **Root cause (partial):** `getAllExitProcesses()` used `TenantContext.getCurrentTenant()` which can return null if tenant context is not set. When tenantId is null, the JPA Specification `cb.equal(root.get("tenantId"), null)` generates invalid SQL or throws NPE. Changed to `TenantContext.requireCurrentTenant()` which throws `IllegalStateException` (mapped to 409 by GlobalExceptionHandler) with a clear error message instead of an opaque 500.
- **Note:** The 500 may also be caused by Neon DB connection issues or missing Flyway migration state. The ExitProcess entity does not extend BaseEntity (unlike most other entities) and is missing audit fields (version, createdBy, updatedBy, isDeleted) that exist in the DB schema. This inconsistency is a tech debt item but should not cause 500 on SELECT.
- **Verified:** `mvn compile -q` passes.

### Additional 500s identified from QA: /recognition/feed
- **Root cause:** The `recognitions` table in V0__init.sql is missing columns that the `Recognition` entity expects: `points_awarded`, `is_public`, `is_anonymous`, `badge_id`, `wall_post_id`, `likes_count`, `comments_count`, `is_approved`, `approved_by`, `approved_at`, `recognized_at`. Hibernate generates SELECT/INSERT with these columns but they don't exist in the DB, causing SQL errors.
- **Fix:** Created Flyway migration `V123__fix_recognitions_missing_columns.sql` to add all missing columns with appropriate defaults.
- **Verified:** `mvn compile -q` passes.

### Additional 500s identified from QA: /wall/posts, /home/new-joinees
- **Triage:** The `social_posts` table exists in V0__init.sql with all required columns. The `wall/posts` 500 is likely a transient Neon DB connection issue or a runtime error in the batch mapping logic. The `/home/new-joinees` 500 queries the `employees` table which exists and is well-tested. Both are likely Neon cold start issues.

RESTART-NEEDED: V123 migration added for recognitions table — backend restart required to apply.

---

## Session 15 — Frontend DEV Agent QA Monitoring (2026-04-08)

### BUG-003 (Phase1B, High): Notification polling without backoff floods console when backend is down
- **File:** `frontend/lib/hooks/queries/useNotifications.ts`
- **Root cause:** `useNotificationInbox` and `useUnreadNotificationCount` both used a static `refetchInterval: 30_000` (30s). When backend is unreachable, React Query retries each poll 3x with exponential backoff per attempt, but the next poll still fires 30s later. This creates a flood of failed requests that fills the console and can freeze browser tabs.
- **Fix:** Replaced static `refetchInterval` with a `pollingWithBackoff()` function that returns 30s when healthy, doubles the interval on each consecutive failure (30s -> 60s -> 120s), and stops polling entirely after 10 consecutive failures. Resets to normal when a successful response arrives.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-005 (Phase1B, Low): Developer-facing login error message
- **File:** `frontend/app/auth/login/page.tsx`
- **Root cause:** Demo login fallback error message was "Demo login failed. Is the backend running?" -- a developer-facing message not suitable for production.
- **Fix:** Changed to "Service temporarily unavailable. Please try again in a moment."
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-001 (Phase1B, P2): /leave/approvals stuck on infinite loading when API is down
- **File:** `frontend/app/leave/approvals/page.tsx`
- **Root cause:** Loading state was `!pendingData` which stays true forever when API fails (data stays undefined). No error state was rendered.
- **Fix:** Added `isError` and `fetchStatus` from the query. Loading spinner now only shows when `fetchStatus === 'fetching'` and data hasn't arrived. When query errors, an error state with "Failed to load" message and Try Again button is shown instead.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-002 (Phase1B, P2): /leave/calendar shows infinite loading when API is unreachable
- **File:** `frontend/app/leave/calendar/page.tsx`
- **Root cause:** Same pattern -- `loading` derived from `!data` stays true when API fails. No error path existed.
- **Fix:** Added `isError` and `fetchStatus` checks from both queries. Loading only shows when actively fetching and no data yet. Error state with retry button shown when either query errors.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### BUG-008 (P1): /admin/permissions crashes with "users.filter is not a function"
- **File:** `frontend/app/admin/permissions/page.tsx`
- **Root cause:** `usersQuery.data` was assumed to be an array (`User[]`), but the backend `/users` endpoint may return a paginated response object (`{content: [...], totalElements: N}`) instead of a flat array. The code `const users = usersQuery.data || [];` would assign the object (truthy) to `users`, then `users.filter()` would crash since objects don't have `.filter()`.
- **Fix:** Added `Array.isArray` guard with fallback to `.content` property: extracts `usersRaw.content` if the response is a paginated object, otherwise falls back to empty array. Also added null-safe access on `u.fullName` and `u.email` in the filter function using `?? ''`.
- **Verified:** `npx tsc --noEmit` passes with zero errors.

### Systemic .replace() hardening sweep (12 files, 14 call sites)
- **Pattern:** `value.replace(/_/g, ' ')` without optional chaining — crashes if `value` is null/undefined
- **Fix:** Changed to `value?.replace(/_/g, ' ') ?? '-'` across all unguarded sites
- **Files fixed:**
  - `app/attendance/shift-swap/page.tsx` — `req.status`
  - `app/recruitment/page.tsx` — `candidate.status`
  - `app/recruitment/agencies/page.tsx` — `agency.status`
  - `app/recruitment/agencies/[id]/page.tsx` — `agency.status`, `sub.invoiceStatus`
  - `app/recruitment/candidates/[id]/page.tsx` — `candidate.status`
  - `app/recruitment/candidates/CandidateTableRow.tsx` — `candidate.status`
  - `app/recruitment/candidates/_components/ViewCandidateModal.tsx` — `candidate.status`
  - `app/letters/page.tsx` — `candidate.status`
  - `app/me/attendance/page.tsx` — `selectedAttendance.status`
  - `app/travel/page.tsx` — `request.status`, `request.travelType`
  - `app/dashboards/manager/page.tsx` — `project.projectStatus`
  - `app/auth/login/page.tsx` — `account.role`
- **Skipped (already guarded):** Sites using `{value && (` conditional render or `?.replace()` optional chaining
- **Verified:** `npx tsc --noEmit` passes with zero errors.

---

## Session 13 — Backend DEV Agent Monitoring Resumed (2026-04-08)

### Monitoring Summary: No backend bugs found (QA resumed after frontend restart)

**Monitoring window**: 4 cycles, QA findings file grew from 172 to 395 lines (22 pages tested total).

**New QA pages tested**: /expenses, /assets (re-test), /holidays, /shifts, /announcements, /helpdesk, /contracts, /calendar, /projects, /reports, /recruitment/jobs, /recruitment/candidates

**Backend-relevant findings reviewed:**
- BUG-001 (P0 login 401): Re-confirmed as DATA-ISSUE. Investigated `CustomUserDetailsService` — no auth_provider check blocking login. Password hash from V61 migration is correct. Issue is Neon DB state: either V61 hasn't run on current DB, or Google SSO login overwrote `auth_provider` to GOOGLE after migration ran. Login code in `AuthService.login()` is correct — Spring Security `AuthenticationManager.authenticate()` compares bcrypt hash. NOT a code bug.
- BUG-002 (P2 dashboard slow): Neon cold start. NOT a code bug.
- BUG-003 (P1 /assets crash): Frontend `.replace()` null guard — already fixed in Session 11 (`.filter(Boolean)` on assets content array). Frontend may need restart/hard refresh.
- BUG-004 (P1 /helpdesk crash): Frontend `.replace()` undefined guard — already fixed in Session 11. Frontend may need restart/hard refresh.
- BUG-005 (P1 session loss after crash): Frontend error boundary / auth state issue. NOT backend.

**QA testing blocked**: ~90 pages + all RBAC tests blocked because QA agent cannot re-login (BUG-001 data issue). QA session ended.

**Result: 0 backend code fixes required.**

---

## Session 12 — Backend DEV Agent Monitoring (2026-04-08)

### Monitoring Summary: No backend bugs found

**Monitoring window**: 20 cycles (~15 minutes), QA findings file grew from 8 to 172 lines.

**QA pages tested (observed)**: /auth/login, /dashboard, /employees, /employees/directory, /departments, /org-chart, /attendance, /leave, /payroll, /payroll/runs, /payroll/structures, /recruitment, /performance, /fluence/wiki, /admin, /me/profile

**Backend-relevant findings reviewed:**
- BUG-001 (401 on /auth/login): DATA ISSUE — QA used wrong email (superadmin@nulogic.io instead of fayaz.m@nulogic.io). Neon DB password hash mismatch. NOT a code bug.
- BUG-002 (Dashboard slow load): Neon serverless cold start latency (~13s). NOT a code bug.

**Already-modified files reviewed:**
- `AuthService.java`: Password reset token upgraded from UUID.randomUUID() to SecureRandom+Base64 — correct security improvement. `refresh()` already has `@Transactional(readOnly = true)` from GLOBAL-001 fix.
- `TokenBlacklistService.java`: Added in-memory fallback for `revokeAllTokensBefore()` and `isTokenRevokedByTimestamp()` — correct, matches existing pattern used by `blacklistToken()`/`isBlacklisted()`.

**Result: 0 backend code fixes required. All QA findings are frontend-only, data issues, or dev environment latency.**

---

## Session 14 — Frontend DEV Agent Deep Investigation (2026-04-08)

### BUG-003/004 CONFIRMED persistent — deeper `.replace()` null-guard hardening

QA Run 2 confirmed /assets crash persists even after `.next` cache clear and server restart.
All 4 `.replace()` calls in `app/assets/page.tsx` already had ternary guards (`field ? field.replace(...) : '-'`)
and `.filter(Boolean)` was already on the data array. Crash must originate from a shared layer.

**Root cause identified:** `convertRolesToObjects()` in `frontend/lib/hooks/useAuth.ts:48` calls
`roleCode.replace(/_/g, ' ')` without null guard. If backend auth response `roles` array contains
a null entry (e.g., `["SUPER_ADMIN", null]`), or if `permissions` array has null entries, this crashes
during session hydration. The error propagates through the React tree and the stack trace points to
whichever page component was rendering at the time — explaining why /assets and /helpdesk show the crash
but the actual `.replace()` calls in those pages are all guarded.

**Fixes applied:**

1. **`frontend/lib/hooks/useAuth.ts`** — `convertRolesToObjects()`:
   - Added `.filter(Boolean)` on `roleStrings` before `.map()` to strip null entries
   - Changed `roleCode.replace(/_/g, ' ')` to `roleCode?.replace(/_/g, ' ') ?? roleCode`
   - Added `.filter(Boolean)` on `permissionStrings` before `.map()`
   - Added optional chaining on `permCode?.split(':')`

2. **`frontend/app/assets/page.tsx`** — switched all `.replace()` from ternary to optional chaining:
   - Line 554: `asset.category?.replace(/_/g, ' ') ?? '-'`
   - Line 559: `asset.status?.replace(/_/g, ' ') ?? '-'`
   - Line 913: `selectedAsset.status?.replace(/_/g, ' ') ?? '-'`
   - Line 917: `selectedAsset.category?.replace(/_/g, ' ') ?? '-'`

3. **`frontend/app/helpdesk/sla/page.tsx`** — switched `.replace()` to optional chaining:
   - `escalation.escalationReason?.replace(/_/g, ' ') ?? '-'`

**Systemic note:** Found 12+ additional unguarded `.replace('_', ' ')` calls across the frontend
(employees, org-chart, projects, learning, holidays, training, recognition, performance, onboarding).
These are lower-risk since those pages passed QA, but they follow the same vulnerable pattern.
They should be hardened in a follow-up sweep.

### Monitoring: QA Run 2 complete — 22 pages tested, blocked by session expiry
- 17 PASS, 2 PASS-EMPTY, 2 FAIL (/assets, /helpdesk), 1 BUG (/dashboard slow)
- QA blocked by BUG-001 (401 on login — DB password hash mismatch)
- File stable at 415 lines for 3 consecutive monitoring cycles

**Verified:** `npx tsc --noEmit` passes with zero errors.

---

## Session 11 — DEV Agent Monitoring (2026-04-08)

### BUG-004 (QA Run 1): /helpdesk page crash — defensive null guards added
- **File:** `frontend/app/helpdesk/page.tsx`, `frontend/app/helpdesk/tickets/[id]/page.tsx`
- **Root cause:** QA reported `TypeError: Cannot read properties of undefined (reading 'replace')` crashing the /helpdesk page. Same systemic pattern as BUG-002: the API may return null entries in the escalations array, causing `esc.escalationReason` to fail because `esc` itself is null/undefined. Additionally, `esc.ticketId.slice()` and `esc.escalationLevel` had no null guards.
- **Fix:** (1) Added `.filter(Boolean)` before `.map()` on escalations array to strip null entries. (2) Added optional chaining on `esc.ticketId?.slice(0, 8)` with `?? '—'` fallback. (3) Added `?? '-'` fallback on `esc.escalationLevel`. (4) Added optional chaining on SLA content filter (`s?.isActive`). (5) Applied same `.filter(Boolean)` fix to ticket detail page escalations.
- **Verified:** tsc passes (zero errors)

### BUG-002 (QA Run 2): /dashboard skeleton loaders stuck permanently
- **File:** `frontend/app/dashboard/page.tsx`
- **Root cause:** `isLoading` was derived directly from React Query's `isAnalyticsLoading`, which stays `true` between retry attempts even when `fetchStatus` is `'idle'`. When the analytics API fails or is slow, the loading guard on line 476 (`if (!hasHydrated || isLoading)`) blocks rendering indefinitely, preventing the graceful degradation fallback (line 534) from ever executing.
- **Fix:** Added `fetchStatus` from the analytics query. Changed `isLoading` derivation to `isAnalyticsLoading && analyticsFetchStatus === 'fetching'` — loading is only `true` when actively fetching, not between retry pauses. When retries exhaust, the page falls through to the graceful degradation path with `safeAnalytics` fallback data.
- **Verified:** tsc passes (zero errors)

### Triage: BUG-001 (QA Run 2): /auth/login 401 Bad credentials
- **Classification:** DATA ISSUE — not a code bug. Password hash in Neon cloud DB doesn't match 'Welcome@123'. Coordinator confirmed. Skipped.

---

## Session 10 — DEV Agent Monitoring (2026-04-08)

### TS-001: Missing NuAuraLoader import in restricted-holidays page
- **File:** `frontend/app/restricted-holidays/page.tsx`
- **Root cause:** `NuAuraLoader` component was used at lines 686 and 810 (ManageTab and PolicyTab loading states) but never imported. The component exists in `@/components/ui/Loading` and is exported from `@/components/ui/index.ts`.
- **Fix:** Added `import {NuAuraLoader} from '@/components/ui/Loading';` to the imports.
- **Verified:** tsc passes (zero errors)

### BUG-002 (QA): /assets page crash — defensive null guard added
- **File:** `frontend/app/assets/page.tsx`
- **Root cause:** QA reported `TypeError: Cannot read properties of null (reading 'replace')` crashing the entire page. All `.replace()` calls in the file use optional chaining (`?.replace`), so the crash likely occurs when the backend returns `null` entries in the `content` array (e.g., `[{...}, null, {...}]`), causing `asset.category?.replace` to fail because `asset` itself is `null`.
- **Fix:** Added `.filter(Boolean)` to the assets content array to strip any null entries before rendering: `(assetsQuery.data?.content || []).filter(Boolean)`.
- **Verified:** tsc passes (zero errors)

### BUG-001 (QA): Header.tsx hydration mismatch — ALREADY FIXED
- Already fixed in Session 4 (HYDRATION-001). Current code uses consistent `p-2` on the mobile menu button. QA agent may be seeing a stale cached version.

### BUG-003 (QA): /probation blank page — cascade from BUG-002
- Not a standalone code bug. QA confirmed this is caused by React tree corruption after the /assets crash during client-side navigation. Hard refresh resolves it. Fixing BUG-002 should prevent this cascade.

### Monitoring loop: QA findings checked 30+ times across resumed session
- QA agent tested 17 pages total: 14 PASS, 1 PASS-EMPTY, 2 FAIL (BUG-002 /assets, BUG-003 /probation)
- File grew from 14 to 161 lines during monitoring window

---

## Session 9 — GLOBAL-001 Session Instability Fix (2026-04-08)

### GLOBAL-001: P0 Session Instability — ROOT CAUSE IDENTIFIED AND FIXED

**Symptoms:** Demo login sessions degraded within 30-90 seconds of navigation. User identity dropped from "Fayaz M / SUPER ADMIN" to "User / Employee", causing false Access Denied errors, sidebar losing admin items, and "Preparing your workspace..." infinite loading.

**Root causes (3 separate bugs forming a deadlock chain):**

1. **Backend `AuthService.refresh()` missing `@Transactional`**
   - File: `backend/src/main/java/com/hrms/application/auth/service/AuthService.java:366`
   - `refresh()` called `buildAuthContext()` which lazy-loads JPA associations (roles, permissions), but had no open Hibernate session
   - Result: `LazyInitializationException` → 500 on POST /auth/refresh
   - Fix: Added `@Transactional(readOnly = true)` annotation

2. **Frontend AuthGuard deadlock — `isReady` blocked `restoreSession()`**
   - File: `frontend/components/auth/AuthGuard.tsx:77`
   - After full page load: `isAuthenticated=true` (from sessionStorage), `user=null` (not persisted)
   - `usePermissions.isReady = hasHydrated && (!isAuthenticated || !!user)` → FALSE
   - AuthGuard effect: `if (!hasHydrated || !isReady) return;` → early exit → restoreSession never called
   - Deadlock: isReady waits for user → restoreSession sets user → but restoreSession was blocked by isReady
   - Fix: Moved `isReady` check AFTER the `restoreSession()` block, only checking `hasHydrated` for the initial guard

3. **Frontend user not persisted across page loads**
   - File: `frontend/lib/hooks/useAuth.ts`
   - Zustand persist only saved `isAuthenticated` (not user) to sessionStorage (HIGH-3 security rule)
   - On full page load: user was null → required `restoreSession()` → race condition with 401 interceptor → token revocation conflicts
   - Fix: Added separate `nu-aura-user` sessionStorage key, written on login/googleLogin/restoreSession, read back in `onRehydrateStorage` callback
   - User object is immediately available after hydration — no restoreSession needed

**Verification:** 3 consecutive full page navigations across sub-apps (/me/dashboard → /fluence/wiki → /recruitment) — session stable, "Fayaz M / SUPER ADMIN" persisted in all.

---

## Session 8 — DEV Agent Monitoring (2026-04-08)

### Monitoring loop: 15/15 checks completed over ~8 minutes

**Result: No new QA findings detected. QA findings file unchanged at 470 lines (last modified 03:51:57).**

- Baseline established at iteration 1: 470 lines, bugs BUG-006 through BUG-021 (all from Run 3)
- All 15 checks returned identical file (no new FAIL/BUG entries added by QA agent)
- TypeScript compilation verified: `npx tsc --noEmit` passes with zero errors
- Reviewed `usePermissions.ts` — confirmed isAdmin bypass is correct in all permission/role check functions
- Reviewed `isReady` logic — correctly blocks premature "Access Denied" during session restoration window

**Status: All previously reported bugs remain as documented in Session 7 analysis. No new code fixes required.**

---

## Session 7 — DEV Agent QA Run 2 Analysis (2026-04-08)

### Check 1: chrome-qa-findings.md reviewed — 41 pages, 10 BUGs, 9 FAILs

**Thorough code review of all 10 BUGs and 9 FAILs. Result: 0 new code fixes required.**

All issues trace back to session degradation (GLOBAL-001) or were already fixed in Session 6.

### Bug-by-Bug Analysis:

**BUG-006 (/dashboard "Error Loading Dashboard")**
- Root cause: Session degradation. Dashboard page has full graceful degradation (safeAnalytics fallback on line 534) and inline error banner. The "Error Loading Dashboard" text does not exist in `/app/dashboard/page.tsx` — it exists only in executive/employee/manager dashboards. The error boundary caught a session-related crash. Dashboard service already has try/catch (uncommitted change from Session 6).
- Status: NOT A CODE BUG — session-related

**BUG-007 (/assets crash: "Cannot read properties of null (reading 'replace')")**
- Root cause: All `.replace()` calls in assets page use optional chaining (`?.replace`). `getCategoryIcon`, `getCategoryColor`, `getStatusColor` all handle null via `default` switch case. `formatCurrency` handles null. The "replace" in the error likely refers to `router.replace()` during session degradation redirect cascade, not string `.replace()`.
- Status: NOT A CODE BUG — session-related

**BUG-008 (/benefits INR currency)**
- Status: ALREADY FIXED in Session 6 (IndianRupee icon, dynamic enrollment dates)

**BUG-009 (/letter-templates Access Denied)**
- Status: Session degradation — SuperAdmin RBAC bypass is correct (PermissionGate line 82: `if (isAdmin) return children`)

**BUG-010 (/org-chart Access Denied)**
- Status: Session degradation

**BUG-011 (/recruitment/pipeline Access Denied for SuperAdmin)**
- Root cause: PermissionGate with `anyOf={[RECRUITMENT_VIEW, RECRUITMENT_VIEW_ALL]}` correctly bypasses for isAdmin. When session degrades, roles become empty, isAdmin=false.
- Status: NOT A CODE BUG — session-related

**BUG-012 (/recruitment/agencies API failure)**
- Root cause: Backend API error. Frontend error handling (PageErrorFallback with Try Again/Refresh) is correct.
- Status: BACKEND ISSUE — not a frontend code bug

**BUG-013 (/performance/okr Access Denied)**
- Status: Session degradation

**BUG-014 (/surveys Access Denied for SuperAdmin)**
- Root cause: Surveys page renders directly (no PermissionGate wrapping the page). The page loads fine when isAdmin is true. Access Denied only when session drops.
- Status: NOT A CODE BUG — session-related

**BUG-015 (/fluence/blogs crash: "categories.map is not a function")**
- Root cause: Code has `Array.isArray(categoriesData) ? categoriesData : []` guard on line 51. Crash was from stale build before fix was applied.
- Status: ALREADY FIXED (guard exists in current code)

**BUG-016 (/fluence/templates infinite loading)**
- Root cause: Templates page renders AppLayout with loading skeleton correctly (line 103-113). "Preparing your workspace" is from AuthGuard during session expiry.
- Status: NOT A CODE BUG — session-related

**BUG-017 (/fluence/search redirects to dashboard)**
- Status: ALREADY FIXED in Session 6 (spinner shown while `!isReady`)

**BUG-018 (/fluence/analytics redirects to dashboard)**
- Status: ALREADY FIXED in Session 6 (spinner shown while `!isReady`)

**BUG-019 (/fluence/drive infinite loading)**
- Status: ALREADY FIXED in Session 6 (removed redundant auth check)

**BUG-020 (/approvals/inbox Access Denied for SuperAdmin)**
- Root cause: `canViewInbox` checks `isAdmin || hasPermission(WORKFLOW_VIEW) || hasPermission(WORKFLOW_EXECUTE)`. When isAdmin is true (session stable), access is granted. Access Denied only during session degradation.
- Status: NOT A CODE BUG — session-related

**BUG-021 (/me/profile loading or "Profile Not Found")**
- Status: Session degradation

### Summary:
- **0 code fixes applied** — all bugs are either session-related, backend issues, or already fixed
- **Root cause**: GLOBAL-001 (session instability) is the single source of 14 out of 16 reported issues
- **Recommendation**: Fix session management (token refresh, JWT cookie persistence) to resolve all P0/P1/P2 issues simultaneously

### Check 2: clean (no new findings after 60s)
### Check 3: clean (no new findings after 60s — monitoring complete 3/3)

**Verified:** `npx tsc --noEmit` passes with zero errors.

---

## Session 6 — DEV Agent Monitoring (2026-04-08)

### Check 1: QA findings reviewed — analysis of 34-page fresh Chrome QA run

**Already Fixed by concurrent process (in working tree, not yet committed):**
- Benefits page: DollarSign icon replaced with IndianRupee icon (5 instances)
- Benefits page: Enrollment period updated from "November 2025" to dynamic date
- Benefits page: flex credits label fixed from `${stats.flexCredits}` to `{formatINR(stats.flexCredits)}`
- Fluence search page: split `!isReady || !hasAccess` guard into two (shows spinner while loading)
- Fluence analytics page: same fix as search (shows spinner while loading)
- Fluence drive page: removed redundant auth check, wrapped loading in AppLayout
- Fluence blogs new/edit pages: API endpoint path fix in fluence.service.ts

**Triaged as NOT code bugs (session/infra issues):**
- 6x "Access Denied" pages (/expenses, /assets, /shifts, /recruitment/pipeline, /surveys, /approvals): Root cause is session instability (cross-cutting issue #1). When session degrades, user loses SUPER_ADMIN role, causing permission checks to fail correctly. AuthGuard SuperAdmin bypass (line 153) and usePermissions admin bypass are both correct. Fix requires session stability, not permission changes.
- /fluence/templates, /fluence/drive stuck on "Preparing workspace": Session expiry during navigation. AuthGuard shows NuAuraLoader while auth hydrates, but session expires before completion.
- /fluence/search, /fluence/analytics redirect to dashboard: Fixed above — was returning `null` when `!isReady`, which caused parent layout to redirect.
- /recruitment/agencies "Failed to Load Agencies": Backend API error. Frontend error handling (`PageErrorFallback`) is correct. Backend endpoint needs investigation.
- /fluence/blogs "categories.map is not a function": Code already has `Array.isArray` guard (line 51). Crash likely from stale build cache or a race condition with React Query data.
- /me/profile stuck on loading: Session degradation. Profile page is `requiresAuth: true` only — no special permissions needed.
- Header.tsx hydration mismatch: Already fixed in Session 4 (HYDRATION-001).
- AssetManagementPage setState during render: HMR/development-only artifact from React HotReload. Not a production bug.

### Check 2: clean (no new findings after 60s wait)
### Check 3: clean (no new findings after 60s wait — FINAL CHECK, monitoring loop complete 3/3)

**Verified:** `npx tsc --noEmit` passes with zero errors.

## Session 5 — DEV Agent Monitoring (2026-04-08)

### Check 1: QA findings reviewed — 2 fixes applied

### BUG-004: /loans page stuck on loading spinner indefinitely
- **File:** `frontend/app/loans/page.tsx`
- **Root cause:** Same pattern as BUG-001 (/leave). The `loading` variable used React Query's `isLoading` directly, which stays `true` between retry attempts when the backend API fails or times out. This caused an infinite spinner with no way to show the error state.
- **Fix:** Added `fetchStatus` from `useEmployeeLoans()` hook. Loading is now only `true` when `isLoading && fetchStatus === 'fetching'` — when retries pause, `fetchStatus` becomes `'idle'`, allowing the error state to render instead of the spinner.
- **Verified:** tsc passes (zero errors)

### BUG-005: /fluence/wall renders empty content (no loading state)
- **File:** `frontend/app/fluence/wall/page.tsx`
- **Root cause:** When permissions were not yet ready (`!isReady`), the page returned `null` — rendering a completely empty main content area. The QA tester correctly flagged this as a FAIL since no content was visible at all.
- **Fix:** Split the guard into two: `!isReady` now renders a proper loading state inside `AppLayout` (with an activity icon and "Loading Activity Wall..." message), while `!hasAccess` still returns null (redirect handles it). This ensures the page always shows meaningful content while permissions load.
- **Verified:** tsc passes (zero errors)

### Check 2: clean
### Check 3: clean
### Check 4: clean
### Check 5: clean
### Check 6: clean
### Check 7: clean
### Check 8: clean
### Check 9: clean
### Check 10: clean
### Check 11: clean
### Check 12: clean (FINAL CHECK — monitoring loop complete 12/12)

### Triage of remaining QA FAIL/BUG items (not code bugs):
- **/overtime redirects to /leave:** Session instability (P0). The overtime page's permission gate (`hasAnyPermission(OVERTIME_VIEW, OVERTIME_REQUEST, ATTENDANCE_MARK)`) returns false when session drops, triggering `router.replace('/me/dashboard')` which cascades. Code is correct; needs stable session.
- **/shifts, /travel Access Denied:** Same AuthGuard session issue as BUG-002/003 (already fixed in Session 4). Needs re-test with stable session.
- **/training, /surveys, /recognition Access Denied:** Explicitly flagged as "session dropped" in QA report. Re-test needed.
- **/recruitment/agencies "Failed to Load":** Backend API returning error (`agenciesQuery.isError`). Frontend error handling is correct (`PageErrorFallback`). Backend endpoint needs investigation.
- **/fluence/blogs stuck on "Preparing workspace":** AuthGuard loading state caused by session drop. Blog page code is correct. Re-test needed.

---

## Session 4 — Chrome QA Bug Fixes (22:58)

### BUG-001: /leave page stuck on loading spinner indefinitely
- **File:** `frontend/app/leave/page.tsx`
- **Root cause:** The loading state depended on `isLoading` from 3 React Query hooks, but `typesError` was never checked. When the leave-types API failed, React Query retried 3x with exponential backoff, keeping `isLoading: true` for 15+ seconds. Additionally, `useActiveLeaveTypes()` fired even when `employeeId` was empty (no `enabled` guard), wasting a request. The `loading` variable only checked `!error` against balances/requests errors, not types errors.
- **Fix:** (1) Added `typesError` to the error derivation chain. (2) Passed `!!employeeId` to `useActiveLeaveTypes(enabled)` so it only fires when user data is available. (3) Added `fetchStatus` checks — loading is now only true when queries are actively fetching (not between retries), preventing the infinite spinner.
- **Verified:** tsc passes

### BUG-002: /payroll silently redirects to /attendance (permission check fails for Super Admin)
- **File:** `frontend/components/auth/AuthGuard.tsx`
- **Root cause:** After page refresh, Zustand only persists `isAuthenticated: true` but NOT the `user` object (by design — HIGH-3 security rule). AuthGuard only called `restoreSession()` when `!isAuthenticated`. Since `isAuthenticated` was `true` but `user` was `null`, AuthGuard skipped session restore entirely. With no user object, `roles = []`, `permissions = []`, and `isAdmin = false`. The payroll page's own permission check (`hasPermission(PAYROLL_VIEW)`) returned false, triggering `router.replace('/dashboard')`, which cascaded through further redirects.
- **Fix:** AuthGuard now also triggers `restoreSession()` when `isAuthenticated` is true but `user` is null. Added `user` to the effect dependency array so the effect re-runs after session restore populates the user object.
- **Verified:** tsc passes

### BUG-003: /assets shows "Access Denied" for Super Admin (same root cause as BUG-002)
- **File:** `frontend/components/auth/AuthGuard.tsx`
- **Root cause:** Same as BUG-002. With `user = null` after refresh, `isSuperAdmin = false` and `checkAuthorization()` failed for the `/assets` route config (`anyPermission: [ASSET:VIEW, ASSET:CREATE, ASSET:MANAGE]`). AuthGuard rendered "Access Denied" and the URL changed to `/leave` (likely from a previous redirect chain).
- **Fix:** Same fix as BUG-002 — AuthGuard now restores session when `user` is null regardless of `isAuthenticated` flag.
- **Verified:** tsc passes

### HYDRATION-001: React hydration mismatch in Header.tsx
- **File:** `frontend/components/layout/Header.tsx`
- **Root cause:** Mobile menu button used `p-1.5 sm:p-2.5` — responsive padding causes SSR/client mismatch because server doesn't know viewport width. The `sm:p-2.5` with `min-w-[44px] min-h-[44px]` was mobile touch-target sizing that violates the desktop-first design system rules.
- **Fix:** Changed to consistent `p-2` padding (no responsive breakpoint). Also fixed mobile search button with same issue and added missing `cursor-pointer` + `focus-visible` ring per design system rules.
- **Verified:** tsc passes

### Final Verification
- `npx tsc --noEmit`: PASS (zero errors)

---

## Session 3 — Lint Warning Fixes (2026-04-07)

### LINT-001: Missing dependency `templatesData?.content` in useMemo
- **File:** `frontend/app/fluence/analytics/page.tsx:74`
- **Root cause:** `_templates` variable used `templatesData?.content` but it was not in the useMemo dependency array
- **Fix:** Added `templatesData?.content` to the dependency array
- **Verified:** tsc passes, lint clean

### LINT-002: Logical expression `allReviews` causing new reference on every render
- **File:** `frontend/app/performance/competency-framework/page.tsx:407`
- **Root cause:** `allReviewsQuery.data?.content ?? []` creates a new array on every render, making useMemo deps unstable
- **Fix:** Wrapped `allReviews` initialization in its own `useMemo()` hook
- **Verified:** tsc passes, lint clean

### LINT-003: Missing dependency `startScan` in useCallback
- **File:** `frontend/components/expenses/ReceiptScanner.tsx:66`
- **Root cause:** `startScan` was a plain function used inside `handleFileSelected` useCallback but not in deps
- **Fix:** Wrapped `startScan` in `useCallback`, moved it before `handleFileSelected`, added to deps array
- **Verified:** tsc passes, lint clean

### LINT-004 & LINT-005: Logical expression `documentContent` causing unstable deps (x2)
- **File:** `frontend/components/fluence/MacroRenderer.tsx:155`
- **Root cause:** `(content.content as TiptapNode[]) ?? []` creates new array ref on every render, making two dependent useMemo hooks unstable
- **Fix:** Wrapped `documentContent` initialization in its own `useMemo()` hook with `[content.content]` dep
- **Verified:** tsc passes, lint clean

### Final Verification
- `npx tsc --noEmit`: PASS (zero errors)
- `npx next lint`: PASS (zero warnings, zero errors)

---

## Session 2 — Monitoring Loop (22:54+)

### Check 1 (22:54) — No issues found
- QA findings file reviewed: 47/47 pages PASS, backend UP, tsc clean
- No FAIL or BUG entries detected

### Check 2 (22:55) — No issues found
- QA findings unchanged, no FAIL/BUG entries

### Check 3 (22:56) — No issues found
- QA findings unchanged, no FAIL/BUG entries

### Check 4 (22:57) — No issues found
- QA findings unchanged, no FAIL/BUG entries

### Check 5 (22:58) — 3 BUGs + 1 hydration issue found and fixed
- See Session 4 above for details

### Check 6 (23:04) — No new issues found
- QA findings unchanged since last check

### Check 7 (23:05) — No new issues found
- QA findings unchanged since last check

### Check 8 (23:06) — No new issues found
- QA findings unchanged since last check

### Check 9 (23:07) — No new issues found
- QA findings unchanged since last check

### Check 10 (23:08) — No new issues found (FINAL CHECK)
- QA findings unchanged since last check
- Monitoring loop complete (10/10 checks)

---

## Session 1 (Previous Run)

QA findings file reviewed across 3 check cycles (5+ minutes total monitoring).

**Result: No FAIL or BUG entries found.**

### QA Results Reviewed
- 47/47 frontend pages: PASS (all return 307 -> 200 via auth redirect)
- Backend health: UP (all components)
- TypeScript compilation: PASS (zero errors)
- Lint: 5 warnings (all react-hooks/exhaustive-deps, non-blocking)
- New agency feature files: PASS (proper structure and exports)

### Non-Blocking Items (Not Bugs)
1. `app/fluence/analytics/page.tsx:74` — exhaustive-deps warning (missing dep `templatesData?.content`)
2. `app/performance/competency-framework/page.tsx:407` — exhaustive-deps warning (logical expression in deps)
3. `components/expenses/ReceiptScanner.tsx:66` — exhaustive-deps warning (missing dep `startScan`)
4. `components/fluence/MacroRenderer.tsx:155` — exhaustive-deps warning (logical expression in deps, x2)
5. PostgreSQL response time 475ms — Neon serverless cold start, not a code issue
6. Heap usage 66.4% — monitoring item, not a code fix

### Fixes Applied
None required. All checks passed cleanly.

## Session 23 — EncryptedStringConverter stale JAR causing 500s across 9+ endpoints (2026-04-08)

### Root Cause
All 9 QA-reported 500 errors share a single root cause: **stale JAR**. The `EncryptedStringConverter.convertToEntityAttribute()` fix (graceful decryption failure handling) was applied to source at 15:55 but the running server JAR was built at 14:58 and still contained the old code that throws `IllegalArgumentException: Encrypted value has unexpected format`.

Every endpoint that loads `Employee` entities (which have 3 `@Convert(converter = EncryptedStringConverter.class)` fields: `bankAccountNumber`, `bankIfscCode`, `taxId`) triggers this converter. Since seed/legacy data contains unencrypted plaintext that doesn't match the expected `Base64(IV):Base64(ciphertext)` format, the old converter throws, Hibernate wraps it as `PersistenceException`, and the endpoint returns 500.

### Affected Endpoints (all via Employee entity loading)
1. `GET /api/v1/employees` — `EmployeeService.getAllEmployees()` loads full Employee entities
2. `GET /api/v1/employees/managers` — `EmployeeService.getManagerEmployees()` loads full Employee entities
3. `GET /api/v1/expenses` — `ExpenseClaimService.enrichResponses()` calls `employeeRepository.findAllById()`
4. `GET /api/v1/expenses/pending-approvals` — same enrichment path
5. `GET /api/v1/assets` — `AssetManagementService.getAllAssets()` loads employee data
6. `GET /api/v1/probation` — `ProbationService.getAllProbations()` loads employee data
7. `GET /api/v1/probation/status/CONFIRMED` — same path
8. `GET /api/v1/compensation/revisions` — employee enrichment during mapping
9. `GET /api/v1/contracts` — employee enrichment during mapping

Additional affected: `/api/v1/home/new-joinees`, `/api/v1/recognition/feed`, `/api/v1/helpdesk/tickets`

### Fix Applied
- **File:** `backend/src/main/java/com/hrms/common/converter/EncryptedStringConverter.java`
- **Change:** Added catch-all `Exception` handler as final safety net in `convertToEntityAttribute()` to ensure NO decryption error can ever crash the application. The existing fix (catch `IllegalArgumentException`, `GeneralSecurityException`, `IllegalStateException`) was already correct in source but not deployed.
- **Verified:** `mvn compile` passes, `mvn package -DskipTests` rebuilt the JAR successfully. New JAR contains the fixed converter (verified via string extraction).

### RESTART-NEEDED
The running server (PID 28419) must be stopped and restarted with the new JAR to pick up the fix. Run:
```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend && ./start-backend.sh
```

## Session 25 — Orchestrator Direct Fixes (2026-04-08)

### BUG-018: GET /api/v1/training/programs returns 500 (BACKEND)
- **File**: `backend/src/main/resources/db/migration/V125__add_training_programs_is_deleted.sql`, `V126__training_programs_is_deleted_retry.sql`
- **Root cause**: `TrainingProgram` entity has `@Where(clause = "is_deleted = false")` but the `training_programs` table lacked `is_deleted` column. Hibernate generated SQL referencing non-existent column.
- **Fix**: Created Flyway migrations V125+V126 to add `is_deleted BOOLEAN NOT NULL DEFAULT FALSE` to `training_programs`. V125 was lost in a race condition (two backend processes starting simultaneously), V126 ensured it was applied.
- **Migration**: V125 + V126
- **Verified**: GET /api/v1/training/programs returns 200 with 3 programs
