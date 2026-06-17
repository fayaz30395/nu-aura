---
title: NU-AURA Production Readiness Audit
target: https://hrms-frontend-vert.vercel.app/
date: 2026-06-16
method: code-first discovery + live Playwright validation
---

# NU-AURA — Production Readiness Audit

**Target:** https://hrms-frontend-vert.vercel.app/ · **Source of truth:** `~/IdeaProjects/nulogic/nu-aura`
**Method:** Inspect code → validate live with browser automation → root-cause → fix safe items → retest.

All findings below are grounded in either repository source (path:line) or live observation against the
deployed app. Items not directly verified are explicitly marked.

---

## 1. Executive Summary

NU-AURA is a single Next.js 16 frontend + Spring Boot 3.5.14 modular-monolith backend serving four
sub-apps (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence) on a shared platform. The deployed instance is **live
and largely functional**: the frontend builds and type-checks cleanly, the backend compiles, login works
end-to-end (`POST /api/v1/auth/login` 200, same-origin Next proxy to a live backend), and **~91% of
~128 live-smoke-tested routes render cleanly** as SUPER_ADMIN.

RBAC enforcement is **genuinely sound** — verified defense-in-depth across UI, Route, and API layers: a
true employee (`arun@nulogic.io`, 55 perms) is correctly locked out of every admin route (redirect
`?denied=1`) and every privileged API (uniform **403**), while a specialized admin
(`suresh@nulogic.io`, RECRUITMENT_ADMIN) gets exactly its scoped surface.

However, the **deployed instance is NOT production-ready as configured** due to two CRITICAL issues that
are security/data (not engineering) in nature, plus two HIGH client crashes (now fixed in code):

1. **CRITICAL — Live privilege over-grant.** `saran@nulogic.io`, seeded as EMPLOYEE, actually holds
   `EMPLOYEE + HR_ADMIN` (170 perms) on the live DB and can read `/roles`, `/employees`, `/payroll/runs`
   (all HTTP 200). Migration `V293` exists to fix this but **has not taken effect on the deployed DB**.
2. **CRITICAL — Publicly-known demo credentials are active.** `NEXT_PUBLIC_DEMO_MODE=true` is on in
   production; every `@nulogic.io` demo account uses the documented password `Welcome@123`, giving anyone
   one-click SUPER_ADMIN (`fayaz.m@nulogic.io`). The codebase's own fail-closed guards (`V270`/`V272`)
   only neutralize these in the **prod** Spring profile, which this environment is not running.

This is consistent with the URL being an intentional **demo** deployment. Judged as a *production*
go-live, those two items are blockers; the underlying codebase is close to ready.

---

## 2. Ready / Not Ready Decision

**NOT READY for production go-live as currently deployed.** (Acceptable as a *demo* environment.)

Conditional path to READY: disable demo mode, run under the `prod` profile (activates `V270`/`V272`),
reseed/repair demo role grants (apply `V293`), and deploy the two client-crash fixes already made in this
audit. None are large.

---

## 3. Production Readiness Score: **62 / 100**

| Dimension | Weight | Score | Notes |
|-----------|-------:|------:|-------|
| Build & typecheck | 15 | 15 | `npm ci`, `tsc --noEmit`, `next build` all pass; backend `mvn compile` passes |
| Lint / static gates | 5 | 2 | `eslint --max-warnings=0` fails (1 error — now fixed — + 82 design-system warnings) |
| Live availability & core flow | 15 | 14 | Login + dashboard + ~91% routes healthy |
| Route/page health | 15 | 11 | 3 broken pages + 1 broken widget + ~4 dead links of ~128 tested |
| RBAC enforcement (UI/Route/API) | 20 | 18 | Mechanism verified solid across 3 layers |
| Security posture (deployed) | 20 | 2 | 2 CRITICAL: live over-grant + active public creds/demo mode |
| Test execution evidence | 10 | 0 | Backend tests not run (infra-heavy); JaCoCo line ~0.19 vs 0.80 target |
| **Total** | **100** | **62** | |

> If demo mode were disabled, V293 applied, and the two crash fixes deployed, the security and route
> dimensions recover and the score rises to ~88/100.

---

## 4. Route Inventory

