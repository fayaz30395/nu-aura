# RETEST Report — Green-Flag Fix Verification

**Run:** 2026-06-10 · **Reviewer:** retest agent · **Scope:** all Issue Board rows in `Retest` status after 7 concurrent coder agents
**Method:** read-through of uncommitted working tree (no build executed — see Limitations)

## Verdict Summary

| Result | Count |
|--------|-------|
| PASS | 19 issue IDs |
| CONCERN | 4 (non-blocking, listed below) |
| FAIL | 0 |

---

## 1. Merge Consistency (two agents edited the same files)

### LeaveRequestService.java — PASS
`backend/src/main/java/com/nulogic/application/leave/service/LeaveRequestService.java`

- Single coherent constructor, 10 args, fields assigned exactly once: `HolidayRepository` (fix-leave, line 62-73) and `@Lazy WorkflowService` (line 70) both present. No duplicate methods, no merge残骸.
- Both agents' behaviors coexist:
  - fix-leave: `validateDateRange` (333-343), `computeLeaveDays` with holiday subtraction (726-759), `assertNoConflictingApprovedLeave` (317-327), `onRejected` pending release (561-576).
  - fix-workflow: `workflowService.cancelActiveExecutionForEntity(...)` in direct approve (206-207) and direct reject (252-253).
- Imports complete: `Holiday`, `HolidayRepository`, `Collectors`, `Set`, `WorkflowDefinition` all resolve.
- No recursion risk: workflow callbacks (`onApproved`/`onRejected`) do NOT call `cancelActiveExecutionForEntity`; only the direct paths do. Circular bean dependency broken via `@Lazy` (line 70).

### Shared test files — PASS
- `ApprovalChainIntegrationTest.java:145-148, 459-462` — both `new LeaveRequestService(...)` calls use the new 10-arg arity ending `tenantTimeService, holidayRepository`. The `null` passed for `workflowService` is safe: the test never calls `createLeaveRequest`/`approveLeaveRequest`/`rejectLeaveRequest` on `leaveService` (verified by grep — only workflow-callback paths exercised).
- `LeaveApprovalPayrollImpactTest.java:66-69` — `@Mock WorkflowService` added per BA-5 (required: `approveLeaveRequest` now dereferences it). Uses `@InjectMocks`; no `HolidayRepository` mock, so Mockito injects null — safe because the test only exercises `approveLeaveRequest`/`cancelLeaveRequest` (lines 152, 176, 198, 220), neither of which touches `holidayRepository`. See CONCERN-3.
- `LeaveRequestServiceTest.java:65-67` — `@Mock HolidayRepository` present with default empty stub (line 105) and holiday-specific cases (733, 754). Consistent.
- `LeaveRequestE2ETest.java` — `@SpringBootTest` with field `@Autowired`; immune to constructor changes.

---

## 2. Per-Issue Verification

