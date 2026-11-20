-- V352: HR_ADMIN / HR_MANAGER held no DOCUMENT:* grants, so employee document list and upload returned 403 (release-readiness upload test).
-- Idempotent for every tenant. Per-tenant loop sets app.current_tenant_id (FORCE RLS, see V341).

DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (
            id, tenant_id, role_id, permission_id, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, 'ALL',
               NOW(), NOW(), 0, false
        FROM roles r
        JOIN permissions p ON p.code IN ('DOCUMENT:VIEW', 'DOCUMENT:VIEW_ALL', 'DOCUMENT:UPLOAD')
                          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        WHERE r.tenant_id = tt.id
          AND r.code IN ('HR_ADMIN', 'HR_MANAGER')
          AND (r.is_deleted = false OR r.is_deleted IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM role_permissions rp
              WHERE rp.role_id = r.id
                AND rp.permission_id = p.id
                AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
          );
    END LOOP;
END $$;
