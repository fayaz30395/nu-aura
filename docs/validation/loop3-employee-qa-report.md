# Loop 3: Employee Self-Service & People Management - QA Report

> **QA Agent** | Sweep Loop 3 | 2026-03-31
> **Method:** Static code analysis (source-level reading, not browser testing)
> **Scope:** Employee self-service routes (`/me/profile`, `/me/leaves`, `/me/attendance`, `/me/payslips`, `/me/documents`), people management routes (`/employees`, `/employees/[id]`, `/employees/[id]/edit`, `/employees/directory`, `/employees/change-requests`, `/employees/import`), organization route (`/team-directory`)

---

## 1. Test Execution Matrix

### 1.1 Self-Service Routes (MY SPACE)

| # | Route | Test Case | Status | Notes |
|---|-------|-----------|--------|-------|
| 1 | `/me/profile` | Data fetching | PASS | `useMyEmployee(hasHydrated && isAuthenticated)` -- React Query, properly gated on auth state |
| 2 | `/me/profile` | RBAC (frontend) | PASS | No PermissionGate -- correct per CLAUDE.md: "MY SPACE items must NEVER have requiredPermission" |
| 3 | `/me/profile` | RBAC (backend) | PASS | `GET /employees/me` has `@RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)`. `PUT /employees/me` also has `EMPLOYEE_VIEW_SELF` and restricts to self-service fields only |
| 4 | `/me/profile` | Form validation | PASS | RHF + Zod (`profileFormSchema`) for profile edit. Bank change modal uses separate `bankChangeSchema` with Zod |
| 5 | `/me/profile` | Self-edit scope | PASS | Backend `updateMyEmployee` explicitly clears admin-only fields (designation, department, status, etc.) before delegating to service. Only personal info fields are updatable |
| 6 | `/me/profile` | Bank change workflow | PASS | Bank detail changes go through `employmentChangeRequestService.createChangeRequest()` -- routed to HR approval workflow, not direct update |
| 7 | `/me/profile` | Loading state | PASS | Spinner shown while `isLoading` is true |
| 8 | `/me/profile` | Empty state | PASS | "Profile Not Found" card with AlertCircle icon when `!employee` |
| 9 | `/me/profile` | Auth redirect | PASS | `useEffect` checks `isAuthenticated` after hydration, redirects to `/auth/login` |
| 10 | `/me/profile` | Sensitive data masking | PASS | Bank account number masked: `****${slice(-4)}` |
| 11 | `/me/profile` | Error handling | PASS | Error state displayed with dismiss-able alert. Mutation errors extracted from Axios response |
| 12 | `/me/profile` | Error boundary | PASS | `error.tsx` exists at `/me/profile/error.tsx` |
| 13 | `/me/profile` | Loading skeleton | PASS | `loading.tsx` exists at `/me/profile/loading.tsx` |
| 14 | `/me/leaves` | Data fetching | PASS | `useEmployeeLeaveRequests`, `useEmployeeBalances`, `useActiveLeaveTypes` -- all React Query, gated on `hasHydrated && user?.employeeId` |
| 15 | `/me/leaves` | Form validation | PASS | RHF + Zod (`leaveFormSchema`) for leave application. Separate `cancelFormSchema` for cancellation reason |
| 16 | `/me/leaves` | RBAC (frontend) | PASS | No PermissionGate -- self-service route |
| 17 | `/me/leaves` | Leave calculation | PASS | `calculateDays()` computes diff correctly, handles half-day toggle |
| 18 | `/me/leaves` | Leave encashment | PASS | Encashment modal with days input and reason -- uses separate state management |
| 19 | `/me/leaves` | Edit leave request | PASS | `handleEdit` pre-populates form via `resetLeave()` with existing values, then resubmits via `updateLeaveRequest.mutateAsync` |
| 20 | `/me/leaves` | Cancel leave request | PASS | Uses RHF + Zod for cancellation reason, calls `cancelLeaveRequest.mutateAsync` |
| 21 | `/me/leaves` | Filter support | PASS | Status filter (`ALL`, per-status) and leave type filter |
| 22 | `/me/leaves` | Empty state (no employee) | PASS | Error message "No employee profile found" when `!user.employeeId` |
| 23 | `/me/leaves` | Error boundary | PASS | `error.tsx` exists at route level |
| 24 | `/me/leaves` | Loading skeleton | PASS | `loading.tsx` exists at route level |
| 25 | `/me/attendance` | Data fetching | PASS | `useAttendanceByDateRange`, `useMyTimeEntries` -- React Query, gated on `hasHydrated && user?.employeeId` |
| 26 | `/me/attendance` | Check-in/out | PASS | `useCheckIn` / `useCheckOut` mutations with date/time from `getLocalDateString()` utility |
| 27 | `/me/attendance` | RBAC (frontend) | PASS | No PermissionGate -- self-service route |
| 28 | `/me/attendance` | Calendar navigation | PASS | Month navigation with `previousMonth()`/`nextMonth()`, day selection with color-coded status indicators |
| 29 | `/me/attendance` | Regularization form | **FAIL** | DEF-42 -- Regularization modal uses raw `useState` + uncontrolled `<textarea>` instead of React Hook Form + Zod. Violates code rules: "All forms must use React Hook Form + Zod. No uncontrolled inputs." |
| 30 | `/me/attendance` | Stats calculation | PASS | Monthly stats (present, absent, leave, avg hours) computed from attendance array. Division-by-zero guard: `workingDaysCount > 0` |
| 31 | `/me/attendance` | Time sessions | PASS | Session list per selected date with sequence numbers, check-in/out times, active session indicator |
| 32 | `/me/attendance` | Empty state (no employee) | PASS | "No Employee Profile Linked" message with CTA to Team Attendance |
| 33 | `/me/attendance` | Error boundary | PASS | `error.tsx` exists at route level |
| 34 | `/me/payslips` | Data fetching | PASS | `usePayslipsByEmployee` for self-view, `usePayslips` for admin view -- React Query, properly gated |
| 35 | `/me/payslips` | RBAC (frontend) | PASS | No PermissionGate -- self-service route |
| 36 | `/me/payslips` | Admin toggle | PASS | Admin users (HR_MANAGER, PAYROLL_ADMIN, etc.) can toggle between "My Payslips" and "All Employee Payslips" views |
| 37 | `/me/payslips` | PDF download | PASS | `useDownloadPayslipPdf` mutation creates blob URL, downloads via dynamic `<a>` element, then revokes URL |
| 38 | `/me/payslips` | Year filter | PASS | Year derived from payslip dates, with "All Years" option. Search also filters by month/status/employee name |
| 39 | `/me/payslips` | Empty state | PASS | "No Payslips Found" card with contextual message (search vs year) |
| 40 | `/me/payslips` | Currency formatting | PASS | Uses `formatCurrency()` utility for all monetary values |
| 41 | `/me/payslips` | Error boundary | PASS | `error.tsx` exists at route level |
| 42 | `/me/documents` | Data fetching | PASS | `useMyDocumentRequests`, `useDocumentTypes` -- React Query, gated on `hasHydrated && !!user?.employeeId` |
| 43 | `/me/documents` | Form validation | PASS | RHF + Zod (`documentRequestSchema`) with proper enum validation for document type and delivery mode |
| 44 | `/me/documents` | RBAC (frontend) | PASS | No PermissionGate -- self-service route |
| 45 | `/me/documents` | Document types | PASS | Dynamic document type options from backend API, with UI metadata fallback for unknown types |
| 46 | `/me/documents` | Delivery mode | PASS | Radio buttons for DIGITAL/PHYSICAL/BOTH; delivery address field conditionally shown for PHYSICAL/BOTH |
| 47 | `/me/documents` | Status tracking | PASS | Status badges with icon/color config per status (PENDING, IN_PROGRESS, GENERATED, DELIVERED, REJECTED, CANCELLED) |
| 48 | `/me/documents` | Document download | PASS | Download button appears for GENERATED/DELIVERED documents with `generatedDocumentUrl`. Uses `safeWindowOpen` utility |
| 49 | `/me/documents` | Empty state | PASS | `EmptyState` component with "You haven't requested any documents yet" |
| 50 | `/me/documents` | Breadcrumbs | PASS | Breadcrumb navigation: My Dashboard > Documents |
| 51 | `/me/documents` | Error boundary | PASS | `error.tsx` exists at route level |

