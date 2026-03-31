# Feature Gap Inventory - Nu-HRMS Beta Launch

**Date:** 2026-03-22
**Author:** Dev Lead Agent
**Sprint:** Internal Beta Launch (1 Week)
**Scope:** 8 Must-Have Modules assessed for feature completeness

---

## Feature Completeness Matrix

| Module | Backend | Frontend | Integration | Tests | Overall | Status |
|--------|---------|----------|-------------|-------|---------|--------|
| **Employee Management** | 95% | 90% | 85% | 80% | **88%** | Ready (minor gaps) |
| **Attendance & Time Tracking** | 90% | 80% | 75% | 60% | **76%** | Needs Work |
| **Leave Management** | 90% | 85% | 90% | 85% | **88%** | Ready (minor gaps) |
| **Benefits Administration** | 85% | 75% | 70% | 0% | **58%** | Needs Work |
| **Asset Management** | 80% | 80% | 75% | 50% | **71%** | Needs Work |
| **Job Posting & Candidate Pipeline** | 90% | 85% | 80% | 70% | **81%** | Ready (minor gaps) |
| **Interview Scheduling** | 85% | 90% | 70% | 60% | **76%** | Needs Work |
| **Onboarding Workflows** | 90% | 80% | 85% | 50% | **76%** | Needs Work |

---

## Module 1: Employee Management

### Backend Inventory
- **Controllers:** `EmployeeController`, `DepartmentController`, `EmploymentChangeRequestController`, `EmployeeDirectoryController`, `EmployeeImportController`, `TalentProfileController`
- **Services (9):** `EmployeeService`, `DepartmentService`, `EmployeeDirectoryService`, `EmployeeImportParserService`, `EmployeeImportService`, `EmployeeImportValidationService`, `EmploymentChangeRequestService`, `SkillService`, `TalentProfileService`
- **Entities:** `Employee`, `Department`, `EmployeeSkill`, `EmploymentChangeRequest`
- **Endpoints (15+):** CRUD, search, hierarchy, subordinates, managers, dotted-line reports, me (self-service)

### Frontend Inventory
- **Pages (7):** List, Detail (`[id]`), Edit (`[id]/edit`), Directory, Import, Change Requests, main page
- **Service:** `employee.service.ts` (140 lines)
- **Hooks:** `useEmployees.ts` (192 lines, 16 queries/mutations)
- **Forms:** Uses React Hook Form + Zod for create/edit employee

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Employee directory search 500 error | P0 | 2h | BUG-002: `/api/v1/employees/directory/search` returns 500 due to incorrect field mapping in `EmployeeDirectoryService` |
| Org chart duplication | P1 | 1h | Two routes exist: `/org-chart` and `/organization-chart` -- consolidate to one |
| Bulk employee actions | P2 | 4h | No bulk status change, department transfer, or role assignment |
| Employee photo upload | P1 | 3h | Profile photo upload not wired to MinIO |

### Test Coverage
- `EmployeeControllerTest.java` -- exists
- `EmployeeServiceTest.java` -- exists
- `EmployeeImportParserServiceTest.java` -- exists
- `EmployeeImportValidationServiceTest.java` -- exists
- **Missing:** `EmployeeDirectoryServiceTest`, `EmploymentChangeRequestServiceTest`, `TalentProfileServiceTest`

---

## Module 2: Attendance & Time Tracking

### Backend Inventory
- **Controllers (5):** `AttendanceController`, `CompOffController`, `HolidayController`, `MobileAttendanceController`, `OfficeLocationController`
- **Services (7):** `AttendanceRecordService`, `AttendanceImportService`, `CompOffService`, `HolidayService`, `MobileAttendanceService`, `OfficeLocationService`, `AutoRegularizationScheduler`
- **Entities (5):** `AttendanceRecord`, `AttendanceTimeEntry`, `CompOffRequest`, `Holiday`, `OfficeLocation`
- **Endpoints (20+):** Check-in/out, multi-check-in/out, bulk operations, regularization request/approve/reject, time entries, import

