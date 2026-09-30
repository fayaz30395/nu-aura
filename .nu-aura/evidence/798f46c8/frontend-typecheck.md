# Frontend typecheck gate — 2026-09-30

Environment: local
Working dir: `frontend/`
Command: `npx tsc --noEmit`
Result: **FAIL** (exit non-zero)

## Failure

Mass TS6053 errors, all of the form:

```
error TS6053: File 'frontend/lib/generated/api/model/<name>.ts' not found.
  The file is in the program because:
    Matched by include pattern '**/*.ts' in 'frontend/tsconfig.json'
```

## Cause (not a product defect)

`frontend/lib/generated/` is **gitignored** (`frontend/.gitignore:18`) and produced by `orval`:

- `prebuild`: `API_DOCS_URL=./openapi-snapshot.json npm run api:generate && node scripts/validate-release-env.mjs`
- `api:generate`: `orval --config ./orval.config.ts`

The checked-out generated client is stale/incomplete relative to the current spec, so the program
references generated model files that are not on disk. The correct gate is `npm run build` (which
runs `prebuild` → `api:generate` first), or run `npm run api:generate` then `npx tsc --noEmit`.

`frontend/openapi-snapshot.json` is present, so regeneration is possible locally.

Status: BLOCKED pending regeneration step; gate must be re-run as `api:generate` → `tsc --noEmit`
(or `npm run build`). Do not treat this FAIL as a product defect.
