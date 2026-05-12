# Deployment Runbook

## Purpose

End-to-end procedure for deploying the NU-AURA platform (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence)
to production. Covers GKE deploys via Cloud Build, the Render fallback path, Flyway migration
sequencing, health-check validation, and rollback triggers.

This runbook assumes the change has already passed code review and merged to `main`. For
out-of-band hotfixes, see `rollback.md` and `incident-response.md`.

---

## Prerequisites

- DEVOPS or SYSTEM_ADMIN role
- `gcloud` CLI authenticated against the prod project
- `kubectl` context pointing at `hrms-cluster` (`gke_<project>_us-central1-a_hrms-cluster`)
- Access to Cloud Build console
- Slack `#deploys` channel access for status broadcasts

---

## 1. Pre-Flight Checklist

Run all of these before triggering a deploy. Any RED item is a blocker.

| Check                     | Command / Location                      | Expected                 |
|---------------------------|-----------------------------------------|--------------------------|
| Build green on `main`     | GitHub Actions `main` workflow          | All checks pass          |
| Backend tests green       | `./mvnw test` (or CI)                   | 0 failures               |
| Frontend tests green      | `npm test` in `nu-aura-fe/`             | 0 failures               |
| Lint green                | `npm run lint`, `./mvnw spotless:check` | 0 violations             |
| Flyway dry-run            | See section 3                           | All new migrations parse |
| Open P0/P1 incidents      | Incident log / Slack                    | None active              |
| Deploy freeze window      | Eng calendar                            | Not in freeze            |
| Tenant maintenance window | Operations Slack                        | Confirmed if needed      |

Document the commit SHA you intend to deploy. Post in `#deploys`:

```
DEPLOY START — backend@<sha> / frontend@<sha>
Pre-flight: PASS
Window: <UTC start> – <UTC end>
Owner: <name>
```

---

## 2. GKE Deploy via Cloud Build (Primary Path)

The pipeline is defined in `deployment/cloudbuild.yaml`. It builds backend + frontend images,
pushes to GCR, runs Flyway, then performs a rolling update on the `hrms` namespace.

### Trigger the build

```bash
# Trigger from the merged commit
gcloud builds submit \
  --config=deployment/cloudbuild.yaml \
  --substitutions=_GKE_CLUSTER=hrms-cluster,_GKE_ZONE=us-central1-a,_NAMESPACE=hrms \
  --project=<prod-project-id>

# Or trigger from the Cloud Build console: Triggers > "hrms-main-deploy" > Run
```

### Watch the build

```bash
gcloud builds list --ongoing --project=<prod-project-id>
gcloud builds log <build-id> --stream --project=<prod-project-id>
```

The pipeline has these stages (~15-25 min end-to-end):

1. Build backend Docker image (~6 min, uses BuildKit cache)
2. Build frontend Docker image (~5 min)
3. Push images to GCR with `$SHORT_SHA`, `latest`, and `$BRANCH_NAME-$SHORT_SHA` tags
4. `kubectl set image deployment/backend ...` + `deployment/frontend ...`
5. `kubectl rollout status` (waits up to 600s for ready pods)

### Verify after rollout

```bash
kubectl get pods -n hrms -l app=hrms-backend
kubectl get pods -n hrms -l app=hrms-frontend
kubectl rollout status deployment/hrms-backend -n hrms --timeout=300s
kubectl rollout status deployment/hrms-frontend -n hrms --timeout=300s

# Smoke-check health + version
curl -s https://api.nu-aura.io/actuator/health | jq .
curl -s https://api.nu-aura.io/actuator/info | jq .git
```

---

## 3. Flyway Migration Sequencing

Migrations live in `nu-aura-be/src/main/resources/db/migration/` and run automatically at app
startup via `spring.flyway.enabled=true`.

**Current high-water mark: V150.** New migrations must use the next available `V<N>__<desc>.sql`
filename. Versioning is monotonic — never re-use or re-order existing version numbers.

### Pre-deploy migration validation

```bash
# Dry-run against a clone of prod (do NOT run against prod directly)
./mvnw -pl nu-aura-be flyway:info \
  -Dflyway.url=jdbc:postgresql://<staging-host>/aura \
  -Dflyway.user=<user> -Dflyway.password=<pw>

# Expected output: "Pending" rows for new migrations only; no "Failed" rows
```

### Critical rules

- **NEVER run `flyway:clean` on prod or any shared environment.** It drops every object in the
  schema. The Maven goal is intentionally not wired into any CI job.
- **NEVER edit a migration after it has been applied to any environment.** Edit forward: create
  a new migration that supersedes the broken one.
- **NEVER delete a migration file.** Even reverted ones must stay in the repo so the checksum
  history is intact.
- Backfills that touch >100k rows must run as a **separate scheduled job**, not in a Flyway
  migration (Flyway holds a schema lock and a long migration will block startup).

### Migration types and sequencing

| Type                                   | When                                                       | Example                                         |
|----------------------------------------|------------------------------------------------------------|-------------------------------------------------|
| Additive (new table / column nullable) | Anytime                                                    | `V129__add_employee_emergency_contact.sql`      |
| Backfill (UPDATE existing rows)        | After app code that writes the new column is deployed      | `V130__backfill_employee_emergency_contact.sql` |
| Destructive (drop column / NOT NULL)   | After 2 deploys: app no longer reads/writes the old column | `V131__drop_legacy_emergency_field.sql`         |

Three-deploy pattern for breaking schema changes:

1. Deploy `Vn`: add new column nullable; app code dual-writes
2. Deploy `Vn+1`: backfill + app reads from new column
3. Deploy `Vn+2`: drop old column

