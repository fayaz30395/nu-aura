-- ============================================================================
-- V299: Re-apply demo-credential neutralization for Railway (render profile)
--
-- Root cause (SEC-001 follow-up from d29ec59a / V295):
--   The render Spring profile (backend/Dockerfile: SPRING_PROFILES_ACTIVE=render)
--   sets spring.flyway.enabled=false in application-render.yml. This means V295
--   never ran on the live Railway database even though it was committed. The
--   V291-seeded tenant.admin@nulogic.io account with the known "Welcome@123"
--   bcrypt hash remains ACTIVE on production.
--
--   This migration is structurally identical to V295 (same hash list, same
--   sentinel, same gate) but it is designed to be applied via a one-shot Flyway
--   repair run with flyway.enabled=true (override at Railway startup via env var
--   SPRING_FLYWAY_ENABLED=true for a single deploy, then disable again).
--
-- Alternatively, run the SQL block below directly against the Railway Postgres
-- instance as a one-time maintenance query (copy from here, set
-- DEMO_CREDENTIALS_ENABLED to false mentally, run against production DB).
--
-- Gate behaviour:
--   demoCredentialsEnabled=true  → no-op (dev / demo environments left intact)
--   demoCredentialsEnabled=false → locks the account (production posture)
-- ============================================================================

DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') = 'true' THEN
        RAISE NOTICE 'V299: demoCredentialsEnabled=true — leaving demo admin intact (non-production environment).';
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
    RAISE NOTICE 'V299: locked % account(s) holding a known "Welcome@123" digest.', affected;
END $$;
