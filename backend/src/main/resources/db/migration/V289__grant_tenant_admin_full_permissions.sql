-- =============================================================================
-- V289: Grant TENANT_ADMIN the full permission set it requires
-- =============================================================================
-- CONTEXT:
--   The isAdmin bypass in usePermissions.ts previously let TENANT_ADMIN skip
--   explicit permission checks. That bypass is being removed so permissions
--   must be explicit in the DB.
--
--   RoleHierarchy.getTenantAdminPermissions() now builds on getHRAdminPermissions()
--   (itself a superset of HR_MANAGER) plus Nu-Grow and Nu-Fluence permissions.
--   This migration backfills those permissions for every existing tenant that
--   has a TENANT_ADMIN role row.
--
-- SAFETY:
--   All INSERTs use ON CONFLICT DO NOTHING — idempotent, safe to re-run.
--   Only affects rows where the permission code exists in the permissions table.
--   Scope set to 'ALL' — TENANT_ADMIN is the highest intra-tenant role.
-- =============================================================================

-- Helper DO block to bulk-insert permissions across all tenants
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Iterate over every tenant that has a TENANT_ADMIN role
    FOR r IN
        SELECT DISTINCT rl.tenant_id, rl.id AS role_id
        FROM roles rl
        WHERE rl.code = 'TENANT_ADMIN'
          AND (rl.is_deleted = false OR rl.is_deleted IS NULL)
    LOOP
        -- Insert all permissions TENANT_ADMIN should have.
        -- Inherits all HR_ADMIN + HR_MANAGER permissions (leave, attendance,
        -- recruitment, onboarding, exit, letters, payroll, statutory, etc.)
        -- plus Nu-Grow and Nu-Fluence module permissions.
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
            -- ── Core Employee Management ─────────────────────────────────────
            'EMPLOYEE:VIEW_ALL',
            'EMPLOYEE:CREATE',
            'EMPLOYEE:UPDATE',
            'EMPLOYEE:DELETE',
            -- ── Leave Management ─────────────────────────────────────────────
            'LEAVE:APPROVE',
            'LEAVE:VIEW_ALL',
            'LEAVE:MANAGE',
            'LEAVE_TYPE:MANAGE',
            'LEAVE_BALANCE:MANAGE',
            -- ── Attendance Management ────────────────────────────────────────
            'ATTENDANCE:VIEW_ALL',
            'ATTENDANCE:APPROVE',
            'ATTENDANCE:MANAGE',
            -- ── Payroll ──────────────────────────────────────────────────────
            'PAYROLL:VIEW_ALL',
            'PAYROLL:PROCESS',
            'PAYROLL:APPROVE',
            -- ── Time Tracking ────────────────────────────────────────────────
            'TIME_TRACKING:VIEW',
            'TIME_TRACKING:CREATE',
            'TIME_TRACKING:UPDATE',
            'TIME_TRACKING:APPROVE',
            'TIME_TRACKING:VIEW_ALL',
            'TIME_TRACKING:MANAGE',
            -- ── Recruitment ──────────────────────────────────────────────────
            'RECRUITMENT:VIEW',
            'RECRUITMENT:VIEW_ALL',
            'RECRUITMENT:CREATE',
            'RECRUITMENT:MANAGE',
            'CANDIDATE:VIEW',
            'CANDIDATE:EVALUATE',
            -- ── Training & LMS ───────────────────────────────────────────────
            'TRAINING:VIEW',
            'TRAINING:CREATE',
            'TRAINING:APPROVE',
            -- ── Reports & Analytics ──────────────────────────────────────────
            'REPORT:VIEW',
            'REPORT:CREATE',
            'REPORT:SCHEDULE',
            'ANALYTICS:VIEW',
            'ANALYTICS:EXPORT',
            -- ── Documents ────────────────────────────────────────────────────
            'DOCUMENT:APPROVE',
            -- ── Expense & Finance ────────────────────────────────────────────
            'EXPENSE:VIEW_ALL',
            'EXPENSE:APPROVE',
            'STATUTORY:VIEW',
            'STATUTORY:MANAGE',
            'TDS:APPROVE',
            -- ── Onboarding & Offboarding ─────────────────────────────────────
            'ONBOARDING:MANAGE',
            'EXIT:MANAGE',
            -- ── Letters ──────────────────────────────────────────────────────
            'LETTER:GENERATE',
            'LETTER:APPROVE',
            -- ── Benefits, Announcements, Shifts ──────────────────────────────
            'BENEFIT:MANAGE',
            'ANNOUNCEMENT:CREATE',
            'SHIFT:MANAGE',
            'OVERTIME:MANAGE',
            -- ── Wall ─────────────────────────────────────────────────────────
            'WALL:VIEW',
            'WALL:POST',
            'WALL:COMMENT',
            'WALL:REACT',
            'WALL:MANAGE',
            'WALL:PIN',
            -- ── Dashboard ────────────────────────────────────────────────────
            'DASHBOARD:VIEW',
            -- ── PIP ──────────────────────────────────────────────────────────
            'PIP:VIEW',
            'PIP:CREATE',
            'PIP:MANAGE',
            'PIP:CLOSE',
            -- ── Calibration ──────────────────────────────────────────────────
            'CALIBRATION:VIEW',
            'CALIBRATION:MANAGE',
            -- ── Offboarding & FnF ────────────────────────────────────────────
            'OFFBOARDING:VIEW',
            'OFFBOARDING:MANAGE',
            'OFFBOARDING:FNF_CALCULATE',
            -- ── Career Page ──────────────────────────────────────────────────
            'CAREER:VIEW',
            'CAREER:MANAGE',
            -- ── Roles, Users, Settings, Audit ────────────────────────────────
            'ROLE:MANAGE',
            'USER:MANAGE',
            'SETTINGS:VIEW',
            'SETTINGS:UPDATE',
            'AUDIT:VIEW',
            'CUSTOM_FIELD:MANAGE',
            'WORKFLOW:MANAGE',
            'DEPARTMENT:MANAGE',
            'INTEGRATION:MANAGE',
            -- ── Performance Reviews ───────────────────────────────────────────
            'REVIEW:VIEW',
            'REVIEW:APPROVE',
            'REVIEW:CREATE',
            'REVIEW:UPDATE',
            'REVIEW:SUBMIT',
            'REVIEW:DELETE',
            -- ── Nu-Grow: Wellness ────────────────────────────────────────────
            'WELLNESS:VIEW',
            'WELLNESS:CREATE',
            'WELLNESS:MANAGE',
            -- ── Nu-Grow: 1-on-1 Meetings ─────────────────────────────────────
            'MEETING:VIEW',
            'MEETING:CREATE',
            'MEETING:MANAGE',
            -- ── Nu-Grow: Surveys ─────────────────────────────────────────────
            'SURVEY:VIEW',
            'SURVEY:CREATE',
            'SURVEY:UPDATE',
            'SURVEY:DELETE',
            'SURVEY:SUBMIT',
            'SURVEY:MANAGE',
            -- ── Nu-Grow: Goals ───────────────────────────────────────────────
            'GOAL:CREATE',
            'GOAL:VIEW',
            'GOAL:UPDATE',
            'GOAL:DELETE',
            'GOAL:APPROVE',
            -- ── Nu-Grow: OKRs ────────────────────────────────────────────────
            'OKR:VIEW',
            'OKR:CREATE',
            'OKR:UPDATE',
            'OKR:DELETE',
            'OKR:APPROVE',
            'OKR:VIEW_ALL',
            -- ── Nu-Grow: 360 Feedback ─────────────────────────────────────────
            'FEEDBACK_360:VIEW',
            'FEEDBACK_360:CREATE',
            'FEEDBACK_360:SUBMIT',
            'FEEDBACK_360:MANAGE',
            -- ── Nu-Fluence: E-Signature ───────────────────────────────────────
            'ESIGNATURE:VIEW',
            'ESIGNATURE:REQUEST',
            'ESIGNATURE:SIGN',
            'ESIGNATURE:MANAGE',
            -- ── Nu-Fluence: Knowledge Base — Wiki ────────────────────────────
            'KNOWLEDGE:WIKI_CREATE',
            'KNOWLEDGE:WIKI_READ',
            'KNOWLEDGE:WIKI_UPDATE',
            'KNOWLEDGE:WIKI_DELETE',
            'KNOWLEDGE:WIKI_PUBLISH',
            'KNOWLEDGE:WIKI_APPROVE',
            -- ── Nu-Fluence: Knowledge Base — Blog ────────────────────────────
            'KNOWLEDGE:BLOG_CREATE',
            'KNOWLEDGE:BLOG_READ',
            'KNOWLEDGE:BLOG_UPDATE',
            'KNOWLEDGE:BLOG_DELETE',
            'KNOWLEDGE:BLOG_PUBLISH',
            -- ── Nu-Fluence: Knowledge Base — Templates ───────────────────────
            'KNOWLEDGE:TEMPLATE_CREATE',
            'KNOWLEDGE:TEMPLATE_READ',
            'KNOWLEDGE:TEMPLATE_UPDATE',
            'KNOWLEDGE:TEMPLATE_DELETE',
            -- ── Nu-Fluence: Knowledge Base — Search & Settings ────────────────
            'KNOWLEDGE:SEARCH',
            'KNOWLEDGE:SETTINGS_MANAGE',
            -- ── Pre-Boarding (Nu-Hire candidate pre-joining portal) ───────────
            'PREBOARDING:VIEW',
            'PREBOARDING:CREATE',
            'PREBOARDING:MANAGE',
            -- ── Recruitment Agencies (Nu-Hire) ────────────────────────────────
            'AGENCY:VIEW',
            'AGENCY:CREATE',
            'AGENCY:UPDATE',
            'AGENCY:DELETE',
            'AGENCY:MANAGE',
            -- ── Interview Scorecards (Nu-Hire) ────────────────────────────────
            'SCORECARD:VIEW',
            'SCORECARD:CREATE',
            'SCORECARD:DELETE',
            'SCORECARD:TEMPLATE_MANAGE',
            -- ── Employment Contracts ──────────────────────────────────────────
            'CONTRACT:VIEW',
            'CONTRACT:CREATE',
            'CONTRACT:UPDATE',
            'CONTRACT:APPROVE',
            'CONTRACT:SIGN',
            'CONTRACT:DELETE',
            'CONTRACT:TEMPLATE_MANAGE',
            -- ── Employment Changes (salary revisions, promotions, etc.) ────────
            'EMPLOYMENT_CHANGE:VIEW',
            'EMPLOYMENT_CHANGE:VIEW_ALL',
            'EMPLOYMENT_CHANGE:CREATE',
            'EMPLOYMENT_CHANGE:APPROVE',
            'EMPLOYMENT_CHANGE:CANCEL',
            -- ── Loans & Advances ─────────────────────────────────────────────
            'LOAN:VIEW_ALL',
            'LOAN:APPROVE',
            'LOAN:MANAGE',
            'LOAN:UPDATE',
            -- ── Calendar ─────────────────────────────────────────────────────
            'CALENDAR:VIEW',
            'CALENDAR:CREATE',
            'CALENDAR:UPDATE',
            'CALENDAR:DELETE',
            'CALENDAR:MANAGE',
            'CALENDAR:SYNC',
            -- ── Compensation Management ───────────────────────────────────────
            'COMPENSATION:VIEW',
            'COMPENSATION:VIEW_ALL',
            'COMPENSATION:MANAGE',
            'COMPENSATION:APPROVE',
            -- ── Budget Management ─────────────────────────────────────────────
            'BUDGET:VIEW',
            'BUDGET:MANAGE',
            'BUDGET:APPROVE',
            -- ── Headcount Planning ────────────────────────────────────────────
            'HEADCOUNT:VIEW',
            'HEADCOUNT:MANAGE',
            -- ── Probation Management ──────────────────────────────────────────
            'PROBATION:VIEW',
            'PROBATION:VIEW_ALL',
            'PROBATION:MANAGE',
            -- ── Succession & Talent Pool ──────────────────────────────────────
            'SUCCESSION:VIEW',
            'SUCCESSION:MANAGE',
            'TALENT_POOL:VIEW',
            'TALENT_POOL:MANAGE',
            -- ── Payments (gated by app.features.payments flag) ────────────────
            'PAYMENT:VIEW',
            'PAYMENT:INITIATE',
            'PAYMENT:REFUND',
            'PAYMENT:CONFIG_MANAGE'
        )
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ── Field-level permissions (stored in field_permissions table if it exists) ──
-- Grant salary, bank, tax ID field visibility to TENANT_ADMIN across all tenants.
-- Uses DO block to check table existence first so migration is safe on fresh schemas.
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
        WHERE rl.code = 'TENANT_ADMIN'
          AND (rl.is_deleted = false OR rl.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
