# Green-Flag Run — New-Defect Hunt (dev/architect)

**Scope:** all commits in `git log 74c61449..HEAD` (HEAD = f1f530c4).
**Method:** read every flagged fix diff, verified FE/BE contract via generated-client typecheck,
validated V308 against V96/V115/V48 migration patterns, regenerated orval clients from the
committed snapshot and ran a full `tsc --noEmit` (cold-cache build simulation).

## Verdict

**0 CRITICAL, 0 HIGH, 0 MEDIUM defects introduced.** 2 LOW/INFO observations only.

All flagged fixes are complete, correct, and contract-consistent. The two highest-risk areas
(the prebuild `api:generate` cold-cache flow and the V308 RLS/idempotency) were verified by
execution, not inspection alone.

## Verification evidence

- **Cold-cache Vercel build (3fc6abb7 / 0d313a74):** regenerated `lib/generated/` from
  `frontend/openapi-snapshot.json` (the exact prebuild path), then `tsc --noEmit` → **exit 0,
  zero errors**. The June-9 snapshot still satisfies every consumer added since (calibration,
  wall, budget, scorecards, PSA, travel, tasks, pulse-surveys). No FE/BE contract drift.
- **V308 (f1f530c4):** `ON CONFLICT (code) WHERE is_deleted = false DO NOTHING` matches the
  partial unique index `idx_permission_code` (V48:72) exactly — same pattern as V115. Idempotent.
  `permissions` is a global table (no tenant RLS), so RLS-safe. All NOT-NULL columns supplied;
  longest `action` value (`template_manage`, 15) fits `VARCHAR(20)`. Flyway chain V300→V308 is
  sequential with no duplicate versions.
- **Headcount fix (d5565b7c):** BE `EmployeeMetrics.departmentDistribution` (AnalyticsService:128)
  now feeds the FE; native query `findDepartmentDistribution` is explicitly `is_deleted=false AND
  status='ACTIVE'` + tenant-scoped — matches the KPI population. `LinkedHashMap` covered by
  `java.util.*` wildcard import. No `OrganizationHealthServiceTest` exists; `AnalyticsServiceTest`
  already stubs the new repo call (d2f82c8a). No NPE risk (Mockito defaults `List` → empty).
- **Calibration publish (1bf35bcc):** `mutateAsync({reviewId, params:{finalRating}})` matches the
  generated `{reviewId:string; params:UpdateCalibrationRatingParams{finalRating:number}}`; BE route
  `PUT /reviews/{reviewId}/calibration-rating?finalRating` exists (ReviewCycleController:157).
- **Onboarding email (1bf35bcc):** `findByIdWithUser(employeeId, tenantId)` and
  `sendWelcomeEmail(String,String,String)` signatures verified; `@RequiredArgsConstructor` wires
  the new `final EmailNotificationService` (`@Service`) bean; email failure is caught and does not
  fail onboarding.
- **proxy.ts refresh gate (f1f530c4):** the new `!accessToken && hasRefreshToken → allow` branch
  mirrors the pre-existing `isExpired && hasRefreshToken` branch; deny-by-default preserved when no
  token exists; server-side `@RequiresPermission` unchanged.
- **useAuth 5xx fallback (9d1a3797):** restores UI session from storage only on 5xx/network error;
  not a bypass — every API call is independently server-authorized; permanent backend-down still
  401→redirects. `readUserFromStorage` exists.
- **Sidebar (7c9d0dd3, 90798199, 3078dce2):** cosmetic active-highlight only; `feedback360-grow`
  target ID confirmed present in menuSections.tsx; dead PATH_TO_MENU_ID entries removed; no RBAC
  change.
- **Stack/quality:** 0 new `any` types in FE diffs; no hand-written API paths added (all new calls
  use generated clients); locked stack respected.

## Issue board

| ID | Severity | Module | Description | Impact | Exact Fix (file:line) | Owner | Status |
|----|----------|--------|-------------|--------|-----------------------|-------|--------|
| DEV-OBS-1 | LOW (INFO) | Auth / edge middleware | When a refresh token exists but the access token is absent, `proxy.ts` returns `allowWithSecurity` and skips the coarse RBAC-EDGE-001 role gate (role claims live in the absent access JWT). A low-priv user hard-navigating to an admin route briefly renders the admin page *shell* before AuthGuard refreshes and re-gates. | None — pre-existing behavior of the `isExpired && hasRefreshToken` path; backend blocks all admin **data** APIs. No data leak. Cosmetic flash only. | `frontend/proxy.ts:460` (intentional, mirrors :472) | dev | Open (accept) |
| DEV-OBS-2 | LOW (INFO) | RBAC / V308 | V308 re-seeds GOAL:VIEW/UPDATE/DELETE and OKR:DELETE which V115 already inserted, so the "24 missing codes" count is effectively ~20 net-new. | None — `ON CONFLICT DO NOTHING` makes the overlap a no-op. Idempotent. | `backend/.../V308__backfill_missing_permission_catalog_codes.sql` | dev | Open (accept) |

No fixes required.
