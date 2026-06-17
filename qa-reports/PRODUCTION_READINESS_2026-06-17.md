# NU-AURA — Production Readiness Assessment

**Date:** 2026-06-17 · **HEAD:** f50dab70 · **Target:** https://hrms-frontend-vert.vercel.app/
**Method:** Code-first discovery (source of truth) + live Playwright/browser validation on the deployed stack, using demo accounts (`Welcome@123`).
**Orchestrator:** Autonomous Production Readiness sweep (7-phase). Demo tenant `660e8400-e29b-41d4-a716-446655440001`.

> Coverage note: code discovery is exhaustive (evidence-cited to file:line via discovery agents). Live validation is **representative** — every sub-app and a 3-tier RBAC boundary set were exercised live; per-route×per-role exhaustive live execution is extrapolated from code where not directly executed, and flagged as such.

---

## 1. Executive Summary

NU-AURA is a multi-tenant HR platform (4 sub-apps: NU-HRMS, NU-Hire, NU-Grow, NU-Fluence) — **Next.js 16 App Router** frontend on Vercel, **Spring Boot 3.5.14 / Java 21** backend on Railway, PostgreSQL with **row-level security (RLS)**, Redis, Kafka, Elasticsearch.

The application is **functionally production-grade**: all four sub-apps render with real data, authentication (credential + one-click demo) works, the core write path works (clock-in/out verified live), and **RBAC enforces correctly across all four layers** (edge middleware, client guard, route config, backend aspects + RLS) — confirmed live at three privilege tiers. Five functional defects found earlier this session were fixed, verified live, and deployed. Baseline gates (TypeScript, ESLint) are green.

The platform is **not yet cleared for real-user launch** for two reasons, both **configuration, not code**: (1) the deployed environment is in **demo mode** (public one-click SUPER_ADMIN login; 17 accounts share `Welcome@123`) — the code is verified fail-closed for production, so this is a 2-env-var flip; (2) some pre-launch items (legal content ownership, live NOBYPASSRLS proof, Vercel Pro for edge concurrency headroom) remain.

## 2. Ready / Not Ready Decision

**🟡 CONDITIONAL-GO** — Engineering-ready. **NOT ready for real users until the demo-mode env flip + the documented pre-launch checklist (§15) are completed.** No open BLOCKER or CRITICAL **code** defects found in this sweep.

## 3. Production Readiness Score: **86 / 100**

| Dimension | Score | Notes |
|---|---|---|
| Functionality (core flows) | 90 | All 4 sub-apps render; auth, write-path, dashboards verified live |
| Security / RBAC | 90 | 4-layer enforcement verified live (3 tiers) + code; RLS fail-closed; IDOR sweep closed |
| Build/CI readiness | 88 | tsc + eslint green; Vercel build green (250 pages); backend tests CI-only (Docker locally) |
| Data integrity | 84 | Tenant isolation strong; minor display bugs fixed this session |
| Performance | 80 | Fluid Compute enabled; residual edge 503s on prefetch (harmless, Hobby-tier cap) |
| Ops / deploy | 82 | Manual Vercel deploy (no git auto-deploy); Railway Kafka ephemeral (staging) |
| **Overall** | **86** | Config-gated for real users, not code-gated |

## 4. Route Inventory (frontend, Next.js App Router)

