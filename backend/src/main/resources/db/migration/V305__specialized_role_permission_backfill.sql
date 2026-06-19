-- =============================================================================
-- V305: Grant PAYROLL_ADMIN, RECRUITMENT_ADMIN, HR_ADMIN full permission sets
-- =============================================================================
-- CONTEXT:
--   Same failure class as TENANT_ADMIN (V289): role_permissions rows for these
--   three roles were seeded via Spring initializer at app startup.  If the
--   initializer ran on a schema version where the permissions table lacked a
--   given code (or the role was added post-deploy), partial seeds silently
--   suppress the DB-fallback in AuthService → roles with empty effective
--   permission maps → 403 everywhere.
--
--   This migration backfills the definitive permission set for all three roles
--   across every tenant, matching RoleHierarchy.get*Permissions().
--
-- SAFETY:
--   All INSERTs use ON CONFLICT DO NOTHING — idempotent, safe to re-run.
--   Only inserts rows where the permission code exists in the permissions table.
--   Scope set to 'ALL'.
-- =============================================================================

-- ── PAYROLL_ADMIN ─────────────────────────────────────────────────────────────
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
            NOW(),
            NOW(),
            0,
            false
        FROM permissions p
        WHERE p.code IN (
            -- Payroll & Compensation
            'PAYROLL:VIEW_ALL',
            'PAYROLL:PROCESS',
            'PAYROLL:APPROVE',
            -- Time Tracking
            'TIME_TRACKING:VIEW',
            'TIME_TRACKING:CREATE',
            'TIME_TRACKING:UPDATE',
            'TIME_TRACKING:APPROVE',
            'TIME_TRACKING:VIEW_ALL',
            'TIME_TRACKING:MANAGE',
            -- Compensation
            'COMPENSATION:VIEW_ALL',
            'COMPENSATION:MANAGE',
            'COMPENSATION:APPROVE',
            -- Statutory
            'STATUTORY:VIEW',
            'STATUTORY:MANAGE',
            'TDS:APPROVE',
            -- Global/Multi-Currency Payroll
            'GLOBAL_PAYROLL:VIEW',
            'GLOBAL_PAYROLL:MANAGE',
            'CURRENCY:MANAGE',
            'EXCHANGE_RATE:MANAGE',
            -- Benefits (financial aspects)
            'BENEFIT:MANAGE',
            'BENEFIT:CLAIM_PROCESS',
            -- Reports
            'REPORT:VIEW',
            'REPORT:CREATE',
            'ANALYTICS:VIEW',
            -- Employee view (needed for payroll processing)
            'EMPLOYEE:VIEW_ALL'
        )
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Field-level permissions for PAYROLL_ADMIN
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'role_field_permissions'
    ) THEN
        INSERT INTO role_field_permissions (
            id, tenant_id, role_id, field_permission, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT
            gen_random_uuid(),
            rl.tenant_id,
            rl.id,
            fp.code,
            'ALL',
            NOW(),
            NOW(),
            0,
            false
        FROM roles rl
        CROSS JOIN (
            VALUES
                ('EMPLOYEE:SALARY_VIEW'),
                ('EMPLOYEE:SALARY_EDIT'),
                ('EMPLOYEE:BANK_VIEW'),
                ('EMPLOYEE:BANK_EDIT'),
                ('EMPLOYEE:TAX_ID_VIEW')
        ) AS fp(code)
        WHERE rl.code = 'PAYROLL_ADMIN'
          AND (rl.is_deleted = false OR rl.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ── RECRUITMENT_ADMIN ─────────────────────────────────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT rl.tenant_id, rl.id AS role_id
        FROM roles rl
        WHERE rl.code = 'RECRUITMENT_ADMIN'
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
            -- Recruitment - Full Access
            'RECRUITMENT:VIEW',
            'RECRUITMENT:CREATE',
            'RECRUITMENT:MANAGE',
            'CANDIDATE:VIEW',
            'CANDIDATE:EVALUATE',
            -- Onboarding
            'ONBOARDING:VIEW',
            'ONBOARDING:CREATE',
            'ONBOARDING:MANAGE',
            -- Referrals
            'REFERRAL:VIEW',
            'REFERRAL:MANAGE',
            -- Documents for candidates
            'DOCUMENT:VIEW',
            'DOCUMENT:UPLOAD',
            -- Letters (Offer letters)
            'LETTER:TEMPLATE_VIEW',
            'LETTER:GENERATE',
            -- Employee view for context
            'EMPLOYEE:VIEW_ALL',
            -- Reports
            'REPORT:VIEW'
        )
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ── HR_ADMIN ──────────────────────────────────────────────────────────────────
-- HR_ADMIN is a superset of HR_MANAGER permissions.
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
            -- ── HR_MANAGER base permissions ───────────────────────────────────
            'EMPLOYEE:VIEW_ALL',
            'EMPLOYEE:CREATE',
            'EMPLOYEE:UPDATE',
            'LEAVE:APPROVE',
            'LEAVE:VIEW_ALL',
            'LEAVE:MANAGE',
            'LEAVE_TYPE:MANAGE',
            'LEAVE_BALANCE:MANAGE',
            'ATTENDANCE:VIEW_ALL',
            'ATTENDANCE:APPROVE',
            'ATTENDANCE:MANAGE',
            'PAYROLL:VIEW_ALL',
            'PAYROLL:PROCESS',
            'TIME_TRACKING:VIEW',
            'TIME_TRACKING:CREATE',
            'TIME_TRACKING:UPDATE',
            'TIME_TRACKING:APPROVE',
            'TIME_TRACKING:VIEW_ALL',
            'TIME_TRACKING:MANAGE',
            'REVIEW:VIEW',
            'REVIEW:APPROVE',
            'RECRUITMENT:VIEW',
            'RECRUITMENT:VIEW_ALL',
            'RECRUITMENT:CREATE',
            'RECRUITMENT:MANAGE',
            'CANDIDATE:VIEW',
            'CANDIDATE:EVALUATE',
            'TRAINING:VIEW',
            'TRAINING:CREATE',
            'TRAINING:APPROVE',
            'REPORT:VIEW',
            'REPORT:CREATE',
            'ANALYTICS:VIEW',
            'DOCUMENT:APPROVE',
            'EXPENSE:VIEW_ALL',
            'EXPENSE:APPROVE',
            'STATUTORY:VIEW',
            'TDS:APPROVE',
            'ONBOARDING:MANAGE',
            'EXIT:MANAGE',
            'LETTER:GENERATE',
            'LETTER:APPROVE',
            'BENEFIT:MANAGE',
            'ANNOUNCEMENT:CREATE',
            'SHIFT:MANAGE',
            'OVERTIME:MANAGE',
            'WALL:VIEW',
            'WALL:POST',
            'WALL:COMMENT',
            'WALL:REACT',
            'WALL:MANAGE',
            'WALL:PIN',
            'DASHBOARD:VIEW',
            'PIP:VIEW',
            'PIP:CREATE',
            'PIP:MANAGE',
            'PIP:CLOSE',
            'CALIBRATION:VIEW',
            'CALIBRATION:MANAGE',
            'OFFBOARDING:VIEW',
            'OFFBOARDING:MANAGE',
            'OFFBOARDING:FNF_CALCULATE',
            'CAREER:VIEW',
            'CAREER:MANAGE',
            'WELLNESS:VIEW',
            'WELLNESS:CREATE',
            'WELLNESS:MANAGE',
            'SURVEY:VIEW',
            'SURVEY:CREATE',
            'SURVEY:UPDATE',
            'SURVEY:MANAGE',
            'FEEDBACK_360:VIEW',
            'FEEDBACK_360:CREATE',
            'FEEDBACK_360:SUBMIT',
            'FEEDBACK_360:MANAGE',
            'MEETING:VIEW',
            'MEETING:CREATE',
            'MEETING:MANAGE',
            'CALENDAR:VIEW',
            'CALENDAR:CREATE',
            'CALENDAR:UPDATE',
            'CALENDAR:MANAGE',
            'SCORECARD:VIEW',
            'SCORECARD:CREATE',
            'PREBOARDING:VIEW',
            'PREBOARDING:CREATE',
            'PREBOARDING:MANAGE',
            'AGENCY:VIEW',
            'AGENCY:CREATE',
            'AGENCY:UPDATE',
            -- ── HR_ADMIN elevated permissions ─────────────────────────────────
            'ROLE:MANAGE',
            'USER:MANAGE',
            'SETTINGS:VIEW',
            'SETTINGS:UPDATE',
            'AUDIT:VIEW',
            'CUSTOM_FIELD:MANAGE',
            'WORKFLOW:MANAGE',
            'DEPARTMENT:MANAGE',
            'STATUTORY:MANAGE',
            'ANALYTICS:EXPORT',
            'REPORT:SCHEDULE',
            'INTEGRATION:MANAGE'
        )
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Field-level permissions for HR_ADMIN
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'role_field_permissions'
    ) THEN
        INSERT INTO role_field_permissions (
            id, tenant_id, role_id, field_permission, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT
            gen_random_uuid(),
            rl.tenant_id,
            rl.id,
            fp.code,
            'ALL',
            NOW(),
            NOW(),
            0,
            false
        FROM roles rl
        CROSS JOIN (
            VALUES
                ('EMPLOYEE:SALARY_VIEW'),
                ('EMPLOYEE:SALARY_EDIT'),
                ('EMPLOYEE:BANK_VIEW'),
                ('EMPLOYEE:BANK_EDIT'),
                ('EMPLOYEE:TAX_ID_VIEW'),
                ('EMPLOYEE:ID_DOCS_VIEW')
        ) AS fp(code)
        WHERE rl.code = 'HR_ADMIN'
          AND (rl.is_deleted = false OR rl.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
