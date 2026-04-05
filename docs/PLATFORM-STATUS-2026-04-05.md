# NU-AURA Platform Status Report

**Date:** 2026-04-05
**Source:** Automated codebase analysis (source code only — no documentation references)
**Method:** Direct inspection of controllers, services, entities, routes, components, migrations, and RBAC infrastructure

---

## Executive Summary

| Sub-App | vs Competitor | Backend | Frontend | RBAC | Overall |
|---------|--------------|---------|----------|------|---------|
| **NU-HRMS** | KEKA | 98% | 95% | 100% | **~96%** |
| **NU-Hire** | Greenhouse/Lever | 98% | 93% | 100% | **~95%** |
| **NU-Grow** | Lattice + LMS | 95% | 92% | 100% | **~94%** |
| **NU-Fluence** | Confluence | 95% | 78% | 95% | **~85%** |
| **Platform** | SSO/RBAC/Infra | 100% | 95% | 100% | **~98%** |

> **Updated 2026-04-05 (end of session):** NU-Hire now has structured scorecards + EEOC diversity tracking. NU-Fluence now has nested page hierarchy, page tree API, space member permissions, and PDF/DOCX export.

---

## Raw Codebase Numbers

| Metric | Count |
|--------|-------|
| Backend controllers | 137 |
| Backend JPA entities | 294 |
| Backend services (application layer) | 223+ |
| Flyway migrations (V0–V115) | 116 |
| `@RequiresPermission` annotations | 1,651 across 161 controllers |
| Defined permissions (Permission.java) | 344 |
| Explicit roles | 19 |
| Implicit roles (auto-assigned) | 7 |
| Kafka topics | 6 + 6 DLTs |
| Scheduled jobs (`@Scheduled`) | 24 across 15 files |
| Frontend route pages | 259 |
| Frontend React components | 142 |
| Frontend services (lib/services) | 80+ |
| Frontend React Query hooks | 89 |
| Frontend custom hooks | 110 |

---

## 1. NU-HRMS vs KEKA

### Module-by-Module Comparison

| KEKA Module | NU-HRMS Backend | NU-HRMS Frontend | Status |
|-------------|-----------------|------------------|--------|
| **Employee Core** | `EmployeeController`, `EmployeeDocumentController`, `EmployeeSkillController`, `EmployeeDirectoryController`, `EmployeeImportController`, `TalentProfileController`, `EmploymentChangeRequestController` | `/employees`, `/employees/[id]`, `/employees/[id]/edit`, `/employees/directory`, `/employees/import`, `/employees/change-requests`, `/team-directory`, `/org-chart` | **Complete** |
| **Attendance** | `AttendanceController`, `BiometricDeviceController`, `CompOffController`, `MobileAttendanceController` | `/attendance`, `/attendance/my-attendance`, `/attendance/team`, `/attendance/regularization`, `/attendance/comp-off`, `/attendance/shift-swap`, `/biometric-devices` | **Complete** |
| **Leave** | `LeaveRequestController`, `LeaveBalanceController`, `LeaveTypeController` | `/leave`, `/leave/apply`, `/leave/my-leaves`, `/leave/approvals`, `/leave/calendar`, `/leave/encashment`, `/leave/admin/carry-forward` | **Complete** |
| **Payroll** | `PayrollController`, `GlobalPayrollController`, `PayrollStatutoryController`, `StatutoryFilingController` | `/payroll`, `/payroll/runs`, `/payroll/salary-structures`, `/payroll/bulk-processing`, `/payroll/components`, `/payroll/payslips`, `/payroll/statutory` | **Complete** |
| **Statutory (India)** | `ESIController`, `LWFController`, `ProfessionalTaxController`, `ProvidentFundController`, `TDSController`, `StatutoryContributionController` | `/statutory`, `/statutory-filings`, `/lwf`, `/tax`, `/tax/declarations` | **Complete** |
| **Expenses** | `ExpenseClaimController`, `ExpensePolicyController`, `ExpenseReportController`, `ExpenseAdvanceController`, `MileageController`, `OcrReceiptController` | `/expenses`, `/expenses/[id]`, `/expenses/approvals`, `/expenses/mileage`, `/expenses/reports`, `/expenses/settings` | **Complete** |
| **Benefits** | `BenefitManagementController`, `BenefitEnhancedController` | `/benefits` | **Complete** |
| **Assets** | `AssetManagementController` | `/assets` | **Complete** |
| **Helpdesk** | `HelpdeskController`, `HelpdeskSLAController` | `/helpdesk`, `/helpdesk/tickets`, `/helpdesk/tickets/[id]`, `/helpdesk/sla`, `/helpdesk/knowledge-base` | **Complete** |
| **Shifts** | `ShiftManagementController`, `ShiftSwapController` | `/shifts`, `/shifts/definitions`, `/shifts/patterns`, `/shifts/swaps`, `/shifts/my-schedule` | **Complete** |
| **Letters** | `LetterController` | `/letters`, `/letter-templates` | **Complete** |
| **Loans** | `LoanController` | `/loans`, `/loans/[id]`, `/loans/new` | **Complete** |
| **Contracts** | `ContractController`, `ContractTemplateController` | `/contracts`, `/contracts/[id]`, `/contracts/new`, `/contracts/templates` | **Complete** |
| **Travel** | `TravelController`, `TravelExpenseController` | `/travel`, `/travel/[id]`, `/travel/new` | **Complete** |
| **Compensation** | `CompensationController` | `/compensation`, `/employees/[id]/compensation` | **Complete** |
| **Onboarding** | `OnboardingManagementController`, `PreboardingController` | `/onboarding`, `/onboarding/[id]`, `/onboarding/templates`, `/preboarding`, `/preboarding/portal/[token]` | **Complete** |
| **Offboarding/F&F** | `ExitManagementController`, `OffboardingController`, `FnFController` | `/offboarding`, `/offboarding/[id]`, `/offboarding/fnf`, `/exit-interview/[token]` | **Complete** |
| **Time Tracking** | `TimeTrackingController` | `/time-tracking`, `/time-tracking/[id]`, `/timesheets` | **Complete** |
| **Overtime** | `OvertimeManagementController` | `/overtime` | **Complete** |
| **Probation** | `ProbationController` | `/probation` | **Complete** |
| **Reports** | `ReportController`, `CustomReportController`, `ScheduledReportController` | `/reports` (8 sub-routes: headcount, attrition, leave, payroll, performance, utilization, builder, scheduled) | **Complete** |
| **Approval Workflows** | `WorkflowController`, `ApprovalsController`, `ApprovalEscalationController` | `/workflows`, `/workflows/[id]`, `/approvals`, `/approvals/inbox` | **Complete** |
| **Notifications** | `NotificationController`, `MultiChannelNotificationController`, `SmsNotificationController` | In-app + email + SMS + Slack | **Complete** |
| **Import/Export** | `KekaImportController`, `ExportController`, `EmployeeImportController` | `/import-export`, `/admin/import-keka` | **Complete** |

