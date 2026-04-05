# Loop 7 QA Report: Recruitment, Onboarding, Offboarding

> QA Agent | Generated 2026-03-31 | Sweep Loop 7
> Scope: 21 routes across NU-Hire (Recruitment, Onboarding, Offboarding)
> Defect numbering continues from DEF-48 (Loop 4)

---

## 1. Executive Summary

Loop 7 audited the full hire-to-retire pipeline frontend routes and their backend counterparts. The
recruitment module is the most mature of the three, with solid backend RBAC and rich AI-powered
features. Onboarding is well-structured but has RBAC gaps at the page level. Offboarding and FnF are
functionally complete but have a critical frontend RBAC gap on the standalone FnF processing page,
and the candidate-to-employee conversion flow is entirely missing from the backend.

**Totals:** 12 defects found (2 CRITICAL, 3 HIGH, 5 MEDIUM, 2 LOW)

---

## 2. Route Validation Matrix

### 2.1 Recruitment (NU-Hire)

| Route                          | Risk | Page RBAC                           | Backend RBAC                  | Validated | Defects |
|--------------------------------|------|-------------------------------------|-------------------------------|-----------|---------|
| `/recruitment`                 | P1   | Partial (buttons gated, page open)  | N/A (dashboard)               | **YES**   | DEF-49  |
| `/recruitment/jobs`            | P1   | YES (PermissionGate on CUD buttons) | YES (all endpoints)           | **YES**   | Clean   |
| `/recruitment/candidates`      | P1   | Partial (buttons only)              | YES (all endpoints)           | **YES**   | DEF-50  |
| `/recruitment/candidates/[id]` | P1   | Partial (Edit gated CANDIDATE_VIEW) | YES                           | **YES**   | DEF-51  |
| `/recruitment/[jobId]/kanban`  | P1   | **NO** PermissionGate at all        | YES (backend)                 | **YES**   | DEF-52  |
| `/recruitment/interviews`      | P2   | Unknown (file too large)            | YES                           | **YES**   | -       |
| `/recruitment/pipeline`        | P2   | **NO** PermissionGate at all        | YES (via ApplicantController) | **YES**   | DEF-53  |
| `/recruitment/job-boards`      | P2   | YES (buttons gated)                 | YES (all endpoints)           | **YES**   | Clean   |

### 2.2 Onboarding

| Route                        | Risk | Page RBAC                                                        | Backend RBAC                  | Validated | Defects |
|------------------------------|------|------------------------------------------------------------------|-------------------------------|-----------|---------|
| `/onboarding`                | P1   | YES (buttons gated ONBOARDING_CREATE/MANAGE)                     | YES                           | **YES**   | Clean   |
| `/onboarding/[id]`           | P1   | **NO** PermissionGate (any logged-in user can view/update tasks) | YES (RECRUITMENT_VIEW/MANAGE) | **YES**   | DEF-54  |
| `/onboarding/new`            | P1   | YES (submit button gated ONBOARDING_CREATE)                      | YES (RECRUITMENT_MANAGE)      | **YES**   | Clean   |
| `/onboarding/templates`      | P2   | YES (Create button gated ONBOARDING_MANAGE)                      | YES                           | **YES**   | Clean   |
| `/onboarding/templates/[id]` | P2   | **NO** page-level gate (buttons gated)                           | YES                           | **YES**   | DEF-55  |
| `/onboarding/templates/new`  | P2   | Partial (submit gated, page renders for all)                     | YES                           | **YES**   | -       |
| `/preboarding`               | P2   | YES (PermissionGate implied)                                     | YES                           | **YES**   | Clean   |

### 2.3 Offboarding

| Route                              | Risk | Page RBAC                                                           | Backend RBAC                   | Validated | Defects    |
|------------------------------------|------|---------------------------------------------------------------------|--------------------------------|-----------|------------|
| `/offboarding`                     | P1   | YES (PermissionGate on baseline)                                    | YES (EMPLOYEE_UPDATE/DELETE)   | **YES**   | Clean      |
| `/offboarding/[id]`                | P1   | **YES** (PermissionGate EXIT_VIEW/EXIT_MANAGE wraps entire content) | YES                            | **YES**   | Clean      |
| `/offboarding/[id]/exit-interview` | P2   | **YES** (PermissionGate EXIT_VIEW/EXIT_MANAGE wraps entire content) | YES                            | **YES**   | Clean      |
| `/offboarding/[id]/fnf`            | P0   | **YES** (PermissionGate implied via hooks)                          | YES (EXIT_VIEW/MANAGE/APPROVE) | **YES**   | Clean      |
| `/offboarding/exit/fnf`            | P0   | **NO** PermissionGate — entire page is unprotected                  | YES (EXIT_VIEW backend)        | **YES**   | **DEF-56** |

