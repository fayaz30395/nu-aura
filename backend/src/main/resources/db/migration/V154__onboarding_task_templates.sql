-- V154: Role-aware onboarding task templates (wave-3 F4.6).
--
-- Context:
--   OnboardingManagementService.createProcess currently generates onboarding
--   tasks from a single OnboardingChecklistTemplate selected by templateId in
--   the request, or — when no templateId is supplied — creates *no* tasks at
--   all. F4.6 (wave-3) calls for role-aware default task generation so that
--   even when an HR admin does not pick a checklist, a sensible per-role set
--   of tasks is seeded on the new process. This migration adds a lightweight
--   `onboarding_task_templates` table that the service consults on process
--   creation. The existing `onboarding_template_tasks` table (which belongs to
--   the user-managed checklist templates) is left untouched.
--
-- Tenancy:
--   tenant_id is required. role_filter (e.g. matched against
--   employees.designation, case-insensitive at the application layer) and
--   department_filter are both nullable; a NULL filter means the template
--   applies to *all* roles / departments. The partial index supports the
--   hot-path lookup of `findByTenantId... order by sequence_order`.
--
-- Soft-delete + audit columns mirror the project convention (is_deleted,
-- deleted_at, created_at, updated_at, version) so the entity can extend the
-- existing TenantAware / BaseEntity pair. We deliberately do NOT add
-- created_by / updated_by here because the seed rows are inserted by the
-- migration itself and would have no meaningful user attribution.

CREATE TABLE IF NOT EXISTS onboarding_task_templates (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL,
    role_filter           VARCHAR(100),
    department_filter     UUID,
    task_name             VARCHAR(200) NOT NULL,
    task_description      TEXT,
    sequence_order        INT NOT NULL DEFAULT 0,
    due_days_after_join   INT NOT NULL DEFAULT 7,
    assignee_role         VARCHAR(50),
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted            BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at            TIMESTAMP WITH TIME ZONE,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version               BIGINT NOT NULL DEFAULT 0
);

-- Hot-path index for role-filtered lookups during createProcess. The partial
-- predicate keeps the index small (only active, non-deleted rows).
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_tenant_role
    ON onboarding_task_templates (tenant_id, role_filter)
    WHERE is_active = TRUE AND is_deleted = FALSE;

COMMENT ON TABLE onboarding_task_templates IS
    'Role-aware default task templates consulted by OnboardingManagementService.createProcess (F4.6). Distinct from onboarding_template_tasks, which belong to user-managed checklist templates.';
COMMENT ON COLUMN onboarding_task_templates.role_filter IS
    'Nullable. NULL = applies to all roles. Matched case-insensitively against employees.designation at the application layer.';
COMMENT ON COLUMN onboarding_task_templates.department_filter IS
    'Nullable. NULL = applies to all departments. Reserved for future use — the service currently filters on role only.';
COMMENT ON COLUMN onboarding_task_templates.assignee_role IS
    'Logical role of the task assignee (HR_ADMIN, MANAGER, EMPLOYEE, IT_ADMIN). Stored as metadata; the existing onboarding_tasks table uses assigned_to (UUID) and does not have a role column, so this value is preserved in task.description until that schema is extended.';

-- ============================================================================
-- Seed: default role-agnostic templates (role_filter NULL) for every tenant.
-- ============================================================================
-- ON CONFLICT DO NOTHING is harmless here because (tenant_id, task_name)
-- has no unique constraint — repeated migration runs are protected by Flyway's
-- own checksum, so we keep the clause defensive against manual re-runs only.

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, NULL,
       'Welcome orientation',
       'Complete day-1 welcome session and platform tour with HR.',
       1, 1, 'HR_ADMIN'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, NULL,
       'Complete personal information',
       'Fill out personal profile, emergency contacts, and bank details in NU-HRMS.',
       2, 2, 'EMPLOYEE'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, NULL,
       'Submit identity & address documents',
       'Upload government ID, address proof, and educational certificates for verification.',
       3, 3, 'EMPLOYEE'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, NULL,
       'IT workstation & access setup',
       'Provision laptop, email, SSO, VPN, and required application access.',
       4, 3, 'IT_ADMIN'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, NULL,
       'Manager 1:1 introduction',
       'Schedule and complete first 1:1 with reporting manager — goals and 30/60/90 plan.',
       5, 5, 'MANAGER'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, NULL,
       'Compliance & policy acknowledgement',
       'Read and acknowledge code of conduct, IT acceptable-use, and POSH policies.',
       6, 7, 'EMPLOYEE'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed: role-specific extras (Manager / Engineer examples) for every tenant.
-- These showcase the role_filter feature; HR admins can add or override them.
-- ============================================================================

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, 'Manager',
       'Team & stakeholder mapping',
       'Meet direct reports and cross-functional stakeholders; document org map.',
       10, 10, 'MANAGER'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_task_templates
    (tenant_id, role_filter, task_name, task_description, sequence_order, due_days_after_join, assignee_role)
SELECT t.id, 'Engineer',
       'Development environment setup',
       'Install required SDKs, clone primary repositories, and complete first commit walkthrough.',
       10, 5, 'IT_ADMIN'
FROM tenants t WHERE t.is_deleted = FALSE
ON CONFLICT DO NOTHING;
