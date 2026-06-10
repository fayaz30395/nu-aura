# Deployment Audit — NU-AURA

**Auditor-Deployment (READ-ONLY)** · 2026-06-09 · branch `main`
Scope: all infra/deploy artifacts. No commits made. Worktrees under `.claude/worktrees/`
are agent copies and were excluded from inventory.

---

## Deploy artifact inventory

| Artifact | Path | Purpose |
|----------|------|---------|
| CI pipeline | `.github/workflows/ci.yml` | Build+test backend (JDK21) & frontend (Node20), Trivy fs scan, Docker build (build-only, no push) on push-to-main |
| PR gate | `.github/workflows/pr-validation.yml` | Backend compile + `verify` (JaCoCo check), frontend lint/tsc/build, `docker compose config` validation |
| Security scan | `.github/workflows/security-scan.yml` | CodeQL (Java + JS/TS), gitleaks secret scan, Trivy container scan (exit-code 1 on CRIT/HIGH), weekly cron |
| Deploy pipeline | `.github/workflows/deploy.yml` | GCR build+push, cosign sign+verify, Helm upgrade to GKE staging→prod, `/actuator/health` smoke gate |
| Cosign repair | `.github/workflows/cosign-sign.yml` | Manual `workflow_dispatch` to re-sign a specific image tag |
| Render blueprint | `render.yaml` | IaC for Render free-tier fallback (Postgres16, Redis KV, backend+frontend docker web services, autoDeploy on push) |
| Backend image | `backend/Dockerfile` | Multi-stage; build `maven:3-eclipse-temurin-26`, runtime `eclipse-temurin:25-jre-alpine`, non-root USER 1001, HEALTHCHECK |
| Frontend image | `frontend/Dockerfile` | Next.js standalone, `node:26-alpine` (deps/builder/runner), non-root nextjs |
| Root Dockerfile | `Dockerfile` | Top-level (compose) image |
| Compose (base) | `docker-compose.yml` | Local/base stack |
| Compose (prod) | `docker-compose.prod.yml` | Prod overlay |
| Compose (override) | `docker-compose.override.yml` | Local dev overlay |
| Monitoring compose | `infra/monitoring/docker-compose.yml` | Prometheus/Grafana stack |
| Helm chart | `infra/deployment/helm/hrms/` | Chart.yaml + values{,-staging,-prod}.yaml; templates: backend/frontend deploy, hpa, ingress, networkpolicy, pdb, **rollout.yaml** (Argo canary), serviceaccount |
| K8s manifests | `infra/deployment/kubernetes/` | Raw deployments, services, configmap, ingress, network-policy, hpa, namespace, **secrets.yaml** (placeholder template) |
| Kyverno policies | `infra/deployment/kyverno/` | `require-image-signature`, `disallow-latest-tag`, `require-resource-limits` (admission control) |
| Rollback runbook | `docs/runbooks/rollback.md` | Documented rollback procedures |
| Deploy/DR runbooks | `docs/runbooks/deployment.md`, `disaster-recovery.md`, `dr-drill-checklist.md`, `backup-restore.md` | Operational procedures |

**No Terraform** (`*.tf`) and **no `vercel.json`** found — Vercel frontend deploy is dashboard-configured, GKE infra is not codified as IaC (GKE clusters `nu-aura-staging`/`nu-aura-prod` assumed pre-existing).

---

## CI/CD pipeline assessment

**Gates on PR** (`pr-validation.yml`): backend compile + `mvn verify` (runs JaCoCo coverage check, skips ITs), frontend lint + `tsc --noEmit` + build, and `docker compose config` lint. Plus `ci.yml` (full backend `mvn test`, frontend tests/build, Trivy) runs on PR too.

**Gates on push-to-main**: `ci.yml` (full test) + `security-scan.yml` (CodeQL/gitleaks/Trivy-container, **fails build on CRIT/HIGH**) + `deploy.yml` build→staging (auto). Production is **manual `workflow_dispatch` only**, double-gated: staging smoke-test must pass first, then the `production` GitHub Environment's required_reviewers approval.

**Build+test+deploy pipeline: YES, complete.** Includes supply-chain hardening: cosign keyless signing at build, cosign verify before each deploy, Kyverno admission verification in-cluster.

**JDK pinning: YES** — `ci.yml`, `pr-validation.yml`, `security-scan.yml` all pin `JAVA_VERSION: '21'` / `java-version: '21'`, and `pom.xml` is `<java.version>21</java.version>`. This satisfies the memory note "CI must pin JDK21." **However** the Dockerfiles diverge (see gaps D-1).

**Caching**: Maven (`actions/cache` keyed on pom hash) and npm (`setup-node` cache) — good. Docker build uses GHA cache in `ci.yml` but `deploy.yml` raw `docker build` has no layer cache.

---

## Secrets/env

