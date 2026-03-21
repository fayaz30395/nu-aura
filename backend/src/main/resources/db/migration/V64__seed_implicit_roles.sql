-- V64__seed_implicit_roles.sql
-- Seed implicit role rules and role hierarchy for NuLogic demo tenant

-- Seed implicit role rules (only if demo tenant and roles exist)
INSERT INTO implicit_role_rules (tenant_id, rule_name, description, condition_type, target_role_id, scope, priority)
SELECT
  '660e8400-e29b-41d4-a716-446655440001',
  'Reporting Managers get MANAGER role',
  'Auto-assigns MANAGER role with TEAM scope to any employee who has direct reports',
  'IS_REPORTING_MANAGER',
  r.id,
  'TEAM',
  10
FROM roles r WHERE r.code = 'MANAGER' AND r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
ON CONFLICT (tenant_id, condition_type, target_role_id) DO NOTHING;

INSERT INTO implicit_role_rules (tenant_id, rule_name, description, condition_type, target_role_id, scope, priority)
SELECT
  '660e8400-e29b-41d4-a716-446655440001',
  'Department Heads get DEPARTMENT_HEAD role',
  'Auto-assigns DEPARTMENT_HEAD role with DEPARTMENT scope to department managers',
  'IS_DEPARTMENT_HEAD',
  r.id,
  'DEPARTMENT',
  20
FROM roles r WHERE r.code = 'DEPARTMENT_HEAD' AND r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
ON CONFLICT (tenant_id, condition_type, target_role_id) DO NOTHING;

-- Seed role hierarchy: MANAGER -> TEAM_LEAD -> EMPLOYEE
UPDATE roles SET parent_role_id = (
  SELECT id FROM roles WHERE code = 'TEAM_LEAD' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001'
) WHERE code = 'MANAGER' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001' AND parent_role_id IS NULL;

UPDATE roles SET parent_role_id = (
  SELECT id FROM roles WHERE code = 'EMPLOYEE' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001'
) WHERE code = 'TEAM_LEAD' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001' AND parent_role_id IS NULL;

-- Seed escalation config for leave and expense workflows (48h timeout)
INSERT INTO approval_escalation_config (tenant_id, workflow_definition_id, timeout_hours, escalation_type, max_escalations)
SELECT
  '660e8400-e29b-41d4-a716-446655440001',
  wd.id,
  48,
  'SKIP_LEVEL_MANAGER',
  2
FROM workflow_definitions wd
WHERE wd.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND wd.entity_type IN ('LEAVE_REQUEST', 'EXPENSE_CLAIM')
ON CONFLICT (tenant_id, workflow_definition_id) DO NOTHING;
