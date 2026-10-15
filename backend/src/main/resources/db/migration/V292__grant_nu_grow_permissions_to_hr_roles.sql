-- =============================================================================
-- V292: Grant Nu-Grow / Nu-Fluence management permissions to HR_MANAGER and HR_ADMIN
-- =============================================================================
-- CONTEXT:
--   V107 and earlier role-permission repair migrations hard-coded the NuLogic
--   demo tenant UUID (660e8400-...). Any self-registered tenant gets NO Nu-Grow
--   permissions (WELLNESS, SURVEY, FEEDBACK_360, CALENDAR management) for
--   HR_MANAGER/HR_ADMIN because those grants only targeted the demo tenant row.
--
--   The RoleHierarchy in-memory fallback path also lacks these permissions for
--   HR_MANAGER and HR_ADMIN (only TENANT_ADMIN has them). If the DB fallback is
--   triggered (role exists but has 0 role_permissions rows), HR_MANAGER gets 403
--   on wellness/survey/feedback endpoints.
--
-- APPROACH:
--   Tenant-agnostic grant using role_code JOIN — identical to V267 pattern.
--   All INSERTs use NOT EXISTS guard for idempotency.
--
-- PERMISSION RATIONALE:
--   HR_MANAGER   — manages employee wellness, surveys, 360 feedback cycles,
--                  calendar events, recruitment agencies and scorecards
--   HR_ADMIN     — superset of HR_MANAGER (everything above + create/delete ops)
--   RECRUITMENT_ADMIN — agencies + scorecards (core recruiting tools)
-- =============================================================================

