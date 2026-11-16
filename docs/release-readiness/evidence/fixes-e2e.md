# Fixes for E2E defects (2026-11-15)

| Defect | Status | Change |
|---|---|---|
| DEF-E2E-01 wiki create 400 | Fixed, verified live | `WikiPageService.createPage` generates a slug from the title (`uniqueSlug`, suffix -2, -3 for tenant uniqueness) when blank; client slug kept. `updatePage` no longer nulls the slug when the request omits it. |
| DEF-E2E-02 / DEF-FLUENCE-04 remainder | Fixed, verified live | New `WikiPageRepository.findVisibleToUser`, `findVisibleToUserInSpace`, `searchByTenantForUser`. List and space list return own pages plus others' PUBLISHED non-PRIVATE pages; holders of KNOWLEDGE:WIKI_APPROVE also see others' non-PRIVATE drafts. `/pages/my` was already owner-only. Search now includes the caller's own drafts. |
| DEF-E2E-07 | Fixed, verified live | `requireViewable` throws `ResourceNotFoundException` (404) instead of `IllegalArgumentException` (400). |
| DEF-E2E-03 payslips gate | Fixed | `frontend/app/payroll/payslips/page.tsx` gates on anyOf PAYROLL:VIEW, PAYROLL:VIEW_ALL. Backend `GET /payroll/payslips` needs PAYROLL_VIEW_ALL, so no widening beyond the API. |
| DEF-E2E-04 OKR 403 | Fixed in FE | Endpoint needs OKR:VIEW_ALL (deliberate, tenant-wide). `useCompanyObjectives` now sets `enabled` only with that permission. No migration. |
| DEF-E2E-05 letters 403 | Fixed in FE | Endpoint needs LETTER:TEMPLATE_VIEW (deliberate). Candidates page prefetch (result unused) is enabled only with that permission. No migration. |

Not changed: DEF-E2E-06 (product decision). TEAM/RESTRICTED visibility is still not membership-checked: non-owners see TEAM/RESTRICTED pages once PUBLISHED (a space membership table exists, V117, not wired in). Tree and blog paths unchanged.

## Verification
- `mvn -o -q test -Dtest=WikiPageServiceTest,WikiPageControllerTest`: EXIT=0 (4 new tests: slug generation, client slug kept, non-approver list filter, 404 for foreign private).
- `mvn -o -q -DskipTests package` OK; backend restarted via run-be.sh.
- Live (`scripts/e2e/fixverify.mjs`, hradmin + employee demo accounts, test pages titled NUAURA_TEST_FIX_*):
  - HR admin POST without slug -> 201, slugs `nuaura-test-fix-964067-private`, `...-same`, `...-same-2`.
  - Employee list: 3 pages total (was 15), 0 draft/private visible, 0 of the new test pages visible; GET private page by id -> 404 (was 400); space list 0 non-published.
  - HR admin sees own 3 drafts in list and in search.
- FE: vitest payslips + okr pages 8/8 pass (new gate test); eslint clean on touched files; `tsc --noEmit` clean.
- Not run: browser UI re-test of the create flow; Testcontainers tests (Docker down).
- Test data: 3 NUAURA_TEST_FIX_* wiki pages in local hrms_dev (DRAFT).