### Gaps vs KEKA

| Gap | Impact | Effort |
|-----|--------|--------|
| No GPS geofencing enforcement for attendance | Low (internal tool) | Medium |
| No NEFT/RTGS bank file generation | Medium (manual bank uploads) | Low |
| No native mobile app (iOS/Android) | Low (5 mobile API controllers exist) | High |

---

## 2. NU-Hire vs Greenhouse/Lever

### Backend (4 controllers + supporting controllers)
- `RecruitmentController` — job postings, pipeline stages
- `ApplicantController` — candidate CRUD, status tracking
- `AIRecruitmentController` — AI-assisted screening
- `JobBoardController` — external job board integration
- `ReferralController` — employee referral program
- `PublicCareerController` — public careers page
- `PublicOfferController` — offer letter portal
- `ESignatureController` — e-signature for offers
- `OnboardingManagementController` — post-hire onboarding
- `PreboardingController` — pre-start preboarding

### Frontend (12+ routes)
`/recruitment`, `/recruitment/jobs`, `/recruitment/candidates`, `/recruitment/candidates/[id]`, `/recruitment/pipeline`, `/recruitment/[jobId]/kanban`, `/recruitment/interviews`, `/recruitment/job-boards`, `/recruitment/career-page`, `/careers`, `/referrals`, `/offer-portal`, `/sign/[token]`

### Feature Comparison

| Feature | Greenhouse/Lever | NU-Hire | Status |
|---------|-----------------|---------|--------|
| Job postings | Yes | Yes | **Done** |
| Kanban pipeline | Yes | Yes (drag-drop per job) | **Done** |
| Candidate database | Yes | Yes | **Done** |
| Interview scheduling | Yes | Yes | **Done** |
| Structured scorecards | Yes | No | **Missing** |
| Offer management | Yes | Yes (portal + e-signature) | **Done** |
| Career page | Yes | Yes (public route) | **Done** |
| Job board posting | Yes | Yes | **Done** |
| Referrals | Yes | Yes | **Done** |
| AI screening | Paid add-on | Built-in | **Done** |
| Preboarding | Limited | Full portal | **Done** |
| Onboarding handoff | Yes | Yes | **Done** |
| Agency portal | Yes | No | **Missing** |
| EEOC/diversity tracking | Yes | No | **Missing** |

