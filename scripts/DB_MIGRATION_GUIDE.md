# Database Migration Guide

Guide for migrating the NU-AURA PostgreSQL database between environments.

## Architecture

- **Dev:** Neon cloud PostgreSQL (connection string in `.env`)
- **Prod:** PostgreSQL 16 (self-hosted or managed)
- **Tables:** 265 across 15 functional modules
- **Multi-tenancy:** All tenant-scoped tables have `tenant_id UUID NOT NULL` with RLS policies
- **Migrations:** Flyway V0–V91 (88 files, gaps at V1, V27–V29, V63–V66, V68–V79). Next: V92

## Migration Options

### Option 1: Full Database Dump (Recommended for Dev-to-Dev)

```bash
# Export
pg_dump "$NEON_JDBC_URL" --format=custom --no-owner --no-acl -f nu-aura-backup.dump

# Import
pg_restore -d "$TARGET_DB_URL" --no-owner --no-acl --clean --if-exists nu-aura-backup.dump
```

### Option 2: Flyway from Scratch (Clean Environment)

Start the backend against an empty database — Flyway auto-applies all migrations:

```bash
# Point .env to the new database
NEON_JDBC_URL=jdbc:postgresql://<new-host>/<new-db>?sslmode=require

# Start backend — Flyway runs automatically
cd backend && ./start-backend.sh
```

### Option 3: Schema-Only Export

```bash
# Export schema only (no data)
pg_dump "$NEON_JDBC_URL" --schema-only --no-owner -f schema.sql

# Import schema
psql "$TARGET_DB_URL" -f schema.sql
```

## Important Notes

- Always back up before migration
- Ensure `tenant_id` values are consistent between environments
- RLS policies are included in schema exports — verify they're applied
- Flyway migration history is in `flyway_schema_history` table — must match between environments
- Do NOT apply V30 (demo data) in production environments
- Legacy Liquibase files in `db/changelog/` are deprecated — use Flyway only
