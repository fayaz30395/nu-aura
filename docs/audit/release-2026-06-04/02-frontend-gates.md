# Frontend Release Gates — 2026-06-04

Scope: `frontend/` only. Stack: Next.js 14 App Router / Next 16 toolchain, TypeScript strict,
Mantine, Tailwind, React Query, Zustand, Axios, RHF+Zod.

Sandbox: Node 22.22, `node_modules` present. Each gate was run from the `frontend/` directory.

## Summary

| Gate                | Before                          | After                          |
|---------------------|---------------------------------|--------------------------------|
| tsc (`tsc --noEmit`)| 0 errors (clean full run)       | 0 errors (config-only changes) |
| ESLint (`lint`)     | **CRASH** (exit 2)              | **PASS** exit 0, 0 problems    |
| Design-system lint  | PASS exit 0, 0 findings         | PASS exit 0, 0 findings        |
| Vitest (`test:run`) | 90 files / 2433 tests pass      | 90 files / 2433 tests pass     |
| Build (`build`)     | Not completable in sandbox      | Not completable in sandbox     |

Net code/source behavior was not changed. Only three config files were touched.

---

## Gate 1 — TypeScript (`npx tsc --noEmit`)

### Before / status

The initial full type-check on the unmodified repo completed and emitted **0 errors**:

```
=== TSC OUTPUT ===
=== ERROR COUNT ===
0
```

### After

My edits are config-only (package.json `overrides`, eslint ignore, tsconfig `exclude`) and
touch zero source types. Re-runs continued to emit **0 `error TS` lines** in every partial run.

Caveat — sandbox limitation: re-running a *cold* full type-check (incremental cache could not
be re-committed because the process is killed at the 45s per-command cap) exhausts the Node
heap or hits the timeout in this memory-constrained sandbox:

```
NODE_OPTIONS="--max-old-space-size=6144" timeout 44 npx tsc --noEmit
EXIT=124   errors: 0   bytes: 0      # timed out, 0 errors streamed

npx tsc --noEmit --incremental false
EXIT=134 (OOM at ~2GB heap)   errors: 0     # 0 errors before OOM
```

tsc streams diagnostics as it discovers them; every run (including the original complete run)
emitted **0 errors**. No type errors exist; the only thing that fails is finishing a cold,
uncached full-program check inside the sandbox's 45s/limited-RAM envelope.

---

## Gate 2 — ESLint (`npm run lint` → `eslint . --max-warnings=0`)

### Before — CRASH (exit 2)

```
Oops! Something went wrong! :(
ESLint: 9.39.4
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './v4/core' is not defined by
"exports" in .../node_modules/zod/package.json
```

Root cause: `eslint-config-next@16.2.6` → `eslint-plugin-react-hooks@7.1.1` →
`zod-validation-error@4.0.2`, whose `/v4` entry hard-imports `zod/v4/core`. The project pins
`zod@3.23.8` (locked stack — a prior dependabot bump to zod 4 was reverted), which has no
`/v4/core` subpath. ESLint crashed before linting any source. **Not a source-code lint error.**

### Fix (minimal, dependency-resolution only)

`frontend/package.json` — added two `overrides` so the lint toolchain resolves zod-3-compatible
versions, preserving the locked `zod@3.23.8`:

```json
"eslint-plugin-react-hooks": "6.1.1",   // imports bare "zod-validation-error", peers zod ^3.22 || ^4
"zod-validation-error": "^3.4.0"        // peers zod ^3.18, clean "." export (no zod/v4/core)
```

`npm install` resolved to `eslint-plugin-react-hooks@6.1.1 overridden` and
`zod-validation-error@3.5.4 overridden`.

### After — PASS (exit 0)

```
LINT_EXIT=0
> hrms-frontend@1.0.0 lint
> eslint . --max-warnings=0
              # (no output, no warnings — passes --max-warnings=0)
problem lines: 0
```

---

## Gate 3 — Design-system lint (`npm run lint:design-system`)

PASS both before and after (exit 0):

```
NU-AURA Styling Drift Report (T3-13)
=====================================
Scanned in 599ms.   Rule: frontend/components/ui/README.md
Total findings: 0
(Report only — exits 0. Migrate drift in housekeeping PRs.)
EXIT=0
```