### 1.2 People Management Routes

| # | Route | Test Case | Status | Notes |
|---|-------|-----------|--------|-------|
| 52 | `/employees` | Data fetching | PASS | `useEmployees(currentPage, PAGE_SIZE, ...)` -- React Query with pagination, sort, search, status filter |
| 53 | `/employees` | RBAC (frontend) | PASS | `PermissionGate` wraps "Add Employee", "Import", and "Delete" buttons. Page data fetch relies on backend 403 for read access |
| 54 | `/employees` | RBAC (backend) | PASS | `@RequiresPermission({EMPLOYEE_VIEW_ALL, EMPLOYEE_VIEW_DEPARTMENT, EMPLOYEE_VIEW_TEAM, EMPLOYEE_VIEW_SELF})` on GET endpoint |
| 55 | `/employees` | Create form | PASS | RHF + Zod (`createEmployeeFormSchema`) with comprehensive field validation (email, required fields, enum types) |
| 56 | `/employees` | Error handling | PASS | Categorized error messages: 403 -> permission error, 401 -> session expired, 500 -> server error, Network Error -> connection issue |
| 57 | `/employees` | Pagination | PASS | `currentPage` state with `PAGE_SIZE=20`, `totalPages` from API response |
| 58 | `/employees` | Search/filter | PASS | Search query and status filter passed to API call, with debounce potential |
| 59 | `/employees` | Empty state | PASS | `EmptyState` component from `@/components/ui` |
| 60 | `/employees` | Loading state | PASS | `SkeletonTable` component for loading |
| 61 | `/employees` | Error boundary | PASS | `error.tsx` exists at route level |
| 62 | `/employees/[id]` | Data fetching | PASS | `useEmployee(employeeId)`, `useDottedLineReports`, `useSubordinates`, `useAssetsByEmployee` -- all React Query |
| 63 | `/employees/[id]` | RBAC (frontend) | PASS | Edit button wrapped in `PermissionGate(EMPLOYEE_UPDATE)`. Delete button in `PermissionGate(EMPLOYEE_DELETE)` |
| 64 | `/employees/[id]` | RBAC (backend) | PASS | `GET /employees/{id}` has `@RequiresPermission` + `enforceEmployeeViewScope()` with IDOR protection (CRITICAL-04 fix) |
| 65 | `/employees/[id]` | Data scope enforcement | PASS | `enforceEmployeeViewScope()` checks VIEW_ALL > VIEW_DEPARTMENT > VIEW_TEAM > VIEW_SELF hierarchy. Throws 403 if out of scope |
| 66 | `/employees/[id]` | Tab navigation | PASS | 5 tabs (About, Profile, Job, Documents, Assets) with URL-addressable sub-tabs via `searchParams` |
| 67 | `/employees/[id]` | Document categories | INFO | 9 document categories defined but all have `count: 0` hardcoded. No dynamic document count integration |
| 68 | `/employees/[id]` | Asset integration | PASS | Uses `useAssetsByEmployee` for assigned assets tab, with sub-tabs for assigned/requests/damages |
| 69 | `/employees/[id]` | Talent journey | PASS | `TalentJourneyTab` component imported for timeline display |
| 70 | `/employees/[id]` | Custom fields | PASS | `CustomFieldsSection` component for dynamic fields (EntityType.EMPLOYEE) |
| 71 | `/employees/[id]` | Error boundary | PASS | `error.tsx` exists at route level |
| 72 | `/employees/[id]/edit` | Data fetching | PASS | `useEmployee(employeeId)`, `useManagers()`, `useActiveDepartments()` -- React Query |
| 73 | `/employees/[id]/edit` | Form validation | PASS | RHF + Zod (`updateEmployeeFormSchema`) with comprehensive validation |
| 74 | `/employees/[id]/edit` | RBAC (frontend) | **FAIL** | DEF-43 -- No PermissionGate or `usePermissions` check on this page. Any authenticated user who knows the URL can navigate to the edit form. Backend enforces `EMPLOYEE_UPDATE` permission, so data won't save, but the form still renders with all employee data visible. |
| 75 | `/employees/[id]/edit` | RBAC (backend) | PASS | `PUT /employees/{id}` has `@RequiresPermission(Permission.EMPLOYEE_UPDATE)` |
| 76 | `/employees/[id]/edit` | Employment change workflow | PASS | `hasEmploymentFieldChanges()` detects changes to designation/level/department/manager/status/etc. and creates a change request instead of direct update |
| 77 | `/employees/[id]/edit` | Custom fields | PASS | `CustomFieldsSection` integration with `customFieldsApi.setFieldValues()` on submit |
| 78 | `/employees/[id]/edit` | Dotted-line managers | PASS | `dottedLineManager1Id` and `dottedLineManager2Id` fields always submitted directly (informational, no approval needed) |
| 79 | `/employees/[id]/edit` | Error boundary | PASS | `error.tsx` exists at route level |
| 80 | `/employees/directory` | Previous validation | PASS | Already validated in prior sweeps. Card grid layout. |
| 81 | `/employees/change-requests` | Data fetching | PASS | `useQuery` for change requests with filter toggle (pending/all). Uses `employmentChangeRequestService` |
| 82 | `/employees/change-requests` | RBAC (frontend) | **FAIL** | DEF-44 -- No page-level PermissionGate. The page body renders for any authenticated user. Approve/Reject buttons are individually gated with `PermissionGate(EMPLOYMENT_CHANGE_APPROVE)`, but the list of all pending change requests (with employee names, current/new values for designation, department, salary info) is visible to anyone. |
| 83 | `/employees/change-requests` | RBAC (backend) | PASS | All endpoints properly gated: `EMPLOYMENT_CHANGE_VIEW_ALL` for list, `EMPLOYMENT_CHANGE_APPROVE` for pending/approve/reject |
| 84 | `/employees/change-requests` | Approve flow | PASS | Confirm dialog before approval. Mutation invalidates query cache on success |
| 85 | `/employees/change-requests` | Reject flow | PASS | Rejection reason required (empty check before submit). Separate modal with text input |
| 86 | `/employees/change-requests` | Error handling | PASS | Toast notifications for success/failure on approve/reject |
| 87 | `/employees/change-requests` | Change type display | PASS | Color-coded badges for PROMOTION, DEMOTION, TRANSFER, ROLE_CHANGE, etc. |
| 88 | `/employees/change-requests` | Error boundary | PASS | `error.tsx` exists at route level |
| 89 | `/employees/import` | Data fetching | PASS | Direct service calls to `employeeService.downloadCsvTemplate()`, `previewImport()`, `executeImport()` |
| 90 | `/employees/import` | RBAC (frontend) | PASS | `PermissionGate(EMPLOYEE_CREATE)` wraps template download buttons, preview button, and execute button |
| 91 | `/employees/import` | RBAC (backend) | PASS | All import endpoints have `@RequiresPermission(Permission.EMPLOYEE_CREATE)` |
| 92 | `/employees/import` | File validation | PASS | File type check (CSV, XLS, XLSX by MIME type and extension). Size limit: 10MB |
| 93 | `/employees/import` | Preview before commit | PASS | 3-step flow: upload -> preview (shows valid/invalid rows, errors) -> execute with `skipInvalid` option |
| 94 | `/employees/import` | Drag and drop | PASS | `handleDrag`/`handleDrop` with `dragActive` visual feedback |
| 95 | `/employees/import` | Template download | PASS | CSV and XLSX template downloads available |
| 96 | `/employees/import` | Error boundary | PASS | `error.tsx` exists at route level |
| 97 | `/employees/import` | Form validation | **PARTIAL** | DEF-45 -- Import page uses raw `useState` for file selection instead of React Hook Form. While file inputs are inherently different from text forms, the code uses `useCallback` handlers rather than RHF patterns. Minor deviation from code rules but pragmatic for file upload UX. |

