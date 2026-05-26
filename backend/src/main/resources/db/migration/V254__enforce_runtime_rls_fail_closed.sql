-- =============================================================================
-- V254 - Enforce fail-closed tenant RLS for runtime connections
-- =============================================================================
--
-- Release-readiness blocker:
--   RlsStartupProbe reported tenant rows visible from employees without
--   app.current_tenant_id. Runtime database connections must fail closed when
--   tenant context is absent, and the runtime role must not bypass RLS.
--
-- This migration does two things:
--   1. Reasserts NOBYPASSRLS on the dedicated runtime role when it exists.
--   2. Adds one restrictive context-required policy to each existing
--      public table with a UUID tenant_id column. Existing leaky
--      permissive/graceful policies can remain, because PostgreSQL ANDs all
--      restrictive policies together.
--
-- SuperAdmin bypass remains application-layer only. There is no database role
-- exception for SuperAdmin traffic.
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nu_app_rls') THEN
        EXECUTE 'ALTER ROLE nu_app_rls NOBYPASSRLS';
        RAISE NOTICE 'V254: reasserted NOBYPASSRLS on nu_app_rls';
    ELSE
        RAISE NOTICE 'V254: role nu_app_rls does not exist; runtime role hardening skipped';
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE WARNING 'V254: could not alter nu_app_rls. Run with elevated privileges: ALTER ROLE nu_app_rls NOBYPASSRLS;';
END $$;

DO $$
DECLARE
    tbl RECORD;
    policy_name TEXT;
    table_count INT := 0;
BEGIN
    FOR tbl IN
        SELECT n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN information_schema.columns col
          ON col.table_schema = n.nspname
         AND col.table_name = c.relname
         AND col.column_name = 'tenant_id'
         AND col.data_type = 'uuid'
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
        ORDER BY n.nspname, c.relname
    LOOP
        policy_name := 'rls_ctx_required_' || substr(md5(tbl.nspname || '.' || tbl.relname), 1, 16);

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                       tbl.nspname, tbl.relname);

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       policy_name, tbl.nspname, tbl.relname);

        EXECUTE format($policy$
            CREATE POLICY %I ON %I.%I
                AS RESTRICTIVE FOR ALL
                USING (
                    NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
                WITH CHECK (
                    NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
        $policy$, policy_name, tbl.nspname, tbl.relname);

        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
                       tbl.nspname, tbl.relname);

        table_count := table_count + 1;
    END LOOP;

    RAISE NOTICE 'V254: installed fail-closed tenant-context policy on % tenant tables', table_count;
END $$;