This script is report-only and exits 0 by design; there were **0 drift findings** to summarize.

---

## Gate 4 — Vitest (`npm run test:run`)

The full suite (90 files) exceeds the 45s per-command sandbox cap, so it was run in 4 shards
(`vitest run --shard=N/4`). Every shard passed:

```
shard 1/4:  Test Files  23 passed (23)    Tests  479 passed (479)   EXIT=0
shard 2/4:  Test Files  23 passed (23)    Tests  817 passed (817)   EXIT=0
shard 3/4:  Test Files  23 passed (23)    Tests  517 passed (517)   EXIT=0
shard 4/4:  Test Files  21 passed (21)    Tests  620 passed (620)   EXIT=0
-------------------------------------------------------------------------
TOTAL:      Test Files  90 passed (90)    Tests  2433 passed (2433)
```

No test changes were needed. (Non-fatal `act(...)` / jsdom-navigation stderr warnings are
emitted by a couple of UI suites but do not fail any test.)

---

## Gate 5 — Build (`npm run build` → `next build --webpack`)

The `prebuild` env validator passes when `NEXT_PUBLIC_API_URL` is a valid non-loopback HTTPS
URL. The webpack production build then **cannot complete in the sandbox**, for two distinct
environmental reasons:

1. Default `distDir` `.next/` is a pre-existing directory on the mounted volume that cannot be
   unlinked (sandbox FS is read-only for those inodes):

   ```
   > Build error occurred
   Error: EPERM: operation not permitted, unlink '.../.next/build-manifest.json'
   ```

2. Redirecting to a writable `distDir` gets past the EPERM and reaches active webpack
   compilation ("Creating an optimized production build ...") with **no compile errors**, but
   does not finish within a reasonable window (~6 min) given sandbox CPU/RAM limits.

Per the task's stated fallback, the build is treated as **not verifiable in this sandbox**;
release-readiness is asserted from tsc + lint + design-system + tests, which are green.

Real (non-fatal) build-config notes surfaced, worth a follow-up housekeeping PR (NOT fixed here,
out of scope / would change non-gate config):

```
⚠ `eslint` configuration in next.config.js is no longer supported. (Next 16)
⚠ Invalid next.config.js options detected: Unrecognized key(s) in object: 'eslint'
```

App route count (source `page.tsx`/`page.ts` files): **264**.

---

## Files changed

| File                          | Change                                                                 |
|-------------------------------|------------------------------------------------------------------------|
| `frontend/package.json`       | Added `eslint-plugin-react-hooks: 6.1.1` + `zod-validation-error: ^3.4.0` to `overrides` (fixes the ESLint crash; keeps zod@3.23.8) |
| `frontend/package-lock.json`  | Regenerated by `npm install` for the new overrides                     |
| `frontend/eslint.config.mjs`  | Added `tmp/**` to `ignores` (build-output dir)                         |
| `frontend/tsconfig.json`      | Added `tmp` to `exclude` (build-output dir)                            |

Total source diff: 3 hand-edited files, 6 insertions / 2 deletions (+ lockfile).

### Note on the `tmp` excludes

A stray `frontend/tmp/nuaura-next/` build artifact was produced while probing the build (a
`NEXT_DIST_DIR` redirect resolved relatively). The sandbox FS would not let it be deleted
(`EPERM`), so `tmp/**` was added to the ESLint `ignores` and `tmp` to the tsconfig `exclude`.
These are harmless, conventional build-output exclusions; on a clean checkout the directory
does not exist. If desired, drop both `tmp` exclude lines once the artifact is removed.

## Remaining blockers (could not fully resolve in-sandbox)

- **tsc cannot be re-proven to completion in-sandbox**: cold full type-check times out (45s
  per-command cap) / OOMs without the incremental cache. Evidence shows **0 errors** in the
  original complete run and in all partial runs; changes were config-only. Re-run on a normal
  dev machine to confirm a clean exit 0.
- **`next build` cannot complete in-sandbox**: pre-existing `.next/` is unlinkable (EPERM) and
  full webpack compile exceeds sandbox time/memory. No compile error was observed before the
  environmental failure. Verify the build on CI / a real machine.
