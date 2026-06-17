---
title: NU-Hire Endpoint Catalog — Per-Method
tags: [backend, api, endpoints, rest, catalog, nu-hire]
---

# NU-Hire Endpoint Catalog — Per-Method

> The per-method companion to [[Controller-Index]] and [[APIs]] for the [[Nu-Hire]] sub-app
> (recruitment, onboarding, exit, e-sign). Where [[APIs]] documents base paths and selective
> highlights, this note enumerates **every handler** of all 19 NU-Hire controllers: HTTP verb,
> full path (class base + method path), `@RequiresPermission`, and a short purpose. Paths and
> permissions are read directly from source (verified 2026-06-17). Public (unauthenticated)
> portals are flagged inline — careers, offers, preboarding portal, external e-sign, and exit
> interview.

## Counts

| Metric | Count |
|--------|-------|
| Controllers covered | **19** |
| Total live endpoints | **243** |

`RecruitmentManagementController.java.disabled` carries the `.disabled` extension, is excluded
from the build, and is **not** counted here.

| api package | Controllers | Endpoints |
|---|---|---|
| recruitment | 6 (`Agency`, `AIRecruitment`, `Applicant`, `JobBoard`, `Recruitment`, `Scorecard`) | 52 |
| onboarding | 1 | 19 |
| preboarding | 1 | 12 |
| probation | 1 | 19 |
| referral | 1 | 18 |
| exit | 3 (`ExitManagement`, `Offboarding`, `FnF`) | 48 |
| esignature | 1 | 18 |
| letter | 1 | 21 |
| publicapi | 2 (`PublicCareer`, `PublicOffer`) | 7 |
| contract | 2 (`Contract`, `ContractTemplate`) | 29 |
| **Total** | **19** | **243** |

> Permission column: `—` / `public` = no `@RequiresPermission` (unauthenticated portal).
> Multiple permissions in `{...}` mean the handler requires any one of the listed permissions.

---

### AgencyController

Base path: `/api/v1/recruitment/agencies`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/recruitment/agencies` | `AGENCY_CREATE` | Create recruitment agency |
| GET | `/api/v1/recruitment/agencies` | `AGENCY_VIEW` | List agencies (filtered) |
| GET | `/api/v1/recruitment/agencies/{id}` | `AGENCY_VIEW` | Get agency by id |
| PUT | `/api/v1/recruitment/agencies/{id}` | `AGENCY_UPDATE` | Update agency |
| DELETE | `/api/v1/recruitment/agencies/{id}` | `AGENCY_DELETE` | Delete agency |
| GET | `/api/v1/recruitment/agencies/{id}/submissions` | `AGENCY_VIEW` | List agency submissions |
| POST | `/api/v1/recruitment/agencies/{id}/submissions` | `AGENCY_MANAGE` | Submit candidate via agency |
| PUT | `/api/v1/recruitment/agencies/submissions/{submissionId}/status` | `AGENCY_MANAGE` | Update submission status |
| GET | `/api/v1/recruitment/agencies/{id}/performance` | `AGENCY_VIEW` | Get agency performance |
| GET | `/api/v1/recruitment/agencies/submissions/job/{jobOpeningId}` | `RECRUITMENT_VIEW` | Submissions by job opening |

### AIRecruitmentController

Base path: `/api/v1/recruitment/ai`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/recruitment/ai/parse-resume` | `RECRUITMENT_CREATE` | Parse resume text/URL/base64 |
| POST | `/api/v1/recruitment/ai/parse-resume/upload` | `RECRUITMENT_CREATE` | Parse uploaded resume file |
| POST | `/api/v1/recruitment/ai/match-score` | `CANDIDATE_VIEW` | Candidate-job match score |
| POST | `/api/v1/recruitment/ai/screening-summary` | `CANDIDATE_VIEW` | AI candidate screening summary |
| GET | `/api/v1/recruitment/ai/ranked-candidates/{jobOpeningId}` | `CANDIDATE_VIEW` | AI-ranked candidates for job |
| POST | `/api/v1/recruitment/ai/generate-job-description` | `RECRUITMENT_CREATE` | Generate AI job description |
| GET | `/api/v1/recruitment/ai/interview-questions/{jobOpeningId}` | `RECRUITMENT_VIEW` | Generate interview questions |
| POST | `/api/v1/recruitment/ai/synthesize-feedback` | `CANDIDATE_VIEW` | Synthesize interview feedback |

### ApplicantController

