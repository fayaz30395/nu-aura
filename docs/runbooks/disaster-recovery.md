# Disaster Recovery Runbook

## Purpose

Procedures for recovering the NU-AURA platform from catastrophic failures that exceed
the scope of routine incident response. Covers full region outage, primary database
loss, ransomware, accidental destructive operations (e.g., tenant drop), and the
sequencing required to bring tiered services back inside the stated RTO / RPO budget.

This runbook composes with — it does not duplicate — the following sibling documents:

- [`backup-restore.md`](backup-restore.md) — backup mechanics, Neon PITR commands, restore drill
  template
- [`incident-response.md`](incident-response.md) — Sev classification, incident commander roles
- [`rollback.md`](rollback.md) — Helm-level rollback for routine bad deploys
- [`deployment.md`](deployment.md) — GitHub Actions promotion flow
- [`tenant-lifecycle.md`](tenant-lifecycle.md) — tenant create / suspend / archive

If this is a single-component failure (one pod, one service, one bad deploy), use
incident-response + rollback. Escalate to this runbook only when scope crosses
multiple subsystems or destroys persistent state.

---

## 1. Scope — What Counts as a DR Event

A DR event is declared when **one or more** of the following are true:

| Trigger                                         | Examples                                                                                               |
|-------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| Full region / cloud-provider outage             | GCP `asia-south1` (Mumbai) unreachable for >30 min; Neon control plane down >30 min                    |
| Loss of primary persistent store                | Postgres primary unrecoverable; Redis cluster lost with no warm cache; Elasticsearch indices corrupted |
| Destructive operation that bypasses soft-delete | Accidental `DROP TABLE`, `DROP DATABASE`, full-tenant purge, mass `UPDATE` without `WHERE`             |
| Ransomware / confirmed compromise               | Encrypted volumes, attacker persistence, exfiltration confirmed by `aidefence_scan` or external SOC    |
| Helm release corruption beyond rollback         | Multiple successive bad revisions; release history truncated; CRDs misaligned                          |
| Data integrity event > RPO budget               | Silent data corruption detected after >1h; reconciliation impossible without restore                   |

A DR event is **NOT**:

- A single service restart (handled by Kubernetes liveness probes).
- A bad deploy that `helm rollback` can fix (see `rollback.md`).
- A single tenant data correction (see `data-correction.md`).
- A Kafka consumer lag spike (see `kafka-dead-letter.md`).

**Declarer:** the on-call SRE escalates to Incident Commander, who declares DR with
explicit sign-off from CTO or VP Engineering. Declaration triggers the comms plan
(section 6) and starts the RTO clock.

---

## 2. Recovery Objectives

| Metric                                     | Target                                       | Mechanism                                            |
|--------------------------------------------|----------------------------------------------|------------------------------------------------------|
| **RTO** (full platform back to read-write) | **4 hours**                                  | Tiered recovery; Tier-1 first                        |
| **RPO** (max acceptable data loss)         | **1 hour**                                   | Hourly Postgres WAL shipping; Redis RDB every 30 min |
| **Status-page first update**               | 15 minutes from declaration                  | Manual; template in section 6                        |
| **Customer notification (GDPR Art. 33)**   | 24 hours from confirmed personal-data impact | Email + status page                                  |
| **Post-mortem published**                  | 5 business days after recovery               | Template linked in section 7                         |

These are commitments. They become real only after the quarterly drill (see
`dr-drill-checklist.md`) has validated each procedure end-to-end at least once.

### RPO mechanism details

- **Postgres**: Neon continuous WAL archiving; point-in-time recovery to any second in
  the 30-day retention window. RPO target of 1h is conservative — Neon achieves ~1 min
  in practice, but 1h accounts for detection lag between corruption and declaration.
- **Redis**: RDB snapshot every 30 min via `redis-cli BGSAVE` cron; AOF disabled (cache
  layer, not source of truth). Acceptable loss because all Redis state is rebuildable
  from Postgres (see section 4.2).
- **Elasticsearch**: No native snapshot pipeline yet (flagged gap in `backup-restore.md`).
  Recovery strategy is full reindex from Postgres via the existing nightly reindex
  scheduler — adds time, but bounds loss to zero by design.
- **Kafka**: Topics configured with `retention.ms=604800000` (7 days). Consumer groups
  can replay from earliest offset; idempotency keys (`IdempotencyService`) deduplicate.
