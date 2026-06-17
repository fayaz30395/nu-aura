-- BE-03: Add tenant_id to contract_signatures for direct tenant isolation.
-- Previously, RLS on contract_signatures relied on a sub-select JOIN through contracts,
-- which is fragile and prevents direct tenant-scoped queries.
-- This migration adds a native tenant_id column backfilled from the parent contract.

-- 1. Add tenant_id column (nullable first to allow backfill)
ALTER TABLE contract_signatures
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 2. Backfill from parent contract
UPDATE contract_signatures cs
SET tenant_id = c.tenant_id
FROM contracts c
WHERE cs.contract_id = c.id
  AND cs.tenant_id IS NULL;

-- 3. Enforce NOT NULL after backfill
ALTER TABLE contract_signatures
    ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Add FK constraint to tenants (guarded: only add if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'contract_signatures'
          AND constraint_name = 'fk_contract_signatures_tenant'
    ) THEN
        ALTER TABLE contract_signatures
            ADD CONSTRAINT fk_contract_signatures_tenant
                FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
    END IF;
END
$$;

-- 5. Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_contract_signatures_tenant_id
    ON contract_signatures (tenant_id);

-- 6. Composite index for the common query pattern: tenant + contract
CREATE INDEX IF NOT EXISTS idx_contract_signatures_tenant_contract
    ON contract_signatures (tenant_id, contract_id);

-- 7. Replace the indirect RLS policy with a direct tenant_id check
DROP POLICY IF EXISTS contract_signatures_isolation ON contract_signatures;

CREATE POLICY contract_signatures_tenant_rls ON contract_signatures
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
