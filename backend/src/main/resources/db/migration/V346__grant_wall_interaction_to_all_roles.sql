-- Wall comment returned 403 for roles such as HR_ADMIN: WALL:COMMENT/REACT/POST/VIEW were never
-- seeded for every role, while RoleHierarchy defaults imply every employee-facing role has them.
-- Forward-only, idempotent (NOT EXISTS), per tenant with the tx-local tenant GUC (same pattern as V345).
DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope,
                                      created_at, updated_at, version, is_deleted)
        SELECT gen_random_uuid(), tt.id, r.id, p.id,
               CASE WHEN p.code = 'WALL:VIEW' THEN 'ALL' ELSE 'SELF' END,
               NOW(), NOW(), 0, false
        FROM roles r
                 JOIN permissions p ON p.tenant_id = tt.id
                      AND p.code IN ('WALL:VIEW', 'WALL:POST', 'WALL:REACT', 'WALL:COMMENT')
        WHERE r.tenant_id = tt.id
          AND (r.is_deleted = false OR r.is_deleted IS NULL)
          AND NOT EXISTS (SELECT 1
                          FROM role_permissions x
                          WHERE x.role_id = r.id
                            AND x.permission_id = p.id
                            AND (x.is_deleted = false OR x.is_deleted IS NULL));
    END LOOP;
END $$;
