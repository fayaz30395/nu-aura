# CI/CD workflows

NU-AURA's GitHub Actions surface, introduced in P6 of the 2026-05-13 repo layout cleanup.

## `ci.yml` — full CI pipeline (existing)

Triggers: push/PR to `main` or `develop`. Runs backend Maven test + frontend lint/typecheck/build with Postgres 16 service container. Existed pre-P6.

## `pr-validation.yml` — fast PR gate (new)

Triggers: `pull_request` to `main` / `develop`. Runs three parallel jobs:

1. `backend-validate` — `mvn compile` + `mvn test` (no DB service; fast unit-only)
2. `frontend-validate` — `npm ci`, `lint`, `tsc --noEmit`, `npm run build`
3. `compose-validate` — `docker compose config` for all three compose files (with stub env vars)

Optimised for sub-3-minute feedback. Catches the bulk of "is this PR landable?" without spinning up Postgres.

## `security-scan.yml` — security gate (new)

Triggers: push to `main`, weekly Sunday 02:00 UTC, manual dispatch. Runs four independent jobs:

1. `codeql-java` — GitHub CodeQL static analysis on Java
2. `codeql-js` — GitHub CodeQL static analysis on TypeScript/JavaScript
3. `secret-scan` — gitleaks scans the full git history
4. `container-scan` — Trivy scans both backend and frontend images for CRITICAL/HIGH CVEs

Uploads SARIF to the GitHub Security tab. CodeQL alerts surface as PR comments on subsequent PRs that touch flagged code.

## `deploy.yml` — manual deploy (new)

Triggers: `workflow_dispatch` only. Inputs:

- `target`: `staging` (default) or `production`
- `ref`: git ref to deploy (default `main`)

Job graph:

```
build → deploy-staging → (if target=production) deploy-production
```

`build` constructs both Docker images and pushes to GCR. `deploy-staging` runs Helm upgrade against the staging GKE cluster, then health-polls. `deploy-production` only runs when `target=production` was selected; gated by GitHub `production` environment approval rule.

### Required secrets

| Secret             | Purpose                                       |
|--------------------|-----------------------------------------------|
| `GCP_PROJECT_ID`   | GCP project for image registry + GKE clusters |
| `GCP_SA_KEY`       | Service account JSON with GCR + GKE perms     |

### Required GitHub environments

- `staging` — no approval gate
- `production` — requires manual approval (configured in repo Settings → Environments)

## `cosign-sign.yml`

Existed pre-P6. Signs published images with cosign for supply-chain integrity.

## Decision rationale

Splitting the existing `ci.yml` into a fast `pr-validation.yml` (no DB) + slow `ci.yml` (with Postgres) lets PR authors get sub-3-minute feedback while still running the comprehensive integration suite on push. Security scan is decoupled to a weekly cron + push trigger — running it on every PR adds 10+ minutes that doesn't pay off most of the time.

Manual `workflow_dispatch` for deploy keeps the human in the loop. Auto-deploy on tag was considered and rejected per the master plan's "no automatic production push" guidance.