### 1.3 Organization Routes

| # | Route | Test Case | Status | Notes |
|---|-------|-----------|--------|-------|
| 98 | `/team-directory` | Data fetching | PASS | `useEmployees`, `useEmployeeSearch`, `useActiveDepartments` -- all React Query |
| 99 | `/team-directory` | RBAC (frontend) | INFO | No PermissionGate or `usePermissions`. This is an org-wide directory -- likely intentional for all employees to see. Backend enforces data scope on employee list API. |
| 100 | `/team-directory` | View modes | PASS | Grid/List toggle with animated card rendering (Framer Motion) |
| 101 | `/team-directory` | Employee cards | PASS | Clickable cards navigating to `/employees/{id}`. Shows name, designation, department, email |
| 102 | `/team-directory` | Search/filter | PASS | Search input and department filter |
| 103 | `/team-directory` | Pagination | PASS | `PAGE_SIZE = 20` with paginated employee fetch |

---

## 2. Defect Log

### DEF-42: `/me/attendance` regularization modal uses uncontrolled textarea (P3 - Low)

**Location:** `frontend/app/me/attendance/page.tsx` lines 37-38, 649-687
**Issue:** The regularization reason textarea uses raw `useState` + `onChange` handler instead of React Hook Form + Zod validation. The form only checks `!regularizationReason.trim()` to disable submit, with no Zod schema for minimum length, max length, or input sanitization.
**Expected:** All forms must use React Hook Form + Zod per code rules.
**Impact:** Low -- functional, but inconsistent with codebase patterns. No length limit on reason text.
**Fix:** Create a Zod schema (e.g., `z.object({ reason: z.string().min(1).max(1000) })`) and wire through `useForm` with `zodResolver`.

