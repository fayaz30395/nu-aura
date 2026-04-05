-- ============================================================================
-- V116: Interview Scorecards — structured scoring with weighted criteria
-- ============================================================================
-- Adds 4 new tables for the NU-Hire interview scorecard feature:
--   1. scorecard_templates         — reusable scoring templates
--   2. scorecard_template_criteria — criteria definitions within templates
--   3. interview_scorecards        — per-interview evaluations by interviewers
--   4. scorecard_criteria          — individual criterion ratings per scorecard
--
-- Also adds EEOC/diversity self-reported fields to the applicants table.
-- ============================================================================

-- ============================================================================
-- 1. scorecard_templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS scorecard_templates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT      NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scorecard_templates_tenant
    ON scorecard_templates (tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 2. scorecard_template_criteria
-- ============================================================================
CREATE TABLE IF NOT EXISTS scorecard_template_criteria (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    template_id     UUID        NOT NULL REFERENCES scorecard_templates(id),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    weight          DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    order_index     INTEGER,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT      NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_criteria_template
    ON scorecard_template_criteria (template_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_template_criteria_tenant
    ON scorecard_template_criteria (tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 3. interview_scorecards
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_scorecards (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    interview_id    UUID        NOT NULL REFERENCES interviews(id),
    applicant_id    UUID        NOT NULL REFERENCES applicants(id),
    job_opening_id  UUID        NOT NULL REFERENCES job_openings(id),
    interviewer_id  UUID        NOT NULL,
    template_id     UUID        REFERENCES scorecard_templates(id),
    overall_rating  INTEGER     CHECK (overall_rating BETWEEN 1 AND 5),
    recommendation  VARCHAR(20) CHECK (recommendation IN ('STRONG_YES','YES','NEUTRAL','NO','STRONG_NO')),
    overall_notes   TEXT,
    submitted_at    TIMESTAMP,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED')),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT      NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scorecards_tenant
    ON interview_scorecards (tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_scorecards_interview
    ON interview_scorecards (tenant_id, interview_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_scorecards_applicant
    ON interview_scorecards (tenant_id, applicant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_scorecards_interviewer
    ON interview_scorecards (tenant_id, interviewer_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_scorecards_template
    ON interview_scorecards (template_id) WHERE is_deleted = false;

-- Unique constraint: one scorecard per interviewer per interview
CREATE UNIQUE INDEX IF NOT EXISTS uk_scorecards_interview_interviewer
    ON interview_scorecards (interview_id, interviewer_id) WHERE is_deleted = false;

-- ============================================================================
-- 4. scorecard_criteria
-- ============================================================================
CREATE TABLE IF NOT EXISTS scorecard_criteria (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    scorecard_id    UUID        NOT NULL REFERENCES interview_scorecards(id),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    rating          INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    weight          DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    notes           TEXT,
    order_index     INTEGER,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT      NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_criteria_scorecard
    ON scorecard_criteria (scorecard_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_criteria_tenant
    ON scorecard_criteria (tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 5. EEOC / diversity fields on applicants (all nullable — self-reported)
-- ============================================================================
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS gender           VARCHAR(30);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS ethnicity        VARCHAR(50);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS veteran_status   VARCHAR(30);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS disability_status VARCHAR(30);

-- ============================================================================
-- 6. Seed scorecard permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SCORECARD:VIEW', 'View Scorecards', 'View interview scorecards', 'scorecard', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SCORECARD:CREATE', 'Create Scorecards', 'Submit interview scorecards', 'scorecard', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SCORECARD:UPDATE', 'Update Scorecards', 'Edit interview scorecards', 'scorecard', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SCORECARD:DELETE', 'Delete Scorecards', 'Delete interview scorecards', 'scorecard', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SCORECARD:TEMPLATE_MANAGE', 'Manage Scorecard Templates', 'Create/edit scorecard templates', 'scorecard', 'template_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- 7. Assign scorecard permissions to recruitment-related roles
-- ============================================================================

-- HR_MANAGER: full scorecard CRUD + template management
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000002',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SCORECARD:VIEW', 'SCORECARD:CREATE', 'SCORECARD:UPDATE', 'SCORECARD:DELETE', 'SCORECARD:TEMPLATE_MANAGE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- HR_ADMIN: full scorecard CRUD + template management
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440021',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SCORECARD:VIEW', 'SCORECARD:CREATE', 'SCORECARD:UPDATE', 'SCORECARD:DELETE', 'SCORECARD:TEMPLATE_MANAGE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- RECRUITMENT_ADMIN: full scorecard CRUD + template management
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000003',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SCORECARD:VIEW', 'SCORECARD:CREATE', 'SCORECARD:UPDATE', 'SCORECARD:DELETE', 'SCORECARD:TEMPLATE_MANAGE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000003'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- MANAGER: view + create + update scorecards (team scope — can score their own interviews)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440022',
       p.id,
       'TEAM',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SCORECARD:VIEW', 'SCORECARD:CREATE', 'SCORECARD:UPDATE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- TEAM_LEAD: view + create scorecards (team scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000001',
       p.id,
       'TEAM',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SCORECARD:VIEW', 'SCORECARD:CREATE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );
