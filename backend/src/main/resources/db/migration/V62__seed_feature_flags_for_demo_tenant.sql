-- V62: Seed feature flags for the NuLogic demo tenant
-- BUG-011 FIX: CompensationController requires @RequiresFeature(FeatureFlag.ENABLE_PAYROLL)
-- but no feature_flags rows existed for the demo tenant, causing 403 even for SuperAdmin
-- (before FeatureFlagAspect SuperAdmin bypass was added in the Java fix).

-- NuLogic demo tenant
DO $$
DECLARE
    v_tenant_id UUID := '660e8400-e29b-41d4-a716-446655440001';
BEGIN
    -- Enable core feature flags for the demo tenant
    INSERT INTO feature_flags (id, tenant_id, feature_key, feature_name, description, enabled, category, created_at, updated_at, version, is_deleted)
    VALUES
        (gen_random_uuid(), v_tenant_id, 'enable_payroll', 'Payroll', 'Enable payroll processing', true, 'HRMS', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_leave', 'Leave Management', 'Enable leave management module', true, 'HRMS', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_attendance', 'Attendance', 'Enable attendance tracking', true, 'HRMS', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_performance', 'Performance', 'Enable performance reviews', true, 'GROW', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_recruitment', 'Recruitment', 'Enable recruitment module', true, 'HIRE', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_expenses', 'Expenses', 'Enable expense management', true, 'HRMS', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_loans', 'Loans', 'Enable loan management', true, 'HRMS', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_compensation', 'Compensation', 'Enable compensation management', true, 'HRMS', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_assets', 'Assets', 'Enable asset management', true, 'HRMS', NOW(), NOW(), 0, false),
        (gen_random_uuid(), v_tenant_id, 'enable_documents', 'Documents', 'Enable document management', true, 'HRMS', NOW(), NOW(), 0, false)
    ON CONFLICT DO NOTHING;
END $$;