Base path: `/api/v1/recruitment/applicants`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/recruitment/applicants` | `RECRUITMENT_CREATE` | Create applicant record |
| GET | `/api/v1/recruitment/applicants/{id}` | `RECRUITMENT_VIEW_ALL` | Get applicant by id |
| GET | `/api/v1/recruitment/applicants` | `RECRUITMENT_VIEW_ALL` | List applicants (filtered) |
| PUT | `/api/v1/recruitment/applicants/{id}/status` | `RECRUITMENT_MANAGE` | Update applicant status |
| GET | `/api/v1/recruitment/applicants/pipeline/{jobOpeningId}` | `RECRUITMENT_VIEW_ALL` | Pipeline grouped by stage |
| PUT | `/api/v1/recruitment/applicants/{id}/rating` | `RECRUITMENT_MANAGE` | Rate applicant |
| DELETE | `/api/v1/recruitment/applicants/{id}` | `RECRUITMENT_MANAGE` | Soft-delete applicant |

### JobBoardController

Base path: `/api/v1/recruitment/job-boards`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/recruitment/job-boards/post` | `RECRUITMENT_MANAGE` | Post job to boards |
| POST | `/api/v1/recruitment/job-boards/{postingId}/pause` | `RECRUITMENT_MANAGE` | Pause posting |
| GET | `/api/v1/recruitment/job-boards/job/{jobOpeningId}` | `RECRUITMENT_VIEW` | List postings for job |
| GET | `/api/v1/recruitment/job-boards` | `RECRUITMENT_VIEW` | List all postings |
| GET | `/api/v1/recruitment/job-boards/status/{status}` | `RECRUITMENT_VIEW` | List postings by status |

### RecruitmentController

Base path: `/api/v1/recruitment`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/recruitment/job-openings` | `RECRUITMENT_CREATE` | Create job opening |
| PUT | `/api/v1/recruitment/job-openings/{id}` | `RECRUITMENT_UPDATE` | Update job opening |
| GET | `/api/v1/recruitment/job-openings/{id}` | `RECRUITMENT_VIEW` | Get job opening |
| GET | `/api/v1/recruitment/job-openings` | `RECRUITMENT_VIEW` | List job openings |
| GET | `/api/v1/recruitment/job-openings/status/{status}` | `RECRUITMENT_VIEW` | Job openings by status |
| DELETE | `/api/v1/recruitment/job-openings/{id}` | `RECRUITMENT_DELETE` | Delete job opening |
| POST | `/api/v1/recruitment/candidates` | `RECRUITMENT_CREATE` | Create candidate |
| PUT | `/api/v1/recruitment/candidates/{id}` | `RECRUITMENT_UPDATE` | Update candidate |
| GET | `/api/v1/recruitment/candidates/{id}` | `CANDIDATE_VIEW` | Get candidate |
| GET | `/api/v1/recruitment/candidates` | `CANDIDATE_VIEW` | List candidates |
| GET | `/api/v1/recruitment/candidates/job-opening/{jobOpeningId}` | `CANDIDATE_VIEW` | Candidates by job opening |
| PUT | `/api/v1/recruitment/candidates/{id}/stage` | `RECRUITMENT_UPDATE` | Move candidate stage |
| POST | `/api/v1/recruitment/candidates/{id}/offer` | `RECRUITMENT_UPDATE` | Create offer |
| POST | `/api/v1/recruitment/candidates/{id}/accept-offer` | `RECRUITMENT_UPDATE` | Accept offer |
| POST | `/api/v1/recruitment/candidates/{id}/decline-offer` | `RECRUITMENT_UPDATE` | Decline offer |
| DELETE | `/api/v1/recruitment/candidates/{id}` | `RECRUITMENT_DELETE` | Delete candidate |
| GET | `/api/v1/recruitment/interviews` | `RECRUITMENT_VIEW` | List interviews |
| POST | `/api/v1/recruitment/interviews` | `RECRUITMENT_CREATE` | Schedule interview |
| PUT | `/api/v1/recruitment/interviews/{id}` | `RECRUITMENT_UPDATE` | Update interview |
| GET | `/api/v1/recruitment/interviews/{id}` | `RECRUITMENT_VIEW` | Get interview |
| GET | `/api/v1/recruitment/interviews/candidate/{candidateId}` | `RECRUITMENT_VIEW` | Interviews by candidate |
| DELETE | `/api/v1/recruitment/interviews/{id}` | `RECRUITMENT_DELETE` | Delete interview |
| GET | `/api/v1/recruitment/offers` | `RECRUITMENT_VIEW` | List all offers |

### ScorecardController

Base path: `/api/v1/recruitment/scorecards`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/recruitment/scorecards` | `SCORECARD_VIEW` | List scorecard templates |
| POST | `/api/v1/recruitment/scorecards` | `SCORECARD_TEMPLATE_MANAGE` | Create scorecard template |
| GET | `/api/v1/recruitment/scorecards/{id}` | `SCORECARD_VIEW` | Get template by id |
| PUT | `/api/v1/recruitment/scorecards/{id}` | `SCORECARD_TEMPLATE_MANAGE` | Update template |
| DELETE | `/api/v1/recruitment/scorecards/{id}` | `SCORECARD_DELETE` | Delete template |
| POST | `/api/v1/recruitment/scorecards/{id}/submit` | `SCORECARD_CREATE` | Submit interview scorecard |

