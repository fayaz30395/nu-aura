-- ============================================================================
-- V331: Refresh Demo User Password Expiry (2026-09-24)
--
-- Root cause: PasswordPolicyConfig.maxAgeDays = 90. The last bulk demo
-- password reset was V121/V122 on 2026-04-08 (commit 601c89d3), which set
-- password_changed_at = NOW() at that time. 169 days later the shared demo
-- password ("Welcome@123") is expired for every @nulogic.io account.
-- AuthService.java:290-296 rejects login with 400 "Your password has
-- expired. Please reset your password." for any expired account — this is
-- NOT a bad-credentials failure (that would be 401).
--
-- Impact: e2e/auth.setup.ts logs in as SUPER_ADMIN to seed the shared
-- Playwright auth state. All 5 dependent projects (chromium, firefox,
-- mobile-chrome, mobile-safari, tablet) in playwright.config.ts declare
-- `dependencies: ['setup']`, so this single expired-password failure zeroed
-- out the entire ~2,886-test E2E suite.
--
-- This migration ONLY refreshes password_changed_at — it does NOT touch
-- password_hash, so no account's actual credential changes. It follows the
-- same tenant-agnostic @nulogic.io scope as V122, and the same
-- ${demoCredentialsEnabled} gating placeholder as V314:
--   * dev / demo / test -> "true"  : demo accounts stay usable, expiry reset.
--   * prod / render     -> "false" : no-op. Production's @nulogic.io demo
--     accounts are already neutralized (SUSPENDED, non-bcrypt sentinel hash)
--     by V314, so there is nothing live to refresh.
-- ============================================================================

DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') <> 'true' THEN
        RAISE NOTICE 'V331: demoCredentialsEnabled=false — skipping demo password expiry refresh (production environment).';
        RETURN;
    END IF;

    UPDATE users
       SET password_changed_at = NOW(),
           updated_at          = NOW()
     WHERE email LIKE '%@nulogic.io';

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V331: refreshed password_changed_at for % demo account(s).', affected;
END $$;