### DEF-43: `/employees/[id]/edit` has NO frontend PermissionGate (P1 - High)

**Location:** `frontend/app/employees/[id]/edit/page.tsx` -- entire file
**Issue:** The edit page has no `PermissionGate`, no `usePermissions` check, and no permission-based redirect. Any authenticated user who navigates to `/employees/{some-id}/edit` will see the full edit form pre-populated with employee data (name, email, phone, bank details, tax ID, department, salary-related fields). The backend `PUT /employees/{id}` endpoint has `@RequiresPermission(Permission.EMPLOYEE_UPDATE)` which will return 403 on save, but all data is exposed in the form.
**Expected:** Page-level `PermissionGate` or `usePermissions` redirect for `EMPLOYEE_UPDATE` permission, consistent with the detail page (`/employees/[id]`) which wraps the Edit button in `PermissionGate(EMPLOYEE_UPDATE)`.
**Impact:** High -- PII exposure. Unauthenticated save is blocked by backend, but read access to sensitive employee data (bank account, tax ID, personal email, phone, address) is not gated.
**Fix:** Add `usePermissions` check at the top of the component:
```tsx
const { hasPermission, isReady } = usePermissions();
if (isReady && !hasPermission(Permissions.EMPLOYEE_UPDATE)) {
  router.replace('/employees');
  return null;
}
```

