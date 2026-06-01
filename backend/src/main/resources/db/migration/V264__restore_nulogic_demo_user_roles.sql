-- Restore explicit legacy RBAC assignments for NuLogic demo users.
-- Some shared dev databases retained user_app_access rows but lost user_roles,
-- which caused auth responses to drop advertised demo roles and permissions.

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM (VALUES
    ('fayaz.m@nulogic.io', 'SUPER_ADMIN'),
    ('sarankarthick.maran@nulogic.io', 'SUPER_ADMIN'),
    ('sumit@nulogic.io', 'MANAGER'),
    ('saran@nulogic.io', 'EMPLOYEE'),
    ('mani@nulogic.io', 'TEAM_LEAD'),
    ('raj@nulogic.io', 'EMPLOYEE'),
    ('gokul@nulogic.io', 'TEAM_LEAD'),
    ('anshuman@nulogic.io', 'EMPLOYEE'),
    ('jagadeesh@nulogic.io', 'HR_MANAGER'),
    ('suresh@nulogic.io', 'RECRUITMENT_ADMIN'),
    ('arun@nulogic.io', 'EMPLOYEE'),
    ('bharath@nulogic.io', 'EMPLOYEE'),
    ('dhanush@nulogic.io', 'TEAM_LEAD'),
    ('chitra@nulogic.io', 'EMPLOYEE'),
    ('deepak@nulogic.io', 'EMPLOYEE')
) AS mapping(email, role_code)
JOIN users u
  ON lower(u.email) = mapping.email
 AND u.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
 AND u.is_deleted = false
JOIN roles r
  ON r.tenant_id = u.tenant_id
 AND r.code = mapping.role_code
 AND r.is_deleted = false
ON CONFLICT DO NOTHING;