### Frontend Inventory
- **Pages (6):** Overview, My Attendance, Regularization, Comp-Off, Shift Swap, Team
- **Service:** `attendance.service.ts` (265 lines)
- **Hooks:** `useAttendance.ts` (433 lines, 37 queries/mutations)
- **Shift hooks:** `useShifts.ts` separate file

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Shift swap requires raw UUIDs | P0 | 3h | Shift swap page asks for "UUID of your shift assignment" and "UUID of the other employee" -- needs employee/shift picker dropdowns |
| No holiday management frontend service | P1 | 2h | `HolidayController` exists but no `holiday.service.ts` or holiday hooks -- holidays page may not be integrated |
| Geolocation attendance validation | P2 | 8h | `MobileAttendanceController` exists but GPS fence validation not implemented on frontend |
| Late arrival tracking | P2 | 4h | No late arrival alerts or dashboard widget |
| Overtime calculation | P2 | 6h | `OfficeLocationService` exists but overtime auto-calculation not connected |

### Test Coverage
- `AttendanceControllerTest.java` -- exists
- `AttendanceRecordServiceTest.java` -- exists
- `AttendanceE2ETest.java` -- exists
- **Missing:** `CompOffServiceTest`, `HolidayServiceTest`, `ShiftSwapServiceTest`, `MobileAttendanceServiceTest`

---

## Module 3: Leave Management

### Backend Inventory
- **Controllers (3):** `LeaveRequestController`, `LeaveBalanceController`, `LeaveTypeController`
- **Services (3):** `LeaveRequestService`, `LeaveBalanceService`, `LeaveTypeService`
- **Entities (3):** `LeaveRequest`, `LeaveBalance`, `LeaveType`
- **Workflow:** Fully integrated with `WorkflowService` for approval routing (L1 manager approval)
- **Endpoints (14+):** CRUD, approve/reject/cancel, by status, by employee, leave balance, leave types

### Frontend Inventory
- **Pages (5):** Overview, Apply, Approvals, Calendar, My Leaves
- **Service:** `leave.service.ts` (171 lines) -- includes leave type CRUD
- **Hooks:** `useLeaves.ts` (280 lines, 30 queries/mutations)
- **Forms:** Leave apply page uses React Hook Form + Zod with proper validation

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| No leave policy admin page | P1 | 6h | Frontend has leave type service calls but no `/leave/policies` or `/leave/admin` admin page for HR to configure leave types, accrual rules, carry-forward |
| Leave balance display on apply | P1 | 2h | Apply page should show real-time balance deduction preview |
| Leave encashment | P2 | 8h | No leave encashment workflow (KEKA has this) |
| Comp-off leave conversion | P2 | 4h | Comp-off requests exist in attendance but not linked to leave balance |

### Test Coverage
- `LeaveRequestControllerTest.java` -- exists
- `LeaveRequestServiceTest.java` -- exists
- `LeaveBalanceServiceTest.java` -- exists
- `LeaveTypeServiceTest.java` -- exists
- `LeaveRequestE2ETest.java` -- exists
- `LeaveRequestControllerIntegrationTest.java` -- exists
- `LeaveRequestScopeIntegrationTest.java` -- exists
- **Coverage:** BEST tested module. No critical gaps.

---

## Module 4: Benefits Administration

### Backend Inventory
- **Controllers (2):** `BenefitManagementController` (basic CRUD), `BenefitEnhancedController` (comprehensive: plans, enrollments, claims, flex allocations, dashboard)
- **Services (2):** `BenefitManagementService`, `BenefitEnhancedService`
- **Entities (6):** `BenefitPlan`, `BenefitPlanEnhanced`, `BenefitEnrollment`, `BenefitClaim`, `BenefitDependent`, `FlexBenefitAllocation`
- **Endpoints (30+):** Plan CRUD, enrollment lifecycle (enroll/approve/activate/terminate/COBRA), claims (submit/process/reject/appeal/payment), flex allocations, dashboard

