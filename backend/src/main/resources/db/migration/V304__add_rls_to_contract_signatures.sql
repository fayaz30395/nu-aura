-- ============================================================================
-- V304: Add strict (fail-closed) Row-Level Security to contract_signatures
--
-- Context:
--   V302 added a native tenant_id column to contract_signatures (BE-03) and a
--   PERMISSIVE policy (contract_signatures_tenant_rls), but did NOT
--   ENABLE/FORCE ROW LEVEL SECURITY, nor add a RESTRICTIVE policy. RlsStartupProbe
--   (fail-on-bypass=true) rejects any tenant_id-bearing table that lacks
--   ENABLE + FORCE ROW LEVEL SECURITY + a restrictive app.current_tenant_id
--   policy -> the app crashes at boot:
--     "contract_signatures is missing a restrictive app.current_tenant_id policy".
--
-- This migration brings contract_signatures in line with the platform-wide
-- rls_ctx_required_<table> restrictive overlay pattern (V254/V303): RLS enabled
-- + forced + a RESTRICTIVE policy. tenant_id is NOT NULL on this table (V302
-- backfilled then enforced NOT NULL), so the policy requires a non-empty GUC and
-- an exact tenant match (no NULL escape). The pre-existing permissive policy from
-- V302 is left in place; PostgreSQL ANDs the restrictive policy on top.
-- ============================================================================

ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_ctx_required_contract_signatures ON contract_signatures;

CREATE POLICY rls_ctx_required_contract_signatures ON contract_signatures
    AS RESTRICTIVE FOR ALL
    USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );

ALTER TABLE contract_signatures FORCE ROW LEVEL SECURITY;
