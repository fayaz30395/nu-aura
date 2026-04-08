-- ============================================================================
-- V122: Reset ALL Demo User Passwords Across ALL Tenants (2026-04-08)
-- V121 only updated tenant 660e8400. This migration covers ALL @nulogic.io
-- users regardless of tenant.
-- Password: Welcome@123  (bcrypt $2a$10 hash)
-- ============================================================================

UPDATE users
SET password_hash         = '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e',
    failed_login_attempts = 0,
    status                = 'ACTIVE',
    auth_provider         = 'LOCAL',
    password_changed_at   = NOW(),
    updated_at            = NOW()
WHERE email LIKE '%@nulogic.io';
