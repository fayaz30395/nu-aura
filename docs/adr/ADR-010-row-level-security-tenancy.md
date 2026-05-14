# ADR-010: Row-Level Security for Tenant Isolation

**Status:** Accepted
**Date:** 2026-05-14
**Decision Makers:** Backend & Security Architecture
**Supersedes:** Application-layer-only tenant filtering (pre-V36)
**Related:** ADR-001 (Multi-Tenant Architecture)

---

## Context

NU-AURA uses a **shared-database, shared-schema** multi-tenant model (per ADR-001). Every
business table carries a `tenant_id UUID NOT NULL` column. Before V36, isolation was enforced
**solely at the application layer**:

- Every JPA repository method had to filter by `tenant_id` explicitly
- Every native query had to remember to inject `tenant_id`
- Every report builder, every export, every Kafka consumer had to thread the tenant through

This created a wide attack surface. The Wave-1 audit (sprint 1, `a93d4093`) closed 79 findings,
many of them tenant-filter omissions in newly-added code. The model "every developer remembers
to filter on every query" does not scale to 1,622 Java files and 170 controllers.

A class of bugs we have actually shipped and fixed:

1. A native query in `LeaveReportService` joined the leaves table without `tenant_id` filter,
   causing one tenant's leave balances to surface in another tenant's report (closed in
   Wave-1, audit-ref AUTH-014).
2. A Quartz job iterated `attendance` records cross-tenant because the job ran outside a
   `TenantContext` (Wave-2).

We need a **defense-in-depth** approach: the database itself refuses cross-tenant reads even
when the application layer forgets to filter.

---

## Decision

**Use PostgreSQL Row-Level Security (RLS) as the second line of defense, with the application's
`TenantContext` propagating `tenant_id` into the DB session via `set_config('app.current_tenant')`
on every transaction.**

Implementation lives in:

- `V36__reinstate_tenant_rls_policies.sql` — enables RLS on all tenant-aware tables with a
  graceful "allow-all" fallback when the GUC is unset
- `infrastructure/persistence/TenantRlsTransactionManager` — JDBC interceptor that calls
  `SET LOCAL app.current_tenant = '<uuid>'` at transaction start
- `security/TenantContext` — ThreadLocal holding the resolved tenant for the current request
- `security/JwtAuthenticationFilter` — populates `TenantContext` from the JWT subject claim

### Policy shape (canonical example)

```sql
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON employees
  USING (
    -- Graceful fallback: allow-all when the GUC is unset (Flyway, migrations, ops scripts)
    current_setting('app.current_tenant', true) IS NULL
    OR tenant_id::text = current_setting('app.current_tenant', true)
  );
```

The `true` argument to `current_setting` makes it return NULL instead of erroring when the GUC
is unset — this is what lets Flyway migrations, manual ops, and unit tests bypass RLS without
having to set the GUC.

---

## Rationale

### Alternatives considered

**A. Application-layer filters only (pre-V36 state).**
Rejected: 1,622 Java files, every developer must remember every time. Audit history shows
this fails.

**B. Schema-per-tenant.**
Rejected: 100+ tenants × 254 tables × Flyway migrations = O(n) migration cost per release.
Operational overhead unacceptable. Documented in ADR-001.

**C. Database-per-tenant.**
Rejected: same reasons as B, plus connection-pool fragmentation (see ADR-009).

**D. RLS with strict mode (deny when GUC unset).**
Rejected as a starting point because it breaks Flyway migrations, ops scripts, and integration
tests immediately. We can ratchet up to strict mode after observability proves the application
layer always sets the GUC.

### Why "graceful" mode

The `IS NULL` clause is intentional. Migration-time and ops-time code rarely runs inside a
`TenantContext`. Forcing RLS to deny those paths would make every Flyway migration and every
admin tool require an explicit `SET app.current_tenant = '...'` ceremony — too much friction.
The trade-off is that a bug in `TenantRlsTransactionManager` (e.g., the GUC silently fails to
set) degrades to "no RLS" rather than "RLS denies everything." We accept this because:

1. `TenantRlsTransactionManager` has a unit test that asserts the GUC is set on every
   transaction start.
2. The application-layer filter is still present, providing the first line of defense.
3. A future ADR can ratchet to strict mode once we add tenant-context-required tracing.

---

## Consequences

### Positive

- Cross-tenant data leaks via forgotten `WHERE tenant_id = ?` clauses become impossible at
  the DB level for all RLS-enabled tables.
- Native queries (which JPA's automatic filter wouldn't catch) are also protected.
- Auditors get a clean story: "isolation is enforced at the DB."

### Negative

- Every transaction now executes `SET LOCAL app.current_tenant` — measurable overhead
  (~0.1ms per transaction in our benchmarks, acceptable).
- Connection pool returns connections without resetting GUCs by default. `SET LOCAL` scopes
  the value to the transaction, but a misconfigured pool that uses `SET` (without `LOCAL`)
  would leak tenant context across requests. HikariCP returns connections cleanly — confirmed
  in `TenantRlsTransactionManagerIntegrationTest`.
- Some operational queries from psql now require an explicit
  `SET app.current_tenant = '...'`. Ops runbook updated.

### Mitigations

- The graceful mode is the mitigation for ops friction.
- A scheduled "tenant-isolation drift detector" (future work, tracked in wave-10 P2-4)
  periodically queries cross-tenant joins from an admin connection and alerts on results.
- Read replicas inherit the same RLS policies (Flyway migrations apply to both).

---

## Tables NOT covered by RLS

Documented in `V36__reinstate_tenant_rls_policies.sql` line 279. Tables explicitly skipped:

| Table                  | Reason                                              |
|------------------------|-----------------------------------------------------|
| `tenants`              | Has no `tenant_id` (it IS the tenant)               |
| `flyway_schema_history`| Flyway-managed, no business data                    |
| `permissions`          | Global permission catalog, intentionally shared     |
| `roles_default`        | Seeded global roles, tenant-scoped roles live in `roles` |

For these tables, tenant isolation is enforced **only** at the application layer. They are
either intentionally global (`permissions`, `roles_default`) or have no concept of tenant
(`tenants`, `flyway_schema_history`).

---

## Verification

```sql
-- Run as a non-superuser DB user
SET app.current_tenant = '00000000-0000-0000-0000-000000000000';
SELECT count(*) FROM employees;  -- Should return 0 (no employees for that tenant)

RESET app.current_tenant;
SELECT count(*) FROM employees;  -- Should return ALL employees (graceful mode)
```

For application code, the integration test
`TenantRlsTransactionManagerIntegrationTest#crossTenantReadIsBlocked` is the canonical
regression test.

---

## Related Decisions

- [ADR-001](ADR-001-multi-tenant-architecture.md) — Multi-tenant model
- [ADR-002](ADR-002-authentication-strategy.md) — How `tenant_id` reaches the request
- [ADR-006](ADR-006-jwt-token-optimization.md) — Tenant claim in JWT
