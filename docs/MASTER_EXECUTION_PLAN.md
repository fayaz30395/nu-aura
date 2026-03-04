# NU-AURA HRMS — Master Execution Plan

**Created:** March 4, 2026
**Horizon:** 10 sprints (20 working weeks to production-grade launch)
**Strategy:** Fix → Complete → Polish → Launch → Grow

---

## Ground Truth (What the Code Actually Says)

Forget the optimistic docs. Here's the real state based on code exploration:

| Module | Actual State | Blocker |
|--------|-------------|---------|
| Core HR / Attendance / Leave | ✅ Production-ready | — |
| RBAC & Multi-tenancy | ✅ Production-ready | — |
| Expenses / Travel / Loans | ✅ Solid, 80% | Minor gaps |
| Engagement / Recognition | ✅ Strong, 90% | — |
| Projects / PSA / Gantt | ⚠️ 85% but 500 error on list API (tenant-specific) | Bug |
| Project Resource Allocation | 🔄 50% — in progress | Active dev |
| Recruitment ATS | ⚠️ 65% — backend done, frontend UI incomplete | No e-sign flow UI |
| Performance Management | ⚠️ 75% — no bell curve, no PIP | Missing calibration |
| Training / LMS | ⚠️ 65% — entities exist, no quiz engine wired | Missing progress/quiz/certs |
| Onboarding / Exit | ⚠️ 70% — no FnF settlement engine | Missing FnF |
| Payroll | ⚠️ 50% — no Form 16, no statutory reports, no bank files | Statutory gap |
| Analytics / Reports | ⚠️ 80% — no custom builder, no scheduled delivery | Report builder gap |

**True overall: ~75% toward Keka parity**

---

## Sprint Map

```
Sprint 1  ──── BUG FIXES + PROJECT ALLOCATION COMPLETION
Sprint 2  ──── RECRUITMENT: ATS PIPELINE + OFFER LETTER E-SIGN
Sprint 3  ──── PERFORMANCE: CALIBRATION + REVIEW WORKFLOW
Sprint 4  ──── PAYROLL: STATUTORY COMPLIANCE ENGINE
Sprint 5  ──── TRAINING: QUIZ ENGINE + CERTIFICATES + LMS COMPLETION
Sprint 6  ──── REPORTS: CUSTOM BUILDER + SCHEDULING
Sprint 7  ──── ONBOARDING/EXIT: FnF SETTLEMENT + PREBOARDING POLISH
Sprint 8  ──── SECURITY HARDENING + OWASP SWEEP
Sprint 9  ──── PERFORMANCE OPTIMIZATION + MOBILE RESPONSIVENESS
Sprint 10 ──── LAUNCH PREP: SEED DATA + DEMO TENANT + E2E COVERAGE
```

---

## Sprint 1: Bug Fixes + Project Allocation Completion

**Goal:** Unblock project module. Ship resource allocation. Fix all known 500 errors.

### 1.1 Fix Project List 500 Error (Day 1)

**Evidence:** `projects_result_v3.json` shows 500 on GET `/api/v1/projects` for tenant `660e8400-e29b-41d4-a716-446655440001`. Create works on `550e8400` but list fails.

**Investigation path:**
- Check `ProjectController.getProjects()` — likely a NullPointerException in ProjectService when mapping `teamMembers` or `projectManagerName`
- `ProjectResponse.java` has `projectManagerName` (String, nullable) — MapStruct mapper may not handle null FK lookup
- Check `ProjectRepository.findAllByTenantIdAndDeletedAtIsNull()` — ensure tenant filter works
- Likely culprit: `getProjectManagerName()` call does a secondary employee lookup that throws when employee not found across tenants

**Fix:**
```java
// ProjectService.java — guard the manager name lookup
String managerName = null;
if (project.getProjectManagerId() != null) {
    employeeRepository.findById(project.getProjectManagerId())
        .ifPresent(e -> response.setProjectManagerName(e.getFullName()));
}
```

