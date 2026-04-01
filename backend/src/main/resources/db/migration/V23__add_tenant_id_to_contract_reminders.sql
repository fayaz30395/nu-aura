-- BUG-010 FIX: contract_reminders was missing a tenant_id column.
-- Without it every reminder row was globally visible across all tenants,
-- and new reminders created via ContractReminderService had no tenant scope.
--
-- Migration steps:
--   1. Add tenant_id as nullable initially so existing rows don't violate NOT NULL.
--   2. Back-fill tenant_id from the parent contract row.
--   3. Tighten to NOT NULL once all rows are populated.
--   4. Add a FK reference and an index to support per-tenant queries.

-- Step 1: Add nullable column
ALTER TABLE contract_reminders
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Step 2: Back-fill from the parent contract
UPDATE contract_reminders cr
SET    tenant_id = c.tenant_id
FROM   contracts c
WHERE  c.id = cr.contract_id
  AND  cr.tenant_id IS NULL;

-- Step 3: Delete any orphaned reminders whose contract no longer exists
--         (avoids NOT NULL constraint failure on rows that can't be back-filled)
DELETE FROM contract_reminders
WHERE tenant_id IS NULL;

-- Step 4: Enforce NOT NULL
ALTER TABLE contract_reminders
    ALTER COLUMN tenant_id SET NOT NULL;

-- Step 5: Foreign key to tenants table
ALTER TABLE contract_reminders
    ADD CONSTRAINT fk_contract_reminders_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON DELETE CASCADE;

-- Step 6: Index for per-tenant queries
CREATE INDEX IF NOT EXISTS idx_contract_reminders_tenant_id
    ON contract_reminders (tenant_id);