- **~283 page routes** across `frontend/app` (per evidence vault Route-Map-Full + apps.ts `PLATFORM_APPS.routePrefixes`).
- **Sub-apps:** NU-HRMS (core HR, /employees /attendance /leave /payroll /me/* etc.), NU-Hire (/recruitment /onboarding /preboarding /offboarding /offer-portal /careers /referrals), NU-Grow (/performance /okr /feedback360 /training /learning /recognition /surveys /wellness), NU-Fluence (/fluence/wiki /blogs /templates /drive /search /my-content /wall /dashboard), shared/global (/dashboard /admin /settings /reports /analytics /notifications /profile).
- **Public (no-auth) routes** (proxy.ts + routes.ts PUBLIC_ROUTES): `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/careers`, `/offer-portal`, `/preboarding/portal/[token]`, `/exit-interview/[token]`, `/sign/[token]`, `/terms`, `/privacy`, `/`.
- Live-confirmed rendering: HRMS (employees=17, attendance, leave, payroll, approvals, org-chart), NU-Hire, NU-Grow, NU-Fluence wiki, Admin console — all clean.

## 5. Feature Coverage Matrix (live-validated this session)

| Sub-app | Representative surfaces exercised live | Result |
|---|---|---|
| NU-HRMS | dashboard, employees, attendance, leave, payroll, approvals, org-chart, /me/* (profile, payslips, dashboard) | ✅ render + data; write-path (clock in/out) ✅ |
| NU-Hire | /recruitment (as REC admin) | ✅ render + role-scoped |
| NU-Grow | /performance (RBAC redirect tested) | ✅ render (SUPER_ADMIN); 🔒 correctly blocked for REC |
| NU-Fluence | /fluence/wiki | ✅ render (built; not the "Phase-2 stub" older docs claim) |
| Shared | /admin, /auth/login, /terms, /privacy | ✅ render; admin shows tenants=2, system Operational |

## 6. RBAC Matrix

**Roles (canonical, RoleHierarchy.java + V107 seeds):** SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, MANAGER/DEPARTMENT_MANAGER, TEAM_LEAD, RECRUITMENT_ADMIN, EMPLOYEE (+ specialist roles: PAYROLL_ADMIN, FINANCE_ADMIN, etc.).
**Permission model:** `RESOURCE:ACTION` (338 constants), `MODULE:MANAGE` implies sub-perms; scope ALL>LOCATION>DEPARTMENT>TEAM>SELF. JWT carries **roles only**; permissions loaded from DB + Redis (CRIT-001, 4096-byte cookie cap). Role inheritance via parent_role_id (max depth 10, cycle-detected).
**Four enforcement layers (all confirmed present):** (1) Edge — `proxy.ts` coarse role gating (ADMIN_ROUTE_PATTERNS × ADMIN_ROLES, payroll/performance special cases); (2) Client — `AuthGuard.tsx` + `usePermissions`; (3) Route config — `lib/config/routes.ts` per-route permission map; (4) Backend — `@RequiresPermission` (PermissionAspect) + `@RequiresFeature` (FeatureFlagAspect) + **RLS** (nu_app_rls NOBYPASSRLS, tx-local GUC, RlsStartupProbe fail-closed). SUPER_ADMIN bypasses layers 1-4 by design.

**Live-validated cells (✅ pass = behaves as coded):**

| Route group | SUPER_ADMIN | RECRUITMENT_ADMIN | EMPLOYEE |
|---|---|---|---|
| /admin | ✅ full (live) | 🔒 (code: adminOnly client-blocked) | 🔒 blocked (live, Access Restricted) |
| /payroll | ✅ full (live) | 🔒 blocked → dashboard (live) | 🔒 blocked → dashboard (live) |
| /employees | ✅ full (live) | ⚠️ read (code: EMPLOYEE:VIEW_ALL) | 🔒 Access Restricted (live) |
| /recruitment | ✅ full (live) | ✅ allowed (live) | 🔒 (code: anyRole excludes EMPLOYEE) |
| /performance (NU-Grow) | ✅ full (live) | 🔒 → /recruitment?denied=1 (live) | ⚠️ self (code) |
| /me/* self-service | ✅ (live) | ✅ (live) | ✅ (live, never gated) |

Remaining role tiers (TENANT_ADMIN, HR_ADMIN, HR_MANAGER, MANAGER, TEAM_LEAD) have their expected access fully specified by the V107 role→permission seeds + routes.ts; not each exhaustively executed live this pass (documented risk, §15).

## 7. Security Report

- **Tenant isolation (RLS):** Strong. tx-local GUC (`set_config(...,true)`) via TenantRlsTransactionManager; `RlsTenantGucScopeTest` build-guard forbids session-scoped GUC outside the one reset-on-checkout allowlist; `RlsStartupProbe` fails boot if a tenant row is visible without context; nu_app_rls is NOBYPASSRLS; 71 tables FORCE RLS. **CONFIRMED in code; live NOBYPASSRLS proof still pending (needs prod nu_app_rls role) — open low-risk item.**
- **IDOR / cross-tenant:** 14+ IDORs fixed across prior waves (statutory, wall, reactions, replies, perf reviews); pattern scans clean. EMPLOYEE cross-route blocked live.
- **Auth:** httpOnly cookies, `__Host-` prefix (prod), CSRF double-submit, JWT signature verified backend-side (edge decodes without verify by design — forged JWT fails on first API call), account lockout, rate limiting (5/min auth).
- **Headers/CSP:** Per-request nonce CSP, X-Frame-Options DENY, HSTS (prod), strict-dynamic.
- **Demo credentials:** CODE FAIL-CLOSED for prod — `application-prod.yml` defaults `DEMO_CREDENTIALS_ENABLED:false`; `V272` lockdown neutralizes all `Welcome@123` accounts when demo off; frontend tree-shakes demo panel unless `NEXT_PUBLIC_DEMO_MODE=true`. **Staging currently has demo ON (intended) — the one real-user blocker, a 2-env-var flip.**

## 8. API Report

- **Backend:** Spring Boot 3.5.14 / Java 21; ~180 controllers, REST under `/api/v1/*`; ~330 DB tables; Flyway migrations through V100+/V294-class (verify exact head on deploy). Frontend proxies `/api/v1/*` → Railway via next.config.js rewrites.
- **Core flows traced (UI→API→Service→DB):** auth (AuthController→AuthService→users), employee CRUD (EmployeeController→EmployeeService→employees), leave (LeaveController→LeaveService→leave_requests/balances), attendance (AttendanceController→AttendanceRecordService→attendance_records), payroll (PayrollController→…→payroll_runs/payslips), recruitment (candidates/interviews).
- **Live API health:** during browser sweeps, all observed `/api/v1/*` calls returned 200 (e.g. self-service/dashboard, home/*, employees, payroll/runs). No 5xx on functional endpoints.
- **Feature-flag-gated controllers:** Compensation, Payment×3, LMS, Fluence×2 (`@RequiresFeature`); admin bypasses flags.

## 9. UI/UX Report

- Dark + light modes both render intentionally; design tokens (Sky palette, IBM Plex). Empty states use proper `<EmptyState>` (verified — leave widget now truthful). Skeletons on load. Responsive shell.
- Fixed this session: phantom leave balance (mock fallback removed), negative clock-in duration (tz clamp + client anchor), dead /terms+/privacy links (pages added).
- Minor: residual RSC prefetch 503s are network-only (no user-visible error).

## 10. Performance Report

- **Fluid Compute enabled** (frontend/vercel.json) — burst RSC 503 rate dropped from ~70% → ~12–36%.
- **Residual 503s** are **Vercel edge-layer concurrency shedding** of bursty RSC *prefetch* requests on the **Hobby tier** (confirmed: 503s never reach the function in runtime logs; static /terms also affected). Prefetch-only, auto-retried, **zero user impact** (all real navigations 200). True-zero requires **Vercel Pro** (edge concurrency headroom) — a cost decision.
- API responses observed <3s; dashboard fans out ~15 backend calls (candidate for client-side fetch optimization).

## 11. Build Readiness Report

- **Frontend:** `tsc --noEmit` ✅ clean; `eslint . --max-warnings=0` ✅ clean; Vercel production build ✅ (250/250 pages). Local `next build` fails ONLY on a local `.env.production.local` `NEXT_PUBLIC_API_URL` quirk (Vercel env is correct) — not a code defect.
- **Backend:** Maven; tests use Testcontainers (PG16) — **green in CI**; fail locally only due to the documented Docker/colima socket gotcha. Not run locally this pass.
- **CI/CD:** GitHub Actions (build, test, security scans). **No Vercel git auto-deploy** — deploys are manual `vercel --prod`.

## 12. Issue Tracker

| ID | Sev | Module | Title | Status |
|---|---|---|---|---|
| FIX-1 | MEDIUM | HRMS/dashboard | Clock-in showed negative "Working: -1h -1m" (tz) | ✅ Fixed+verified (commit 0b8b1501) |
| FIX-2 | MEDIUM | HRMS/dashboard | Phantom leave balance (mock fallback) | ✅ Fixed+verified (0b8b1501) |
| FIX-3 | LOW/MED | Platform | Sidebar forced-prefetch → 503 burst | ✅ Fixed+verified (0b8b1501) |
| FIX-4 | MEDIUM | Platform/legal | /terms + /privacy missing, dead consent links | ✅ Fixed+verified (0b8b1501) |
| FIX-5 | LOW | Platform | Residual widget-link prefetch 503s | ✅ Reduced (8fe7d79c) |
| PERF-1 | LOW | Platform | Legacy LAMBDAS → concurrency 503 | ✅ Fluid Compute (d2484729); residual = Pro-tier |
| RISK-1 | — | Security | Demo mode ON in deployed env | ⚠️ Open (env flip; code fail-closed) |
| RISK-2 | — | Security | Live NOBYPASSRLS proof | ⚠️ Open (CI-guarded + static-proven) |
| RISK-3 | — | Legal | /terms+/privacy are template copy | ⚠️ Open (business/legal ownership) |

No new BLOCKER/CRITICAL/HIGH **code** defects surfaced in this sweep.

## 13. Fix Summary

5 functional fixes + 1 infra fix shipped and **verified live** this session (commits 0b8b1501, 8fe7d79c, d2484729; all on remote main, deployed to production via `vercel --prod`). tsc + eslint green after each.

## 14. Regression Summary

After each fix: tsc clean, eslint clean, live re-test on deployed URL passed (clock-in 0h0m; leave empty-state truthful; /terms+/privacy 200; 503 rate reduced). Git synced (0/0) at every push. No regressions observed in the live sub-app sweeps.

## 15. Remaining Risks (and pre-launch checklist)

1. **[BLOCKER for real users — env]** Set `DEMO_CREDENTIALS_ENABLED=false` (Railway) + unset `NEXT_PUBLIC_DEMO_MODE` (Vercel), redeploy. Code is fail-closed; this is the gate.
2. **[Medium]** Live NOBYPASSRLS RLS proof against prod `nu_app_rls` role (static-proven + CI-guarded today).
3. **[Medium/Legal]** Replace template `/terms` + `/privacy` copy with counsel-reviewed content.
4. **[Low/Perf]** Vercel **Pro** to fully retire edge-shed RSC prefetch 503s (harmless today).
5. **[Low/Ops]** Railway Kafka is ephemeral (staging-only) — provision durable Kafka for prod.
6. **[Coverage]** Exhaustive per-role live RBAC for TENANT_ADMIN/HR_ADMIN/HR_MANAGER/MANAGER/TEAM_LEAD not each executed live (expected access fully specified in V107 seeds + routes.ts; mechanism verified live at 3 tiers).
7. **[Process]** A ruflo autopilot is autonomously committing to `main` — keep awareness during release gating.

## 16. Go-Live Recommendation

**Engineering: GO** — no open code blockers; security/RBAC strong and verified; build green; functional defects fixed and live-verified.
**Real-user launch: HOLD until** item 1 (demo-mode env flip) + items 2–3 (RLS prod proof + legal content) are closed. Items 4–5 are post-launch hardening. Once the env flip lands, this is production-ready from an engineering standpoint.
