-- =============================================================================
-- V90: Corrective migration — fix RLS policy setting names, add FORCE RLS,
--      fix TIMESTAMP→TIMESTAMPTZ, add missing tenant_id and FK constraints
-- =============================================================================
-- The backend sets 'app.current_tenant_id' but several migrations created
-- RLS policies referencing 'app.current_tenant' or 'app.tenant_id'.
-- This migration drops the broken policies and recreates them correctly.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FIX RLS SETTING NAME MISMATCH (13 tables + 1 from V50)
-- ─────────────────────────────────────────────────────────────────────────────

-- V82: lwf_configurations — used 'app.current_tenant'
DROP
POLICY IF EXISTS lwf_configurations_tenant_isolation ON lwf_configurations;
CREATE
POLICY lwf_configurations_tenant_isolation ON lwf_configurations
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE lwf_configurations FORCE ROW LEVEL SECURITY;

-- V82: lwf_deductions — used 'app.current_tenant'
DROP
POLICY IF EXISTS lwf_deductions_tenant_isolation ON lwf_deductions;
CREATE
POLICY lwf_deductions_tenant_isolation ON lwf_deductions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE lwf_deductions FORCE ROW LEVEL SECURITY;

-- V85: restricted_holidays — used 'app.current_tenant'
DROP
POLICY IF EXISTS restricted_holidays_tenant_isolation ON restricted_holidays;
CREATE
POLICY restricted_holidays_tenant_isolation ON restricted_holidays
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE restricted_holidays FORCE ROW LEVEL SECURITY;

-- V85: restricted_holiday_selections — used 'app.current_tenant'
DROP
POLICY IF EXISTS restricted_holiday_selections_tenant_isolation ON restricted_holiday_selections;
CREATE
POLICY restricted_holiday_selections_tenant_isolation ON restricted_holiday_selections
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE restricted_holiday_selections FORCE ROW LEVEL SECURITY;

-- V85: restricted_holiday_policies — used 'app.current_tenant'
DROP
POLICY IF EXISTS restricted_holiday_policies_tenant_isolation ON restricted_holiday_policies;
CREATE
POLICY restricted_holiday_policies_tenant_isolation ON restricted_holiday_policies
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE restricted_holiday_policies FORCE ROW LEVEL SECURITY;

-- V86: biometric_devices — used 'app.current_tenant'
DROP
POLICY IF EXISTS biometric_devices_tenant_isolation ON biometric_devices;
CREATE
POLICY biometric_devices_tenant_isolation ON biometric_devices
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE biometric_devices FORCE ROW LEVEL SECURITY;

-- V86: biometric_punch_logs — used 'app.current_tenant'
DROP
POLICY IF EXISTS biometric_punch_logs_tenant_isolation ON biometric_punch_logs;
CREATE
POLICY biometric_punch_logs_tenant_isolation ON biometric_punch_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE biometric_punch_logs FORCE ROW LEVEL SECURITY;

-- V86: biometric_api_keys — used 'app.current_tenant'
DROP
POLICY IF EXISTS biometric_api_keys_tenant_isolation ON biometric_api_keys;
CREATE
POLICY biometric_api_keys_tenant_isolation ON biometric_api_keys
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE biometric_api_keys FORCE ROW LEVEL SECURITY;

-- V87: statutory_filing_templates — used 'app.current_tenant' (policy name: sft_tenant_isolation)
DROP
POLICY IF EXISTS sft_tenant_isolation ON statutory_filing_templates;
CREATE
POLICY statutory_filing_templates_tenant_isolation ON statutory_filing_templates
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE statutory_filing_templates FORCE ROW LEVEL SECURITY;

-- V87: statutory_filing_runs — used 'app.current_tenant' (policy name: sfr_tenant_isolation)
DROP
POLICY IF EXISTS sfr_tenant_isolation ON statutory_filing_runs;
CREATE
POLICY statutory_filing_runs_tenant_isolation ON statutory_filing_runs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE statutory_filing_runs FORCE ROW LEVEL SECURITY;

-- V88: expense_categories — used 'app.tenant_id'
DROP
POLICY IF EXISTS expense_categories_tenant_isolation ON expense_categories;
CREATE
POLICY expense_categories_tenant_isolation ON expense_categories
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE expense_categories FORCE ROW LEVEL SECURITY;

-- V88: expense_policies — used 'app.tenant_id'
DROP
POLICY IF EXISTS expense_policies_tenant_isolation ON expense_policies;
CREATE
POLICY expense_policies_tenant_isolation ON expense_policies
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE expense_policies FORCE ROW LEVEL SECURITY;

-- V88: expense_advances — used 'app.tenant_id'
DROP
POLICY IF EXISTS expense_advances_tenant_isolation ON expense_advances;
CREATE
POLICY expense_advances_tenant_isolation ON expense_advances
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE expense_advances FORCE ROW LEVEL SECURITY;

-- V50: payroll_components — used 'app.current_tenant'
DROP
POLICY IF EXISTS payroll_components_tenant_isolation ON payroll_components;
CREATE
POLICY payroll_components_tenant_isolation ON payroll_components
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE payroll_components FORCE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. V89 SHIFT TABLES: RLS enabled but ZERO policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE
POLICY shift_patterns_tenant_isolation ON shift_patterns
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE shift_patterns FORCE ROW LEVEL SECURITY;

