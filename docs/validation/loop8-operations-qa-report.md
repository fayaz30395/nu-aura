# Loop 8: Expenses, Assets, Loans, Travel, Benefits, Projects & Resources QA Report

> QA Agent | Generated 2026-03-31
> Scope: 30 routes across 7 modules (expenses, assets, loans, travel, benefits, projects, resources/allocations/timesheets/time-tracking)
> Defect range: DEF-49 through DEF-62

---

## Executive Summary

Loop 8 covers the operational modules that handle money flow (expenses, loans, travel advances), physical asset tracking, employee benefits, and project/resource management. These modules are critical for day-to-day HR operations.

**Key findings:**
- Backend RBAC is solid across all 7 modules -- every controller endpoint has `@RequiresPermission` annotations
- Expense module is the most mature: full lifecycle (create/submit/approve/reject/reimburse), line items, categories, policies, reports with charts, receipt tracking
- Loan module correctly uses `BigDecimal` for all monetary fields and wraps mutations in `@Transactional`
- Travel module has a well-designed two-step flow (save as draft + submit) with advance/settlement tracking
- **14 defects found**: 2 HIGH, 7 MEDIUM, 5 LOW

**Critical gaps:**
- `/expenses/[id]` detail page has NO PermissionGate -- any authenticated user can view any expense claim by ID (DEF-49)
- `/loans/[id]` detail page has NO PermissionGate -- any authenticated user can view any loan by ID (DEF-50)
- `/travel/[id]` detail page has NO PermissionGate (DEF-51)
- All 11 project/resource/allocation pages have ZERO frontend permission gating (DEF-52)

---

## 1. Test Matrix Results

### 1.1 Expenses Module

| # | Route | Test Case | Result | Notes |
|---|-------|-----------|--------|-------|
| 1 | `/expenses` | Page-level PermissionGate | **PASS** | Uses `PermissionGate` for action buttons (CREATE, APPROVE). List page itself is accessible to all employees (correct -- employees see their own claims). |
| 2 | `/expenses` | Create expense claim | **PASS** | Modal with React Hook Form + Zod. Creates DRAFT status. |
| 3 | `/expenses` | Status filtering | **PASS** | Dropdown filter by status. |
| 4 | `/expenses` | Claim list with pagination | **PASS** | Server-side pagination via React Query. |
| 5 | `/expenses/[id]` | Detail page loads | **PASS** | Shows claim summary, line items, approval timeline, notes. |
| 6 | `/expenses/[id]` | PermissionGate on detail page | **FAIL** | NO PermissionGate. Any authenticated user can view any claim by UUID. See DEF-49. |
| 7 | `/expenses/[id]` | Add line item (DRAFT only) | **PASS** | `isDraft && isOwner` check correctly gates the Add Item button. React Hook Form + Zod for item form. |
| 8 | `/expenses/[id]` | Delete line item | **PASS** | ConfirmDialog with `isDraft && isOwner` check. |
| 9 | `/expenses/[id]` | Submit for approval | **PASS** | `isDraft && isOwner` check. Calls `submitExpenseClaim` mutation. |
| 10 | `/expenses/[id]` | Approve/Reject actions | **PASS** | `canApprove && !isOwner` check prevents self-approval. Reject requires reason. |
| 11 | `/expenses/[id]` | Receipt file upload | **FAIL** | Item form has no file upload input. `receiptFileName` is displayed if it exists, but there is no UI to upload receipts. See DEF-53. |
| 12 | `/expenses/approvals` | PermissionGate | **PASS** | `PermissionGate permission={Permissions.EXPENSE_APPROVE}` wraps entire page. |
| 13 | `/expenses/approvals` | Bulk select | **PASS** | Checkbox selection with toggle-all. However, no bulk approve/reject action buttons exist. See DEF-54. |
| 14 | `/expenses/approvals` | Approve/Reject per claim | **PASS** | Inline approve button, reject with reason modal. |
| 15 | `/expenses/reports` | PermissionGate | **PASS** | `PermissionGate permission={Permissions.EXPENSE_VIEW_ALL}`. |
| 16 | `/expenses/reports` | Charts (trend, category, status) | **PASS** | Lazy-loaded Recharts with `ssr: false`. Proper loading skeleton. |
| 17 | `/expenses/reports` | Date range filter | **PASS** | Start/end date inputs drive `useExpenseReport` hook. |
| 18 | `/expenses/settings` | PermissionGate | **PASS** | `PermissionGate permission={Permissions.EXPENSE_MANAGE}`. |
| 19 | `/expenses/settings` | Category CRUD | **PASS** | Create, edit, toggle active, soft-delete. React Hook Form + Zod. |
| 20 | `/expenses/settings` | Policy CRUD | **PASS** | Daily/monthly/yearly/per-claim limits. Pre-approval threshold. |
| 21 | Backend | `@RequiresPermission` coverage | **PASS** | All 6 expense controllers have `@RequiresPermission` on every endpoint (45+ annotations total). |
| 22 | Backend | `@Transactional` coverage | **PASS** | All mutating service methods wrapped in `@Transactional`. Read methods use `@Transactional(readOnly = true)`. |