**Test:** Add integration test `ProjectControllerTest.shouldReturnEmptyPageWhenNoProjects()`

---

### 1.2 Complete Project Resource Allocation (Days 2-8)

**Current state:** `ProjectMember` entity exists with `allocationPercentage`, `billingRate`, `costRate`, `startDate`, `endDate`. `ProjectService.assignEmployee()` exists. Frontend shows roster table in `projects/[id]/page.tsx` but no allocation UI.

**What's missing:**

#### Backend (2 days)
- [ ] `GET /api/v1/projects/allocations/summary` — Cross-project allocation summary per employee
- [ ] `GET /api/v1/employees/{id}/allocation-timeline` — Employee's allocations over time (for capacity view)
- [ ] `POST /api/v1/projects/{id}/members/{memberId}/reallocate` — Change allocation % or dates
- [ ] Over-allocation detection: if employee's total allocation across active projects > 100%, return warning flag
- [ ] `GET /api/v1/resources/availability?from=&to=&skill=` — Available employees in date range (used for assignment typeahead)

**New DTOs:**
```java
AllocationSummaryResponse {
  employeeId, employeeName, employeeCode,
  totalAllocationPercent,          // sum across active projects
  isOverAllocated,                 // true if > 100%
  allocations: List<ProjectAllocation>  // each project slice
}

ResourceAvailabilityResponse {
  employees: List<{
    employeeId, name, department, skills,
    availablePercent,  // 100 - currentTotalAllocation
    unavailablePeriods: List<DateRange>
  }>
}
```

#### Frontend (4 days)
- [ ] **Allocation Modal** (`AllocateEmployeeModal.tsx`): Employee typeahead, allocation %, start/end date, role, billing rate — POST to assign
- [ ] **Resource Pool View** (`/app/resources/pool/page.tsx`): Table of all employees with current allocation bars (color-coded: green ≤80%, orange 81-99%, red ≥100%)
- [ ] **Capacity Timeline** (`/app/resources/capacity/page.tsx`): Horizontal bar chart per employee, time range selector, project color bands
- [ ] **Over-allocation Alert** in project detail page — badge when member is overallocated
- [ ] Wire `hrmsProjectAllocationService` to actual allocation APIs (currently partially wired)
- [ ] Allocation summary CSV export

#### Tests (1 day)
- [ ] E2E: `resource-allocation.spec.ts` — allocate employee, verify %, verify over-allocation alert, end allocation

---

### 1.3 Fix Backend Test Compilation (Day 2 — parallel)

**Evidence from backlog:** "RoleScope/RolePermission test utilities no longer match domain."

**Fix path:**
- Find all test files importing old `RoleScope`/`RolePermission` constructors
- Update to match current domain model
- Run `mvn test` and ensure all tests compile and pass

---

## Sprint 2: Recruitment — ATS Pipeline + Offer Letter E-Sign

**Goal:** Complete the Recruitment module to 90%+. The backend is solid (65%) but the frontend ATS pipeline UI is incomplete and the e-sign flow has no end-to-end wiring.

### 2.1 ATS Pipeline Kanban Board (Days 1-4)

**Current state:** `ApplicantController.getPipeline()` returns `Map<ApplicationStatus, List<Applicant>>` — the data exists but no Kanban UI in recruitment pages.

**Build:**
- [ ] `RecruitmentPipelineBoard.tsx` — drag-and-drop Kanban board using `@dnd-kit/core`
  - Columns: APPLIED → SCREENING → PHONE_SCREEN → INTERVIEW → TECHNICAL_ROUND → HR_ROUND → OFFER_PENDING → OFFERED
  - Cards: candidate name, source badge, days-in-stage, rating stars
  - Drop: calls `PUT /api/v1/recruitment/applicants/{id}/status`
