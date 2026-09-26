# Preproduction verification environment

Production authorization behaviour used to be unverifiable: production runs with
`DEMO_CREDENTIALS_ENABLED=false` and no legitimate test credential exists, so the
authenticated checks (self-access, cross-employee denial, receipt authorization,
page-size cap) were reported UNVERIFIED on every release. A SEC-1-class regression —
every DB-loaded permission silently widened to `RoleScope.GLOBAL` — could therefore
ship undetected. This environment closes that gap without putting a test account in
production.

## What exists

Railway project `nu-aura`, environment **`preproduction`** (`b9d1fb6b-6495-4610-ab91-73933bc6a502`):

| Service | Purpose |
|---|---|
| `Postgres-Het6` | Its own database. Never a copy, branch or dump of production |
| `Redis-H9yo` | Required: production uses redis for cache, rate limiting and lockout |
| `nu-aura-backend-preprod` | The artifact under verification, `backend/Dockerfile` |
| `preprod-provisioner` | Throwaway one-shot job for SQL that must run inside Railway |

Deliberately absent: Kafka, Elasticsearch, frontend, Google Drive, SMTP — matching
production's *effective* configuration.

## Guarantees

- **No production data, ever.** No dump, restore, branch or anonymized copy. Data comes
  from a virgin database plus the demo-gated migrations plus `seed-fixtures.sql`.
- **Fresh secrets.** Every secret here was generated for this environment. No production
  secret value is read, copied or compared — `drift-check.sh` compares presence only.
- **Runtime role proven by query**, not by configuration: `nu_app_rls` is
  `NOSUPERUSER NOBYPASSRLS`, verified with `SELECT rolsuper, rolbypassrls`.
- **Stricter than production on purpose:** `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true` here
  catches checksum drift that production (`false`) would silently tolerate.

## Provisioning

1. `railway environment new preproduction`
2. `railway add -d postgres` / `railway add -d redis` (with `preproduction` active)
3. `railway add --service nu-aura-backend-preprod`, then set variables — the must-match
   set is enumerated in `drift-check.sh`; `DEMO_CREDENTIALS_ENABLED=true` and
   `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true` are the only deliberate divergences.
4. Create the runtime role. The Railway CLI cannot open a TCP proxy and `railway ssh`
   needs an interactive host-key accept, so SQL that must run inside the cluster goes
   through `preprod-provisioner`: a scratch directory containing the `.sql` plus

   ```dockerfile
   FROM postgres:16-alpine
   COPY provision.sql /provision.sql
   CMD ["sh","-c","psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f /provision.sql"]
   ```

   with `DATABASE_URL=${{Postgres-Het6.DATABASE_URL}}`, deployed via
   `railway up --service preprod-provisioner`. Delete the service when finished.
5. `railway up --service nu-aura-backend-preprod` **from a clean worktree** — never from
   a dirty tree, since `railway up` uploads the working directory, not a commit.
6. Apply `seed-fixtures.sql` the same way, after migrations have run.

## Recreating from a virgin database

Delete and re-add the Postgres service, re-run the role provisioner, redeploy the
backend. The full `0 → head` chain then executes (327 migrations at V337), which
production never does and which has broken before — the V312 `fk_employees_user`
incident. Do not migrate an existing preproduction database forward; a long-lived one
drifts from what a fresh provision produces.

## Verifying

```bash
export VERIFY_EMAIL=... VERIFY_PASSWORD=...           # an existing preprod account
export VERIFY_SELF_EMPLOYEE_ID=... VERIFY_OTHER_EMPLOYEE_ID=...
export VERIFY_OTHER_TENANT_EMPLOYEE_ID=aa000000-0000-0000-0000-000000000030
export VERIFY_ADMIN_EMAIL=... VERIFY_ADMIN_PASSWORD=...   # check 5 needs list permission
./scripts/verify-deployment.sh --base-url https://<preprod-host>

./scripts/preprod/drift-check.sh --project <id> \
    --service nu-aura-backend --preprod-service nu-aura-backend-preprod
```

`verify-deployment.sh` exits non-zero on any FAIL, and an unreachable base URL is a FAIL
rather than a SKIP — a gate that goes green because nothing answered is worse than none.

Against production it runs with `--skip-authenticated`; the authenticated checks then
report `SKIPPED` with the reason and are never inferred from the preproduction result.

## Fixtures

`seed-fixtures.sql` adds one synthetic tenant (`aa000000-…0001`) with a single fictional
employee, so cross-tenant isolation has something to probe. It is **not** a Flyway
migration: it lives outside `db/migration/`, so it can never take a version number,
enter `flyway_schema_history` or affect a checksum. Three independent barriers stop it
running against production — it refuses when the NuLogic tenant looks populated, when
`app.preprod_fixtures_allowed` is not explicitly `'true'`, and when no active demo
account exists.

## Cost and teardown

Cost is a second backend + Postgres + Redis. Sleep the environment between releases, or
delete it entirely: `railway environment delete preproduction`. Production shares no
resource with it. If the environment goes away, remove the CI gate in the same change —
though the script's unreachable-is-FAIL rule means a dangling gate fails loudly.