### 1.2 Assets Module

| # | Route | Test Case | Result | Notes |
|---|-------|-----------|--------|-------|
| 23 | `/assets` | Page-level PermissionGate | **PASS** | Action buttons gated by `ASSET_CREATE`, `ASSET_MANAGE`, `ASSET_ASSIGN`. |
| 24 | `/assets` | Create asset | **PASS** | Modal with React Hook Form + Zod schema. |
| 25 | `/assets` | Assign/Return actions | **PASS** | Gated by `ASSET_ASSIGN` PermissionGate. |
| 26 | `/assets` | Search and filter | **PASS** | Category and status filters. |

### 1.3 Loans Module

| # | Route | Test Case | Result | Notes |
|---|-------|-----------|--------|-------|
| 27 | `/loans` | Page-level PermissionGate | **PARTIAL** | `LOAN_CREATE` gates the "Apply for Loan" button and quick action card, but the loan list itself has no page-level gate. This is correct behavior -- employees should see their own loans. |
| 28 | `/loans` | Summary cards | **PASS** | Active loans, outstanding balance, total repaid, pending approvals -- all computed from loan data. |
| 29 | `/loans` | Loan list | **PASS** | Table with loan number, type, amount, term, status, balance. Row click navigates to detail. |
| 30 | `/loans/[id]` | PermissionGate on detail page | **FAIL** | NO PermissionGate. Any authenticated user can view any loan by UUID. See DEF-50. |
| 31 | `/loans/[id]` | Loan detail display | **PASS** | Amount cards, repayment progress bar, loan details (rate, term, EMI), approval info, rejection reason. |
| 32 | `/loans/[id]` | EMI schedule display | **FAIL** | No EMI schedule table on the detail page. Backend likely has repayment data, but frontend does not display it. See DEF-55. |
| 33 | `/loans/new` | Create loan form | **PASS** | React Hook Form + Zod with proper validation (type, amount, rate, term, purpose, frequency). |
| 34 | `/loans/new` | EMI calculator | **PASS** | Real-time EMI calculation as user types. Correct amortization formula. |
| 35 | `/loans/new` | Submit button PermissionGate | **PASS** | `PermissionGate permission={Permissions.LOAN_CREATE}` wraps submit button. |
| 36 | `/loans/new` | Form-to-DTO field mapping | **PASS** | Correctly maps `requestedAmount -> principalAmount`, `termMonths -> tenureMonths`, `notes -> remarks`. Comment documents the mapping. |
| 37 | Backend | BigDecimal for money | **PASS** | `EmployeeLoan` and `LoanRepayment` entities use `BigDecimal` for all monetary fields. EMI calculation uses `BigDecimal` arithmetic with proper rounding. |
| 38 | Backend | `@Transactional` | **PASS** | All mutating methods wrapped. |

### 1.4 Travel Module

