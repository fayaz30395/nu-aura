-- V268: Grant expense approval permissions to people managers.
--
-- Expense approval endpoints require EXPENSE:APPROVE and scope pending
-- approvals through that permission. Managers and team leads are expected to
-- approve submitted employee claims, but previous self-service grants only gave
-- them create/view access.

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'EXPENSE:APPROVE', 'Expense Approve', 'Approve expense claims', 'expense', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

WITH manager_grants(role_code, permission_code, scope) AS (
  VALUES
    ('MANAGER', 'EXPENSE:APPROVE', 'TEAM'),
    ('TEAM_LEAD', 'EXPENSE:APPROVE', 'TEAM'),
    ('HR_MANAGER', 'EXPENSE:APPROVE', 'ALL'),
    ('HR_ADMIN', 'EXPENSE:APPROVE', 'ALL')
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
FROM manager_grants g
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