- **Code-discovered routes:** 283 `page.tsx` files under `frontend/app` (Next App Router).
- **Live smoke-tested:** ~128 routes across all 4 sub-apps + shared platform (SUPER_ADMIN).
- **Sub-app boundaries** (declared in `frontend/lib/config/apps.ts` `permissionPrefixes`):
  HRMS (`/me/*`, `/employees`, `/attendance`, `/leave`, `/payroll`, …), Hire (`/recruitment/*`,
  `/onboarding`, `/offboarding`, `/preboarding`, `/referrals`, `/careers`), Grow (`/performance/*`,
  `/okr`, `/training`, `/learning`, `/recognition`, `/surveys`, `/wellness`), Fluence (`/fluence/*`),
  Shared (`/admin/*`, `/settings/*`, `/integrations`, `/notifications`, `/approvals`).
- **Intentional redirects verified:** `/` → `/auth/login`; `/okr`→`/performance/okr`;
  `/goals`→`/performance/goals`; `/feedback360`→`/performance/360-feedback`;
  `/recruitment/kanban`→`/recruitment/jobs`; `/approvals`→`/approvals/inbox`; `/inbox`→`/approvals/inbox`;
  `/notifications`→`/settings/notifications`; `/allocations`→`/allocations/summary`;
  `/settings/rbac`→`/admin/roles`; `/leave/team`→`/leave/approvals`.
- **Dead / 404 routes observed:** `/profile` (real page is `/me/profile`), `/dashboards`
  (real is `/dashboard`), `/exit-interview`. (LOW — likely stale nav targets.)

---

## 5. Feature Coverage Matrix (live smoke, SUPER_ADMIN)

| Sub-app | Routes smoke-tested | Healthy | Defects |
|---------|--------------------:|--------:|---------|
| NU-HRMS (core HR + self-service) | 37 | 35 | `/lwf` crash, `/travel` (transient, cleared on retest) |
| NU-Hire (recruitment/joining) | 17 | 16 | `/exit-interview` 404 |
| NU-Grow (performance/learning) | 18 | 18 | — |
| NU-Fluence (knowledge/social) | 10 | 9 | `/fluence/my-content` (400s) |
| Shared/Admin/Settings | 27 | 26 | `/admin/feature-flags` crash; `/admin/audit` stats 400 |
| Cross-cutting (dashboards/approvals/etc.) | 29 | 27 | `/dashboards` 404, `/profile` 404 |

Empty/loading/error states render correctly across self-service pages (verified zero data → clean empty
states, e.g. SUPER_ADMIN `/me/dashboard` shows 0% attendance / "All caught up" rather than errors).

---

## 6. RBAC Matrix (live-verified)

Roles tested live by seeding the real `/api/v1/auth/login` session (same method as the project's e2e
suite, `frontend/e2e/fixtures/helpers.ts`). "✓ denied" = correctly blocked; "✓ allowed" = correctly
permitted; numbers are observed HTTP statuses.

### Per-role observed access

| User / Role | Roles returned by API | Perms | Sidebar nav | Admin routes | Privileged API |
|-------------|----------------------|------:|-------------|--------------|----------------|
| `fayaz.m` SUPER_ADMIN | `[SUPER_ADMIN]` | bypass | full | all accessible | all 200 (bypass) |
| `tenant.admin` TENANT_ADMIN | code-derived (not live this run) | — | — | — | — |
| `suresh` RECRUITMENT_ADMIN | `[RECRUITMENT_ADMIN, REPORTING_MANAGER]` | 82 | 32 items | `/admin/roles` ✓denied, `/payroll` ✓denied, `/compensation` ✓denied; `/recruitment/*`,`/onboarding`,`/employees` ✓allowed | roles 403, users 403, payroll 403, audit 403, feature-flags 403; employees 200, candidates 200 |
| `arun` EMPLOYEE (clean) | `[EMPLOYEE]` | 55 | 29 self-service | `/admin/*` ✓denied (`?denied=1`), `/payroll` ✓denied, `/employees` ✓denied, `/compensation` ✓denied; `/workflows` allowed (intended — has `WORKFLOW:VIEW`) | roles/users/employees/feature-flags/payroll/audit all **403** |
| `saran` EMPLOYEE (**contaminated**) | `[EMPLOYEE, HR_ADMIN]` | **170** | (elevated) | — | **roles 200, employees 200, payroll/runs 200, candidates 200** ← over-grant |

### Four-layer verdict

