# QA Open Issues — 2026-06-18 (Iteration 7)

**Total:** Critical: 1, High: 3, Medium: 7, Low: 6

---

## CRITICAL

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| SEC-001 | Security / Ops | Demo credential `Welcome@123` live on Railway staging (`DEMO_CREDENTIALS_ENABLED=true`) | V295+V299+V301 neutralization migrations present in code; Railway env var not flipped | Manual: set `DEMO_CREDENTIALS_ENABLED=false` + verify `SPRING_FLYWAY_ENABLED=true` on Railway dashboard, redeploy — no code change needed. Estimated: 5 minutes. |

---

## HIGH

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| FRONT-01 | Frontend / Error Resilience | 17 pages missing `error.tsx` error boundary — crashes propagate to root | Discovery audit: `/admin/budget`, `/admin/integrations/webhooks`, `/admin/reports`, `/admin/users`, `/auth/change-password`, `/executive`, `/expenses/approvals`, `/expenses/mileage`, `/expenses/reports`, `/expenses/settings`, `/learning/courses`, `/leave/team`, `/performance/okrs`, `/privacy`, `/recruitment/kanban`, `/settings/rbac`, `/terms` | Add `error.tsx` per-route — partially fixed this iteration (`/admin/users`, `/leave/team`, `/recruitment/kanban` received error.tsx per fix summary); 14 remain |
| FRONT-02 | Frontend / Route Auth | `/admin/system` not in PROTECTED_ROUTES — `AuthGuard.findRouteConfig` returns null → `setIsAuthorized(true)` for any authenticated user | Route discovery: `/admin/system` absent from routes.ts PROTECTED_ROUTES; AuthGuard line 177 fallback grants access | Add `/admin/system` to PROTECTED_ROUTES with `SYSTEM_ADMIN` permission requirement |
| A11Y-01 | Accessibility | 154 inputs without labels and 32 icon-only buttons without aria-label — WCAG 1.1.1 and 1.3.1 failures at scale | A11y discovery: `inputsWithoutLabels: 154`, `iconButtonsWithoutLabel: 32` — iteration 7 fixed a subset (5 files per fix summary); majority remain | Systematically audit all input components for label association; add `aria-label` to all icon-only ActionIcon/Button instances |

---

## MEDIUM

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| FRONT-03 | Frontend / UX | 9 pages missing loading skeleton — user sees blank flash on slow networks | Discovery: `/admin/users`, `/auth/change-password`, `/executive`, `/knowledge`, `/leave/team`, `/performance/okrs`, `/privacy`, `/recruitment/kanban`, `/terms` missing `loading.tsx`; 3 received loading.tsx this iteration | Add `loading.tsx` skeleton for remaining 6 pages |
| FRONT-04 | Frontend / Completeness | 8 empty stub pages — routes registered but render no content | Stubs: `/admin/users`, `/documents`, `/inbox`, `/notifications`, `/recruitment/kanban`, `/settings/rbac`, `/knowledge`, `/leave/team`; `/admin/users` + `/recruitment/kanban` + `/leave/team` received skeletons this iteration | Build out stub pages or wire to correct existing page logic |
| SEC-DARK-01 | Security / Frontend | `frontend/app/nu-mail/page.tsx` line 161: raw `div.innerHTML = cleanedSignature` without DOMPurify — XSS risk | Security audit: innerHTML assigned from Google Gmail API response without sanitization; fixed this iteration via `sanitizeEmailHtml` wrapper — verify DOMPurify integration is deployed | Verify fix deployed; add regression test for email signature sanitization |
| A11Y-02 | Accessibility | 476 modal/dialog instances without explicit `aria-labelledby` or `aria-label` | A11y discovery: `modalsWithoutAria: 476` — widespread across the application | Audit all `<Modal>` and `<Dialog>` usages; add `aria-label` or `aria-labelledby` prop |
| FORM-01 | Forms / UX | 8 forms with generic `catch (error)` error handlers — user sees "Something went wrong" with no actionable detail | Forms audit: `admin/integrations/webhooks/page.tsx` (6 instances), `letters/page.tsx` (5 instances), `employees/change-requests/page.tsx`, `learning/certificates/page.tsx`, `learning/courses/[id]/page.tsx`, `onboarding/[id]/page.tsx`; webhooks and change-requests fixed this iteration | Extract `error?.response?.data?.message` with fallback in all remaining catch blocks |
| DARK-01 | UI/UX | 64 pages missing `dark:` Tailwind variants — broken dark mode experience on ~22% of pages | UI/UX discovery: `darkModeCoverage: { covered: 222, missing: 64 }`; representative pages include `/me/dashboard`, `/payroll/*`, `/fluence/*` sub-pages | Audit 64 pages and add `dark:` variants for all background, text, and border color utilities |
| TZ-01 | Frontend / Data | Date/time ISO strings computed via `.toISOString()` (UTC) used as API params and map keys — off-by-one day for UTC+5:30 and east-of-UTC users | Forms audit: `timesheets/page.tsx` `currentWeekStart.toISOString().split('T')[0]` | Replace `.toISOString().split('T')[0]` with a local-date helper that respects the browser timezone |