- [ ] Applicant detail drawer: full candidate profile, interview history, notes, rating
- [ ] Bulk actions: bulk reject (with templated email), bulk advance
- [ ] Pipeline analytics bar: conversion rates between stages (funnel view)
- [ ] Filter by job opening, recruiter, source

**Route:** `/app/recruitment/pipeline/page.tsx`

---

### 2.2 Offer Letter E-Sign Flow (Days 5-8)

**Current state:** `LetterController`, `LetterService`, `ESignatureController` all exist on backend. `ESignatureController.java` has `createSignatureRequest()`. Frontend has `/app/letters/` route.

**What's missing:** The end-to-end wiring: HR creates offer → candidate gets email link → signs → status updates in ATS.

#### Backend completions:
- [ ] `LetterService.generateOfferLetter(applicantId, templateId)` — resolve merge fields:
  ```
  {{candidate.fullName}}, {{job.title}}, {{offer.ctc}},
  {{offer.joiningDate}}, {{offer.location}}, {{company.name}}
  ```
- [ ] `ESignatureService.sendForSignature(letterId, signerEmail)` — generate signed URL (time-limited, JWT-based), send email with link
- [ ] `PUT /api/v1/esignature/{token}/sign` — public endpoint (no auth required), captures signature, stores signed PDF, updates applicant status to `ACCEPTED`
- [ ] Webhook on signature completion → `ApplicantService.updateStatus(OFFER_ACCEPTED)`

#### Frontend completions:
- [ ] Offer creation flow in recruitment pipeline (`CreateOfferModal.tsx`): template picker, CTC field, joining date, preview rendered letter
- [ ] Signature page (`/app/sign/[token]/page.tsx`) — public page, renders PDF, canvas signature pad (`react-signature-canvas`), submit action
- [ ] Status tracking in applicant detail: timeline showing offer sent → signed → accepted/declined

#### Email Templates:
- `offer-letter.html` — Branded offer email with signing link
- `offer-accepted.html` — Confirmation to HR when candidate signs

---

### 2.3 Candidate Bulk Operations (Day 9)
- [ ] Bulk import candidates via Excel (`POST /api/v1/recruitment/candidates/import`)
- [ ] Bulk reject with reason + templated email

---

## Sprint 3: Performance — Review Workflow + Calibration

**Goal:** Complete Performance to 90%+. The OKR and feedback pieces are solid. What's missing is the actual review activation workflow and calibration.

### 3.1 Review Cycle Activation Workflow (Days 1-4)

**Current state:** `ReviewCycleController` and `PerformanceReviewController` exist. Frontend has `/app/performance/cycles/` and `/app/performance/reviews/` routes. But the activation workflow (HR launches → employees see forms → submit → manager rates → calibration) is incomplete.

**Build the state machine:**
```
DRAFT → SELF_ASSESSMENT (employees fill) → MANAGER_REVIEW →
CALIBRATION → RATINGS_PUBLISHED → CLOSED
```

- [ ] `ReviewCycleService.activate()` — creates `PerformanceReview` records for all employees in scope, triggers notification
- [ ] Employee self-assessment form with competency ratings + comments, goal achievement %
- [ ] Manager review form: ratings per competency, overall rating (1-5), increment/promotion recommendation
- [ ] HR can advance cycle stage with one click

### 3.2 Calibration View (Days 5-6)

- [ ] `GET /api/v1/performance/cycles/{id}/calibration` — returns all employees with current ratings, dept breakdown
- [ ] Frontend calibration grid: distribution bar (1s, 2s, 3s, 4s, 5s count), sortable employee table with editable final rating
- [ ] Bell curve distribution check — warn HR if top 5% or bottom 10% deviation from expected curve

### 3.3 9-Box Grid (Day 7)

- [ ] Scatter plot component: x-axis = Performance (1-5), y-axis = Potential (assessed separately)
- [ ] Click on box → see employees in that quadrant
- [ ] Export to PNG

### 3.4 PIP Workflow (Days 8-9)

