# Frontend gate evidence — commit `796d4a64`

Date: 2026-09-30 · Node v22.22.3 · macOS (arm64) · working dir `frontend/`

## api:generate (prerequisite for typecheck/build)

Command: `API_DOCS_URL=./openapi-snapshot.json npm run api:generate`
Result: **PASS** (exit 0), orval v7.21.0 → `lib/generated/**`.
Warning (non-fatal): `#/components/securitySchemes` key fails orval's `^[a-zA-Z0-9._-]+$` pattern check.

## typecheck

Command: `npx tsc --noEmit`
Result: **PASS** (exit 0) — recorded in `.nu-aura/evidence/798f46c8/frontend-typecheck.md`.

## lint

Command: `npm run lint` (`eslint . --max-warnings=0`)
Result: **PASS** (exit 0) — recorded in `.nu-aura/evidence/798f46c8/frontend-gates.md`.

## unit tests

Command: `npm run test:run` (vitest run)
Result: **PASS** — `Test Files 91 passed (91)`, `Tests 2425 passed (2425)`, 32.43s.

## production build

Command: `NEXT_PUBLIC_API_URL=https://api.ci.nu-aura.local/api/v1 npm run build`
Result: **PASS** — `.next/BUILD_ID` written at 2026-09-30 21:00:02 (-03).
Note: the bare `npm run build` fails the `prebuild` gate `scripts/validate-release-env.mjs`
because `NEXT_PUBLIC_API_URL` is unset. CI supplies it (`pr-validation.yml` uses
`https://api.ci.nu-aura.local/api/v1`; `e2e.yml` uses a loopback URL plus
`ALLOW_INSECURE_RELEASE_API_URL`). No product defect — the gate is intentional.
