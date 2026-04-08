-- ============================================================================
-- V121: Reset Demo User Passwords (2026-04-08)
-- Re-hashes all @nulogic.io demo user passwords to 'Welcome@123' using bcrypt.
-- Previous V61 migration may not have applied correctly on Neon DB.
-- Also resets failed_login_attempts and ensures status is ACTIVE.
-- Password: Welcome@123  (bcrypt $2a$10 hash — Spring Security compatible)
-- ============================================================================

-- Update ALL @nulogic.io users' password hashes for the NuLogic tenant
UPDATE users
SET password_hash         = '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e',
    failed_login_attempts = 0,
    status                = 'ACTIVE',
    auth_provider         = 'LOCAL',
    password_changed_at   = NOW(),
    updated_at            = NOW()
WHERE tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND email LIKE '%@nulogic.io';
