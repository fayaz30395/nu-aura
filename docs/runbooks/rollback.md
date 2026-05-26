# Rollback Runbook

## Purpose

Procedures for reverting a deploy when a regression, migration failure, or security incident
is detected. Covers application-level rollback via Kubernetes, database compensating
migrations, JWT-secret rotation rollback, and user communication.

This runbook is the partner document to `deployment.md` — read both in sequence during an
incident.

---

## 1. When to Roll Back

Roll back **without further investigation** if any of the following are observed within
30 minutes of a deploy:

| Trigger                                                            | Action                                        |
|--------------------------------------------------------------------|-----------------------------------------------|
| Flyway migration `FAILED` row in `flyway_schema_history`           | Roll back app + run compensating migration    |
| Auth broken (login or `/me` returning 5xx for >1 min)              | Roll back app immediately                     |
| p95 latency > 2s sustained 5+ min                                  | Roll back app, investigate offline            |
| Error rate > 2% sustained 5+ min                                   | Roll back app, investigate offline            |
| CrashLoopBackoff on any pod after startup probe should have passed | Roll back app                                 |
| Confirmed data corruption                                          | Stop writes, roll back app, restore from PITR |
| Confirmed security incident (leaked secret, AuthZ bypass)          | Rotate secrets THEN roll back                 |

Investigate first (do not auto-rollback) for:

- Single-tenant issue with workaround
- Cosmetic UI bugs
- Slow but non-erroring background job
- Issue affecting <5% of users where forward-fix is faster than rollback

---

## 2. Prerequisites

- DEVOPS or SYSTEM_ADMIN role
- `kubectl` configured for the `hrms` namespace on `hrms-cluster`
- Cloud Build / Render console access
- Direct DB access (Neon prod role)
- Status-page admin access (statuspage.io or equivalent)

---

## 3. Application Rollback

### Option A: `kubectl rollout undo` (Fastest, < 2 min)

This reverts to the **immediately previous** ReplicaSet. The previous image is still in GCR
so no rebuild is needed.

```bash
# Roll backend back one revision
kubectl rollout undo deployment/hrms-backend -n hrms

# Roll frontend back one revision
kubectl rollout undo deployment/hrms-frontend -n hrms

# Watch the rollout
kubectl rollout status deployment/hrms-backend -n hrms --timeout=300s
kubectl rollout status deployment/hrms-frontend -n hrms --timeout=300s
```

To roll back further (skip multiple bad deploys):

```bash
# List recent revisions
kubectl rollout history deployment/hrms-backend -n hrms

# Roll to a specific revision
kubectl rollout undo deployment/hrms-backend -n hrms --to-revision=<N>
```

### Option B: Cloud Build deploy of a prior commit (Authoritative, 15-25 min)

Use this when:

- The rollback needs to span >5 deploys (rollout history is truncated)
- A config / secret / non-image change also needs reverting
- The rollback should be reflected in the git history

```bash
# Trigger Cloud Build pointing at the last-known-good commit
gcloud builds submit \
  --config=deployment/cloudbuild.yaml \
  --substitutions=_GKE_CLUSTER=hrms-cluster,_GKE_ZONE=us-central1-a,_NAMESPACE=hrms \
  --branch=<rollback-target-branch> \
  --project=<prod-project-id>

# Optionally cherry-pick the revert as a commit on main first:
git revert <bad-sha> -m 1
git push origin main
# Then trigger the normal deploy
```

### Verify rollback succeeded

```bash
# Pods running the previous image
kubectl get pods -n hrms -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Health endpoints
curl -s https://api.nu-aura.io/actuator/health | jq .
curl -s https://api.nu-aura.io/actuator/info | jq .git.commit.id
```

---

## 4. Database Rollback Strategy

**Flyway is roll-forward only.** There is no `flyway:undo` in our setup, and editing or
deleting a migration after it has run will corrupt the schema history. Use one of the three
strategies below.

### Strategy 1: Compensating Migration (Preferred)

Write a new migration `V<N+1>__revert_<feature>.sql` that undoes the broken change.

Example — bad migration added a NOT NULL column without a default:

```sql
-- V129__bad_add_column.sql (already applied, broken in prod)
ALTER TABLE employees ADD COLUMN ssn_last4 VARCHAR(4) NOT NULL;

-- V130__revert_bad_add_column.sql (the fix)
ALTER TABLE employees ALTER COLUMN ssn_last4 DROP NOT NULL;
-- OR fully revert:
ALTER TABLE employees DROP COLUMN ssn_last4;
```

Deploy the compensating migration via the normal pipeline. Document both migrations in the
incident review.

### Strategy 2: Manual SQL Rollback (Emergency)

If you cannot wait for a full deploy cycle and the change is small:

```sql
-- Connect to prod (use psql with the prod connection string)
BEGIN;

-- Reverse the schema change
ALTER TABLE employees DROP COLUMN IF EXISTS ssn_last4;

COMMIT;
```

Do **not** update, delete, or insert rows in `flyway_schema_history` by hand. That table is
Flyway-owned release evidence; manual edits can hide the real deployed schema and make the
next deploy unrecoverable.

After emergency SQL, immediately write the next forward-only compensating migration
(`V<N+1>__...sql`) that makes the desired schema state explicit for every future environment.
If Flyway left a `FAILED` row before the transaction was applied, preserve the failing logs and
run `flyway repair` from the controlled deploy job using the migration/owner role. Never repair
or rewrite schema history with ad hoc SQL.