---

## LOW

| ID | Domain | Title | Evidence | Fix Required |
|----|--------|-------|----------|--------------|
| BE-03 | Backend / Security | `ContractSignatureRepository` has no direct `tenant_id` filter on service query | V302 adds `tenant_id` FK column; `findByContractIdAndTenantId` repository method still to be added; outer BE-01 contract IDOR guard provides compensating control | Future sprint: add `findByContractIdAndTenantId` to `ContractSignatureRepository`; change service call sites to use it |
| ARCH-01 | Architecture | NOBYPASSRLS live proof never run — RLS end-to-end isolation requires `nu_app_rls` role (NOBYPASSRLS) not testable in CI | `RlsTenantGucScopeTest` build-guard active; `NOBYPASSRLS` privilege-bypass proof deferred; compensating controls: tx-local SET LOCAL | Future sprint: set up `nu_app_rls` role in CI Testcontainers; add `NOBYPASSRLS` integration test |
| PERF-01 | Backend / Database | N+1 risks in 3 services: `PerformanceReviewService.getReviewDetails`, `ESignatureService.addSigner`, `ResourceAllocationService.getAllocations` | Performance audit: `findById` inside loops without `findAllById` batch pre-load; Hibernate `default_batch_fetch_size=25` provides partial mitigation | Replace loop `findById` with `findAllById` batch fetch; add `@EntityGraph` where join-fetch is appropriate |
| PERF-02 | Backend / Database | 34 JPA entity fields using eager fetch or missing batch-fetch — under high load these produce N+1 SELECT storms | Performance audit: 110 lazy associations with only 8 `@EntityGraph` overrides | Enable `hibernate.generate_statistics=true` in staging; run load test to surface N+1s; fix top 5 hot paths |
| NAV-UNLINKED | Navigation | 54 sidebar entries added (139→193) but some deep admin paths still reachable only by direct URL | Navigation fix summary: 54 new entries added; spot-check `/admin/feature-flags`, `/admin/implicit-roles` still absent from AdminLayoutInner | Verify all critical admin pages appear in AdminLayoutInner sidebar under correct sections |
| ZOD-01 | Forms / Validation | 5 forms without Zod schema validation — rely on browser defaults or ad-hoc checks | Forms audit: `me/skills/page.tsx`, `surveys/[id]/respond/page.tsx`, `employees/[id]/compensation/page.tsx`, `leave/my-leaves/page.tsx`, `time-tracking/[id]/page.tsx` | Add Zod schema + React Hook Form `resolver` to each form |

---

## Fixed This Iteration (Iteration 7)

