# NU-AURA Validation Master Report

Date: 2026-06-13
Target: https://hrms-frontend-vert.vercel.app/
Status: RED / BLOCKED, not production GREEN

## Executive verdict

Production cannot be declared GREEN from this environment. The repo now has safer RBAC/a11y fixes, stricter production-smoke safeguards, backend-aligned TenantAdmin permission semantics, and a deployed-environment Playwright profile, but direct deployed verification is blocked by network policy and browser binary installation is blocked by CDN policy.

## Scope covered

- Authentication/session: inspected login flow, API auth helper, session refresh client, and auth E2E setup.
- Authorization/RBAC: inspected frontend route guards, permission gates, backend permission annotations/aspect/context, and RBAC E2E suites.
- Modules: mapped NU-Hire, NU-Grow, NU-Fluence, HRMS core, dashboards, reports, settings, and self-service routes.
- UI/UX/a11y/performance: inspected design tokens, layout landmarks, app shell, Playwright a11y coverage, build config, and production route smoke readiness.
- API/integration: inspected shared Axios client, env validation, backend endpoint guard patterns, and existing API-facing E2E tests.

## Gates

| Gate | Result | Evidence |
|---|---:|---|
| Static discovery | PASS | build-kit, ADR, patterns, security baseline, frontend/backend inventories inspected. |
| Browser validation against deployed URL | BLOCKED | `curl -I -L https://hrms-frontend-vert.vercel.app/auth/login` failed with CONNECT tunnel 403. |
| Playwright browser runtime | BLOCKED | `npx playwright install chromium` failed with Playwright CDN 403. |
| Frontend typecheck | PASS | Passed with `timeout 300 npx tsc --noEmit` after local OpenAPI generation. |
| Frontend lint | PASS | `npm run lint` completed successfully. |
| Frontend production build | PASS | Passed with explicit production API URL after removing Google Fonts build-time network dependency and standalone tracing override. |
| Deployment | BLOCKED | Vercel/Railway CLIs are not installed, no usable auth context is exposed, and deployed smoke is network-blocked. |

## Fixes applied

1. Removed duplicate `role="main"` landmarks from the app shell so the root skip target and single `<main>` content landmark do not create duplicate main landmark noise.
2. Hardened RBAC employee-boundary Playwright assertions by removing unconditional `|| true` soft passes.
3. Hardened tenant-isolation Playwright assertions for payroll admin denial, HR employee view, audit rendering, and cleared-session access.
4. Added a production/deployed Playwright config that does not start local `npm run dev`.
5. Added production readiness smoke tests for public routes, SuperAdmin protected routes, and employee direct-URL denial.
6. Removed the frontend TypeScript build-error bypass so production builds must pass type checking.
7. Required `PLAYWRIGHT_BASE_URL` for production smoke runs so tests cannot silently target a stale default deployment.
8. Required explicit production smoke credentials and blocked the demo password sentinel for production authentication checks.
9. Aligned frontend TenantAdmin permissions with backend break-glass semantics: only `SUPER_ADMIN` or `SYSTEM:ADMIN` bypass arbitrary checks.
10. Switched the release smoke workflow to the production Playwright profile when a live URL is available.

## Remaining blockers

- Deployed app/browser validation could not run due environment network policy.
- Playwright browser binary could not be downloaded due CDN 403.
- No deploy credentials or platform CLI auth context were available for Vercel/Railway deployment.
- Existing codebase still needs full browser/API validation across all roles once a browser and deployed network access are available.
- Backend compile/test is blocked by Maven repository 403 in this environment.

## Production readiness decision

RED/BLOCKED. Do not mark production GREEN until:

1. Browser smoke passes against https://hrms-frontend-vert.vercel.app/.
2. RBAC negative tests pass for Employee, Manager, HR Manager, Recruiter, TenantAdmin, SuperAdmin.
3. `npm run lint`, `npx tsc --noEmit`, `npm run build`, unit tests, backend compile/tests, and critical Playwright suites all pass in an environment with required Maven/browser/network access.
4. Vercel/Railway deployment smoke passes with real auth/API configuration.
