-- =============================================================================
-- V256 - Force SECURITY INVOKER on tenant-bearing views
-- =============================================================================
--
-- RLS policies are table-level. PostgreSQL views run with owner privileges by
-- default, which can bypass the underlying table RLS. Every public view that
-- exposes a UUID tenant_id must therefore run as SECURITY INVOKER.
-- =============================================================================

DO $$
DECLARE
    tenant_view RECORD;
    view_count INT := 0;
BEGIN
    FOR tenant_view IN
        SELECT n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN information_schema.columns col
          ON col.table_schema = n.nspname
         AND col.table_name = c.relname
         AND col.column_name = 'tenant_id'
         AND col.data_type = 'uuid'
        WHERE n.nspname = 'public'
          AND c.relkind = 'v'
        ORDER BY n.nspname, c.relname
    LOOP
        EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)',
                       tenant_view.nspname, tenant_view.relname);
        view_count := view_count + 1;
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
          AND c.relkind = 'v'
          AND NOT COALESCE(c.reloptions @> ARRAY['security_invoker=true']::text[], false)
    ) THEN
        RAISE EXCEPTION 'V256: at least one tenant view is not SECURITY INVOKER';
    END IF;

    RAISE NOTICE 'V256: verified SECURITY INVOKER on % tenant views', view_count;
END $$;