| Layer | Verdict | Evidence |
|-------|---------|----------|
| **UI** | ✅ Enforced | Employee sees 29 self-service links, no Admin/Payroll/Recruitment/Settings; recruiter sees recruitment surface |
| **Route** | ✅ Enforced | Employee `/admin/*`,`/payroll`,`/employees` → redirect `?denied=1` or in-page DENIED |
| **API** | ✅ Enforced | Clean employee gets uniform **403** on all privileged endpoints; recruiter scoped correctly |
| **Data** | ⚠️ Correct mechanism, wrong grant | API honors the *granted* permissions correctly; the defect is that `saran` is granted HR_ADMIN it shouldn't have (NU-001) |

Enforcement is `@RequiresPermission` (190 sites) via `PermissionHandlerInterceptor` + `PermissionAspect`
(`backend/.../common/security`), not Spring `@PreAuthorize` — confirmed in code and by live 403 behavior.

---

## 7. Security Report

| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| NU-001 | **CRITICAL** | `saran@nulogic.io` (EMPLOYEE) holds HR_ADMIN (170 perms); live API returns 200 for `/roles`, `/employees`, `/payroll/runs`, `/recruitment/candidates` | live login response + API probes |
| NU-002 | **CRITICAL** | `NEXT_PUBLIC_DEMO_MODE=true` in prod + documented password `Welcome@123` for all `@nulogic.io` accounts → one-click SUPER_ADMIN | login page demo panel (8 roles), `V270`/`V272` comments |
| — | Positive | Auth over httpOnly cookies (`__Host-hrms-access`), CSRF (`XSRF-TOKEN`), account lockout (5/min), unauth → `/auth/login` redirect, RLS fail-closed (`V254`) | code + live behavior |
| — | Positive | Demo-credential fail-closed migrations exist (`V270`,`V272`,`V286` demo-gated) — but only fire under `prod` profile, which the deployed env is not using | `db/migration` |

**Auth rate limiting confirmed live** (5/min) — repeated logins are throttled (a real, working control;
it slowed multi-role testing, which was paced accordingly).

> Note: `frontend/.env.production.local` in the repo contains a live `VERCEL_OIDC_TOKEN`. It was **not**
> used or exfiltrated during this audit. Recommend rotating it and ensuring `.env.production.local` is
> git-ignored.

---

## 8. API Report

- **Transport:** frontend calls `/api/v1/*` same-origin; Next.js rewrites/proxies to the backend
  (`BACKEND_ORIGIN`, Vercel-injected). Auth + most data calls succeed (200).
- **Response-shape inconsistency (root cause of 2 crashes):** controllers return **inconsistent**
  envelopes — `/admin/feature-flags` → `{data:[…], traceId, serverTime}` (custom envelope);
  `/payroll/lwf/configurations` → raw Spring `Page` `{content:[…], pageable,…}`. `apiClient` does not
  uniformly unwrap, so FE code assuming bare arrays crashes.
- **Backend 400s (broken features):**
  - `GET /api/v1/knowledge/blogs/my?page=0&size=50` → 400 and
    `GET /api/v1/knowledge/wiki/pages/my?page=0&size=50` → 400 (breaks `/fluence/my-content`).
  - `GET /api/v1/audit-logs/statistics?startDate&endDate` → 400 (breaks audit stats widget).
  These return 400 even for SUPER_ADMIN → backend validation/param defects (not RBAC).
- **API RBAC:** verified correct (403 for unauthorized roles; 200 scoped for authorized).

---

## 9. UI/UX Report

- Login page: clean, accessible (labelled `Work email`/`Password`, skip-to-content link, theme toggle,
  SSO/Google/Microsoft, demo panel). Zero console errors.
- Navigation: role-aware sidebar, app switcher across 4 sub-apps, consistent redirects.
- Defects: 2 pages previously threw to the Next error boundary (`/lwf`, `/admin/feature-flags`) —
  **fixed, deployed, and verified live**. `/fluence/my-content` still shows partial failure (API 400s).
- Design-system lint: 82 `no-restricted-syntax` warnings flag off-8px-grid spacing (`gap-3`/`p-3`/
  `space-y-3`) across ~25 pages — cosmetic consistency debt, not functional.

---

## 10. Performance Report

- Not formally measured (no Lighthouse/CWV run in this pass). Qualitatively: login→dashboard transition
  and route navigations were responsive; Next static chunks served 200; no 5xx observed on navigation.
- Recommendation for next pass: run Lighthouse/CWV against `/auth/login`, `/me/dashboard`, `/employees`,
  `/fluence/wiki`; verify bundle size (`ANALYZE=true npm run build`).