- [ ] `PerformanceImprovementPlan` entity: employee, start/end date, goals (array), check-in frequency, status
- [ ] HR/Manager creates PIP for under-performing employee
- [ ] Weekly check-in records against PIP goals
- [ ] PIP closure: completed/extended/terminated

---

## Sprint 4: Payroll — Statutory Compliance Engine

**Goal:** Close the payroll gap from 50% → 85%. This is critical for Indian market.

### 4.1 PF Calculation Engine (Days 1-2)
- [ ] `PFCalculationService.calculate(payrollRunId)`:
  - Employee contribution: 12% of Basic (capped at ₹15,000 Basic → max ₹1,800/month)
  - Employer contribution: 12% of Basic (EPF: 3.67% + EPS: 8.33%)
  - Handle EPF opt-out for high earners
- [ ] `PFRemittanceReport` — ECR (Electronic Challan cum Return) format for EPFO upload
- [ ] `GET /api/v1/payroll/statutory/pf-report?month=&year=` → downloadable CSV in ECR format

### 4.2 ESI Calculation Engine (Days 2-3)
- [ ] Wage ceiling check: ESI applicable if gross ≤ ₹21,000/month
- [ ] Employee contribution: 0.75% of gross wages
- [ ] Employer contribution: 3.25% of gross wages
- [ ] Monthly challan generation

### 4.3 Professional Tax (Day 3)
- [ ] State-wise slab table (Maharashtra, Karnataka, Andhra Pradesh, Tamil Nadu — most common)
- [ ] `PTCalculationService.calculate(employeeId, grossSalary, state)` — lookup slab, return deduction
- [ ] Monthly PT challan

### 4.4 TDS / Tax Engine (Days 4-5)
- [ ] `TDSCalculationService.calculateAnnualTax(employeeId, financialYear)`:
  - Gross annual income = (Basic + HRA + Allowances) × 12 + Bonus
  - Less: HRA exemption (metro/non-metro), Standard deduction ₹50,000
  - Less: 80C declarations (from TaxDeclaration)
  - Apply slab rates (New vs Old regime)
  - Monthly TDS = Annual tax ÷ 12 (adjusted for mid-year changes)
- [ ] `TaxDeclaration` frontend form: 80C, 80D, HRA proof, LTA
- [ ] **Form 16 Part A + Part B** PDF generation using existing `PdfExportService`

### 4.5 Bank File Generation (Day 6)
- [ ] `BankFileService.generateNEFT(payrollRunId)` — CSV in bank-specific format (ICICI, HDFC, SBI) with: account number, IFSC, employee name, net pay
- [ ] `GET /api/v1/payroll/{runId}/bank-file?bank=ICICI` → downloadable file

### 4.6 Payroll Frontend Polish (Days 7-8)
- [ ] Statutory deductions breakdown in payslip PDF (PF, ESI, PT, TDS line items with YTD)
- [ ] "Run Payroll" wizard: step through → attendance data pulled → deductions applied → preview → approve → generate
- [ ] Statutory reports page: PF report, ESI report, PT report, Form 16 tab

---

## Sprint 5: Training / LMS — Quiz Engine + Certificates

**Goal:** Bring LMS from 65% → 90%. The entity model is complete but the quiz engine, progress tracking, and certificate issuance are not wired.

### 5.1 Course Enrollment & Progress Tracking (Days 1-3)
- [ ] `ContentProgressService.markComplete(enrollmentId, contentId)` — updates `ContentProgress`, recalculates `CourseEnrollment.progressPercentage`
- [ ] `GET /api/v1/lms/enrollments/{id}/progress` — returns per-module, per-content completion status
- [ ] Frontend course player (`/app/learning/courses/[id]/play/page.tsx`):
  - Module sidebar (checklist showing completed items)
  - Video content: `<video>` tag with time-tracking (mark complete at 90% watched)
  - Document content: PDF viewer, mark complete on scroll
  - Progress bar header