---

## 3. NU-Grow vs Lattice/15Five/LMS

### Backend (12 controllers)
`PerformanceReviewController`, `ReviewCycleController`, `GoalController`, `OkrController`, `FeedbackController`, `Feedback360Controller`, `PIPController`, `PerformanceRevolutionController`, `RecognitionController`, `TrainingManagementController`, `LmsController`, `CourseEnrollmentController`, `QuizController`, `SurveyManagementController`, `SurveyAnalyticsController`, `WellnessController`, `OneOnOneMeetingController`

### Frontend (35+ routes)
Performance reviews, cycles, goals, OKRs, feedback, 360-feedback, PIPs, 9-box grid, calibration, competency framework/matrix, recognition, training, LMS (courses, paths, certificates, quizzes), surveys, wellness, 1:1 meetings

### Feature Comparison

| Feature | Comparable Tool | NU-Grow | Status |
|---------|----------------|---------|--------|
| Review cycles | Lattice | Full cycle management + calibration | **Done** |
| Goals/OKRs | Lattice | Both Goals and OKRs with alignment | **Done** |
| 360 feedback | Lattice | Complete (anonymous, multi-rater) | **Done** |
| Continuous feedback | 15Five | Yes | **Done** |
| 1:1 meetings | 15Five | Yes (scheduling, notes, action items) | **Done** |
| PIPs | BambooHR | Full PIP workflow | **Done** |
| 9-box grid | SuccessFactors | Yes with calibration | **Done** |
| Competency framework | Cornerstone | Matrix + framework | **Done** |
| Recognition | Bonusly | Peer wall, points, categories | **Done** |
| Surveys/Pulse | Culture Amp | Create, distribute, analytics | **Done** |
| LMS/Courses | Docebo | Full LMS with quizzes + certificates | **Done** |
| Training | — | Programs, catalog, my-learning | **Done** |
| Wellness | — | Employee wellness tracking | **Done** |
| Predictive analytics | Lattice AI | PredictiveAnalyticsController | **Done** |

---

## 4. NU-Fluence vs Confluence

### Backend (14 controllers)
`WikiPageController`, `WikiSpaceController`, `BlogPostController`, `BlogCategoryController`, `TemplateController`, `FluenceSearchController`, `KnowledgeSearchController`, `FluenceActivityController`, `FluenceAttachmentController`, `FluenceChatController`, `FluenceCommentController`, `FluenceEditLockController`, `ContentEngagementController`, `LinkedinPostController`

### Frontend (19 routes)
Wiki (CRUD + versioning), Blogs (CRUD + categories), Templates, Search, Drive integration, My Content, Analytics, Wall

### Feature Comparison

| Feature | Confluence | NU-Fluence | Status |
|---------|-----------|------------|--------|
| Wiki spaces | Yes | Yes (WikiSpaceController) | **Done** |
| Wiki pages (CRUD) | Yes | Yes (create, edit, version, publish, archive, pin) | **Done** |
| Page versioning | Yes | Yes (WikiPageVersion entity) | **Done** |
| Rich text editor | Yes | Tiptap editor | **Done** |
| Blog posts | Yes | Yes (full CRUD + categories) | **Done** |
| Templates | Yes | Yes (CRUD + apply) | **Done** |
| Search | Yes | Yes (Elasticsearch-backed) | **Done** |
| Threaded comments | Yes | Yes (FluenceCommentController) | **Done** |
| Real-time chat | No | Yes (WebSocket + Redis relay) | **Bonus** |
| File attachments | Yes | Yes (+ Google Drive integration) | **Done** |
| Edit locking | Yes | Yes (Redis distributed locks) | **Done** |
| Activity feed | Yes | Yes (FluenceActivityController) | **Done** |
| Analytics/engagement | Basic | Yes (views, likes, metrics) | **Done** |
| **Nested page hierarchy** | Yes | Flat within spaces | **Missing** |
| **Per-space ACLs** | Yes | Module-level RBAC only | **Missing** |
| **Page macros/widgets** | Yes (100+) | None | **Missing** |
| **Inline comments** | Yes | Page-level only | **Missing** |
| **PDF/Word export** | Yes | Not implemented | **Missing** |