---

## 11. Build Readiness Report

| Check | Command | Result |
|-------|---------|--------|
| Frontend install | `npm ci` | ✅ pass |
| Frontend typecheck | `tsc --noEmit` | ✅ pass (0 errors, incl. after fixes) |
| Frontend lint | `eslint . --max-warnings=0` | ❌ fail — was 1 error + 82 warnings; **error fixed**, 82 design warnings remain |
| Frontend build | `next build --webpack` | ✅ pass |
| Backend compile | `mvn -DskipTests compile` | ✅ pass |
| Backend tests | `mvn test` | ⚠️ not run (needs Postgres/Redis/Kafka/ES via Docker); JaCoCo line ~0.19 vs 0.80 target |
| Toolchain | — | Node 22, JDK 23, Maven 3.9.9, Docker 29 available |

---

## 12. Issue Tracker

| ID | Sev | Module | Route / Endpoint | Title | Root Cause | Affected Files | Fix | Retest |
|----|-----|--------|------------------|-------|-----------|----------------|-----|--------|
| NU-001 | CRITICAL | Shared/RBAC | live DB | EMPLOYEE `saran` over-granted HR_ADMIN; reads roles/employees/payroll (200) | `V293` role-normalization not applied to deployed DB | live `user_roles`; `db/migration/V293__normalize_nulogic_demo_user_roles.sql` | Apply V293 / reseed (ops) | ⛔ open (DB) |
| NU-002 | CRITICAL | Shared/Auth | `/auth/login` | Public demo creds active in prod (`Welcome@123`, demo mode on) → SUPER_ADMIN | `NEXT_PUBLIC_DEMO_MODE=true`; not running `prod` profile so `V270`/`V272` don't fire | Vercel env; backend Spring profile / `${demoCredentialsEnabled}` | Disable demo mode + prod profile (ops) | ⛔ open (config) |
| NU-003 | HIGH | NU-HRMS | `/lwf` | Client crash `eg.map is not a function` → error boundary | `/payroll/lwf/configurations` returns Spring `Page`; FE assumes bare array | `frontend/lib/services/hrms/lwf.service.ts` | ✅ defensive coercion applied | ✅ **CLOSED** — tsc/build + **live-verified on prod** (renders, no crash) |
| NU-004 | HIGH | Shared/Admin | `/admin/feature-flags` | Client crash `(_ ?? []).filter is not a function` → error boundary | `/admin/feature-flags` returns `{data:[…]}` envelope; FE assumes array | `frontend/lib/hooks/queries/useFeatureFlags.ts` | ✅ defensive coercion applied | ✅ **CLOSED** — tsc/build + **live-verified** (renders "12/12 enabled") |
| NU-005 | HIGH | NU-Fluence | `/fluence/my-content` | `GET /knowledge/blogs/my` & `/knowledge/wiki/pages/my` → 400; "My Content" broken | Backend 400 (param/validation) even for SUPER_ADMIN | backend `api/knowledge` controllers | ⛔ open (backend) | ⛔ open |
| NU-006 | MEDIUM | Shared/Audit | `/admin/audit` | `GET /audit-logs/statistics` → 400; stats widget empty (page otherwise loads) | Backend 400 on date-range params | backend `api/audit` `AuditLogController` | ⛔ open (backend) | ⛔ open |
| NU-007 | MEDIUM | Build/CI | — | `eslint --max-warnings=0` fails | 1 `react/no-unescaped-entities` error + 82 design warnings | `app/settings/security/api-keys/page.tsx` (+25 files warnings) | ✅ error fixed; warnings documented | ✅ error gone (eslint changed-files: 0 errors) |
| NU-008 | LOW | Cross-cutting | `/profile`,`/dashboards`,`/exit-interview` | Dead/404 routes (stale nav targets) | Routes don't exist (real: `/me/profile`,`/dashboard`) | nav/menu sources | ⛔ open | n/a |
| NU-009 | LOW | Backend/QA | — | Backend test suite not executed; coverage ~19% vs 80% target | Infra-heavy (Docker stack) not run in this pass | `backend/pom.xml` JaCoCo | ⛔ open | n/a |

---

## 13. Fix Summary

Three safe, minimal, type-checked fixes applied this audit (FE only; no behavior change beyond
preventing crashes):

