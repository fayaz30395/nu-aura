# NU-HRMS functional journeys - results (2026-11-15)

Agent `hrms`. Local stack only (FE 3000, BE 8080). Real headless Playwright (Chromium 1440x900), API + read-only DB (app role, RLS on) verified per step.
Scripts: `evidence/scripts/hrms/` (lib.cjs, j1a..j11). Test data: `evidence/test-data-hrms.md`.

**Totals (44 items):** PASS 26 | FAIL 12 | BLOCKED 1 | INCONCLUSIVE 3 | NOT TESTED 2

## Harness notes (read first)
- Running FE bundle calls `http://backend:8080/api/v1` (docker host name, unresolvable) so UI login fails on this stack. Harness reroutes those requests to localhost:8080 through the browser context cookie jar (DEF-HRMS-ENV). All UI flows below go through the real UI and real backend.
- AUTH bucket (5/min/IP, shared by every agent) starved logins. After login, `/auth/me` is served from a once-fetched per-role cache inside the harness; sessions for the demo roles were created by API login (hradmin and the new employee NUAURA_TEST_001 logged in through the real login UI).
- Storage states hold tokens and live only in the session scratchpad, not in the repo. No secrets in evidence.
- Local-credential mechanism found: admin sets an initial password in Add Employee; first login forces change-password. Not email-invite only.

