-- =============================================================================
-- V168 — Tenant FK Batch 8: Expenses + Payments + Mileage + Overtime + Statutory (25 FKs)
-- =============================================================================
-- Cumulative after this batch: V157(22) + V158(23) + V161(25) + V162(23) +
-- V163(25) + V164(25) + V167(25) + V168(25) = 193 of ~208 legacy tables (~93%).
--
-- Idempotent DO-block pattern matches V157/V158/V161/V162/V163/V164/V167 — guarded
-- by information_schema lookups for both the constraint AND the table, so reruns
-- are safe and a missing table on a downstream branch does not abort the batch.
-- All FKs use ON DELETE CASCADE for clean tenant offboarding.
-- =============================================================================

-- Expense management -----------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'expense_categories' AND constraint_name = 'fk_expense_categories_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_categories') THEN
        ALTER TABLE expense_categories ADD CONSTRAINT fk_expense_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'expense_policies' AND constraint_name = 'fk_expense_policies_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_policies') THEN
        ALTER TABLE expense_policies ADD CONSTRAINT fk_expense_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'expense_items' AND constraint_name = 'fk_expense_items_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_items') THEN
        ALTER TABLE expense_items ADD CONSTRAINT fk_expense_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'expense_advances' AND constraint_name = 'fk_expense_advances_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_advances') THEN
        ALTER TABLE expense_advances ADD CONSTRAINT fk_expense_advances_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Payment gateway --------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payment_configs' AND constraint_name = 'fk_payment_configs_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_configs') THEN
        ALTER TABLE payment_configs ADD CONSTRAINT fk_payment_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payment_transactions' AND constraint_name = 'fk_payment_transactions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payment_batches' AND constraint_name = 'fk_payment_batches_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_batches') THEN
        ALTER TABLE payment_batches ADD CONSTRAINT fk_payment_batches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payment_batch_transactions' AND constraint_name = 'fk_payment_batch_transactions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_batch_transactions') THEN
        ALTER TABLE payment_batch_transactions ADD CONSTRAINT fk_payment_batch_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payment_refunds' AND constraint_name = 'fk_payment_refunds_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_refunds') THEN
        ALTER TABLE payment_refunds ADD CONSTRAINT fk_payment_refunds_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payment_webhooks' AND constraint_name = 'fk_payment_webhooks_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_webhooks') THEN
        ALTER TABLE payment_webhooks ADD CONSTRAINT fk_payment_webhooks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Mileage ----------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'mileage_policies' AND constraint_name = 'fk_mileage_policies_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_policies') THEN
        ALTER TABLE mileage_policies ADD CONSTRAINT fk_mileage_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'mileage_logs' AND constraint_name = 'fk_mileage_logs_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_logs') THEN
        ALTER TABLE mileage_logs ADD CONSTRAINT fk_mileage_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Comp-off + overtime ----------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comp_off_requests' AND constraint_name = 'fk_comp_off_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comp_off_requests') THEN
        ALTER TABLE comp_off_requests ADD CONSTRAINT fk_comp_off_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comp_time_balances' AND constraint_name = 'fk_comp_time_balances_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comp_time_balances') THEN
        ALTER TABLE comp_time_balances ADD CONSTRAINT fk_comp_time_balances_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comp_time_transactions' AND constraint_name = 'fk_comp_time_transactions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comp_time_transactions') THEN
        ALTER TABLE comp_time_transactions ADD CONSTRAINT fk_comp_time_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'overtime_policies' AND constraint_name = 'fk_overtime_policies_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_policies') THEN
        ALTER TABLE overtime_policies ADD CONSTRAINT fk_overtime_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'overtime_rate_tiers' AND constraint_name = 'fk_overtime_rate_tiers_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_rate_tiers') THEN
        ALTER TABLE overtime_rate_tiers ADD CONSTRAINT fk_overtime_rate_tiers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'overtime_requests' AND constraint_name = 'fk_overtime_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_requests') THEN
        ALTER TABLE overtime_requests ADD CONSTRAINT fk_overtime_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'overtime_records' AND constraint_name = 'fk_overtime_records_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_records') THEN
        ALTER TABLE overtime_records ADD CONSTRAINT fk_overtime_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Payroll adjustments + locations + components ---------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payroll_adjustments' AND constraint_name = 'fk_payroll_adjustments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_adjustments') THEN
        ALTER TABLE payroll_adjustments ADD CONSTRAINT fk_payroll_adjustments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payroll_components' AND constraint_name = 'fk_payroll_components_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_components') THEN
        ALTER TABLE payroll_components ADD CONSTRAINT fk_payroll_components_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payroll_locations' AND constraint_name = 'fk_payroll_locations_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_locations') THEN
        ALTER TABLE payroll_locations ADD CONSTRAINT fk_payroll_locations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Statutory (ESI/PF/Monthly) ---------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'employee_esi_records' AND constraint_name = 'fk_employee_esi_records_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_esi_records') THEN
        ALTER TABLE employee_esi_records ADD CONSTRAINT fk_employee_esi_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'employee_pf_records' AND constraint_name = 'fk_employee_pf_records_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_pf_records') THEN
        ALTER TABLE employee_pf_records ADD CONSTRAINT fk_employee_pf_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'monthly_statutory_contributions' AND constraint_name = 'fk_monthly_statutory_contributions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_statutory_contributions') THEN
        ALTER TABLE monthly_statutory_contributions ADD CONSTRAINT fk_monthly_statutory_contributions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
