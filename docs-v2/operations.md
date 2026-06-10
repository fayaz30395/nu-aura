# Operations Guide

How NU-AURA is run day to day: environments, deploy gates, recovery objectives, and the
runbook index. Detailed step-by-step procedures live in `docs/runbooks/` — this page is
the map.

## 1. Environments and entry points

| Surface | URL / location |
|---------|----------------|
| Beta frontend (live) | https://hrms-frontend-vert.vercel.app |
| Local frontend | http://localhost:3000 |
| Local backend + Swagger | http://localhost:8080 · `/swagger-ui.html` |
| Local Prometheus / Grafana | :9090 / :3001 |
| Dev database | Neon cloud Postgres (no local PG container) |

Local bring-up: `./scripts/dev/start-dev.sh` (compose data plane + apps);
`./scripts/dev/stop-dev.sh` to stop. Ports 3000/8080 are fixed by convention.

## 2. Production deploy gates

Before any production (or production-like) deploy, all of the following must hold:

1. **CI green** on the exact SHA being shipped — both `ci.yml` and `security-scan.yml`
   (backend suite incl. Flyway V0→latest clean-apply, frontend lint/typecheck/build,
   Trivy CRITICAL, gitleaks, CodeQL).
2. **Prod profile gate** — `SPRING_PROFILES_ACTIVE=prod`, `DEMO_CREDENTIALS_ENABLED=false`,
   Flyway at **V270 or later** (neutralizes historical `Welcome@123` demo seeds).
   Checklist: `docs/HANDOVER-DEPLOY.md`.
3. **RLS enforcement** — application connects as `nu_app_rls` (NOBYPASSRLS) and
   `RLS_PROBE_FAIL_ON_BYPASS=true` so the app refuses to start otherwise.
4. **Frozen SHA discipline** — release from a tagged, frozen commit; no autonomous
   processes committing to `main` during the release window.
5. **Health verification post-deploy** — readiness green, error rate and p95 within
   alert thresholds for the soak window, then traffic ramp.

Rollback decision tree and execution: `docs/runbooks/rollback.md` (Helm revision rollback;
database rollbacks are forward-fix only — Flyway migrations are never reverted in place).

## 3. Recovery objectives

| Objective | Value | Mechanism |
|-----------|-------|-----------|
| Availability | 99.9% | HPA, PodDisruptionBudget, rolling updates with zero unavailable |
| RPO | 1 h | Hourly WAL shipping; Redis snapshots every 30 min |
| RTO | 4 h | DR runbook (`docs/runbooks/disaster-recovery.md`) |
| DR validation | Quarterly drill (first Wednesday) | `docs/runbooks/dr-drill-checklist.md` |

Redis is rebuildable state (caches, buckets, locks): the platform degrades gracefully
without it and recovers by cache warm-up, so DR prioritizes Postgres and Drive content.

## 4. Routine operational tasks

| Task | Cadence | Reference |
|------|---------|-----------|
| Key rotation (JWT, field-encryption DEKs, webhook HMAC) | Quarterly | `docs/runbooks/key-rotation.md` |
| Backup verification | With DR drill | `docs/runbooks/backup-restore.md` |
| Kafka DLT triage | On alert / weekly review | `docs/runbooks/kafka-dead-letter.md` |
| Tenant onboarding / suspension / purge | On demand | `docs/runbooks/tenant-lifecycle.md` |
| Production data correction | On demand, audited | `docs/runbooks/data-correction.md`, `payroll-correction.md` |
| Security scan triage | Per cadence table in [security.md](architecture/security.md) §8 | `docs/security/baseline.md` |
| Migration chain integrity check | Per release | `docs/runbooks/2026-06-04-t1-migration-chain-integrity.md` |

## 5. Incident response

`docs/runbooks/incident-response.md` defines severity, comms, and hotfix flow. Alert
ingress is Slack `#nu-aura-alerts` (AlertManager). The standing playbook:

1. Acknowledge in Slack; assess blast radius via Grafana + `kubectl get pods`.
2. If cross-tenant data exposure is suspected: treat as SEV-1, snapshot evidence, disable
   affected endpoints, page security owner — tenant isolation is the existential asset.
3. Stabilize (rollback or scale) before root-causing; forward-fix migrations only.
4. Post-incident: timeline + root cause + follow-ups within 5 business days
   (`docs/runbooks/` postmortem conventions).

## 6. Scheduled-job operations

All 25 schedulers are ShedLock-guarded; the global kill switch is
`APP_SCHEDULING_ENABLED`. When running multiple environments against one database
(e.g. beta + local), enable scheduling in exactly one of them to avoid duplicate side
effects (emails, accruals, webhooks). Payroll, accrual, and biometric jobs log lock
acquisition — absence of those lines is the first diagnostic for "job didn't run."

## 7. Runbook index (`docs/runbooks/`)

| Runbook | Purpose |
|---------|---------|
| `deployment.md` | End-to-end GKE deploy: pre-flight, Flyway, health checks, ramp |
| `render-backend-deploy.md` | One-step Render blueprint walkthrough |
| `rollback.md` | Rollback decision tree and Helm/kubectl execution |
| `incident-response.md` | Live incident handling |
| `disaster-recovery.md` / `dr-drill-checklist.md` | DR procedures and quarterly drill |
| `backup-restore.md` | Backup and restore verification |
| `key-rotation.md` | JWT / encryption / webhook key rotation |
| `kafka-dead-letter.md` | DLT inspection and replay |
| `tenant-lifecycle.md` | Tenant onboarding, suspension, purge |
| `data-correction.md` / `payroll-correction.md` | Audited production data fixes |
| `backend-developer-checklist.md` / `backend-testing-guide.md` | Dev onboarding and test patterns |
| `ci-workflows.md` | What each GitHub Actions workflow does |
| `2026-06-04-t1-migration-chain-integrity.md` | Flyway chain verification |