### Strategy 3: Neon Point-in-Time Recovery (Last Resort)

Use only when data corruption is confirmed and compensating SQL is impractical. PITR creates
a branch from a past timestamp; you then re-point the app at the branch.

```bash
# Create a PITR branch (Neon CLI)
neonctl branches create \
  --project-id=<project-id> \
  --name=pitr-rollback-<timestamp> \
  --parent-timestamp="2026-05-12T14:30:00Z"

# Get the connection string for the new branch
neonctl connection-string pitr-rollback-<timestamp>
```

Then update the `DB_URL` secret in K8s and roll the deployment:

```bash
kubectl create secret generic hrms-db-secret \
  --from-literal=DB_URL='<new-pitr-connection-string>' \
  -n hrms --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/hrms-backend -n hrms
```

**Warning:** PITR rollback discards every transaction since the recovery point. Coordinate
with the data team and post a customer notice before executing.

See `backup-restore.md` for the full PITR procedure.

---

## 5. JWT Secret Rotation Rollback

If you rotated `JWT_SECRET` as part of a security incident and need to roll back the
rotation:

**This invalidates every active session.** Coordinate with the auth team before executing.

```bash
# 1. Restore the old JWT secret value from the previous K8s secret revision or vault
kubectl create secret generic hrms-jwt-secret \
  --from-literal=JWT_SECRET='<old-value>' \
  -n hrms --dry-run=client -o yaml | kubectl apply -f -

# 2. Restart all pods so they pick up the old secret
kubectl rollout restart deployment/hrms-backend -n hrms

# 3. Force-expire the token blacklist so cached "revoked" entries clear faster
# (optional, only if blacklist was populated using the new secret)
kubectl exec -n hrms <redis-pod> -- redis-cli FLUSHDB
```

After the rollback all users must re-login. Push a notice to the status page and in-app
banner: "We are aware of a sign-in issue — please log in again."

For the proper rotation procedure (zero-downtime, overlap window), see `key-rotation.md`.

---

## 6. Tenant Suspension Cache Rollback

If a tenant was wrongly suspended during the deploy:

```bash
# Re-activate via API
curl -X POST "https://api.nu-aura.io/api/v1/admin/system/tenants/<tenant-id>/activate" \
  -H "Authorization: Bearer <super-admin-jwt>" \
  -H "Content-Type: application/json"

# Wait 35s for TenantStatusCache TTL (30s) to evict on all pods
sleep 35

# Verify the tenant can log in
curl -s "https://api.nu-aura.io/api/v1/tenants/<tenant-id>/status" \
  -H "Authorization: Bearer <super-admin-jwt>" | jq .
```

See `tenant-lifecycle.md` for the cache propagation details.

---

## 7. User Communication

### Status Page (within 5 min of rollback decision)

```
INVESTIGATING — Service Issue
We are investigating elevated error rates affecting login and dashboard access.
The team has begun a rollback. Next update in 15 min.
```

Update to MONITORING after rollback completes, then RESOLVED after 30 min of stable
metrics.

### Email Notice (only if outage > 30 min or data impact suspected)

Send via support@nulogic.io to affected tenant admins. Template:

```
Subject: NU-AURA service issue on <date> — resolved

Hi team,

Between <UTC start> and <UTC end> we experienced <issue>. The cause was <one sentence>.
We rolled back the change at <UTC time> and the platform has been stable since.

What we are doing next:
- Post-incident review on <date>
- <Specific action items>

If you noticed missed transactions or data inconsistencies during this window, please reply
to this email or contact support@nulogic.io.

— NU-AURA Engineering
```

### In-App Banner

Add via the system admin panel or directly:

```sql
INSERT INTO system_announcements (id, message, severity, starts_at, ends_at, created_at)
VALUES (gen_random_uuid(),
        'We resolved a brief service issue earlier today. Please refresh if you see stale data.',
        'INFO', NOW(), NOW() + INTERVAL '24 hours', NOW());
```

---

## 8. Post-Rollback Verification

```bash
# 1. Image confirmed reverted
kubectl describe deployment hrms-backend -n hrms | grep Image

# 2. Health green
curl -s https://api.nu-aura.io/actuator/health | jq '.status'

# 3. Error rate back to baseline (Grafana > System Overview > "Error Rate %")
# Should drop below 0.5% within 5 min

# 4. p95 latency back to baseline (Grafana > API Metrics > "p95 Response Time")
# Should drop below 800ms within 5 min

# 5. No active alerts firing
# Prometheus > Alerts

# 6. Sample-test critical flows (login, view dashboard, create employee, run payroll preview)
```

If everything is green for 30 consecutive minutes, mark the incident RESOLVED and schedule
the post-incident review per `incident-response.md`.

---

## 9. Document the Rollback

```sql
-- Audit entry for the rollback action
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), NULL, '<admin-user-id>',
        'PRODUCTION_ROLLBACK', 'Deployment', NULL,
        'Rolled back from <bad-sha> to <good-sha>. Trigger: <p95 latency / error rate / migration failure>. '
        'Incident ticket: <ticket-id>.',
        NOW());
```

Update the incident channel:

```
ROLLBACK COMPLETE — reverted to <good-sha>
Trigger: <reason>
Customer impact: <duration / users affected>
Next: PIR scheduled <date>
```
