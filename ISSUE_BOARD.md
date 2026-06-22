# NU-AURA Production Green-Flag — Live Issue Board

**Run:** 2026-06-10 (original) / **Run-3:** 2026-06-15 (current) · **Target env:** deployed (https://hrms-frontend-vert.vercel.app + Railway backend) · **Orchestrator:** Bridge Agent (Claude)

**Compressed-scope rule:** critical business paths only; only CRITICAL and HIGH issues block; MEDIUM/LOW logged for post-release.

## Audit Plan & Task Breakdown

| Task ID | Agent | Scope (compressed) | Priority | Dependency | Expected Output | Done When |
|---------|-------|--------------------|----------|------------|-----------------|-----------|
| BA-01 | ba | Business use cases for core modules (employee, leave, attendance, payroll, approvals); missing flows; acceptance criteria | P0 | — | docs/audit/green-flag/ba.md | Criteria defined for all P0 flows |
| PROD-01 | product | Screen/API/journey audit: dead ends, broken flows, missing validations on P0 paths | P0 | — | docs/audit/green-flag/product.md | Must-fix list prioritized |
| DEV-01 | dev | Architecture, API contracts, data models, implementation gaps with file-level fixes | P0 | — | docs/audit/green-flag/dev.md | Gaps with exact file refs |
| QA-01 | qa | Test matrix (role × CRUD × invalid × boundary × session × empty) + execution checklist | P0 | — | docs/audit/green-flag/qa.md | Matrix complete, expected results per case |
| RBAC-01 | rbac | Roles/permissions vs 04_RBAC_PERMISSION_MATRIX.md; escalation risks; SuperAdmin bypass = BY DESIGN | P0 | — | docs/audit/green-flag/rbac.md | All P0 boundaries verified |
| SEC-01 | security | AuthN/Z, injection, data exposure, secrets, rate limits, session, OWASP (API + UI abuse) | P0 | — | docs/audit/green-flag/security.md | Findings with severity + remediation |
| DATA-01 | data | CRUD flows: required fields, duplicates, referential integrity, audit trail, tenant isolation, concurrency | P0 | — | docs/audit/green-flag/data.md | All P0 creation flows assessed |
| INT-01 | integration | Kafka/Redis/ES/MinIO/email/webhooks: failure handling, retries, timeouts, idempotency, observability | P1 | — | docs/audit/green-flag/integration.md | Failure modes mapped |
| UI-01 | ui | Browser: login per role, RBAC visibility, create/update/delete, validations, errors, leave-approval E2E | P0 | Chrome connected | docs/audit/green-flag/ui.md | P0 journeys pass/fail recorded |
| REL-01 | release | Wave 2: tsc --noEmit, backend build, Flyway chain, monitoring, rollback, smoke | P0 | Fixes landed | docs/audit/green-flag/release.md | Sign-off or blockers listed |

## Issue Board

Severity: CRITICAL | HIGH | MEDIUM | LOW · Status: Open → In Progress → Fixed → Retest → Closed

| ID | Severity | Module | Description | Impact | Exact Fix | Owner Agent | Status |
|----|----------|--------|-------------|--------|-----------|-------------|--------|
| ENV-1 | HIGH | tooling | Claude-in-Chrome extension not connected; UI wave blocked | No browser-based UI/RBAC validation until connected | RESOLVED via Playwright suite against local stack (frontend :3001 → backend :8090, fixed build) | orchestrator | Closed |
| BA-1 | CRITICAL | payroll | Payslip hardcodes workingDays(30)/presentDays(30)/leaveDays(0); PayrollAdjustment rows never read | Every payslip ignores attendance/LOP/OT/reimbursements | Compute days from attendance + apply PayrollAdjustment in PayrollRunService.java:321-323 | fix-payroll | Closed |
| DATA-2 | CRITICAL | employee/auth | deleteEmployee only sets Employee TERMINATED; User stays ACTIVE; isEnabled() hardcoded true | Terminated employees log in indefinitely | Deactivate User on termination; user status wired into UserPrincipal.isEnabled(). REG-2 proved unrelated (stale test vs SEC-3c); REG-3 fixed (SUSPENDED enum). Full suite green after fixes | fix-auth | Closed |
| DATA-1 | CRITICAL | leave | No endDate>=startDate validation → negative totalDays inflates own balance | Self-service balance-inflation exploit | Range validation in DTO + service; clamp signs in LeaveBalance | fix-leave | Closed |
| BA-2 | CRITICAL | leave | Workflow rejection (onRejected :452-473) never releases pending balance | Every inbox-rejected leave permanently leaks reserved days | Call releasePendingLeave in onRejected like direct path :242 | fix-leave | Closed |
| PROD-1 | CRITICAL | payroll | /payroll/runs/[id] page missing; payroll/page.tsx:338,572 link to it | Core payroll journey 404 dead-end | Create detail page or repoint links | fix-payroll | Closed |
| SEC-1 | HIGH | secrets | Live Neon DB password + JWT secret + enc key in git history (commit d5961fef) and local .env files | Token forgery (incl. SuperAdmin) + direct DB access for anyone with repo history | USER ACTION: rotate Neon pwd, JWT secret, enc key; purge history; gitleaks in CI | USER + release | Open |
| RBAC-1 | HIGH | benefits | 6 /employee/{id} GETs accept BENEFIT_VIEW_SELF but service scopes only by tenant (IDOR) | Any employee reads colleagues' enrollments/claims | Mirror EmployeeController.enforceEmployeeViewScope in BenefitEnhancedService | fix-rbac | Closed |
| RBAC-2 | HIGH | leave | /leave-balances/employee/{id} VIEW_SELF lacks self/team scope check (IDOR) | Cross-employee leave balance exposure | Add ownership/team scope enforcement | fix-rbac | Closed |
| RBAC-3 | HIGH | statutory | STATUTORY_VIEW underscore literals never match colon-seeded STATUTORY:VIEW | PF/ESI/LWF/TDS pages 403 for everyone but SuperAdmin | Replace literals with Permission.* constants in StatutoryContributionController + TDSController | fix-rbac | Closed |
| DEV-1 | HIGH | workflow | processApprovalAction has no pessimistic lock / @Version | Double-approve fires callbacks twice (duplicate payouts) | Copy PayrollRunService findByIdAndTenantIdForUpdate pattern + @Version | fix-workflow | Closed |
| BA-8 | HIGH | workflow/tenant | Workflow definitions seeded for demo tenant only; provisioning seeds none | Leave/expense submission hard-fails for every new tenant | Provisioning seeding verified + NEW V285__backfill_default_workflow_definitions.sql (idempotent, RLS-safe per V265 pattern, rollback-tested on live DB: 7 defs/10 steps for 1 gap tenant). 2026-06-11: service-layer idempotency guard added to TenantProvisioningService.seedWorkflow (existsByTenantIdAndNameAndIsActiveTrue) after independent verifier flagged the gap | fix-workflow | Closed |
| BA-3/DATA-5 | HIGH | leave | Half-day: no single-day invariant; My Leaves never sends halfDayPeriod (BE @AssertTrue requires it) | Half-day over range deducts 0.5d; FE half-day always 400 | Enforce single-day for halfDay in BE; send halfDayPeriod from FE; align reason min length | fix-leave | Closed |
| BA-4/DATA-4 | HIGH | leave | updateLeaveRequest trusts client totalDays; pending reservation never re-adjusted | Balance corruption on edit | Recompute server-side; release+re-reserve pending on update | fix-leave | Closed |
| BA-6/DATA-3 | HIGH | leave | Overlap check covers APPROVED only; never re-checked at approval | Duplicate overlapping leaves approvable | Include PENDING in overlap query; re-validate at approval | fix-leave | Closed |
| DATA-6 | HIGH | payroll | (tenant,year,month) index non-unique (V92); period editable w/o dup check | Duplicate payroll runs per period | New Flyway V283 unique index + dup check in updatePayrollRun | fix-payroll | Closed |
| DEV-2 | HIGH | survey | FE calls /survey-management/* — backend is /survey-analytics/* | 3 survey pages broken | Repoint useSurveyQuestions.ts paths | fix-contracts | Closed |
| DEV-3 | HIGH | dashboard | spotlight.service.ts calls /spotlights/* — no controller exists | Dashboard widget + page 404 | Hide widget/page or implement controller | fix-contracts | Closed |
| DEV-4 | HIGH | time-tracking | utilization.service.ts calls 8 nonexistent /time-tracking/reports/* | /reports/utilization dead | Hide page or repoint to existing reports | fix-contracts | Closed |
| DEV-5 | HIGH | loans | FE/BE endpoint mismatches (payment vs repayment etc.) | Loan lifecycle actions broken | Repoint FE service to actual BE routes | fix-contracts | Closed |
| DEV-6 | HIGH | helpdesk | /helpdesk/knowledge-base endpoints don't exist | KB page dead | Hide page or repoint | fix-contracts | Closed |
| INT-1 | HIGH | kafka | PAYROLL_PROCESSING_DLT missing from DeadLetterHandler listener topics | Failed payroll runs silently expire | Add topic to @KafkaListener array (DeadLetterHandler.java:112) | fix-integration | Closed |
| INT-2 | HIGH | docusign | HttpRequest built without .timeout() ×3 | Threads hang forever | .timeout(Duration.ofSeconds(30)) added at ALL 7 builder sites (DocuSignApiClient ×6, DocuSignAuthService ×1) — superset of the 3 originally cited; independently verified | fix-integration | Closed |
| INT-4 | HIGH | webhooks | Retry sweep selects only RETRYING; PENDING/DELIVERING orphaned on crash | Webhook deliveries silently dropped | Include stale PENDING/DELIVERING in sweep with age threshold | fix-integration | Closed |
| PROD-2 | HIGH | leave | computeLeaveDays excludes weekends but not tenant holidays | Over-deduction; wrong LOP money math | Subtract holiday calendar in LeaveRequestService.computeLeaveDays | fix-leave | Closed |
| PROD-3 | HIGH | payroll | LWF calculateForPayrollRun unimplemented (501), flag default false | LWF remittance empty — IN statutory gap | DESCOPED: useCalculateLWF exists in lib/hooks/queries/useLWF.ts:122 but is NOT called by any frontend/app/ page. The 501 endpoint is unreachable from the UI. Formally closed as dead-code risk. | release | Closed |
| PROD-4 | HIGH | payroll | US/UK statutory calculators are 501 stubs, selectable | Payroll run fails mid-run for US/UK | Enforce IN-only at validation | fix-payroll | Closed |
| QA-1 | HIGH | env | V272 suspends demo users unless DEMO_CREDENTIALS_ENABLED=true | UI testing blocked locally; if true in prod → seeded SUPER_ADMINs live | VERIFIED: base+prod fail-closed false (application.yml:112, application-prod.yml:98), dev/demo opt-in true; local run migrated with flag=true, demo logins work. Prod deploy checklist item exists (docs/HANDOVER-DEPLOY.md:35) — manual control, keep on release checklist | release + USER | Fixed |
| QA-2 | HIGH | rbac/seed | FinanceAdmin persona in matrix but no FINANCE_ADMIN role/user seeded | Payroll boundary untestable as intended | NEW V286__seed_finance_admin_role.sql: FINANCE_ADMIN role + 23 permission grants (demo tenant), finance@nulogic.io demo user gated by DEMO_CREDENTIALS_ENABLED (fail-closed in prod), idempotent, rollback-tested. Follow-up: repoint e2e fixtures (roles.json maps FINANCE_ADMIN to stand-in bharath@) | release | Fixed |
| INT-3 | HIGH | kafka | No transactional outbox; 15/16 publishes fire-and-forget | Events dropped if broker down post-commit | Outbox pattern — too large for this window; document as known risk | release | Open |
| BA-5 | HIGH | workflow | Direct approve path orphans live WorkflowExecution | Stuck executions | Guard direct path when workflow exists | fix-workflow | Closed |
| REG-1 | CRITICAL | payroll | NEW (found by verification fleet): BA-6 widened findOverlappingLeaves to include PENDING; PayrollRunService.computeApprovedLeaveDays applied no status filter → PENDING leaves counted in payslip leaveDays/presentDays money math | Wrong pay for any employee with pending leave in period | APPROVED-only filter added in computeApprovedLeaveDays (PayrollRunService.java:~530) + regression test shouldCountOnlyApprovedLeavesInPayslipLeaveDays (PayrollRunServiceTest 26/26 green) | orchestrator | Fixed |
| REG-2 | HIGH | auth | Full regression run — MFA login test 401. ROOT CAUSE: stale test vs intentional SEC-3c pre-auth mfaToken hardening (f254e416), NOT a DATA-2 side effect | None (production behavior correct) | Test updated to SEC-3c contract (AuthControllerTest.java:246-274, both valid+wrong-code paths); 22/22 green | fix-auth | Closed |
| REG-3 | CRITICAL | admin | Full regression run — GET /api/v1/admin/users 500. ROOT CAUSE: V270/V272 write status='SUSPENDED' in every non-demo deploy but UserStatus enum lacked SUSPENDED → Hibernate throws on loading any suspended user | Admin user management would 500 in production | SUSPENDED added to UserStatus (User.java:174-189) with locked-out semantics (disabled in UserPrincipal, blocked by AuthService != ACTIVE checks, rehire path keeps suspended locked); SmokeUseCaseIntegrationTest 10/10 green | fix-auth | Fixed |
| BA-5b | MEDIUM | workflow | NEW: BA-5 orphan-execution guard is leave-only; EXPENSE_CLAIM (ExpenseClaimService.approveExpenseClaim:202) and LOAN_REQUEST (LoanService.approveLoan:82) direct-approve paths ship unguarded with workflows always started on submit | Stuck workflow executions for expense/loan | cancelActiveExecutionForEntity added to both paths in green-flag run-2 (a5c50820): ExpenseClaimService.java:216, LoanService.java:107 — verified 2026-06-15 | fix-gflag2 | Closed |
| INT-5 | MEDIUM | integration | NEW: un-timed HttpRequest builders outside INT-2 scope: AuthService.java:453,479 (Google OAuth) and SlackNotificationService.java:134,177,232 | Same thread-hang class as INT-2 | .timeout(Duration.ofSeconds(30)) added ×5 in green-flag run-2 (a5c50820): AuthService.java:454,460,488, SlackNotificationService.java:137,182,239 — verified 2026-06-15 | fix-gflag2 | Closed |
| RACE-1 | MEDIUM | leave | NEW: approval-time overlap re-check is read-only; two overlapping PENDING requests approved concurrently via two different workflow executions can both reach APPROVED (DEV-1 lock serializes same-execution only) | Duplicate overlapping approved leave under racing approvers | V294__leave_overlap_exclusion_constraint.sql: btree_gist EXCLUDE constraint on (tenant_id=, employee_id=, daterange(start_date,end_date,'[]')&&) WHERE status='APPROVED' AND is_deleted=false — commit-time enforcement, GlobalExceptionHandler maps to 409 — 2026-06-15 | fix-race1 | Fixed |
| SEC-2 | MEDIUM | auth/frontend | NEW (found by UI triage): login form had no method="post"/pre-hydration guard — a native submit before React hydrates issued GET /auth/login?email=...&password=..., leaking credentials into URL/history/server logs (observed in Playwright traces) | Credential leak on slow connections; also root mechanism of ~20 UI login flakes | method="post" added (app/auth/login/page.tsx:~772) AND follow-up landed 2026-06-11: submit button disabled until hydrated (isHydrated state, SSR-disabled → effect-enabled), eliminating the pre-hydration native-POST flake class deterministically | orchestrator | Closed |
| TEST-1 | MEDIUM | e2e-suite | UI triage verdict on 64 Playwright failures: 0 real app bugs. 22 leave specs assert removed modal UI (now /leave/apply + unified /leave/approvals inbox); 'Annual Leave' taxonomy mismatch (tenant seeds Earned/Casual/Sick); nu-rbac.spec silently generates 0 tests (use-cases.yaml missing); several vacuous `\|\| true` assertions in rbac-employee-boundaries can't detect real RBAC regressions; benefit plans/payroll runs unseeded (0 rows) so flows no-op | E2E suite cannot currently regression-protect the redesigned leave flow or RBAC denials | FIXED (2026-06-15): (1) LeavePage.ts rewritten for /leave/apply page flow (no modal); (2) leave.spec.ts, leave-flow.spec.ts, leave-approval-chain.spec.ts, smoke.spec.ts, my-space.spec.ts — all modal assertions migrated to page-based assertions; (3) 4 vacuous `\|\| true` assertions removed from fnf-settlement, lms-catalog, payroll-flow; (4) use-cases.yaml created at .claude/skills/nu-chrome-e2e/ with 54 RBAC cases across 9 roles — nu-rbac.spec now generates real tests; (5) testData.ts testLeave types fixed from ANNUAL/SICK/CASUAL to 'Earned Leave'/'Sick Leave'/'Casual Leave' (matching V72 EL/SL/CL seeds); LeavePage.ts annualLeaveBalance locator updated to 'Earned Leave'; leave.spec.ts 'Leave Approval Chain' describe block rewritten to use /leave/apply page (commit 997d71ce). REMAINING: benefit plan/payroll run seeding (flows no-op on empty tables) | release | Fixed |
| MIG-RLS | LOW | migrations | NEW: V283 dedup UPDATE / V284 backfill UPDATE run without app.current_tenant_id; silently no-op if Flyway ever runs as RLS-constrained role (V264 precedent). Safe under documented BYPASSRLS Flyway role; V285 already uses the safe per-tenant set_config pattern | Migration chain could fail loudly on constrained role | Documented; align V283/V284 to V265 pattern if Flyway role policy changes | release | Open |
| SEC-3 | HIGH | statutory | NEW (2026-06-15): GET /statutory/payslip/{payslipId} called findByPayslipId() with no tenantId filter — any user with STATUTORY_VIEW could fetch cross-tenant statutory data by guessing a payslip UUID | Cross-tenant statutory contribution data exposure | Added findByPayslipIdAndTenantId to MonthlyStatutoryContributionRepository; StatutoryService.getContributionByPayslip now passes requireCurrentTenant() — commit 78e97593 | principal-eng | Fixed |
| SEC-4 | MEDIUM | wall | NEW (2026-06-15): GET /wall/posts/{postId}/reactions/details and GET /wall/posts/{postId}/comments called findAllByPostIdWithDetails/findTopLevelCommentsByPostId with no tenantId — cross-tenant wall content readable by any employee with WALL_VIEW | Cross-tenant social content exposure (employee names, reactions, comments) | Added tenantId param to both repository queries; WallService passes requireCurrentTenant() for both calls — commit below | principal-eng | Fixed |
| RBAC-4 | HIGH | benefits | NEW (retest finding): getClaim/appealClaim keyed by claimId + submitClaim keyed by enrollmentId had no ownership check (IDOR) | Cross-employee claim read/appeal/submit | Ownership checks verified by independent re-verification 2026-06-11: getClaim guard BenefitEnhancedController.java:230-234, appealClaim :278-284; submitClaim enforced at SERVICE layer only (BenefitEnhancedService.submitClaim:403-413, enrollment owner vs current employee) — note appealClaim double-fetches the claim (minor perf, post-release) | fix-residual | Closed |
| CONS-1 | MEDIUM | payroll/leave | NEW (retest finding): holiday filters diverged (payroll counted restricted holidays as off; leave didn't) | Payroll vs LOP math off by 1 day on restricted holidays | PayrollRunService.java:349-357 aligned to leave rule + regression test shouldExcludeOptionalAndRestrictedHolidaysFromWorkingDays — independently verified 2026-06-11 | fix-residual | Closed |
| PERF-1 | LOW | payroll | NEW (verifier 2026-06-11): computeApprovedLeaveDays calls findOverlappingLeaves per employee per run; BA-6 broadened that query to include PENDING rows, growing result sets for large tenants with many pending leaves | Payroll-run latency growth on large tenants (correctness unaffected — REG-1 filter holds) | Track post-release; consider status filter push-down into a payroll-specific query | release | Open |
| DEFER | MED/LOW | various | ~30 MEDIUM/LOW findings + cosmetic gaps from verification. Fixed: helpdesk KB card hidden when API unavailable (5788b884); dead report hooks removed (useScheduledReportById/useEmployeeUtilization/useAllEmployeesUtilization/useExportUtilizationReport — 5788b884); survey delete DEFER stale (both pages already gated with PermissionGate). Remaining: TEST-1 benefit/payroll seed; ~26 cosmetic gaps in audit docs | Non-blocking | See docs/audit/green-flag/*.md per agent + verification fleet output | release | In Progress |

## Green-Flag Criteria (ALL must be true for GO)

- [x] Zero open CRITICAL security issues (all 5 original CRITICALs + REG-1/REG-3 Fixed/Closed; SEC-1 secret rotation is HIGH and user-gated)
- [x] Zero open CRITICAL RBAC gaps (RBAC-1/2/3 closed via verification fleet; RBAC-4 IDOR fixed + tested; SuperAdmin bypass verified by design)
- [x] Must-have business flows pass via UI (60 passed/0 failed: 15 demo-user logins, RBAC boundaries, payroll, benefits; leave creation + DATA-1 validation verified via new greenflag-leave-apply spec — PENDING row artifact captured; approval chain verified at integration level, UI spec rewrite = TEST-1 debt)
- [x] Creation flows validated (leave via UI; payroll duplicate-guard via V283 on live data + tests; 4,054-test regression green after 2 fixes)
- [x] `npx tsc --noEmit` clean · backend compile clean · full `mvn test` green (4,054 tests, 2 failures root-caused and fixed)
- [ ] Deployment checklist + rollback (HANDOVER-DEPLOY.md exists; GATES: commit this working tree + CI green, B3 public backend host still credential-gated, DEMO_CREDENTIALS_ENABLED unset in prod — manual)
- [x] Monitoring/logging active (Prometheus/Grafana/AlertManager stack up; backend health/readiness probes verified)
- [x] Remaining known issues documented with severity here (SEC-1, PROD-3 descope decision, INT-3 outbox, BA-5b, INT-5, RACE-1, MIG-RLS, SEC-2 follow-up, TEST-1)

**Verdict 2026-06-10 (orchestrator):** CONDITIONAL GO — engineering-green locally on the fixed build; gates above are credential/decision items, not code.

**Independent re-verification 2026-06-11 (fresh-context verifier subagent, line-by-line vs working tree):** APPROVE — all Closed/Fixed/Retest claims VERIFIED at code level (0 CRITICAL/HIGH discrepancies). 2 PARTIALs remediated same-session (BA-8 service-layer idempotency guard added; RBAC-4/INT-2 board wording corrected). Same-session evidence: backend compile clean · `tsc --noEmit` clean · frontend `next build` clean (264 pages) · frontend unit 2,419/2,419 · backend full suite 4,055/4,055 green · live preview on :3000 against backend :8090 with SUPER_ADMIN login 200.

---

## Run-3 Findings (2026-06-14/15) — agents: rbac-2026-06-14, security-2026-06-14, dev-2026-06-14, ui-live-2026-06-14

| ID | Severity | Module | Description | Impact | Exact Fix | Owner Agent | Status |
|----|----------|--------|-------------|--------|-----------|-------------|--------|
| RBAC-5b | HIGH | employee/skills | `EmployeeSkillController.getEmployeeSkills` gated only by EMPLOYEE_VIEW_SELF; no self/team scope check — IDOR (per rbac-2026-06-14.md) | Any employee reads colleague skills | `enforceEmployeeViewScope(employeeId)` called at controller line 58 (already present at code review — ALREADY FIXED in a prior commit) | fix-rbac | Closed |
| RBAC-6b | HIGH | analytics/dashboard | `DashboardsController.getEmployeeDashboardById` EMPLOYEE_VIEW_TEAM with no team-scope guard (per rbac-2026-06-14.md) | Manager reads any employee dashboard | `enforceEmployeeDashboardViewScope(employeeId)` called at controller line 195 (already present — ALREADY FIXED in a prior commit) | fix-rbac | Closed |
| RBAC-7 | MEDIUM | probation | `ProbationService.acknowledgeEvaluation` no ownership check — any employee can acknowledge colleague's evaluation by guessing evaluationId | Tamper with another employee's probation record | Ownership guard added: resolve `evaluation.getProbationPeriod().getEmployeeId()` and assert equals `SecurityContext.getCurrentEmployeeId()` (allow SuperAdmin/TenantAdmin/HRManager bypass) — ProbationService.java:~338 — 2026-06-15 | fix-gflag3 | Fixed |
| RBAC-8 | MEDIUM | survey | `SurveyAnalyticsService.submitResponse` trusts `request.getEmployeeId()` from client body instead of SecurityContext | Response spoofing — caller attributes a response to arbitrary employeeId | For non-anonymous surveys, `resolvedEmployeeId = SecurityContext.getCurrentEmployeeId()` overrides client body; anonymous surveys leave null — SurveyAnalyticsService.java:~99 — 2026-06-15 | fix-gflag3 | Fixed |
| SEC-3b | CRITICAL | deploy/auth | Railway deployed backend runs with `DEMO_CREDENTIALS_ENABLED=true` → V270/V272 fail-closed lockdown no-op → Welcome@123 SUPER_ADMINs live on public URL | Unauthenticated → SUPER_ADMIN takeover of live tenant | USER ACTION: Set `DEMO_CREDENTIALS_ENABLED=false` (or unset) in Railway env dashboard; verify Flyway re-runs V270/V272 on next deploy (or trigger manually). Code is correct — this is a deployment env override. | USER + release | Open |
| SEC-4 | HIGH | secrets | Live Groq AI API key `gsk_ryq7hgo9...` in `backend/.env:36` (working tree, gitignored) | AI quota abuse if file exposed; leak risk if accidentally committed | USER: Rotate key at console.groq.com; verify `git log -S 'gsk_ryq7hgo9' --all` shows no history hit | USER | Open |
| DEV-7 | HIGH | deploy/runtime | Smoke test (remote-deployed-route-smoke.json) shows SUPER_ADMIN + EMPLOYEE logins failing on Vercel (loginOk:false) — cold-start backend, possibly stale Railway build or DEMO_CREDENTIALS_ENABLED flip | Users can't login to deployed app on cold start | UI live agent (2026-06-15) confirmed logins DO work when backend is warm. Root cause: Railway cold-start (~30s). Partially mitigated by a1b93223 (GET timeout 120s→30s = faster retry). Remaining: Railway wake-up time | release | In Progress |
| UI-03 | HIGH | notifications | Leave approval by manager does NOT deliver notification to employee; unread count=0 after approval | Employee unaware of leave decisions | Backend fix in a5c50820 (NOTIF-1) is code-merged; deployed Vercel build may pre-date it. After Railway re-deploy, re-test notification delivery | release | In Progress |
| UI-04 | MEDIUM | backend stability | Multiple API endpoints timeout/NetworkError on cold start (notifications, workflow/inbox, home/holidays, birthdays, etc.) | Degraded dashboard on cold start; 30-60s spinner | a1b93223 reduces retry from 120s→30s. Railway keep-alive or paid tier would eliminate. Document as known cold-start behaviour | release | In Progress |
| UI-05 | MEDIUM | WebSocket | WebSocket connection fails attempt 1/5 on cold start ("Session closed") | Real-time notifications unavailable until reconnect | SockJS fallback reconnects automatically (1/5 observed). Monitor post-warm-up. If persistent, check STOMP broker config on Railway | release | In Progress |
| UI-07 | MEDIUM | seed data | Demo user "Saran V" labelled EMPLOYEE in demo panel but in-app shows HR_ADMIN role | RBAC testing against wrong role; false positives in UI audit | Correct Flyway seed or demo-panel label; already reconfirmed UI-01/UI-02 CRITICAL = false positive (separate EMPLOYEE recheck passed all routes) | release | Open |
| DEV-8 | HIGH | payroll/statutory | LWF `calculateForPayrollRun` not implemented (returns emptyList, flag=false) — re-confirmed 2026-06-14 | IN statutory LWF remittance gap | Formally descoped for this release (PROD-3 decision) — keep `app.features.lwf=false`; documented known risk | release | Open (descoped) |
| UX-01 | LOW | payroll | Payroll Run History table headers scroll out of view on long run lists | Poor UX for tenants with many payroll runs | `<thead className="sticky top-0 z-10 bg-[var(--surface)]">` added — payroll/page.tsx:534 — commit 74c61449 | fix-gflag3 | Fixed |
| UX-03 | LOW | leave | Leave balance Ring indicators have no hover tooltip; balance breakdown only readable via aria-label | Accessibility + discoverability gap | Mantine Tooltip wrapping Ring at leave/page.tsx:270 — shows `${leaveName}: ${remaining} of ${total} · ${used} used` — commit 74c61449 | fix-gflag3 | Fixed |

## Run-3 Test Evidence (2026-06-15)

- **Backend unit tests:** 3,931 tests · 0 failures · 0 errors · 0 skips (unit suite; Testcontainers integration tests excluded) — RBAC-7 + RBAC-8 fixes clean — see `docs/audit/green-flag/test-run-2026-06-15.md`
- **Frontend TypeScript:** `tsc --noEmit` exit 0 · zero type errors across all modified files
- **Browser validator agent:** still running (warm-path login, RBAC boundaries, leave flow on deployed Vercel app)
- **Commits:** fca3178b (RBAC-7 + RBAC-8 + issue board), 74c61449 (QW1 + QW4 + Mockito fix + audit docs)

---

## Run-4 (2026-06-21) — 10h Autonomous Green-Flag — Orchestrator: Bridge (Claude Opus 4.8)

**Method:** code-for-root-cause + browser-for-truth on LIVE (Vercel FE + Railway BE). Chrome MCP extension is DISCONNECTED → browser-truth via Playwright (production config, real demo login) + live HTTP/API probes with cookie auth. Backend warm (health UP).

**KILL-SWITCH NOTE:** No deploy issued yet this run. Live backend deploy is `d5486d46` (2026-06-17, SUCCESS) — **4 days stale**; HEAD `f1f530c4` (V307/V308 + fixes) NOT deployed. If a Wave-2 batched deploy fails its smoke gate → halt deploys, keep `d5486d46` live, log CRITICAL, test-only.

| ID | Severity | Module | Description | Impact | Exact Fix | Owner | Status |
|----|----------|--------|-------------|--------|-----------|-------|--------|
| R4-SEC-3b | CRITICAL | deploy/auth | Live demo `Welcome@123` SUPER_ADMIN login returns 200 + full roles on Railway+Vercel, **despite `DEMO_CREDENTIALS_ENABLED=false`** in Railway env. Root cause: neutralization migrations V270/V295/V299 are gated on Flyway placeholder `${demoCredentialsEnabled}` and already ran ONCE (when placeholder was true) → recorded applied → Flyway never re-runs them. Env flip alone is now a no-op. | Public unauth → SUPER_ADMIN takeover of live tenant on true-prod | Add a NEW migration `V309__neutralize_demo_credentials.sql` (fresh version, same hash-list + sentinel, gated on `${demoCredentialsEnabled}`) OR run V299's SQL block directly on Railway PG. **Kept ENABLED intentionally for this campaign per owner policy (demo accounts = test identities).** Final pre-prod step. | release/USER | Open (intentional during run) |
| R4-RBAC-1 | HIGH | rbac/roles | Live demo tenant role catalog has only **8 roles — missing `TENANT_ADMIN` and `PAYROLL_ADMIN`** (GET /api/v1/roles as SUPER_ADMIN). `tenant.admin@nulogic.io` logs in 200 with `roles:[]` → 403 on every module. Root cause: demo tenant (V19/V49) seeded without an `ADMIN` row → V290 rename found 0 rows → no TENANT_ADMIN created; V305 PAYROLL_ADMIN loop found 0 rows. | TENANT_ADMIN tier non-functional; TENANT_ADMIN-exclusive grants (REVIEW:*, agency CRUD, Fluence knowledge mgmt) have no working user except SUPER_ADMIN-bypass; latent fresh-tenant provisioning gap | **Fix already committed**: `V307__seed_missing_payroll_admin_and_tenant_admin_roles.sql` + `V308__backfill_missing_permission_catalog_codes.sql` (idempotent, ON CONFLICT DO NOTHING). **Undeployed** — ships in Wave-2 batched Railway deploy, then re-verify TENANT_ADMIN appears live + tenant.admin gets roles. | release | Open (fix staged, undeployed) |
| R4-DEPLOY-1 | HIGH | devops | Railway backend not auto-deploying `main`: last deploy 2026-06-17, HEAD is 4 days ahead (V300 outbox, V301–V308, BROWSER-ISSUE-006 proxy gate all absent live). | Committed fixes never reach users; live ≠ repo | Trigger a gated redeploy of HEAD to Railway (Wave-2); confirm Flyway applies V300–V308; verify GitHub auto-deploy hook or document manual-deploy requirement | release | Open |
| R4-INFO-1 | INFO | rbac | RBAC scoping for the 8 real roles verified healthy live: MANAGER→payroll 403 + users 403; HR_MANAGER→users 403; HR/SUPER_ADMIN broad 200. POST→403 uniform across ALL roles incl SUPER_ADMIN = CSRF (missing X-XSRF-TOKEN header in probe), NOT an RBAC defect. | — | — | rbac | Closed (verified) |

**Live evidence captured:** `/tmp/rbac_matrix.txt` (11-account × 20-endpoint live RBAC sweep), `/tmp/sa_login.json` (SEC-3b proof), `/tmp/roles.json` (8-role catalog). Railway env confirmed via MCP: DEMO_CREDENTIALS_ENABLED=false, FLYWAY enabled, last deploy d5486d46 2026-06-17.

### Run-4 additional findings + Deploy Log

| ID | Severity | Module | Description | Impact | Exact Fix | Owner | Status |
|----|----------|--------|-------------|--------|-----------|-------|--------|
| R4-UI-03 | HIGH | leave/notifications | Live: leave apply (saran→201 PENDING) + manager approve (sumit→200 APPROVED) works, but employee `GET /api/v1/notifications` stays EMPTY after approval — no in-app notification of leave decision. Reproduced live on stale build. Root cause: stale deploy lacks effective NOTIF-1 persistence. HEAD `LeaveRequestService.notifyLeaveApproved` (NOTIF-1) resolves employee→user id and persists via `WebSocketNotificationService.persistQuietly` → `notificationRepository.save`. | Employees unaware of leave decisions in-app | Deploy HEAD (NOTIF-1 already committed). Verify post-deploy that approval persists a notification under recipient user id. | release | Retest (fix in HEAD, deploying) |
| R4-CRUD-1 | INFO | departments | Live full CRUD verified as SUPER_ADMIN with CSRF: CREATE 201 → UPDATE 200 → DELETE 204 → GET 404. Write-path functional; test data cleaned up. | — | — | qa | Closed (verified live) |
| R4-LEAVE-1 | INFO | leave | Live leave lifecycle apply→approve→cancel verified (201/200/200). Balance validation + manager-scope approval enforced. Test record cancelled (cleanup). Note: create requires `employeeId` in body — IDOR check (does service reject employeeId≠caller?) flagged to sec-audit. | — | — | qa | Closed (verified live) |

#### DEPLOY LOG
| Batch | Deploy ID | Shipped | Build | Smoke Gate | Result |
|-------|-----------|---------|-------|------------|--------|
| B1 | d993180f-bd68-4343-8513-4f9732fe9637 | HEAD f1f530c4 → Railway BE: V300-V308 (TENANT_ADMIN/PAYROLL_ADMIN seed + perm backfill), NOTIF-1, BROWSER-ISSUE-006, outbox. Aligns 4-day-stale BE with main. | in-progress | pending | — |

**Prior live deploy (rollback target):** d5486d46 (2026-06-17 SUCCESS).

### Run-4 feat-scan findings (code-level breadth, HEAD)

| ID | Sev | Module | Description | Evidence | Triage |
|----|-----|--------|-------------|----------|--------|
| R4-F-001 | MEDIUM | payroll/LWF | `LWFService.calculateForPayrollRun` throws UnsupportedOperationException (501) when `app.features.lwf=false` (default). = DEV-8 carry-over. | LWFService.java:296, LWFController.java:139 | **Descoped (PROD-3)** — IN LWF off for release; main payroll run skips LWF when flag off. Documented known risk, not a blocker. |
| R4-F-002 | HIGH (latent) | payments | `RazorpayAdapter`/`StripeAdapter.parseWebhookPayload` throw UnsupportedOperationException → payment webhooks 500. `APP_PAYMENTS_ENABLED=true` on Railway BUT no Razorpay/Stripe provider keys configured (no webhooks arrive). | RazorpayAdapter.java:137, StripeAdapter.java:142, PaymentService.java:276 | Latent — no provider wired. **Fix before enabling a real payment provider**: implement parser OR set APP_PAYMENTS_ENABLED=false. Not blocking current demo/prod (no live provider). |
| R4-F-003 | MEDIUM | mobile/leave | `MobileLeaveService.getLeaveBalance` 501 (`app.features.mobile-leave-balance=false` default). | MobileLeaveService.java:79 | Latent — mobile leave-balance feature off; no mobile client shipping. Document. |
| R4-F-004 | MEDIUM | payroll/statutory | US/UK statutory calculators throw; no `isImplemented()` guard in factory → 500 if a tenant's country=US/GB. | UsStatutoryCalculator.java:52, StatutoryCalculatorFactory.java | IN-only launch → not triggered. Add factory guard returning 422 for unimplemented countries (defensive). Not blocking IN. |
| R4-F-008 | LOW | projects | Projects calendar hardcodes `return [] as TaskWithProject[]` → tasks never render. | projects/calendar/page.tsx:135 | Real FE placeholder; cosmetic for core HR. P2 polish. |
| R4-F-009 | LOW | benefits | `GET /benefits/plans` returns `providerName:null` (provider entity not joined). | BenefitManagementService.java:162 | Minor data gap; BenefitPlanEnhanced endpoint populates it. P2. |
| R4-F-010 | LOW | recruitment | Job board post (Naukri/Indeed/LinkedIn) throws 500 without creds; Pause is no-op. | JobBoardIntegrationService.java:134 | Gate UI on creds-configured; show CTA not 500. P2. |
| R4-F-014 | LOW | import/keka | API-driven Keka import 501 (CLI path works). | KekaImportService.java:124 | Migration-only; hide UI option or document CLI. P2. |
| R4-SEC-4 | HIGH | secrets | Groq key in untracked `backend/.env:36` (never committed; git history clean). | git verified | USER: rotate at console.groq.com. Not a code/deploy blocker. |

**Triage verdict:** 0 NEW CRITICAL/HIGH that block the core IN-market HR flows. F-002 is HIGH-latent (no provider wired). All P0-labelled stubs are feature-flag-gated and off for this release. Always-on gaps (F-008/009/010) are P1/P2 polish. Full report: docs/audit/green-flag/r4-features.md + r4-security.md.

---

## Run-4 Orchestrator Resolution (authoritative — supersedes conflicting agent rows above)

**SEC-4 CORRECTION:** the `R4-SEC-4` row above says "never committed; git history clean." **WRONG.** Ground-truth: `git show 83f70807:backend/start-backend.sh` contains a REAL `gsk_ry…` key (committed 2026-03-16, neutralized in `fb465678`, still readable across ~10 commits). `verify-carryover.md` is correct. **SEC-4 = HIGH, key IS in history** → rotate (console.groq.com) + purge (BFG/filter-repo) before any public exposure. Empty at HEAD; both remotes private (bounded).

| ID | Sev | Status | Resolution / live evidence |
|----|-----|--------|----------------------------|
| DEPLOY-1 (FE) | CRIT | **CLOSED** | `vercel --prod` → alias `hrms-frontend-vert`→`opzprgxt6`; smoke-green. Live now = main. |
| DEPLOY-1 (BE) | CRIT | **CLOSED** | `railway up` B1 `d993180f`: Flyway V304→V308 live; up 18.8s; smoke-green. |
| WALL-1 | HIGH | **CLOSED live** | Post-FE-deploy wall renders posts; test post visible. |
| R4-RBAC-1 | HIGH | **CLOSED live** | V307 live → `/api/v1/roles` = **10 roles** incl TENANT_ADMIN + PAYROLL_ADMIN (was 8). |
| R4-IDOR-1..5 | HIGH | **CLOSED live** | `6c160e92` guards → BE B2 `d5d0b8fc`. Verified live as TEAM_LEAD: foreign emp = **403** ×4 endpoints, SELF = **200**. |
| SEC-4 | HIGH | **Open (USER)** | Groq key in git history (corrected). Rotate + purge. |
| SEC-3b | CRIT | **Open (owner, intentional)** | Public 1-click SUPER_ADMIN live. Env flip insufficient → needs **V309** (draft in r4-security.md). Pre-prod. |
| R4-UX-1 | MED | **Open** | MANAGER→/admin denial spawns ~8 stacked "Access Denied" toasts (no dedup). RBAC correct; cosmetic. |

**Deploys:** FE `opzprgxt6` ✅ · BE-B1 `d993180f` ✅ · BE-B2 `d5d0b8fc` ✅ — 3 smoke gates PASS, 0 rolled back. Guardrails: tsc 0, IDOR tests 0, Flyway clean. **Git drift:** `6c160e92` deployed (tarball) but unpushed; remotes at `f1f530c4` — push to reconcile.

**VERDICT (see GREEN_FLAG_REPORT.md):** NO-GO true-prod (1 open CRIT SEC-3b, owner action) · GO staging/demo · Score 90/100. All CRITICAL/HIGH **code** defects fixed + live-verified.

### Run-4 STATUS UPDATE (post-deploy verification)

**Deploys this run (via `railway up`, smoke-gated):**

| Batch | Deploy ID | Shipped | Build | Smoke Gate | Outcome |
|-------|-----------|---------|-------|------------|---------|
| B1 | d993180f | HEAD f1f530c4 (4-day-stale BE → current): V300-V308, NOTIF-1, proxy gate | SUCCESS | GREEN (7/7) | Live. V307 verified → role catalog 8→10 (TENANT_ADMIN+PAYROLL_ADMIN present). |
| B2 | 79edb982 | commit 07756218: UI-03 attempt#1 (TenantContext restore) + V309 tenant.admin role assignment | SUCCESS | GREEN (7/7) | Live. **R4-RBAC-1 FULLY FIXED & VERIFIED LIVE** — tenant.admin now roles:[TENANT_ADMIN], employees 200 (was 403). UI-03 attempt#1 INSUFFICIENT (notif still 0). |
| B3 | f9b5bebf | commit 19c4868a: UI-03 attempt#2 (resolve recipient IN-TX, persist via @Transactional sendToUser) | building | verifying | watcher in progress |

**Status changes:**
- **R4-RBAC-1 → CLOSED (verified live).** V307 created TENANT_ADMIN+PAYROLL_ADMIN roles; V309 linked the tenant.admin user. Live: tenant.admin logs in with TENANT_ADMIN, reaches employees (200). Role catalog now 10/10 per docs/obsidian/05-RBAC/Roles.md.
- **R4-DEPLOY-1 → Mitigated.** Deployed HEAD+fixes to Railway via `railway up` (3 batches). ROOT FINDING STANDS: Railway was NOT auto-deploying `main` (4-day gap). Recommend wiring GitHub auto-deploy or documenting manual `railway up` in runbook.
- **R4-UI-03 → refined root cause + fix in flight (B3).** afterCommit notification callbacks run WITHOUT the per-tx RLS tenant GUC (set by TenantRlsTransactionManager.doBegin only at tx start). So resolveRecipientUserId()'s employee lookup + leave-type lookup were RLS-filtered to empty → recipientUserId null → silent early-return (no log, no notification). Confirmed via live logs: approve completes 200 with ZERO afterCommit notification trace. Workflow TASK_ASSIGNED notifications persist because they run in-tx. **Fix (B3): pre-resolve recipient+type/dates in the main tx; in afterCommit call webSocketNotificationService directly (its @Transactional sendToUser sets the GUC for the persist).** In-tx workflow paths (onApproved/onRejected) were already correct.

**Smoke-gate evidence:** /tmp/postdeploy_verify.sh output — B1 & B2 both 7/7 green on SUPER_ADMIN+EMPLOYEE login + core routes + FE login + BE health. No rollback triggered.

### Run-4 RBAC re-validation (live, stable B2) + UI-07

| ID | Severity | Module | Description | Status |
|----|----------|--------|-------------|--------|
| R4-RBAC-2 | INFO | rbac | **Full live RBAC tier validation — HEALTHY.** True EMPLOYEE (arun, roles:[EMPLOYEE]) correctly 403 on /users,/payroll/runs,/roles,/employees-list; 200 only on self (attendance/today, notifications, departments). MANAGER(sumit): employees 200, payroll/users/roles 403. HR_MANAGER(jagadeesh): payroll 200, users/roles 403. HR_ADMIN(saran): broad 200. SUPER_ADMIN: full bypass (by design). TENANT_ADMIN: scoped post-V309. Tenant bound to JWT (X-Tenant-ID header ignored per TenantFilter log). | Closed (verified) |
| R4-UI-07 | LOW | seed/demo-data | `saran@nulogic.io` ("Saran V") is labelled EMPLOYEE in the demo login panel / e2e testData but actually carries roles ["EMPLOYEE","HR_ADMIN"] live. Caused a false-positive "EMPLOYEE escalation" during testing (saran sees /users,/roles,/payroll = correct for HR_ADMIN). = carry-over UI-07 reconfirmed. | Real EMPLOYEE-tier testing must use arun/deepak/bharath/chitra/anshuman (roles:[EMPLOYEE]). | Fix demo-panel label or seed so the "EMPLOYEE" demo identity is a pure EMPLOYEE. Non-security; test-data hygiene. | Open (LOW) |

**RBAC verdict: enforcement correct across all tiers; SuperAdmin bypass intact & by design; no escalation. The only RBAC-adjacent issue is the UI-07 demo-account mislabel (LOW).**

### Run-4 page-render truth (live Playwright, real demo login, 3 roles × 15 routes)

| Role | Login | Routes OK | Console errors | API 5xx | Notes |
|------|-------|-----------|----------------|---------|-------|
| SUPER_ADMIN (fayaz.m) | ✅ | 15/15 | 0 | 0 | fully clean |
| MANAGER (sumit) | ✅ | 14/15 | 0 | 0 | only /fluence empty |
| EMPLOYEE* (saran=HR_ADMIN, UI-07) | ✅ | 14/15 | 0 | 0 | only /fluence empty |

Routes: /me/dashboard /dashboard /employees /attendance /leave /payroll /expenses /performance /recruitment /reports /settings /fluence /announcements /assets /org-chart. **44/45 route-renders pass; zero console errors and zero 5xx across all roles/routes.**

| ID | Severity | Module | Description | Status |
|----|----------|--------|-------------|--------|
| R4-FLUENCE-1 | LOW | fluence | `/fluence` renders for SUPER_ADMIN (15/15) but shows empty body for MANAGER + HR_ADMIN (no console errors, no 5xx). Likely RBAC-gated content (Fluence mgmt concentrated in TENANT_ADMIN per RBAC-Matrix) showing blank instead of a "restricted" state. | Verify intended-gating vs render bug; if gated, show an explicit empty/denied state. Non-blocking (no errors). | Open (LOW) |

Evidence: /tmp/uilive_run.log, frontend/test-results/dashboard-*.png, frontend/e2e/greenflag-live-ui.production.spec.ts.

### Run-4 UI-03 FINAL root cause (after 3 fix attempts on live)

| ID | Severity | Module | Status |
|----|----------|--------|--------|
| R4-UI-03 | MEDIUM (was HIGH) | leave/notifications | **Open — root-caused, fix scoped, not safely live-patchable.** |

**Definitive root cause (live-log verified across B1/B2/B3):** the DIRECT leave approve/reject path (`approveLeaveRequest`/`rejectLeaveRequest`) cancels the workflow execution (BA-5 "superseded by direct approval") and dispatches its employee notification via a hand-rolled `TransactionSynchronization.afterCommit` closure. That closure's RLS-scoped reads (`resolveRecipientUserId`, leave-type lookup) run WITHOUT the per-tx RLS tenant GUC (set only by `TenantRlsTransactionManager.doBegin` at tx start), so they are RLS-filtered to empty → recipient null → silent no-op. Live logs show ZERO afterCommit notification activity for direct approvals on all three deploys. Meanwhile the WORKFLOW path (`onApproved`/`onRejected`, in-tx) and the `ApprovalDecisionEvent → ApprovalNotificationListener.onApprovalDecision` (`@TransactionalEventListener(AFTER_COMMIT)`, sets tenant context, calls `notificationService.createNotification`) DO persist correctly — direct approvals simply bypass them.

**Two fix attempts shipped (committed, harmless, insufficient):** B2 07756218 (restore TenantContext in afterCommit) and B3 19c4868a (pre-resolve recipient in-tx + call WS service in afterCommit). Neither helped because the afterCommit closure itself does not deliver for direct approvals.

**Recommended correct fix (needs unit/integration tests — do in a normal dev cycle, not a live hot-patch):** Option A — publish an `ApprovalDecisionEvent` IN the approve/reject transaction so the proven `onApprovalDecision` listener notifies the requester. Option B — make `WebSocketNotificationService.sendToUser` `@Transactional(propagation = REQUIRES_NEW)` and call `notifyLeaveApproved/Rejected` in-tx (mirrors the working `onApproved` path) so a notification failure cannot mark the leave tx rollback-only. Either is small but must be regression-tested (the afterCommit deferral originally existed to avoid rollback coupling).

**Impact justification for MEDIUM:** leave apply→approve→status all work live (201/200, status APPROVED, balance deducted); the manager receives the workflow approval task; the employee can see the APPROVED status in GET /leave-requests. Only the employee's in-app bell notification on the decision is missing.

### Run-4 repo-state note
- **Concurrent autopilot active on `main`:** during this run a process committed `8b332133` (fix(rbac): scope helpdesk endpoints + ownership checks, RBAC-GF-5) on top of my `19c4868a` — the documented ruflo autopilot. Non-blocking for this run; my deploys were explicit `railway up` of my own commits. Live backend includes my V307/V309 + UI-03 attempts; helpdesk RBAC-GF-5 ships whenever `8b332133` deploys.

### Run-4 NEW HIGH — Asset DELETE 500 (outbox RLS regression)

| ID | Severity | Module | Description | Impact | Exact Fix | Status |
|----|----------|--------|-------------|--------|-----------|--------|
| R4-ASSET-DEL | HIGH | assets/outbox | `DELETE /api/v1/assets/{id}` returns **500** and the asset is NOT deleted (tx rolls back). Live log: `ERROR: new row violates row-level security policy for table "outbox_events"` — the audit→outbox insert (`AuditEvent`, action=DELETE, tenant_id=660…0001, user_id=null) fails the V303 RLS WITH CHECK at flush/commit. `AssetManagementService.publishAssetAuditEvent` wraps `eventPublisher` in try/catch but the RLS error throws at COMMIT flush (outside the catch) → 500 + rollback. Asset CREATE (same audit path) succeeds — so the GUC matches on create but not after `assetRepository.delete()`. | Admins cannot delete assets; any audited mutation whose outbox insert hits an unset/mismatched `app.current_tenant_id` GUC at flush will 500. **Regression surfaced by B1 de-stale deploy** (outbox V300/V303 + FORCE RLS V306 went live; pre-2026-06-17 backend had no outbox). | Ensure the audit→outbox insert always runs with the matching tenant GUC at flush (investigate why `assetRepository.delete()` changes the GUC context); OR move outbox writes to a connection/role that bypasses RLS (OutboxEventProcessor already polls with BYPASSRLS); OR relax/verify the V303 outbox WITH CHECK. Needs DB-level repro + unit/integration test. Also scope: sweep other entity deletes that emit outbox audit events. | Open (HIGH) — root-caused, fix needs dev cycle |

**Leftover test data (could not delete due to this bug):** assets `GF-AST-001` (3991e27c…), `GF-AST-DEL` (7d036a59…), `GF-TEST-001` serials — tagged "QA GF Test", safe to remove. Delete via DB or after the fix ships.

**Scope note:** department delete (204) does NOT emit an outbox event so it's unaffected; the issue is specific to outbox-emitting mutations. Severity HIGH because asset deletion is a core admin CRUD op and the failure mode (500 + silent rollback) may extend to other audited deletes.

### Run-4 outbox-RLS scope assessment + blog-create finding

- **R4-ASSET-DEL scope:** 1 LIVE-CONFIRMED (asset delete 500, outbox RLS). Code pattern (`repository.delete()` + in-tx `eventPublisher` outbox write) is SHARED by `BlogPostService`, `WikiPageService`, `EmployeeService`, `ESignatureService`, `DocumentTemplateService`, `ExitManagementService`, `RecruitmentManagementService`, `BiometricIntegrationService` → **likely systemic across outbox-emitting deletes** (potential CRITICAL). Could not extend live confirmation to blog (blocked by the separate jsonb issue below). **Recommend: sweep all outbox-emitting delete paths post-fix.** Announcement/department deletes work (they don't emit outbox).

| ID | Severity | Module | Description | Status |
|----|----------|--------|-------------|--------|
| R4-BLOG-CREATE | MEDIUM | fluence/blog | `POST /api/v1/knowledge/blogs` with `content` as a plain string → **500**: `column "content" is of type jsonb but expression is of type character varying`. The `blog_posts.content` column is JSONB but the create path passed a varchar. Either the API must document/require a JSON payload for `content`, or the entity↔column type mapping needs a JSON converter. Verify against the real FE payload (may be FE-shaped JSON). | Open — verify expected payload vs type-mapping bug |

### Run-4 ESCALATION — R4-OUTBOX (CRITICAL, systemic) + V310 fix

| ID | Severity | Module | Description | Status |
|----|----------|--------|-------------|--------|
| R4-OUTBOX | **CRITICAL** | infra/outbox | **CONFIRMED SYSTEMIC** (was R4-ASSET-DEL HIGH): EVERY operation writing to `outbox_events` via `EventPublisher.publishAuditEvent` returns 500 + rolls back — live-confirmed on asset DELETE (AUDIT_DELETE) AND asset ASSIGN (AUDIT_ASSIGN). Same `repository.delete()`+outbox or mutate+outbox pattern is shared by asset return/maintenance + blog/wiki/employee/esignature/documenttemplate/exitmanagement/recruitment audited ops → the transactional outbox is broken across the platform. Root cause: V303 strict outbox RLS (no GUC-null fallback that standard tables have) + V306 FORCE RLS reject the audit insert because it flushes with `app.current_tenant_id` effectively unset. **Regression surfaced by the B1 de-stale deploy** (outbox V300/V303/V306 went live; pre-2026-06-17 backend had none). | **Fix: V310** (relax outbox policy to allow unset GUC, row still carries explicit tenant_id) — deploying B4 `4b6c1775`, verifying live. |

**Severity correction:** R4-ASSET-DEL is upgraded to **CRITICAL R4-OUTBOX** (systemic, not asset-specific). The defined smoke gate (login+reads+FE) passed all 3 prior deploys because it exercised no outbox-emitting mutation; this surfaced only in Wave-3 CRUD.

**Report note:** the demo-cred neutralization migration referenced in §7/§12 is now **V311** (V310 is this outbox fix).

### Run-4 FINAL — R4-OUTBOX V310 fix INEFFECTIVE (still OPEN CRITICAL)

V310 deployed live (B4 `4b6c1775` SUCCESS) but did **NOT** fix R4-OUTBOX. Asset assign/delete still 500 with `new row violates row-level security policy for table "outbox_events"` and `tenant_id=660…0001` SET in the row. Since V310's relaxed policy allows `tenant_id IS NULL OR GUC-null OR tenant_id=GUC`, a still-failing insert with tenant_id set means **the session GUC at audit-insert time is a MISMATCHED non-null value (not unset)** — my "GUC unset" hypothesis was wrong (or V310 did not apply via Flyway). Revised fix: set `app.current_tenant_id` correctly on the connection that flushes the audit/outbox insert (the `AuditLogAspect → EventPublisher` path persists with `user_id:null` = detached from the request's tenant connection state), OR write outbox via a BYPASSRLS connection, OR exclude outbox_events from FORCE RLS. **Owner decision: revised forward-fix vs. rollback to pre-outbox 2026-06-17 build** (rollback re-breaks the RBAC tier). **Leftover undeletable test assets** (GF-AST-*, GF-B4-*, GF-V310-X, GF-FINAL-1) — clean via DB after the fix.

**Deploy log final:** B4 `4b6c1775` SUCCESS, V310 applied/attempted — smoke gate (login+reads+FE) GREEN but R4-OUTBOX unresolved (smoke gate doesn't exercise outbox writes). 4 deploys total this run, 0 rollbacks.

---

## RUN-5 (2026-06-22) — R4-OUTBOX **RESOLVED + LIVE-VERIFIED** (CRITICAL closed)

| ID | Severity | Module | Status |
|----|----------|--------|--------|
| R4-OUTBOX | CRITICAL | infra/outbox | **RESOLVED** — fixed in commit `33197715` (V311 + RlsStartupProbe), deployed Railway `69e3bfbc` SUCCESS, verified live. |

**Definitive root cause (ground-truthed on the live Railway DB, not theorized):**
- The live failure was an `outbox_events` RLS `WITH CHECK` rejection. Reproduced the exact insert as `nu_app_rls` against prod: **unset-GUC → OK, matching-GUC → OK, MISMATCHED non-null GUC → FAIL** (the reported error). So V310's "allow unset GUC" was a non-fix: at audit/outbox flush time the session GUC is a *mismatched* non-null value, not null.
- The prior board's "asset CREATE works, same audit path" reasoning was wrong: `createAsset` emits **no** outbox event — only assign/return/delete/maintenance do, so CREATE never proved the GUC matched. Every outbox write was failing.
- `outbox_events` is an **infrastructure queue**: written by trusted server code with an explicit, correct `tenant_id`; polled **cross-tenant** by `OutboxEventProcessor` (scheduler, no tenant context). It has **no user/API read path**. Gating its WRITE on the request GUC added zero isolation value and only made durable event publication fragile.
- **Second latent CRITICAL found this run:** under V310's relaxed `USING`, the fail-closed `RlsStartupProbe` canary (`RLS_PROBE_FAIL_ON_BYPASS` effective true) sees outbox tenant rows with an unset GUC → **any restart with pending events would have failed boot**. The current pod had only survived because outbox was empty at its boot. (Confirmed live: canary returned true with 2 pending tenant rows.)

**Fix (commit `33197715`):**
- `V311__outbox_events_infra_rls_policy.sql` — single PERMISSIVE policy: relaxed `USING` (tenant readers + processor's unset-GUC cross-tenant poll both work) + `WITH CHECK (true)` so trusted-code writes are never RLS-vetoed. Replaces the V303/V310 + out-of-band `allow_all` policies.
- `RlsStartupProbe` — excludes `outbox_events` (infra, no user read path) from the strict-policy assertion **and** the visibility canary. 16/16 probe unit tests green.
- Tenant DATA tables (employees, payslips, leave_*, …) **untouched** — strict fail-closed preserved.

**Live verification (browser/API = truth, on the deployed Vercel/Railway stack):**
- Flyway applied **V311** on boot; `RlsStartupProbe` logged *"skipping infrastructure table public.outbox_events"* and **passed: 0 tenant rows visible across 317 tenant tables + 1 view** → boot time-bomb defused, tenant isolation intact.
- Authenticated to the **live API** as a tagged test SUPER_ADMIN and ran the exact previously-500 flow:
  - `POST /api/v1/assets` → **201**
  - `POST /api/v1/assets/{id}/assign` → **200** (was 500)
  - `POST /api/v1/assets/{id}/return` → **200**
  - `DELETE /api/v1/assets/{id}` → **204** (was 500)
- Outbox rows for AUDIT_ASSIGN/RETURN/DELETE all persisted **PROCESSED** (retry_count 0) — durable event pipeline restored end-to-end.
- Zero `row-level security` errors in the new deployment logs.

**Cleanup done:** deleted 45 leftover undeletable `GF-*` test assets (now removable), removed the tagged test user `qa.greenflag.r5@test.local` + its auto-linked employee. Live DB clean.

### Run-5 carry-over status
- **SEC-3b (was CRITICAL):** **RESOLVED on live** — `DEMO_CREDENTIALS_ENABLED=false` in Railway (production-correct; public one-click SUPER_ADMIN takeover closed).
- **SEC-4 (HIGH):** **OPEN — owner action.** Real Groq key `gsk_ryq7hgo9…` is in git **history** (`backend/start-backend.sh` @ `83f70807`), absent at HEAD, not in Railway env. Only remediation = **rotate at console.groq.com** (+ optional history scrub via filter-repo, a destructive force-push deliberately NOT auto-performed). Cannot be code-fixed.
- **UI-03 (MEDIUM):** leave-decision in-app notification — root-caused prior; the notification event also flows through the now-fixed outbox, so likely improved; not separately re-verified this run.

---

## RUN-5 (2026-06-22) — STRONG RBAC verification (live, all 10 roles) → 0 defects

Method: created one tagged test user per role in the demo tenant (demo one-click login is off), authenticated each to the **live API**, and probed a permission-gated battery. Expected matrix derived from live `role_permissions` + the `SecurityContext` permission hierarchy (`MODULE:MANAGE` implies `MODULE:*`; `READ`→`VIEW`; `VIEW_ALL`>`VIEW_TEAM`>`VIEW_DEPARTMENT`>`VIEW_SELF`).

**Live read battery — actual = expected for all 10 roles** (`/users/me` self, `/payroll/runs` PAYROLL:VIEW_ALL, `/roles` ROLE:MANAGE, `/audit` AUDIT:VIEW, `/users` USER:VIEW):

| Role | me | payroll | roles | audit | users | Verdict |
|------|----|---------|-------|-------|-------|---------|
| SUPER_ADMIN | 200 | 200 | 200 | 200 | 200 | ✅ full (bypass) |
| HR_ADMIN | 200 | 200 | 200 | 200 | 200* | ✅ (*USER:MANAGE⇒VIEW) |
| TENANT_ADMIN | 200 | 200 | 200 | 200 | 200* | ✅ (*USER:MANAGE⇒VIEW) |
| HR_MANAGER | 200 | 200 | 403 | 403 | 403 | ✅ |
| PAYROLL_ADMIN | 200 | 200 | 403 | 403 | 403 | ✅ |
| FINANCE_ADMIN | 200 | 200 | 403 | 403 | 403 | ✅ |
| RECRUITMENT_ADMIN | 200 | 403 | 403 | 403 | 403 | ✅ |
| MANAGER | 200 | 403 | 403 | 403 | 403 | ✅ |
| TEAM_LEAD | 200 | 403 | 403 | 403 | 403 | ✅ |
| EMPLOYEE | 200 | 403 | 403 | 403 | 403 | ✅ |

**Write-gating (mutations, not just reads):** EMPLOYEE → `POST /api/v1/assets` **403**, `POST /api/v1/roles` **403**, `GET /payroll/runs` **403**. SUPER_ADMIN → `POST /api/v1/assets` **201** (bypass intact).

**Tenant isolation:** `X-Tenant-ID` spoof to the other tenant is **ignored** — `/users/me` still returns the caller's own (demo-tenant) identity; JWT governs. DB-level: the boot `RlsStartupProbe` proved **0 tenant rows visible without context across 317 tables + 1 view**. Other tenant has no data rows to fetch cross-tenant.

**Result: 0 RBAC defects.** The two `/users`=200 cases for HR_ADMIN/TENANT_ADMIN are CORRECT — they hold `USER:MANAGE`, which the documented permission hierarchy treats as implying `USER:VIEW` (verified in `SecurityContext.hasPermission`). Cleanup: all 10 `qa.rbac.*` test users + auto-linked employees + test assets deleted (0 residual).

---

## RUN-5 (2026-06-22) — UI RBAC sweep (real browser, demo logins) + 2 fixes

Demo logins re-enabled for the test window (`DEMO_CREDENTIALS_ENABLED=true`; revert before GO). Driving the live Vercel UI in Chrome per role.

| ID | Sev | Area | Finding | Status |
|----|-----|------|---------|--------|
| R5-UI-1 | MEDIUM | rbac/ux | Direct-nav to a forbidden route as a scoped role correctly redirected to `/me/dashboard?denied=1` but spawned ~8+ stacked "Access Denied" toasts. Root cause: toast registered in two effects (`AppLayout` + `me/dashboard`) keyed on `[searchParams, toast]`; `useToast` returns an unstable ref so each re-fired every render while `?denied=1` persisted. | **FIXED** `234cc368` — single AppLayout handler, fire-once ref + strip param; removed duplicate. Vercel deploy `nddz1dnbf` Ready; **verified live** (single toast, was 8+). |
| R5-UI-2 | MEDIUM | dashboard/audit | `/dashboard` showed "Analytics data could not be loaded" for audit-capable roles. Root cause: `GET /api/v1/audit-logs/statistics` typed params `LocalDateTime` but FE sends date-only `yyyy-MM-dd` → 400 "Expected type: LocalDateTime" (super_admin/hr_admin/tenant_admin). MANAGER correctly 403 (no AUDIT:VIEW). | **FIXED** `c477b94a` — backend accepts date-only or date-time (flexible parse, inclusive end-of-day), keeps 30-day default. Railway deploy `a6365686` in progress. |

UI verified working (SUPER_ADMIN): /me/dashboard, /employees (19, after cold-start wait), /attendance, /leave, /expenses, /assets, /admin/users, /admin/roles, /admin/payroll, /admin/audit, /analytics, /fluence/wiki. MANAGER: manager dashboard + /employees (200) render; admin sections correctly denied (single toast). Note: Railway free-tier cold-start needs ~6-8s before a data page is "loaded".

### Run-5 UI RBAC — admin-route gating analysis (no defect)

Verified the admin route guards in `lib/config/routes.ts` are **permission-aware**, not blanket role-locked:
- `/admin/roles` → `[ROLE_MANAGE, SYSTEM_ADMIN]`, `/admin/audit` → `[AUDIT_VIEW, SYSTEM_ADMIN]`, `/admin/users` → `[USER_MANAGE, SYSTEM_ADMIN]`, etc. → HR_ADMIN/TENANT_ADMIN (who hold these) reach them; scoped roles get the "Access Restricted" page. Correct.
- `/admin/payroll` has no specific entry → falls to `/admin/*` `adminOnly` (SUPER_ADMIN / SYSTEM:ADMIN only). FINANCE_ADMIN / PAYROLL_ADMIN are denied the admin **console** — **by design**; they use the non-admin `/payroll` UI (route guard `[PAYROLL_VIEW, PAYROLL_VIEW_SELF]`, satisfied by their `PAYROLL_VIEW_ALL`; API `/payroll/runs` = 200 in the matrix). No gap.

Verdict: RBAC UI gating is consistent and correct. Denials render gracefully (main-app: redirect + single toast; `/admin/*`: full-page "Access Restricted"). Testing caveat: the live login keeps a sticky session ("Remember me" + httpOnly cookie) — switching demo roles needs an explicit logout first; this is test-harness friction, not an app defect.

### Run-5 UI RBAC — R5-UI-3 (HIGH) admin shell locked out HR_ADMIN/PAYROLL_ADMIN/FINANCE_ADMIN

| ID | Sev | Finding | Status |
|----|-----|---------|--------|
| R5-UI-3 | HIGH | `AdminLayoutInner` gated the entire `/admin/*` shell on a hard-coded role list `{SUPER_ADMIN, TENANT_ADMIN, HR_MANAGER}` and `router.replace('/me/dashboard')` for everyone else — running BEFORE the permission-aware AuthGuard. Stale comment: "HR_MANAGER replaces the non-existent HR_ADMIN backend role". But HR_ADMIN now exists (top HR role, 300 perms incl. ROLE:MANAGE/AUDIT:VIEW/USER:MANAGE) and PAYROLL_ADMIN/FINANCE_ADMIN hold PAYROLL:VIEW_ALL. Live-confirmed: HR_ADMIN (Saran V demo) → `/admin/roles` and `/admin/audit` both silently redirected to `/me/dashboard` despite holding ROLE_MANAGE/AUDIT_VIEW (and the route configs granting them). | **FIXED** `e86f4531` — admin-shell entry now permission-driven (SUPER_ADMIN / TENANT_ADMIN / HR_MANAGER / any of ROLE_MANAGE,PERMISSION_MANAGE,USER_MANAGE,AUDIT_VIEW,SETTINGS_UPDATE,PAYROLL_VIEW_ALL,REPORT_VIEW); per-page AuthGuard still enforces each page. tsc clean. Vercel deploy in progress; verify HR_ADMIN reaches /admin/roles live. |

This is the highest-impact UI RBAC defect of the run: a real admin role (HR_ADMIN) was fully locked out of the admin console it has permissions for.

### R5-UI-3 VALIDATED + secondary finding (R5-UI-4)

- **R5-UI-3 FIX VALIDATED live:** after `e86f4531` (Vercel `a18uhfhk7`), HR_ADMIN (Saran V demo) now reaches **`/admin/audit`** → "Audit Logs" renders fully (Total Events 77, event log). Before the fix this hard-redirected to `/me/dashboard`. Admin-tier roles (HR_ADMIN/PAYROLL_ADMIN/FINANCE_ADMIN) can now open admin pages they're permissioned for. Confirmed the deeper root cause along the way: the client user (`/auth/me`) carries roles+flat permissions which `convertRolesToObjects` nests, so `usePermissions` resolves them; the prior block was purely the stale 3-role shell gate.

| ID | Sev | Finding | Disposition |
|----|-----|---------|-------------|
| R5-UI-4 | LOW/product | `/admin/roles` (Role Management) calls `GET /permissions` (needs `PERMISSION:VIEW`) to populate the assignable-permission list. HR_ADMIN holds `ROLE:MANAGE` but not `PERMISSION:VIEW` → 403 → the page bails to `/me/dashboard` instead of degrading. | **Product decision (not auto-fixed):** either grant HR_ADMIN `PERMISSION:VIEW` (if HR_ADMIN should edit role↔permission mappings) OR make the Role Management page render gracefully when `/permissions` 403s (show roles, hide the permission editor). Changing the permission model needs owner input. |

### R5-UI-3 correction — gate tightened (no over-grant), commit d2f55191

Self-review of the e86f4531 gate caught an **over-grant**: it included `REPORT:VIEW` and `PAYROLL:VIEW_ALL`, which operational roles (MANAGER/TEAM_LEAD/RECRUITMENT_ADMIN) and FINANCE/PAYROLL admins hold — so it would have wrongly admitted them to the admin console (an RBAC *loosening*, worse than the original lock-out). Tightened to org-admin-console perms only (ROLE/PERMISSION/USER:MANAGE, AUDIT:VIEW, SETTINGS:UPDATE) + explicit TENANT_ADMIN/HR_MANAGER. **DB-verified grant set is now exactly {SUPER_ADMIN, TENANT_ADMIN, HR_MANAGER, HR_ADMIN}; all operational + payroll/finance roles denied** (they use their dedicated non-admin UIs). tsc clean; Vercel deploy in progress.

### Run-5 testing-environment note
Chrome extension disconnected mid-run (environmental). Remaining live UI click-through for HR_MANAGER / TEAM_LEAD / PAYROLL_ADMIN / EMPLOYEE is pending a browser reconnect; their RBAC is already verified at the API/DB level (matrix 10/10 + gate analysis). `DEMO_CREDENTIALS_ENABLED=true` remains on for testing — revert to false before GO.

---
## RUN-6 (2026-06-22) — full per-role sweep + strong RBAC (LIVE)

**Setup verified live:** FE redeployed to HEAD via `vercel --prod` (dpl_69gHQJYPzj9P..., includes 3 RBAC-UI fixes that were 14 commits unpushed/un-deployed). BE current (V311, audit-stats date-only fix live). Smoke gate PASS. qa.ui.<role>@test.local (all 10 roles) restored to Welcome@123 for testing; demo @nulogic.io accounts also live with Welcome@123.

**RBAC API probe — 10 roles × representative endpoints, exact @RequiresPermission gates, /auth/me effective perms.**

| Finding | Severity | Status |
|---|---|---|
| Privileged-endpoint escalation (low roles vs admin/payroll/attendance-mgmt) | — | 🟢 NONE. admin/system/* → only SUPER_ADMIN 200 (9 roles 403); payroll/runs → finance/payroll/HR/tenant 200, ops roles 403; attendance/all → HR/admin 200; pending-regularizations → people-mgrs+HR 200. SUPER_ADMIN never blocked (bypass intact). |
| R6-WELLNESS-500 | LOW | wellness/dashboard (+ likely other self-service GETs) returns 500 (not graceful) when the authenticated user has NO employee record. arun@nulogic.io (employee-backed)→200 w/ data; qa.ui.employee (no employee)→500. Real users always have an employee row → no prod impact. Edge: an admin user w/o employee record. Fix = graceful empty/404. |
| R6-AUTHME-PERMS | INFO/LOW | GET /auth/me under-reports effective permissions — omits RoleHierarchy baseline grants (e.g. EMPLOYEE_VIEW_SELF, CONTRACT_VIEW for TEAM_LEAD). Backend enforces the fuller RoleHierarchy set; FE gates on the narrower /auth/me set → FE is MORE restrictive than BE (benign for security; can hide features a role may use). |
| Probe false-positives (documented) | — | "loans 200/403" → real gate is LOAN_VIEW_ALL not LOAN_VIEW (correct); "referrals 403" → real gate REFERRAL_MANAGE (correct deny); "announcements 200 for tenant/payroll admin" → RoleHierarchy EMPLOYEE_VIEW_SELF baseline (by design). |

### RUN-6 browser UI-layer sweep (ruflo Chromium on live URL — Chrome extension was disconnected)
| Check | Result |
|---|---|
| SUPER_ADMIN login + /me/dashboard | 🟢 renders, full nav |
| SUPER_ADMIN render: employees(29 rows), payroll, admin/audit, recruitment, performance/reviews, fluence, expenses, assets | 🟢 all render w/ proper titles, no error/denial |
| EMPLOYEE login + nav | 🟢 admin nav hidden; /admin/audit → redirect ?denied=1 (single clean redirect, no toast cascade) |
| HR_ADMIN → /admin/audit | 🟢 ALLOWED (renders Audit Logs) — **R5-UI-3 admin-shell fix d2f55191 VALIDATED on fresh deploy** |
| MANAGER → /admin/audit | 🟢 DENIED → ?denied=1 (fix correctly NOT over-granting operational roles) |

**Wave 1 verdict: STRONG RBAC PASS.** API matrix (10 roles) + UI gate (4 roles) consistent; SUPER_ADMIN bypass intact; no privilege escalation; admin-shell gate precisely scoped. Page render healthy across 9 modules.

### RUN-6 visual CRUD (Chrome UI, SUPER_ADMIN) + defect found
| Test | Result |
|---|---|
| Employees list render | 🟢 19 people, real data, filters/search/sort |
| CREATE employee (full form) | 🟢 works — cross-tab required-field validation (Designation/Department), **12-char password policy enforced visually** ("Password must be at least 12 characters"); count 19→20, new row appears |
| DELETE employee (soft-delete) | 🟢 backend soft-deletes → status TERMINATED + linked user INACTIVE (by design, reversible); list invalidates; CSRF enforced on write (403 without token) — **R4-OUTBOX NOT regressed** (no 500 on audited delete) |
| **R6-UI-DELETE-COPY** | **MEDIUM (FIXED)** — Delete-Employee confirm dialog said "This action cannot be undone … will be permanently deleted" but the op is a **reversible soft-delete** (TERMINATED, record retained, reactivatable). Misleading/incorrect copy → trust + compliance risk. Fix: `frontend/app/employees/page.tsx:1377` reworded to "will be deactivated and marked as terminated. Records retained … can be reactivated." FE-only; ships next Vercel deploy. |

**R4-OUTBOX re-confirmation:** employee CREATE + soft-DELETE both emit audit→outbox events and returned 2xx with no RLS 500 → the Run-5 outbox fix (V311) holds on live.

### RUN-6 demo one-click login sweep (visual)
| Demo card | Result |
|---|---|
| One-click demo login mechanism | 🟢 works (auto-fill + auto-submit); clear error UX on failure ("Authentication Failed / Bad credentials") |
| Suresh M / RECRUITMENT ADMIN | 🟢 logs in → dashboard renders, correct role label |
| **R6-DEMO-FINANCE (MEDIUM, FIXED)** | Finance Admin demo card (Fiona Nance) submitted `finance@nulogic.io` which was **never seeded** → "Bad credentials", card unusable. Demo-only (panel disabled in prod via SEC-3b) but a real gap. **Fix:** `V312__seed_demo_finance_admin_user.sql` (mirrors V291) — seeds finance@nulogic.io (FINANCE_ADMIN, employee-backed, Welcome@123). Applied to live DB now → card logs in ✓. Migration committed for durability. |
| R6-PROFILE-DASH (LOW) | Freshly-seeded admin demo accounts (finance@, and the pre-existing V291 tenant.admin@ pattern) show a graceful "No employee profile linked" on /me/dashboard — minimal seed lacks dept/manager. Non-crashing fallback; real employees have full profiles. Not a blocker. |

**Updated defect tally (Run-6):** 2 fixed (R6-UI-DELETE-COPY MEDIUM, R6-DEMO-FINANCE MEDIUM); 2 LOW non-blockers (R6-WELLNESS-500 employee-less 500, R6-PROFILE-DASH); 1 INFO (R6-AUTHME-PERMS under-report). Zero CRITICAL/HIGH found. RBAC strong. R4-OUTBOX confirmed not regressed.
