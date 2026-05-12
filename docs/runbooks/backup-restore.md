# Backup & Restore Runbook

## Purpose

Procedures for backing up and restoring every stateful component of the NU-AURA platform:
Postgres (via Neon PITR and `pg_dump`), Google Drive / MinIO file storage, Elasticsearch
indices, and (where relevant) Redis state. Covers RTO / RPO targets, restore drills, and
gaps flagged by the wave-3 audit.

---

## 1. Recovery Objectives

| Metric                           | Target                        | Current State                                           |
|----------------------------------|-------------------------------|---------------------------------------------------------|
| RTO (Recovery Time Objective)    | 4 hours                       | Documented; not yet drill-validated                     |
| RPO (Recovery Point Objective)   | 15 minutes                    | Achievable via Neon PITR; gaps in Elasticsearch / files |
| Restore drill cadence            | Quarterly                     | First drill scheduled                                   |
| Backup retention (Postgres)      | 30 days (prod) / 7 days (dev) | Configurable per environment                            |
| Backup retention (Files)         | 90 days versioning            | Drive default + 1y for payslips per legal               |
| Backup retention (Elasticsearch) | Snapshot lifecycle: 30 days   | Not yet wired (flagged)                                 |

These targets are stated commitments. Until the quarterly drill is run end-to-end, treat
them as best-effort.

---

## 2. Prerequisites

- DEVOPS or SYSTEM_ADMIN role
- `neonctl` CLI authenticated against the prod project
- `gcloud` CLI for GCS / Drive operations
- `kubectl` access to the `hrms` namespace
- Backup-restore drill checklist (template in section 9)
- Status-page admin access (notification during restores)

---

## 3. Postgres Backups

### Neon PITR (primary backup strategy)

Neon provides continuous WAL archiving with point-in-time recovery to any moment in the
retention window.

| Environment | PITR window | Branch policy                                  |
|-------------|-------------|------------------------------------------------|
| Dev         | 7 days      | Branches per developer allowed                 |
| Staging     | 14 days     | One staging branch                             |
| Prod        | 30 days     | Branches only for restore drills and incidents |

#### Verify PITR is enabled

```bash
neonctl projects list --project-id=<prod-project>
neonctl projects show <prod-project> | jq '.history_retention_seconds'
# Expected: 2592000 (30 days) for prod
```

#### Restore via PITR — create a branch from a past timestamp

```bash
# 1. Identify the recovery target timestamp (UTC, ISO-8601)
TARGET_TIME="2026-05-12T14:30:00Z"

# 2. Create a branch from that point
neonctl branches create \
  --project-id=<prod-project> \
  --name=pitr-restore-<incident-id> \
  --parent=main \
  --parent-timestamp="$TARGET_TIME"

# 3. Get the connection string for the new branch
neonctl connection-string pitr-restore-<incident-id>

# 4. Verify the branch — sample-query a table you know was good at TARGET_TIME
psql "<branch-connection-string>" -c \
  "SELECT count(*) FROM users WHERE created_at < '$TARGET_TIME';"
```

#### Promote the PITR branch to production

This is the destructive step — coordinate with engineering lead before executing.

```bash
# Option A: Cutover by swapping the K8s DB_URL secret
kubectl create secret generic hrms-db-secret \
  --from-literal=DB_URL="<branch-connection-string>" \
  -n hrms --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/hrms-backend -n hrms

# Option B: Promote the branch in Neon (renames branch to main, archives the old main)
neonctl branches set-primary pitr-restore-<incident-id> --project-id=<prod-project>
```

After cutover:

- All transactions committed between `TARGET_TIME` and the incident are **lost** unless
  manually replayed
- Notify affected tenants via status page
- Audit the restore (see step 9)

### `pg_dump` schedule (recommended; not yet wired)

K8s CronJob to take a nightly `pg_dump` and write to GCS for disaster recovery beyond the
Neon retention window. **This is currently absent** — flagged in the wave-3 audit.

Target spec:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hrms-pg-dump
  namespace: hrms
