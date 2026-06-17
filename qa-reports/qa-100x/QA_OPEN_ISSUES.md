# QA Open Issues — 2026-06-18 (Iteration 6 — Final Gate)

**Total:** Critical: 1, High: 0, Medium: 0, Low: 2

---

## CRITICAL

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| SEC-001 | Security / Ops | Demo credential `Welcome@123` live on Railway staging (`DEMO_CREDENTIALS_ENABLED=true`) | V295+V299+V301 neutralization migrations present in code; Railway env var not flipped | Manual: set `DEMO_CREDENTIALS_ENABLED=false` + verify `SPRING_FLYWAY_ENABLED=true` on Railway dashboard, redeploy — no code change needed. Estimated: 5 minutes. |

---

## HIGH

_None remaining. All HIGH issues resolved this iteration._

---

## MEDIUM

_None remaining. All MEDIUM issues resolved this iteration._

---

## LOW

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| BE-03 | Backend / Security | `ContractSignatureRepository` has no direct `tenant_id` filter on service query | V302 adds `tenant_id` FK column to `contract_signatures` table (committed this iteration); `findByContractIdAndTenantId` repository method still to be added; outer BE-01 contract IDOR guard provides compensating control | Future sprint: add `findByContractIdAndTenantId` to `ContractSignatureRepository`; change service call sites to use it |
| ARCH-01 | Architecture | NOBYPASSRLS live proof never run — RLS end-to-end isolation requires `nu_app_rls` role (NOBYPASSRLS) not testable in CI | `RlsTenantGucScopeTest` build-guard active (tests tx-local scope isolation); `NOBYPASSRLS` privilege-bypass proof deferred; compensating controls: tx-local SET LOCAL, RlsTenantGucScopeTest | Future sprint: set up `nu_app_rls` role in CI Testcontainers; add `NOBYPASSRLS` integration test |

---

## Fixed This Iteration (Iteration 6)

| ID | Domain | Title | Evidence |
|----|--------|-------|----------|
| BE-03 (schema) | Backend / Security | V302 migration adds `tenant_id` FK to `contract_signatures` table | `V302__add_tenant_id_to_contract_signatures.sql` committed; reduces outer-guard reliance |
| ARCH-01 (stub) | Architecture | RLS test stub written; Docker/CI proof pathway established | Test stub class written; Testcontainers Docker setup documented; full CI role proof deferred to next sprint as LOW |
| RBAC-GAP-1 | RBAC / Frontend | 4 high-sensitivity admin routes registered in PROTECTED_ROUTES (`/admin/audit`, `/admin/budget`, `/admin/feature-flags`, `/admin/api-keys`) | 4 routes confirmed registered (`routesRegistered: 4`); SUPER_ADMIN bypass preserved; auth-only fallback for remaining lower-sensitivity routes accepted |
| CI-REL-01 | CI / Backend | Spring Boot CI integration test reliability improved — stale `@v5` action pins replaced; Redis service config verified | `docker/build-push-action@v6` only valid third-party pin remaining; first-party `@v5` actions replaced; CI workflow correct |
| NAV-003-PARTIAL | Navigation | `/admin/departments` sidebar entry added; `AdminLayoutInner.tsx` fully patched | `Building2` + `Smartphone` icon imports added; `departments` entry added under Organization section in `AdminLayoutInner.tsx` |
| NPM-AUDIT | Security / Deps | npm vulnerability count reduced — non-breaking subset of `npm audit fix` applied | `ws` memory-exhaustion DoS (HIGH) and critical vulns addressed; remaining vulns require manual review |
| UX-EmptyState | UX | 6 pages converted from ad-hoc empty-state text to `<EmptyState>` component | `attendance/shift-swap`, `attendance/comp-off`, `attendance/team`, `nu-calendar`, `expenses/reports`, `expenses/[id]` all updated; tsc exit 0 confirmed |
| PERF-DAYJS | Performance | `dayjs` moved — zero direct app imports confirmed; bundle savings ~25 KB gzip | `dayjsMoved: true`, `dayjsHasDirectImports: false`; Mantine peer dependency handled correctly |
| NAV-005 | Navigation | `/admin/users` added to `AUTHENTICATED_ROUTES` in proxy.ts | Entry confirmed after NAV-001 middleware re-export verified deployed |
| NAV-006 | E2E | `navigation.spec.ts` `waitForURL` assertion updated to `**/me/dashboard` | `/dashboard` redirect tested separately; assertion no longer ambiguous |
| SEC-002a (backfill) | Security / PII | V301 backfill sentinel migration for `benefit_claims.upi_id` plaintext rows | `V301__backfill_benefit_claims_upi_id.sql` committed `8e7016e3` |