### Frontend Inventory
- **Pages (1):** Single `benefits/page.tsx` (1074 lines) -- large but single-page
- **Service:** `benefits.service.ts` (235 lines)
- **Hooks:** `useBenefits.ts` (194 lines, 21 queries/mutations)
- **Forms:** Uses React Hook Form + Zod for enrollment

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| **No test coverage at all** | P0 | 6h | Zero test files for Benefits (no controller, service, or integration tests) |
| Single monolithic page | P1 | 4h | 1074-line page should be split into tabs/sub-pages (Plans, My Enrollments, Claims, Admin) |
| Benefits comparison view | P2 | 6h | No side-by-side plan comparison (KEKA feature) |
| Dependent management UI | P1 | 4h | `BenefitDependent` entity exists but no frontend form for adding dependents |
| Open enrollment period | P2 | 6h | No scheduled enrollment windows |

### Test Coverage
- **ZERO test files** -- Critical gap for beta launch

---

## Module 5: Asset Management

### Backend Inventory
- **Controllers (1):** `AssetManagementController`
- **Services (1):** `AssetManagementService` -- integrated with `WorkflowService` for asset request approval
- **Entities (1):** `Asset`
- **Endpoints (9):** CRUD, assign, return, by employee, by status

### Frontend Inventory
- **Pages (1):** `assets/page.tsx` (1113 lines) -- comprehensive single page
- **Service:** `asset.service.ts` (69 lines -- minimal)
- **Hooks:** `useAssets.ts` (141 lines, 15 queries/mutations)
- **Forms:** Uses React Hook Form + Zod

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| No asset categories/types | P1 | 4h | Single `Asset` entity with no category taxonomy (KEKA has IT, Furniture, Vehicle, etc.) |
| Asset depreciation tracking | P2 | 8h | No depreciation schedule or value tracking |
| Asset maintenance schedule | P2 | 6h | No preventive maintenance tracking |
| QR code/barcode for asset tracking | P2 | 4h | No physical asset tagging mechanism |
| Asset audit trail | P1 | 3h | No assignment history view (who had it when) |

### Test Coverage
- `AssetManagementControllerTest.java` -- exists
- **Missing:** `AssetManagementServiceTest` -- service layer not tested

---

## Module 6: Job Posting & Candidate Pipeline

### Backend Inventory
- **Controllers (4):** `RecruitmentController`, `ApplicantController`, `JobBoardController`, `AIRecruitmentController`
- **Services (7):** `JobOpeningService`, `RecruitmentManagementService`, `ApplicantService`, `InterviewManagementService`, `JobBoardIntegrationService`, `GoogleMeetService`, `OfferLetterSignatureListener`
- **Entities (7):** `JobOpening`, `Candidate`, `Applicant`, `Interview`, `JobBoardPosting`, `ApplicationSource`, `ApplicationStatus`
- **Endpoints (20+):** Job opening CRUD, candidate CRUD, stage management, offer generation, accept/decline, job board integration

### Frontend Inventory
- **Pages (7):** Dashboard, Jobs, Candidates, Pipeline, Kanban (`[jobId]/kanban`), Interviews, Job Boards
- **Service:** `recruitment.service.ts` (151 lines), `ai-recruitment.service.ts`
- **Hooks:** `useRecruitment.ts` (333 lines, 39 queries/mutations)

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Careers page public access | P1 | 4h | `/careers` page exists but needs public API routes (no auth required) |
| Offer letter template | P1 | 4h | Offer generation endpoint exists but no template management UI |
| Resume parsing | P2 | 8h | `AIRecruitmentController` exists but AI resume parsing may not be connected |
| Candidate scorecards | P2 | 6h | No structured evaluation form per interview stage |
| Email notifications for candidates | P1 | 3h | No automated email on stage transitions |