-- ── 1. Ensure all required permission codes exist in the permissions table ──────
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'WELLNESS:CREATE',          'Wellness Create',          'Create wellness programs',             'wellness',     'create',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'WELLNESS:MANAGE',          'Wellness Manage',          'Manage wellness programs',             'wellness',     'manage',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'SURVEY:UPDATE',            'Survey Update',            'Update surveys',                       'survey',       'update',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'SURVEY:DELETE',            'Survey Delete',            'Delete surveys',                       'survey',       'delete',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'CALENDAR:CREATE',          'Calendar Create',          'Create calendar events',               'calendar',     'create',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'CALENDAR:UPDATE',          'Calendar Update',          'Update calendar events',               'calendar',     'update',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'CALENDAR:DELETE',          'Calendar Delete',          'Delete calendar events',               'calendar',     'delete',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'CALENDAR:SYNC',            'Calendar Sync',            'Sync external calendar',               'calendar',     'sync',     NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'MEETING:VIEW',             'Meeting View',             'View one-on-one meetings',             'meeting',      'view',     NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'MEETING:CREATE',           'Meeting Create',           'Create one-on-one meetings',           'meeting',      'create',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'MEETING:MANAGE',           'Meeting Manage',           'Manage one-on-one meetings',           'meeting',      'manage',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'SCORECARD:VIEW',           'Scorecard View',           'View interview scorecards',            'scorecard',    'view',     NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'SCORECARD:CREATE',         'Scorecard Create',         'Create interview scorecards',          'scorecard',    'create',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'SCORECARD:DELETE',         'Scorecard Delete',         'Delete interview scorecards',          'scorecard',    'delete',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'SCORECARD:TEMPLATE_MANAGE','Scorecard Template Manage','Manage scorecard templates',           'scorecard',    'manage',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'PREBOARDING:VIEW',         'Preboarding View',         'View preboarding tasks',               'preboarding',  'view',     NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'PREBOARDING:CREATE',       'Preboarding Create',       'Create preboarding tasks',             'preboarding',  'create',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'PREBOARDING:MANAGE',       'Preboarding Manage',       'Manage preboarding workflows',         'preboarding',  'manage',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'AGENCY:VIEW',              'Agency View',              'View recruitment agencies',            'agency',       'view',     NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'AGENCY:CREATE',            'Agency Create',            'Create recruitment agencies',          'agency',       'create',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'AGENCY:UPDATE',            'Agency Update',            'Update recruitment agencies',          'agency',       'update',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'AGENCY:DELETE',            'Agency Delete',            'Delete recruitment agencies',          'agency',       'delete',   NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'AGENCY:MANAGE',            'Agency Manage',            'Full management of agencies',          'agency',       'manage',   NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ── 2. Tenant-agnostic role permission grants ─────────────────────────────────
WITH nu_grow_grants(role_code, permission_code, scope) AS (
  VALUES
    -- HR_MANAGER: wellness, surveys, calendar, 360 feedback management
    ('HR_MANAGER', 'WELLNESS:VIEW',               'ALL'),
    ('HR_MANAGER', 'WELLNESS:CREATE',             'ALL'),
    ('HR_MANAGER', 'WELLNESS:MANAGE',             'ALL'),
    ('HR_MANAGER', 'SURVEY:VIEW',                 'ALL'),
    ('HR_MANAGER', 'SURVEY:CREATE',               'ALL'),
    ('HR_MANAGER', 'SURVEY:UPDATE',               'ALL'),
    ('HR_MANAGER', 'SURVEY:MANAGE',               'ALL'),
    ('HR_MANAGER', 'FEEDBACK_360:VIEW',           'ALL'),
    ('HR_MANAGER', 'FEEDBACK_360:CREATE',         'ALL'),
    ('HR_MANAGER', 'FEEDBACK_360:SUBMIT',         'ALL'),
    ('HR_MANAGER', 'FEEDBACK_360:MANAGE',         'ALL'),
    ('HR_MANAGER', 'CALENDAR:VIEW',               'ALL'),
    ('HR_MANAGER', 'CALENDAR:CREATE',             'ALL'),
    ('HR_MANAGER', 'CALENDAR:UPDATE',             'ALL'),
    ('HR_MANAGER', 'CALENDAR:MANAGE',             'ALL'),
    ('HR_MANAGER', 'MEETING:VIEW',                'ALL'),
    ('HR_MANAGER', 'MEETING:CREATE',              'ALL'),
    ('HR_MANAGER', 'MEETING:MANAGE',              'ALL'),
    ('HR_MANAGER', 'SCORECARD:VIEW',              'ALL'),
    ('HR_MANAGER', 'SCORECARD:CREATE',            'ALL'),
    ('HR_MANAGER', 'PREBOARDING:VIEW',            'ALL'),
    ('HR_MANAGER', 'PREBOARDING:CREATE',          'ALL'),
    ('HR_MANAGER', 'PREBOARDING:MANAGE',          'ALL'),
    ('HR_MANAGER', 'AGENCY:VIEW',                 'ALL'),
    ('HR_MANAGER', 'AGENCY:CREATE',               'ALL'),
    ('HR_MANAGER', 'AGENCY:UPDATE',               'ALL'),

    -- HR_ADMIN: superset — everything HR_MANAGER gets plus delete/template ops
    ('HR_ADMIN', 'WELLNESS:VIEW',                 'ALL'),
    ('HR_ADMIN', 'WELLNESS:CREATE',               'ALL'),
    ('HR_ADMIN', 'WELLNESS:MANAGE',               'ALL'),
    ('HR_ADMIN', 'SURVEY:VIEW',                   'ALL'),
    ('HR_ADMIN', 'SURVEY:CREATE',                 'ALL'),
    ('HR_ADMIN', 'SURVEY:UPDATE',                 'ALL'),
    ('HR_ADMIN', 'SURVEY:DELETE',                 'ALL'),
    ('HR_ADMIN', 'SURVEY:MANAGE',                 'ALL'),
    ('HR_ADMIN', 'FEEDBACK_360:VIEW',             'ALL'),
    ('HR_ADMIN', 'FEEDBACK_360:CREATE',           'ALL'),
    ('HR_ADMIN', 'FEEDBACK_360:SUBMIT',           'ALL'),
    ('HR_ADMIN', 'FEEDBACK_360:MANAGE',           'ALL'),
    ('HR_ADMIN', 'CALENDAR:VIEW',                 'ALL'),
    ('HR_ADMIN', 'CALENDAR:CREATE',               'ALL'),
    ('HR_ADMIN', 'CALENDAR:UPDATE',               'ALL'),
    ('HR_ADMIN', 'CALENDAR:DELETE',               'ALL'),
    ('HR_ADMIN', 'CALENDAR:MANAGE',               'ALL'),
    ('HR_ADMIN', 'CALENDAR:SYNC',                 'ALL'),
    ('HR_ADMIN', 'MEETING:VIEW',                  'ALL'),
    ('HR_ADMIN', 'MEETING:CREATE',                'ALL'),
    ('HR_ADMIN', 'MEETING:MANAGE',                'ALL'),
    ('HR_ADMIN', 'SCORECARD:VIEW',                'ALL'),
    ('HR_ADMIN', 'SCORECARD:CREATE',              'ALL'),
    ('HR_ADMIN', 'SCORECARD:DELETE',              'ALL'),
    ('HR_ADMIN', 'SCORECARD:TEMPLATE_MANAGE',     'ALL'),
    ('HR_ADMIN', 'PREBOARDING:VIEW',              'ALL'),
    ('HR_ADMIN', 'PREBOARDING:CREATE',            'ALL'),
    ('HR_ADMIN', 'PREBOARDING:MANAGE',            'ALL'),
    ('HR_ADMIN', 'AGENCY:VIEW',                   'ALL'),
    ('HR_ADMIN', 'AGENCY:CREATE',                 'ALL'),
    ('HR_ADMIN', 'AGENCY:UPDATE',                 'ALL'),
    ('HR_ADMIN', 'AGENCY:DELETE',                 'ALL'),
    ('HR_ADMIN', 'AGENCY:MANAGE',                 'ALL'),

    -- RECRUITMENT_ADMIN: agencies and scorecards are core recruiting tools
    ('RECRUITMENT_ADMIN', 'SCORECARD:VIEW',       'ALL'),
    ('RECRUITMENT_ADMIN', 'SCORECARD:CREATE',     'ALL'),
    ('RECRUITMENT_ADMIN', 'SCORECARD:TEMPLATE_MANAGE', 'ALL'),
    ('RECRUITMENT_ADMIN', 'PREBOARDING:VIEW',     'ALL'),
    ('RECRUITMENT_ADMIN', 'PREBOARDING:CREATE',   'ALL'),
    ('RECRUITMENT_ADMIN', 'AGENCY:VIEW',          'ALL'),
    ('RECRUITMENT_ADMIN', 'AGENCY:CREATE',        'ALL'),
    ('RECRUITMENT_ADMIN', 'AGENCY:UPDATE',        'ALL'),
    ('RECRUITMENT_ADMIN', 'AGENCY:MANAGE',        'ALL')
)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    r.tenant_id,
    r.id,
    p.id,
    g.scope,
    NOW(),
    NOW(),
    0,
    false
FROM nu_grow_grants g
JOIN roles r
  ON r.code = g.role_code
 AND (r.is_deleted = false OR r.is_deleted IS NULL)
JOIN permissions p
  ON p.code = g.permission_code
 AND (p.is_deleted = false OR p.is_deleted IS NULL)
WHERE NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id     = r.id
      AND rp.permission_id = p.id
      AND rp.tenant_id   = r.tenant_id
      AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
);