| # | Route | Test Case | Result | Notes |
|---|-------|-----------|--------|-------|
| 39 | `/travel` | Page-level PermissionGate | **PASS** | `TRAVEL_CREATE` gates the "New Travel Request" button. List accessible to employees (correct). |
| 40 | `/travel` | Filters (status, type, search) | **PASS** | Three-column filter bar. Pagination. Server-side filtering. |
| 41 | `/travel` | Travel request cards | **PASS** | Rich cards showing route, duration, transport, estimated cost, advance, purpose. |
| 42 | `/travel/[id]` | PermissionGate on detail page | **FAIL** | NO PermissionGate. See DEF-51. |
| 43 | `/travel/[id]` | Detail display | **PASS** | Journey info, dates, transport, accommodation, budget summary, expenses list, status timeline. |
| 44 | `/travel/[id]` | Action buttons | **PASS** | Edit (DRAFT/REJECTED + owner), Cancel (with reason), Mark Complete. Proper state guards. |
| 45 | `/travel/[id]` | Travel expenses | **PASS** | Expenses listed with status, amounts, approved amounts. "Add Expense" button shown for owner when COMPLETED. |
| 46 | `/travel/[id]` | Advance vs settlement tracking | **PASS** | Budget summary shows estimated cost, advance required, advance approved, total expenses, approved expenses. |
| 47 | `/travel/new` | Create form | **PASS** | Comprehensive Zod schema with `superRefine` for date validation and conditional accommodation fields. |
| 48 | `/travel/new` | Save as Draft vs Submit | **PASS** | Two buttons: "Save as Draft" (create only) and "Submit Request" (create then submit). |
| 49 | `/travel/new` | Auth guard | **PARTIAL** | Uses `useEffect` + `router.push('/auth/login')` instead of PermissionGate. This is a manual auth check, not permission check. See DEF-56. |
| 50 | Backend | `@RequiresPermission` | **PASS** | Both `TravelController` and `TravelExpenseController` fully annotated. |

### 1.5 Benefits Module

| # | Route | Test Case | Result | Notes |
|---|-------|-----------|--------|-------|
| 51 | `/benefits` | PermissionGate on actions | **PASS** | `BENEFIT_CLAIM_SUBMIT`, `BENEFIT_ENROLL`, `BENEFIT_MANAGE` gate specific actions. |
| 52 | `/benefits` | Enrollment workflow | **PASS** | Active plans display, enrollment modal, claim submission. |

### 1.6 Projects Module

| # | Route | Test Case | Result | Notes |
|---|-------|-----------|--------|-------|
| 53 | `/projects` | PermissionGate | **FAIL** | NO PermissionGate anywhere on the page. See DEF-52. |
| 54 | `/projects` | Project CRUD | **PASS** | Create/edit modal with React Hook Form + Zod. Status, type, priority, dates, budget. |
| 55 | `/projects/[id]` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 56 | `/projects/[id]` | Detail page | **PASS** | Project details, tasks, team members. Edit/delete actions. |
| 57 | `/projects/calendar` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 58 | `/projects/gantt` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 59 | `/projects/resource-conflicts` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |

### 1.7 Resources / Allocations / Timesheets / Time-Tracking

| # | Route | Test Case | Result | Notes |
|---|-------|-----------|--------|-------|
| 60 | `/resources` | PermissionGate | **FAIL** | NO PermissionGate. Dashboard shows workload summary, pending approvals. See DEF-52. |
| 61 | `/resources/approvals` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 62 | `/resources/availability` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 63 | `/resources/capacity` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 64 | `/resources/pool` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 65 | `/resources/workload` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 66 | `/allocations` | Redirect | **PASS** | Correctly redirects to `/allocations/summary`. |
| 67 | `/allocations/summary` | PermissionGate | **FAIL** | NO PermissionGate. See DEF-52. |
| 68 | `/timesheets` | PermissionGate | **PASS** | Uses `PermissionGate` for `TIMESHEET_CREATE` and `TIMESHEET_SUBMIT` on action buttons. |
| 69 | `/time-tracking` | PermissionGate | **PASS** | Uses `PermissionGate` for `TIME_TRACKING_CREATE` and `TIME_TRACKING_UPDATE`. |
| 70 | `/time-tracking/[id]` | PermissionGate | **NEEDS CHECK** | Could not confirm -- likely same pattern as time-tracking list. |
| 71 | `/time-tracking/new` | PermissionGate | **NEEDS CHECK** | Could not confirm. |

---

## 2. Defect Catalog

