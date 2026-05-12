-- V156: Add assignee_role to onboarding_tasks; retire the description prefix kludge.
--
-- Context:
--   V154 introduced onboarding_task_templates with a first-class assignee_role
--   column (HR_ADMIN / MANAGER / EMPLOYEE / IT_ADMIN). The companion runtime
--   table, onboarding_tasks, did not yet have such a column, so
--   OnboardingManagementService.generateTasksFromRoleTemplates encoded the
--   logical role by prepending "[Assignee: ROLE_NAME] " to the task
--   description (see S7-C). That string-mangling kludge is now retired in
--   favour of a proper column.
--
-- Backfill:
--   For existing rows produced by S7-C, regex-extract the role from the
--   description prefix and strip the prefix from the description text. The
--   regex matches the exact bracket form the service wrote
--   ("[Assignee: ROLE_NAME]") and tolerates whitespace variants. The
--   trailing UPDATE intentionally runs only against rows that still carry
--   the prefix so it is idempotent on tenants that never produced one.
--
-- Index:
--   The hot path is "list a process's tasks filtered by assignee_role" — a
--   simple b-tree on assignee_role is sufficient at expected cardinality.

ALTER TABLE onboarding_tasks
  ADD COLUMN assignee_role VARCHAR(40);

-- Backfill: regex-extract from description "[Assignee:ROLE_NAME]" if present
UPDATE onboarding_tasks
SET assignee_role = substring(description from '\[Assignee:\s*([A-Z_]+)\s*\]')
WHERE description ~ '\[Assignee:';

-- Strip the prefix from description after extraction
UPDATE onboarding_tasks
SET description = regexp_replace(description, '\[Assignee:\s*[A-Z_]+\s*\]\s*', '', 'g')
WHERE description ~ '\[Assignee:';

CREATE INDEX idx_onboarding_tasks_assignee_role ON onboarding_tasks (assignee_role);

COMMENT
ON COLUMN onboarding_tasks.assignee_role IS
    'Logical role of the task assignee (HR_ADMIN, MANAGER, EMPLOYEE, IT_ADMIN). Populated from OnboardingTaskTemplate.assignee_role at task generation. assigned_to (UUID) remains the concrete user assignment; resolving role->user is a workflow-engine concern.';
