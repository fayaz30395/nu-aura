-- ============================================================================
-- V295: Re-neutralize well-known demo credentials AFTER the V291 re-seed
--
-- Security finding SEC-001 (readiness swarm 2026-06-17): V270 neutralizes the
-- three known "Welcome@123" bcrypt digests, but it is GATED by
-- ${demoCredentialsEnabled} and runs BEFORE V291. On a fresh install with
-- demoCredentialsEnabled=false, V270 matches zero rows (the accounts do not
-- exist yet), then V291 unconditionally seeds tenant.admin@nulogic.io ACTIVE
-- with hash $2a$10$Yz2j... (one of the three known "Welcome@123" digests).
-- V270 never re-runs, so a fresh production install ends up with an active
-- TENANT_ADMIN holding a publicly-known password.
--
-- This migration re-applies the V270 hash-based neutralization AFTER V291, so
-- the re-seeded account is locked in prod. It is identical in mechanism to V270
-- (exact-hash match → never touches a real, rotated user) and gated by the same
-- ${demoCredentialsEnabled} placeholder:
--   * dev / demo / test -> "true"  : no-op, the seeded demo admin stays usable.
--   * prod              -> "false" : the re-seeded known-weak account is locked.
--
-- Neutralization sets a non-bcrypt sentinel hash (BCrypt.matches() => false,
-- fail-closed) and SUSPENDED status. Restore via the normal admin reset flow.
-- ============================================================================

DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') = 'true' THEN
        RAISE NOTICE 'V295: demoCredentialsEnabled=true — leaving re-seeded demo admin intact.';
        RETURN;
    END IF;

    UPDATE users
       SET password_hash         = 'LOCKED_DEMO_CREDENTIAL_' || gen_random_uuid(),
           status                = 'SUSPENDED',
           failed_login_attempts = 0,
           locked_until          = NULL,
           updated_at            = NOW()
     WHERE password_hash IN (
            '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', -- Welcome@123 (V49 demo users)
            '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e', -- Welcome@123 (V122/V173/V291 incl. tenant.admin)
            '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG'  -- Welcome@123 (V110 new joiner)
        );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V295: re-neutralized % account(s) holding a known "Welcome@123" digest after V291.', affected;
END $$;