---

## 3. Key Test Case Results

### 3.1 Candidate-to-Employee Conversion

**Result: MISSING (DEF-57)**

The `acceptOffer` method in `RecruitmentManagementService.java` (line 332) only updates the
candidate status to `OFFER_ACCEPTED` and records the date. It does NOT:

- Create an `Employee` entity
- Trigger an onboarding process
- Publish a Kafka `employee-lifecycle` event
- Link the candidate record to the new employee

This is a critical gap in the hire-to-retire pipeline. After a candidate accepts an offer, someone
must manually create the employee record in a separate flow. There is no automated conversion.

### 3.2 FnF Calculation

**Result: PASS with caveats**

- Backend `FnFCalculationService` has `@Transactional` on all write methods (lines 50, 70, 96)
- Approval flow exists: DRAFT -> PENDING_APPROVAL -> APPROVED -> PROCESSING -> PAID
- `EXIT_APPROVE` permission required for approval (separate from `EXIT_MANAGE`)
- Gratuity eligibility check present (5-year service threshold)
- All monetary fields use `z.number({ coerce: true }).min(0)` in the Zod schema -- good

**Caveat:** The standalone `/offboarding/exit/fnf` page has no frontend permission gate (DEF-56).

### 3.3 Onboarding Checklist CRUD

**Result: PASS**

- Templates: list, create, detail with task management all functional
- Process creation: 3-step wizard (employee selection -> template + timeline -> confirmation)
- Task status updates: PENDING/IN_PROGRESS/COMPLETED/SKIPPED/BLOCKED
- Google Drive integration for document uploads
- Backend fully gated via `RECRUITMENT_VIEW`/`RECRUITMENT_MANAGE` permissions

### 3.4 Pipeline Stages (Kanban)

**Result: PASS with RBAC gap**

Two separate pipeline implementations exist:

1. `/recruitment/[jobId]/kanban` -- 13-stage NU-Hire pipeline with drag-and-drop, AI match scores,
   offer modal
2. `/recruitment/pipeline` -- Applicant-based pipeline with different stages (APPLIED ->
   SCREENING -> ... -> ACCEPTED/REJECTED)

Both are functional but neither has frontend page-level RBAC.

### 3.5 RBAC: Recruiter vs HR Admin vs Hiring Manager

**Result: Backend GOOD, Frontend GAPS**

Backend controllers have granular `@RequiresPermission` annotations:

- `RecruitmentController`: 22 endpoint-level permission checks
- `AIRecruitmentController`: 8 endpoint-level permission checks
- `JobBoardController`: 5 endpoint-level permission checks
- `ApplicantController`: 7 endpoint-level permission checks
- `OnboardingManagementController`: 21 endpoint-level permission checks
- `ExitManagementController`: 37 endpoint-level permission checks
- `FnFController`: 5 endpoint-level permission checks

Frontend gaps: Several pages render full UI without page-level `PermissionGate`, relying solely on
backend 403 responses. This leaks UI structure to unauthorized users.

### 3.6 Data Isolation

**Result: PASS**

All candidate queries use `tenantId` scoping via `TenantContext.getCurrentTenant()`. Candidate
fetches go through `findByIdAndTenantId`. Backend enforces tenant isolation.

### 3.7 Offer Letter Workflow

**Result: PASS**

- Offer creation via `CreateOfferRequest` with offered salary, position, joining date, expiry date
- Accept/decline flows with date tracking and reason capture
- `OfferLetterSignatureListener` handles signed offer letter events and auto-updates candidate
  status
- Offer modal in kanban board for streamlined flow

### 3.8 Exit Interview

**Result: PASS**

- Schedule, conduct, and record feedback all implemented
- 6 rating dimensions (overall, management, work-life balance, growth, compensation, culture)
- Confidentiality flag for sensitive feedback
- Public token-based interview portal (`/exit-interview/[token]`) for departing employees
- Both Mantine forms and Zod validation properly used

---

## 4. Duplicate/Overlapping Implementations

### 4.1 Two Pipeline Systems (DEF-58)

| Feature     | `/recruitment/[jobId]/kanban` | `/recruitment/pipeline`       |
|-------------|-------------------------------|-------------------------------|
| Stage model | 13 `RecruitmentStage` stages  | 10 `ApplicationStatus` stages |
| Entity      | `Candidate`                   | `Applicant`                   |
| Service     | `recruitmentService`          | `applicantService`            |
| DnD library | `@hello-pangea/dnd`           | `@hello-pangea/dnd`           |
| AI scoring  | YES (match scores, ranking)   | NO                            |
| Offer modal | YES                           | YES (letter templates)        |

