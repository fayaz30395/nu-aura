-- =============================================================================
-- V313: Grant HR_ADMIN the NU-Fluence Knowledge Base permissions
-- =============================================================================
-- CONTEXT:
--   RoleHierarchy.getHRAdminPermissions() (RoleHierarchy.java:174-194) intends
--   HR_ADMIN to have full Knowledge Base access (wiki, blog, templates, search,
--   settings). But neither the Spring startup seed nor the V305 backfill granted
--   any KNOWLEDGE:* permissions to HR_ADMIN, so at runtime HR_ADMIN has an empty
--   knowledge permission set. Observed in the 2026-06-23 UI E2E run:
--     - /fluence/search silently bounced HR_ADMIN to /me/dashboard (lacks the
--       WIKI_READ / BLOG_READ perms the page guard accepts) — F-011 backend side.
--     - /fluence/templates returned 403 (lacks TEMPLATE_READ); the FE degrades to
--       an empty "No templates" state (F-008), masking the missing grant.
--   This backfills the definitive knowledge set, aligning the DB with the
--   authoritative RoleHierarchy intent (same failure class as V289 / V305).
--
-- SAFETY:
--   ON CONFLICT DO NOTHING — idempotent, safe to re-run. Only inserts rows where
--   the permission code already exists in the permissions table. Scope 'ALL'.
--   Next Flyway version; does not modify any prior migration.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT rl.tenant_id, rl.id AS role_id
        FROM roles rl
        WHERE rl.code = 'HR_ADMIN'
          AND (rl.is_deleted = false OR rl.is_deleted IS NULL)
    LOOP
        INSERT INTO role_permissions (
            id, tenant_id, role_id, permission_id, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT
            gen_random_uuid(),
            r.tenant_id,
            r.role_id,
            p.id,
            'ALL',
            NOW(),
            NOW(),
            0,
            false
        FROM permissions p
        WHERE p.code IN (
            -- Nu-Fluence: Knowledge Base — Wiki
            'KNOWLEDGE:WIKI_CREATE',
            'KNOWLEDGE:WIKI_READ',
            'KNOWLEDGE:WIKI_UPDATE',
            'KNOWLEDGE:WIKI_DELETE',
            'KNOWLEDGE:WIKI_PUBLISH',
            'KNOWLEDGE:WIKI_APPROVE',
            -- Nu-Fluence: Knowledge Base — Blog
            'KNOWLEDGE:BLOG_CREATE',
            'KNOWLEDGE:BLOG_READ',
            'KNOWLEDGE:BLOG_UPDATE',
            'KNOWLEDGE:BLOG_DELETE',
            'KNOWLEDGE:BLOG_PUBLISH',
            -- Nu-Fluence: Knowledge Base — Templates
            'KNOWLEDGE:TEMPLATE_CREATE',
            'KNOWLEDGE:TEMPLATE_READ',
            'KNOWLEDGE:TEMPLATE_UPDATE',
            'KNOWLEDGE:TEMPLATE_DELETE',
            -- Nu-Fluence: Knowledge Base — Search & Settings
            'KNOWLEDGE:SEARCH',
            'KNOWLEDGE:SETTINGS_MANAGE'
        )
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