### Test Coverage
- `RecruitmentControllerTest.java` -- exists
- `RecruitmentManagementServiceTest.java` -- exists
- `AIRecruitmentFileParsingIntegrationTest.java` -- exists
- `RecruitmentScopeIntegrationTest.java` -- exists
- **Missing:** `ApplicantServiceTest`, `JobBoardIntegrationServiceTest`, `InterviewManagementServiceTest`

---

## Module 7: Interview Scheduling

### Backend Inventory
- **Controllers:** Part of `RecruitmentController` (interview endpoints within same controller)
- **Services:** `InterviewManagementService`, `GoogleMeetService`
- **Entities:** `Interview`
- **Endpoints (4+):** List, create, update, get by ID

### Frontend Inventory
- **Pages (1):** `recruitment/interviews/page.tsx` (1211 lines -- comprehensive)
- **Service:** Part of `recruitment.service.ts`
- **Hooks:** Part of `useRecruitment.ts`

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Google Calendar integration | P1 | 6h | `GoogleMeetService` exists but calendar invite sending not verified |
| Interview feedback form | P0 | 4h | No structured feedback submission form post-interview |
| Interviewer availability check | P2 | 6h | No availability slot picker for interview panel |
| Automated reminders | P1 | 3h | No reminder emails 24h before interview |
| Video interview link generation | P2 | 4h | Google Meet creation exists in service but UI integration unclear |

### Test Coverage
- **Missing:** `InterviewManagementServiceTest` -- no dedicated interview tests
- Covered partially by `RecruitmentControllerTest`

---

## Module 8: Onboarding Workflows

### Backend Inventory
- **Controllers (2):** `OnboardingManagementController`, `PreboardingController`
- **Services (1):** `OnboardingManagementService` -- integrated with `WorkflowService`
- **Entities (5):** `OnboardingProcess`, `OnboardingTask`, `OnboardingChecklistTemplate`, `OnboardingTemplateTask`, `OnboardingDocument`
- **Endpoints (20+):** Process CRUD, template CRUD, task management, status updates, progress tracking, buddy system, portal (preboarding)

### Frontend Inventory
- **Pages (8):** List, Detail (`[id]`), New, Templates, Template Detail, Template New, Preboarding, Preboarding Portal (`portal/[token]`), Offboarding, Offboarding FnF
- **Service:** `onboarding.service.ts` (126 lines)
- **Hooks:** `useOnboarding.ts` (326 lines, 29 queries/mutations)

### Feature Gaps

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Preboarding document upload | P0 | 4h | `PreboardingController` has document upload endpoint but frontend portal may not have file upload UI |
| Onboarding checklist progress dashboard | P1 | 4h | No HR-facing dashboard showing all active onboardings with completion % |
| Buddy assignment from UI | P1 | 2h | Buddy endpoint exists but UI picker may be missing |
| IT provisioning checklist items | P2 | 4h | No integration with asset management for auto-provisioning |
| Offboarding exit interview | P1 | 4h | Exit interview page exists but form completeness unknown |

### Test Coverage
- `OnboardingManagementControllerTest.java` -- exists
- **Missing:** `OnboardingManagementServiceTest`, `PreboardingControllerTest`

---

## Cross-Module Issues

### Known Production Bugs (from QA Round 4)

| Bug ID | Severity | Module | Description | Status |
|--------|----------|--------|-------------|--------|
| BUG-001 | Medium | Dashboard | `/api/v1/linkedin-posts/active` 500 -- endpoint missing | Open |
| BUG-002 | High | Employee Directory | Search 500 -- incorrect field mapping | Open |
| BUG-003 | High | Approvals | Workflow inbox NPE risk | Open |
| BUG-004 | High | Expenses | Empty UUID path variable not validated | Open |
| BUG-005 | Medium | Admin | Hydration mismatch | Open |
| BUG-006 | Critical | RBAC | Team Lead missing REVIEW:VIEW permission | Fix in V67 (pending restart) |
| BUG-007 | Medium | Sidebar | SSR hydration mismatch on gradient | Fixed |