spec:
  schedule: "0 2 * * *"   # 02:00 UTC daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: pg-dump
              image: postgres:16-alpine
              command:
                - /bin/sh
                - -c
                - >
                  pg_dump --no-owner --no-acl --format=custom
                  --file=/backups/hrms-$(date +%Y%m%d-%H%M%S).dump
                  "$DB_URL" &&
                  gsutil cp /backups/*.dump gs://nu-aura-pg-backups/$(date +%Y/%m/)/
              env:
                - name: DB_URL
                  valueFrom:
                    secretKeyRef: { name: hrms-db-secret, key: DB_URL }
          restartPolicy: OnFailure
```

Restore from a `pg_dump` file:

```bash
# 1. Create a fresh Neon branch (do not restore into prod)
neonctl branches create --project-id=<prod-project> --name=restore-from-dump
neonctl connection-string restore-from-dump

# 2. Restore the dump
pg_restore --no-owner --no-acl --clean --if-exists \
  -d "<branch-connection-string>" \
  /path/to/hrms-20260512-020000.dump

# 3. Verify
psql "<branch-connection-string>" -c "SELECT max(created_at) FROM audit_logs;"
```

---

## 4. File Storage Backups

### Google Drive (primary)

File uploads (employee documents, payslips, contracts) live in tenant-scoped Drive folders.

- **Versioning**: Drive retains 30 days of file versions by default; payslips and contracts
  are flagged for **1-year** retention per legal policy
- **Trash**: Deleted files stay in trash for 30 days before permanent deletion
- **Snapshots**: Drive does not offer point-in-time snapshots — relies on versioning and
  trash

#### Restore a deleted Drive file

```bash
# Via Drive API (single-file restore)
curl -X POST \
  "https://www.googleapis.com/drive/v3/files/<file-id>/untrash" \
  -H "Authorization: Bearer <oauth-token>"

# Or via the Drive UI: navigate to Trash, right-click file, Restore
```

#### Restore an older version of a file

```bash
# List revisions
curl -s "https://www.googleapis.com/drive/v3/files/<file-id>/revisions" \
  -H "Authorization: Bearer <oauth-token>" | jq .

# Download a specific revision
curl -L "https://www.googleapis.com/drive/v3/files/<file-id>/revisions/<revision-id>?alt=media" \
  -H "Authorization: Bearer <oauth-token>" \
  -o restored-file
```

### MinIO (where used)

For environments using MinIO instead of Drive (typically self-hosted dev), enable
bucket-versioning if not already.

```bash
mc version enable myminio/hrms-files

# Restore a deleted object (undelete the latest delete marker)
mc rm --versions --rewind '7d' myminio/hrms-files/path/to/file
mc cp --version-id=<version-id> myminio/hrms-files/path/to/file myminio/hrms-files/path/to/file
```

If versioning is disabled (the default), file deletions are unrecoverable from MinIO itself
— rely on application-layer audit logs for evidence of what existed.

---

## 5. Redis

Redis is used as an **ephemeral cache** in our architecture. Most data does not need
backup:

- Permission cache (rebuilds from DB on miss)
- Token blacklist (entries naturally expire)
- WebSocket relay (transient pub/sub)

**Exceptions that benefit from backup:**

- Distributed rate-limit state (Bucket4j) — losing this resets rate limits per IP / user,
  which is recoverable but may temporarily allow abusive traffic
- Idempotency keys (Kafka dedup) — losing these may cause duplicate webhook deliveries
  during the cache-warm window

For managed Redis (e.g. GCP Memorystore), enable RDB snapshots every 6 hours:

```bash
gcloud redis instances update hrms-redis \
  --region=us-central1 \
  --persistence-mode=RDB \
  --rdb-snapshot-period=6h
```

To restore: create a new Memorystore instance from the most recent snapshot, then update
the `REDIS_HOST` secret and rolling-restart the backend.

---

## 6. Elasticsearch

Elasticsearch backs the global search and wiki search. **Snapshot Lifecycle Management
(SLM) is currently absent** — this was flagged by the wave-3 audit.

### Target SLM policy (not yet wired)

```bash
# Register a snapshot repository (one-time)
curl -X PUT "http://elasticsearch:9200/_snapshot/hrms-snaps" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "gcs",
    "settings": {
      "bucket": "nu-aura-es-snapshots",
      "base_path": "prod"
    }
  }'

# Create the SLM policy (snapshots every 6h, retain 30 days)
curl -X PUT "http://elasticsearch:9200/_slm/policy/hrms-6h" \
  -H 'Content-Type: application/json' \
  -d '{
    "schedule": "0 0 */6 * * ?",
    "name": "<hrms-{now/h}>",
    "repository": "hrms-snaps",
    "config": { "indices": ["hrms-*"] },
    "retention": { "expire_after": "30d", "min_count": 5, "max_count": 120 }
  }'
```

### Restore from snapshot

```bash
# List available snapshots
curl -s "http://elasticsearch:9200/_snapshot/hrms-snaps/_all" | jq '.snapshots[].snapshot'

# Restore a specific snapshot into a new index name
curl -X POST "http://elasticsearch:9200/_snapshot/hrms-snaps/<snapshot-name>/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "hrms-employees-2026-05",
    "rename_pattern": "hrms-(.+)",
    "rename_replacement": "hrms-restored-$1"
  }'

# Verify, then re-alias the live alias to the restored index
curl -X POST "http://elasticsearch:9200/_aliases" \
  -H 'Content-Type: application/json' \
  -d '{ "actions": [
    { "remove": { "index": "hrms-employees-2026-05", "alias": "hrms-employees" } },
    { "add":    { "index": "hrms-restored-employees-2026-05", "alias": "hrms-employees" } }
  ] }'