### DEF-44: `/employees/change-requests` page renders full list without page-level gate (P1 - High)

**Location:** `frontend/app/employees/change-requests/page.tsx` lines 162+
**Issue:** The page has no page-level `PermissionGate` or `usePermissions` check. While approve/reject buttons are individually gated with `PermissionGate(EMPLOYMENT_CHANGE_APPROVE)`, the list data itself (employee names, current/proposed designations, departments, salary-related changes, reasons for change) is rendered for any authenticated user. Backend endpoints require `EMPLOYMENT_CHANGE_VIEW_ALL` for the all-requests list and `EMPLOYMENT_CHANGE_APPROVE` for pending, so the API call will 403 -- but similar to DEF-43 in Loop 2, the page shell renders before the API failure.
**Expected:** Page-level `PermissionGate` wrapping the entire content, or `usePermissions` redirect.
**Impact:** High -- The backend will 403 the data fetch (so the list will be empty with a loading/error state), but the page layout, title "Employment Change Requests", and filter UI still render. More importantly, if the API returns data due to any permission misconfiguration, all change request details would be visible. Defense in depth requires frontend gating.
**Fix:** Wrap the return in `<PermissionGate permission={Permissions.EMPLOYMENT_CHANGE_VIEW_ALL}>` or add permission redirect logic.

