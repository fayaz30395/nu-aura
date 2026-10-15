-- =============================================================================
-- V290: Rename legacy ADMIN role code → TENANT_ADMIN
-- =============================================================================
-- CONTEXT:
--   TenantProvisioningService previously created a role with code='ADMIN' for
--   each self-registered tenant. This role code is not recognised by
--   RoleHierarchy.getDefaultPermissions() (which uses 'TENANT_ADMIN') so the
--   in-memory fallback path returned empty permissions — a complete blackout for
--   every self-registered tenant's admin account.
--
--   V289 likewise no-oped because it searched for roles WHERE code='TENANT_ADMIN'
--   and found none.
--
--   This migration:
--     1. Renames every ADMIN role row to TENANT_ADMIN (idempotent — skips tenants
--        that already have a TENANT_ADMIN row to avoid unique-constraint clash).
--     2. Re-runs the V289 permission backfill so the renamed roles are fully
--        populated.
--
-- SAFETY:
--   All INSERTs use ON CONFLICT DO NOTHING.
--   UPDATE skips any tenant that already has a TENANT_ADMIN row (LEFT JOIN guard).
-- =============================================================================

-- ── 1. Rename ADMIN → TENANT_ADMIN where no TENANT_ADMIN exists yet ──────────
UPDATE roles AS r
SET code        = 'TENANT_ADMIN',
    name        = 'Tenant Administrator',
    description = 'Full intra-tenant administration — manages all HRMS modules',
    updated_at  = NOW()
WHERE r.code = 'ADMIN'
  AND (r.is_deleted = false OR r.is_deleted IS NULL)
  AND NOT EXISTS (
      SELECT 1 FROM roles r2
      WHERE r2.tenant_id = r.tenant_id
        AND r2.code = 'TENANT_ADMIN'
        AND (r2.is_deleted = false OR r2.is_deleted IS NULL)
  );

