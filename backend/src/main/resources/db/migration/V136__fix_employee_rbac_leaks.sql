-- V136: Remove RECRUITMENT:VIEW and OFFBOARDING:VIEW from EMPLOYEE role
-- BUG-036-10: Employees should NOT see internal recruitment job openings
-- BUG-036-11: Employees should NOT see all offboarding/exit processes
-- These permissions were incorrectly assigned in V107

-- Remove RECRUITMENT:VIEW from EMPLOYEE role
DELETE
FROM role_permissions
WHERE role_id IN (SELECT id
                  FROM app_roles
                  WHERE name = 'EMPLOYEE'
                    AND is_deleted = false)
  AND permission_id IN (SELECT id FROM permissions WHERE code = 'RECRUITMENT:VIEW' AND is_deleted = false);

-- Remove OFFBOARDING:VIEW from EMPLOYEE role
DELETE
FROM role_permissions
WHERE role_id IN (SELECT id
                  FROM app_roles
                  WHERE name = 'EMPLOYEE'
                    AND is_deleted = false)
  AND permission_id IN (SELECT id FROM permissions WHERE code = 'OFFBOARDING:VIEW' AND is_deleted = false);

-- Also remove from TEAM_LEAD — team leads should not see all recruitment/offboarding
-- They can see their team's data via team-scoped endpoints
DELETE
FROM role_permissions
WHERE role_id IN (SELECT id
                  FROM app_roles
                  WHERE name = 'TEAM_LEAD'
                    AND is_deleted = false)
  AND permission_id IN
      (SELECT id FROM permissions WHERE code IN ('RECRUITMENT:VIEW', 'OFFBOARDING:VIEW') AND is_deleted = false);