### DEF-45: `/employees/import` file handling uses raw useState (P3 - Low)

**Location:** `frontend/app/employees/import/page.tsx` lines 34-41
**Issue:** File upload uses `useState` for file selection and validation rather than React Hook Form. File type validation and size check are done in `handleFileSelect()` via imperative code.
**Expected:** Code rules state "All forms must use React Hook Form + Zod."
**Impact:** Low -- File inputs are inherently different from text forms. The current pattern with `useRef` for `HTMLInputElement` and drag-and-drop is pragmatic. RHF file handling is complex and less ergonomic for drag-and-drop UX. This is an acceptable deviation.
**Fix:** Optional -- consider wrapping in RHF `Controller` if strict compliance is required, but current implementation is functional and clean.

---

## 3. Security Assessment

### 3.1 Self-Service Route Security

| Check | Status | Evidence |
|-------|--------|----------|
| No PermissionGate on MY SPACE routes | PASS | All `/me/*` pages correctly omit PermissionGate per CLAUDE.md rule |
| Backend self-service endpoints gated | PASS | `/employees/me` GET/PUT both have `@RequiresPermission(EMPLOYEE_VIEW_SELF)` |
| Self-edit field restriction | PASS | Backend `updateMyEmployee` clears admin-only fields before update |
| Bank change requires approval | PASS | Routed through `employmentChangeRequestService`, not direct update |
| Sensitive data masking | PASS | Bank account shows last 4 digits only on profile page |

### 3.2 People Management Security

| Check | Status | Evidence |
|-------|--------|----------|
| Employee list data scope | PASS | Backend `getAllEmployees` filtered by caller's data scope (description confirms). `enforceEmployeeViewScope()` on single GET |
| IDOR protection | PASS | `GET /employees/{id}` has scope enforcement (CRITICAL-04 fix) checking VIEW_ALL > VIEW_DEPARTMENT > VIEW_TEAM > VIEW_SELF |
| Create employee gated | PASS | `@RequiresPermission(EMPLOYEE_CREATE)` on POST + frontend PermissionGate |
| Update employee gated | PARTIAL | Backend has `@RequiresPermission(EMPLOYEE_UPDATE)` but frontend edit page lacks gate (DEF-43) |
| Delete employee gated | PASS | `@RequiresPermission(EMPLOYEE_DELETE)` on backend + frontend PermissionGate |
| Import gated | PASS | All import endpoints require `EMPLOYEE_CREATE`. Frontend uses PermissionGate on action buttons |
| Change request approval gated | PARTIAL | Backend fully gated. Frontend gates approve/reject buttons but not page-level access (DEF-44) |

### 3.3 Tenant Isolation

| Check | Status | Evidence |
|-------|--------|----------|
| Import tenant_id | PASS | Backend `EmployeeImportController.executeImport` operates within tenant context (Spring Security filter sets tenant from JWT). Imported employees inherit current tenant. |
| Self-service tenant context | PASS | `/employees/me` resolves from JWT's `employeeId` which is tenant-bound |
| Change requests tenant-scoped | PASS | `employmentChangeRequestService` queries within tenant context (RLS enforced at DB level) |

