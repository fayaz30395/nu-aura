# QA Open Issues — 2026-06-18 (Iteration 5 — Final Consolidated)

**Total:** Critical: 1, High: 3, Medium: 5, Low: 5

---

## CRITICAL

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| SEC-001 | Security / Ops | Demo credential `Welcome@123` live on Railway staging (`DEMO_CREDENTIALS_ENABLED=true`) | V295+V299 neutralization migrations present in code; Railway env var not flipped | Manual: set `DEMO_CREDENTIALS_ENABLED=false` + verify `SPRING_FLYWAY_ENABLED=true` on Railway dashboard, redeploy — no code change needed |

---

## HIGH

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| NAV-001 | Navigation / Security | Edge middleware not running — `proxy.ts` exports `proxy` not `middleware`; CSP+OWASP headers and cookie-auth check bypassed on all routes | `.next/server/middleware-manifest.json` shows empty middleware; `proxy.ts:396` — **FIXED in this session**: `export { proxy as middleware }` re-export added | DEPLOYED: verify `.next/server/middleware-manifest.json` is non-empty after next build |
| BE-03 | Backend / Security | `ContractSignatureRepository` has no direct `tenant_id` filter | Verified: entity has no `tenantId` column; repository queries by `contractId` only; guarded only by outer BE-01 contract IDOR fix | Future: add `tenant_id` FK to `contract_signatures` table + migration; add `findByContractIdAndTenantId` to repository |
| ARCH-01 | Architecture | NOBYPASSRLS live proof never run — RLS end-to-end isolation requires `nu_app_rls` role (NOBYPASSRLS) not testable in CI | `RlsTenantGucScopeTest` build-guard active but only tests scope isolation (tx-local), not privilege bypass | Set up `nu_app_rls` role in CI Testcontainers setup; add `NOBYPASSRLS` integration test |

---

## MEDIUM

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| NAV-003-PARTIAL | Navigation | `/admin/mobile-api` and `/admin/departments` still not in AdminLayoutInner sidebar | Pages exist; `feature-flags` + `implicit-roles` fixed this session; `mobile-api` and `departments` not added (unclear ownership: admin shell vs HRMS shell) | Decide owning layout; add sidebar entries or redirect to HRMS equivalent |
| RBAC-GAP-1 | RBAC / Frontend | 108 frontend routes use auth-only fallback (no explicit permission spec in PROTECTED_ROUTES) | AuthGuard fallback: `routeConfig === null → setIsAuthorized(true)`; sensitive admin routes (audit, budget, feature-flags, api-keys) reachable by any authenticated user at URL level | Register high-sensitivity admin/settings routes in PROTECTED_ROUTES; backend APIs still enforce |
| SEC-002a | Security / PII | `benefit_claims.upi_id` stored plaintext — `@Convert(EncryptedStringConverter)` added to entity (this session) but no Flyway backfill migration for existing rows | `BenefitClaim.java:108` — converter added; no V29x backfill migration yet | Add Flyway migration to backfill and re-encrypt existing plaintext `upi_id` rows (parallel to V298 pattern) |
| NPM-AUDIT | Security / Deps | 15 npm vulnerabilities (3 critical, 4 high, 6 moderate, 2 low) in frontend dependencies | `npm audit` output; `ws` memory exhaustion DoS (HIGH) | Run `npm audit fix` for non-breaking subset; review `--force` candidates separately |
| CI-REL-01 | CI / Backend | Spring Boot integration tests (PerformanceReviewControllerTest etc.) fail in CI with ApplicationContext load errors | Pre-existing REL-05/REL-06 issue; 263/263 unit tests pass locally; CI likely missing test profile env vars or Redis service config | Investigate GitHub Actions CI workflow — verify Redis service container config and missing env vars for test profile |

---

## LOW

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| NAV-005 | Navigation | `/admin/users` not in `AUTHENTICATED_ROUTES` in proxy.ts (moot until NAV-001 deployed) | `proxy.ts:70-154` — `/admin/users` absent from AUTHENTICATED_ROUTES | Add to AUTHENTICATED_ROUTES once NAV-001 is verified deployed |
| NAV-006 | E2E | `navigation.spec.ts` uses ambiguous `waitForURL('**/dashboard')` after login | `navigation.spec.ts:17,289` — assertion matches `/me/dashboard` after redirect; `/dashboard` tests don't verify redirect behavior | Update test to `waitForURL('**/me/dashboard')` and test `/dashboard` redirect separately |
| UX-EmptyState | UX | ~8 pages use ad-hoc empty-state text instead of `<EmptyState>` component | `attendance/shift-swap`, `attendance/comp-off`, `attendance/team`, `nu-calendar`, `expenses/reports`, `expenses/[id]` | Low polish: replace raw `<p>No ... found.</p>` with `<EmptyState>` component calls |
| PERF-DAYJS | Performance | `dayjs` bundled as direct dependency but zero direct app imports (Mantine peer only) | Bundle analysis: `dayjs` in `package.json` dependencies; 0 hits in `/app` imports | Remove `dayjs` from `dependencies` or move to `peerDependencies`; saves ~25 KB gzip |
| ISSUE-R02 | Backend | `ContractSignatureRepository` tenant isolation gap (same as BE-03, tracked separately for regression traceability) | Regression report ISSUE-R02 | Same fix as BE-03 above |