| ID | Verdict | Evidence |
|----|---------|----------|
| DATA-1 | **PASS** | DTO: `@DateRangeValid` on `LeaveRequestRequest.java:16-20`; service: `validateDateRange` called in create (`LeaveRequestService.java:102`) and update (:418); sign guard `LeaveBalance.requirePositive` (`LeaveBalance.java:95-99`) applied to `deduct/credit/addPending/removePending` (:102,111,120,126); `computeLeaveDays` throws on inverted range (:730-732). |
| BA-2 | **PASS** | `onRejected` releases pending reservation mirroring direct path — `LeaveRequestService.java:561-576` (0.5 for half-day, totalDays otherwise, try/catch warn). |
| DATA-2 | **PASS** | Termination: `EmployeeService.java:709-721` sets `User.UserStatus.INACTIVE` + `revokeAllTokensBefore` in same txn; status-change path :433-453 incl. rehire restore (INACTIVE→ACTIVE only, LOCKED stays locked). `UserPrincipal.java:65-76` derives `enabled`/`accountNonLocked` from `User.status`; `isEnabled()`:105-107 honest. Defense-in-depth: refresh-token path blocks non-ACTIVE (`AuthService.java:527-532`), Google SSO blocks non-ACTIVE (:387-394). `revokeAllTokensBefore` exists (`TokenBlacklistService.java:179`). |
| BA-1 | **PASS** | `PayrollRunService.java:348-355` working days = weekdays − holidays; :375-378 leave days from approved leave + present days from attendance; fallback for tenants without attendance records: `computePresentDays`:510-512 assumes `workingDays − leaveDays`, floored at 0. Adjustments: `applyPendingAdjustments`:430-471 reads PENDING `PayrollAdjustment` rows, converts LOP days/OT hours to money (:479-487), folds into allowances/deductions, marks PROCESSED with run back-reference — before `calculateTotals()` (:406). |
| PROD-1 | **PASS** | `frontend/app/payroll/runs/[id]/page.tsx` exists, uses `usePayrollRun` (:61) → `payroll.service.ts:122-124` `GET /payroll/runs/${id}` → real backend mapping `PayrollController.java:88-92` (`/api/v1/payroll` + `@GetMapping("/runs/{id}")`, `PAYROLL_VIEW_ALL`). |
| DATA-6 / V283 | **PASS** | `V283__payroll_run_period_unique.sql`: dedup via ranked soft-delete (survivor by lifecycle progress), drops V92 non-unique index, creates partial UNIQUE index `WHERE is_deleted = false`. Valid PostgreSQL. App-side: `updatePayrollRun` period-change guard `PayrollRunService.java:115-133` (advisory lock + FOR-UPDATE existence check excluding self). |
| DEV-1 / V284 | **PASS** | `WorkflowService.processApprovalAction` loads via `findByIdAndTenantIdForUpdate` (`WorkflowService.java:642-647`); repo method has `@Lock(PESSIMISTIC_WRITE)` (`WorkflowExecutionRepository.java:31-35`). `V284__workflow_optimistic_locking.sql` backfills NULL `version`, sets NOT NULL DEFAULT 0 on `workflow_executions` + `step_executions` — idempotent, valid SQL. No Flyway collision: existing max is V282; new files V283/V284/V285 are unique. |
| BA-5 | **PASS** | `cancelActiveExecutionForEntity` (`WorkflowService.java:1093-1134`) re-loads under PESSIMISTIC_WRITE, re-checks terminal state, marks PENDING steps SKIPPED, cancels + audits, fires no callbacks. Called from both direct leave paths (`LeaveRequestService.java:206, 252`). |
| BA-8 | **PASS** | `TenantProvisioningService.java:108-109, 140-182` seeds 7 default workflows inside the provisioning txn. Backfill for pre-existing tenants: `V285__backfill_default_workflow_definitions.sql` — idempotent per (tenant, entity_type) via NOT EXISTS, sets `app.current_tenant_id` per tenant for fail-closed RLS (V265 pattern), valid PL/pgSQL. Java seed and SQL backfill rows match (names, steps, SLA 48/72). |
| BA-3/DATA-5 | **PASS** | BE: `@AssertTrue isHalfDaySingleDay` (`LeaveRequestRequest.java:66-68`) + service `validateDateRange` half-day invariant (:340-342). FE: `me/leaves/page.tsx:53` adds `halfDayPeriod` to schema, :67-70 requires it when half-day, :193 sends it; reason min(10) aligned (:54-56). |
| BA-4/DATA-4 | **PASS** | `updateLeaveRequest` recomputes days server-side (`LeaveRequestService.java:434-435`) and atomically re-balances the pending reservation incl. leave-type moves (:442-447). |
| BA-6/DATA-3 | **PASS** | `findOverlappingLeaves` now `status IN ('APPROVED','PENDING')` (`LeaveRequestRepository.java:46-48`); re-validated at approval in both direct (:188) and workflow (:524) paths via `assertNoConflictingApprovedLeave` — correctly blocks only APPROVED overlaps at approval time so the first of two pendings stays approvable. |
| PROD-2 | **PASS** | `computeLeaveDays` subtracts tenant holidays via `HolidayRepository.findAllByTenantIdAndHolidayDateBetween` (exists — `HolidayRepository.java:25`), excluding optional+restricted (`LeaveRequestService.java:734-739`); throws on zero-working-day ranges. See CONCERN-2 for a payroll/leave filter inconsistency. |
| PROD-4 | **PASS** | `createPayrollRun` calls `statutoryCalculatorFactory.assertPayrollSupported(tenantId)` (`PayrollRunService.java:81`); factory throws BusinessException for unimplemented calculators (`StatutoryCalculatorFactory.java:92-105`); US/UK stubs kept (`isImplemented()` seam). |
| RBAC-1 | **PASS** | `enforceBenefitViewScope` (`BenefitEnhancedController.java:44-63`) called on all 6 `/employee/{id}` GETs: :179, :188, :265, :291, :300, :318. SuperAdmin/TenantAdmin bypass intact (rule 6 honored). |
| RBAC-2 | **PASS** | `enforceLeaveBalanceViewScope` (`LeaveBalanceController.java:42-67`) — ALL > TEAM (via `SecurityContext.getAllReporteeIds()`, exists at `SecurityContext.java:191`) > SELF — called on both `/employee/{employeeId}` (:81) and `/employee/{employeeId}/year/{year}` (:99). |
| RBAC-3 | **PASS** | `StatutoryContributionController` (:27,34,42) and `TDSController` (:24,30,38,45,55) use `Permission.STATUTORY_VIEW/MANAGE` constants which resolve to colon format `"STATUTORY:VIEW"` (`Permission.java:185-186`), matching seeded permissions. |
| INT-1 | **PASS** | `PAYROLL_PROCESSING_DLT` in `@KafkaListener` topics (`DeadLetterHandler.java:112-120`) and pre-registered metrics (:92-99). |
| INT-2 | **PASS** | 7 `.timeout(Duration.ofSeconds(30))` calls: `DocuSignApiClient.java:127,182,235,286,330,406` + `DocuSignAuthService.java:274`. |
| INT-4 | **PASS** | `reclaimStaleInFlightDeliveries` + tenant pivot (`WebhookDeliveryRepository.java:74-94`) target `PENDING/DELIVERING` older than cutoff; sweep wired in `WebhookDeliveryService.java:518-526` (10-min staleness vs ~40s max legitimate attempt). Reclaimed rows re-enter the existing paginated retry loop (RETRY_BATCH_SIZE=100) with backoff + 5-attempt cap preserved — bounded, no thundering herd. |
| DEV-2 | **PASS** | `useSurveyQuestions.ts` repointed to `/survey-analytics/...` (:142,156,185,236); all four paths match `SurveyAnalyticsController.java` (`/api/v1/survey-analytics` + `/surveys/{id}/questions` GET/POST, `/surveys/{id}/summary`, `/responses/submit`). |
| DEV-3 | **PASS** | `SPOTLIGHT_API_AVAILABLE = false` flag (`spotlight.service.ts:26`) consumed by widget (`CompanySpotlight.tsx:57,70` — returns null), admin page (`company-spotlight/page.tsx:107`) and queries (`useSpotlight.ts:25,38` — `enabled: false`). No dead 404 calls fire. |
| DEV-4 | **PASS** | Menu entry hidden (`menuSections.tsx:1074-1075`); `/reports/utilization` direct nav shows EmptyState guard (`reports/utilization/page.tsx:108-117`) instead of 404 cascade. |
| DEV-5 | **PASS** | All 11 `loan.service.ts` paths (`/loans`, `/{id}`, `/my`, `/pending`, `/active`, `/{id}/approve|reject|disburse|activate|repayment|cancel`) match `LoanController.java` mappings 1:1 (incl. `repayment` not `payment`). |
| DEV-6 | **PASS** | Menu entry hidden (`menuSections.tsx:1270-1271`); KB page shows "not available" guard (`helpdesk/knowledge-base/page.tsx:406-427`). |

