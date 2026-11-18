H-001 | FIXED | lib/utils/careers-mapper.ts (new), app/careers/page.tsx, lib/hooks/queries/useCareers.ts | API returns {content:[{jobTitle,...}]}; mapper converts to UI shape. Department shows "General" (public DTO has no department name; see H-008)
H-002 | FIXED | app/globals.css | toast root pointer-events:none, individual toasts auto. Not verified at 390px in a browser
H-003 | FIXED | lib/validations/recruitment.ts | empty valueAsNumber (NaN) now counts as not provided
H-004 | FIXED | app/recruitment/job-boards/page.tsx | use /recruitment/job-openings/status/OPEN
H-005 | SKIPPED | - | needs seeded default offer template (data/product decision)
H-006 | FIXED | app/recruitment/agencies/page.tsx | blank rating/feeType/status/feeAmount no longer fail validation silently
H-007 | FIXED | app/recruitment/interviews/page.tsx | null API fields converted to undefined when opening feedback form
H-009 | FIXED | lib/validations/recruitment.ts | min<=max refine on job salary
H-036 | FIXED | app/recruitment/interviews/page.tsx | aria-label + aria-pressed on star buttons
H-008,H-010..H-035 (except above) | SKIPPED | - | not reached (token budget)
Q-006 | FIXED | app/recruitment/candidates/page.tsx | QueryErrorCard with retry shown when fetch fails and no data
H-008 | FIXED | backend JobOpeningService.java (+ JobOpeningServiceTest mock) | departmentName resolved via DepartmentRepository (list + single mapper). Backend not compiled
H-010 | FIXED | backend JobOpeningService.java, JobOpeningServiceTest.java | duplicate job code now rejected with "already exists" (test updated). Backend not compiled/run
H-011 | NEEDS-DECISION | lib/utils/error-handler.ts | global mutation toast already carries server message; replaced runtime require() with static import in case it failed silently. Root cause not confirmed live; re-test in browser
H-012 | NEEDS-DECISION | lib/utils/error-handler.ts | same as H-011
H-013 | FIXED | backend RecruitmentManagementService.java, CandidateRepository.java | reject same email (case-insensitive) for same job opening; same person on other jobs still allowed
H-014 | FIXED | app/recruitment/pipeline/page.tsx | candidate dropdown replaces raw ID input
H-015 | FIXED | app/recruitment/pipeline/page.tsx, _components/pipeline-config.ts | days-since clamped to >= 0. Referral "Submitted" date skew (server tz) not addressed
H-016 | SKIPPED | - | candidate vs pipeline status model differs; needs product decision
H-017 | FIXED | app/offer-portal/page.tsx | no token shows "Invalid or expired offer link"; hard-coded hr@company.com untouched