### 5.2 Quiz Engine (Days 3-5)
- [ ] `Quiz.java` + `QuizQuestion.java` already exist — wire `QuizAttempt` entity: `enrollmentId`, `quizId`, `score`, `passedAt`, `attemptNumber`
- [ ] `POST /api/v1/lms/quizzes/{quizId}/attempt` — submit answers, return score, pass/fail, correct answers
- [ ] Retry logic: `maxAttempts` on Course entity — block further attempts if exceeded
- [ ] Frontend quiz player: multiple choice / true-false / short answer, submit, show score

### 5.3 Certificate Generation (Days 5-6)
- [ ] `CertificateService.issue(enrollmentId)` — triggered when `progressPercentage = 100` AND (no quiz OR quiz passed)
- [ ] PDF certificate using `OpenPDF`: candidate name, course name, completion date, certificate number, digital signature image
- [ ] `GET /api/v1/lms/certificates/{id}` → PDF download
- [ ] Frontend: certificate wall in "My Trainings" tab showing earned certificates with download button

### 5.4 Learning Path Builder (Days 7-8)
- [ ] `LearningPath` entity: name, description, courses (ordered list), targetRole, estimatedHours
- [ ] Admin can create paths (e.g., "New Manager Track", "Java Developer")
- [ ] Employee enrolls in path → auto-enrolled in all courses in sequence
- [ ] Path progress = weighted average of course completions

### 5.5 Mandatory Training Tracking (Day 9)
- [ ] HR assigns mandatory courses to roles/departments
- [ ] Dashboard widget: "X employees have overdue mandatory training"
- [ ] Automated reminder emails at 7-day, 3-day, 1-day before deadline

---

## Sprint 6: Reports — Custom Builder + Scheduled Delivery

**Goal:** Build the report infrastructure that closes the P1 "Reporting UI Parity" backlog item.

### 6.1 Pre-built Reports Completion (Days 1-3)

Wire ALL existing report APIs to their frontend views. Currently the APIs exist but many UI views are placeholder:

| Report | API (exists) | Frontend (build) |
|--------|-------------|-----------------|
| Headcount by Dept | `OrganizationHealthController` | `/app/reports/headcount/` |
| Monthly Attendance | `AttendanceReportService` | `/app/reports/attendance/` |
| Leave Utilization | `LeaveReportService` | `/app/reports/leave/` |
| Payroll Summary | `PayrollController` | `/app/reports/payroll/` |
| Attrition Analysis | `PredictiveAnalyticsController` | `/app/reports/attrition/` |
| Expense Summary | `ExpenseReportService` | `/app/reports/expenses/` |
| Training Completion | `LmsService` | `/app/reports/training/` |
| Recruitment Funnel | `ApplicantService` | `/app/reports/recruitment/` |

Each report page: date range filter, department filter, export (Excel + PDF), chart + data table.

### 6.2 Custom Report Builder (Days 4-6)

- [ ] `ReportDefinition` entity: name, baseModule, selectedFields (JSON array), filters (JSON), groupBy, sortBy, chartType, tenantId
- [ ] `POST /api/v1/reports/definitions` — save custom report
- [ ] `POST /api/v1/reports/run/{definitionId}` — execute and return paginated data
- [ ] Frontend builder (`/app/reports/builder/page.tsx`):
  - Step 1: Choose module (Employees, Attendance, Leave, Payroll...)
  - Step 2: Select fields from available columns (checkbox list)
  - Step 3: Add filters (field, operator, value)
  - Step 4: Choose chart type + groupBy
  - Step 5: Name and save / run immediately
- [ ] Saved reports library with sharing (owner can share with roles)

### 6.3 Scheduled Report Delivery (Days 7-8)

- [ ] `ScheduledReport` entity already exists — wire it:
  - Cron-based trigger (via Spring `@Scheduled`)
  - Generate report, convert to Excel
  - Email to configured recipient list
- [ ] Frontend: Schedule settings on report definition (frequency: daily/weekly/monthly, time, recipients)