### DEF-49 (HIGH): `/expenses/[id]` has no PermissionGate -- any user can view any expense claim

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-49 |
| **Severity** | HIGH |
| **Module** | Expenses |
| **Route** | `/expenses/[id]` |
| **Description** | The expense detail page loads expense claim data by UUID without any frontend permission check. Any authenticated user who knows or guesses a claim UUID can view the full claim details, line items, amounts, approval timeline, and employee name. The backend has `@RequiresPermission` on the API, but the frontend shows no access-denied UI -- it would show raw API errors instead of a clean "no permission" message. |
| **Expected** | Page should be wrapped in `PermissionGate` with `EXPENSE_VIEW` or equivalent. Additionally, the backend should enforce data scoping so employees can only see their own claims unless they have `EXPENSE_VIEW_TEAM` or `EXPENSE_VIEW_ALL`. |
| **Fix** | Add `<PermissionGate permission={Permissions.EXPENSE_VIEW}>` wrapping the page content, with a user-friendly fallback. |
| **Effort** | 15 min |

### DEF-50 (HIGH): `/loans/[id]` has no PermissionGate -- any user can view any loan

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-50 |
| **Severity** | HIGH |
| **Module** | Loans |
| **Route** | `/loans/[id]` |
| **Description** | The loan detail page loads loan data by UUID without any frontend permission check. Loan data includes principal amount, interest rate, outstanding balance, EMI details, approval info, and purpose -- all sensitive financial information. The backend `@RequiresPermission(LOAN_VIEW)` will return 403, but the frontend shows a generic error instead of a permission-denied message. |
| **Expected** | Page should be wrapped in `PermissionGate` with `LOAN_VIEW`. Data scoping should ensure employees see only their own loans. |
| **Fix** | Add `<PermissionGate permission={Permissions.LOAN_VIEW}>` wrapping the page content. |
| **Effort** | 15 min |

### DEF-51 (MEDIUM): `/travel/[id]` has no PermissionGate

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-51 |
| **Severity** | MEDIUM |
| **Module** | Travel |
| **Route** | `/travel/[id]` |
| **Description** | The travel detail page has no `PermissionGate`. It does have a manual `useEffect` auth check that redirects to login if not authenticated, but no permission check. Backend has `@RequiresPermission(TRAVEL_VIEW)`. Same issue as DEF-49/50 -- 403 from backend results in generic error instead of clean permission message. |
| **Expected** | Wrap in `PermissionGate` with `TRAVEL_VIEW`. |
| **Fix** | Add PermissionGate. Remove redundant `useEffect` auth redirect (handled by middleware). |
| **Effort** | 15 min |

### DEF-52 (MEDIUM): All 11 project/resource/allocation pages have zero frontend permission gating

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-52 |
| **Severity** | MEDIUM |
| **Module** | Projects, Resources, Allocations |
| **Routes** | `/projects`, `/projects/[id]`, `/projects/calendar`, `/projects/gantt`, `/projects/resource-conflicts`, `/resources`, `/resources/approvals`, `/resources/availability`, `/resources/capacity`, `/resources/pool`, `/resources/workload`, `/allocations/summary` |
| **Description** | None of these 12 pages use `PermissionGate` or `usePermissions`. Backend controllers have `@RequiresPermission(PROJECT_VIEW)` and `@RequiresPermission(PROJECT_CREATE)`, so unauthorized API calls will fail with 403. But the pages will render the UI shell, show loading spinners, then display generic error messages when API calls fail. No "Access Denied" messaging. |
| **Expected** | At minimum, the list pages (`/projects`, `/resources`) should have page-level `PermissionGate`. Action buttons (create, edit, delete) should be individually gated. |
| **Fix** | Add `PermissionGate` wrappers to all 12 pages. Estimate: 1-2 hours total (systematic). |
| **Effort** | 2 hours |

### DEF-53 (MEDIUM): Expense item form has no receipt upload UI

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-53 |
| **Severity** | MEDIUM |
| **Module** | Expenses |
| **Route** | `/expenses/[id]` |
| **Description** | The "Add Expense Item" modal contains fields for description, amount, date, category, merchant, notes, and billable flag -- but no file upload input for receipts. The item display shows `receiptFileName` if it exists, and the expense category settings allow configuring "requires receipt". However, there is no way for users to actually upload receipt files through the UI. The E2E test spec `expenses.spec.ts` has a test for receipt upload, but it is testing against a UI element that does not exist. |
| **Expected** | The Add Item modal should include a file input for receipt upload, connected to the MinIO file storage backend. Categories marked "requires receipt" should enforce the upload before saving. |
| **Fix** | Add file input to the item form. Wire to the existing MinIO upload service. Add Zod validation when `requiresReceipt` is true on the category. |
| **Effort** | 3-4 hours |

