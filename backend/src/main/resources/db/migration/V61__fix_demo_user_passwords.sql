-- ============================================================================
-- V61: Fix Demo User Passwords
-- Forcefully updates password hashes for ALL demo users in the NuLogic tenant.
-- V49 used ON CONFLICT (id) DO NOTHING, which may have skipped password
-- updates for users that already existed.
-- Also resets failed_login_attempts and ensures status is ACTIVE.
-- Password: Welcome@123  (bcrypt hash below)
-- ============================================================================

-- Forcefully update ALL @nulogic.io users' password hashes
UPDATE users
SET password_hash         = '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2',
    failed_login_attempts = 0,
    status                = 'ACTIVE'
WHERE tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND email LIKE '%@nulogic.io';

-- Also ensure the auth_provider allows password login for demo mode
-- Set all demo users to LOCAL so they can use email+password in demo mode
UPDATE users
SET auth_provider = 'LOCAL'
WHERE tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND email LIKE '%@nulogic.io';