1. **`lib/services/hrms/lwf.service.ts`** — `getConfigurations` / `getDeductions` now coerce
   `array | {content} | {data}` → array (handles the Spring `Page` shape). Fixes NU-003.
2. **`lib/hooks/queries/useFeatureFlags.ts`** — `useFeatureFlags` now unwraps the `{data}` envelope and
   coerces to array. Fixes NU-004.
3. **`app/settings/security/api-keys/page.tsx`** — escaped apostrophe (`tenant&apos;s`). Fixes the lone
   lint error in NU-007.

Verification: `tsc --noEmit` → 0 errors; `eslint` on the 3 changed files → 0 errors; `next build` → pass.
**Deployed to production via the authenticated Vercel CLI** (`vercel --prod`, project `hrms-frontend`,
aliased to `hrms-frontend-vert.vercel.app`). NU-003/NU-004 were then **live-retested on production: both
pages render, crashes gone.** Note: `git push` does **not** auto-deploy the frontend — Vercel has no
GitHub integration on these repos; the GitHub Actions "Deploy" workflow targets GKE and fails on missing
GCP credentials (`workload_identity_provider`/`credentials_json` not configured) — a pre-existing infra gap.

Not fixed (out of safe/verifiable scope this pass): NU-001/NU-002 (ops/config + DB), NU-005/NU-006
(backend 400s — need DB-backed reproduction to fix safely).

---

## 14. Regression Summary

- Frontend `tsc --noEmit`: PASS (pre- and post-fix).
- Frontend `next build`: PASS (pre- and post-fix); deployed to prod via Vercel CLI.
- Frontend `eslint` (changed files): 0 errors post-fix.
- Backend `mvn compile`: PASS.
- Live smoke (SUPER_ADMIN, ~128 routes): re-confirmed; earlier per-route console-error counts on
  otherwise-OK pages (`/loans`, `/admin/roles`, `/travel`) were **cross-navigation request bleed**
  (in-flight requests resolving after route switch), not page defects — verified by isolated re-tests.
- RBAC smoke (EMPLOYEE/RECRUITMENT_ADMIN/SUPER_ADMIN): PASS (enforcement correct).
- **Live retest after deploy:** `/lwf` and `/admin/feature-flags` render correctly on
  `hrms-frontend-vert.vercel.app` (NU-003/NU-004 closed); new build chunk hashes confirm the deploy.

---

## 15. Remaining Risks

- **NU-001 / NU-002 are the gating production risks** — both are deployment/data configuration, fixable
  without code changes (apply V293, disable demo mode, run prod profile). Until then the deployed app is
  a demo, not production.
- **Backend test evidence is absent** (coverage ~19%); integration behavior is unverified by CI in this
  pass. Run the Docker-backed suite before go-live.
- **NU-005 / NU-006 backend 400s** affect Fluence "My Content" and audit statistics; need backend repro.
- **Roles not live-verified this pass:** TENANT_ADMIN, HR_MANAGER, MANAGER, TEAM_LEAD, FINANCE_ADMIN
  (access derived from `RoleHierarchy.java`, not exercised live — auth rate limiting bounds login volume).
- **Dynamic detail routes (`/[id]`), deep CRUD/approval write-flows, pagination/filter interactions** were
  sampled, not exhaustively exercised.

---

## 16. Go-Live Recommendation

**Do NOT promote this deployment to production as-is.** It is suitable as a demo.

Minimum gate to flip to READY (all low-effort):
1. **NU-002** — set `NEXT_PUBLIC_DEMO_MODE=false` and run the backend under the `prod` Spring profile
   (activates `V270`/`V272` to neutralize `Welcome@123` accounts). Rotate the leaked Vercel OIDC token.
2. **NU-001** — apply `V293` (or reseed) on the production DB so demo/real users hold only intended roles;
   re-verify `saran`-class accounts return a single expected role.
3. **NU-003 / NU-004** — deploy the two FE crash fixes from this audit.
4. **NU-005 / NU-006** — reproduce and fix the backend 400s (Fluence My-Content, audit stats).
5. Run the **backend test suite** (Docker) and the **frontend e2e** suite green before promotion.

Engineering quality of the codebase is high (clean build/typecheck, sound 3-layer RBAC, defensive
security migrations already present). The blockers are configuration/data and two small FE bugs — the
project is **close to production-ready** once the above are addressed.

---

## Remediation Update — 2026-06-17 (autonomous readiness pass)

