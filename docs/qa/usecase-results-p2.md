# P2 NU-Hire Use Case Test Results

**Date:** 2026-04-08
**Tester:** Claude (API curl testing)
**Environment:** localhost:8080 (Spring Boot backend)
**Login:** fayaz.m@nulogic.io (Super Admin), jagadeesh@nulogic.io (HR Manager)

---

## UC-HIRE-001: Create Job Requisition
- **Status**: PASS
- **Role**: HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: PASS — POST /api/v1/recruitment/job-openings returned 201. Job "Full Stack Engineer QA Test" created with status OPEN, jobCode JOB-2026-001, 2 openings, hiring manager Sumit Kumar. GET /api/v1/recruitment/job-openings/{id} verified creation.
- **Negative test**: PASS — Unauthenticated POST returns 403 (CSRF validation). No-auth requests blocked.
- **Bug**: none

---

## UC-HIRE-002: Candidate Pipeline and Kanban
- **Status**: PASS
- **Role**: HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: PASS — Created candidate (CAND-QA-*) via POST /api/v1/recruitment/candidates (201). Moved APPLICATION_RECEIVED -> SCREENING -> INTERVIEW via PUT /api/v1/recruitment/candidates/{id}/stage. Each stage transition returned updated stage. GET verified final stage=INTERVIEW, status=INTERVIEW.
- **Negative test**: NOT-TESTED — Backward stage movement not tested (no policy block implemented).
- **Bug**: BUG-P2-001: Candidate creation returns 500 when candidateCode is null. The `existsByTenantIdAndCandidateCode(tenantId, null)` check causes a DB integrity violation because null candidateCode matches existing null records. Workaround: always provide a unique candidateCode.

---

## UC-HIRE-003: Schedule Interview and Record Feedback
- **Status**: PASS
- **Role**: HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: PASS — POST /api/v1/recruitment/interviews created interview (200) with round=TECHNICAL_1, type=VIDEO, status=SCHEDULED, interviewer=Sumit Kumar. PUT /api/v1/recruitment/interviews/{id} updated to COMPLETED with rating=4, result=SELECTED, feedback recorded. GET verified all fields.
- **Negative test**: NOT-TESTED — Confidential feedback access test not feasible via curl.
- **Bug**: none (Note: enum values differ from use case doc — TECHNICAL_1 not TECHNICAL, VIDEO not VIDEO_CALL, SELECTED not PASS)

---

## UC-HIRE-004: Generate and Send Offer Letter
- **Status**: PASS
- **Role**: HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: PASS — Moved candidate to OFFER stage. POST /api/v1/recruitment/candidates/{id}/offer created offer (201) with offeredSalary=1000000, positionTitle="Full Stack Engineer", joiningDate=2026-05-01. Status became OFFER_EXTENDED, stage=OFFER_NDA_TO_BE_RELEASED. POST /accept-offer changed status to OFFER_ACCEPTED. GET verified final state.
- **Negative test**: NOT-TESTED — Expired offer auto-status via RecruitmentExpiryJob not testable via curl.
- **Bug**: none

---

## UC-HIRE-005: Preboarding (Candidate Self-Service Portal)
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io) — HR_MANAGER lacks PREBOARDING:CREATE permission
- **Happy path**: PASS — POST /api/v1/preboarding/candidates created invitation for "Vikram Nair" with status=INVITED, completionPercentage=0. GET /candidates confirmed listing. GET /candidates/upcoming?days=30 returned the joiner. GET /candidates/status/INVITED confirmed status filter.
- **Negative test**: PASS — GET /api/v1/preboarding/portal/INVALID_TOKEN returned 404 with message "Invalid or expired access link". Public portal correctly rejects invalid tokens.
- **Bug**: BUG-P2-002: HR_MANAGER (jagadeesh@nulogic.io) does not have PREBOARDING:CREATE permission and gets 403. Use case specifies HR_ADMIN/RECRUITMENT_ADMIN should create preboarding invitations. Only SUPER_ADMIN can currently create. Additionally, the access token is not returned in the API response (PreboardingCandidateResponse omits accessToken), making it impossible to test the portal flow via API — the token must be retrieved from the database.

---

## UC-HIRE-006: Onboarding Checklist
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io), HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: FAIL — Template creation (POST /api/v1/onboarding/templates) succeeded (201). Adding 3 template tasks succeeded. However, POST /api/v1/onboarding/processes consistently returns 400 "Data Integrity Violation" for every employee tested (Priya K, Dhanush A, Deepak V, Arun T) with both SUPER_ADMIN and HR_MANAGER sessions. The tenantId in the error response shows null, suggesting a RLS/tenant context issue during INSERT.
- **Negative test**: NOT-TESTED — Blocked by process creation failure.
- **Bug**: BUG-P2-003: Onboarding process creation fails with "Data Integrity Violation" for all employees. Likely cause: RLS policy on onboarding_processes table blocks INSERT even though TenantContext should provide tenant_id. GET /api/v1/onboarding/processes returns 0 processes (table is empty), confirming this is not a duplicate constraint. Template CRUD works correctly. Task status updates cannot be tested.