- **Injection (GKE/prod)**: Helm/deploy expects pre-created cluster secrets `hrms-secrets` and `hrms-google-drive-credentials` (deploy.yml asserts their existence with `kubectl get secret` before Helm upgrade). Secrets are **not** rendered by CI — operator provisions out-of-band (kubectl / GCP Secret Manager / Vault / Sealed Secrets per `secrets.yaml` header).
- **Injection (Render)**: `render.yaml` uses `fromDatabase`/`fromService` for wired values and `sync: false` for true secrets (`JWT_SECRET`, `SPRING_DATASOURCE_USERNAME/PASSWORD`, `PROMETHEUS_SCRAPE_TOKEN`, `APP_SLACK_SIGNING_SECRET`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) — operator fills in dashboard. Correct pattern.
- **CI secrets**: `secrets.GCP_SA_KEY`, `GCP_PROJECT_ID` (long-lived SA JSON key — see gap D-2), `GITHUB_TOKEN` for gitleaks.
- **Committed secrets check**: `infra/deployment/kubernetes/secrets.yaml` **is tracked in git** but is an intentional **placeholder template** — every value is base64 `"CHANGEME"` (`Q0hBTkdFTUU=`), header explicitly warns against real values. gitleaks runs in CI as a backstop. **No real secrets found committed.**
- **Required env vars**: DB (`SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, `FLYWAY_URL/USER/PASSWORD`), `JWT_SECRET`, `APP_SECURITY_ENCRYPTION_KEY` (32-byte), `PROMETHEUS_SCRAPE_TOKEN`, Redis (`SPRING_REDIS_HOST/PORT/PASSWORD/SSL_ENABLED`), `GOOGLE_DRIVE_ROOT_FOLDER_ID` + credentials file, `NEXT_PUBLIC_API_URL` (build-time baked), `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Render adds prod-gate vars `SPRING_PROFILES_ACTIVE=prod`, `RLS_PROBE_FAIL_ON_BYPASS=true`, `APP_SCHEDULING_ENABLED=false`.

---

## Rollback & progressive delivery

- **Documented rollback: YES** (`docs/runbooks/rollback.md`) — clear trigger table (Flyway FAILED, auth 5xx, p95>2s, error>2%, CrashLoop, data corruption, security incident), Option A `kubectl rollout undo` (<2min), compensating-migration and secret-rotation procedures. Partner doc `deployment.md` + `disaster-recovery.md` + `dr-drill-checklist.md`.
- **Helm rollback**: deploy uses `helm upgrade --install` (Helm release history retained → `helm rollback` available), and `kubectl rollout undo` documented.
- **Canary**: Argo Rollouts `rollout.yaml` template — 20%→50%→100% with Prometheus-gated analysis. **OFF by default** (`canary.enabled=false`); requires the Argo Rollouts controller installed per-cluster. Not active in the default deploy path.
- **Smoke/health gate**: both staging and prod deploy jobs poll `/actuator/health` for UP (20×15s) and fail the deploy if not healthy within 5min.

---

## Deployment Readiness gaps

| ID | Severity | Gap | Evidence path | Fix |
|----|----------|-----|---------------|-----|
| D-1 | HIGH | **Dockerfile/CI JDK mismatch + floating major tags.** CI/pom pin JDK21, but `backend/Dockerfile` builds on `maven:3-eclipse-temurin-26` and runs `eclipse-temurin:25-jre-alpine`; frontend uses `node:26-alpine`. Images are not built/tested on the version CI validates, and floating major tags break reproducible builds. | `backend/Dockerfile:6,78`; `frontend/Dockerfile:1`; `backend/pom.xml`; `.github/workflows/ci.yml:10` | Pin runtime to `eclipse-temurin:21-jre-*` and `node:20-*` to match CI; use digest-pinned base tags |
| D-2 | HIGH | **Long-lived GCP SA JSON key in CI.** `deploy.yml` authenticates with `credentials_json: secrets.GCP_SA_KEY` despite `permissions: id-token: write` already being set — Workload Identity Federation (keyless) is available and preferred. Static key is a standing exfil risk. | `.github/workflows/deploy.yml:64-67,119-122,203-206`; `cosign-sign.yml:49-52` | Migrate to `google-github-actions/auth` with `workload_identity_provider` (keyless OIDC); delete the SA key secret |
| D-3 | MEDIUM | **GKE clusters not codified as IaC.** No Terraform anywhere; deploy assumes `nu-aura-staging`/`nu-aura-prod` GKE clusters, ingress, and `hrms-secrets` pre-exist. Cluster state is undocumented/non-reproducible. | repo-wide: no `*.tf`; `deploy.yml:124-128,208-212` | Add Terraform (or Config Connector) for GKE clusters, node pools, IAM, and secret bootstrap |
| D-4 | MEDIUM | **Canary disabled by default → prod deploys are all-at-once.** `rollout.yaml` exists but `canary.enabled=false`; default Helm path uses a plain Deployment with no progressive traffic shift. Prod gets full-cutover risk despite the smoke gate. | `infra/deployment/helm/hrms/values.yaml:150-161`; `templates/rollout.yaml:18` | Install Argo Rollouts controller on prod cluster and set `canary.enabled=true` in `values-prod.yaml` |
| D-5 | MEDIUM | **Env parity drift: Render runtime ≠ GKE prod, and free-tier degradation.** Render fallback runs with Elasticsearch absent (search degraded), schedulers disabled, 512MB heap, and requires a manual post-provision NOBYPASSRLS role swap — materially different from GKE prod. Dev (Neon) vs prod (PG16) is handled via `application-{dev,prod,render}.yml` but parity is not gated/tested. | `render.yaml:14-25,56-58`; `backend/src/main/resources/application-{prod,render,dev}.yml` | Document Render as explicitly non-prod-equivalent in HANDOVER; add a prod-profile config-parity check; automate the RLS role creation in a Render post-deploy hook |

---

### Summary verdict
Pipeline is mature for a single-team app: full PR/push gating, security scanning that
**blocks** on CRIT/HIGH, supply-chain signing (cosign + Kyverno admission), documented
rollback + DR, and a two-stage manual-approval prod gate. Top blockers before a clean
prod cutover: align Docker base images to the CI-pinned JDK21/Node20 (D-1), move off the
static GCP SA key (D-2), and codify the GKE clusters as IaC (D-3).