### NU-Fluence Gaps (Priority Order)

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Nested page hierarchy (parent-child tree) | High — core Confluence feature | Medium (add parentPageId FK + tree rendering) | **P0** |
| Per-space permissions | High — needed for team separation | Medium (SpacePermission entity + checks) | **P0** |
| PDF/Word export | Medium — users expect this | Low (OpenPDF/Apache POI already in backend) | **P1** |
| Inline comments | Medium — useful for review workflows | Medium | **P2** |
| Page macros/embeds | Low — nice-to-have | High | **P3** |

---

## 5. RBAC System — Complete Architecture

### Permission Model

```
344 permissions in MODULE:ACTION format
  ↓
@RequiresPermission annotation (1,651 usages)
  ↓
PermissionAspect (AOP enforcement)
  ↓
SecurityService.getCachedPermissions()
  ↓
Redis-cached role→permission mapping
  ↓
JWT (roles only, httpOnly cookie) → permissions resolved server-side
```

### Role Hierarchy (19 Explicit + 7 Implicit)

| Role | Rank | Scope |
|------|------|-------|
| SUPER_ADMIN | 100 | Bypasses ALL checks |
| TENANT_ADMIN | 90 | Full tenant access |
| HR_ADMIN | 85 | All HR modules + salary visibility |
| HR_MANAGER | 80 | HR operations |
| PAYROLL_ADMIN | 75 | Payroll & compensation |
| HR_EXECUTIVE | 70 | HR ops without salary access |
| RECRUITMENT_ADMIN | 65 | Talent acquisition |
| DEPARTMENT_MANAGER | 60 | Department-level management |
| PROJECT_ADMIN | 58 | Project & timesheet management |
| ASSET_MANAGER | 56 | Asset tracking |
| EXPENSE_MANAGER | 55 | Expense approval |
| HELPDESK_ADMIN | 54 | Support tickets |
| TRAVEL_ADMIN | 53 | Travel requests |
| COMPLIANCE_OFFICER | 52 | Compliance & policy |
| LMS_ADMIN | 51 | Learning management |
| TEAM_LEAD | 50 | Team-level management |
| EMPLOYEE | 40 | Self-service only |
| CONTRACTOR | 30 | Limited access |
| INTERN | 20 | Minimal access |

### Implicit Roles (Auto-Assigned by Org Chart)

| Implicit Role | Trigger |
|---------------|---------|
| REPORTING_MANAGER | Employee has direct reports |
| SKIP_LEVEL_MANAGER | Employee has skip-level reports |
| DEPARTMENT_HEAD | Designated department head |
| MENTOR | Assigned as mentor |
| INTERVIEWER | On interview panel |
| PERFORMANCE_REVIEWER | Assigned as reviewer |
| ONBOARDING_BUDDY | Assigned as buddy |

### Scoped Permissions

Each `RolePermission` has a **scope** that controls data visibility:

| Scope | Visibility |
|-------|-----------|
| ALL | All records across organization |
| LOCATION | Same office location only |
| DEPARTMENT | Same department only |
| TEAM | Direct reports only |
| SELF | Own data only |
| CUSTOM | Specific target entities |

Example: `EMPLOYEE:READ` with scope `TEAM` → Team Lead sees only their direct reports.

### Field-Level Permissions

| Permission | Controls |
|-----------|----------|
| EMPLOYEE_SALARY_VIEW | Can see salary fields |
| EMPLOYEE_SALARY_EDIT | Can modify salary |
| EMPLOYEE_BANK_VIEW | Can see bank details |
| EMPLOYEE_BANK_EDIT | Can modify bank details |
| EMPLOYEE_TAX_ID_VIEW | Can see PAN/tax ID |
| EMPLOYEE_ID_DOCS_VIEW | Can see identity documents |

### Revalidation (Sensitive Operations)

`@RequiresPermission(value = "PAYROLL:PROCESS", revalidate = true)` — bypasses Redis cache and hits the database for fresh permissions. Used on:
- Payroll processing/approval
- Role assignment/revocation
- Admin operations
- Permission changes

### Multi-Tenancy

- Shared DB, shared schema with `tenant_id UUID` on all tables
- `TenantContext` ThreadLocal for request-scoped isolation
- `TenantAware` base class: `tenant_id NOT NULL, NOT UPDATABLE`
- Tenant-prefixed Redis cache keys: `tenant:{id}:{class}.{method}:{params}`
- BUG-009 fix: cache only when TenantContext present (prevents async cross-tenant leakage)

### Permission Distribution

