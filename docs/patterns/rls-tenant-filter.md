---
name: rls-tenant-filter
tags: [postgres, rls, multi-tenant, security, defense-in-depth, flyway]
applies_to: [backend, database, migrations]
references: [ADR-010, ADR-001]
---

# RLS Tenant Filter

## When to use

You are adding a **new tenant-aware table**, or a new column on a tenant-aware table, or a
new native query that bypasses JPA's automatic filter.

If the table has a `tenant_id UUID NOT NULL` column, it MUST also have an RLS policy. No
exceptions for "I'll add it later" — add the policy in the same migration.

## Canonical implementation

### Migration template

```sql
-- V1NN__create_<entity>_table.sql
CREATE TABLE <entity> (
    id          UUID PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    -- ... business columns ...
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on tenant_id is mandatory — RLS filters use it
CREATE INDEX idx_<entity>_tenant_id ON <entity>(tenant_id);

-- Enable RLS with graceful fallback (matches V36 convention)
ALTER TABLE <entity> ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON <entity>
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR tenant_id::text = current_setting('app.current_tenant', true)
  );

-- For tables with INSERT from triggers or background jobs, also add WITH CHECK:
CREATE POLICY tenant_insert ON <entity>
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_tenant', true) IS NULL
    OR tenant_id::text = current_setting('app.current_tenant', true)
  );
```

### JPA entity

```java
@Entity
@Table(name = "<entity>")
@EntityListeners({ TenantTimestamp.class, AuditEntityListener.class })
public class <Entity> {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;  // populated by TenantContextAwareListener

    // ... business fields ...
}
```

### Repository

```java
public interface <Entity>Repository extends JpaRepository<<Entity>, UUID> {
    // No tenant_id filter needed — RLS at the DB enforces it.
    // The application-layer filter is the FIRST line of defense; RLS is the SECOND.
    // For native queries, RLS is the only line of defense — that's why it matters.

    @Query("SELECT e FROM <Entity> e WHERE e.tenantId = :#{principal.tenantId}")
    List<<Entity>> findAllForCurrentTenant();
}
```

## Anti-patterns

- **DON'T** create a tenant-aware table without an RLS policy. Audit will catch it but at
  cost of one production scare.
- **DON'T** use a `userId`/`employeeId` filter as a substitute for tenant filtering. They're
  not the same axis.
- **DON'T** disable RLS for "convenience" in a migration. The graceful fallback is already
  the convenience.
- **DON'T** issue raw SQL from JdbcTemplate without going through `TenantRlsTransactionManager`.
  If you must, do it from an explicit admin connection and document why.
- **DON'T** add a service-layer query that filters by `WHERE tenant_id = ?` AND assumes RLS
  is doing the work. Both layers should agree.

## Tests required

- Integration: two tenants, two rows; `SET app.current_tenant` to tenant A; query returns
  only tenant A's row
- Integration: `current_setting('app.current_tenant', true)` IS NULL → query returns ALL
  rows (graceful mode confirmed)
- Migration test: V1NN runs cleanly on a database that already has the table from a previous
  failed migration attempt (use `IF NOT EXISTS`)

## Notes

- Tables exempt from RLS are documented in `V36__reinstate_tenant_rls_policies.sql:279`.
  Don't add to that exemption list without an ADR amendment.
- Read replicas inherit RLS policies automatically. Flyway runs against both.
- Performance: the index on `tenant_id` is critical. Without it, RLS makes queries scan
  the whole table per request.
