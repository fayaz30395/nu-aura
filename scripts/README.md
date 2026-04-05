# NU-AURA Scripts

Database migration and utility scripts for the NU-AURA platform.

## Database Migration Scripts

Tools for migrating PostgreSQL data between environments (e.g., Neon cloud to local, or between
tenants).

### Prerequisites

- PostgreSQL 16+ client tools (`pg_dump`, `psql`)
- Access to source and target databases
- Database credentials

### Available Scripts

| Script          | Purpose                            |
|-----------------|------------------------------------|
| `export-db.sh`  | Export database to SQL dump        |
| `import-db.sh`  | Import SQL dump to target database |
| `migrate-db.sh` | Full migration (export + import)   |

### Usage

```bash
# Export from Neon cloud
./scripts/export-db.sh

# Import to target
./scripts/import-db.sh <dump-file>
```

## Database Info

- **Dev database:** Neon cloud PostgreSQL
- **Prod database:** PostgreSQL 16
- **Tables:** 265 across 15 functional modules
- **Migrations:** Flyway V0–V91 (88 files). Next: V92
- **Migration tool:** Flyway only — legacy Liquibase in `db/changelog/` is deprecated

See [DB_MIGRATION_GUIDE.md](DB_MIGRATION_GUIDE.md) for detailed migration instructions.
See [SEED_DATA_README.md](../SEED_DATA_README.md) for seed data documentation.