---

## 4. Tenant Suspension Propagation

`TenantStatusCache` is bound to a 30s TTL (set in sprint 3 — see `TenantStatusCache.java`).
After deploy, suspend/activate operations may take up to 30 seconds to propagate to every pod.

For coordinated suspensions during deploy:

1. Suspend the tenant via `POST /api/v1/admin/system/tenants/{id}/suspend`
2. Wait 35 seconds for cache eviction across all pods
3. Deploy
4. Activate via the same endpoint
5. Wait another 35 seconds before verifying tenant access

See `tenant-lifecycle.md` for the full suspension/activation flow.

---

## 5. Rolling-Update Strategy

The backend Deployment uses:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

This means **zero downtime**: K8s adds one new pod before terminating an old one. With 3
replicas, the rollout proceeds 3→4→3→4→3→4→3, taking ~3-5 min.

If a new pod fails its readiness probe, the rollout halts automatically and old pods remain.
Manually intervene with `kubectl rollout undo` (see `rollback.md`).

To force a faster (riskier) rollout when needed:

```bash
kubectl patch deployment hrms-backend -n hrms -p \
  '{"spec":{"strategy":{"rollingUpdate":{"maxSurge":3,"maxUnavailable":0}}}}'

# After rollout, restore conservative defaults
kubectl patch deployment hrms-backend -n hrms -p \
  '{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'
```

---

## 6. Health-Check Validation

The backend exposes three probes via Spring Boot Actuator:

| Probe            | Path                         | Purpose                                  | Failure action                     |
|------------------|------------------------------|------------------------------------------|------------------------------------|
| `startupProbe`   | `/actuator/health/readiness` | Boot complete (Flyway done, beans ready) | K8s waits up to 5 min              |
| `readinessProbe` | `/actuator/health/readiness` | Ready to serve traffic                   | Pod removed from Service endpoints |
| `livenessProbe`  | `/actuator/health/liveness`  | App process responsive (PING only)       | Pod killed and restarted           |

**Sprint 2 correction:** liveness was previously aggregating DB + Kafka + Redis health, which
caused cascading restarts during transient downstream blips. It is now ping-only — the pod is
killed only if the HTTP server is unresponsive. Readiness still includes DB + Redis + Kafka so
unhealthy pods stop receiving traffic but are not restarted.

### Manual probe verification after deploy

```bash
# Hit liveness on each pod directly
for pod in $(kubectl get pods -n hrms -l app=hrms-backend -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $pod ==="
  kubectl exec -n hrms "$pod" -- curl -s localhost:8080/actuator/health/liveness
  echo
done

# Readiness (must be UP for traffic)
for pod in $(kubectl get pods -n hrms -l app=hrms-backend -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $pod ==="
  kubectl exec -n hrms "$pod" -- curl -s localhost:8080/actuator/health/readiness | jq .
done
```

---

## 7. Render Deploy Path (Fallback)

Render is used for the staging environment and as a fallback if GKE is unavailable. The
`render.yaml` blueprint defines both services.

```bash
# Manual deploy via Render CLI
render deploys create --service-id=<backend-svc-id> --commit=<sha>
render deploys create --service-id=<frontend-svc-id> --commit=<sha>

# Monitor
render deploys list --service-id=<backend-svc-id> --limit=5
render logs --service-id=<backend-svc-id> --tail
```

Differences vs GKE:

- Render handles its own rolling update (single instance flip, ~1 min downtime per service)
- No tenant cache TTL coordination needed (single pod per service)
- Flyway still runs at startup
- Render reads env vars from the Render dashboard, not from `secrets.yaml`

---

## 8. Rollback Triggers

Roll back immediately if **any** of these fire within 30 minutes of the deploy:

| Trigger                        | Threshold                     | Where to check                  |
|--------------------------------|-------------------------------|---------------------------------|
| Failed Flyway migration        | Any `FAILED` status row       | `flyway_schema_history` table   |
| p95 API latency                | > 2000 ms for 5+ min          | Grafana > API Metrics dashboard |
| Error rate                     | > 2% of requests for 5+ min   | Grafana > System Overview       |
| Liveness probe failures        | > 1 pod restart in 10 min     | `kubectl get events -n hrms`    |
| Failed payroll / scheduled job | Any P1+ scheduled job failure | Grafana > Business Metrics      |
| Spike in 5xx                   | > 10 / min for 5 min          | Prometheus alert `Hrms5xxSpike` |

Execute the rollback per `rollback.md`. Notify `#deploys` and incident channels immediately.

---

## 9. Post-Deploy Verification (15-min window)

Run this after the rollout reports complete:

```bash
# 1. All pods Ready
kubectl get pods -n hrms

# 2. No recent CrashLoopBackoff or Failed events
kubectl get events -n hrms --sort-by='.lastTimestamp' | tail -30

# 3. Sample a few user-facing endpoints
curl -s https://api.nu-aura.io/api/v1/health | jq .
curl -sI https://app.nu-aura.io | head -5

# 4. Verify Flyway applied expected migrations
psql "$PROD_DB_URL" -c \
  "SELECT version, description, installed_on, success
   FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 10;"

# 5. Watch dashboards for 15 min: request rate, latency, errors
```

Post `DEPLOY COMPLETE — backend@<sha> / frontend@<sha> — verified` in `#deploys`.

---

## 10. Notes on Future Improvements (Tracked)

- Blue-green via two K8s Services + ingress switch (sprint 5 candidate)
- Automated canary on 5% of pods with Argo Rollouts
- Pre-merge migration linter (no `DROP`, no `TRUNCATE`, no `flyway:clean`)
- Cloud Build approval gate on prod deploys