### OnboardingManagementController

Base path: `/api/v1/onboarding`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/onboarding/processes` | `ONBOARDING_MANAGE` | Create onboarding process |
| PUT | `/api/v1/onboarding/processes/{processId}` | `ONBOARDING_MANAGE` | Update process |
| PATCH | `/api/v1/onboarding/processes/{processId}/status` | `ONBOARDING_MANAGE` | Update process status |
| PATCH | `/api/v1/onboarding/processes/{processId}/progress` | `ONBOARDING_MANAGE` | Update progress percentage |
| GET | `/api/v1/onboarding/processes/{processId}` | `ONBOARDING_VIEW` | Get process by id |
| GET | `/api/v1/onboarding/processes/employee/{employeeId}` | `ONBOARDING_VIEW` | Process by employee |
| GET | `/api/v1/onboarding/processes` | `ONBOARDING_VIEW` | List all processes |
| POST | `/api/v1/onboarding/templates` | `ONBOARDING_MANAGE` | Create checklist template |
| GET | `/api/v1/onboarding/templates` | `ONBOARDING_VIEW` | List checklist templates |
| GET | `/api/v1/onboarding/templates/{templateId}` | `ONBOARDING_VIEW` | Get template by id |
| PUT | `/api/v1/onboarding/templates/{templateId}` | `ONBOARDING_MANAGE` | Update template |
| DELETE | `/api/v1/onboarding/templates/{templateId}` | `ONBOARDING_MANAGE` | Delete template |
| POST | `/api/v1/onboarding/templates/{templateId}/tasks` | `ONBOARDING_MANAGE` | Add task to template |
| GET | `/api/v1/onboarding/templates/{templateId}/tasks` | `ONBOARDING_VIEW` | List template tasks |
| PUT | `/api/v1/onboarding/templates/{templateId}/tasks/{taskId}` | `ONBOARDING_MANAGE` | Update template task |
| DELETE | `/api/v1/onboarding/templates/{templateId}/tasks/{taskId}` | `ONBOARDING_MANAGE` | Delete template task |
| GET | `/api/v1/onboarding/processes/{processId}/tasks` | `ONBOARDING_VIEW` | List process tasks |
| PATCH | `/api/v1/onboarding/tasks/{taskId}/status` | `ONBOARDING_MANAGE` | Update task status |
| GET | `/api/v1/onboarding/processes/status/{status}` | `ONBOARDING_VIEW` | Processes by status |
| GET | `/api/v1/onboarding/processes/buddy/{buddyId}` | `ONBOARDING_VIEW` | Processes by buddy |
| DELETE | `/api/v1/onboarding/processes/{processId}` | `ONBOARDING_MANAGE` | Delete process |

### PreboardingController

Base path: `/api/v1/preboarding` — `/portal/{token}/**` endpoints are **public** (token-based).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/preboarding/candidates` | `PREBOARDING_CREATE` | Create preboarding invitation |
| GET | `/api/v1/preboarding/candidates` | `PREBOARDING_VIEW` | List all candidates |
| GET | `/api/v1/preboarding/candidates/status/{status}` | `PREBOARDING_VIEW` | Candidates by status |
| GET | `/api/v1/preboarding/candidates/upcoming` | `PREBOARDING_VIEW` | Upcoming joiners |
| POST | `/api/v1/preboarding/candidates/{id}/cancel` | `PREBOARDING_MANAGE` | Cancel invitation |
| POST | `/api/v1/preboarding/candidates/{id}/resend` | `PREBOARDING_MANAGE` | Resend invitation |
| POST | `/api/v1/preboarding/candidates/{id}/convert` | `PREBOARDING_MANAGE` | Mark converted to employee |
| GET | `/api/v1/preboarding/portal/{token}` | public | Get portal data by token |
| PUT | `/api/v1/preboarding/portal/{token}/personal-info` | public | Update personal info |
| PUT | `/api/v1/preboarding/portal/{token}/bank-details` | public | Update bank details |
| POST | `/api/v1/preboarding/portal/{token}/documents/{documentType}` | public | Mark document uploaded |
| POST | `/api/v1/preboarding/portal/{token}/sign-offer` | public | Sign offer letter |

### ProbationController

Base path: `/api/v1/probation`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/probation` | `PROBATION_MANAGE` | Create probation period |
| GET | `/api/v1/probation/{probationId}` | `PROBATION_VIEW` | Get probation by id |
| GET | `/api/v1/probation/employee/{employeeId}` | `PROBATION_VIEW` | Active probation by employee |
| GET | `/api/v1/probation` | `PROBATION_VIEW` | List all probations |
| GET | `/api/v1/probation/status/{status}` | `PROBATION_VIEW` | Probations by status |
| GET | `/api/v1/probation/search` | `PROBATION_VIEW` | Search probations |
| GET | `/api/v1/probation/my-team` | `PROBATION_VIEW` | My team's probations |
| POST | `/api/v1/probation/{probationId}/extend` | `PROBATION_MANAGE` | Extend probation |
| POST | `/api/v1/probation/{probationId}/confirm` | `PROBATION_MANAGE` | Confirm employee |
| POST | `/api/v1/probation/{probationId}/fail` | `PROBATION_MANAGE` | Fail probation |
| POST | `/api/v1/probation/{probationId}/terminate` | `PROBATION_MANAGE` | Terminate probation |
| POST | `/api/v1/probation/{probationId}/hold` | `PROBATION_MANAGE` | Put probation on hold |
| POST | `/api/v1/probation/{probationId}/resume` | `PROBATION_MANAGE` | Resume from hold |
| POST | `/api/v1/probation/evaluations` | `PROBATION_MANAGE` | Add evaluation |
| GET | `/api/v1/probation/{probationId}/evaluations` | `PROBATION_VIEW` | List evaluations |
| POST | `/api/v1/probation/evaluations/{evaluationId}/acknowledge` | `EMPLOYEE_VIEW_SELF` | Acknowledge evaluation |
| GET | `/api/v1/probation/overdue` | `PROBATION_VIEW` | List overdue probations |
| GET | `/api/v1/probation/ending-soon` | `PROBATION_VIEW` | Probations ending soon |
| GET | `/api/v1/probation/evaluations-due` | `PROBATION_VIEW` | Probations with evals due |
| GET | `/api/v1/probation/statistics` | `PROBATION_VIEW` | Probation statistics |
| GET | `/api/v1/probation/statuses` | `PROBATION_VIEW` | List status enum values |

### ReferralController

Base path: `/api/v1/referrals`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/referrals` | `REFERRAL_CREATE` | Submit employee referral |
| GET | `/api/v1/referrals/{id}` | `REFERRAL_VIEW` | Get referral by id |
| GET | `/api/v1/referrals/my-referrals` | `REFERRAL_VIEW` | My submitted referrals |
| GET | `/api/v1/referrals` | `REFERRAL_MANAGE` | List all referrals |
| GET | `/api/v1/referrals/status/{status}` | `REFERRAL_MANAGE` | Referrals by status |
| PUT | `/api/v1/referrals/{id}/status` | `REFERRAL_MANAGE` | Update referral status |
| PUT | `/api/v1/referrals/{id}/reject` | `REFERRAL_MANAGE` | Reject referral |
| PUT | `/api/v1/referrals/{id}/link-employee` | `REFERRAL_MANAGE` | Link to hired employee |
| GET | `/api/v1/referrals/bonus-eligible` | `REFERRAL_MANAGE` | Bonus-eligible referrals |
| POST | `/api/v1/referrals/{id}/process-bonus` | `REFERRAL_MANAGE` | Start bonus processing |
| POST | `/api/v1/referrals/{id}/mark-bonus-paid` | `REFERRAL_MANAGE` | Mark bonus paid |
| POST | `/api/v1/referrals/check-bonus-eligibility` | `REFERRAL_MANAGE` | Check bonus eligibility |
| POST | `/api/v1/referrals/policies` | `REFERRAL_MANAGE` | Create referral policy |
| PUT | `/api/v1/referrals/policies/{id}` | `REFERRAL_MANAGE` | Update referral policy |
| GET | `/api/v1/referrals/policies/{id}` | `REFERRAL_VIEW` | Get referral policy |
| GET | `/api/v1/referrals/policies` | `REFERRAL_VIEW` | List active policies |
| PUT | `/api/v1/referrals/policies/{id}/toggle` | `REFERRAL_MANAGE` | Toggle policy active |
| GET | `/api/v1/referrals/dashboard` | `REFERRAL_VIEW` | Referral program dashboard |

### ExitManagementController

Base path: `/api/v1/exit`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/exit/processes` | `EXIT_INITIATE` | Create exit process |
| PUT | `/api/v1/exit/processes/{id}` | `EXIT_MANAGE` | Update exit process |
| PATCH | `/api/v1/exit/processes/{id}/status` | `EXIT_MANAGE` | Update exit status |
| GET | `/api/v1/exit/processes/{id}` | `EXIT_VIEW` | Get exit process by id |
| GET | `/api/v1/exit/processes/employee/{employeeId}` | `EXIT_VIEW` | Exit process by employee |
| GET | `/api/v1/exit/processes` | `EXIT_VIEW` | List exit processes |
| GET | `/api/v1/exit/processes/status/{status}` | `EXIT_VIEW` | Exit processes by status |
| DELETE | `/api/v1/exit/processes/{id}` | `EXIT_MANAGE` | Delete exit process |
| POST | `/api/v1/exit/clearances` | `EXIT_MANAGE` | Create exit clearance |
| PUT | `/api/v1/exit/clearances/{id}` | `EXIT_MANAGE` | Update exit clearance |
| GET | `/api/v1/exit/clearances/process/{exitProcessId}` | `EXIT_VIEW` | Clearances by exit process |
| GET | `/api/v1/exit/clearances/approver/{approverId}` | `EXIT_VIEW` | Clearances by approver |
| DELETE | `/api/v1/exit/clearances/{id}` | `EXIT_MANAGE` | Delete exit clearance |
| POST | `/api/v1/exit/settlements` | `EXIT_MANAGE` | Create F&F settlement |
| PUT | `/api/v1/exit/settlements/{id}` | `EXIT_MANAGE` | Update F&F settlement |
| POST | `/api/v1/exit/settlements/{id}/submit` | `EXIT_MANAGE` | Submit settlement for approval |
| POST | `/api/v1/exit/settlements/{id}/approve` | `EXIT_APPROVE` | Approve settlement |
| POST | `/api/v1/exit/settlements/{id}/pay` | `EXIT_APPROVE` | Process settlement payment |
| GET | `/api/v1/exit/settlements/{id}` | `EXIT_VIEW` | Get settlement by id |
| GET | `/api/v1/exit/settlements/process/{exitProcessId}` | `EXIT_VIEW` | Settlement by exit process |
| GET | `/api/v1/exit/settlements` | `EXIT_VIEW` | List all settlements |
| GET | `/api/v1/exit/settlements/pending-approvals` | `EXIT_VIEW` | Settlements pending approval |
| POST | `/api/v1/exit/interviews` | `EXIT_MANAGE` | Schedule exit interview |
| PUT | `/api/v1/exit/interviews/{id}/conduct` | `EXIT_MANAGE` | Conduct exit interview |
| PATCH | `/api/v1/exit/interviews/{id}/reschedule` | `EXIT_MANAGE` | Reschedule interview |
| GET | `/api/v1/exit/interviews/{id}` | `EXIT_VIEW` | Get exit interview |
| GET | `/api/v1/exit/interviews` | `EXIT_VIEW` | List exit interviews |
| GET | `/api/v1/exit/interviews/scheduled` | `EXIT_VIEW` | List scheduled interviews |
| GET | `/api/v1/exit/interviews/analytics` | `EXIT_VIEW` | Exit interview analytics |
| POST | `/api/v1/exit/assets` | `EXIT_MANAGE` | Create asset recovery |
| PUT | `/api/v1/exit/assets/{id}/return` | `EXIT_MANAGE` | Record asset return |
| PATCH | `/api/v1/exit/assets/{id}/lost` | `EXIT_MANAGE` | Mark asset lost |
| PATCH | `/api/v1/exit/assets/{id}/waive` | `EXIT_APPROVE` | Waive asset recovery |
| PATCH | `/api/v1/exit/assets/{id}/verify` | `EXIT_MANAGE` | Verify asset return |
| GET | `/api/v1/exit/assets/process/{exitProcessId}` | `EXIT_VIEW` | Assets by exit process |
| GET | `/api/v1/exit/assets/pending` | `EXIT_VIEW` | Pending asset recoveries |
| GET | `/api/v1/exit/assets/process/{exitProcessId}/deductions` | `EXIT_VIEW` | Total deductions for process |
| GET | `/api/v1/exit/assets/process/{exitProcessId}/recovered` | `EXIT_VIEW` | Check all assets recovered |
| GET | `/api/v1/exit/dashboard` | `EXIT_VIEW` | Exit management dashboard |

### OffboardingController

Base path: `/api/v1/offboarding` — thin alias over `ExitManagementService`.

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/offboarding` | `OFFBOARDING_MANAGE` | Initiate offboarding process |
| GET | `/api/v1/offboarding` | `OFFBOARDING_VIEW` | List offboarding processes |
| GET | `/api/v1/offboarding/{id}` | `OFFBOARDING_VIEW` | Get offboarding by id |
| GET | `/api/v1/offboarding/employee/{employeeId}` | `OFFBOARDING_VIEW` | Offboarding by employee |
| PUT | `/api/v1/offboarding/{id}` | `OFFBOARDING_MANAGE` | Update offboarding process |
| PATCH | `/api/v1/offboarding/{id}/status` | `OFFBOARDING_MANAGE` | Update offboarding status |
| GET | `/api/v1/offboarding/status/{status}` | `OFFBOARDING_VIEW` | Offboardings by status |
| DELETE | `/api/v1/offboarding/{id}` | `OFFBOARDING_MANAGE` | Delete offboarding process |

### FnFController

Base path: `/api/v1/exit` (shares prefix with `ExitManagementController`). `/interview/public/{token}/**`
endpoints are **public** (token-based).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/exit/{exitProcessId}/fnf` | `OFFBOARDING_FNF_CALCULATE` | Get or calculate F&F |
| PUT | `/api/v1/exit/{exitProcessId}/fnf/adjustments` | `OFFBOARDING_MANAGE` | Add F&F adjustment |
| POST | `/api/v1/exit/{exitProcessId}/fnf/approve` | `OFFBOARDING_MANAGE` | Approve F&F |
| GET | `/api/v1/exit/fnf` | `OFFBOARDING_VIEW` | List all F&F calculations |
| POST | `/api/v1/exit/interviews/{interviewId}/generate-token` | `OFFBOARDING_MANAGE` | Generate public interview token |
| GET | `/api/v1/exit/interview/public/{token}` | public | Get public exit interview |
| POST | `/api/v1/exit/interview/public/{token}/submit` | public | Submit public exit interview |

### ESignatureController

Base path: `/api/v1/esignature` — `/external/{token}/**` endpoints are **public** (token-based).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/esignature/requests` | `ESIGNATURE_REQUEST` | Create signature request |
| PUT | `/api/v1/esignature/requests/{id}` | `ESIGNATURE_MANAGE` | Update signature request |
| PATCH | `/api/v1/esignature/requests/{id}/send` | `ESIGNATURE_REQUEST` | Send for signature |
| PATCH | `/api/v1/esignature/requests/{id}/cancel` | `ESIGNATURE_MANAGE` | Cancel signature request |
| GET | `/api/v1/esignature/requests/{id}` | `{ESIGNATURE_VIEW, ESIGNATURE_SIGN}` | Get signature request |
| GET | `/api/v1/esignature/requests` | `ESIGNATURE_VIEW` | List signature requests |
| GET | `/api/v1/esignature/requests/creator/{creatorId}` | `{ESIGNATURE_VIEW, ESIGNATURE_REQUEST}` | Requests by creator |
| GET | `/api/v1/esignature/requests/status/{status}` | `ESIGNATURE_VIEW` | Requests by status |
| GET | `/api/v1/esignature/requests/templates` | `ESIGNATURE_VIEW` | List template requests |
| DELETE | `/api/v1/esignature/requests/{id}` | `ESIGNATURE_MANAGE` | Delete signature request |
| POST | `/api/v1/esignature/requests/{requestId}/signers` | `ESIGNATURE_REQUEST` | Add signer |
| POST | `/api/v1/esignature/approvals/{approvalId}/sign` | `ESIGNATURE_SIGN` | Sign document |
| POST | `/api/v1/esignature/approvals/{approvalId}/decline` | `ESIGNATURE_SIGN` | Decline document |
| GET | `/api/v1/esignature/requests/{requestId}/approvals` | `ESIGNATURE_VIEW` | Approvals by request |
| GET | `/api/v1/esignature/approvals/signer/{signerId}/pending` | `ESIGNATURE_SIGN` | Pending approvals by signer |
| DELETE | `/api/v1/esignature/approvals/{approvalId}` | `ESIGNATURE_MANAGE` | Remove signer |
| GET | `/api/v1/esignature/external/{token}` | public | External signature info |
| POST | `/api/v1/esignature/external/{token}/sign` | public | External sign document |
| POST | `/api/v1/esignature/external/{token}/decline` | public | External decline document |

### LetterController

Base path: `/api/v1/letters`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/letters/templates` | `LETTER_TEMPLATE_CREATE` | Create letter template |
| PUT | `/api/v1/letters/templates/{templateId}` | `LETTER_TEMPLATE_MANAGE` | Update letter template |
| GET | `/api/v1/letters/templates/{templateId}` | `LETTER_TEMPLATE_VIEW` | Get template by id |
| GET | `/api/v1/letters/templates` | `LETTER_TEMPLATE_VIEW` | List all templates |
| GET | `/api/v1/letters/templates/active` | `LETTER_TEMPLATE_VIEW` | List active templates |
| GET | `/api/v1/letters/templates/by-category` | `LETTER_TEMPLATE_VIEW` | Templates by category |
| DELETE | `/api/v1/letters/templates/{templateId}` | `LETTER_TEMPLATE_MANAGE` | Delete template |
| POST | `/api/v1/letters/generate` | `LETTER_GENERATE` | Generate letter |
| POST | `/api/v1/letters/generate-offer` | `RECRUITMENT_MANAGE` | Generate offer letter |
| GET | `/api/v1/letters/{letterId}` | `{LETTER_TEMPLATE_VIEW, SELF_SERVICE_VIEW_LETTERS, LETTER_GENERATE}` | Get letter by id |
| GET | `/api/v1/letters` | `LETTER_TEMPLATE_VIEW` | List all letters |
| GET | `/api/v1/letters/employee/{employeeId}` | `{LETTER_TEMPLATE_VIEW, SELF_SERVICE_VIEW_LETTERS}` | Letters by employee |
| GET | `/api/v1/letters/employee/{employeeId}/issued` | `SELF_SERVICE_VIEW_LETTERS` | Issued letters for employee |
| GET | `/api/v1/letters/pending-approvals` | `LETTER_APPROVE` | Pending approvals |
| POST | `/api/v1/letters/{letterId}/submit` | `LETTER_GENERATE` | Submit for approval |
| POST | `/api/v1/letters/{letterId}/approve` | `LETTER_APPROVE` | Approve letter |
| POST | `/api/v1/letters/{letterId}/issue` | `LETTER_ISSUE` | Issue letter |
| POST | `/api/v1/letters/{letterId}/issue-with-esign` | `RECRUITMENT_MANAGE` | Issue offer with e-sign |
| POST | `/api/v1/letters/{letterId}/generate-pdf` | `{LETTER_GENERATE, RECRUITMENT_MANAGE}` | Generate letter PDF |
| POST | `/api/v1/letters/{letterId}/revoke` | `LETTER_ISSUE` | Revoke letter |
| POST | `/api/v1/letters/{letterId}/downloaded` | `SELF_SERVICE_VIEW_LETTERS` | Mark letter downloaded |
| POST | `/api/v1/letters/templates/{templateId}/clone` | `LETTER_TEMPLATE_CREATE` | Clone template |
| GET | `/api/v1/letters/templates/{templateId}/preview` | `LETTER_TEMPLATE_VIEW` | Preview template |
| POST | `/api/v1/letters/bulk-generate` | `LETTER_GENERATE` | Bulk-generate letters |
| GET | `/api/v1/letters/categories` | `LETTER_TEMPLATE_VIEW` | List letter categories |
| GET | `/api/v1/letters/placeholders` | `LETTER_TEMPLATE_VIEW` | List available placeholders |

### PublicCareerController

Base path: `/api/v1/public/careers` — **all endpoints public** (tenant via `X-Tenant-ID` header).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/public/careers/jobs` | public | List public job openings |
| GET | `/api/v1/public/careers/jobs/{jobId}` | public | Get public job detail |
| POST | `/api/v1/public/careers/apply` | public | Submit job application |
| GET | `/api/v1/public/careers/filters` | public | Get job search filters |

### PublicOfferController

Base path: `/api/v1/public/offers` — **all endpoints public** (token-based).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/public/offers/{token}` | public | Get offer by token |
| POST | `/api/v1/public/offers/{token}/accept` | public | Accept offer |
| POST | `/api/v1/public/offers/{token}/decline` | public | Decline offer |

### ContractController

Base path: `/api/v1/contracts`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/contracts` | `CONTRACT_CREATE` | Create contract |
| GET | `/api/v1/contracts/{contractId}` | `CONTRACT_VIEW` | Get contract by id |
| GET | `/api/v1/contracts` | `CONTRACT_VIEW` | List all contracts |
| PUT | `/api/v1/contracts/{contractId}` | `CONTRACT_UPDATE` | Update contract |
| DELETE | `/api/v1/contracts/{contractId}` | `CONTRACT_DELETE` | Delete contract |
| GET | `/api/v1/contracts/status/{status}` | `CONTRACT_VIEW` | Contracts by status |
| GET | `/api/v1/contracts/type/{type}` | `CONTRACT_VIEW` | Contracts by type |
| GET | `/api/v1/contracts/employee/{employeeId}` | `CONTRACT_VIEW` | Employee's contracts |
| GET | `/api/v1/contracts/search` | `CONTRACT_VIEW` | Search contracts |
| PATCH | `/api/v1/contracts/{contractId}/mark-pending-review` | `CONTRACT_UPDATE` | Mark pending review |
| PATCH | `/api/v1/contracts/{contractId}/mark-pending-signatures` | `CONTRACT_UPDATE` | Mark pending signatures |
| PATCH | `/api/v1/contracts/{contractId}/mark-active` | `CONTRACT_APPROVE` | Activate contract |
| PATCH | `/api/v1/contracts/{contractId}/terminate` | `CONTRACT_UPDATE` | Terminate contract |
| PATCH | `/api/v1/contracts/{contractId}/renew` | `CONTRACT_UPDATE` | Renew contract |
| GET | `/api/v1/contracts/expiring` | `CONTRACT_VIEW` | Expiring contracts |
| GET | `/api/v1/contracts/expired` | `CONTRACT_VIEW` | Expired contracts |
| GET | `/api/v1/contracts/active` | `CONTRACT_VIEW` | Active contracts |
| GET | `/api/v1/contracts/{contractId}/versions` | `CONTRACT_VIEW` | Contract version history |
| POST | `/api/v1/contracts/{contractId}/send-for-signing` | `CONTRACT_UPDATE` | Send for signing |
| POST | `/api/v1/contracts/{contractId}/record-signature` | `CONTRACT_SIGN` | Record signature |
| POST | `/api/v1/contracts/{contractId}/decline-signature` | `CONTRACT_SIGN` | Decline signature |
| GET | `/api/v1/contracts/{contractId}/signatures` | `CONTRACT_VIEW` | List all signatures |
| GET | `/api/v1/contracts/{contractId}/signatures/pending` | `CONTRACT_VIEW` | Pending signatures |
| GET | `/api/v1/contracts/{contractId}/signatures/summary` | `CONTRACT_VIEW` | Signature summary |

### ContractTemplateController

Base path: `/api/v1/contracts/templates`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/contracts/templates` | `CONTRACT_TEMPLATE_MANAGE` | Create contract template |
| GET | `/api/v1/contracts/templates/{templateId}` | `CONTRACT_VIEW` | Get template by id |
| GET | `/api/v1/contracts/templates` | `CONTRACT_VIEW` | List all templates |
| GET | `/api/v1/contracts/templates/active` | `CONTRACT_VIEW` | List active templates |
| GET | `/api/v1/contracts/templates/type/{type}` | `CONTRACT_VIEW` | Templates by type |
| GET | `/api/v1/contracts/templates/search` | `CONTRACT_VIEW` | Search templates |
| PUT | `/api/v1/contracts/templates/{templateId}` | `CONTRACT_TEMPLATE_MANAGE` | Update template |
| DELETE | `/api/v1/contracts/templates/{templateId}` | `CONTRACT_TEMPLATE_MANAGE` | Delete template |
| PATCH | `/api/v1/contracts/templates/{templateId}/toggle-active` | `CONTRACT_TEMPLATE_MANAGE` | Toggle template active |

## Notes

- **Public (unauthenticated) surface** in NU-Hire — these rely on token / `X-Tenant-ID`
  rather than the JWT chain (see [[Middleware]] allow-list and [[Security-Audit]]):
  - `PublicCareerController` — all 4 endpoints (`X-Tenant-ID` header, falls back to a
    configured default tenant for the demo landing page).
  - `PublicOfferController` — all 3 endpoints (token-based offer portal).
  - `PreboardingController` — the 5 `/portal/{token}/**` endpoints (token-based candidate portal).
  - `ESignatureController` — the 3 `/external/{token}/**` endpoints (token-based external signing).
  - `FnFController` — the 2 `/interview/public/{token}/**` endpoints (token-based exit interview).
- **Shared `/api/v1/exit` base path:** `ExitManagementController` and `FnFController` both map
  `/api/v1/exit`; they split the surface by method path (the `FnFController` adds the `BUG-010`
  class-level `@RequestMapping` so its handlers no longer duplicate the prefix). The
  `OffboardingController` (`/api/v1/offboarding`) is a thin alias delegating to the same
  `ExitManagementService`.
- **Permission sets in `{...}`:** `getSignatureRequestById`, `getSignatureRequestsByCreator`,
  `getLetterById`, `getLettersByEmployee`, `generatePdf`, and `getJobBoard`-adjacent reads grant
  access to a caller holding **any one** of the listed permissions (the `@RequiresPermission`
  annotation takes an array).
- **Cross-domain permissions:** offer-letter handlers in `LetterController`
  (`/generate-offer`, `/issue-with-esign`) and resume parsing in `AIRecruitmentController` reuse
  recruitment permissions (`RECRUITMENT_MANAGE` / `RECRUITMENT_CREATE`), reflecting that letters
  and AI are shared services consumed by the recruitment flow.

## Related Links

- [[Controller-Index]] — exhaustive 1:1 controller list · [[APIs]] — curated endpoint catalog
- [[Services]] — service layer behind these controllers
- [[Feature-Traceability]] — end-to-end feature slices
- [[Permissions]] — authorization model
- [[Nu-Hire]] — sub-app deep dive
- [[00-Home]]
