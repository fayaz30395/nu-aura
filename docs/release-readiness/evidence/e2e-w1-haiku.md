# E2E Wave 1 (Haiku tasks) evidence

- T1-03 DONE: `frontend/e2e/fixtures/base.ts`, `frontend/e2e/fixtures/console.ts`. Backend reroute + console budget fixture. tsc (strict, types node) clean.
- T1-04 DONE: `frontend/e2e/fixtures/api.ts`. `expectApi(page, {method, path, status})` returns JSON. tsc clean.
- T1-05 DONE: `frontend/e2e/fixtures/db.ts`. Read-only `sql()`, `E2E_DB=0` skip via `isDbEnabled()`. Smoke `select 1` returned `1`.
- T1-06 PARTIAL: `frontend/e2e/fixtures/data.ts` (track + key prefix check), `scripts/e2e-cleanup.mjs` (dry-run, no tables configured). Not run against DB: `test-data-e2e.md` has no SQL, and table list is unverified. Cleanup not verified (0 leftovers not shown).
- T1-07 DONE: fallback auth removed from `frontend/e2e/fixtures/helpers.ts` (createUnsignedJwt, buildFallbackAuth, seedFallbackCookies, ALLOW_LOCAL_AUTH_FALLBACK). `grep -c FALLBACK` = 0. loginAs now throws if no API login. Backup of prior version in scratchpad.
- T1-08 DONE: deleted `frontend/e2e/tmp-debug-rbac.spec.ts`, `frontend/e2e/hire-qa-run.ts`, `frontend/e2e/remote-deployed-route-smoke.json`, `frontend/e2e/.auth/*.json`; added `e2e/.auth/` to `frontend/.gitignore`.
- Not run: Playwright suite (per lead rule). `npx playwright test --list` not run for this wave.
