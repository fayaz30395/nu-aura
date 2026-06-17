-- ============================================================================
-- HOTFIX: Neutralize live demo SUPER_ADMIN / TENANT_ADMIN with Welcome@123
--
-- Run this directly against the Railway PostgreSQL instance.
-- This is a one-time emergency patch for SEC-001 (d29ec59a / V295 gap):
-- V295 and V299 in the Flyway chain cannot auto-apply on Railway because
-- spring.flyway.enabled=false in the render profile. Execute this SQL manually
-- via the Railway database shell or psql proxy BEFORE disabling
-- DEMO_CREDENTIALS_ENABLED in Railway env vars.
--
-- Safe to re-run: the WHERE clause matches only known Welcome@123 hashes,
-- so real rotated passwords are never touched.
-- ============================================================================

UPDATE users
   SET password_hash         = 'LOCKED_DEMO_CREDENTIAL_' || gen_random_uuid(),
       status                = 'SUSPENDED',
       failed_login_attempts = 0,
       locked_until          = NULL,
       updated_at            = NOW()
 WHERE password_hash IN (
        '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', -- Welcome@123 (V49 demo users)
        '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e', -- Welcome@123 (V122/V173/V291 tenant.admin)
        '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG'  -- Welcome@123 (V110 new joiner)
       );

-- Verify: should return 0 rows after the patch
SELECT email, status, left(password_hash, 12) AS hash_prefix
  FROM users
 WHERE password_hash LIKE '$2a$%'
   AND email LIKE '%nulogic.io';
