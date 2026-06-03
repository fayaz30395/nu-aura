-- ============================================================================
-- V270: Neutralize well-known demo credentials outside demo/dev environments
--
-- Security finding H-1 (security-audit-2026-06-04): demo accounts — including a
-- SUPER_ADMIN (sarankarthick.maran@nulogic.io) and a NEW_JOINER — were seeded
-- and repeatedly reset to the publicly-known password "Welcome@123" via
-- V49/V61/V110/V121/V122/V173. Those migrations run in every environment,
-- giving a single-request, unauthenticated -> SUPER_ADMIN path in production.
--
-- This migration disables any account that STILL holds one of the three known
-- "Welcome@123" bcrypt digests. Matching by exact hash is deliberate: it only
-- touches accounts that never rotated away from the seeded password, and never
-- a real user (who would have a different hash) — even though real NULogic
-- users also live on the @nulogic.io domain, so a domain match would be unsafe.
--
-- Gated by the Flyway placeholder ${demoCredentialsEnabled}:
--   * dev / demo / test  -> "true"  : no-op, the live demo keeps working.
--   * prod               -> "false" : known-weak accounts are locked.
-- (Configured under spring.flyway.placeholders.demoCredentialsEnabled.)
--
-- Neutralization sets a non-bcrypt sentinel hash (login fails closed —
-- BCryptPasswordEncoder.matches() returns false for malformed hashes) and
-- SUSPENDED status (JwtAuthenticationFilter rejects on the next request).
-- An operator restores access via the normal admin password-reset flow.
-- ============================================================================

DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') = 'true' THEN
        RAISE NOTICE 'V270: demoCredentialsEnabled=true — leaving demo credentials intact.';
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
            '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e', -- Welcome@123 (V122/V173 reset incl. SUPER_ADMIN)
            '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG'  -- Welcome@123 (V110 new joiner)
        );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V270: neutralized % account(s) holding a known "Welcome@123" digest.', affected;
END $$;