-- ── 2. Backfill permissions for ALL TENANT_ADMIN roles (including renamed ones) ──
-- Identical to V289 so every permission is present regardless of which version
-- first created the role. ON CONFLICT DO NOTHING keeps it safe to re-run.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT rl.tenant_id, rl.id AS role_id
        FROM roles rl
        WHERE rl.code = 'TENANT_ADMIN'
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
            'EMPLOYEE:VIEW_ALL', 'EMPLOYEE:CREATE', 'EMPLOYEE:UPDATE', 'EMPLOYEE:DELETE',
            'LEAVE:APPROVE', 'LEAVE:VIEW_ALL', 'LEAVE:MANAGE',
            'LEAVE_TYPE:MANAGE', 'LEAVE_BALANCE:MANAGE',
            'ATTENDANCE:VIEW_ALL', 'ATTENDANCE:APPROVE', 'ATTENDANCE:MANAGE',
            'PAYROLL:VIEW_ALL', 'PAYROLL:PROCESS', 'PAYROLL:APPROVE',
            'TIME_TRACKING:VIEW', 'TIME_TRACKING:CREATE', 'TIME_TRACKING:UPDATE',
            'TIME_TRACKING:APPROVE', 'TIME_TRACKING:VIEW_ALL', 'TIME_TRACKING:MANAGE',
            'RECRUITMENT:VIEW', 'RECRUITMENT:VIEW_ALL', 'RECRUITMENT:CREATE', 'RECRUITMENT:MANAGE',
            'CANDIDATE:VIEW', 'CANDIDATE:EVALUATE',
            'TRAINING:VIEW', 'TRAINING:CREATE', 'TRAINING:APPROVE',
            'REPORT:VIEW', 'REPORT:CREATE', 'REPORT:SCHEDULE',
            'ANALYTICS:VIEW', 'ANALYTICS:EXPORT',
            'DOCUMENT:APPROVE',
            'EXPENSE:VIEW_ALL', 'EXPENSE:APPROVE',
            'STATUTORY:VIEW', 'STATUTORY:MANAGE', 'TDS:APPROVE',
            'ONBOARDING:MANAGE', 'EXIT:MANAGE',
            'LETTER:GENERATE', 'LETTER:APPROVE',
            'BENEFIT:MANAGE', 'ANNOUNCEMENT:CREATE', 'SHIFT:MANAGE', 'OVERTIME:MANAGE',
            'WALL:VIEW', 'WALL:POST', 'WALL:COMMENT', 'WALL:REACT', 'WALL:MANAGE', 'WALL:PIN',
            'DASHBOARD:VIEW',
            'PIP:VIEW', 'PIP:CREATE', 'PIP:MANAGE', 'PIP:CLOSE',
            'CALIBRATION:VIEW', 'CALIBRATION:MANAGE',
            'OFFBOARDING:VIEW', 'OFFBOARDING:MANAGE', 'OFFBOARDING:FNF_CALCULATE',
            'CAREER:VIEW', 'CAREER:MANAGE',
            'ROLE:MANAGE', 'USER:MANAGE',
            'SETTINGS:VIEW', 'SETTINGS:UPDATE', 'AUDIT:VIEW',
            'CUSTOM_FIELD:MANAGE', 'WORKFLOW:MANAGE', 'DEPARTMENT:MANAGE', 'INTEGRATION:MANAGE',
            'REVIEW:VIEW', 'REVIEW:APPROVE', 'REVIEW:CREATE', 'REVIEW:UPDATE',
            'REVIEW:SUBMIT', 'REVIEW:DELETE',
            'WELLNESS:VIEW', 'WELLNESS:CREATE', 'WELLNESS:MANAGE',
            'MEETING:VIEW', 'MEETING:CREATE', 'MEETING:MANAGE',
            'SURVEY:VIEW', 'SURVEY:CREATE', 'SURVEY:UPDATE',
            'SURVEY:DELETE', 'SURVEY:SUBMIT', 'SURVEY:MANAGE',
            'GOAL:CREATE', 'GOAL:VIEW', 'GOAL:UPDATE', 'GOAL:DELETE', 'GOAL:APPROVE',
            'OKR:VIEW', 'OKR:CREATE', 'OKR:UPDATE', 'OKR:DELETE', 'OKR:APPROVE', 'OKR:VIEW_ALL',
            'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:SUBMIT', 'FEEDBACK_360:MANAGE',
            'ESIGNATURE:VIEW', 'ESIGNATURE:REQUEST', 'ESIGNATURE:SIGN', 'ESIGNATURE:MANAGE',
            'KNOWLEDGE:WIKI_CREATE', 'KNOWLEDGE:WIKI_READ', 'KNOWLEDGE:WIKI_UPDATE',
            'KNOWLEDGE:WIKI_DELETE', 'KNOWLEDGE:WIKI_PUBLISH', 'KNOWLEDGE:WIKI_APPROVE',
            'KNOWLEDGE:BLOG_CREATE', 'KNOWLEDGE:BLOG_READ', 'KNOWLEDGE:BLOG_UPDATE',
            'KNOWLEDGE:BLOG_DELETE', 'KNOWLEDGE:BLOG_PUBLISH',
            'KNOWLEDGE:TEMPLATE_CREATE', 'KNOWLEDGE:TEMPLATE_READ',
            'KNOWLEDGE:TEMPLATE_UPDATE', 'KNOWLEDGE:TEMPLATE_DELETE',
            'KNOWLEDGE:SEARCH', 'KNOWLEDGE:SETTINGS_MANAGE',
            'PREBOARDING:VIEW', 'PREBOARDING:CREATE', 'PREBOARDING:MANAGE',
            'AGENCY:VIEW', 'AGENCY:CREATE', 'AGENCY:UPDATE', 'AGENCY:DELETE', 'AGENCY:MANAGE',
            'SCORECARD:VIEW', 'SCORECARD:CREATE', 'SCORECARD:DELETE', 'SCORECARD:TEMPLATE_MANAGE',
            'CONTRACT:VIEW', 'CONTRACT:CREATE', 'CONTRACT:UPDATE', 'CONTRACT:APPROVE',
            'CONTRACT:SIGN', 'CONTRACT:DELETE', 'CONTRACT:TEMPLATE_MANAGE',
            'EMPLOYMENT_CHANGE:VIEW', 'EMPLOYMENT_CHANGE:VIEW_ALL',
            'EMPLOYMENT_CHANGE:CREATE', 'EMPLOYMENT_CHANGE:APPROVE', 'EMPLOYMENT_CHANGE:CANCEL',
            'LOAN:VIEW_ALL', 'LOAN:APPROVE', 'LOAN:MANAGE', 'LOAN:UPDATE',
            'CALENDAR:VIEW', 'CALENDAR:CREATE', 'CALENDAR:UPDATE',
            'CALENDAR:DELETE', 'CALENDAR:MANAGE', 'CALENDAR:SYNC',
            'COMPENSATION:VIEW', 'COMPENSATION:VIEW_ALL', 'COMPENSATION:MANAGE', 'COMPENSATION:APPROVE',
            'BUDGET:VIEW', 'BUDGET:MANAGE', 'BUDGET:APPROVE',
            'HEADCOUNT:VIEW', 'HEADCOUNT:MANAGE',
            'PROBATION:VIEW', 'PROBATION:VIEW_ALL', 'PROBATION:MANAGE',
            'SUCCESSION:VIEW', 'SUCCESSION:MANAGE',
            'TALENT_POOL:VIEW', 'TALENT_POOL:MANAGE',
            'PAYMENT:VIEW', 'PAYMENT:INITIATE', 'PAYMENT:REFUND', 'PAYMENT:CONFIG_MANAGE'
        )
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