---

## 4. Cross-Module Navigation

| From | To | Link Exists | Notes |
|------|----|-------------|-------|
| `/me/profile` | Leave/Attendance/Payslips | NO | Profile page has no quick links to other self-service pages. Navigation is via sidebar only. |
| `/me/attendance` (no employee) | `/attendance/team` | YES | Empty state CTA: "View Team Attendance" |
| `/me/payslips` (no employee) | `/payroll` | YES | Empty state CTA: "Go to Payroll Management" |
| `/me/documents` (no employee) | `/documents` | YES | Empty state CTA: "Go to Document Management" |
| `/employees/[id]` | `/employees/[id]/edit` | YES | Edit button (gated by EMPLOYEE_UPDATE permission) |
| `/employees` | `/employees/import` | YES | Import button (gated by EMPLOYEE_CREATE permission) |
| `/employees/[id]/edit` | Change requests | IMPLICIT | Employment field changes auto-create change request, user is notified inline |
| `/team-directory` | `/employees/[id]` | YES | Card click navigates to employee detail |

---

## 5. Form Compliance Summary

| Route | Form | RHF + Zod | Status |
|-------|------|-----------|--------|
| `/me/profile` | Profile edit | YES | PASS |
| `/me/profile` | Bank change request | YES | PASS |
| `/me/leaves` | Leave application | YES | PASS |
| `/me/leaves` | Leave cancellation | YES | PASS |
| `/me/attendance` | Regularization | NO | **DEF-42** |
| `/me/payslips` | (no forms) | N/A | N/A |
| `/me/documents` | Document request | YES | PASS |
| `/employees` | Create employee | YES | PASS |
| `/employees/[id]/edit` | Update employee | YES | PASS |
| `/employees/import` | File upload | NO | **DEF-45** (acceptable) |
| `/employees/change-requests` | Rejection reason | NO | Uses raw `useState` + `setRejectionReason` -- minor non-compliance |

---

## 6. Summary

### Counts

| Category | Count |
|----------|-------|
| Test cases executed | 103 |
| PASS | 95 |
| FAIL | 4 |
| PARTIAL | 2 |
| INFO | 2 |

### Defects

| ID | Severity | Route | Summary |
|----|----------|-------|---------|
| DEF-42 | P3 (Low) | `/me/attendance` | Regularization modal uses uncontrolled textarea, violates RHF+Zod rule |
| DEF-43 | P1 (High) | `/employees/[id]/edit` | No frontend PermissionGate -- PII visible in pre-populated form for unauthorized users |
| DEF-44 | P1 (High) | `/employees/change-requests` | No page-level PermissionGate -- page shell and potentially data visible to any authenticated user |
| DEF-45 | P3 (Low) | `/employees/import` | File handling uses raw useState instead of RHF (acceptable deviation for file upload UX) |

### Key Findings

1. **Self-service routes are properly secured.** All `/me/*` pages correctly omit frontend PermissionGate (per CLAUDE.md rule), while backend enforces `EMPLOYEE_VIEW_SELF`. Self-edit is restricted to personal fields only. Bank changes go through approval workflow.

2. **Data scope enforcement is robust.** The `enforceEmployeeViewScope()` method on the employee detail endpoint implements proper VIEW_ALL > VIEW_DEPARTMENT > VIEW_TEAM > VIEW_SELF hierarchy with IDOR protection.

3. **Two P1 RBAC gaps remain on people management pages.** The edit page (DEF-43) and change requests page (DEF-44) lack frontend permission gates. Backend enforcement blocks writes but not read access to the form/page shell. These follow the same pattern as DEF-35/36/37 found in Loop 2 (dashboard pages without frontend gates).

4. **Import flow is well-designed.** Three-step flow (upload -> preview -> execute) with file validation, PermissionGate on all action buttons, and backend permission enforcement on every endpoint.

5. **Employment change request workflow is mature.** Edit page detects employment field changes, creates change requests for HR approval, and separates immediate personal-info updates from gated employment changes.
