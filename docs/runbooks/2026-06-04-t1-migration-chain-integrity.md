# Release Readiness T1: Migration Chain Integrity

**Date:** 2026-06-04
**Scope:** `backend/src/main/resources/db/migration/`
**Owner:** Codex (handoff continuation)

## Decision objective
Validate migration-chain readiness for release by executing:
1. `docker-compose up -d`
2. Fresh DB migrate `V0 -> latest`
3. Restore DB migrate from deployed schema with checksum policy decision
4. Confirm destructive checkpoints (`V55`, `V213/V225/V237` alignments)

## Evidence collected

### 1) Compose bootstrapping

```bash
env DOCKER_HOST=unix:///Users/fayaz.m/.colima/default/docker.sock REDIS_PASSWORD=7af6... POSTGRES_PASSWORD=hrms NEON_JDBC_URL=jdbc:postgresql://localhost:5433/hrms NEON_DB_USERNAME=postgres NEON_DB_PASSWORD=... GRAFANA_ADMIN_PASSWORD=admin docker-compose up -d
```

Result:

- `hrms-zookeeper`, `hrms-elasticsearch`, `hrms-prometheus`, `hrms-kafka`, `hrms-redis`, `hrms-grafana`, `hrms-alertmanager` started/recreated.
- Existing compose stack is usable with explicit env vars and `DOCKER_HOST`.

### 2) Migration baseline verification on fresh schema

Created clean empty DB for chain test:

```bash
env DOCKER_HOST=unix:///Users/fayaz.m/.colima/default/docker.sock docker exec -e PGPASSWORD=hrms nuaura-pg-fresh psql -U hrms -c "DROP DATABASE IF EXISTS hrms_fresh_validation;"
env DOCKER_HOST=unix:///Users/fayaz.m/.colima/default/docker.sock docker exec -e PGPASSWORD=hrms nuaura-pg-fresh psql -U hrms -c "CREATE DATABASE hrms_t1_fresh WITH TEMPLATE template0 OWNER hrms;"
env DOCKER_HOST=unix:///Users/fayaz.m/.colima/default/docker.sock docker exec -e PGPASSWORD=hrms nuaura-pg-fresh psql -U hrms -d hrms_t1_fresh -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
```

Result: `count = 0` prior to migrate.

Ran Flyway with app-equivalent mixed mode:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/hrms_t1_fresh \
SPRING_DATASOURCE_USERNAME=hrms SPRING_DATASOURCE_PASSWORD=hrms \
SPRING_FLYWAY_URL=jdbc:postgresql://localhost:5433/hrms_fresh \
SPRING_FLYWAY_USER=hrms SPRING_FLYWAY_PASSWORD=hrms \
FLYWAY_URL=jdbc:postgresql://localhost:5433/hrms_fresh \
FLYWAY_USER=hrms FLYWAY_PASSWORD=hrms \
mvn -pl backend flyway:migrate -Dflyway.mixed=true
```

Observed:
- `Current version of schema: 33`
- Migration proceeds into `V34 - production hardening indexes`.
- Run did not complete in this invocation and was blocked waiting on index creation locks in DB activity (`V34` active `CREATE INDEX CONCURRENTLY` on `audit_logs`)

### 3) Restore path from deployed schema (`hrms_restore`)

Restore DB top-of-history:

```bash
env DOCKER_HOST=unix:///Users/fayaz.m/.colima/default/docker.sock docker exec -e PGPASSWORD=hrms nuaura-pg-fresh psql -U hrms -d hrms_restore -c "SELECT version, success, installed_rank FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"
```

Result before intervention: latest installed rank = version `77`.

Initial migrate attempt:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/hrms_restore ...
mvn -pl backend flyway:migrate -Dflyway.mixed=true
```

Result: hard validation failure (`Migration checksum mismatch` for versions 0..24, etc.).

Count check for changed migrations:

```bash
git log --diff-filter=M --name-only --pretty=format:'%h %s' -- backend/src/main/resources/db/migration/ | rg 'V[0-9]+__' | sort -u | wc -l
```

Result: `161` modified migration files.

Repair executed per policy decision point:

```bash
mvn -pl backend flyway:repair -Dflyway.mixed=true
```

Result:
- Repair updated checksums for versions `0..24` and marked migration `1` as deleted in `flyway_schema_history`.
- Command exit `BUILD SUCCESS`.

Post-repair migrate still fails with unresolved migration (`version 1`) because restore history includes legacy migration lineage not represented in current chain (`pm schema initial` exists, local repo no longer has this V1 lineage).

### 4) Forward-only and mutable migration rule

```bash
git log --diff-filter=M --name-only --pretty=format:'%h %s' -- backend/src/main/resources/db/migration/ | rg 'V[0-9]+__' | sort -u | wc -l
```

Result: `161` modified migration files (historical edits), confirming non-forward usage in existing history.

## Outcome for T1

- **Fresh path:** not yet fully clean due V34 lock-wait condition during index migration in the current execution context.
- **Restore path:** **not clean** with current history integrity.
- Per task instruction, this requires a documented migration-drift remediation path before continuing.

## Adopted decision (logged in ADR-013)
- Do not alter applied migrations further.
- For recovery windows requiring migration against legacy restore datasets:
  1. treat current history as immutable and create drift handling process around `flyway:repair` + documented baseline strategy before migrate,
  2. require explicit operator confirmation before running repair in non-lab contexts.