### Frontend-Backend Integration Gaps

| Gap | Priority | Description |
|-----|----------|-------------|
| Holiday management | P1 | `HolidayController` has full CRUD but no `holiday.service.ts` or hooks -- `/holidays` page may be disconnected |
| Shift management | P1 | `ShiftManagementController` + `ShiftSwapController` exist, `useShifts.ts` hook exists but no `shift.service.ts` |
| Leave policy admin | P1 | Leave type service methods exist in `leave.service.ts` but no admin page at `/leave/policies` |
| Asset request workflow | P1 | Backend has workflow integration but frontend asset page doesn't show approval flow status |

### Database Schema Gaps

| Gap | Priority | Description |
|-----|----------|-------------|
| V67 pending | P0 | `V67__fix_rbac_permission_gaps_round2.sql` -- 40 new permission codes + 6 role assignments -- awaiting backend restart |
| No asset categories table | P2 | Asset categorization requires new table or enum column |
| No interview feedback table | P1 | Interview entity lacks structured feedback/scorecard storage |
| Leave policy config | P2 | Leave type entity may lack carry-forward, encashment, and accrual config columns |

### Flyway Migration Status

| Field | Value |
|-------|-------|
| Active migrations | V0-V67 (with V67 pending application) |
| Next available | **V68** |
| Legacy Liquibase | `db/changelog/` -- DO NOT USE |
| Conflicting versions | V67 has a `.bak` file -- clean up needed |
| V63-V65 | Added since last MEMORY.md update (implicit roles, escalation, integration framework) |

---

## Priority Classification

### P0 -- Beta Launch Blockers (Must fix before launch)

| # | Task | Module | Effort | Dependencies |
|---|------|--------|--------|--------------|
| 1 | Fix BUG-002: Employee directory search 500 | Employee | 2h | `EmployeeDirectoryService` field mapping |
| 2 | Fix BUG-003: Workflow inbox NPE | Approvals | 2h | `WorkflowService` null check |
| 3 | Fix BUG-004: Expense empty UUID validation | Expenses | 1h | Path variable validation |
| 4 | Apply V67 migration (restart backend) | RBAC | 0.5h | Backend restart |
| 5 | Fix shift swap UUID input UX | Attendance | 3h | Employee/shift picker components |
| 6 | Write Benefits module tests | Benefits | 6h | Controller + service tests |
| 7 | Interview feedback form | Recruitment | 4h | New endpoint + frontend form |
| 8 | Verify preboarding document upload UI | Onboarding | 2h | MinIO integration check |

**Total P0 effort: ~20.5 hours**

### P1 -- Must Fix for Beta Quality

| # | Task | Module | Effort | Dependencies |
|---|------|--------|--------|--------------|
| 1 | Create leave policy admin page | Leave | 6h | LeaveType CRUD already in service |
| 2 | Wire holiday management frontend | Attendance | 2h | Create `holiday.service.ts` + hooks |
| 3 | Split benefits page into sub-pages | Benefits | 4h | UI restructure only |
| 4 | Add dependent management UI | Benefits | 4h | BenefitDependent entity exists |
| 5 | Fix BUG-001: LinkedIn posts endpoint | Dashboard | 2h | Remove or implement endpoint |
| 6 | Careers page public API routes | Recruitment | 4h | SecurityConfig exemption |
| 7 | Offer letter template management | Recruitment | 4h | Template CRUD UI |
| 8 | Google Calendar invite verification | Interview | 6h | GoogleMeetService integration |
| 9 | Onboarding progress dashboard | Onboarding | 4h | Aggregation query |
| 10 | Asset assignment history/audit trail | Assets | 3h | Audit query |
| 11 | Consolidate org-chart routes | Employee | 1h | Remove duplicate route |
| 12 | Employee profile photo upload | Employee | 3h | MinIO wiring |
| 13 | Automated interview reminders | Interview | 3h | Scheduler + email |
| 14 | Email notifications for candidate stage | Recruitment | 3h | Notification service wiring |
| 15 | Buddy assignment UI picker | Onboarding | 2h | Employee dropdown |
| 16 | Leave balance preview on apply | Leave | 2h | Frontend-only change |
| 17 | Exit interview form completeness | Onboarding | 4h | Form validation audit |
| 18 | Fix BUG-005: Admin hydration mismatch | Admin | 2h | SSR fix |
| 19 | Asset request workflow UI | Assets | 4h | Show approval status on asset page |
| 20 | Write shift service frontend | Attendance | 2h | Create `shift.service.ts` |

