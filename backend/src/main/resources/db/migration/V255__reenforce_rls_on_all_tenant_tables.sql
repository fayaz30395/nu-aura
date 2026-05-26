-- =============================================================================
-- V255 - Re-enforce fail-closed RLS on every tenant table
-- =============================================================================
--
-- V254 installs the strict runtime policy on the then-current tenant tables.
-- This follow-up is intentionally idempotent and scans the catalog again so
-- release validation fails closed if any UUID tenant_id table still has RLS
-- disabled, lacks FORCE RLS, or lacks the strict app.current_tenant_id policy.
-- =============================================================================

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

    IF table_count = 0 THEN
        RAISE EXCEPTION 'V255: no public UUID tenant_id tables found; cannot prove runtime tenant isolation';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN information_schema.columns col
          ON col.table_schema = n.nspname
         AND col.table_name = c.relname
         AND col.column_name = 'tenant_id'
         AND col.data_type = 'uuid'
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
    ) THEN
        RAISE EXCEPTION 'V255: at least one tenant table still lacks enabled and forced RLS';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN information_schema.columns col
          ON col.table_schema = n.nspname
         AND col.table_name = c.relname
         AND col.column_name = 'tenant_id'
         AND col.data_type = 'uuid'
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND NOT EXISTS (
              SELECT 1
              FROM pg_policy p
              WHERE p.polrelid = c.oid
                AND p.polpermissive = false
                AND COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ILIKE '%app.current_tenant_id%'
                AND COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%app.current_tenant_id%'
          )
    ) THEN
        RAISE EXCEPTION 'V255: at least one tenant table still lacks strict app.current_tenant_id policy';
    END IF;

    RAISE NOTICE 'V255: verified fail-closed RLS on % tenant tables', table_count;
END $$;
