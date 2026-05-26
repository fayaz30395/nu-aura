-- =============================================================================
-- V179 - Force tenant RLS and tolerate empty app.current_tenant_id safely
-- =============================================================================
--
-- V177 removed permissive "OR current_setting(...) IS NULL" fallbacks, but
-- existing connection initialization/reset paths may leave the custom GUC as an
-- empty string. Casting ''::uuid raises an error instead of failing closed.
--
-- This migration rewrites tenant-setting policy expressions to:
--
--     NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
--
-- Unset or empty tenant context now evaluates to NULL and RLS returns zero
-- tenant rows. It also FORCEs RLS on every RLS-enabled table so table owners do
-- not bypass isolation accidentally.
-- =============================================================================

DO $$
DECLARE
    pol RECORD;
    qual_expr TEXT;
    check_expr TEXT;
    role_expr TEXT;
    create_sql TEXT;
    policy_count INT := 0;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
                qual ILIKE '%current_setting(''app.current_tenant_id''%'
             OR with_check ILIKE '%current_setting(''app.current_tenant_id''%'
          )
        ORDER BY tablename, policyname
    LOOP
        qual_expr := pol.qual;
        check_expr := pol.with_check;
        role_expr := (
            SELECT string_agg(quote_ident(role_name), ', ')
            FROM unnest(pol.roles) AS role_name
        );

        IF qual_expr IS NOT NULL THEN
            qual_expr := replace(
                qual_expr,
                'current_setting(''app.current_tenant_id''::text, true)',
                'NULLIF(current_setting(''app.current_tenant_id''::text, true), ''''::text)'
            );
            qual_expr := replace(
                qual_expr,
                'current_setting(''app.current_tenant_id''::text)',
                'NULLIF(current_setting(''app.current_tenant_id''::text, true), ''''::text)'
            );
        END IF;

        IF check_expr IS NOT NULL THEN
            check_expr := replace(
                check_expr,
                'current_setting(''app.current_tenant_id''::text, true)',
                'NULLIF(current_setting(''app.current_tenant_id''::text, true), ''''::text)'
            );
            check_expr := replace(
                check_expr,
                'current_setting(''app.current_tenant_id''::text)',
                'NULLIF(current_setting(''app.current_tenant_id''::text, true), ''''::text)'
            );
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       pol.policyname, pol.schemaname, pol.tablename);

        create_sql := format(
            'CREATE POLICY %I ON %I.%I AS %s FOR %s',
            pol.policyname,
            pol.schemaname,
            pol.tablename,
            pol.permissive,
            pol.cmd
        );

        IF role_expr IS NOT NULL AND role_expr <> '' THEN
            create_sql := create_sql || ' TO ' || role_expr;
        END IF;

        IF qual_expr IS NOT NULL THEN
            create_sql := create_sql || ' USING (' || qual_expr || ')';
        END IF;

        IF check_expr IS NOT NULL THEN
            create_sql := create_sql || ' WITH CHECK (' || check_expr || ')';
        END IF;

        EXECUTE create_sql;
        policy_count := policy_count + 1;
    END LOOP;

    RAISE NOTICE 'V179: hardened % policies that read app.current_tenant_id', policy_count;
END $$;

DO $$
DECLARE
    tbl RECORD;
    table_count INT := 0;
BEGIN
    FOR tbl IN
        SELECT n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relrowsecurity
    LOOP
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', tbl.nspname, tbl.relname);
        table_count := table_count + 1;
    END LOOP;

    RAISE NOTICE 'V179: forced RLS on % public tables', table_count;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nu_app_rls') THEN
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO nu_app_rls', current_database());
        GRANT USAGE ON SCHEMA public TO nu_app_rls;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nu_app_rls;
        GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO nu_app_rls;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO nu_app_rls;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nu_app_rls;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO nu_app_rls;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT EXECUTE ON FUNCTIONS TO nu_app_rls;
        RAISE NOTICE 'V179: granted runtime privileges to nu_app_rls';
    ELSE
        RAISE NOTICE 'V179: role nu_app_rls does not exist; runtime grants skipped';
    END IF;
END $$;
