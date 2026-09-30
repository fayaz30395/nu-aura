# Frontend gates — 2026-09-30 (post `api:generate`)

Environment: local workstation (macOS), Node v22.22.3
Working dir: `frontend/`

## api:generate (prerequisite)

Command: `API_DOCS_URL=./openapi-snapshot.json npm run api:generate`
Result: **PASS** (exit 0) — orval v7.21.0 generated `lib/generated/**` from the local snapshot.
Note: plain `npm run api:generate` (without `API_DOCS_URL`) FAILS — it defaults to
`http://localhost:8080/v3/api-docs`; the `prebuild` script sets `API_DOCS_URL=./openapi-snapshot.json`.
Warning emitted (non-fatal): `#/components/securitySchemes` key does not match `^[a-zA-Z0-9._-]+$`.

## typecheck

Command: `npx tsc --noEmit`
Result: **PASS** (exit 0, no output). The earlier TS6053 mass-failure was solely the missing
generated client; after generation the tree typechecks.

## lint

Command: `npm run lint` (`eslint . --max-warnings=0`)
Result: **PASS** (exit 0, no output).

## Not yet run

- `npm test` (vitest)
- `npm run build` (`next build --webpack`)
