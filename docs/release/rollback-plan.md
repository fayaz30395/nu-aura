# Nu-Aura — Rollback Plan

Base: `798f46c8` · Last updated: 2026-09-30 · Owner: RELEASE

## Application rollback

- Frontend (Vercel): instant rollback to the previous deployment via the Vercel project
  (`hrms-frontend`, `prj_Q1rtegd2SHbO8RkdgvZqr8iz6NGW`). Immutable build URLs make this safe.
- Backend host: currently **unreachable** (`nu-aura-backend.onrender.com` → 404). Until a real host
  exists, backend rollback cannot be exercised. Status: HUMAN_REQUIRED.

## Database rollback — limitations

- Flyway migrations are **forward-only**. Migrations are not rolled back by a reverse script; the
  strategy is a **forward corrective migration**.
- `V316` is a forward-only revert of an earlier migration; `V341` is a forward-only RLS correction.
  Both are production-critical: a failed `V316` can fail the deploy itself (Gate 1 BLOCKED,
  checksum drift unverified in prod — Railway auth expired).
- **No destructive down-migration is defined.** Do not attempt to drop/recreate migrated objects in
  production.

## Migration considerations

- Any RC must prove V0→latest on a virgin PG16 before deployment (BLOCKER-006).
- RLS migrations (V331–V337, V341) must be verified against a NOBYPASSRLS role live; currently only
  CI-guarded statically (`RlsTenantGucScopeTest`).

## Infrastructure rollback

- Frontend infra: Vercel — redeploy/rollback to prior build.
- Backend infra: not hosted → no infra rollback path yet.

## Feature-flag rollback

- Where a change is behind a flag, disable the flag rather than redeploying. Verify flag state before
  relying on it.

## Incident escalation

- Trigger: failed deploy, health DOWN, auth/RBAC regression, elevated 5xx.
- Immediate: stop rollout, restore previous frontend build; for backend, revert to previous artifact
  once a host exists.
- Record incident notes with the failing commit SHA and the exact migration states.

## Smoke-test verification after rollback

Re-run the POST-DEPLOYMENT checklist (`deployment-checklist.md`): health, login, RBAC 26/26, core
reads, error rate.
