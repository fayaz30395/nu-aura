# Defects found by browser E2E (agent e2e-load), 2026-11-15. Not fixed (audit mode). Each reproduced at least twice.

## DEF-E2E-01 (High) Creating or publishing a wiki page from the UI always fails
- Repro (2x): admin@nulogic.io (HR_ADMIN) > /fluence/wiki/new > title + body > Publish > pick space > Publish Page. POST /api/v1/knowledge/wiki/pages returns 400 "Data Integrity Violation". No row is created (DB count 0).
- Root cause: backend log `null value in column "slug" of relation "wiki_pages" violates not-null constraint`. The UI payload has no slug (`frontend/app/fluence/wiki/new/page.tsx:160-172`); `WikiPageService.java:119` copies `pageData.getSlug()` as-is; `CreateWikiPageRequest.java:25-26` makes slug optional; DB column is NOT NULL. API-driven tests that send a slug pass, so earlier API-only checks hid this. Save Draft goes through the same call, so it fails the same way.
- Fix: in `WikiPageService.createPage` generate a unique slug (slugified title + short suffix, unique per space) when blank. Effort: S, plus one UI-level test.
- Evidence: screenshots/NU-UI-006-hr-create-fail-repro.png, scripts/e2e/j6.mjs, j6b.mjs.

## DEF-E2E-02 (High) Employees can list other users' PRIVATE and DRAFT wiki pages, including full content
- Repro (2x): as arun (EMPLOYEE) GET /api/v1/knowledge/wiki/pages?page=0&size=50 returns all 15 tenant pages, including DRAFT/PRIVATE ones by admin, with `content` and `excerpt`. The UI list at /fluence/wiki also shows their titles. Direct GET of the private page by id is denied (400), so only the list path leaks.
- Root cause: `WikiPageService.java:195-198` `getAllPages` uses `findByTenantId` with no visibility, status or author filter; `WikiPageController.java:118-125`.
- Fix: filter to PUBLISHED + ORGANIZATION/shared-with-user, plus the caller's own pages; apply the same rule used by the detail endpoint. Check `/search`, `/space/{id}`, `/space/{id}/tree` for the same gap. Effort: M.
- Evidence: logs/NU-UI-006-list-leak.txt.

## DEF-E2E-03 (Medium) TENANT_ADMIN cannot open /payroll/payslips
- Repro (2x): tenant.admin@nulogic.io > /payroll/payslips shows "Access restricted". The route config allows PAYROLL_VIEW_SELF or PAYROLL_VIEW_ALL (`frontend/lib/config/routes.ts:611-613`) and TENANT_ADMIN holds VIEW_ALL (DB), but the page gates on PAYROLL_VIEW only (`frontend/app/payroll/payslips/page.tsx:323`). TENANT_ADMIN has no PAYROLL:VIEW.
- Fix: gate on anyPermission [PAYROLL_VIEW, PAYROLL_VIEW_ALL], or grant PAYROLL:VIEW (needs a product decision on what TENANT_ADMIN should see). Effort: S.
- Evidence: screenshots/NU-UI-003-admin-payslips.png.

## DEF-E2E-04 (Low) OKR page calls an endpoint EMPLOYEE cannot use
- Repro (4x across runs and viewports): /performance/okr as EMPLOYEE fires GET /api/v1/okr/company/objectives -> 403 each load, console error, "Company Objectives (0)" tab. Fix: skip the query without the permission, or allow read for company objectives. Likely `frontend/app/performance/okr/page.tsx` (company objectives query). Effort: S.

## DEF-E2E-05 (Low) Candidates page calls an endpoint RECRUITMENT_ADMIN cannot use
- Repro (3x): /recruitment/candidates as suresh@ (RECRUITMENT_ADMIN) fires GET /api/v1/letters/templates/active -> 403, console error each load. Source: offer modal template load in `frontend/app/recruitment/candidates/page.tsx`. Fix: lazy-load on modal open, or grant LETTER read to the role. Effort: S.

## DEF-E2E-06 (Low, needs a product decision) Leave overview shows only 4 of 7 balances
- `frontend/app/leave/_components/LeaveBalanceCard.tsx:16` `balances.slice(0, 4)`. After approving Casual Leave the changed balance (7 -> 5) is not on /leave; only /me/leaves shows it. UI choice, so no fix proposed.

## DEF-E2E-07 (Low) Wiki detail returns 400 where 403/404 is expected
- GET /api/v1/knowledge/wiki/pages/{id} for a PRIVATE page by a non-author returns 400 (seen 2x). Use 403/404. Effort: S.

## Observations (not defects, or not proven)
- Dev profile sets `app.auth.login-bookkeeping.enabled` false (`application-dev.yml:111`): `users.last_login_at` stays null locally (0/42) and lockout state is not cleared on success. Verify in a non-dev profile before release.
- Runbook lists saran@nulogic.io as HR_ADMIN; DB has EMPLOYEE only. Docs drift (use admin@nulogic.io for HR admin).
- After logging out one arun session, a second saved arun session got 401 on /auth/me and refresh. Looks like logout revokes all of a user's tokens; seen once, not confirmed as intended.
- Local env: root `.env` sets NEXT_PUBLIC_API_URL=http://backend:8080/api/v1, so the dev bundle cannot reach the BE from a host browser (WebSocket ERR_NAME_NOT_RESOLVED on every page; XHR rerouted by the test harness). Local config only.
- FE dev server was returning 500 on every route (running next 16.3.8 process vs node_modules at 16.4.6); restarted FE only.
- RECRUITMENT_ADMIN gets 403 on wiki list (no KNOWLEDGE:WIKI_READ; V345 granted it to EMPLOYEE/MANAGER/TEAM_LEAD/HR_MANAGER only).
- 3 unattributed 400 console errors on /me/dashboard at both viewports; not tied to an API response in the capture, probably the SockJS info call via the host rewrite.
