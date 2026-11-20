-- =============================================================================
-- V356 - Restore tenant isolation on contract_versions
-- =============================================================================
--
-- V16 created contract_versions_isolation (rows visible only through a contract of
-- the current tenant). V24 replaced it with contract_versions_allow_all
-- (USING true / WITH CHECK true), so any nu_app_rls session could read and write
-- every tenant's contract version history (content JSONB = full contract terms).
-- Found by TenantIsolationRlsDatabaseTest.contractVersionsAreIsolatedThroughTheirContract.
--
-- contract_versions has no tenant_id; isolation is derived from the parent row.
-- contracts is itself under FORCE RLS (tenant_id = current_setting(...)), so the
-- EXISTS only finds contracts of the current tenant, and finds none when the GUC
-- is unset (fail closed). DDL only: no tenant-scoped data is written here.
-- =============================================================================

DROP POLICY IF EXISTS contract_versions_allow_all ON contract_versions;
DROP POLICY IF EXISTS contract_versions_tenant_via_contract ON contract_versions;

CREATE POLICY contract_versions_tenant_via_contract ON contract_versions
    AS PERMISSIVE FOR ALL
    USING (EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_versions.contract_id))
    WITH CHECK (EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_versions.contract_id));

ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions FORCE ROW LEVEL SECURITY;
