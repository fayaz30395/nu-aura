-- =============================================================================
-- V263 - Allow global catalog rows under fail-closed RLS
-- =============================================================================
--
-- Some catalog tables intentionally store global rows with tenant_id IS NULL
-- (permissions, tenants, platform applications). V262 correctly blocks
-- tenant-owned rows without tenant context, but it also hid these global rows
-- from the runtime role. Login then failed while loading global permissions.
--
-- Keep tenant-owned rows fail-closed, while allowing null-tenant catalog rows
-- that are required across tenants.
-- =============================================================================

DO $$
DECLARE
    target_table TEXT;
    tbl RECORD;
    stale_policy RECORD;
    tenant_policy_name TEXT;
    policy_name TEXT;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'permissions',
        'tenants',
        'nu_applications',
        'app_permissions',
        'app_roles',
        'app_role_permissions'
    ]
    LOOP
        SELECT n.nspname, c.relname
          INTO tbl
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN information_schema.columns col
          ON col.table_schema = n.nspname
         AND col.table_name = c.relname
         AND col.column_name = 'tenant_id'
         AND col.data_type = 'uuid'
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relname = target_table;

        IF NOT FOUND THEN
            RAISE NOTICE 'V263: skipping %, table or tenant_id column not found', target_table;
            CONTINUE;
        END IF;

        tenant_policy_name := 'rls_tenant_match_' || substr(md5(tbl.nspname || '.' || tbl.relname), 1, 16);
        policy_name := 'rls_ctx_required_' || substr(md5(tbl.nspname || '.' || tbl.relname), 1, 16);

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', tbl.nspname, tbl.relname);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', tbl.nspname, tbl.relname);

        FOR stale_policy IN
            SELECT p.polname
            FROM pg_policy p
            JOIN pg_class c ON c.oid = p.polrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = tbl.nspname
              AND c.relname = tbl.relname
              AND (
                  p.polname IN (tenant_policy_name, policy_name)
                  OR COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ILIKE '%app.current_tenant_id%'
                  OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%app.current_tenant_id%'
              )
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                           stale_policy.polname, tbl.nspname, tbl.relname);
        END LOOP;

        EXECUTE format($policy$
            CREATE POLICY %I ON %I.%I
                AS PERMISSIVE FOR ALL
                USING (
                    tenant_id IS NULL
                    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
                WITH CHECK (
                    tenant_id IS NULL
                    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
        $policy$, tenant_policy_name, tbl.nspname, tbl.relname);

        EXECUTE format($policy$
            CREATE POLICY %I ON %I.%I
                AS RESTRICTIVE FOR ALL
                USING (
                    tenant_id IS NULL
                    OR (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                )
                WITH CHECK (
                    tenant_id IS NULL
                    OR (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                )
        $policy$, policy_name, tbl.nspname, tbl.relname);
    END LOOP;

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
          AND c.relname IN ('permissions', 'tenants', 'nu_applications')
          AND c.relkind IN ('r', 'p')
          AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
    ) THEN
        RAISE EXCEPTION 'V263: global catalog table missing enabled and forced RLS';
    END IF;

    RAISE NOTICE 'V263: global catalog rows remain visible while tenant-owned rows stay fail-closed';
END $$;