---

## Sprint 7: Onboarding/Exit — FnF Settlement + Preboarding

### 7.1 Full and Final Settlement Engine (Days 1-4)

This is the most complex missing piece in onboarding/exit. When an employee resigns:

**Components of FnF:**
- Earned but unpaid salary (days worked in final month)
- Leave encashment (earned leave balance × daily rate)
- Gratuity (if service > 5 years: 15/26 × last basic × years served)
- Recoveries: outstanding loans, asset damage, advance salary
- Statutory deductions on FnF payout (TDS on gratuity above ₹20L exempt)

**Build:**
- [ ] `FnFCalculationService.calculate(exitId)`:
  ```java
  FnFSettlement {
    earnedSalary, leaveEncashment, gratuity,
    bonus (pro-rata), deductions (loans, advances),
    netPayable, taxDeductible
  }
  ```
- [ ] `GET /api/v1/exit/{exitId}/fnf-preview` — editable calculation breakdown
- [ ] `POST /api/v1/exit/{exitId}/fnf-approve` — lock and trigger payment
- [ ] PDF FnF letter generation
- [ ] Frontend FnF page in offboarding workflow: shows line-by-line breakdown, allows HR adjustment before approval

### 7.2 Exit Interview Workflow (Days 5-6)
- [ ] Configurable exit questionnaire (HR admin builds template)
- [ ] Employee fills via self-service link (separate from login — token-based)
- [ ] Anonymized aggregate analytics: top reasons for leaving, satisfaction scores

### 7.3 Preboarding Portal Polish (Days 7-8)
- [ ] Candidate portal (pre-login): `/app/preboarding/[token]/page.tsx`
  - Upload required documents (Aadhaar, PAN, degree, experience letters)
  - Fill personal details
  - View welcome message + first-day instructions
- [ ] HR sees completion status per candidate
- [ ] Auto-creates employee record on day-1 if all documents collected

---

## Sprint 8: Security Hardening (OWASP Sweep)

**Goal:** Make the platform production-secure. P1 backlog item. Run a systematic sweep.

### 8.1 OWASP Top 10 Audit

| Risk | Where to check | Fix |
|------|---------------|-----|
| A01 Broken Access Control | All controllers — missing `@PreAuthorize` or `@RequiresPermission` | Add guards to any unprotected endpoint |
| A02 Cryptographic Failures | JWT secret key strength, bcrypt rounds | Ensure 256-bit secret, bcrypt cost ≥12 |
| A03 Injection | JPQL queries in repositories — any string concatenation? | Force parameterized queries everywhere |
| A04 Insecure Design | File upload — validate MIME type server-side, not just extension | Use Apache Tika for content detection |
| A05 Security Misconfiguration | Spring Actuator endpoints exposed? | Lock `/actuator` behind auth or internal network only |
| A06 Vulnerable Components | `mvn dependency:check` with OWASP NVD | Upgrade any CVE-flagged deps |
| A07 Auth Failures | JWT `none` algorithm check, token binding | Reject `alg:none` in JwtTokenProvider |
| A08 Software Integrity | Dockerfile — pinned base image digests? | Use `eclipse-temurin:21@sha256:...` |
| A09 Logging Failures | No sensitive data (PAN, Aadhaar) in logs | Add log sanitizer for PII fields |
| A10 SSRF | Google Drive / Slack integrations — validate URLs | Allowlist external domains |

### 8.2 Frontend Security Hardening
- [ ] Validate all user inputs client-side with Zod (already partial — complete coverage)
- [ ] CSP headers via `next.config.js` (`Content-Security-Policy`)
- [ ] No secrets in client bundle (`NEXT_PUBLIC_` only for truly public values)
- [ ] Rate limiting on auth pages (already Bucket4j on backend — add frontend feedback)

### 8.3 Multi-tenant Penetration Test
- [ ] Create script that authenticates as tenant A, attempts to access tenant B's resources
- [ ] Verify every controller has tenant filter in query
- [ ] Verify file uploads namespace by tenant in MinIO