- **Google Drive / file storage**: Drive native versioning, 90-day retention. Payslips
  retained 1 year per legal policy.

---

## 3. Service Tiers and Recovery Priority

Bring tiers back in order. Do not start Tier 2 until Tier 1 health-checks are green.

### Tier 1 — must be back within RTO (4h)

| Service                                     | Why it's Tier 1                                                                               |
|---------------------------------------------|-----------------------------------------------------------------------------------------------|
| Postgres (Neon primary)                     | Source of truth for 360+ entities; every other service derives from it                        |
| Backend API (Spring Boot, 170+ controllers) | Frontend and integrations are blocked without it                                              |
| Redis (7.x cluster)                         | Rate limiting, token blacklist, account lockout, WebSocket relay — auth flows fail without it |
| Frontend (Next.js 14)                       | Customer-visible; without it the platform is "down" even if APIs work                         |
| Auth / JWT issuer                           | Subset of backend; called out separately because it gates everything else                     |

### Tier 2 — degraded mode acceptable, recover within 8h

| Service                                | Degraded behavior                                                                                                             |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| Elasticsearch                          | Search returns "indexing in progress" banner; falls back to Postgres `ILIKE` for critical entity types (employee, candidate)  |
| Kafka                                  | Async workflows queue locally on backend; eventual consistency delayed but not lost (idempotency keys protect against replay) |
| Google Drive integration               | File uploads buffered to local pod storage; flushed on recovery                                                               |
| Scheduled jobs (25 `@Scheduled` tasks) | Resume on next cron tick after backend up                                                                                     |

### Tier 3 — recover within 24h, do not block Tier 1/2

| Service                             | Notes                                                                     |
|-------------------------------------|---------------------------------------------------------------------------|
| Prometheus / Grafana / AlertManager | DR itself is monitored externally (status page, manual checks) until back |
| Centralized logging                 | Pods write to stdout; loss of aggregation is recoverable, not blocking    |
| Non-critical analytics dashboards   | Recharts-driven; data is in Postgres, just no UI                          |

---

## 4. Recovery Procedures by Failure Mode

> **Before any destructive recovery action:** confirm the failure with the Incident
> Commander, capture a snapshot/branch of the current state (even if corrupted —
> needed for the post-mortem), and announce on the status page.

### 4.1 Postgres primary loss — Neon point-in-time restore

**Symptoms:** connections refused, `neonctl branches list` shows primary unhealthy,
or destructive query confirmed (`DROP`, mass `UPDATE`).

```bash
# 1. Identify the target restore timestamp (last known-good).
#    Use Grafana to find the last clean write, or the moment before the destructive query.
TARGET_TS="2026-05-12T14:23:00Z"

# 2. Create a recovery branch from PITR.
neonctl branches create \
  --project-id "$NEON_PROJECT_ID" \
  --parent main \
  --pitr "$TARGET_TS" \
  --name "dr-recovery-$(date +%Y%m%d-%H%M)"

# 3. Verify on the recovery branch.
NEON_CONN=$(neonctl connection-string --branch "dr-recovery-..." --role-name app)
psql "$NEON_CONN" -c "SELECT MAX(created_at) FROM audit_log;"
psql "$NEON_CONN" -c "SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL;"

# 4. Promote the recovery branch (irreversible — get IC sign-off).
neonctl branches set-default --branch "dr-recovery-..."

# 5. Rotate the Postgres connection secret in K8s.
kubectl -n hrms create secret generic db-credentials \
  --from-literal=DB_URL="$NEON_CONN" \
  --dry-run=client -o yaml | kubectl apply -f -

# 6. Roll backend pods to pick up the new connection.
kubectl -n hrms rollout restart deployment/backend
kubectl -n hrms rollout status deployment/backend --timeout=10m
```

Detailed Neon commands and edge cases (rolling back a promote, branch sprawl) are in
`backup-restore.md` section 3.

### 4.2 Redis cluster loss — rebuild from RDB + warm from Postgres

Redis state is by design reconstructable. Sequence:

