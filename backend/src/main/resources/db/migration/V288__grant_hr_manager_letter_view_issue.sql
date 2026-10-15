-- V288: HR Manager letters access. HR_MANAGER was seeded with only LETTER:GENERATE,
-- missing LETTER:TEMPLATE_VIEW (required by GET /api/v1/letters + template endpoints)
-- and LETTER:ISSUE. Grant both, per-tenant, idempotently.
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, 'ALL', NOW(), NOW(), 0, false
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'HR_MANAGER'
  AND p.code IN ('LETTER:TEMPLATE_VIEW', 'LETTER:ISSUE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.tenant_id = r.tenant_id AND rp.is_deleted = false
  );