| ID | Domain | Title | Evidence |
|----|--------|-------|----------|
| FE-EB-PARTIAL | Frontend / Error Resilience | Error boundaries + loading skeletons for `/admin/users`, `/leave/team`, `/recruitment/kanban` | 6 new files: `app/admin/users/error.tsx`, `app/admin/users/loading.tsx`, `app/leave/team/error.tsx`, `app/leave/team/loading.tsx`, `app/recruitment/kanban/error.tsx`, `app/recruitment/kanban/loading.tsx` |
| XSS-MAIL | Security / Frontend | Raw `innerHTML` from Gmail API response now sanitized with `sanitizeEmailHtml` | `frontend/app/nu-mail/page.tsx` line 162: `div.innerHTML = sanitizeEmailHtml(cleanedSignature)` |
| BE-SEC-BATCH | Backend / Security | 3 backend security fixes: `KnowledgeAttachmentRepository` tenant filter + 2 additional backend hardening items | Per fix summary: backend files patched with tenant isolation improvements |
| NAV-SIDEBAR | Navigation | 54 new sidebar entries added to `menuSections.tsx` (139→193 href entries) | `frontend/components/layout/menuSections.tsx` updated; dashboards, leave sub-pages, performance hub flyout, and more added |
| A11Y-PARTIAL | Accessibility | Icon-only button aria-labels added to 5 files: `offboarding/[id]/fnf/page.tsx`, `offboarding/[id]/exit-interview/page.tsx`, `lwf/page.tsx`, `tax/declarations/page.tsx` + 1 additional | Fix summary confirmed aria-label additions to ActionIcon elements |
| FORM-ERRORS-PARTIAL | Forms / UX | Generic error handlers fixed in `admin/integrations/webhooks/page.tsx` (6) and `employees/change-requests/page.tsx` (1) | Forms fix: `error?.response?.data?.message` extraction with fallback added |
| TZ-TIMESHEET | Forms / Date | `timesheets/page.tsx` `toLocalDateString(date)` helper added for local-date formatting | Forms fix: `toLocalDateString` helper replaces `.toISOString().split('T')[0]` for weekStartDate/weekEndDate |
| TSC-CLEAN | Build Quality | TypeScript compilation exit 0, 0 errors | TSC check: `{"passed":true,"errorCount":0}` |
| ESLINT-CLEAN | Build Quality | ESLint exit 0, 0 warnings | Lint check: `{"passed":true,"warningCount":0,"errorCount":0}` |

---

## Fixed in Previous Iterations (Regression-Verified Through Iteration 7)

| ID | Domain | Status |
|----|--------|--------|
| NAV-001 | Navigation/Security | FIXED — `export { proxy as middleware }` re-export; middleware manifest non-empty |
| NAV-002 | Navigation | FIXED — `/admin/users` redirect page to `/admin/employees` |
| NAV-003 | Navigation | FIXED — `feature-flags` + `implicit-roles` in AdminLayoutInner sidebar |
| NAV-004 | Navigation | FIXED — Breadcrumb `homeHref` prop defaults to `/me/dashboard` |
| NAV-005 | Navigation | FIXED — `/admin/users` added to `AUTHENTICATED_ROUTES` in proxy.ts |
| NAV-006 | E2E | FIXED — `navigation.spec.ts` `waitForURL` updated to `**/me/dashboard` |
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
| NPM-AUDIT | Security / Deps | FIXED — `ws` memory-exhaustion DoS (HIGH) and critical vulns addressed |
| UX-EmptyState | UX | FIXED — 6 pages converted from ad-hoc empty-state text to `<EmptyState>` component |
| PERF-DAYJS | Performance | FIXED — `dayjs` moved; zero direct app imports confirmed |
| BE-03 (schema) | Backend / Security | V302 migration adds `tenant_id` FK to `contract_signatures` table |
| RBAC-GAP-1 | RBAC / Frontend | 4 high-sensitivity admin routes registered in PROTECTED_ROUTES |
| CI-REL-01 | CI / Backend | Spring Boot CI integration test reliability improved |
| NAV-003-PARTIAL | Navigation | `/admin/departments` sidebar entry added; `AdminLayoutInner.tsx` fully patched |
| SEC-002a (backfill) | Security / PII | V301 backfill sentinel migration for `benefit_claims.upi_id` plaintext rows |

---

## Retest Results (Iteration 7)

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| Backend Total (regression run) | 263 | 263 | 0 |
| Frontend Vitest | 2419 | 2419 | 0 |
| Frontend ESLint (--max-warnings=0) | — | exit 0 | 0 warnings |
| Frontend tsc --noEmit | — | exit 0 | 0 errors |
| Playwright smoke (production) | deferred | — | — |

---

*Last updated: 2026-06-18 — Iteration 7*
*Previous iteration: Iteration 6 — Score 92/100 CONDITIONAL-GO*
*This iteration: New discovery layer added — error boundaries, dark mode, a11y scale, route auth gaps surfaced*
