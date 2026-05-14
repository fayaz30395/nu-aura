-- =============================================================================
-- V167 — Tenant FK Batch 7: Contracts + Exit + Probation + Projects + PSA (25 FKs)
-- =============================================================================
-- Cumulative after this batch: V157(22) + V158(23) + V161(25) + V162(23) +
-- V163(25) + V164(25) + V167(25) = 168 of ~208 legacy tables (~81%).
--
-- Idempotent DO-block pattern matches V157/V158/V161/V162/V163/V164 — guarded by
-- information_schema lookups for both the constraint AND the table, so reruns
-- are safe and a missing table on a downstream branch does not abort the batch.
-- All FKs use ON DELETE CASCADE for clean tenant offboarding.
-- =============================================================================

-- Contract management ----------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'contracts' AND constraint_name = 'fk_contracts_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
ALTER TABLE contracts
  ADD CONSTRAINT fk_contracts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'contract_versions' AND constraint_name = 'fk_contract_versions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_versions')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contract_versions' AND column_name = 'tenant_id') THEN
ALTER TABLE contract_versions
  ADD CONSTRAINT fk_contract_versions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'contract_signatures' AND constraint_name = 'fk_contract_signatures_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_signatures')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contract_signatures' AND column_name = 'tenant_id') THEN
ALTER TABLE contract_signatures
  ADD CONSTRAINT fk_contract_signatures_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'contract_templates' AND constraint_name = 'fk_contract_templates_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_templates') THEN
ALTER TABLE contract_templates
  ADD CONSTRAINT fk_contract_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'contract_reminders' AND constraint_name = 'fk_contract_reminders_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_reminders') THEN
ALTER TABLE contract_reminders
  ADD CONSTRAINT fk_contract_reminders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'contract_lifecycle_config' AND constraint_name = 'fk_contract_lifecycle_config_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_lifecycle_config') THEN
ALTER TABLE contract_lifecycle_config
  ADD CONSTRAINT fk_contract_lifecycle_config_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Exit + F&F -------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'exit_interviews' AND constraint_name = 'fk_exit_interviews_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exit_interviews') THEN
ALTER TABLE exit_interviews
  ADD CONSTRAINT fk_exit_interviews_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'exit_clearances' AND constraint_name = 'fk_exit_clearances_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exit_clearances') THEN
ALTER TABLE exit_clearances
  ADD CONSTRAINT fk_exit_clearances_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'exit_processes' AND constraint_name = 'fk_exit_processes_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exit_processes') THEN
ALTER TABLE exit_processes
  ADD CONSTRAINT fk_exit_processes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'full_and_final_settlements' AND constraint_name = 'fk_full_and_final_settlements_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'full_and_final_settlements') THEN
ALTER TABLE full_and_final_settlements
  ADD CONSTRAINT fk_full_and_final_settlements_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Employment lifecycle ---------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'employment_change_requests' AND constraint_name = 'fk_employment_change_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employment_change_requests') THEN
ALTER TABLE employment_change_requests
  ADD CONSTRAINT fk_employment_change_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'profile_update_requests' AND constraint_name = 'fk_profile_update_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_update_requests') THEN
ALTER TABLE profile_update_requests
  ADD CONSTRAINT fk_profile_update_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'employee_profile_update_requests' AND constraint_name = 'fk_employee_profile_update_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_profile_update_requests') THEN
ALTER TABLE employee_profile_update_requests
  ADD CONSTRAINT fk_employee_profile_update_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'probation_periods' AND constraint_name = 'fk_probation_periods_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'probation_periods') THEN
ALTER TABLE probation_periods
  ADD CONSTRAINT fk_probation_periods_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'probation_evaluations' AND constraint_name = 'fk_probation_evaluations_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'probation_evaluations') THEN
ALTER TABLE probation_evaluations
  ADD CONSTRAINT fk_probation_evaluations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Assets continued -------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'asset_recoveries' AND constraint_name = 'fk_asset_recoveries_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_recoveries') THEN
ALTER TABLE asset_recoveries
  ADD CONSTRAINT fk_asset_recoveries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'asset_maintenance_requests' AND constraint_name = 'fk_asset_maintenance_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_maintenance_requests') THEN
ALTER TABLE asset_maintenance_requests
  ADD CONSTRAINT fk_asset_maintenance_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Projects ---------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'projects' AND constraint_name = 'fk_projects_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'project_employees' AND constraint_name = 'fk_project_employees_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_employees' AND table_type = 'BASE TABLE') THEN
ALTER TABLE project_employees
  ADD CONSTRAINT fk_project_employees_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'project_members' AND constraint_name = 'fk_project_members_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_members') THEN
ALTER TABLE project_members
  ADD CONSTRAINT fk_project_members_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'project_time_entries' AND constraint_name = 'fk_project_time_entries_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_time_entries') THEN
ALTER TABLE project_time_entries
  ADD CONSTRAINT fk_project_time_entries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- PSA (Professional Services Automation) ---------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'psa_projects' AND constraint_name = 'fk_psa_projects_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'psa_projects') THEN
ALTER TABLE psa_projects
  ADD CONSTRAINT fk_psa_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'psa_project_allocations' AND constraint_name = 'fk_psa_project_allocations_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'psa_project_allocations') THEN
ALTER TABLE psa_project_allocations
  ADD CONSTRAINT fk_psa_project_allocations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'psa_timesheets' AND constraint_name = 'fk_psa_timesheets_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'psa_timesheets') THEN
ALTER TABLE psa_timesheets
  ADD CONSTRAINT fk_psa_timesheets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'psa_time_entries' AND constraint_name = 'fk_psa_time_entries_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'psa_time_entries') THEN
ALTER TABLE psa_time_entries
  ADD CONSTRAINT fk_psa_time_entries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'psa_invoices' AND constraint_name = 'fk_psa_invoices_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'psa_invoices') THEN
ALTER TABLE psa_invoices
  ADD CONSTRAINT fk_psa_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