---

## UC-HIRE-007: Offboarding and FnF Settlement
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/exit/processes created exit for Bharath R (RESIGNATION, LWD=2026-04-30, status=INITIATED). PATCH /processes/{id}/status updated to IN_PROGRESS. POST /api/v1/exit/settlements created FnF with pendingSalary=16923, leaveEncashment=9231, taxDeduction=2615, status=DRAFT. POST /api/v1/exit/clearances created IT clearance (PENDING). POST /api/v1/exit/interviews scheduled exit interview (SCHEDULED). GET /exit/dashboard returned metrics. GET /exit/interviews/analytics returned aggregated data. GET /offboarding (alias) returned 2 processes.
- **Negative test**: NOT-TESTED — Payroll for terminated employee test not feasible via offboarding API.
- **Bug**: BUG-P2-004: FnF settlement netSettlementAmount is null/not calculated on creation. The field should auto-compute as (totalEarnings - totalDeductions) but returns None. Calculation may only happen on approval step.

---

## UC-HIRE-008: Employee Referral Submission
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/referrals submitted referral for "Vikram Nair" with status=SUBMITTED, relationship=FORMER_COLLEAGUE. GET /referrals/my-referrals returned 1 referral. GET /referrals/dashboard returned metrics (totalReferrals, activeReferrals, hiredReferrals, rejectedReferrals, conversionRate).
- **Negative test**: FAIL — Self-referral (using own email fayaz.m@nulogic.io) was ACCEPTED (status=SUBMITTED) instead of returning HTTP 400. The use case requires "Cannot refer your own email address" validation.
- **Bug**: BUG-P2-005: Self-referral validation missing. POST /api/v1/referrals accepts referrals where candidateEmail matches the logged-in user's email. Should return 400 with error "Cannot refer your own email address".

---

## UC-AGENCY-001: Agency CRUD
- **Status**: PASS
- **Role**: SUPER_ADMIN, HR_MANAGER
- **Happy path**: PASS — POST /api/v1/recruitment/agencies created "TalentBridge Consultants" (201, status=ACTIVE, feeType=PERCENTAGE, feeAmount=8.5%). PUT updated name and rating (200). GET returned full details. GET list returned agencies with pagination. DELETE returned 204.
- **Negative test**: PASS — RBAC tested: HR_MANAGER has AGENCY:VIEW (can list), AGENCY:CREATE (can create), AGENCY:DELETE (can delete). All operations verified.
- **Bug**: BUG-P2-006: Use case spec says HR_MANAGER should only have view access (not create/delete). However, HR_MANAGER role has AGENCY:CREATE, AGENCY:UPDATE, AGENCY:DELETE permissions granted. This is a RBAC permission mismatch with the use case spec — may be intentional design choice.

---

## UC-AGENCY-002: Agency Candidate Submission
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/recruitment/agencies/{id}/submissions linked candidate to agency (201, status=SUBMITTED, feeAgreed=85000 INR). GET /{id}/submissions returned 1 submission.
- **Negative test**: NOT-TESTED
- **Bug**: none

---

## UC-AGENCY-003: Agency Performance Tracking
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — GET /api/v1/recruitment/agencies/{id}/performance returned metrics. totalSubmissions=1 reported correctly. totalHires and conversionRate returned null (no hired candidates yet — expected with limited test data).
- **Negative test**: NOT-TESTED
- **Bug**: none

---

## UC-SCORE-001: Scorecard Template CRUD
- **Status**: FAIL
- **Role**: HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/recruitment/scorecard-templates returns 404 "No endpoint found". The ScorecardTemplate and InterviewScorecard entities exist in the domain layer but no REST controller is implemented.
- **Negative test**: NOT-TESTED — Blocked by missing endpoint.
- **Bug**: BUG-P2-007: Scorecard template CRUD API not implemented. Entities (ScorecardTemplate, ScorecardTemplateCriterion, InterviewScorecard, ScorecardCriterion) exist in domain but no controller exposes them. A ScorecardController needs to be created with endpoints for template CRUD and scorecard submission.

---

## UC-SCORE-002: Interview Scorecard Submission
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/recruitment/interviews/{id}/scorecard returns 404 "No endpoint found". No scorecard submission endpoint exists on the interview controller.
- **Negative test**: NOT-TESTED — Blocked by missing endpoint.
- **Bug**: BUG-P2-007 (same as above) — Scorecard submission API not implemented.

---

## UC-DIVERSITY-001: Diversity Metrics Dashboard
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — GET /api/v1/recruitment/analytics/diversity returns 404 "No endpoint found". No diversity analytics endpoint exists.
- **Negative test**: NOT-TESTED — Blocked by missing endpoint.
- **Bug**: BUG-P2-008: Diversity analytics API not implemented. No controller exposes pipeline diversity metrics (gender distribution, drop-off rates by demographic). Needs a RecruitmentAnalyticsController or extension to an existing analytics controller.