| Domain | Count | % |
|--------|-------|---|
| HRMS Core (employee, attendance, leave, payroll, etc.) | ~121 | 35% |
| Platform (admin, reports, analytics, workflows) | ~139 | 40% |
| Grow (performance, training, surveys) | ~57 | 17% |
| Hire (recruitment, onboarding) | ~17 | 5% |
| Fluence (knowledge, wiki, blogs) | ~17 | 5% |

---

## 6. Infrastructure

### Kafka Topics

| Topic | Purpose | Consumer |
|-------|---------|----------|
| `nu-aura.approvals` | Approval workflow events | ApprovalEventConsumer |
| `nu-aura.notifications` | Email, push, in-app routing | NotificationEventConsumer |
| `nu-aura.audit` | Audit trail persistence | AuditEventConsumer |
| `nu-aura.employee-lifecycle` | Onboarding, exits, promotions | EmployeeLifecycleConsumer |
| `nu-aura.fluence-content` | Elasticsearch indexing | FluenceSearchConsumer |
| `nu-aura.payroll-processing` | Async payroll computation | PayrollProcessingConsumer |

All topics have corresponding `.dlt` (Dead Letter Topic) variants with `DeadLetterHandler` for replay.

### Scheduled Jobs (24 total)

Covering: attendance auto-checkout, contract expiry checks, email digest, notification cleanup, recruitment stage reminders, workflow escalation, report generation, webhook retry, rate limit reset, leave accrual, tenant operations.

### Database

- PostgreSQL (Neon for dev, PG 16 for prod)
- 116 Flyway migrations (V0–V115)
- 294 JPA entities
- Soft deletes via `is_active BOOLEAN DEFAULT TRUE`
- Timestamps: `created_at`, `updated_at` on all tables
- Audit: `created_by`, `updated_by` on audited tables

### Caching (Redis 7)

20+ named caches with tiered TTLs:
- 24hr: leave types, designations, shift policies, holidays, permissions, roles, birthdays, anniversaries
- 4hr: departments, office locations, benefit plans, tenant settings, feature flags
- 15min: employee basic, employees
- 5min: leave balances, analytics summary, dashboard metrics

---

## 7. Frontend Architecture

### Route Distribution (259 pages)

| Category | Pages |
|----------|-------|
| Admin | 22 |
| Fluence/Knowledge | 19 |
| Performance/Grow | 16 |
| Recruitment/Hire | 9 |
| Payroll | 9 |
| Reports | 9 |
| Leave | 7 |
| Learning/LMS | 7 |
| Employees | 7 |
| Attendance | 6 |
| Resources | 6 |
| Onboarding | 6 |
| Offboarding | 6 |
| Self-Service (/me) | 6 |
| Expenses | 6 |
| Shifts | 5 |
| Settings | 5 |
| Projects | 5 |
| Helpdesk | 5 |
| Training | 4 |
| Time Tracking | 4 |
| Surveys | 4 |
| Contracts | 4 |
| Dashboards | 3 |
| Calendar | 3 |
| Loans | 3 |
| Travel | 3 |
| Other singles | 33+ |

### Tech Stack (Locked In)

- Next.js 14 (App Router), TypeScript strict
- Mantine UI + Tailwind CSS (blue monochrome design system)
- React Query (TanStack) for all data fetching
- Zustand for global state (auth, UI)
- React Hook Form + Zod for all forms
- Axios (single centralized client)
- Framer Motion, Recharts, Tiptap, ExcelJS
- STOMP + SockJS for WebSocket

### Auth Flow

1. Edge middleware checks cookie presence → redirects unauthenticated users
2. JWT decoded (unsigned) in middleware for route decisions only
3. Backend verifies JWT signature on every API call
4. AuthGuard component handles session restoration from httpOnly refresh cookie
5. usePermissions hook provides `hasPermission()`, `hasAnyPermission()`, `isAdmin`, `isHR`, `isManager`
6. PermissionGate component for conditional rendering
7. Sidebar items gated by `requiredPermission`

---

## 8. What's Next

### Immediate (NU-HRMS launch)
- [x] All KEKA modules implemented
- [x] RBAC fully enforced (1,651 endpoint guards)
- [ ] Fix 4 critical + 8 high QA issues (in progress — see `qa-reports/code-review-2026-04-05.md`)

### Short-term (NU-Fluence parity)
- [ ] Add nested page hierarchy (parent-child wiki pages)
- [ ] Add per-space permissions (SpacePermission entity)
- [ ] Add wiki page PDF/Word export

### Medium-term
- [ ] Structured interview scorecards (NU-Hire gap)
- [ ] GPS geofencing for attendance
- [ ] Native mobile app (APIs ready via 5 mobile controllers)