```bash
# 1. Recover the RDB snapshot from the configured persistence volume.
#    On GKE, the PVC for Redis primary is `redis-primary-data`.
kubectl -n hrms exec redis-primary-0 -- ls -la /data/dump.rdb

# 2. If the PVC is intact, restart the pod — Redis loads RDB automatically.
kubectl -n hrms delete pod redis-primary-0

# 3. If the PVC is gone, restore from the latest off-cluster snapshot
#    (configured via `redis-cli --rdb` cron, uploaded to GCS).
gsutil cp gs://nu-aura-backups/redis/latest.rdb /tmp/dump.rdb
# Copy into a fresh PVC, then start the pod.

# 4. Once Redis is up, trigger CacheWarmUpService for all tenants.
#    This pre-loads the 5 long-lived caches (permissions, tenant config, role map,
#    feature flags, holiday calendar).
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  "$BACKEND_URL/internal/cache/warm-all-tenants"

# 5. Token blacklist starts empty (acceptable — issued JWTs are still valid by
#    signature; revocations issued during the outage must be re-applied from audit log).
psql "$NEON_CONN" -c \
  "SELECT user_id, jti, revoked_at FROM token_revocation WHERE revoked_at > NOW() - INTERVAL '2 hours';" \
  | while read row; do
      # re-blacklist via internal endpoint
      ...
    done
```

Affected subsystems and their behavior during Redis-down:

- `DistributedRateLimiter` falls back to in-memory Bucket4j (per-pod, not cluster-wide).
- `TokenBlacklistService` falls back to `ConcurrentHashMap` (per-pod).
- `AccountLockoutService` falls back to per-pod state (attacker could retry across pods).
- `FluenceEditLockService` becomes advisory-only (concurrent edits may collide).
- `RedisWebSocketRelay` loses multi-pod fan-out; clients reconnect to whichever pod.

These fallbacks are graceful but reduce security posture. Restore Redis as a Tier-1
priority.

### 4.3 Elasticsearch loss — reindex from Postgres

Elasticsearch holds **no source-of-truth data**. Recovery is reindex.

```bash
# 1. Recreate the indices (mappings are versioned in source).
kubectl -n hrms exec backend-0 -- \
  curl -X POST localhost:8080/internal/search/recreate-indices \
  -H "Authorization: Bearer $ADMIN_JWT"

# 2. Trigger the full reindex scheduler manually.
kubectl -n hrms exec backend-0 -- \
  curl -X POST localhost:8080/internal/search/reindex-all \
  -H "Authorization: Bearer $ADMIN_JWT"

# 3. Monitor progress.
kubectl -n hrms logs -f backend-0 | grep ReindexScheduler

# 4. Until reindex completes, frontend banner: "Search indexing in progress —
#    results may be incomplete."
#    Critical paths (employee lookup, candidate search) fall back to Postgres ILIKE
#    via the existing FallbackSearchService.
```

Expected duration: ~45 min for a mid-size tenant (~50k employees). Reindex runs in
parallel per index type. Backend should NOT be marked unhealthy during reindex —
search is Tier 2 by design.

### 4.4 Kafka loss — replay from offset

Kafka data is rebuildable because every event has a corresponding row in Postgres
(double-write pattern with `IdempotencyService` dedup).

```bash
# 1. If the broker volumes are intact, restart the Confluent stack — consumer groups
#    resume from last committed offset.
docker compose -f config/docker/kafka.yml restart

# 2. If volumes are lost, recreate topics with original retention.
kafka-topics --bootstrap-server kafka:9092 --create \
  --topic notifications --partitions 6 --replication-factor 3 \
  --config retention.ms=604800000

# 3. Reset consumer groups to earliest. This will replay up to retention window;
#    IdempotencyService dedups on the consumer side using the event's idempotency key.
kafka-consumer-groups --bootstrap-server kafka:9092 \
  --group notification-consumer --reset-offsets --to-earliest \
  --topic notifications --execute

# 4. For events older than retention (>7 days), backfill from Postgres outbox.
kubectl -n hrms exec backend-0 -- \
  curl -X POST localhost:8080/internal/outbox/replay-since?ts=2026-05-11T00:00:00Z
```

### 4.5 Helm release corruption — `helm rollback`

If `helm history` shows the current revision broken but earlier revisions intact:

```bash
helm history hrms -n hrms
helm rollback hrms <last-good-revision> -n hrms --wait --timeout 10m
kubectl -n hrms get pods
```

If `helm history` is truncated or the release secret is corrupted:

