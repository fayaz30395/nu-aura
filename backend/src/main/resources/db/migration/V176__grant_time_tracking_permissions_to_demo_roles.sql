-- Grant canonical TIME_TRACKING permissions to the demo roles that use the
-- /time-tracking UI and API. Existing TIMESHEET permissions cover project
-- timesheets; these grants cover the dedicated time-tracking module.

-- Employee self-service: view/create/update own entries.
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       'SELF',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
JOIN permissions p ON p.code IN ('TIME_TRACKING:VIEW', 'TIME_TRACKING:CREATE', 'TIME_TRACKING:UPDATE')
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code IN ('EMPLOYEE', 'RECRUITMENT_ADMIN')
  AND p.is_deleted = false
ON CONFLICT DO NOTHING;

-- Team approvers: self-service plus team-level approval/read access.
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       CASE
           WHEN p.code IN ('TIME_TRACKING:APPROVE', 'TIME_TRACKING:VIEW_ALL') THEN 'TEAM'
           ELSE 'SELF'
       END,
       NOW(),
       NOW(),
       0,
       false
FROM roles r
JOIN permissions p ON p.code IN (
    'TIME_TRACKING:VIEW',
    'TIME_TRACKING:CREATE',
    'TIME_TRACKING:UPDATE',
    'TIME_TRACKING:APPROVE',
    'TIME_TRACKING:VIEW_ALL'
)
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code IN ('TEAM_LEAD', 'MANAGER')
  AND p.is_deleted = false
ON CONFLICT DO NOTHING;

-- HR/admin roles: full time-tracking access.
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
JOIN permissions p ON p.code IN (
    'TIME_TRACKING:VIEW',
    'TIME_TRACKING:CREATE',
    'TIME_TRACKING:UPDATE',
    'TIME_TRACKING:APPROVE',
    'TIME_TRACKING:VIEW_ALL',
    'TIME_TRACKING:MANAGE'
)
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code IN ('HR_MANAGER', 'HR_ADMIN', 'TENANT_ADMIN', 'PAYROLL_ADMIN')
  AND p.is_deleted = false
ON CONFLICT DO NOTHING;
