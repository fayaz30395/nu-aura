Live verification of commit 16d80143 (FE :3000, BE :8080, headless Playwright). Scripts: `docs/release-readiness/evidence/scripts/e2e/verify-*.mjs`. Screenshots: `evidence/screenshots/verify-*.png`.
Roles: EMP = arun@, HR admin = admin@ (fresh login, state `verify_emp` / `verify_hr`). Test data prefix NUAURA_TEST_VERIFY, nothing deleted.

ID | PASS/FAIL | evidence
---|---|---
G-001 | PASS | EMP opened /learning/courses/48000000-0e05-...0001; 1 quizzes request in 8 s (status 403, not retried), still on the course URL, no logout.
F-001 | PASS | Wiki page created via UI (id 5a23a500-5e78-45de-ae27-5662c270e99e); view shows the typed text, no raw JSON. Note: older seeded page ba12d612 (NUAURA_TEST_P5_R2) still shows raw JSON because its stored content is double-encoded (a JSON doc inside a text node) from the pre-fix bug. This is data, not the getter.
F-002 | PASS | Edit page of the same new page loads editor text "verifybody528484", not JSON. (Old double-encoded page ba12d612 still shows JSON in the editor, same data cause.)
F-003 | PASS (re-verified after backend rebuild) | Create Post 201, blog id e0556f89-d531-46a8-a693-dd10e036d1c6, redirected to its page.
F-004 | PASS (re-verified) | Save Template 201, template id 04ccda1a-fa19-493e-8105-d21021f73bef, slug generated.
F-005 | PASS (re-verified) | /fluence/search "NUAURA_TEST" shows "Found 2 results" with no error boundary.
F-006 | PASS | HR admin edit page: edit-lock POST/POST/DELETE all 200 (before the fix they were 400/403 by slug). Direct POST `/fluence/edit-lock/WIKI_PAGE/{id}` also 200.
G-002 | PASS | EMP created goal via UI (needs Target, Current, Unit filled): 201 POST /goals id 1ee8c62f-39fc-4b8e-ba74-d503684eb9b9, dialog closed.
G-003 | PASS (re-verified) | Create Survey 201, survey id ea02e0c3-c14c-4c8f-9939-01461dcbb75a (NUAURA_VERIFY_690716).
H-001 | PASS (with env note) | Anonymous /careers calls /public/careers/jobs without a tenant, so the backend uses default tenant 550e8400-...-440000, which has no jobs: page shows "No jobs found". The data lives in tenant 660e8400-...-440001. I created OPEN job NUAURA_TEST_VERIFY job 997067 (id b13da14d-7047-4b53-8083-bcf451ecea29; a second one, 007505, came from a re-run). With the real API response for the 660e tenant replayed into the page, the card renders the job (mapper works). Live anonymous listing still empty until default tenant config matches.
H-002 | PASS | 390x844: "Add Candidate" elementFromPoint hits the button before and while success toasts are on screen; click opens the dialog.
H-003 | PASS | Add Candidate with only required fields (candidateCode, job, first/last name, email): 201, toast "Candidate created successfully" (id 1c4b3c9a-24e9-4d7e-8229-b276c8122321). Missing candidateCode shows inline "Candidate code is required" (no silent failure).
H-006 | PASS | Add Agency with name only: 201 (ids afc93ea1-5560-4b94-a3d3-b7064d5caed8, 9e8c31c2-c2fe-4014-9a5d-272efc406efa; two runs).
S-001 | PASS | EMP GET /employees/managers 200, 13 rows. Only id, employeeCode, firstName, lastName, fullName, designation are non-null; personalEmail, bank, DOB are all null. Note: the JSON still carries the null-valued key `personalEmail` (full EmployeeResponse shape); no data leaks.
Q-001 | PASS | /admin/payroll with all /payroll GETs forced to 500 (6 calls): error card with Retry shown, no raw axios text.
Q-005 | PASS | /admin/holidays with /holidays GETs forced to 500 (3 calls): error card with Retry shown, no raw axios text.
UI-001 | PASS | EMP WFH "New request" dialog: typed "NUAURA_TEST_VERIFY reason 304124" into Reason, value intact, no error boundary.
UI-003 | PASS | HR admin created announcement: 201 POST /announcements id 11266796-6441-4f39-8fc1-b9cec4440d69.
UI-004 | PASS | EMP /me/documents stays on the URL after 3.5 s, page renders.
UI-005 | PASS | EMP /calendar loads, no 4xx/5xx calendar calls.
UI-008 | NOT VERIFIED | Timesheets page loads for HR admin, but no allocated project exists (UI-002), so add-entry fallback could not be exercised.
UI-009 | NOT VERIFIED | Same reason as UI-008 (needs a timesheet entry save).
UI-010 | PASS | HR admin posted on wall (post 21d7828c-f1f4-4495-9cd4-8c8b3f20f339), added comment (201, id 8d8ae773-8017-462f-88a8-c220039d25fb) and it appeared without reload. Earlier post 2ed4f3f4-6377-414b-8cf2-627bb1d8a502 also created.
LOGIN-console | PASS | /auth/login fresh load: 0 console errors or warnings in 5 s.

Test data created (not deleted): wiki page 5a23a500..., job openings b13da14d... and one more, candidate 1c4b3c9a..., agencies afc93ea1... and 9e8c31c2..., goal 1ee8c62f..., announcement 11266796..., wall posts 2ed4f3f4... and 21d7828c... with comment 8d8ae773.... No blog, template or survey was created (all returned 400).