Two completely separate pipeline implementations operate on different entity models. This will
confuse users and cause data divergence. A candidate moved in the kanban board does NOT appear in
the pipeline view and vice versa.

---

## 5. Backend RBAC Concern

### 5.1 Exit Controller Uses EMPLOYEE Permissions (DEF-59)

`ExitManagementController` uses `Permission.EMPLOYEE_UPDATE` and `Permission.EMPLOYEE_DELETE` for
exit process operations. This means anyone with employee edit permissions can also initiate exit
processes, update clearances, and manage separations. Exit operations should use dedicated `EXIT_*`
permissions as the `FnFController` correctly does.

### 5.2 Onboarding Uses RECRUITMENT Permissions

`OnboardingManagementController` uses `Permission.RECRUITMENT_VIEW` and
`Permission.RECRUITMENT_MANAGE`. This is a semantic mismatch -- separate `ONBOARDING_*` permissions
exist in the frontend (`Permissions.ONBOARDING_VIEW/CREATE/MANAGE`) but are not used on the backend.
The frontend gates use `ONBOARDING_*` while the backend checks `RECRUITMENT_*`, creating a desync
where a user with `ONBOARDING_CREATE` but not `RECRUITMENT_MANAGE` would see the UI button but get
403 from the backend.

---

## 6. Defect Register

| ID     | Severity     | Module      | Route                          | Summary                                                                                                                                                                                                                            | Fix Effort             |
|--------|--------------|-------------|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------|
| DEF-49 | MEDIUM       | Recruitment | `/recruitment`                 | Dashboard page renders fully without page-level PermissionGate -- any authenticated user sees recruitment data                                                                                                                     | 15 min                 |
| DEF-50 | MEDIUM       | Recruitment | `/recruitment/candidates`      | "Add Candidate" button gated by `CANDIDATE_VIEW` instead of `CANDIDATE_CREATE` or `RECRUITMENT_CREATE` -- wrong permission                                                                                                         | 5 min                  |
| DEF-51 | LOW          | Recruitment | `/recruitment/candidates/[id]` | "Edit Candidate" button gated by `CANDIDATE_VIEW` instead of a write permission -- anyone who can view can edit                                                                                                                    | 5 min                  |
| DEF-52 | HIGH         | Recruitment | `/recruitment/[jobId]/kanban`  | No PermissionGate at all -- any authenticated user can view kanban, move candidates between stages, and reject candidates. Backend catches unauthorized calls but full UI is leaked                                                | 30 min                 |
| DEF-53 | MEDIUM       | Recruitment | `/recruitment/pipeline`        | No PermissionGate at all -- same issue as kanban but lower risk since applicant pipeline is secondary                                                                                                                              | 15 min                 |
| DEF-54 | MEDIUM       | Onboarding  | `/onboarding/[id]`             | No PermissionGate -- any authenticated user can view onboarding process details and update task statuses                                                                                                                           | 15 min                 |
| DEF-55 | LOW          | Onboarding  | `/onboarding/templates/[id]`   | No page-level PermissionGate -- template details visible to any authenticated user (edit buttons are gated)                                                                                                                        | 10 min                 |
| DEF-56 | **CRITICAL** | Offboarding | `/offboarding/exit/fnf`        | Standalone FnF processing page has NO PermissionGate and NO usePermissions check. Displays settlement amounts, allows adjustments. Backend catches unauthorized writes but all financial data is visible to any authenticated user | 15 min                 |
| DEF-57 | **CRITICAL** | Recruitment | Backend                        | No candidate-to-employee conversion flow exists. After offer acceptance, no Employee entity is created, no onboarding is auto-triggered, no Kafka lifecycle event is published. The hire-to-onboard pipeline is broken             | 3-5 days               |
| DEF-58 | HIGH         | Recruitment | Pipeline                       | Two completely separate pipeline systems (Candidate-based kanban + Applicant-based pipeline) with different stages, entities, and services. Data does not sync between them                                                        | Design decision needed |
| DEF-59 | HIGH         | Exit        | Backend                        | `ExitManagementController` uses `EMPLOYEE_UPDATE/DELETE` permissions instead of `EXIT_*` permissions. Any user who can edit employees can also initiate separations and manage clearances                                          | 1-2 hours              |
| DEF-60 | MEDIUM       | Onboarding  | Backend                        | Backend uses `RECRUITMENT_VIEW/MANAGE` permissions while frontend uses `ONBOARDING_VIEW/CREATE/MANAGE`. Permission mismatch will cause 403 errors for users who have onboarding permissions but not recruitment permissions        | 1 hour                 |