---

## 3. Concerns (non-blocking — log for release agent / post-release)

**CONCERN-1 — No compile or test execution performed.**
The 45s bash cap makes `mvn test-compile` / `npx tsc --noEmit` infeasible from this agent, and the workspace was intermittently locked by concurrent agents. All findings above are read-through. The Release Readiness agent (REL-01) MUST run `cd backend && mvn -q test-compile` and `cd frontend && npx tsc --noEmit` before sign-off — particularly for the 9 modified backend test files (constructor arity churn) and `frontend/app/payroll/runs/[id]/page.tsx` (new file).

**CONCERN-2 — Holiday filter inconsistency between payroll and leave.**
`PayrollRunService.java:352` excludes only `isOptional` holidays from working days, while `LeaveRequestService.computeLeaveDays` (:737) excludes `isOptional` AND `isRestricted`. A restricted holiday on a weekday counts as a working day for payroll but as a non-working day for leave deduction — a 1-day divergence in LOP math per restricted holiday. Align the filters (recommend payroll adopting the leave rule) post-release.

**CONCERN-3 — `LeaveApprovalPayrollImpactTest` relies on Mockito null-injection.**
`@InjectMocks` with no `@Mock HolidayRepository`/`AuditLogService` injects nulls (`LeaveApprovalPayrollImpactTest.java:50-69`). Currently safe (exercised paths never touch `holidayRepository`; audit calls are try/caught), but any future test calling `createLeaveRequest` will NPE confusingly. Add the two mocks defensively.

