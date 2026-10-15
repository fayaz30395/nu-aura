-- =============================================================================
-- V307: Seed missing PAYROLL_ADMIN and TENANT_ADMIN role rows + permissions
-- =============================================================================
-- CONTEXT:
--   The roles table for all tenants was missing two role entries:
--     1. PAYROLL_ADMIN — never inserted by any prior seed migration
--     2. TENANT_ADMIN  — V290 renamed ADMIN→TENANT_ADMIN but the demo tenant
--                        was seeded (V19/V49) without an ADMIN row to rename
--
--   Symptoms observed live (2026-06-19):
--     - GET /api/v1/roles returned 8 roles — no PAYROLL_ADMIN or TENANT_ADMIN
--     - V305 PAYROLL_ADMIN permission loop found 0 role rows → inserted nothing
--     - V290 TENANT_ADMIN rename found 0 ADMIN rows → created no TENANT_ADMIN
--
-- WHAT THIS MIGRATION DOES:
--   1. Inserts a PAYROLL_ADMIN role row for every tenant that lacks one
--   2. Inserts a TENANT_ADMIN role row for every tenant that lacks one
--   3. Re-runs the V305 PAYROLL_ADMIN permission loop (now finds rows)
--   4. Re-runs the V289/V290 TENANT_ADMIN permission loop (now finds rows)
--
-- SAFETY:
--   All INSERTs use ON CONFLICT DO NOTHING — idempotent, safe to re-run.
-- =============================================================================

-- ── 1. Insert PAYROLL_ADMIN role for all tenants that lack one ────────────────
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role,
                   created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    t.id,
    'PAYROLL_ADMIN',
    'Payroll Admin',
    'Full payroll, compensation, statutory filings and time-tracking access',
    true,
    NOW(), NOW(), 0, false
FROM tenants t
WHERE t.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM roles r
      WHERE r.tenant_id = t.id
        AND r.code = 'PAYROLL_ADMIN'
        AND (r.is_deleted = false OR r.is_deleted IS NULL)
  )
ON CONFLICT DO NOTHING;

-- ── 2. Insert TENANT_ADMIN role for all tenants that lack one ─────────────────
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role,
                   created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    t.id,
    'TENANT_ADMIN',
    'Tenant Administrator',
    'Full intra-tenant administration — manages all HRMS modules',
    true,
    NOW(), NOW(), 0, false
FROM tenants t
WHERE t.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM roles r
      WHERE r.tenant_id = t.id
        AND r.code = 'TENANT_ADMIN'
        AND (r.is_deleted = false OR r.is_deleted IS NULL)
  )
ON CONFLICT DO NOTHING;

-- ── 3. Grant PAYROLL_ADMIN permissions (mirrors V305 — now finds role rows) ───
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT rl.tenant_id, rl.id AS role_id
        FROM roles rl
        WHERE rl.code = 'PAYROLL_ADMIN'
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
            NOW(), NOW(), 0, false
        FROM permissions p
        WHERE p.code IN (
            'PAYROLL:VIEW_ALL', 'PAYROLL:PROCESS', 'PAYROLL:APPROVE',
            'TIME_TRACKING:VIEW', 'TIME_TRACKING:CREATE', 'TIME_TRACKING:UPDATE',
            'TIME_TRACKING:APPROVE', 'TIME_TRACKING:VIEW_ALL', 'TIME_TRACKING:MANAGE',
            'COMPENSATION:VIEW', 'COMPENSATION:VIEW_ALL', 'COMPENSATION:MANAGE', 'COMPENSATION:APPROVE',
            'STATUTORY:VIEW', 'STATUTORY:MANAGE', 'TDS:APPROVE',
            'GLOBAL_PAYROLL:VIEW', 'GLOBAL_PAYROLL:MANAGE',
            'BENEFIT:MANAGE',
            'EMPLOYEE:VIEW_ALL',
            'REPORT:VIEW', 'REPORT:CREATE', 'REPORT:SCHEDULE',
            'ANALYTICS:VIEW', 'ANALYTICS:EXPORT',
            'LOAN:VIEW_ALL', 'LOAN:APPROVE', 'LOAN:MANAGE', 'LOAN:UPDATE',
            'EXPENSE:VIEW_ALL', 'EXPENSE:APPROVE',
            'BUDGET:VIEW', 'BUDGET:MANAGE', 'BUDGET:APPROVE',
            'DASHBOARD:VIEW',
            'ATTENDANCE:VIEW_ALL',
            'HEADCOUNT:VIEW'
        )
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ── 4. Grant TENANT_ADMIN permissions (mirrors V289/V290 — now finds rows) ────
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
            NOW(), NOW(), 0, false
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