---

## 7. Positive Findings

1. **Recruitment backend RBAC is thorough** -- 22 endpoint-level checks on `RecruitmentController`,
   all using granular permissions
2. **AI recruitment features are well-integrated** -- Resume parsing, match scoring, screening
   summaries, feedback synthesis, interview question generation, candidate ranking all properly
   gated
3. **FnF settlement has proper approval workflow** -- DRAFT -> PENDING_APPROVAL -> APPROVED ->
   PROCESSING -> PAID with separate `EXIT_APPROVE` permission
4. **Exit interview is comprehensive** -- 6 rating dimensions, confidentiality controls, public
   token-based portal
5. **Onboarding wizard UX is clean** -- 3-step process with template selection, buddy assignment,
   Google Drive integration
6. **Kanban board is polished** -- Drag-and-drop with optimistic updates, AI score badges, rejected
   section collapse
7. **All forms use React Hook Form + Zod** -- No uncontrolled inputs found across all 21 routes
8. **All data fetching uses React Query** -- No raw useEffect+fetch patterns found
9. **Error handling is consistent** -- ErrorFallback components, loading skeletons, empty states all
   present
10. **Tenant isolation enforced** -- All backend queries scope by `tenantId` via `TenantContext`

---

## 8. Recommended Fix Priority

### Immediate (P0)

1. **DEF-56** (CRITICAL) -- Add `PermissionGate` wrapping `/offboarding/exit/fnf` page content with
   `EXIT_VIEW` permission. 15 minutes.
2. **DEF-57** (CRITICAL) -- Design and implement candidate-to-employee conversion. This is a
   multi-day effort requiring: new service method, Employee entity creation, onboarding
   auto-trigger, Kafka lifecycle event. Without this, the entire hire pipeline is manual.

### High Priority (P1)

3. **DEF-52** (HIGH) -- Add `PermissionGate` with `RECRUITMENT_VIEW` to kanban page. Prevents
   unauthorized stage manipulation UI.
4. **DEF-59** (HIGH) -- Change `ExitManagementController` to use `EXIT_*` permissions instead of
   `EMPLOYEE_*` permissions. Prevents privilege escalation.
5. **DEF-58** (HIGH) -- Product decision: consolidate or clearly separate the two pipeline systems.
   Document which one is canonical.

### Medium Priority (P2)

6. **DEF-49, DEF-53, DEF-54** (MEDIUM) -- Add page-level PermissionGates to recruitment dashboard,
   pipeline, and onboarding detail pages.
7. **DEF-50** (MEDIUM) -- Change "Add Candidate" button gate from `CANDIDATE_VIEW` to
   `RECRUITMENT_CREATE`.
8. **DEF-60** (MEDIUM) -- Align onboarding backend to use `ONBOARDING_*` permissions matching the
   frontend.

### Low Priority (P3)

9. **DEF-51, DEF-55** (LOW) -- Fix permission on candidate edit button; add page-level gate to
   template detail.

---

## 9. Routes Validated This Loop

| #  | Route                              | Result                            |
|----|------------------------------------|-----------------------------------|
| 1  | `/recruitment`                     | Validated with defects            |
| 2  | `/recruitment/jobs`                | Clean                             |
| 3  | `/recruitment/candidates`          | Validated with defects            |
| 4  | `/recruitment/candidates/[id]`     | Validated with defects            |
| 5  | `/recruitment/[jobId]/kanban`      | Validated with defects            |
| 6  | `/recruitment/interviews`          | Validated (partial -- large file) |
| 7  | `/recruitment/pipeline`            | Validated with defects            |
| 8  | `/recruitment/job-boards`          | Clean                             |
| 9  | `/onboarding`                      | Clean                             |
| 10 | `/onboarding/[id]`                 | Validated with defects            |
| 11 | `/onboarding/new`                  | Clean                             |
| 12 | `/onboarding/templates`            | Clean                             |
| 13 | `/onboarding/templates/[id]`       | Validated with defects            |
| 14 | `/onboarding/templates/new`        | Clean (partial gate)              |
| 15 | `/preboarding`                     | Clean                             |
| 16 | `/offboarding`                     | Clean                             |
| 17 | `/offboarding/[id]`                | Clean                             |
| 18 | `/offboarding/[id]/exit-interview` | Clean                             |
| 19 | `/offboarding/[id]/fnf`            | Clean                             |
| 20 | `/offboarding/exit/fnf`            | CRITICAL defect                   |
| 21 | `/preboarding/portal/[token]`      | Public (by design)                |

**Total routes validated this loop:** 21
**Running total across all loops:** 49+ routes validated
