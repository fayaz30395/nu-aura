# NU-FE Static and Unit Results (2026-11-15)

Scope: /frontend. Local only. No remote hosts probed. Raw outputs in session scratchpad.

| ID | Check | Command | Status | Result |
|---|---|---|---|---|
| NU-FE-001 | TypeScript | `npx tsc --noEmit` | PASS | exit 0, 0 errors |
| NU-FE-002 | ESLint (zero-warning gate) | `npx eslint . --max-warnings=0 --ignore-pattern ".next-*/**"` | PASS | exit 0, 0 problems |
| NU-FE-002a | ESLint without ignore | `npm run lint` equivalent | FAIL (config gap) | 39,733 problems (22,113 errors, 17,620 warnings), all in another agent's `frontend/.next-rr/` build output. The ESLint config does not ignore `.next-*` build dirs. |
| NU-FE-003 | Unit tests | `npx vitest run` | PASS | 1,078 test files, 2,609 tests: 2,609 pass, 0 fail, 0 skipped. Exit 0. jsdom timeout stack traces appear in output but do not fail the run. |
| NU-FE-004 | npm audit (prod, high/critical) | `npm audit --omit=dev` | FAIL | 2 critical, 2 high, 2 moderate (6 total). See list below. |
| NU-FE-005 | Production build | `next build --webpack` with `NEXT_DIST_DIR=.next-release-audit` | PASS (with caveats) | Exit 0. Build used a placeholder API URL, `https://api.example.invalid/api/v1`, because the env validator rejects localhost in production builds. The build dir was removed afterwards. |

## npm audit, production deps (high/critical)
- critical: `dompurify <=3.4.16`, fix available
- critical: `next 16.0.0 - 16.4.0`, fix available (package.json pins `^16.2.7`; the build reported Next 16.3.8)
- high: `follow-redirects 1.16.0 - 1.16.1`, fix available
- high: `zod <4.6.6`, fix `zod@4.6.7` (package.json pins `zod 3.23.8`, so this is a major-version jump)

## Secrets and demo credentials (names only, values redacted)
- Demo password literal is in `app/auth/login/page.tsx:146` (`[REDACTED]`). Also referenced in e2e fixtures and specs: `e2e/production-readiness.production.spec.ts`, `e2e/hire-qa-run.ts`, `e2e/api-backend-trace.production.spec.ts`, `e2e/lifecycle-e2e.spec.ts`, `e2e/employee-edit-autonomous.production.spec.ts`, `e2e/fixtures/test-tenant-seed.ts`, `e2e/fixtures/testData.ts`.
- Other string matches in `lib/validations/**` and `components/errors/**` are test fixtures, not secrets.

## NEXT_PUBLIC_* names used in source
NEXT_PUBLIC_API_URL (26), NEXT_PUBLIC_DEMO_MODE (9), NEXT_PUBLIC_ENABLE_WEBSOCKET (10), NEXT_PUBLIC_GOOGLE_CLIENT_ID (8), NEXT_PUBLIC_APP_URL (4), NEXT_PUBLIC_RECAPTCHA_SITE_KEY (5), NEXT_PUBLIC_PAYMENTS_ENABLED (3), NEXT_PUBLIC_SSO_ALLOWED_DOMAIN (2), NEXT_PUBLIC_ALLOW_INSECURE_API_URL (1), NEXT_PUBLIC_E2E_AUTH_STORAGE (1)

## Demo login gating
- `app/auth/login/page.tsx:46`: `IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'`. Demo is ON unless the flag is explicitly `'false'`. This is opt-out.
- `app/auth/login/page.tsx:61`, `:146`, `:815`: accounts, password, and panel all depend on `IS_DEMO_MODE`.
- `app/auth/login/page.tsx:814` comment says the panel shows only when the flag is `true`. The code does not match the comment.
- `lib/config/env.ts:239`: `isDemoMode = NEXT_PUBLIC_DEMO_MODE === 'true'` (opt-in). This disagrees with the login page default.
- `lib/config/env.ts:206`: a non-production default sets `NEXT_PUBLIC_DEMO_MODE` to `'false'`.
- Risk: any production build that does not set `NEXT_PUBLIC_DEMO_MODE=false` ships demo accounts on the login page. Confirm the deployed env sets it.

## Side effects in the repo
- `frontend/tsconfig.json`: the first `next build` added two `.next-release-audit/...` include lines. I reverted them. The second build re-added them. They are still on disk (lines 47-48). Next re-adds these lines on each build with a custom distDir. Revert them or add the dir to `tsconfig` exclude before commit.
- Removed `frontend/.next-release-audit/` (my build output). Other agents' `frontend/.next-rr/` was not touched.

## Not run
- `next build` against the default `.next` dir: not run (dev server active).
- Remote/deployed checks: not run (local-only rule).

## Open questions
- Confirm the production env sets `NEXT_PUBLIC_DEMO_MODE=false`.
- Decide whether the ESLint config should ignore `.next-*`.
