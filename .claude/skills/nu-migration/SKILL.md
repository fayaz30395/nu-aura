---
name: nu-migration
description: Use when asked to add a table, create a new migration, make a schema change, or any database change in NU-AURA. Generates properly formatted Flyway SQL migrations with all required columns, indexes, and constraints.
---

# Flyway Migration Generator

> **Purpose:** Generate production-ready Flyway SQL migrations for the NU-AURA PostgreSQL schema.
> Every migration follows the established patterns from V0-V103 and enforces multi-tenant isolation, soft deletes, and proper indexing.

## When to Use

- User says "add table", "new migration", "schema change", "database change", "add column", "alter table", "create index"
- Any request that modifies the PostgreSQL schema
- Adding new entities that need corresponding database tables

## Input Required

- **What** is being created or changed (table name, column additions, index, constraint)
- **Why** the change is needed (feature context helps name the migration)
- **Relationships** to existing tables (FKs, join tables)
- **Special requirements** (unique constraints scoped to tenant, enums, JSON columns)

## Steps

### Step 1: Determine the Next Migration Number

Scan existing migrations to find the highest version number:

```bash
ls backend/src/main/resources/db/migration/V*.sql | sort -t'V' -k2 -n | tail -5
```

The next migration number is the highest existing number + 1. As of this writing, V103 exists, so the next is **V104**. Always verify by scanning.

### Step 2: Generate the Migration File

Create file at: `backend/src/main/resources/db/migration/V{N}__{description}.sql`

Naming rules:
- Double underscore `__` between version and description (Flyway requirement)
- Description in `snake_case`, lowercase
- Descriptive but concise: `V104__create_project_milestones.sql`

### Step 3: Write the SQL Using Standard Column Template

Every new table MUST include these standard columns (matching V0 base schema and recent migrations like V97, V103):

```sql
-- V{N}: {Human-readable description of what this migration does}

CREATE TABLE IF NOT EXISTS {table_name} (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,

    -- === Domain columns go here ===

    -- === Standard audit columns ===
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID,
    updated_by          UUID,
    version             BIGINT DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP
);
```

**Column rules:**
- `id`: Always `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (matches all 265 existing entities)
- `tenant_id`: Always `UUID NOT NULL` (multi-tenant isolation, never nullable)
- `is_deleted`: Always `BOOLEAN NOT NULL DEFAULT FALSE` (soft deletes)
- `version`: Always `BIGINT DEFAULT 0` (optimistic locking via `@Version`)
- String columns: Use `VARCHAR(N)` with explicit lengths, not unbounded `TEXT` unless content is truly variable-length (descriptions, notes)
- Money columns: Use `NUMERIC(12, 2)` or `NUMERIC(15, 2)` for financial amounts
- Enum columns: Use `VARCHAR(30)` with the enum name stored as string (JPA `@Enumerated(EnumType.STRING)`)
- Date columns: `DATE` for dates, `TIMESTAMP` for timestamps. Store in UTC.
- Boolean columns: `BOOLEAN DEFAULT FALSE` or `BOOLEAN DEFAULT TRUE` with explicit defaults

### Step 4: Add Required Indexes

Every table MUST have these indexes at minimum:

```sql
-- Tenant scoping (required for RLS and all queries)
CREATE INDEX IF NOT EXISTS idx_{short_name}_tenant
    ON {table_name}(tenant_id);
```

Additional indexes to add:
- **Every FK column**: `CREATE INDEX IF NOT EXISTS idx_{short_name}_{fk_col} ON {table_name}({fk_col});`
- **Status + tenant**: If table has a `status` column: `CREATE INDEX IF NOT EXISTS idx_{short_name}_tenant_status ON {table_name}(tenant_id, status);`
- **Composite lookups**: For frequently filtered columns, create composite indexes with `tenant_id` as the leading column
- **Unique constraints scoped to tenant**: `CREATE UNIQUE INDEX IF NOT EXISTS uq_{short_name}_{col}_tenant ON {table_name}(tenant_id, {col}) WHERE is_deleted = false;`

Index naming convention: `idx_{short_table_name}_{column_description}`

### Step 5: Add Foreign Key Constraints

```sql
-- FK to parent table
CONSTRAINT fk_{short_name}_{parent} FOREIGN KEY ({fk_column})
    REFERENCES {parent_table}(id) ON DELETE CASCADE
```

FK rules:
- Use `ON DELETE CASCADE` for child records that have no meaning without the parent (e.g., line items)
- Use `ON DELETE SET NULL` for optional references (e.g., `approved_by`)
- Use `ON DELETE RESTRICT` (default) for critical references that should block deletion
- Always name constraints: `fk_{short_table_name}_{referenced_entity}`

### Step 6: Handle Column Additions to Existing Tables

For ALTER TABLE migrations:

```sql
-- V{N}: Add {columns} to {table}

ALTER TABLE {table_name}
    ADD COLUMN IF NOT EXISTS {column_name} {type} {constraints};

-- Add index if the column will be queried frequently
CREATE INDEX IF NOT EXISTS idx_{short_name}_{col}
    ON {table_name}({col});
```

Always use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for idempotency.

### Step 7: Verify and Warn

After generating the migration, check for:

- **Irreversible changes**: `DROP COLUMN`, `DROP TABLE`, `ALTER TYPE` -- warn the user explicitly
- **Data loss risk**: Changing column types, adding `NOT NULL` without defaults on populated tables
- **Large table indexes**: Adding indexes on tables with millions of rows should be done with `CONCURRENTLY` (note: Flyway does not support `CONCURRENTLY` in transactions, so wrap in a separate migration with `-- flyway:postgresql:transactional=false`)
- **Missing tenant_id**: Every tenant-specific table MUST have `tenant_id UUID NOT NULL`

## Output Checklist

- [ ] Migration file created at `backend/src/main/resources/db/migration/V{N}__{description}.sql`
- [ ] File starts with a comment explaining what the migration does
- [ ] All standard columns present (`id`, `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `version`, `is_deleted`)
- [ ] `tenant_id` index exists
- [ ] All FK columns have indexes
- [ ] Unique constraints include `tenant_id` scope and `WHERE is_deleted = false`
- [ ] Foreign keys have explicit `ON DELETE` behavior
- [ ] `IF NOT EXISTS` used for idempotency
- [ ] No hardcoded UUIDs (use `gen_random_uuid()`)
- [ ] Remind user to update CLAUDE.md Flyway version tracking (`Next = V{N+1}`)

## Reference: Recent Migration Examples

- **V97** (`asset_maintenance_requests`): Full table with UUID PK, tenant_id, status enum, cost columns, multi-index pattern
- **V103** (`training_skill_mappings`): Compact join-style table with FK cascade, composite tenant+FK index
- **V96** (`canonical_permission_reseed`): Permission INSERT pattern with `ON CONFLICT (code) WHERE is_deleted = false DO NOTHING`

## Reference: Existing Table Patterns

- **Base entity columns** (from `TenantAware` superclass): `id`, `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `version`, `is_deleted`
- **Permissions table columns**: `id`, `tenant_id`, `code` (VARCHAR 100, UNIQUE), `name`, `description`, `resource`, `action`, audit cols
- **Role-permissions join**: `id`, `tenant_id`, `role_id` (FK), `permission_id` (FK), `scope`, audit cols