```

Until SLM is wired, full Elasticsearch loss requires a **re-index from source** (Postgres

+ application services). This is a multi-hour operation and breaks RTO. Wiring SLM is a
  sprint-5 priority.

---

## 7. Restore Drill (Quarterly)

Run end-to-end every quarter to validate RTO / RPO and team familiarity. Calendar on the
15th of Mar / Jun / Sep / Dec.

### Drill checklist

```text
[ ] Schedule drill on the team calendar (1 week notice)
[ ] Notify status page: "Scheduled maintenance — restore drill in staging"
[ ] Pick a fictitious incident scenario (e.g., "accidental TRUNCATE on payslips at 14:00 UTC")
[ ] Start the timer
[ ] Postgres: Neon PITR branch from 14:00 UTC — verify branch creation, target row count
[ ] Files: pick 3 Drive files, mark them deleted, restore via versioning API
[ ] Elasticsearch (when SLM is wired): restore most recent snapshot into staging
[ ] Redis: spin up fresh instance, point staging at it, verify rate-limit / idempotency reset gracefully
[ ] Cutover: point staging to all restored backends
[ ] Smoke test: login, view dashboard, payroll preview, employee search, wiki search
[ ] Stop the timer; record elapsed (target: < 4 hours)
[ ] Calculate RPO: gap between TARGET_TIME and latest committed transaction in restored DB
[ ] Document findings, file action items, update this runbook with what surprised you
```

### Drill audit

```sql
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), NULL, '<lead-engineer-id>',
        'RESTORE_DRILL_EXECUTED', 'Backup', NULL,
        'Quarterly restore drill. Scenario: <scenario>. RTO achieved: <hh:mm>. '
        'RPO measured: <mm:ss>. Findings: <summary>.',
        NOW());
```

---

## 8. Real Incident Restore — Decision Tree

```
Data loss detected
        |
        v
Is it isolated to a tenant / table / row?
   YES -> Compensating fix or manual SQL repair (see data-correction.md)
   NO  -> Continue
        |
        v
Was it caused by the most recent deploy?
   YES -> See rollback.md (rollback app + compensating migration is usually faster)
   NO  -> Continue
        |
        v
Is the loss within the Neon PITR window (30d prod)?
   YES -> Neon PITR branch + cutover (this runbook, section 3)
   NO  -> pg_dump restore (this runbook, section 3) + manual replay of recent writes
        |
        v
After restore:
- Communicate with affected tenants (email)
- Audit log + DSR log
- Post-incident review per incident-response.md
```

---

## 9. Audit & Communication

Every restore must be logged and communicated.

### Audit log (always)

```sql
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), <tenant_id or NULL>, '<admin-user-id>',
        'DATA_RESTORED', '<Postgres|Drive|Elasticsearch|Redis>', NULL,
        'Restored from <source>. Recovery target: <TARGET_TIME>. '
        'Data lost: <transactions / files between TARGET_TIME and now>. '
        'Incident ticket: <ticket-id>. RTO: <hh:mm>. RPO: <mm:ss>.',
        NOW());
```

### Status page

Update during the restore: "Investigating" → "Identified" → "Monitoring" → "Resolved".
Send the post-mortem summary to affected tenants within 48 hours.

### Tenant email (data loss confirmed)

```
Subject: Data restoration completed for your NU-AURA tenant

Hi team,

Earlier today we performed an emergency data restoration for our platform. During this
restoration, the following data was affected:

- Recovery point: <UTC timestamp>
- Data potentially lost: transactions committed between <recovery point> and <incident time>
- Affected modules: <list>

We have audited the impact and identified the following items that may need review on
your side:
<bulleted list>

Please review and contact support@nulogic.io if you notice missing data. We are conducting
a full post-incident review and will share findings within 5 business days.

— NU-AURA Engineering
```

---

## 10. Known Gaps (Wave-3 Audit, Tracked)

| Gap                                           | Impact                                                    | Sprint Target |
|-----------------------------------------------|-----------------------------------------------------------|---------------|
| `pg_dump` CronJob not deployed                | Recovery beyond 30-day Neon window requires manual export | Sprint 5      |
| Elasticsearch SLM not wired                   | Index loss = multi-hour re-index from Postgres            | Sprint 5      |
| Restore drill never executed end-to-end       | RTO / RPO targets unvalidated                             | Sprint 5      |
| Drive backup is versioning-only               | No off-platform copy; relies on Google retention          | Sprint 6      |
| Redis snapshots not configured on Memorystore | Rate-limit / idempotency state lost on instance failure   | Sprint 5      |
| No automated restore-verification job         | Backups could be silently corrupt                         | Sprint 6      |
