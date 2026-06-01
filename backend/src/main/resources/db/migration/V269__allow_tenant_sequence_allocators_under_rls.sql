-- V269: Allow tenant-scoped sequence allocator tables under fail-closed RLS.
--
-- V254/V255 add restrictive app.current_tenant_id policies to every tenant table.
-- PostgreSQL still requires at least one permissive policy for access, so these
-- allocator tables need an explicit tenant-match policy for INSERT/UPDATE.

DO $$
DECLARE
    tbl TEXT;
    policy_name TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'expense_claim_sequence',
        'mileage_claim_sequence',
        'employee_code_sequence'
    ]
    LOOP
        IF to_regclass('public.' || tbl) IS NULL THEN
            RAISE NOTICE 'V269: table public.% does not exist; skipping', tbl;
            CONTINUE;
        END IF;

        policy_name := tbl || '_tenant_match';

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
        EXECUTE format($policy$
            CREATE POLICY %I ON public.%I
                AS PERMISSIVE FOR ALL
                USING (
                    NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
                WITH CHECK (
                    NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
        $policy$, policy_name, tbl);
    END LOOP;
END $$;
