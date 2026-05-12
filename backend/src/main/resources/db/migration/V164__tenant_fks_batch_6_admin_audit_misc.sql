-- =============================================================================
-- V164 — Tenant FK Batch 6: Admin + Audit + RBAC + Compliance + Misc (25 FKs)
-- =============================================================================
-- Cumulative after this batch: V157(22) + V158(23) + V161(25) + V162(23) +
-- V163(25) + V164(25) = 143 of ~208 legacy tables (~69%).
--
-- Intentional exclusions:
--   - dsr_requests — V153 explicitly leaves it unlinked to preserve GDPR audit
--     trail across tenant deletion.
--   - saml_identity_providers — already has fk_saml_idp_tenant inline (V84).
--   - implicit_role_rules / implicit_user_roles — already have inline FKs (V63).
--   - user_roles / user_app_roles / app_role_permissions — join tables without
--     their own tenant_id.
--
-- Idempotent DO-block pattern with information_schema guards; ON DELETE CASCADE.
-- =============================================================================

-- Audit ------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'audit_logs' AND constraint_name = 'fk_audit_logs_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'compliance_audit_logs' AND constraint_name = 'fk_compliance_audit_logs_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_audit_logs') THEN
ALTER TABLE compliance_audit_logs
  ADD CONSTRAINT fk_compliance_audit_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- RBAC core --------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'roles' AND constraint_name = 'fk_roles_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
ALTER TABLE roles
  ADD CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'role_permissions' AND constraint_name = 'fk_role_permissions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
ALTER TABLE role_permissions
  ADD CONSTRAINT fk_role_permissions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'permissions' AND constraint_name = 'fk_permissions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
ALTER TABLE permissions
  ADD CONSTRAINT fk_permissions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Bundle-app RBAC --------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'app_roles' AND constraint_name = 'fk_app_roles_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_roles') THEN
ALTER TABLE app_roles
  ADD CONSTRAINT fk_app_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'app_permissions' AND constraint_name = 'fk_app_permissions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_permissions') THEN
ALTER TABLE app_permissions
  ADD CONSTRAINT fk_app_permissions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'user_app_access' AND constraint_name = 'fk_user_app_access_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_app_access') THEN
ALTER TABLE user_app_access
  ADD CONSTRAINT fk_user_app_access_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Auth -------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'password_history' AND constraint_name = 'fk_password_history_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_history') THEN
ALTER TABLE password_history
  ADD CONSTRAINT fk_password_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'biometric_api_keys' AND constraint_name = 'fk_biometric_api_keys_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biometric_api_keys') THEN
ALTER TABLE biometric_api_keys
  ADD CONSTRAINT fk_biometric_api_keys_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Tenant config ----------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'feature_flags' AND constraint_name = 'fk_feature_flags_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
ALTER TABLE feature_flags
  ADD CONSTRAINT fk_feature_flags_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'tenant_applications' AND constraint_name = 'fk_tenant_applications_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_applications') THEN
ALTER TABLE tenant_applications
  ADD CONSTRAINT fk_tenant_applications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'exchange_rates' AND constraint_name = 'fk_exchange_rates_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exchange_rates') THEN
ALTER TABLE exchange_rates
  ADD CONSTRAINT fk_exchange_rates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Compliance -------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'compliance_policies' AND constraint_name = 'fk_compliance_policies_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_policies') THEN
ALTER TABLE compliance_policies
  ADD CONSTRAINT fk_compliance_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'compliance_checklists' AND constraint_name = 'fk_compliance_checklists_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_checklists') THEN
ALTER TABLE compliance_checklists
  ADD CONSTRAINT fk_compliance_checklists_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'compliance_alerts' AND constraint_name = 'fk_compliance_alerts_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_alerts') THEN
ALTER TABLE compliance_alerts
  ADD CONSTRAINT fk_compliance_alerts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'policy_acknowledgments' AND constraint_name = 'fk_policy_acknowledgments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'policy_acknowledgments') THEN
ALTER TABLE policy_acknowledgments
  ADD CONSTRAINT fk_policy_acknowledgments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Approvals --------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'approval_steps' AND constraint_name = 'fk_approval_steps_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_steps') THEN
ALTER TABLE approval_steps
  ADD CONSTRAINT fk_approval_steps_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'approval_delegates' AND constraint_name = 'fk_approval_delegates_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_delegates') THEN
ALTER TABLE approval_delegates
  ADD CONSTRAINT fk_approval_delegates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'signature_requests' AND constraint_name = 'fk_signature_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_requests') THEN
ALTER TABLE signature_requests
  ADD CONSTRAINT fk_signature_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'signature_approvals' AND constraint_name = 'fk_signature_approvals_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_approvals') THEN
ALTER TABLE signature_approvals
  ADD CONSTRAINT fk_signature_approvals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Custom fields ----------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'custom_field_definitions' AND constraint_name = 'fk_custom_field_definitions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_field_definitions') THEN
ALTER TABLE custom_field_definitions
  ADD CONSTRAINT fk_custom_field_definitions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'custom_field_values' AND constraint_name = 'fk_custom_field_values_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_field_values') THEN
ALTER TABLE custom_field_values
  ADD CONSTRAINT fk_custom_field_values_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'custom_scope_targets' AND constraint_name = 'fk_custom_scope_targets_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_scope_targets') THEN
ALTER TABLE custom_scope_targets
  ADD CONSTRAINT fk_custom_scope_targets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- BGV --------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'background_verifications' AND constraint_name = 'fk_background_verifications_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'background_verifications') THEN
ALTER TABLE background_verifications
  ADD CONSTRAINT fk_background_verifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