## Results
| ID | Scenario | Status | Sev | Evidence | Defect |
|---|---|---|---|---|---|
| NU-HRMS-E2E-001 | FE dev bundle API base is docker host http://backend:8080 -> browser login impossible without proxy | FAIL | Medium | logs/hrms/NU-HRMS-E2E-010-create-employee.json (failed ws/info backend:8080); screenshots/NU-HRMS-E2E-000-login-page.png | DEF-HRMS-ENV |
| NU-HRMS-E2E-002 | Page load + login share 5/min/IP AUTH bucket (/auth/me,/refresh,/login) -> 429 -> forced logout | FAIL | High | logs/hrms/NU-HRMS-E2E-020-login-429.txt | DEF-HRMS-01 |
| NU-HRMS-E2E-010 | HR admin creates NUAURA_TEST employee via UI (empty-submit validation, dept, designation, manager, submit) | PASS | - | screenshots/NU-HRMS-E2E-011..014; logs/NU-HRMS-E2E-010-create-employee.json; DB row verified | - |
| NU-HRMS-E2E-011 | HR admin assigns EMPLOYEE role to new user | FAIL | High | logs/hrms/NU-HRMS-E2E-011-role-assign.json (500, RLS on user_roles) | DEF-HRMS-02 |
| NU-HRMS-E2E-020 | New employee first login via UI -> forced change-password; weak pw rejected; pw changed; terminated check later | PASS | - | screenshots/NU-HRMS-E2E-021..023; DB password_change_required=f | - |
| NU-HRMS-E2E-030 | New employee My Space dashboard/profile/attendance/leaves load | PASS | - | screenshots/NU-HRMS-E2E-030-me-*.png; logs/NU-HRMS-E2E-030-employee-journey.json | - |
| NU-HRMS-E2E-031 | Employee check-in via UI -> API 201 -> DB row PRESENT | PASS | - | screenshots/NU-HRMS-E2E-031; DB attendance_records | - |
| NU-HRMS-E2E-032 | Employee check-out via UI | FAIL | Medium | logs/NU-HRMS-E2E-037-approve-journey.json (only Check In shown; client date vs tenant date) | DEF-HRMS-08 |
| NU-HRMS-E2E-033 | Check-out via API -> duration stored, double checkout 400 | PASS | - | logs/NU-HRMS-E2E-080-leave-rules.json | - |
| NU-HRMS-E2E-034 | Employee applies CL 2 days via UI; submit disabled when empty; balance created lazily 7/pending 2/avail 5 | PASS | - | screenshots/NU-HRMS-E2E-033..036; DB leave_requests, leave_balances | - |
| NU-HRMS-E2E-035 | Manager sumit sees request and approves via UI; DB APPROVED approved_by=sumit; balance used 2 avail 5; employee UI+API show Approved | PASS | - | screenshots/NU-HRMS-E2E-037..0391; logs/NU-HRMS-E2E-037-approve-journey.json | - |
| NU-HRMS-E2E-036 | Cancel approved leave restores balance (7/0/0) | PASS | - | DB (j9c)  | - |
| NU-HRMS-E2E-037 | Cancel pending restores pending; cancel requires reason param | PASS | - | logs/NU-HRMS-E2E-081-reject.json | - |
| NU-HRMS-E2E-040 | Manager rejects (UI+API) | FAIL | High | logs/hrms/NU-HRMS-E2E-081-reject.json (403 twice; HR_ADMIN reject 200, balance released) | DEF-HRMS-03 |
| NU-HRMS-E2E-041 | Overlap with approved leave rejected | PASS | - | logs/NU-HRMS-E2E-080-leave-rules.json | - |
| NU-HRMS-E2E-042 | Holiday-only / weekend-only range rejected | PASS | - | same | - |
| NU-HRMS-E2E-043 | Insufficient balance rejected | PASS | - | same (message shown) | - |
| NU-HRMS-E2E-044 | CL max 3 days/request enforced | FAIL | Medium | same (4 working days accepted) | DEF-HRMS-04 |
| NU-HRMS-E2E-045 | Past-dated leave rejected | FAIL | Medium | same (2025-01-06 accepted) | DEF-HRMS-04 |
| NU-HRMS-E2E-046 | End<start, short reason, half-day w/o period rejected | PASS | - | same | - |
| NU-HRMS-E2E-047 | Self-approve and peer approve -> 403 | PASS | - | same | - |
| NU-HRMS-E2E-050 | Regularization: invalid times 400, blank reason 400, submit->PENDING, self-approve 403, manager approve->PRESENT | PASS | - | logs/NU-HRMS-E2E-090-misc.json | - |
| NU-HRMS-E2E-051 | Regularization future date rejected | FAIL | Low | same (2030 date accepted) | DEF-HRMS-09 |
| NU-HRMS-E2E-052 | Regularized times honour tenant timezone | INCONCLUSIVE | Low | stored 17:30/02:30 for 09:00/18:00 input; JVM tz -03 vs tenant IST, local env | - |
| NU-HRMS-E2E-060 | Holiday CRUD, validation, employee create 403, employee list 200 | PASS | - | logs/NU-HRMS-E2E-050-admin-crud.json | - |
| NU-HRMS-E2E-061 | Duplicate holiday date rejected (400 no message) | PASS | Low | same | - |
| NU-HRMS-E2E-062 | Department create/dup 409/blank 400/employee 403 | PASS | - | same | - |
| NU-HRMS-E2E-063 | Parent cycle / self-parent rejected; parent can be cleared; delete after child delete | FAIL | Medium | logs/NU-HRMS-E2E-051-dept-cycle.json | DEF-HRMS-05 |
| NU-HRMS-E2E-064 | Designation CRUD | NOT TESTED | - | no designation entity: free-text field on employee | - |
| NU-HRMS-E2E-070 | Admin edit designation/level/manager persisted; self cannot change designation via /me | PASS | - | logs/NU-HRMS-E2E-090-misc.json | - |
| NU-HRMS-E2E-071 | Manager cannot be self or create a cycle | FAIL | Medium | same (self-manager and sumit<->nt1 cycle both 200) | DEF-HRMS-06 |
| NU-HRMS-E2E-072 | Hierarchy/subordinates endpoints and UI page render | PASS | - | screenshots/NU-HRMS-E2E-090-ui-org-hierarchy.png | - |
| NU-HRMS-E2E-080 | Terminated: status+user INACTIVE, old token 401 on all calls, new login 401 'User is disabled' | PASS | - | logs/NU-HRMS-E2E-100-termination.json | - |
| NU-HRMS-E2E-090 | Create/validate/submit/manager approve/reject(reason required)/double approve 409/self-approve 403 | PASS | - | logs/NU-HRMS-E2E-070-expense-asset-contract-benefit.json | - |
| NU-HRMS-E2E-091 | Allocate to employee, employee sees it, double assign 400, return, dup code 400, employee assign 403 | PASS | - | same | - |
| NU-HRMS-E2E-092 | Create contract (validation, employee 403) | PASS | - | same | - |
| NU-HRMS-E2E-093 | HR_ADMIN activates/terminates contract | FAIL | Low | same (403 on mark-active/terminate; DRAFT left) | DEF-HRMS-10 |
| NU-HRMS-E2E-094 | Plans/enrollment flow | BLOCKED | - | 0 active plans seeded; FE calls missing /benefits/plans/active (404); /benefits-enhanced/plans/eligible 400 for new employee | DEF-HRMS-10 |
| NU-HRMS-E2E-100 | My Space dashboard/profile/attendance/leaves reachable for 11 demo roles (hradmin,hrmgr,tadmin,mgr,tl,emp,emp2,saran,raj,fin,rec) | PASS | - | logs/NU-HRMS-E2E-040-myspace-all-roles.json; screenshots/NU-HRMS-E2E-040-* | - |
| NU-HRMS-E2E-101 | /me/documents redirects to /auth/login after load for all roles (finance also 403 on self-service doc APIs) | INCONCLUSIVE | Medium | logs/hrms/NU-HRMS-E2E-041 screenshots; harness caches /auth/me | DEF-HRMS-11 |
| NU-HRMS-E2E-110 | Employee A (arun) vs B (anshuman)/NT1: 19 direct API read/write calls | PASS | - | logs/NU-HRMS-E2E-060-idor-employee-vs-employee.json (all 403; list endpoint scoped to 0 rows) | - |
| NU-HRMS-E2E-111 | Expense claim create FOR other employee | INCONCLUSIVE | - | 400 on empty body, not retested with valid body | - |
| NU-HRMS-E2E-120 | Console/network errors on admin pages | FAIL | Low | logs/NU-HRMS-E2E-090-misc.json ui_bag (Mantine style warning; custom-fields 403; benefits 404) | DEF-HRMS-10 |
| NU-HRMS-E2E-130 | Viewports 1280/768/390 and empty/loading/error states sweep | NOT TESTED | - | time; only 1440x900 used | - |

Journey 1 (create -> role -> login -> My Space -> attendance -> leave -> manager approve -> balance math) passes except two defects: role assignment fails (worked around by a logged superuser insert of one user_roles row) and UI check-out.
Balance math verified in DB: CL opening 7; apply 2 -> pending 2/avail 5; approve -> used 2/pending 0/avail 5; cancel approved -> 7/0/0; reject releases pending.
Defect details: `evidence/defects-hrms.md`.