---

## Already Fixed This Session (Iteration 5)

| ID | Domain | Title | Status |
|----|--------|-------|--------|
| NAV-001 | Navigation | Edge middleware re-export added (`export { proxy as middleware }`) | FIXED — `proxy.ts` updated |
| NAV-002 | Navigation | `/admin/users` 404 page created with redirect to `/admin/employees` | FIXED — `app/admin/users/page.tsx` created |
| NAV-003 | Navigation | `feature-flags` + `implicit-roles` added to AdminLayoutInner sidebar | FIXED — `AdminLayoutInner.tsx` updated |
| NAV-004 | Navigation | Breadcrumb Home href fixed (`homeHref` prop, default `/me/dashboard`) | FIXED — `Breadcrumbs.tsx` updated |
| RBAC-NEW-01 | RBAC / UI | Compensation page permission guard added | FIXED — `compensation/page.tsx` updated |
| SEC-002a | Security / PII | `BenefitClaim.upiId` `@Convert(EncryptedStringConverter)` added | FIXED (code) — backfill migration still needed |
| ISSUE-R01 | Build | Stale `target/V298` artifact causing Flyway duplicate in integration tests | FIXED — artifact deleted; `PerformanceReviewControllerTest` 22/22 pass |

## Previously Fixed (Prior Sessions / Regression-Verified Through Iteration 5)

| ID | Domain | Status |
|----|--------|--------|
| BE-01 | Backend IDOR | FIXED — `findByIdAndTenantId` at 4 contract service call sites |
| BE-02 | Mass-assignment | FIXED — `BaseEntity` `@JsonProperty(READ_ONLY)` + DTO record pattern |
| RBAC-01 | Webhook HMAC | FIXED — `WebhookSignatureVerifier` HMAC-SHA256 constant-time; 9/9 tests pass |
| RBAC-02 | Feature flag check | FIXED — all 6 FeatureFlagController endpoints have @RequiresPermission |
| RBAC-03 | Tenant self-reg rate limit | FIXED — AUTH bucket (5/min) applied via RateLimitingFilter |
| SEC-001 (code) | Demo creds code | FIXED — V295+V299 migrations; requires Railway env flip (see CRITICAL) |
| SEC-002b/c/d | PF/ESI/Candidate PII | FIXED — `EncryptedStringConverter` + V298 migration |
| UX-01 | SlidePanel a11y | VERIFIED — `role=dialog`, `aria-modal`, focus-trap, Escape key |
| UX-02 | Skip-link | VERIFIED — `app/layout.tsx:79` |
| REL-06 | Backend test suite | FIXED — `38711ed3`; 263/263 pass, 0 failures |
| REL-01 | FE lint gate | FIXED — `3222369e`, `4092c0dd`; eslint --max-warnings=0 exits 0 |
| f50dab70 | Flyway V100/V101 | VERIFIED — no duplicate versions in src/ |

---

## Retest Results (Iteration 5)

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| ContractServiceTest | 17 | 17 | 0 |
| AttendanceRecordServiceTest | 17 | 17 | 0 |
| GoalServiceTest | 19 | 19 | 0 |
| PerformanceReviewServiceTest | 14 | 14 | 0 |
| WebhookSignatureVerifierTest | 9 | 9 | 0 |
| PerformanceReviewControllerTest (after artifact cleanup) | 22 | 22 | 0 |
| **Backend Total (regression run)** | **263** | **263** | **0** |
| Frontend Vitest | 2419 | 2419 | 0 |
| Frontend ESLint (--max-warnings=0) | — | exit 0 | 0 warnings |
| Frontend tsc --noEmit | — | exit 0 | 0 errors |
| Playwright smoke (production, 2026-06-15) | 1 | 1 | 0 |

---

*Last updated: 2026-06-18 — Iteration 5 (Release Gate Agent synthesis)*
*Previous iteration: 2026-06-17 — Score was 74/100 NOT READY*
*This iteration: 84/100 CONDITIONAL-GO*
