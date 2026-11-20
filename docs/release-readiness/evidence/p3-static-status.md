Static code reading only; nothing was run. Verify UNCLEAR and STILL OPEN rows in the browser.

Base: main at c0e483a3. Fix commits: 16d80143 (Hire register fixes), c9ee9e54 (V350 offer template, scorecard/onboarding gates), 1aaeeb6e (V353 referral grants), d7241e6e (letter template view grant). Paths are under frontend/ unless marked backend/.

| ID | Verdict | Evidence | Reason |
|---|---|---|---|
| H-003 | FIXED | lib/validations/recruitment.ts:14-16,77; 16d80143 | Empty valueAsNumber (NaN) now maps to undefined, so optional numbers no longer fail zod silently |
| H-004 | FIXED | app/recruitment/job-boards/page.tsx:105; backend RecruitmentController.java:56 | Page now calls /recruitment/job-openings/status/OPEN, which exists |
| H-005 | FIXED | backend db/migration/V350__release_readiness_view_grants_and_default_offer_template.sql:56; offer/page.tsx:41 | Seeds OFFER_STANDARD (category OFFER) per tenant; offer page filters on OFFER; HR template view granted in d7241e6e |
| H-006 | FIXED | app/recruitment/agencies/page.tsx:44-61 | Blank rating/feeType/status/feeAmount preprocessed to undefined, so they stop failing validation |
| H-007 | FIXED | app/recruitment/interviews/page.tsx:408-418 | Null API fields converted to undefined when opening the feedback form (null failed the schema) |
| H-008 | FIXED | backend JobOpeningService.java departmentName() used in list and single mapper; 16d80143 | Department name resolved via DepartmentRepository |
| H-009 | FIXED | lib/validations/recruitment.ts:49-52 | refine rejects min > max, error on maxSalary |
| H-010 | FIXED | backend JobOpeningService.java:55-56 | Duplicate job code now throws "already exists" instead of suffixing |
| H-011 | FIXED-MECHANISM | app/recruitment/jobs/page.tsx:129; lib/utils/error-handler.ts:344 | Catch is empty and relies on the global mutation toast; fix notes say root cause not reproduced (global MutationCache toast proven live on a rejected wall post: 400 shows a visible error toast and creates nothing; the exact jobs/candidates dialogs were not driven) |
| H-012 | FIXED-MECHANISM | app/recruitment/candidates/page.tsx:294-295 | Same: relies on the global MutationCache toast showing the 400 message; not confirmed (global MutationCache toast proven live on a rejected wall post: 400 shows a visible error toast and creates nothing; the exact jobs/candidates dialogs were not driven) |
| H-013 | FIXED | backend RecruitmentManagementService.java:114-118; CandidateRepository existsBy...EmailIgnoreCase | Same email for the same job opening is rejected; same email on a different job is still allowed |
| H-014 | FIXED | app/recruitment/pipeline/page.tsx:1139-1155 | Candidate ID text field replaced by a candidate select |
| H-015 | FIXED | app/recruitment/pipeline/page.tsx:190-196 | getDaysSince clamped with Math.max(0, ...); average uses it. Referral "Nov 17" date shown in the bug is a separate timezone effect, not addressed |
| H-016 | STILL OPEN | candidates/[id]/page.tsx:132-145 | Only labels Status and Pipeline stage; dashboard count (3) vs board (1) and stage name mismatch not changed. Fix notes list it as NEEDS-DECISION |
| H-017 | FIXED | app/offer-portal/page.tsx:166-169 | No token now shows "Invalid or expired offer link"; hard-coded hr@company.com removed |
| H-018 | FIXED | lib/config/routes.ts:749-752 | /recruitment/career-page route rule added (permission plus HR roles) |
| H-019 | FIXED | app/recruitment/scorecards/page.tsx:258,290; error text at 129 | New Template and edit/delete hidden without SCORECARD:TEMPLATE_MANAGE; save error mentions permission |
| H-020 | FIXED | app/recruitment/scorecards/page.tsx:122-125 | Save blocked with "Add at least one criterion" |
| H-021 | UNCLEAR | app/onboarding/templates/new/page.tsx:47-49 | Changed push to replace and added a created guard, but why push did not navigate was never reproduced |
| H-022 | FIXED | app/recruitment/interviews/page.tsx:285-288 | New interviews in the past rejected with a field error (the "stays SCHEDULED" part is not changed) |
| H-023 | FIXED | app/referrals/page.tsx:70-74 | List-all query only enabled with REFERRAL:MANAGE; employees no longer call it |
| H-024 | FIXED | backend V353__grant_hr_roles_referral_view_manage.sql; lib/config/routes.ts:992 | HR roles granted REFERRAL VIEW/MANAGE; route allows REFERRAL_MANAGE |
| H-025 | FIXED | app/recruitment/career-page/page.tsx:178 | Table wrapper changed to overflow-x-auto |
| H-026 | FIXED | CandidateFormModal.tsx:48; interviews/page.tsx noValidate on both forms; recruitment.ts:77 | noValidate lets zod messages ("Must be 0 or more", "Minimum 15 minutes") show |
| H-027 | FIXED | app/recruitment/jobs/page.tsx:95-98 | New jobs with a past closing date rejected (edits exempt) |
| H-028 | FIXED | app/recruitment/interviews/page.tsx:341-344; recruitment.ts feedback nullish | Empty feedback gives "Feedback is required" |
| H-029 | FIXED | lib/utils/error-handler.ts:311-315; recruitment.ts:11-13 | "Invalid ID format" now "Please select a valid option"; "Invalid value ... for field" mapped to friendly text; pipeline uses a select |
| H-030 | FIXED | lib/config/public-routes.ts:19,45-46 | /careers/[slug] added to client public routes; edge already allows sub-paths. Only one segment deep |
| H-031 | FIXED | app/preboarding/page.tsx:29-32 | Joining date in the past rejected |
| H-032 | FIXED | app/recruitment/jobs/_components/JobsTable.tsx:12-17 | 0 treated as not set, shows an em dash |
| H-033 | FIXED | app/onboarding/page.tsx:48,96; useOnboarding.ts:33-38 | Heading added to denied view; processes query disabled without view permission (no 403). Nav entry still reachable not checked |
| H-034 | FIXED | app/recruitment/interviews/page.tsx:609 | formatDateTime now includes year |
| H-035 | FIXED | app/recruitment/scorecards/page.tsx:275-277 | Button now "Back to dashboard" to /me/dashboard |
| H-036 | FIXED | app/recruitment/interviews/page.tsx:1199-1200 | aria-label "Rate N out of 5" and aria-pressed on star buttons |

Notes:
- H-001 and H-002 are outside the requested range (H-003 to H-036) and not assessed here.
- Counts: FIXED 30, STILL OPEN 1, UNCLEAR 3 (34 rows).
