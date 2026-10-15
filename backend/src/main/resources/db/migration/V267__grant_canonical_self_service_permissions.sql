-- V267: Grant canonical self-service permissions to people roles.
--
-- Older role-permission repair migrations used legacy/self-scoped names such as
-- LOAN:REQUEST, TRAVEL:REQUEST, EXPENSE:VIEW_SELF, ASSET:VIEW_SELF, and
-- ANNOUNCEMENT:READ. The current backend controllers and frontend route guards
-- enforce canonical Permission.java codes instead, so users could authenticate
-- successfully but still be blocked from real self-service workflows.

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'EXPENSE:VIEW', 'Expense View', 'View expense records', 'expense', 'view', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'EXPENSE:CREATE', 'Expense Create', 'Submit expense claims', 'expense', 'create', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LOAN:VIEW', 'Loan View', 'View employee loans', 'loan', 'view', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LOAN:CREATE', 'Loan Create', 'Apply for employee loans', 'loan', 'create', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'TRAVEL:VIEW', 'Travel View', 'View travel requests', 'travel', 'view', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'TRAVEL:CREATE', 'Travel Create', 'Submit travel requests', 'travel', 'create', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'ASSET:VIEW', 'Asset View', 'View assigned assets', 'asset', 'view', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'ANNOUNCEMENT:VIEW', 'Announcement View', 'View announcements', 'announcement', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

WITH self_service_grants(role_code, permission_code, scope) AS (
  VALUES
    ('EMPLOYEE', 'EXPENSE:VIEW', 'SELF'),
    ('EMPLOYEE', 'EXPENSE:CREATE', 'SELF'),
    ('EMPLOYEE', 'LOAN:VIEW', 'SELF'),
    ('EMPLOYEE', 'LOAN:CREATE', 'SELF'),
    ('EMPLOYEE', 'TRAVEL:VIEW', 'SELF'),
    ('EMPLOYEE', 'TRAVEL:CREATE', 'SELF'),
    ('EMPLOYEE', 'ASSET:VIEW', 'SELF'),
    ('EMPLOYEE', 'ANNOUNCEMENT:VIEW', 'ALL'),

    ('MANAGER', 'EXPENSE:VIEW', 'SELF'),
    ('MANAGER', 'EXPENSE:CREATE', 'SELF'),
    ('MANAGER', 'LOAN:VIEW', 'SELF'),
    ('MANAGER', 'LOAN:CREATE', 'SELF'),
    ('MANAGER', 'TRAVEL:VIEW', 'SELF'),
    ('MANAGER', 'TRAVEL:CREATE', 'SELF'),
    ('MANAGER', 'ASSET:VIEW', 'SELF'),
    ('MANAGER', 'ANNOUNCEMENT:VIEW', 'ALL'),

    ('TEAM_LEAD', 'EXPENSE:VIEW', 'SELF'),
    ('TEAM_LEAD', 'EXPENSE:CREATE', 'SELF'),
    ('TEAM_LEAD', 'LOAN:VIEW', 'SELF'),
    ('TEAM_LEAD', 'LOAN:CREATE', 'SELF'),
    ('TEAM_LEAD', 'TRAVEL:VIEW', 'SELF'),
    ('TEAM_LEAD', 'TRAVEL:CREATE', 'SELF'),
    ('TEAM_LEAD', 'ASSET:VIEW', 'SELF'),
    ('TEAM_LEAD', 'ANNOUNCEMENT:VIEW', 'ALL'),

    ('HR_MANAGER', 'EXPENSE:VIEW', 'SELF'),
    ('HR_MANAGER', 'EXPENSE:CREATE', 'SELF'),
    ('HR_MANAGER', 'LOAN:VIEW', 'SELF'),
    ('HR_MANAGER', 'LOAN:CREATE', 'SELF'),
    ('HR_MANAGER', 'TRAVEL:VIEW', 'SELF'),
    ('HR_MANAGER', 'TRAVEL:CREATE', 'SELF'),
    ('HR_MANAGER', 'ASSET:VIEW', 'SELF'),
    ('HR_MANAGER', 'ANNOUNCEMENT:VIEW', 'ALL'),

    ('RECRUITMENT_ADMIN', 'EXPENSE:VIEW', 'SELF'),
    ('RECRUITMENT_ADMIN', 'EXPENSE:CREATE', 'SELF'),
    ('RECRUITMENT_ADMIN', 'LOAN:VIEW', 'SELF'),
    ('RECRUITMENT_ADMIN', 'LOAN:CREATE', 'SELF'),
    ('RECRUITMENT_ADMIN', 'TRAVEL:VIEW', 'SELF'),
    ('RECRUITMENT_ADMIN', 'TRAVEL:CREATE', 'SELF'),
    ('RECRUITMENT_ADMIN', 'ASSET:VIEW', 'SELF'),
    ('RECRUITMENT_ADMIN', 'ANNOUNCEMENT:VIEW', 'ALL'),

    ('HR_ADMIN', 'EXPENSE:VIEW', 'SELF'),
    ('HR_ADMIN', 'EXPENSE:CREATE', 'SELF'),
    ('HR_ADMIN', 'LOAN:VIEW', 'SELF'),
    ('HR_ADMIN', 'LOAN:CREATE', 'SELF'),
    ('HR_ADMIN', 'TRAVEL:VIEW', 'SELF'),
    ('HR_ADMIN', 'TRAVEL:CREATE', 'SELF'),
    ('HR_ADMIN', 'ASSET:VIEW', 'SELF'),
    ('HR_ADMIN', 'ANNOUNCEMENT:VIEW', 'ALL')
)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       r.tenant_id,
       r.id,
       p.id,
       g.scope,
       NOW(),
       NOW(),
       0,
       false
FROM self_service_grants g
JOIN roles r
  ON r.code = g.role_code
 AND r.is_deleted = false
JOIN permissions p
  ON p.code = g.permission_code
 AND p.is_deleted = false
WHERE NOT EXISTS (
  SELECT 1
  FROM role_permissions rp
  WHERE rp.role_id = r.id
    AND rp.permission_id = p.id
    AND rp.tenant_id = r.tenant_id
    AND rp.is_deleted = false
);
