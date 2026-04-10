-- ============================================================
-- Promote user to SUPER_ADMIN
-- Run: docker exec -i hrms-postgres psql -U hrms -d hrms_dev < promote-superadmin.sql
-- ============================================================

-- 1. Show current users
SELECT id, email, first_name, last_name, tenant_id
FROM users
ORDER BY created_at;

-- 2. Ensure SUPER_ADMIN role exists for the user's tenant
INSERT INTO roles (id, code, name, description, is_system_role, tenant_id, created_at, updated_at)
SELECT gen_random_uuid(),
       'SUPER_ADMIN',
       'Super Admin',
       'Full system access across all tenants',
       true,
       u.tenant_id,
       NOW(),
       NOW()
FROM users u
WHERE u.email = 'fayaz.m@nulogic.io'
  AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.code = 'SUPER_ADMIN' AND r.tenant_id = u.tenant_id) LIMIT 1;

-- 3. Assign SUPER_ADMIN role to the user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
       JOIN roles r ON r.code = 'SUPER_ADMIN' AND r.tenant_id = u.tenant_id
WHERE u.email = 'fayaz.m@nulogic.io'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- 4. Create UserAppAccess if missing
INSERT INTO user_app_access (id, user_id, application_id, status, granted_at, tenant_id, created_at, updated_at)
SELECT gen_random_uuid(),
       u.id,
       a.id,
       'ACTIVE',
       NOW(),
       u.tenant_id,
       NOW(),
       NOW()
FROM users u
       CROSS JOIN nu_applications a
WHERE u.email = 'fayaz.m@nulogic.io'
  AND a.code = 'HRMS'
  AND NOT EXISTS (SELECT 1 FROM user_app_access uaa WHERE uaa.user_id = u.id AND uaa.application_id = a.id);

-- 5. Link SUPER_ADMIN AppRole to UserAppAccess (correct join table: user_app_roles)
INSERT INTO user_app_roles (user_app_access_id, role_id)
SELECT uaa.id, ar.id
FROM users u
       JOIN user_app_access uaa ON uaa.user_id = u.id
       JOIN nu_applications a ON a.id = uaa.application_id AND a.code = 'HRMS'
       JOIN app_roles ar ON ar.application_id = a.id AND ar.code = 'SUPER_ADMIN'
WHERE u.email = 'fayaz.m@nulogic.io'
  AND NOT EXISTS (SELECT 1 FROM user_app_roles uar WHERE uar.user_app_access_id = uaa.id AND uar.role_id = ar.id);

-- 6. Verify
SELECT u.email, u.first_name, r.code as role_code
FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
WHERE u.email = 'fayaz.m@nulogic.io';