**Total P1 effort: ~63 hours**

### P2 -- Post-Beta Improvements

| # | Task | Module | Effort |
|---|------|--------|--------|
| 1 | Bulk employee actions | Employee | 4h |
| 2 | Geolocation attendance validation | Attendance | 8h |
| 3 | Late arrival tracking | Attendance | 4h |
| 4 | Overtime auto-calculation | Attendance | 6h |
| 5 | Leave encashment workflow | Leave | 8h |
| 6 | Comp-off to leave balance conversion | Leave | 4h |
| 7 | Benefits comparison view | Benefits | 6h |
| 8 | Open enrollment periods | Benefits | 6h |
| 9 | Asset categories/types taxonomy | Assets | 4h |
| 10 | Asset depreciation tracking | Assets | 8h |
| 11 | Resume parsing AI integration | Recruitment | 8h |
| 12 | Candidate scorecards | Recruitment | 6h |
| 13 | Interviewer availability slots | Interview | 6h |
| 14 | IT provisioning checklist | Onboarding | 4h |
| 15 | Asset maintenance schedules | Assets | 6h |

**Total P2 effort: ~88 hours**

---

## Missing Test Files Summary

| Module | Missing Tests | Priority |
|--------|---------------|----------|
| Benefits | ALL tests (0 files) | P0 |
| Attendance | `CompOffServiceTest`, `HolidayServiceTest`, `ShiftSwapServiceTest`, `MobileAttendanceServiceTest` | P1 |
| Asset | `AssetManagementServiceTest` | P1 |
| Employee | `EmployeeDirectoryServiceTest`, `EmploymentChangeRequestServiceTest`, `TalentProfileServiceTest` | P1 |
| Recruitment | `ApplicantServiceTest`, `JobBoardIntegrationServiceTest`, `InterviewManagementServiceTest` | P1 |
| Onboarding | `OnboardingManagementServiceTest`, `PreboardingControllerTest` | P1 |

---

## Implementation Readiness Assessment

### Ready to Implement (No blockers)
- All 8 modules have working backend controllers with proper `@RequiresPermission` annotations
- All 8 modules have frontend pages with React Query hooks and service files
- Workflow engine is properly integrated with Leave, Asset, and Onboarding modules
- Forms use React Hook Form + Zod across all modules
- No new database tables needed for P0 tasks

### Key Risks
1. **V67 migration pending** -- RBAC fixes not applied until backend restart
2. **Benefits has zero tests** -- any changes risk regressions
3. **Dashboard performance (25s load)** -- not in scope but will hurt beta perception
4. **Shift swap UX** -- raw UUID inputs will confuse beta users immediately

### Recommended Sprint Allocation

| Day | Focus | Tasks |
|-----|-------|-------|
| Day 1-2 | P0 Bug Fixes | BUG-002, BUG-003, BUG-004, V67 apply, shift swap UX |
| Day 2-3 | P0 Missing Features | Benefits tests, interview feedback form, preboarding upload |
| Day 3-5 | P1 Critical | Leave policy admin, holiday wiring, benefits restructure, careers page |
| Day 5-6 | P1 Polish | Onboarding dashboard, asset audit trail, email notifications |
| Day 6-7 | Hardening | Bug triage, regression testing, final QA sweep |