---

## Sprint 9: Performance Optimization + Mobile

### 9.1 Database Query Optimization (Days 1-3)
- [ ] Run `EXPLAIN ANALYZE` on the 10 slowest queries (attendance monthly report, payroll run, org chart)
- [ ] Add missing composite indexes: `(tenant_id, created_at)`, `(tenant_id, employee_id, date)` for attendance
- [ ] Fix N+1 queries: `ProjectService` — fetch `projectManagerName` in a single JOIN, not a secondary lookup per row
- [ ] Paginate all list endpoints that don't yet have it

### 9.2 Redis Caching Strategy (Days 4-5)
- [ ] Cache: `leaveBalances` (by employee, invalidate on leave transaction), `holidayCalendar` (by tenant+year), `orgChart` (by tenant, invalidate on employee change)
- [ ] Use `@Cacheable` / `@CacheEvict` annotations
- [ ] Set TTLs: leave balances = 5min, holidays = 24hr, org chart = 1hr

### 9.3 Mobile Responsiveness (Days 6-8)
Priority screens on mobile (most-used by employees):
- [ ] Home / dashboard — clock-in button must be thumb-friendly
- [ ] Leave apply form
- [ ] Attendance regularization form
- [ ] Payslip viewer
- [ ] Helpdesk ticket form

Test matrix: iPhone 13 (390px), Pixel 5 (393px), iPad Pro (1024px)
Use Playwright mobile viewport tests.

### 9.4 Frontend Bundle Optimization (Day 9)
- [ ] `next build --analyze` — identify largest chunks
- [ ] Lazy-load heavy pages: Gantt chart, Org chart, Reports
- [ ] Optimize images: use `next/image` everywhere
- [ ] Remove unused Mantine components from bundle

---

## Sprint 10: Launch Prep

### 10.1 Demo Tenant Setup (Days 1-2)
Create a rich seed dataset for `demo.nuaura.in`:
- 50 employees across 5 departments
- 3 months of attendance data
- 2 completed payroll runs
- Active projects with allocations
- Open recruitment positions
- Training courses in progress
- Performance review in calibration stage

### 10.2 E2E Test Coverage for New Features (Days 3-5)
New test specs needed:
- `resource-allocation.spec.ts`
- `recruitment-pipeline.spec.ts` + `offer-sign.spec.ts`
- `performance-review-cycle.spec.ts`
- `payroll-statutory.spec.ts`
- `lms-quiz.spec.ts` + `lms-certificate.spec.ts`
- `reports-builder.spec.ts`
- `fnf-settlement.spec.ts`

Target: 200+ total E2E specs (up from 140).

### 10.3 Documentation (Days 6-7)
- [ ] Update Swagger for all new endpoints
- [ ] Update `IMPLEMENTATION_STATUS.md`
- [ ] User guide PDFs for: HR Admin, Manager, Employee
- [ ] API changelog for sprint changes

### 10.4 Deployment Validation (Days 8-9)
- [ ] Full Kubernetes deployment to staging
- [ ] Load test: 100 concurrent users on payroll run endpoint (using k6)
- [ ] Backup/restore drill
- [ ] Monitoring dashboards verified (Prometheus metrics flowing to Grafana)

### 10.5 Go-Live Checklist (Day 10)
- [ ] SSL certificate configured
- [ ] Environment variables audit (no dev secrets in prod)
- [ ] Rate limits tuned for expected load
- [ ] Error tracking (Sentry or similar) wired
- [ ] Support email / helpdesk ready

---

## Architecture Decisions Required

These need product/business decisions before coding starts:

### AD-1: E-Signature Strategy
**Options:**
1. **Internal** (current path) — canvas-based signature, PDF stamping, self-hosted
   - Pros: No cost, no vendor dependency, fast to build
   - Cons: Limited legal weight in some jurisdictions, no audit certificate
