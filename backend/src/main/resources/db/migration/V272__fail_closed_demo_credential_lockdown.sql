-- ============================================================================
-- V272: Fail-closed demo credential lockdown (hardening of V270)
--
-- V270 neutralized accounts still holding a known "Welcome@123" bcrypt digest,
-- but it ran exactly once and was gated by a Flyway placeholder whose BASE
-- default was "true" (fail-open): a deployment that never activated the prod
-- profile (or never set DEMO_CREDENTIALS_ENABLED) kept all demo logins —
-- including two seeded SUPER_ADMIN accounts — live with a public password.
--
-- This migration closes the gap, together with the config change that flips
-- the base default of ${demoCredentialsEnabled} to "false" (application.yml).
-- dev/demo profiles opt back in explicitly with DEMO_CREDENTIALS_ENABLED=true.
--
-- Behaviour when demoCredentialsEnabled != 'true' (i.e. anything but an
-- explicit demo opt-in — fail-closed):
--   1. Re-apply V270's hash-based neutralization: any account still holding
--      one of the three known "Welcome@123" digests (seeded/reset by
--      V49/V61/V76/V110/V121/V122/V173) gets a random non-bcrypt sentinel
--      password (BCryptPasswordEncoder.matches() fails closed on malformed
--      hashes) and SUSPENDED status. Hash-matching never touches a real user
--      who rotated their password.
--   2. Identity-based lockdown of the well-known demo personas seeded with
--      fixed UUIDs (V49 demo org-chart users, V76 priya, V110 newjoiner,
--      V173 demo SUPER_ADMIN) whose password_hash is blank/NULL (the V19/V171
--      empty-hash seeds when the later password resets did not apply). These
--      IDs are migration-seeded constants, so this cannot affect a real user.
--
-- Idempotent and safe to re-run; in demo environments it is a no-op.
-- ============================================================================

DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') = 'true' THEN
        RAISE NOTICE 'V272: demoCredentialsEnabled=true — demo environment, leaving demo credentials intact.';
        RETURN;
    END IF;

    -- 1. Hash-based: any account that still holds a known "Welcome@123" digest.
    UPDATE users
       SET password_hash         = 'LOCKED_DEMO_CREDENTIAL_' || gen_random_uuid(),
           status                = 'SUSPENDED',
           failed_login_attempts = 0,
           locked_until          = NULL,
           updated_at            = NOW()
     WHERE password_hash IN (
            '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', -- Welcome@123 (V49/V61/V76 demo users)
            '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e', -- Welcome@123 (V121/V122/V173 reset incl. SUPER_ADMIN)
            '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG'  -- Welcome@123 (V110 new joiner)
        );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V272: neutralized % account(s) holding a known "Welcome@123" digest.', affected;

    -- 2. Identity-based: fixed-UUID demo personas with a blank/NULL password
    --    (seeded but never given a usable credential — lock them anyway so the
    --    rows can never be re-activated by a later password reset against a
    --    publicly-documented demo identity).
    UPDATE users
       SET password_hash         = 'LOCKED_DEMO_CREDENTIAL_' || gen_random_uuid(),
           status                = 'SUSPENDED',
           failed_login_attempts = 0,
           locked_until          = NULL,
           updated_at            = NOW()
     WHERE (password_hash IS NULL OR password_hash = '')
       AND id IN (
            '48000000-0e02-0000-0000-000000000001', -- sumit@nulogic.io      (V49)
            '48000000-0e02-0000-0000-000000000002', -- saran@nulogic.io      (V49)
            '48000000-0e02-0000-0000-000000000003', -- mani@nulogic.io       (V49)
            '48000000-0e02-0000-0000-000000000004', -- raj@nulogic.io        (V49)
            '48000000-0e02-0000-0000-000000000005', -- gokul@nulogic.io      (V49)
            '48000000-0e02-0000-0000-000000000006', -- anshuman@nulogic.io   (V49)
            '48000000-0e02-0000-0000-000000000007', -- jagadeesh@nulogic.io  (V49)
            '48000000-0e02-0000-0000-000000000008', -- suresh@nulogic.io     (V49)
            '48000000-0e02-0000-0000-000000000009', -- arun@nulogic.io       (V49)
            '48000000-0e02-0000-0000-000000000010', -- bharath@nulogic.io    (V49)
            '48000000-0e02-0000-0000-000000000011', -- dhanush@nulogic.io    (V49)
            '48000000-0e02-0000-0000-000000000012', -- chitra@nulogic.io     (V49)
            '48000000-0e02-0000-0000-000000000013', -- deepak@nulogic.io     (V49)
            '48000000-0e02-0000-0000-000000000014', -- priya@nulogic.io      (V76)
            'aa000000-0000-0000-0000-000000000099', -- newjoiner@nulogic.io  (V110)
            '550e8400-e29b-41d4-a716-446655440032'  -- demo SUPER_ADMIN      (V173)
        );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V272: locked % blank-password demo persona account(s).', affected;
END $$;
