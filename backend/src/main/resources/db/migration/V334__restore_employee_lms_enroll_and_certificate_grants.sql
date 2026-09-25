-- ============================================================================
-- V334: Restore employee-level LMS:ENROLL and LMS:CERTIFICATE_VIEW (2026-09-25)
--
-- Found while verifying BUG-L1 end to end: with the new
-- POST /api/v1/lms/learning-paths/{id}/enroll in place, a real EMPLOYEE still
-- got HTTP 403. Cause is a seeding regression, not the new endpoint:
--
--   V66__fix_rbac_permission_gaps.sql:540,603,686 deliberately granted
--   ('TRAINING:VIEW','TRAINING:ENROLL','LMS:COURSE_VIEW','LMS:ENROLL',
--    'LMS:CERTIFICATE_VIEW') to EMPLOYEE (SELF), MANAGER (TEAM) and
--   TEAM_LEAD (TEAM). The later canonical reseed kept the TRAINING:* rows and
--   LMS:COURSE_VIEW but dropped LMS:ENROLL and LMS:CERTIFICATE_VIEW, leaving
--   them held by SUPER_ADMIN alone.
--
-- Consequences in the running product:
--   * Self-enrolment was impossible for every non-admin — the "Enroll Now"
--     buttons on the catalog, course and learning-path pages 403'd for the
--     users they are rendered for.
--   * /learning/certificates redirected every employee to ?denied=1 (part of
--     BUG-L3; the other part was the isReady hydration race, fixed separately).
--
-- This restores exactly V66's intent and scope — no new permission, no widening
-- beyond the three roles V66 named. Idempotent via NOT EXISTS.
-- ============================================================================

INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       grants.role_id,
       p.id,
       grants.scope,
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
         CROSS JOIN (VALUES ('550e8400-e29b-41d4-a716-446655440023'::uuid, 'SELF'),  -- EMPLOYEE
                            ('550e8400-e29b-41d4-a716-446655440022'::uuid, 'TEAM'),  -- MANAGER
                            ('48000000-0e01-0000-0000-000000000001'::uuid, 'TEAM')   -- TEAM_LEAD
) AS grants(role_id, scope)
WHERE p.code IN ('LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
  AND EXISTS (SELECT 1 FROM roles r WHERE r.id = grants.role_id)
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = grants.role_id
                    AND rp.permission_id = p.id
                    AND rp.scope = grants.scope);