CREATE
POLICY rosters_tenant_isolation ON rosters
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE rosters FORCE ROW LEVEL SECURITY;

CREATE
POLICY roster_entries_tenant_isolation ON roster_entries
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE roster_entries FORCE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FORCE ROW LEVEL SECURITY on V84 table (saml_identity_providers)
--    V82-V89 tables already handled above; ensure V84 is covered
-- ─────────────────────────────────────────────────────────────────────────────

DO
$$
BEGIN
    IF
EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saml_identity_providers') THEN
        EXECUTE 'ALTER TABLE saml_identity_providers FORCE ROW LEVEL SECURITY';
END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FIX TIMESTAMP → TIMESTAMPTZ for V82-V89 tables
-- ─────────────────────────────────────────────────────────────────────────────

-- V82: lwf_configurations
ALTER TABLE lwf_configurations ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE lwf_configurations ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- V82: lwf_deductions
ALTER TABLE lwf_deductions ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE lwf_deductions ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- V85: restricted_holidays
ALTER TABLE restricted_holidays ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;
ALTER TABLE restricted_holidays ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE restricted_holidays ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- V85: restricted_holiday_selections
ALTER TABLE restricted_holiday_selections ALTER COLUMN approved_at TYPE TIMESTAMPTZ;
ALTER TABLE restricted_holiday_selections ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;
ALTER TABLE restricted_holiday_selections ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE restricted_holiday_selections ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- V85: restricted_holiday_policies
ALTER TABLE restricted_holiday_policies ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;
ALTER TABLE restricted_holiday_policies ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE restricted_holiday_policies ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- V86: biometric_devices
ALTER TABLE biometric_devices ALTER COLUMN last_sync_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_devices ALTER COLUMN last_heartbeat_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_devices ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_devices ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_devices ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V86: biometric_punch_logs
ALTER TABLE biometric_punch_logs ALTER COLUMN punch_time TYPE TIMESTAMPTZ;
ALTER TABLE biometric_punch_logs ALTER COLUMN processed_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_punch_logs ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_punch_logs ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_punch_logs ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V86: biometric_api_keys
ALTER TABLE biometric_api_keys ALTER COLUMN expires_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_api_keys ALTER COLUMN last_used_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_api_keys ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_api_keys ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE biometric_api_keys ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V87: statutory_filing_templates
ALTER TABLE statutory_filing_templates ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE statutory_filing_templates ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE statutory_filing_templates ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V87: statutory_filing_runs
ALTER TABLE statutory_filing_runs ALTER COLUMN generated_at TYPE TIMESTAMPTZ;
ALTER TABLE statutory_filing_runs ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;
ALTER TABLE statutory_filing_runs ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE statutory_filing_runs ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE statutory_filing_runs ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V88: expense_categories
ALTER TABLE expense_categories ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_categories ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_categories ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V88: expense_policies
ALTER TABLE expense_policies ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_policies ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_policies ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V88: expense_items
ALTER TABLE expense_items ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_items ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_items ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V88: expense_advances
ALTER TABLE expense_advances ALTER COLUMN requested_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_advances ALTER COLUMN approved_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_advances ALTER COLUMN disbursed_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_advances ALTER COLUMN settled_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_advances ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_advances ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE expense_advances ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V89: shift_patterns
ALTER TABLE shift_patterns ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE shift_patterns ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE shift_patterns ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V89: rosters
ALTER TABLE rosters ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE rosters ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE rosters ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;

-- V89: roster_entries
ALTER TABLE roster_entries ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE roster_entries ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE roster_entries ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ADD tenant_id TO expense_items (missing — no tenant isolation)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE expense_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill tenant_id from parent expense_claims
UPDATE expense_items
SET tenant_id = (SELECT ec.tenant_id
                 FROM expense_claims ec
                 WHERE ec.id = expense_items.expense_claim_id)
WHERE expense_items.tenant_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE expense_items
  ALTER COLUMN tenant_id SET NOT NULL;

-- Enable RLS + create policy
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
CREATE
POLICY expense_items_tenant_isolation ON expense_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE expense_items FORCE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ADD MISSING FK CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- restricted_holiday_selections.employee_id → employees(id)
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_rhs_employee' AND table_name = 'restricted_holiday_selections'
    ) THEN
ALTER TABLE restricted_holiday_selections
  ADD CONSTRAINT fk_rhs_employee FOREIGN KEY (employee_id) REFERENCES employees (id);
END IF;
END $$;

-- expense_advances.employee_id → employees(id)
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_expense_advance_employee' AND table_name = 'expense_advances'
    ) THEN
ALTER TABLE expense_advances
  ADD CONSTRAINT fk_expense_advance_employee FOREIGN KEY (employee_id) REFERENCES employees (id);
END IF;
END $$;

-- roster_entries.employee_id → employees(id)
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_roster_entry_employee' AND table_name = 'roster_entries'
    ) THEN
ALTER TABLE roster_entries
  ADD CONSTRAINT fk_roster_entry_employee FOREIGN KEY (employee_id) REFERENCES employees (id);
END IF;
END $$;

-- roster_entries.shift_id → shifts(id)
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_roster_entry_shift' AND table_name = 'roster_entries'
    ) THEN
ALTER TABLE roster_entries
  ADD CONSTRAINT fk_roster_entry_shift FOREIGN KEY (shift_id) REFERENCES shifts (id);
END IF;
END $$;
