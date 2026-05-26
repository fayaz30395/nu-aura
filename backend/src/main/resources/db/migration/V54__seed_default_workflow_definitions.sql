-- ============================================================================
-- V54: Seed default workflow definitions for all 7 approval entity types
-- ============================================================================
-- Seeds default SEQUENTIAL workflows for: LEAVE_REQUEST, EXPENSE_CLAIM,
-- ASSET_REQUEST, TRAVEL_REQUEST, LOAN_REQUEST, ONBOARDING, TIMESHEET.
-- Scoped to NuLogic tenant (660e8400-e29b-41d4-a716-446655440001).
-- Each workflow gets its approval steps inserted into approval_steps.
-- ============================================================================

ALTER TABLE workflow_definitions
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS location_id UUID,
  ADD COLUMN IF NOT EXISTS applicable_grades VARCHAR(255),
  ADD COLUMN IF NOT EXISTS min_amount NUMERIC(19, 2),
  ADD COLUMN IF NOT EXISTS max_amount NUMERIC(19, 2),
  ADD COLUMN IF NOT EXISTS default_sla_hours INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalation_after_hours INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notify_on_submission BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_on_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_on_rejection BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_on_escalation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_parallel_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_approve_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_approve_condition TEXT,
  ADD COLUMN IF NOT EXISTS skip_level_allowed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE approval_steps
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS specific_user_id UUID,
  ADD COLUMN IF NOT EXISTS role_id UUID,
  ADD COLUMN IF NOT EXISTS role_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approver_expression TEXT,
  ADD COLUMN IF NOT EXISTS min_approvals INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS sla_hours INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalate_after_hours INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalate_to_user_id UUID,
  ADD COLUMN IF NOT EXISTS escalate_to_role_id UUID,
  ADD COLUMN IF NOT EXISTS auto_approve_on_timeout BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_reject_on_timeout BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_template TEXT,
  ADD COLUMN IF NOT EXISTS reminder_template TEXT,
  ADD COLUMN IF NOT EXISTS escalation_template TEXT,
  ADD COLUMN IF NOT EXISTS delegation_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS comments_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attachments_allowed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE step_executions
  ADD COLUMN IF NOT EXISTS step_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_to_user_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alternative_approvers TEXT,
  ADD COLUMN IF NOT EXISTS action_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS action_by_user_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delegated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delegated_from_user_id UUID,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_to_user_id UUID,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_taken_hours DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS action_device_info VARCHAR(255),
  ADD COLUMN IF NOT EXISTS action_ip_address VARCHAR(255);

DO
$$
DECLARE
v_tenant_id UUID := '660e8400-e29b-41d4-a716-446655440001';
    v_now
TIMESTAMP := NOW();
    v_leave_wf_id
UUID;
    v_expense_wf_id
UUID;
    v_asset_wf_id
UUID;
    v_travel_wf_id
UUID;
    v_loan_wf_id
UUID;
    v_onboarding_wf_id
UUID;
    v_timesheet_wf_id
UUID;
BEGIN

    -- ========== LEAVE_REQUEST: Employee -> Reporting Manager (1 step) ==========
    v_leave_wf_id
:= gen_random_uuid();
INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                  is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
                                  default_sla_hours, escalation_after_hours, escalation_enabled,
                                  notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
                                  skip_level_allowed, created_at, updated_at)
VALUES (v_leave_wf_id, v_tenant_id, 'Default Leave Approval', 'LEAVE_REQUEST', 'SEQUENTIAL', 1,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        48, 72, FALSE,
        TRUE, FALSE, TRUE, TRUE,
        FALSE, v_now, v_now);

INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_leave_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE,
        FALSE, TRUE, 72, FALSE, 1,
        FALSE, 1, 48);

-- ========== EXPENSE_CLAIM: Employee -> Reporting Manager -> Finance Head (2 steps) ==========
v_expense_wf_id
:= gen_random_uuid();
INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                  is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
                                  default_sla_hours, escalation_after_hours, escalation_enabled,
                                  notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
                                  skip_level_allowed, created_at, updated_at)
VALUES (v_expense_wf_id, v_tenant_id, 'Default Expense Approval', 'EXPENSE_CLAIM', 'SEQUENTIAL', 1,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        48, 72, FALSE,
        TRUE, FALSE, TRUE, TRUE,
        FALSE, v_now, v_now);

INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_expense_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);
INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_expense_wf_id, 2, 'Finance Head Approval', 'FINANCE_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);

-- ========== ASSET_REQUEST: Employee -> Reporting Manager -> IT Admin (2 steps) ==========
v_asset_wf_id
:= gen_random_uuid();
INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                  is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
                                  default_sla_hours, escalation_after_hours, escalation_enabled,
                                  notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
                                  skip_level_allowed, created_at, updated_at)
VALUES (v_asset_wf_id, v_tenant_id, 'Default Asset Request Approval', 'ASSET_REQUEST', 'SEQUENTIAL', 1,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        48, 72, FALSE,
        TRUE, FALSE, TRUE, TRUE,
        FALSE, v_now, v_now);

INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_asset_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);
INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type, role_name,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_asset_wf_id, 2, 'IT Admin Approval', 'ANY_OF_ROLE', 'IT_ADMIN',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);

-- ========== TRAVEL_REQUEST: Employee -> Reporting Manager (1 step) ==========
v_travel_wf_id
:= gen_random_uuid();
INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                  is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
                                  default_sla_hours, escalation_after_hours, escalation_enabled,
                                  notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
                                  skip_level_allowed, created_at, updated_at)
VALUES (v_travel_wf_id, v_tenant_id, 'Default Travel Approval', 'TRAVEL_REQUEST', 'SEQUENTIAL', 1,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        48, 72, FALSE,
        TRUE, FALSE, TRUE, TRUE,
        FALSE, v_now, v_now);

INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_travel_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);

-- ========== LOAN_REQUEST: Employee -> Reporting Manager -> Finance Head (2 steps) ==========
v_loan_wf_id
:= gen_random_uuid();
INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                  is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
                                  default_sla_hours, escalation_after_hours, escalation_enabled,
                                  notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
                                  skip_level_allowed, created_at, updated_at)
VALUES (v_loan_wf_id, v_tenant_id, 'Default Loan Approval', 'LOAN_REQUEST', 'SEQUENTIAL', 1,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        48, 72, FALSE,
        TRUE, FALSE, TRUE, TRUE,
        FALSE, v_now, v_now);

INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_loan_wf_id, 1, 'Manager Approval', 'REPORTING_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);
INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_loan_wf_id, 2, 'Finance Head Approval', 'FINANCE_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);

-- ========== ONBOARDING: HR -> Department Head (1 step) ==========
v_onboarding_wf_id
:= gen_random_uuid();
INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                  is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
                                  default_sla_hours, escalation_after_hours, escalation_enabled,
                                  notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
                                  skip_level_allowed, created_at, updated_at)
VALUES (v_onboarding_wf_id, v_tenant_id, 'Default Onboarding Approval', 'ONBOARDING', 'SEQUENTIAL', 1,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        48, 72, FALSE,
        TRUE, FALSE, TRUE, TRUE,
        FALSE, v_now, v_now);

INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_onboarding_wf_id, 1, 'Department Head Approval', 'DEPARTMENT_HEAD',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);

-- ========== TIMESHEET: Employee -> Project Manager (1 step per project) ==========
v_timesheet_wf_id
:= gen_random_uuid();
INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                  is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
                                  default_sla_hours, escalation_after_hours, escalation_enabled,
                                  notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
                                  skip_level_allowed, created_at, updated_at)
VALUES (v_timesheet_wf_id, v_tenant_id, 'Default Timesheet Approval', 'TIMESHEET', 'SEQUENTIAL', 1,
        TRUE, TRUE, FALSE, FALSE, FALSE,
        48, 72, FALSE,
        TRUE, FALSE, TRUE, TRUE,
        FALSE, v_now, v_now);

INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
                            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout,
                            auto_reject_on_timeout,
                            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled,
                            hierarchy_level,
                            is_optional, min_approvals, sla_hours)
VALUES (gen_random_uuid(), v_tenant_id, v_timesheet_wf_id, 1, 'Project Manager Approval', 'REPORTING_MANAGER',
        FALSE, v_now, v_now, FALSE, FALSE, FALSE, FALSE, TRUE, 72, FALSE, 1, FALSE, 1, 48);

RAISE
NOTICE 'Seeded 7 default workflow definitions with approval steps for tenant %', v_tenant_id;

END $$;