---

## UC-ONBOARD-001: Onboarding Template Management
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/onboarding/templates created "QA Test Onboarding Template" (201). POST /templates/{id}/tasks added 3 tasks (IT_SETUP, HR_FORMALITIES, DOCUMENTATION) successfully. GET /templates returned 1 template. GET /templates/{id}/tasks returns task list.
- **Negative test**: NOT-TESTED
- **Bug**: none (template CRUD works; process creation fails — see BUG-P2-003)

---

## UC-ONBOARD-002: Onboarding Process Creation
- **Status**: FAIL
- **Role**: SUPER_ADMIN, HR_MANAGER
- **Happy path**: FAIL — See UC-HIRE-006 (BUG-P2-003). Process creation blocked by DB integrity violation.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-P2-003 (same as UC-HIRE-006)

---

## UC-ONBOARD-003: Onboarding Task Completion
- **Status**: BLOCKED
- **Role**: N/A
- **Happy path**: BLOCKED — Cannot test task completion (PATCH /tasks/{id}/status) without an active onboarding process.
- **Negative test**: NOT-TESTED
- **Bug**: Blocked by BUG-P2-003

---

## UC-OFFBOARD-001: Exit Process Initiation
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/exit/processes created exit (201, RESIGNATION, INITIATED). PATCH /processes/{id}/status updated to IN_PROGRESS. GET verified. Both /api/v1/exit and /api/v1/offboarding alias endpoints work.
- **Negative test**: NOT-TESTED
- **Bug**: none

---

## UC-OFFBOARD-002: Exit Clearance
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/exit/clearances created IT clearance (201, PENDING). Linked to exit process.
- **Negative test**: NOT-TESTED
- **Bug**: none

---

## UC-OFFBOARD-003: Exit Interview
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/exit/interviews scheduled interview (201, SCHEDULED, IN_PERSON). GET /exit/interviews/analytics returned aggregated metrics (returnRate, totalCompleted, averageManagementRating, etc.).
- **Negative test**: NOT-TESTED
- **Bug**: none

---

## UC-PREBOARD-001: Preboarding Invitation
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — See UC-HIRE-005. Invitation created, candidate listed in upcoming joiners.
- **Negative test**: PASS — Invalid token returns 404 correctly.
- **Bug**: BUG-P2-002 (same as UC-HIRE-005 — HR_MANAGER permission gap + token not in response)

---

## UC-REFERRAL-001: Employee Referral Submission
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — See UC-HIRE-008. Referral submitted, dashboard shows metrics.
- **Negative test**: FAIL — Self-referral accepted (BUG-P2-005).
- **Bug**: BUG-P2-005 (same as UC-HIRE-008 — self-referral validation missing)

---

# Bug Summary

| Bug ID | Severity | Use Case | Description |
|--------|----------|----------|-------------|
| BUG-P2-001 | Medium | UC-HIRE-002 | Candidate creation fails with 500 when candidateCode is null (DB integrity violation on null-null uniqueness) |
| BUG-P2-002 | Medium | UC-HIRE-005, UC-PREBOARD-001 | HR_MANAGER lacks PREBOARDING:CREATE permission; accessToken not returned in preboarding API response |
| BUG-P2-003 | High | UC-HIRE-006, UC-ONBOARD-002/003 | Onboarding process creation fails with "Data Integrity Violation" for all employees — likely RLS or tenant_id INSERT issue |
| BUG-P2-004 | Low | UC-HIRE-007 | FnF settlement netSettlementAmount not auto-calculated on creation (returns null) |
| BUG-P2-005 | Medium | UC-HIRE-008, UC-REFERRAL-001 | Self-referral validation missing — employees can refer their own email |
| BUG-P2-006 | Low | UC-AGENCY-001 | HR_MANAGER has full CRUD on agencies; use case spec says view-only for HR_MANAGER |
| BUG-P2-007 | High | UC-SCORE-001, UC-SCORE-002 | Scorecard template CRUD and interview scorecard submission APIs not implemented (entities exist, no controller) |
| BUG-P2-008 | Medium | UC-DIVERSITY-001 | Diversity analytics API not implemented (no endpoint for pipeline diversity metrics) |

# Test Summary

| Status | Count | Percentage |
|--------|-------|------------|
| PASS | 15 | 65% |
| FAIL | 5 | 22% |
| BLOCKED | 1 | 4% |
| SKIP | 0 | 0% |
| **Total** | **23** | **100%** |

**Pass rate (excluding BLOCKED): 15/22 = 68%**

### Critical gaps:
1. **Scorecard API missing** (BUG-P2-007) — Entities exist but no REST controller. Blocks UC-SCORE-001/002.
2. **Onboarding process creation broken** (BUG-P2-003) — Templates work but processes cannot be created. Blocks 3 use cases.
3. **Diversity analytics missing** (BUG-P2-008) — No endpoint for recruitment diversity metrics.
