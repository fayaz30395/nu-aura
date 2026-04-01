-- ============================================================================
-- V95: Add PERFORMANCE_REVIEW workflow definition
-- ============================================================================
-- The V54 migration seeded 7 workflow definitions but missed PERFORMANCE_REVIEW.
-- This caused 500 errors when performance reviews were submitted for approval.
-- Also ensures all workflow definitions exist for any tenant that was created
-- after V54 ran, by re-seeding for the default NuLogic tenant.
-- ============================================================================

-- First, drop the check constraint on entity_type if it exists, then re-add with PERFORMANCE_REVIEW
ALTER TABLE workflow_definitions DROP CONSTRAINT IF EXISTS workflow_definitions_entity_type_check;
ALTER TABLE workflow_definitions ADD CONSTRAINT workflow_definitions_entity_type_check
    CHECK (entity_type IN ('LEAVE_REQUEST', 'EXPENSE_CLAIM', 'ASSET_REQUEST', 'TRAVEL_REQUEST',
                           'LOAN_REQUEST', 'ONBOARDING', 'TIMESHEET', 'PERFORMANCE_REVIEW'));

DO $$
DECLARE
    v_tenant_id UUID := '660e8400-e29b-41d4-a716-446655440001';
    v_now TIMESTAMP := NOW();
    v_perf_wf_id UUID;
BEGIN
    -- Only insert if not already present
    IF NOT EXISTS (
        SELECT 1 FROM workflow_definitions
        WHERE tenant_id = v_tenant_id AND entity_type = 'PERFORMANCE_REVIEW' AND is_deleted = FALSE
    ) THEN
        v_perf_wf_id := gen_random_uuid();

        INSERT INTO workflow_definitions (
            id, tenant_id, name, entity_type, workflow_type, workflow_version,
            is_active, is_default, is_deleted, allow_parallel_approval, auto_approve_enabled,
            default_sla_hours, escalation_after_hours, escalation_enabled,
            notify_on_approval, notify_on_escalation, notify_on_rejection, notify_on_submission,
            skip_level_allowed, created_at, updated_at
        ) VALUES (
            v_perf_wf_id, v_tenant_id, 'Default Performance Review Workflow', 'PERFORMANCE_REVIEW', 'SEQUENTIAL', 1,
            TRUE, TRUE, FALSE, FALSE, FALSE,
            72, 96, FALSE,
            TRUE, FALSE, TRUE, TRUE,
            FALSE, v_now, v_now
        );

        -- Step 1: Manager Reviews
        INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout, auto_reject_on_timeout,
            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled, hierarchy_level,
            is_optional, min_approvals, sla_hours)
        VALUES (gen_random_uuid(), v_tenant_id, v_perf_wf_id, 1, 'Manager Review', 'REPORTING_MANAGER',
            FALSE, v_now, v_now, FALSE, FALSE, FALSE,
            FALSE, TRUE, 72, FALSE, 1,
            FALSE, 1, 72);

        -- Step 2: HR Approval
        INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name, approver_type,
            is_deleted, created_at, updated_at, attachments_allowed, auto_approve_on_timeout, auto_reject_on_timeout,
            comments_required, delegation_allowed, escalate_after_hours, escalation_enabled, hierarchy_level,
            is_optional, min_approvals, sla_hours)
        VALUES (gen_random_uuid(), v_tenant_id, v_perf_wf_id, 2, 'HR Approval', 'HR_MANAGER',
            FALSE, v_now, v_now, FALSE, FALSE, FALSE,
            FALSE, TRUE, 72, FALSE, 1,
            FALSE, 1, 72);

        RAISE NOTICE 'Created PERFORMANCE_REVIEW workflow definition with 2 approval steps';
    ELSE
        RAISE NOTICE 'PERFORMANCE_REVIEW workflow definition already exists — skipping';
    END IF;
END $$;
