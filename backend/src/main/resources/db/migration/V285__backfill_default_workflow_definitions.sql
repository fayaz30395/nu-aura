-- ============================================================================
-- V285: Backfill default workflow definitions for existing tenants (BA-8)
-- ============================================================================
-- TenantProvisioningService.seedDefaultWorkflowDefinitions now seeds 7 default
-- SEQUENTIAL approval workflows for NEWLY provisioned tenants. Tenants that
-- were provisioned before that fix have zero workflow definitions, so every
-- leave/expense/asset/travel/loan/onboarding/timesheet submission fails with
-- "No active workflow definition configured".
--
-- This migration replicates the exact rows the service writes (same names,
-- types, steps and values — identical to the V54 demo-tenant seed) for every
-- existing tenant that has NO active, non-deleted workflow definition for a
-- given entity type. Idempotent per tenant + entity type.
--
-- RLS note (V254/V255/V262): workflow_definitions and approval_steps carry
-- FORCE ROW LEVEL SECURITY with a fail-closed RESTRICTIVE policy that requires
-- app.current_tenant_id to match tenant_id. Following the V265 precedent,
-- app.current_tenant_id is set per tenant (transaction-local set_config) so
-- this runs correctly whether Flyway connects as a BYPASSRLS superuser or as
-- the constrained nu_app_rls role. The tenants table itself has no RLS, so
-- tenant enumeration is safe under either role.
-- ============================================================================

DO
$$
DECLARE
    v_tenant            RECORD;
    v_def               RECORD;
    v_now               TIMESTAMP := NOW();
    v_wf_id             UUID;
    v_defs_inserted     INT := 0;
    v_tenants_backfilled INT := 0;
    v_tenant_touched    BOOLEAN;
BEGIN
    FOR v_tenant IN
        SELECT t.id
        FROM tenants t
        WHERE t.is_deleted = FALSE
        ORDER BY t.created_at
    LOOP
        -- Fail-closed RLS policies require the tenant context (V265 pattern).
        PERFORM set_config('app.current_tenant_id', v_tenant.id::text, true);
        v_tenant_touched := FALSE;

        FOR v_def IN
            SELECT *
            FROM (VALUES
                -- (name, entity_type,
                --  step1_name, step1_approver_type,
                --  step2_name, step2_approver_type, step2_role_name)
                ('Default Leave Approval',         'LEAVE_REQUEST',
                 'Manager Approval',         'REPORTING_MANAGER',
                 NULL,                       NULL,              NULL),
                ('Default Expense Approval',       'EXPENSE_CLAIM',
                 'Manager Approval',         'REPORTING_MANAGER',
                 'Finance Head Approval',    'FINANCE_MANAGER', NULL),
                ('Default Asset Request Approval', 'ASSET_REQUEST',
                 'Manager Approval',         'REPORTING_MANAGER',
                 'IT Admin Approval',        'ANY_OF_ROLE',     'IT_ADMIN'),
                ('Default Travel Approval',        'TRAVEL_REQUEST',
                 'Manager Approval',         'REPORTING_MANAGER',
                 NULL,                       NULL,              NULL),
                ('Default Loan Approval',          'LOAN_REQUEST',
                 'Manager Approval',         'REPORTING_MANAGER',
                 'Finance Head Approval',    'FINANCE_MANAGER', NULL),
                ('Default Onboarding Approval',    'ONBOARDING',
                 'Department Head Approval', 'DEPARTMENT_HEAD',
                 NULL,                       NULL,              NULL),
                ('Default Timesheet Approval',     'TIMESHEET',
                 'Project Manager Approval', 'REPORTING_MANAGER',
                 NULL,                       NULL,              NULL)
            ) AS d(wf_name, wf_entity_type,
                   step1_name, step1_approver_type,
                   step2_name, step2_approver_type, step2_role_name)
        LOOP
            v_wf_id := NULL;

            -- Insert the definition only when the tenant has no active,
            -- non-deleted definition for this entity type (the exact lookup
            -- WorkflowService performs before failing).
            INSERT INTO workflow_definitions (id, tenant_id, name, entity_type, workflow_type, workflow_version,
                                              is_active, is_default, is_deleted, version,
                                              allow_parallel_approval, auto_approve_enabled,
                                              default_sla_hours, escalation_after_hours, escalation_enabled,
                                              notify_on_approval, notify_on_escalation, notify_on_rejection,
                                              notify_on_submission, skip_level_allowed,
                                              created_at, updated_at)
            SELECT gen_random_uuid(), v_tenant.id, v_def.wf_name, v_def.wf_entity_type, 'SEQUENTIAL', 1,
                   TRUE, TRUE, FALSE, 0,
                   FALSE, FALSE,
                   48, 72, FALSE,
                   TRUE, FALSE, TRUE,
                   TRUE, FALSE,
                   v_now, v_now
            WHERE NOT EXISTS (SELECT 1
                              FROM workflow_definitions wd
                              WHERE wd.tenant_id = v_tenant.id
                                AND wd.entity_type = v_def.wf_entity_type
                                AND wd.is_active = TRUE
                                AND wd.is_deleted = FALSE)
            RETURNING id INTO v_wf_id;

            IF v_wf_id IS NULL THEN
                CONTINUE; -- tenant already has an active workflow for this type
            END IF;

            v_defs_inserted := v_defs_inserted + 1;
            v_tenant_touched := TRUE;

            INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name,
                                        approver_type, role_name, is_deleted, version,
                                        hierarchy_level, min_approvals, sla_hours, escalate_after_hours,
                                        delegation_allowed, is_optional, escalation_enabled,
                                        auto_approve_on_timeout, auto_reject_on_timeout,
                                        comments_required, attachments_allowed,
                                        created_at, updated_at)
            VALUES (gen_random_uuid(), v_tenant.id, v_wf_id, 1, v_def.step1_name,
                    v_def.step1_approver_type, NULL, FALSE, 0,
                    1, 1, 48, 72,
                    TRUE, FALSE, FALSE,
                    FALSE, FALSE,
                    FALSE, FALSE,
                    v_now, v_now);

            IF v_def.step2_name IS NOT NULL THEN
                INSERT INTO approval_steps (id, tenant_id, workflow_definition_id, step_order, step_name,
                                            approver_type, role_name, is_deleted, version,
                                            hierarchy_level, min_approvals, sla_hours, escalate_after_hours,
                                            delegation_allowed, is_optional, escalation_enabled,
                                            auto_approve_on_timeout, auto_reject_on_timeout,
                                            comments_required, attachments_allowed,
                                            created_at, updated_at)
                VALUES (gen_random_uuid(), v_tenant.id, v_wf_id, 2, v_def.step2_name,
                        v_def.step2_approver_type, v_def.step2_role_name, FALSE, 0,
                        1, 1, 48, 72,
                        TRUE, FALSE, FALSE,
                        FALSE, FALSE,
                        FALSE, FALSE,
                        v_now, v_now);
            END IF;
        END LOOP;

        IF v_tenant_touched THEN
            v_tenants_backfilled := v_tenants_backfilled + 1;
        END IF;
    END LOOP;

    -- Clear the tenant context for the remainder of the Flyway transaction.
    PERFORM set_config('app.current_tenant_id', '', true);

    RAISE NOTICE 'V285: backfilled % default workflow definitions across % tenants',
        v_defs_inserted, v_tenants_backfilled;
END
$$;
