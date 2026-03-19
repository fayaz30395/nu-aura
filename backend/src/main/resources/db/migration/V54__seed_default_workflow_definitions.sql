-- ============================================================================
-- V54: Seed default workflow definitions for all 7 approval entity types
-- ============================================================================
-- Seeds default SEQUENTIAL workflows for: LEAVE_REQUEST, EXPENSE_CLAIM,
-- ASSET_REQUEST, TRAVEL_REQUEST, LOAN_REQUEST, ONBOARDING, TIMESHEET.
-- Scoped to NuLogic tenant (660e8400-e29b-41d4-a716-446655440001).
-- Each workflow gets its approval steps inserted into approval_steps.
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID := '660e8400-e29b-41d4-a716-446655440001';
    v_leave_wf_id UUID;
    v_expense_wf_id UUID;
    v_asset_wf_id UUID;
    v_travel_wf_id UUID;
    v_loan_wf_id UUID;
    v_onboarding_wf_id UUID;
    v_timesheet_wf_id UUID;
BEGIN

    -- ========== LEAVE_REQUEST: Employee -> Reporting Manager (1 step) ==========
    v_leave_wf_id := gen_random_uuid();
    INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version, is_active, is_default)
    VALUES (v_leave_wf_id, v_tenant_id, 'Default Leave Approval', 'LEAVE_REQUEST', 'SEQUENTIAL', 1, TRUE, TRUE);

    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_leave_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER');

    -- ========== EXPENSE_CLAIM: Employee -> Reporting Manager -> Finance Head (2 steps) ==========
    v_expense_wf_id := gen_random_uuid();
    INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version, is_active, is_default)
    VALUES (v_expense_wf_id, v_tenant_id, 'Default Expense Approval', 'EXPENSE_CLAIM', 'SEQUENTIAL', 1, TRUE, TRUE);

    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_expense_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER');
    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_expense_wf_id, 2, 'Finance Head Approval', 'FINANCE_MANAGER');

    -- ========== ASSET_REQUEST: Employee -> Reporting Manager -> IT Admin (2 steps) ==========
    -- IT Admin is resolved by role code; using ROLE approver type with role_name for matching
    v_asset_wf_id := gen_random_uuid();
    INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version, is_active, is_default)
    VALUES (v_asset_wf_id, v_tenant_id, 'Default Asset Request Approval', 'ASSET_REQUEST', 'SEQUENTIAL', 1, TRUE, TRUE);

    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_asset_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER');
    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type, role_name)
    VALUES (gen_random_uuid(), v_tenant_id, v_asset_wf_id, 2, 'IT Admin Approval', 'ANY_OF_ROLE', 'IT_ADMIN');

    -- ========== TRAVEL_REQUEST: Employee -> Reporting Manager (1 step) ==========
    v_travel_wf_id := gen_random_uuid();
    INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version, is_active, is_default)
    VALUES (v_travel_wf_id, v_tenant_id, 'Default Travel Approval', 'TRAVEL_REQUEST', 'SEQUENTIAL', 1, TRUE, TRUE);

    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_travel_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER');

    -- ========== LOAN_REQUEST: Employee -> Reporting Manager -> Finance Head (2 steps) ==========
    v_loan_wf_id := gen_random_uuid();
    INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version, is_active, is_default)
    VALUES (v_loan_wf_id, v_tenant_id, 'Default Loan Approval', 'LOAN_REQUEST', 'SEQUENTIAL', 1, TRUE, TRUE);

    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_loan_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER');
    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_loan_wf_id, 2, 'Finance Head Approval', 'FINANCE_MANAGER');

    -- ========== ONBOARDING: HR -> Department Head (1 step) ==========
    v_onboarding_wf_id := gen_random_uuid();
    INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version, is_active, is_default)
    VALUES (v_onboarding_wf_id, v_tenant_id, 'Default Onboarding Approval', 'ONBOARDING', 'SEQUENTIAL', 1, TRUE, TRUE);

    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_onboarding_wf_id, 1, 'Department Head Approval', 'DEPARTMENT_HEAD');

    -- ========== TIMESHEET: Employee -> Project Manager (1 step per project) ==========
    -- The workflow engine starts one execution per project; the PM is resolved at runtime
    -- via SPECIFIC_USER (set dynamically by the service) or REPORTING_MANAGER fallback.
    v_timesheet_wf_id := gen_random_uuid();
    INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version, is_active, is_default)
    VALUES (v_timesheet_wf_id, v_tenant_id, 'Default Timesheet Approval', 'TIMESHEET', 'SEQUENTIAL', 1, TRUE, TRUE);

    INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type)
    VALUES (gen_random_uuid(), v_tenant_id, v_timesheet_wf_id, 1, 'Project Manager Approval', 'REPORTING_MANAGER');

    RAISE NOTICE 'Seeded 7 default workflow definitions with approval steps for tenant %', v_tenant_id;

END $$;