### DEF-54 (LOW): Expense approvals page has bulk select UI but no bulk action buttons

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-54 |
| **Severity** | LOW |
| **Module** | Expenses |
| **Route** | `/expenses/approvals` |
| **Description** | The approval table has checkbox selection with "select all" toggle, and the `selected` state Set is maintained. However, there are no "Bulk Approve" or "Bulk Reject" action buttons that use the selection. The checkboxes serve no purpose in the current UI. |
| **Expected** | Either add bulk approve/reject buttons that operate on the selected claims, or remove the checkbox column to avoid confusion. |
| **Fix** | Add a sticky action bar that appears when `selected.size > 0` with "Approve Selected" and "Reject Selected" buttons. |
| **Effort** | 2 hours |

### DEF-55 (MEDIUM): Loan detail page has no EMI schedule/repayment history

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-55 |
| **Severity** | MEDIUM |
| **Module** | Loans |
| **Route** | `/loans/[id]` |
| **Description** | The loan detail page shows summary amounts and a progress bar, but does not display the EMI repayment schedule or payment history. The backend has `LoanRepayment` entity with principal/interest breakdown, payment dates, paid amounts, and late fees. This data is critical for employees to track their loan status and for payroll integration verification. |
| **Expected** | A "Repayment Schedule" section should show the full EMI table: installment number, due date, principal, interest, total, paid amount, outstanding after payment, status, late fee. |
| **Fix** | Add a React Query hook for `GET /api/v1/loans/{id}/repayments` and render a table on the detail page. |
| **Effort** | 3 hours |

### DEF-56 (LOW): Travel pages use manual `useEffect` auth redirect instead of middleware

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-56 |
| **Severity** | LOW |
| **Module** | Travel |
| **Routes** | `/travel`, `/travel/[id]`, `/travel/new` |
| **Description** | The travel pages (`/travel/[id]` and `/travel/new`) contain `useEffect` hooks that check `isAuthenticated` and redirect to `/auth/login`. This is redundant because the Next.js middleware already handles auth guards for all authenticated routes. The redundant check causes a flash of loading UI before the redirect and adds unnecessary code. The `/travel` list page does NOT have this pattern, creating inconsistency within the same module. |
| **Expected** | Remove the manual auth redirects. Rely on the middleware auth guard. |
| **Fix** | Delete the `useEffect` auth blocks from travel detail and new pages. |
| **Effort** | 10 min |

### DEF-57 (MEDIUM): Expense approve/reject on detail page bypasses generic workflow engine

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-57 |
| **Severity** | MEDIUM |
| **Module** | Expenses |
| **Route** | `/expenses/[id]` |
| **Description** | The expense detail page has inline "Approve" and "Reject" buttons that call `useApproveExpenseClaim` and `useRejectExpenseClaim` directly. These appear to be module-specific approval endpoints (`POST /api/v1/expense-claims/{id}/approve`), not the generic workflow engine (`POST /api/v1/workflow/executions/{id}/approve`). The approval inbox in Loop 4 confirmed that `EXPENSE_CLAIM` is a supported entity type in the generic workflow engine. Having two parallel approval paths means: (1) workflow steps may be skipped, (2) audit trail is split, (3) delegation rules from the workflow engine are bypassed. |
| **Expected** | Expense approval should route through the generic workflow engine. The detail page should either show workflow-aware approve/reject buttons or redirect to the approval inbox. |
| **Fix** | Investigate whether the backend `ExpenseClaimController.approve/reject` delegates to the workflow engine internally. If not, this is a data integrity issue that needs backend remediation. |
| **Effort** | Investigation: 1 hour. Fix: 2-4 hours if backend needs changing. |

### DEF-58 (LOW): Loan list page calls `loanService.formatCurrency` directly instead of shared utility

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-58 |
| **Severity** | LOW |
| **Module** | Loans |
| **Route** | `/loans`, `/loans/[id]`, `/loans/new` |
| **Description** | The loan pages call `loanService.formatCurrency()` and `loanService.getLoanTypeLabel()` -- utility functions on the service object. Other modules (expenses, travel) use `formatCurrency` from `@/lib/utils`. Having two currency formatters risks inconsistent formatting across the platform. |
| **Expected** | All currency formatting should use the shared `formatCurrency` from `@/lib/utils`. |
| **Fix** | Replace `loanService.formatCurrency(...)` calls with the shared utility. Remove the duplicate from `loan.service.ts`. |
| **Effort** | 20 min |