```bash
# Reinstall from the last known-good chart version pinned in Git.
helm uninstall hrms -n hrms --keep-history
helm install hrms ./charts/hrms -n hrms \
  --version "$LAST_GOOD_CHART_VERSION" \
  -f config/helm/values-prod.yaml
```

Detailed Helm rollback procedure, including PVC retention and pre-stop hooks, is in
`rollback.md`.

### 4.6 Ransomware / confirmed compromise

This procedure prioritizes **containment first, recovery second**. Do not skip steps.

```bash
# 1. CONTAIN. Cordon the suspected compromised node(s) so no new pods schedule there.
kubectl cordon <node-name>

# 2. Snapshot the affected pod's filesystem for forensics BEFORE killing it.
kubectl -n hrms exec <pod> -- tar czf /tmp/forensic.tar.gz /app /tmp /var/log
kubectl -n hrms cp <pod>:/tmp/forensic.tar.gz ./forensic-$(date +%s).tar.gz

# 3. Drain the node (forces pods to reschedule on clean nodes).
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# 4. Rotate ALL secrets the compromised pod could have accessed.
#    Use the key-rotation runbook for the full list. Minimum:
#    - JWT signing key, DB credentials, Redis password, Kafka SASL, third-party API keys.
#    Detailed steps in key-rotation.md.

# 5. POINT-IN-TIME RESTORE Postgres to before the confirmed compromise window.
#    See 4.1 above. Use the earliest confirmed-good timestamp.

# 6. Block the compromised account / IP at the edge (Cloudflare / nginx).

# 7. Notify SOC, legal, DPO. GDPR Art. 33: customer notification within 24h
#    if personal data confirmed exposed.

# 8. Do NOT bring the platform back live until forensics confirms scope.
#    Use a maintenance page (status page → "Scheduled maintenance — security review").
```

Cross-references: `key-rotation.md` (secret rotation), `incident-response.md`
(Sev-1 escalation), `backup-restore.md` (restore mechanics).

### 4.7 Accidental tenant drop

Specific case of 4.1, but worth its own procedure because it's the most common
non-region DR event.

```bash
# 1. Identify the tenant_id and the exact timestamp of the destructive action
#    from audit_log.
psql "$NEON_CONN" -c "
  SELECT actor_user_id, action, target_tenant_id, created_at
  FROM audit_log
  WHERE action IN ('TENANT_HARD_DELETE', 'TENANT_DROP')
  ORDER BY created_at DESC LIMIT 5;
"

# 2. Create a Neon PITR branch to 1 minute before the action.
neonctl branches create --parent main --pitr "$TARGET_TS" \
  --name "tenant-rescue-$TENANT_ID"

# 3. Connect to the rescue branch and dump only the affected tenant's rows.
#    Every tenant-scoped table has a tenant_id column; use the export script in
#    scripts/db/export-tenant.sh.
./scripts/db/export-tenant.sh "$RESCUE_CONN" "$TENANT_ID" > tenant-rescue.sql

# 4. Replay into production main branch inside a transaction.
psql "$PROD_CONN" -1 -f tenant-rescue.sql

# 5. Verify counts match between rescue branch and prod.
./scripts/db/compare-tenant-counts.sh "$RESCUE_CONN" "$PROD_CONN" "$TENANT_ID"

# 6. Drop the rescue branch.
neonctl branches delete --branch "tenant-rescue-$TENANT_ID"
```

This is safer than a full database restore because it isolates blast radius to a
single tenant. See `tenant-lifecycle.md` for soft-delete vs hard-delete policy.

---

## 5. Cross-Region Failover (Roadmap — Not Yet Implemented)

**Status: documented for future state. Not available in current production.**

Current production runs in a single region (`asia-south1`, Mumbai) with no warm
standby in another region. A full region outage today means waiting for the region
to recover — RTO under this scenario is dictated by GCP, not by us. This is a known
gap and is on the platform roadmap.

Planned end-state:

- Neon: enable cross-region read replicas in `asia-southeast1` (Singapore). Promotion
  is a manual decision by IC; expected RTO 30–60 min once tooling is built.
- GKE: passive cluster in `asia-southeast1` running the same Helm chart with zero
  replicas. Scale up on declaration.
- DNS: Cloudflare load balancer with health-check origin failover. TTL 60s.
- Redis: rebuild from RDB in the new region (Redis state is acceptable loss; cache
  layer warms from Postgres).