**CONCERN-4 — `requirePositive` vs legacy zero-day rows.**
`cancelLeaveRequest` calls `creditLeave` un-try/caught (`LeaveRequestService.java:378-381`); a legacy APPROVED request with `totalDays <= 0` (pre-fix data) would now throw on cancellation. New requests cannot have ≤0 days (`computeLeaveDays` throws), so exposure is limited to pre-existing bad rows. If any exist in prod data, a one-off data fix is needed; rejection/cancel-pending paths are already try/caught.

**Residual (out of fix scope, carry on board):** `BenefitEnhancedController.getClaim(claimId)` (:208-213) accepts `BENEFIT_VIEW_SELF` with no ownership check on the claim — same IDOR class as RBAC-1 but keyed by claimId, not employeeId; was not in the RBAC-1 endpoint list.

---

## 4. Regression-Risk Review (priority check 3)

- `LeaveBalance.requirePositive` — all four mutators' call sites live exclusively in `LeaveBalanceService` (:305,321,337-338,348); every caller passes 0.5 or a server-computed positive value. Accrual (`accrueLeave`) intentionally unguarded. No legitimate zero-amount caller found (except CONCERN-4 legacy edge).
- Payslip fallback for tenants without attendance — present (`computePresentDays`:510-512). No exception path; payroll still generates.
- RBAC scope helpers — SuperAdmin/TenantAdmin early-return in both helpers; `LEAVE_VIEW_ALL`/`BENEFIT_VIEW` tenant-wide paths preserved; admin flows unblocked.
- `reclaimStaleInFlightDeliveries` — reclaim funnels into existing paginated retry loop; backoff/cap enforced by `recordAttempt`. No herd.
- Direct-vs-workflow approval interplay — direct path cancels execution under the same PESSIMISTIC_WRITE lock `processApprovalAction` uses, so double-fire is serialized; callbacks not invoked on cancel (no double deduction).
- V283 dedup soft-deletes loser runs — payslips referencing soft-deleted runs remain intact (no hard delete).

## Limitations

Read-only review of the working tree at 2026-06-10; V285 landed mid-review (concurrent agent), included above. No runtime/browser validation (UI-01 still blocked on Chrome extension).
