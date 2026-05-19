-- =============================================================================
-- V177 - Drop graceful "OR NULL" fallback from tenant RLS policies
-- =============================================================================
--
-- Backlog: T1-01 (docs/architecture/improvement-backlog.md)
--
-- PROBLEM:
--   V36/V37/V38/V40/V41/V65/V81 created RESTRICTIVE policies named
--   `<table>_tenant_rls` whose USING / WITH CHECK clauses read:
--
--       tenant_id = current_setting('app.current_tenant_id', true)::uuid
--       OR current_setting('app.current_tenant_id', true) IS NULL
--       OR current_setting('app.current_tenant_id', true) = ''
--
--   When the session variable is unset (Flyway, ShedLock, integration tests,
--   any forgotten async path), the second/third disjunct evaluates TRUE and
--   the policy passes every row -> silent cross-tenant read.
--
-- FIX:
--   Recreate every `<table>_tenant_rls` policy with strict semantics:
--       tenant_id = current_setting('app.current_tenant_id', true)::uuid
--   Unset/empty session var -> comparison yields NULL -> RESTRICTIVE policy
--   fails -> zero rows visible. Fail-closed.
--
-- MIGRATION ROLE:
--   Flyway itself must keep working. We create a dedicated role
--   `nu_migration` with BYPASSRLS so DDL/data migrations can read/write
--   across tenants without depending on the session variable. Operators
--   should run Flyway as `nu_migration` (set `spring.flyway.user` /
--   `spring.flyway.password`) and the runtime app DB user must NOT have
--   BYPASSRLS.
--
-- POLICIES UNTOUCHED (already strict, no OR NULL fallback):
--   - `<table>_tenant_isolation` policies created by V52, V56, V84,
--     V87 (statutory_filing_*), V88 (expense_*), V90 (lwf_*, biometric_*,
--     restricted_holiday_*, payroll_components, shift_patterns, rosters,
--     roster_entries, expense_items) — they already lack the OR NULL escape
--     and return NULL when the var is unset (fail-closed).
--
-- STARTUP CANARY:
--   `RlsStartupProbe` (see backend/.../common/security/RlsStartupProbe.java)
--   opens a connection without setting `app.current_tenant_id` and asserts
--   `SELECT COUNT(*) FROM employees` returns 0. Fails boot if a regression
--   reintroduces a leaky policy.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 1: Migration role with BYPASSRLS (for Flyway / operator tasks)
-- -----------------------------------------------------------------------------
-- Create the role only if absent. We deliberately do NOT grant it to the
-- runtime application user — the app role must remain RLS-bound.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nu_migration') THEN
        EXECUTE 'CREATE ROLE nu_migration NOLOGIN BYPASSRLS';
        RAISE NOTICE 'Created role nu_migration with BYPASSRLS';
    ELSE
        -- Ensure the attribute is set even if the role already existed
        EXECUTE 'ALTER ROLE nu_migration BYPASSRLS';
        RAISE NOTICE 'Role nu_migration already exists; BYPASSRLS re-asserted';
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Managed Postgres (e.g. Neon) may forbid BYPASSRLS without elevated
        -- access. Log and continue — the strict policies below still land.
        RAISE WARNING 'Could not create/alter nu_migration role (insufficient privilege). Run as superuser: CREATE ROLE nu_migration NOLOGIN BYPASSRLS;';
END $$;


-- -----------------------------------------------------------------------------
-- SECTION 2: Recreate every *_tenant_rls policy with strict USING/WITH CHECK
-- -----------------------------------------------------------------------------
-- Dynamic sweep: find every policy whose name ends in `_tenant_rls`,
-- drop it, and recreate with the strict predicate. Policy names are
-- preserved exactly so any downstream tooling (pg_policies dumps, audits)
-- keeps matching.
DO $$
DECLARE
    pol RECORD;
    table_count INT := 0;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname LIKE '%\_tenant\_rls' ESCAPE '\'
        ORDER BY tablename, policyname
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       pol.policyname, pol.schemaname, pol.tablename);

        EXECUTE format($pol$
            CREATE POLICY %I ON %I.%I
                AS RESTRICTIVE FOR ALL
                USING (
                    tenant_id = current_setting('app.current_tenant_id', true)::uuid
                )
                WITH CHECK (
                    tenant_id = current_setting('app.current_tenant_id', true)::uuid
                )
        $pol$, pol.policyname, pol.schemaname, pol.tablename);

        table_count := table_count + 1;
    END LOOP;
    RAISE NOTICE 'V177: hardened % *_tenant_rls policies (strict, no OR NULL fallback)', table_count;
END $$;


-- -----------------------------------------------------------------------------
-- SECTION 3: Verification helper (for manual run after deploy)
-- -----------------------------------------------------------------------------
-- The query below should return ZERO rows. If it returns anything, a leaky
-- policy slipped back in.
--
-- SELECT schemaname, tablename, policyname, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname LIKE '%_tenant_rls'
--   AND (qual ILIKE '%IS NULL%' OR qual ILIKE '%= ''''%');
--
-- Additional sanity check — confirm BYPASSRLS attribute landed:
--
-- SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'nu_migration';
-- =============================================================================