- Kafka: cross-cluster mirror via MirrorMaker 2 for the 4 critical topics
  (notifications, audit, outbox, workflow-commands).

Tracking issue: see Linear `INFRA-DR-FAILOVER`.

Until this is live, communicate honestly to customers and in the comms template
(section 6): "Service is currently regional; full restoration depends on cloud
provider recovery."

---

## 6. Communication Plan

Communication during DR is part of the procedure, not an afterthought. Trust is lost
faster from silence than from bad news.

### Timeline

| T+      | Action                                                                 | Owner            |
|---------|------------------------------------------------------------------------|------------------|
| 0 min   | DR declared by IC                                                      | IC               |
| +15 min | First status-page post (acknowledgment)                                | Comms lead       |
| +30 min | Internal Slack thread (#incident) with ETA                             | IC               |
| Hourly  | Status-page update — even if "no change, still working"                | Comms lead       |
| +24 h   | GDPR Art. 33 notification (if personal data confirmed exposed)         | DPO + Legal      |
| +5 d    | Post-mortem published to customers (internal first, redacted external) | IC + Engineering |

### Status-page templates

**Initial (T+15 min):**

> [INVESTIGATING] We are aware of an issue affecting NU-AURA. Customers may experience
> [degraded login / inability to access HRMS / search returning stale results]. Our
> engineering team is investigating. Next update by [T+1h].

**Update (hourly):**

> [IDENTIFIED] The issue is [primary database recovery / cache layer rebuild /
> indexing in progress]. Estimated restoration: [time]. Customer data is safe
> [if true — only state when confirmed]. Next update by [time].

**Recovery (T+restoration):**

> [RESOLVED at HH:MM IST] All services are restored. A full post-mortem will be
> published within 5 business days. We apologize for the impact.

### Customer notification (GDPR Art. 33)

Triggered only when **personal data is confirmed exposed** (ransomware exfil,
attacker confirmed accessed PII tables, etc.). Not triggered by mere downtime.

- Email to designated data controller per tenant (stored on `tenant.dpo_email`).
- Content: nature of breach, categories of data, approximate number of records,
  measures taken, contact for DPO.
- 24-hour SLA from confirmed exposure to notification.
- Template lives at `docs/legal/breach-notification-template.md` (owned by Legal).

---

## 7. Post-Incident

A DR event is not closed when service is restored. It's closed when the post-mortem
ships and the action items are filed.

### 5-day post-mortem requirements

- **Owner:** Incident Commander.
- **Format:** blameless, root-cause-focused. Template at
  `docs/postmortems/_template.md`.
- **Required sections:** timeline, detection, impact (in customer-minutes and
  user-impact), root cause, what went well, what didn't, action items with owners
  and due dates.
- **Distribution:** internal first (engineering + leadership), then customer-facing
  version (redacted of sensitive infra detail) within 5 business days.
- **Action items:** must be tracked in Linear / Jira with owners and due dates.
  Items rated P0/P1 are reviewed at the next weekly engineering ops meeting.

### Drill cadence

The quarterly DR drill (see `dr-drill-checklist.md`) validates that the procedures in
this document still work. A procedure that has not been drill-tested in the last
quarter is treated as theoretical.

---

## 8. Quick Reference

| Failure                | Procedure                            | Target                      |
|------------------------|--------------------------------------|-----------------------------|
| Postgres primary lost  | 4.1 — Neon PITR branch               | 30 min                      |
| Redis cluster lost     | 4.2 — RDB restore + warm cache       | 20 min                      |
| Elasticsearch lost     | 4.3 — reindex from Postgres          | 45 min                      |
| Kafka lost             | 4.4 — replay from offset / outbox    | 30 min                      |
| Helm release corrupt   | 4.5 — `helm rollback`                | 10 min                      |
| Ransomware             | 4.6 — contain → forensics → restore  | hours / declare maintenance |
| Tenant accidental drop | 4.7 — tenant-scoped PITR restore     | 30 min                      |
| Full region outage     | section 5 — cloud-provider dependent | not yet self-sufficient     |

**On-call escalation:** PagerDuty rotation → IC declares → CTO/VP-E confirms DR.

**Drill validation:** every procedure in section 4 must be executed end-to-end at
least once per year via the quarterly drill rotation.
