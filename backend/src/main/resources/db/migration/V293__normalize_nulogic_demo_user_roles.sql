-- V293: Normalize NuLogic demo user roles.
-- Live demo auth showed saran@nulogic.io with EMPLOYEE + HR_ADMIN, which breaks
-- RBAC boundary testing for employee self-service. Limit this cleanup to the
-- known NuLogic demo tenant accounts and reactivate only their intended role.

SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

WITH expected_roles(email, role_code) AS (
    VALUES
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
),
demo_users AS (
    SELECT u.id AS user_id, u.tenant_id, er.role_code
    FROM expected_roles er
    JOIN users u
      ON lower(u.email) = er.email
     AND u.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
     AND u.is_deleted = false
),
unexpected_roles AS (
    SELECT ur.user_id, ur.role_id
    FROM user_roles ur
    JOIN demo_users du
      ON du.user_id = ur.user_id
     AND du.tenant_id = ur.tenant_id
    JOIN roles r
      ON r.id = ur.role_id
     AND r.tenant_id = ur.tenant_id
    WHERE r.code <> du.role_code
)
UPDATE user_roles ur
SET is_deleted = true,
    deleted_at = NOW()
FROM unexpected_roles bad
WHERE ur.user_id = bad.user_id
  AND ur.role_id = bad.role_id;

WITH expected_roles(email, role_code) AS (
    VALUES
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
)
INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted, deleted_at)
SELECT u.id, r.id, u.tenant_id, false, NULL
FROM expected_roles er
JOIN users u
  ON lower(u.email) = er.email
 AND u.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
 AND u.is_deleted = false
JOIN roles r
  ON r.tenant_id = u.tenant_id
 AND r.code = er.role_code
 AND r.is_deleted = false
ON CONFLICT (user_id, role_id) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    is_deleted = false,
    deleted_at = NULL;