---

## Fixed in Previous Iterations (Regression-Verified Through Iteration 6)

| ID | Domain | Status |
|----|--------|--------|
| NAV-001 | Navigation/Security | FIXED — `export { proxy as middleware }` re-export; middleware manifest non-empty |
| NAV-002 | Navigation | FIXED — `/admin/users` redirect page to `/admin/employees` |
| NAV-003 | Navigation | FIXED — `feature-flags` + `implicit-roles` in AdminLayoutInner sidebar |
| NAV-004 | Navigation | FIXED — Breadcrumb `homeHref` prop defaults to `/me/dashboard` |
| RBAC-NEW-01 | RBAC/UI | FIXED — Compensation page permission guard added |
| SEC-002a (code) | Security/PII | FIXED — `BenefitClaim.upiId` `@Convert(EncryptedStringConverter)` |
| BE-01 | Backend IDOR | FIXED — `findByIdAndTenantId` at 4 contract service call sites |
| BE-02 | Mass-assignment | FIXED — `BaseEntity` `@JsonProperty(READ_ONLY)` + DTO record pattern |
| RBAC-01 | Webhook HMAC | FIXED — `WebhookSignatureVerifier` HMAC-SHA256 constant-time; 9/9 tests pass |
| RBAC-02 | Feature flag check | FIXED — all 6 FeatureFlagController endpoints have @RequiresPermission |
| RBAC-03 | Tenant self-reg rate limit | FIXED — AUTH bucket (5/min) applied via RateLimitingFilter |
| SEC-001 (code) | Demo creds code | FIXED — V295+V299+V301 migrations; requires Railway env flip (see CRITICAL) |
| SEC-002b/c/d | PF/ESI/Candidate PII | FIXED — `EncryptedStringConverter` + V298 migration |
| UX-01 | SlidePanel a11y | VERIFIED — `role=dialog`, `aria-modal`, focus-trap, Escape key |
| UX-02 | Skip-link | VERIFIED — `app/layout.tsx:79` |
| REL-06 | Backend test suite | FIXED — `38711ed3`; 263/263 pass, 0 failures |
| REL-01 | FE lint gate | FIXED — `3222369e`, `4092c0dd`; eslint --max-warnings=0 exits 0 |
| f50dab70 | Flyway V100/V101 | VERIFIED — no duplicate versions in src/ |
| ISSUE-R01 | Build | FIXED — stale target/V298 artifact deleted |

---

## Retest Results (Iteration 6)

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| ContractServiceTest | 17 | 17 | 0 |
| AttendanceRecordServiceTest | 17 | 17 | 0 |
| GoalServiceTest | 19 | 19 | 0 |
| PerformanceReviewServiceTest | 14 | 14 | 0 |
| WebhookSignatureVerifierTest | 9 | 9 | 0 |
| PerformanceReviewControllerTest | 22 | 22 | 0 |
| **Backend Total (regression run)** | **263** | **263** | **0** |
| Frontend Vitest | 2419 | 2419 | 0 |
| Frontend ESLint (--max-warnings=0) | — | exit 0 | 0 warnings |
| Frontend tsc --noEmit | — | exit 0 | 0 errors |
| Playwright smoke (production) | 1 | 1 | 0 |

---

*Last updated: 2026-06-18 — Iteration 6 (Final Gate)*
*Previous iteration: 2026-06-18 — Iteration 5 — Score was 84/100 CONDITIONAL-GO*
*This iteration: 92/100 CONDITIONAL-GO — single code-complete blocker: SEC-001 Railway env flip*
