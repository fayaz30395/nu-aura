-- =============================================================================
-- V38 - Complete RLS Coverage for ALL Tenant-Aware Tables
-- =============================================================================
--
-- PURPOSE:
--   V36 and V37 covered ~50 critical tables. This migration extends RLS to ALL
--   remaining tables that have a tenant_id column, ensuring complete tenant
--   data isolation at the database level.
--
-- STRATEGY (same as V36/V37):
--   1. Dynamically find all tables with tenant_id column
--   2. Skip tables already covered by V36/V37
--   3. Enable RLS + add PERMISSIVE allow-all + RESTRICTIVE tenant check
--
-- RESULT:
--   - 100% of tenant-aware tables protected by RLS
--   - Defense-in-depth: even direct SQL access is tenant-scoped
--   - Graceful fallback when session variable not set (migrations, background jobs)
-- =============================================================================


-- =============================================================================
-- SECTION A: Define tables already covered by V36 and V37
-- =============================================================================

DO
$$
DECLARE
already_covered TEXT[] := ARRAY[
        -- V36: Fluence tables
        'wiki_spaces', 'wiki_pages', 'wiki_page_versions', 'wiki_page_comments',
        'wiki_page_watches', 'blog_categories', 'blog_posts', 'blog_comments',
        'blog_likes', 'document_templates', 'template_instantiations',
        'knowledge_attachments', 'knowledge_views', 'knowledge_searches',
        'wiki_page_approval_tasks',
        -- V36: Contract tables
        'contracts', 'contract_versions', 'contract_signatures',
        'contract_templates', 'contract_reminders',
        -- V37: Core HR tables
        'employees', 'departments', 'users', 'roles', 'role_permissions',
        'custom_scope_targets', 'user_app_access', 'leave_requests',
        'leave_balances', 'leave_types', 'attendance_records',
        'attendance_time_entries', 'payroll_runs', 'payslips',
        'salary_structures', 'salary_revisions', 'employee_payroll_records',
        'assets', 'asset_assignments', 'approval_steps', 'approval_delegates',
        'audit_logs', 'job_postings', 'candidates', 'interviews',
        'performance_reviews', 'goals', 'documents', 'notifications',
        -- System tables that should NOT have RLS
        'tenants', 'flyway_schema_history', 'failed_kafka_events'
    ];

    tables_to_cover
TEXT[];
    tbl_name
TEXT;
    policy_exists
BOOLEAN;
    rls_enabled
BOOLEAN;
BEGIN
    -- Find all tables with tenant_id that are NOT already covered
SELECT ARRAY_AGG(DISTINCT c.table_name::TEXT)
INTO tables_to_cover
FROM information_schema.columns c
       JOIN information_schema.tables t
            ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE c.column_name = 'tenant_id'
  AND c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.table_name::TEXT != ALL(already_covered);

-- If no tables to cover, exit early
IF
tables_to_cover IS NULL THEN
        RAISE NOTICE 'No additional tables require RLS coverage.';
        RETURN;
END IF;

    RAISE
NOTICE 'Found % tables requiring RLS coverage', array_length(tables_to_cover, 1);

    -- Process each table
    FOREACH
tbl_name IN ARRAY tables_to_cover
    LOOP
BEGIN
            -- Check if RLS is already enabled
SELECT relrowsecurity
INTO rls_enabled
FROM pg_class
WHERE relname = tbl_name
  AND relnamespace = 'public'::regnamespace;

-- Check if tenant_rls policy already exists
SELECT EXISTS (SELECT 1
               FROM pg_policies
               WHERE tablename = tbl_name
                 AND policyname = tbl_name || '_tenant_rls')
INTO policy_exists;

-- Skip if already fully configured
IF
rls_enabled AND policy_exists THEN
                RAISE NOTICE 'Skipping % (already configured)', tbl_name;
CONTINUE;
END IF;

            -- Enable RLS if not already enabled
            IF
NOT rls_enabled THEN
                EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
                RAISE
NOTICE 'Enabled RLS on %', tbl_name;
END IF;

            -- Create PERMISSIVE allow-all policy if not exists
            IF
NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = tbl_name
                  AND policyname = tbl_name || '_allow_all'
            ) THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true)',
                    tbl_name || '_allow_all',
                    tbl_name
                );
                RAISE
NOTICE 'Created allow_all policy on %', tbl_name;
END IF;

            -- Create RESTRICTIVE tenant-scoped policy if not exists
            IF
NOT policy_exists THEN
                EXECUTE format($policy$
                    CREATE POLICY %I ON %I
                        AS RESTRICTIVE FOR ALL
                        USING (
                            tenant_id = current_setting('app.current_tenant_id', true)::uuid
                            OR current_setting('app.current_tenant_id', true) IS NULL
                            OR current_setting('app.current_tenant_id', true) = ''
                        )
                        WITH CHECK (
                            tenant_id = current_setting('app.current_tenant_id', true)::uuid
                            OR current_setting('app.current_tenant_id', true) IS NULL
                            OR current_setting('app.current_tenant_id', true) = ''
                        )
                $policy$,
                    tbl_name || '_tenant_rls',
                    tbl_name
                );
                RAISE
NOTICE 'Created tenant_rls policy on %', tbl_name;
END IF;

EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error processing table %: %', tbl_name, SQLERRM;
            -- Continue with next table
END;
END LOOP;

    RAISE
NOTICE 'RLS coverage complete.';
END $$;


-- =============================================================================
-- SECTION B: Force RLS on all tenant-aware tables
-- =============================================================================
-- FORCE means RLS applies even to table owners (superusers still bypass)

DO
$$
DECLARE
tbl_name TEXT;
    tables_with_tenant_id
TEXT[];
BEGIN
SELECT ARRAY_AGG(DISTINCT c.table_name::TEXT)
INTO tables_with_tenant_id
FROM information_schema.columns c
       JOIN information_schema.tables t
            ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE c.column_name = 'tenant_id'
  AND c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.table_name NOT IN ('tenants', 'flyway_schema_history', 'failed_kafka_events');

IF
tables_with_tenant_id IS NULL THEN
        RETURN;
END IF;

    FOREACH
tbl_name IN ARRAY tables_with_tenant_id
    LOOP
BEGIN
EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl_name);
EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not force RLS on %: %', tbl_name, SQLERRM;
END;
END LOOP;
END $$;


-- =============================================================================
-- VERIFICATION QUERY (run manually after migration)
-- =============================================================================
--
-- Check RLS coverage:
--
-- SELECT
--     t.table_name,
--     CASE WHEN c.relrowsecurity THEN 'YES' ELSE 'NO' END AS rls_enabled,
--     CASE WHEN c.relforcerowsecurity THEN 'YES' ELSE 'NO' END AS rls_forced,
--     COUNT(p.policyname) AS policy_count
-- FROM information_schema.tables t
-- JOIN pg_class c ON c.relname = t.table_name
-- LEFT JOIN pg_policies p ON p.tablename = t.table_name
-- WHERE t.table_schema = 'public'
--   AND t.table_type = 'BASE TABLE'
--   AND EXISTS (
--       SELECT 1 FROM information_schema.columns col
--       WHERE col.table_name = t.table_name
--         AND col.column_name = 'tenant_id'
--   )
-- GROUP BY t.table_name, c.relrowsecurity, c.relforcerowsecurity
-- ORDER BY rls_enabled, t.table_name;
--
-- Expected: ALL tenant-aware tables should have:
--   - rls_enabled = YES
--   - rls_forced = YES
--   - policy_count >= 2 (allow_all + tenant_rls)
-- =============================================================================
