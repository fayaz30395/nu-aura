-- =============================================================================
-- V262 - Re-enforce fail-closed RLS after late tenant-table migrations
-- =============================================================================
--
-- V257-V261 add/adjust tenant-aware tables after the V254/V255 RLS hardening
-- pass. Re-scan the catalog so late tenant tables, including knowledge_templates,
-- receive the same restrictive app.current_tenant_id policy before release.
--
-- Also replace legacy tenant-context policies that cast current_setting(...)
-- directly to UUID. Those policies can throw 22P02 when the setting is empty,
-- which makes the startup canary fail before it can prove zero-row visibility.
-- =============================================================================

DO $$
DECLARE
    tbl RECORD;
    stale_policy RECORD;
    tenant_policy_name TEXT;
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
        tenant_policy_name := 'rls_tenant_match_' || substr(md5(tbl.nspname || '.' || tbl.relname), 1, 16);
        policy_name := 'rls_ctx_required_' || substr(md5(tbl.nspname || '.' || tbl.relname), 1, 16);

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                       tbl.nspname, tbl.relname);

        FOR stale_policy IN
            SELECT p.polname
            FROM pg_policy p
            JOIN pg_class c ON c.oid = p.polrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = tbl.nspname
              AND c.relname = tbl.relname
              AND (
                  COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ILIKE '%app.current_tenant_id%'
                  OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%app.current_tenant_id%'
              )
              AND (
                  COALESCE(pg_get_expr(p.polqual, p.polrelid), '') NOT ILIKE '%NULLIF%'
                  OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') NOT ILIKE '%NULLIF%'
              )
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                           stale_policy.polname, tbl.nspname, tbl.relname);
        END LOOP;

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       tenant_policy_name, tbl.nspname, tbl.relname);

        EXECUTE format($policy$
            CREATE POLICY %I ON %I.%I
                AS PERMISSIVE FOR ALL
                USING (
                    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
                WITH CHECK (
                    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
        $policy$, tenant_policy_name, tbl.nspname, tbl.relname);

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
        RAISE EXCEPTION 'V262: no public UUID tenant_id tables found; cannot prove runtime tenant isolation';
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
        RAISE EXCEPTION 'V262: at least one tenant table still lacks enabled and forced RLS';
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
        RAISE EXCEPTION 'V262: at least one tenant table still lacks strict app.current_tenant_id policy';
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
                AND p.polpermissive = true
                AND COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ILIKE '%NULLIF%'
                AND COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%NULLIF%'
          )
    ) THEN
        RAISE EXCEPTION 'V262: at least one tenant table still lacks safe permissive tenant policy';
    END IF;

    RAISE NOTICE 'V262: verified fail-closed RLS on % tenant tables', table_count;
END $$;