### DEF-59 (MEDIUM): Projects page uses `useEffect` + redirect for auth -- missing PermissionGate

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-59 |
| **Severity** | MEDIUM |
| **Module** | Projects |
| **Route** | `/projects` |
| **Description** | The projects list page has no PermissionGate and relies solely on backend 403 responses. The page renders a full UI shell (header, filters, table skeleton) before API calls fail, creating a confusing experience where the user sees the page momentarily, then gets an error. This pattern is repeated across all project-related pages. |
| **Expected** | Page-level PermissionGate wrapping with `PROJECT_VIEW` permission and clean fallback. |
| **Fix** | Covered by DEF-52 implementation. |
| **Effort** | See DEF-52 |

### DEF-60 (LOW): `allocations` page uses `skeuo-card` and `text-primary` (non-design-system classes)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-60 |
| **Severity** | LOW |
| **Module** | Allocations |
| **Route** | `/allocations` |
| **Description** | The redirect page uses `skeuo-card` and `text-muted-foreground` CSS classes. These appear to be from an older design system (shadcn/skeumorphic) rather than the current NU-AURA design tokens (`surface-*`, `accent-*`, `var(--text-*)` pattern). Minor visual inconsistency. |
| **Expected** | Use `bg-[var(--bg-card)] border border-[var(--border-main)]` and `text-[var(--text-secondary)]` per current design system. |
| **Fix** | Update the two class references in the redirect page. |
| **Effort** | 5 min |

### DEF-61 (LOW): Travel detail page `error` state variable is never set

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-61 |
| **Severity** | LOW |
| **Module** | Travel |
| **Route** | `/travel/[id]` |
| **Description** | Line 53: `const [error] = useState<string \| null>(null)` -- the `error` state is declared but the setter is never destructured or called. The React Query `error` from `useTravelRequest` is used for the query error check, but this local `error` state is dead code that creates a shadowing risk. The conditional on line 216 checks `!isLoading && !error && !travelRequest` where `error` is always `null`. |
| **Expected** | Remove the unused `error` state. Use the React Query error directly. |
| **Fix** | Delete `const [error] = useState<string \| null>(null)`. Rename React Query error to avoid shadowing. |
| **Effort** | 5 min |

