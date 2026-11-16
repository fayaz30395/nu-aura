# Browser E2E (headless Playwright, local) - 2026-11-15

Scope: 8 UI journeys against http://localhost:3000 / :8080, demo accounts only, data prefix NUAURA_TEST_E2E_. Scripts: `evidence/scripts/e2e/` (run from `frontend/`). Defects: `evidence/defects-e2e.md`. Matrix: `evidence/matrix-e2e.csv`. Data: `evidence/test-data-e2e.md`.
Method: UI action, UI result, API response (captured from the page), DB row (read-only SQL as hrms_user). The FE bundle posts to `http://backend:8080`, so XHR is rerouted to localhost:8080 in the harness; WebSocket cannot be rerouted, so every page logs a WS name-resolution error (excluded from console counts, see below).
Setup note: FE dev server was returning 500 on every route (stale next 16.3.8 process vs node_modules 16.4.6). FE only was restarted (logged in `evidence/logs/config-changes.md`).

| ID | Scenario | Steps actually run | Actual | Status |
|---|---|---|---|---|
| NU-UI-001 | Login, My Space, app switcher, logout (arun, EMPLOYEE) | UI login (POST /auth/login 200, cookies set, lands /me/dashboard); 5 My Space pages load with correct h1; product rail switch HRMS/Grow/Fluence; Hire rail button does nothing for EMPLOYEE (not accessible); Sign out (POST /auth/logout 200, access/refresh cookies gone, /me/dashboard redirects to login); audit_logs has LOGIN and LOGOUT rows | as expected | PASS |
| NU-UI-002 | Leave apply, approve, status | arun applies Casual Leave 14-15 Dec via /leave/apply (POST 201, toast, DB PENDING); sumit approves in /leave/approvals (POST approve 200, row leaves list, DB APPROVED with approver Sumit); arun sees Approved in /leave/my-leaves; /me/leaves shows Casual Leave available 5 (DB 7 -> available 5, used 2, pending 0) | as expected | PASS |
| NU-UI-003a | Payroll admin view + payslip PDF | tenant.admin sees runs Jul APPROVED, Jun PROCESSED, May PROCESSED, Apr LOCKED = DB; test employee downloads PDF from /me/payslips: GET payslips/{id}/pdf 200 application/pdf, file 12344 bytes, starts `%PDF-`, net 23,806.45 = DB | as expected | PASS |
| NU-UI-003b | Employee sees released payslips only | not run to completion: the only employee with both released and unreleased slips has no known password | - | INCONCLUSIVE |
| NU-UI-003c | TENANT_ADMIN opens /payroll/payslips | "Access restricted" (2x) | DEF-E2E-03 | FAIL |
| NU-UI-004 | Hire: job, candidate, offer (suresh, RECRUITMENT_ADMIN) | Create Job (needs department): POST 201, DB OPEN; Add candidate (status Selected, experience/CTC required): POST 201, DB SELECTED; Generate Offer: POST .../offer 201, DB OFFER_EXTENDED, offered_ctc 750000, joining 2027-01-15 | as expected (console 403 on letters/templates, DEF-E2E-05) | PASS |
| NU-UI-005 | Grow: OKR objective + key result (arun) | New Objective: toast "Objective created successfully", DB DRAFT/INDIVIDUAL; Add Key Result: POST 200, DB target 100. The objective POST status was seen as a toast only in this run (resumed after a selector fix) | as expected (403 on company objectives, DEF-E2E-04) | PASS |
| NU-UI-006a | Employee wiki list + read | list API 200; opens ORG published page from the list, title shown | as expected | PASS |
| NU-UI-006b | HR admin creates + publishes wiki page | POST /knowledge/wiki/pages 400 (2x), DB count 0 | DEF-E2E-01 | FAIL |
| NU-UI-006c | Wall post | POST 201, post visible in UI, 1 row in social_posts | as expected | PASS |
| NU-UI-006d | Employee list excludes others' PRIVATE/DRAFT pages | list returns all 15 incl. PRIVATE/DRAFT with content (2x) | DEF-E2E-02 | FAIL |
| NU-UI-007 | Employee to /admin/* | 12 routes (`/admin`, users, roles, permissions, audit, settings, payroll, system, feature-flags, employees, integrations, import-keka) all land on /me/dashboard with no admin API calls; direct API: /admin/users, /users, /roles, /permissions 403; 3 others 404 | as expected | PASS |
| NU-UI-008 | 6 pages x 2 viewports | see table below | no horizontal overflow anywhere | PASS (overflow) |

## Viewports (1440x900 and 390x844; scrollWidth equals clientWidth in all 12 cases)
| Page | Role | Console errors (excl. WS noise) | Notes |
|---|---|---|---|
| /me/dashboard | employee | 3 per viewport | 3 unattributed 400s, no matching response captured |
| /leave | employee | 0 | |
| /performance/okr | employee | 2 per viewport | 403 /okr/company/objectives |
| /fluence/wiki | employee | 0 | |
| /payroll/runs | payroll admin | 0 | |
| /recruitment/candidates | recruiter | 2 per viewport | 403 /letters/templates/active |
Screenshots: `evidence/screenshots/NU-UI-008-*.png`. The 1440 approvals table clips the Actions column header inside its own scroller (no page-level overflow); visual call left to design.

## Counts
Executed 14 checks (journeys split into sub-checks): PASS 10, FAIL 3 (006b, 006d, 003c), INCONCLUSIVE 1 (003b). NU-UI-008 console errors recorded as Low defects.
Each FAIL reproduced twice (DEF-E2E-01 to 03). Nothing was fixed.