2. **DocuSign / DigiSign Integration** — paid SaaS, legally binding, audit trail
   - Pros: Legal validity, trusted by enterprises
   - Cons: Per-signature cost, integration complexity
3. **Aadhaar eSign** — India-specific, legally binding, low cost
   - Pros: Legally binding under IT Act 2000, very India-appropriate
   - Cons: Requires Aadhaar API partnership

**Recommendation:** Sprint 2 builds internal first (fast). Add DigiSign wrapper in Sprint 8 as an optional integration.

---

### AD-2: AI Features Scope
**The code has `AIRecruitmentController` and `AIRecruitmentService` but no implementation details visible.** Decision needed:
1. Use Claude API (Anthropic) — for resume parsing, JD generation, candidate scoring
2. Use OpenAI — GPT-4o for same
3. Use local/cheaper model — cost optimization

**Recommendation:** Claude API via Anthropic SDK for all AI features. Add `ENABLE_AI_RECRUITMENT` feature flag.

---

### AD-3: Payroll Statutory Scope
Statutory compliance is **state/country-specific and legally risky**. Options:
1. **Build in-house** — full PF/ESI/TDS engine (Sprint 4 plan)
2. **Integrate Greytip/Razorpay Payroll** — outsource calculation, keep UI
3. **Configuration-based** — HR inputs the statutory amounts manually, system just records

**Recommendation:** Build PF/ESI/PT in-house (high standardization). For TDS, allow manual override with calculation suggestion. Form 16 is a must-have but complex — build after core works.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Payroll statutory bugs (wrong tax) | High | Critical | Audit with CA, add "calculation disclaimer" in V1, allow manual override |
| E-sign legal validity | Medium | High | Ship internal first, gate enterprise customers on DigiSign |
| Project 500 error surfaces in prod | High | High | Fix in Sprint 1 Day 1 — non-negotiable |
| Backend test compilation blocks CI | Medium | Medium | Sprint 1 Day 2 — parallel fix |
| LMS video storage cost | Low | Medium | Use MinIO presigned URLs, client-side video (YouTube embed option) |
| Performance on large tenants (1000+ employees) | Medium | High | Add load tests in Sprint 9 before launch |
| Multi-tenant data leakage | Low | Critical | Sprint 8 penetration test as verification |

---

## Success Metrics (Definition of Done for Launch)

| Metric | Target |
|--------|--------|
| Keka parity | ≥90% |
| E2E test specs | 200+ |
| Backend unit test coverage | ≥70% line |
| P0 backlog items | 0 open |
| P1 backlog items | ≤3 open |
| OWASP A01-A10 | All addressed |
| Lighthouse performance score | ≥85 on desktop |
| API response P95 latency | <500ms for list endpoints |
| Monthly payslip generation | <30 seconds for 100 employees |
| Multi-tenant isolation | Verified by pen test |

---

## Immediate Next Actions (This Week)

```
Day 1 (Today):
  ├─ Fix project list 500 error (investigate ProjectService null FK lookup)
  ├─ Fix backend test compilation errors
  └─ Map out allocation API endpoints to build

Day 2-3:
  ├─ Build allocation backend APIs (summary, availability, reallocate)
  └─ Build AllocateEmployeeModal component

Day 4-5:
  ├─ Build Resource Pool view page
  └─ Build Capacity Timeline view

Day 6-7:
  ├─ Wire frontend services to allocation APIs
  ├─ Over-allocation detection and warnings
  └─ E2E test for allocation

Day 8-10:
  ├─ Pivot to Sprint 2: ATS Pipeline Kanban board
  └─ Start offer letter template variables
```

---

*This plan is a living document. Update sprint contents as discoveries emerge.*
*See [BACKLOG.md](./BACKLOG.md) for original prioritized backlog.*
*See [KEKA_PARITY_ROADMAP.md](./KEKA_PARITY_ROADMAP.md) for feature-by-feature Keka comparison.*
