-- =====================================================================
-- V52: Contract Lifecycle Automation
-- Adds: unique constraint for idempotent reminders, per-tenant config,
-- and indexes for the daily scheduler job.
-- =====================================================================

-- 1. Unique constraint on contract_reminders to prevent duplicate
--    reminders for the same contract + type + date combination.
--    This is the primary idempotency guard for the scheduler.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_reminders_dedup
    ON contract_reminders (contract_id, reminder_type, reminder_date)
    WHERE is_completed = false;

-- 2. Per-tenant contract lifecycle configuration table.
--    Controls reminder windows and auto-expiry behavior.
CREATE TABLE IF NOT EXISTS contract_lifecycle_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    -- Comma-separated days-before-expiry when reminders are generated (e.g., 30,15,7)
    reminder_days_before_expiry VARCHAR(100) NOT NULL DEFAULT '30,15,7',
    -- Whether to automatically expire contracts past their end date
    auto_expire_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    -- Whether to automatically renew auto-renewable contracts
    auto_renew_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_lifecycle_config_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Note: no separate index on tenant_id — the UNIQUE constraint already creates one.

-- RLS for contract_lifecycle_config
ALTER TABLE contract_lifecycle_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_lifecycle_config_tenant_isolation ON contract_lifecycle_config
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 3. Composite index on contracts for the scheduler's daily expiry scan.
--    Covers: active contracts with an end_date, scoped by tenant.
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status_enddate
    ON contracts (tenant_id, status, end_date)
    WHERE status = 'ACTIVE' AND end_date IS NOT NULL AND is_deleted = false;

-- 4. Index on contract_reminders for the scheduler's dedup lookups.
CREATE INDEX IF NOT EXISTS idx_contract_reminders_tenant_pending
    ON contract_reminders (tenant_id, is_completed)
    WHERE is_completed = false;