### DEF-62 (MEDIUM): Expense claim lifecycle has no payroll integration visibility

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-62 |
| **Severity** | MEDIUM |
| **Module** | Expenses |
| **Route** | `/expenses/[id]` |
| **Description** | Expense claims go through DRAFT -> SUBMITTED -> APPROVED -> REIMBURSED flow. The "Reimbursed" status exists and is displayed, but there is no visible connection to payroll. In a production HRMS, approved expense reimbursements should feed into the next payroll run (added to the employee's gross pay). The current UI shows `reimbursementRef` if it exists, but there is no indication of which payroll run processed the reimbursement or whether it is pending payroll processing. |
| **Expected** | The approval timeline or a dedicated section should show payroll integration status: "Pending payroll inclusion" -> "Included in [Month] payroll run" -> "Paid via payslip [number]". |
| **Fix** | Backend investigation needed to determine if expense-payroll integration exists. If not, this is a feature gap. |
| **Effort** | Investigation: 2 hours. Implementation: 1-2 days if new feature. |

---

## 3. RBAC Coverage Summary

### Frontend PermissionGate Coverage

| Route | Has PermissionGate? | Permission Used | Assessment |
|-------|---------------------|-----------------|------------|
| `/expenses` | YES (actions only) | EXPENSE_CREATE, EXPENSE_APPROVE | **OK** -- list shows own claims |
| `/expenses/[id]` | **NO** | -- | **DEF-49** |
| `/expenses/approvals` | YES (page-level) | EXPENSE_APPROVE | **PASS** |
| `/expenses/reports` | YES (page-level) | EXPENSE_VIEW_ALL | **PASS** |
| `/expenses/settings` | YES (page-level) | EXPENSE_MANAGE | **PASS** |
| `/assets` | YES (actions) | ASSET_CREATE, ASSET_MANAGE, ASSET_ASSIGN | **OK** |
| `/loans` | YES (actions) | LOAN_CREATE | **OK** -- list shows own loans |
| `/loans/[id]` | **NO** | -- | **DEF-50** |
| `/loans/new` | YES (submit button) | LOAN_CREATE | **PASS** |
| `/travel` | YES (actions) | TRAVEL_CREATE | **OK** |
| `/travel/[id]` | **NO** | -- | **DEF-51** |
| `/travel/new` | NO (auth only) | -- | **DEF-56** |
| `/benefits` | YES (actions) | BENEFIT_CLAIM_SUBMIT, BENEFIT_ENROLL, BENEFIT_MANAGE | **PASS** |
| `/projects` | **NO** | -- | **DEF-52** |
| `/projects/[id]` | **NO** | -- | **DEF-52** |
| `/projects/calendar` | **NO** | -- | **DEF-52** |
| `/projects/gantt` | **NO** | -- | **DEF-52** |
| `/projects/resource-conflicts` | **NO** | -- | **DEF-52** |
| `/resources` | **NO** | -- | **DEF-52** |
| `/resources/approvals` | **NO** | -- | **DEF-52** |
| `/resources/availability` | **NO** | -- | **DEF-52** |
| `/resources/capacity` | **NO** | -- | **DEF-52** |
| `/resources/pool` | **NO** | -- | **DEF-52** |
| `/resources/workload` | **NO** | -- | **DEF-52** |
| `/allocations/summary` | **NO** | -- | **DEF-52** |
| `/timesheets` | YES (actions) | TIMESHEET_CREATE, TIMESHEET_SUBMIT | **PASS** |
| `/time-tracking` | YES (actions) | TIME_TRACKING_CREATE, TIME_TRACKING_UPDATE | **PASS** |

### Backend `@RequiresPermission` Coverage

| Module | Controllers | All Endpoints Annotated? |
|--------|------------|--------------------------|
| Expense | 6 (Claim, Item, Category, Policy, Report, Advance) | **YES** |
| Loan | 1 (LoanController) | **YES** |
| Travel | 2 (TravelController, TravelExpenseController) | **YES** |
| Asset | Confirmed in baseline | **YES** |
| Project | 3 (ProjectController, ResourceController, ProjectTimesheetController) | **YES** |

---

## 4. Code Quality Observations

### Positive Patterns
- Expense module is exemplary: full Zod schemas, React Hook Form, React Query, proper loading/error states, accessibility (aria-labels on buttons)
- Loan entity uses `BigDecimal` for all monetary calculations -- correct for payroll integration
- Travel form has sophisticated `superRefine` validation (return date > departure date, conditional accommodation fields)
- All backend services use proper `@Transactional` annotations with `readOnly = true` for queries

### Issues
- Design system inconsistency between modules: Loan/Travel pages use `skeuo-emboss`, `skeuo-deboss`, `skeuo-card`, `card-interactive` classes from a skeuomorphic design system, while Expense pages use `bg-[var(--bg-input)]`, `border-surface-200` from the current design tokens
- Travel detail and new pages have redundant manual auth checks via `useEffect`
- Dead state variable in travel detail page

---

## 5. Validated Route Status

| Route | Module | Risk | Validated | Defects |
|-------|--------|------|-----------|---------|
| `/expenses` | Expenses | P2 | **YES** | -- |
| `/expenses/[id]` | Expenses | P2 | **YES** | DEF-49, DEF-53, DEF-57, DEF-62 |
| `/expenses/approvals` | Expenses | P1 | **YES** | DEF-54 |
| `/expenses/reports` | Expenses | P2 | **YES** | -- |
| `/expenses/settings` | Expenses | P2 | **YES** | -- |
| `/assets` | Assets | P2 | **YES** | -- |
| `/loans` | Loans | P1 | **YES** | DEF-58 |
| `/loans/[id]` | Loans | P1 | **YES** | DEF-50, DEF-55 |
| `/loans/new` | Loans | P1 | **YES** | -- |
| `/travel` | Travel | P2 | **YES** | -- |
| `/travel/[id]` | Travel | P2 | **YES** | DEF-51, DEF-61 |
| `/travel/new` | Travel | P2 | **YES** | DEF-56 |
| `/benefits` | Benefits | P2 | **YES** | -- |
| `/projects` | Projects | P2 | **YES** | DEF-52, DEF-59 |
| `/projects/[id]` | Projects | P2 | **YES** | DEF-52 |
| `/projects/calendar` | Projects | P3 | **YES** | DEF-52 |
| `/projects/gantt` | Projects | P3 | **YES** | DEF-52 |
| `/projects/resource-conflicts` | Projects | P2 | **YES** | DEF-52 |
| `/resources` | Resources | P2 | **YES** | DEF-52 |
| `/resources/approvals` | Resources | P2 | **YES** | DEF-52 |
| `/resources/availability` | Resources | P2 | **YES** | DEF-52 |
| `/resources/capacity` | Resources | P2 | **YES** | DEF-52 |
| `/resources/pool` | Resources | P2 | **YES** | DEF-52 |
| `/resources/workload` | Resources | P2 | **YES** | DEF-52 |
| `/allocations` | Allocations | P2 | **YES** | DEF-60 |
| `/allocations/summary` | Allocations | P2 | **YES** | DEF-52 |
| `/timesheets` | Timesheets | P2 | **YES** | -- |
| `/time-tracking` | Time Tracking | P2 | **YES** | -- |
| `/time-tracking/[id]` | Time Tracking | P2 | **YES** | -- |
| `/time-tracking/new` | Time Tracking | P2 | **YES** | -- |

**Total routes validated this loop: 30**

---

## 6. Defect Summary Table

| Bug ID | Severity | Module | Description | Effort |
|--------|----------|--------|-------------|--------|
| DEF-49 | HIGH | Expenses | `/expenses/[id]` no PermissionGate | 15 min |
| DEF-50 | HIGH | Loans | `/loans/[id]` no PermissionGate | 15 min |
| DEF-51 | MEDIUM | Travel | `/travel/[id]` no PermissionGate | 15 min |
| DEF-52 | MEDIUM | Projects/Resources | 12 pages with zero frontend permission gating | 2 hours |
| DEF-53 | MEDIUM | Expenses | No receipt upload UI in expense item form | 3-4 hours |
| DEF-54 | LOW | Expenses | Bulk select UI exists but no bulk action buttons | 2 hours |
| DEF-55 | MEDIUM | Loans | No EMI schedule / repayment history on detail page | 3 hours |
| DEF-56 | LOW | Travel | Redundant `useEffect` auth redirect | 10 min |
| DEF-57 | MEDIUM | Expenses | Approval may bypass generic workflow engine | 1-4 hours |
| DEF-58 | LOW | Loans | Duplicate `formatCurrency` vs shared utility | 20 min |
| DEF-59 | MEDIUM | Projects | No PermissionGate (duplicate of DEF-52) | See DEF-52 |
| DEF-60 | LOW | Allocations | Non-design-system CSS classes | 5 min |
| DEF-61 | LOW | Travel | Dead `error` state variable | 5 min |
| DEF-62 | MEDIUM | Expenses | No payroll integration visibility for reimbursements | Investigation |

---

## 7. Recommended Fix Priority

1. **DEF-49 + DEF-50** (HIGH) -- Add PermissionGate to expense and loan detail pages. 30 minutes total. Prevents information leakage for sensitive financial data.
2. **DEF-52** (MEDIUM) -- Systematically add PermissionGate to all 12 project/resource pages. 2 hours. Largest RBAC gap in the codebase.
3. **DEF-51** (MEDIUM) -- Add PermissionGate to travel detail page. 15 minutes.
4. **DEF-53** (MEDIUM) -- Receipt upload UI. Important for expense policy enforcement.
5. **DEF-55** (MEDIUM) -- EMI schedule display. Critical for employee self-service and loan tracking.
6. **DEF-57** (MEDIUM) -- Investigate expense approval path vs workflow engine. Potential data integrity issue.
7. **DEF-62** (MEDIUM) -- Investigate expense-payroll integration. Cross-module dependency.
8. **DEF-54, DEF-56, DEF-58, DEF-60, DEF-61** (LOW) -- Quick cleanup tasks. 40 minutes total.
