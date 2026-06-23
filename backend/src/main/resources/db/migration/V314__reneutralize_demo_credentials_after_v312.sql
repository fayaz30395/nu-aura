-- ============================================================================
-- V314: Re-neutralize well-known demo credentials AFTER the V312 finance@ re-seed
--
-- Security finding (code audit 2026-06-24): V295/V299 lock every account holding
-- a known "Welcome@123" bcrypt digest, but they run BEFORE V312. V312
-- (seed_demo_finance_admin_user) then UNCONDITIONALLY inserts
-- finance@nulogic.io with status='ACTIVE' and password_hash
-- '$2a$10$Yz2jagoo...' (a known "Welcome@123" digest) and is NOT gated by
-- ${demoCredentialsEnabled}. Because no later migration re-applies the
-- neutralization, a fresh prod/render install with demoCredentialsEnabled=false
-- ends up with an ACTIVE FINANCE_ADMIN holding a publicly-known password — a
-- live public admin backdoor.
--
-- This migration re-applies the V295/V299 hash-based neutralization AFTER V312,
-- so the re-seeded finance@ account (and any other known-weak digest re-seeded
-- since) is locked in production. It is identical in mechanism to V295/V299
-- (exact-hash match -> never touches a real, rotated user) and gated by the same
-- ${demoCredentialsEnabled} placeholder:
--   * dev / demo / test -> "true"  : no-op, the seeded demo accounts stay usable.
--   * prod / render     -> "false" : the known-weak accounts are locked.
--
-- Neutralization sets a non-bcrypt sentinel hash (BCrypt.matches() => false,
-- fail-closed) and SUSPENDED status. Restore via the normal admin reset flow.
--
-- NOTE (render/Railway): application-render.yml historically set
-- spring.flyway.enabled=false, so — like V299 — this may need a one-shot Flyway
-- run (SPRING_FLYWAY_ENABLED=true for a single deploy) or be run directly
-- against the production DB to take effect on the live instance.
-- ============================================================================

DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') = 'true' THEN
        RAISE NOTICE 'V314: demoCredentialsEnabled=true — leaving re-seeded demo accounts intact (non-production environment).';
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
            '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e', -- Welcome@123 (V122/V173/V291/V312 incl. finance@ + tenant.admin)
            '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG'  -- Welcome@123 (V110 new joiner)
        );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V314: re-neutralized % account(s) holding a known "Welcome@123" digest after V312.', affected;
END $$;