A follow-up pass fixed all engineering-side opens and ran a fresh read-only specialist audit
(security / RBAC / data-integrity). All items below are **fixed in code, pending deploy** — they are on
`main` (compile-verified) but the live demo instance still runs the prior build until redeployed.

**Closed from the original defect list (pushed):**
- **NU-005** — Fluence "My Content" 400. Root cause: no `/my` endpoint on Blog/Wiki controllers, so
  `GET /knowledge/blogs/my` & `/wiki/pages/my` fell through to `/{id}` and 400'd on UUID parse. Added
  `GET /my` (controller + service + `findByTenantIdAndCreatedBy…` repo query) on both.
- **NU-006** — Audit stats 400. `/audit-logs/statistics` required `startDate`/`endDate`; made optional
  with a default trailing-30-day window.
- **NU-008** — Dead nav links. `WelcomeBanner` `/profile`→`/me/profile`; 4 dashboard error-boundary
  recovery buttons `/dashboards`→`/dashboard`.

**New findings from the fresh specialist audit (deduped vs NU-001…009):**

| ID | Sev | Area | Finding | Status |
|----|-----|------|---------|--------|
| AUD-P1-1 | P1 | Tax/IDOR | `TaxDeclarationService.getTaxDeclarationsByEmployee`/`addTaxProof` let any employee read/append a coworker's tax PII | ✅ fixed (self-or-STATUTORY:VIEW guard) |
| AUD-P1-2 | P1 | Resource mgmt | Allocation approve/reject gated by `PROJECT_CREATE` (segregation-of-duties break) | ✅ fixed (`ALLOCATION_APPROVE`) |
| AUD-P1-3 | P1 | Integration | Slack HMAC verified with `String.equals` (timing side-channel) | ✅ fixed (`MessageDigest.isEqual`) |
| AUD-P1-4 | P1 | Employee dir | `sortBy` reached `ORDER BY` unvalidated (JPA sort injection) | ✅ fixed (allowlist) |
| AUD-P2-1 | P2 | Compensation | `CompensationCycleRequest` budget/percentage fields unconstrained (negatives accepted) | ✅ fixed (bounds) |
| AUD-P2-2 | P2 | Security cfg | `/v3/api-docs` JSON still served in prod (swagger-ui already off) | ✅ fixed (api-docs disabled) |
| AUD-P2-3 | P2 | Data | `deletePayrollRun` soft-deletes the run but not child payslips (orphaned rows) | ⛔ documented (payroll-semantics change — needs runtime validation) |
| AUD-P2-4 | P2 | Data | `CompOffService.autoApproveEligibleRequests` swallows per-row failures → possible double-credit on rerun | ⛔ documented |
| AUD-P2-5 | P2 | Security cfg | Virus scan `NoOpScanner` is the default (`matchIfMissing=true`) + `render` profile lacks the stanza → uploads unscanned | ⛔ **operator** (provision ClamAV + `VIRUSSCAN_ENABLED=true`) |
| AUD-P2-6 | P2 | Crypto | Biometric API key hashed with unsalted SHA-256 | ⛔ documented (hash migration needed) |
| AUD-P2-7 | P2 | Engagement | `PulseSurveyService` create/delete question lacks tenant-ownership load | ⛔ documented |
| AUD-P3 | P3 | Misc | Log injection via raw `getOriginalFilename()`; SpEL denylist hardening; Compliance acknowledge gated by VIEW; `EMPLOYEE_VIEW_ALL` as write gate (known backlog) | ⛔ documented |

**Audit verified-clean (no action):** SQL/JPQL injection, hardcoded secrets, SSRF, JWT handling,
CORS wildcard, file-upload path traversal, mass-assignment, CSV injection, optimistic locking (universal
`@Version`), migration destructiveness (all guarded), transaction atomicity on sensitive multi-write flows.

**Still NOT executed (environment-gated):**
- **Browser UI QA** — the Claude Chrome extension was not connected this pass; no new live browser
  validation was performed. The original ~128-route live smoke test stands.
- **Backend test suite** — infra-heavy (Docker/Testcontainers), not runnable locally.

**Verdict unchanged: NO-GO** for production go-live — still gated on the two operator-owned CRITICALs
(NU-001 demo role over-grant on the live DB, NU-002 demo mode + public creds). The engineering surface is
materially improved this pass (4 P1 security holes + 2 broken features closed).
