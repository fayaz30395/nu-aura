-- ============================================================================
-- V118: Recruitment Agency Portal — agency management + candidate submissions
-- ============================================================================
-- Adds 2 new tables for the NU-Hire recruitment agency portal:
--   1. recruitment_agencies    — external agency profiles and contracts
--   2. agency_submissions      — candidate submissions through agencies
--
-- Also seeds AGENCY permissions and assigns to HR_ADMIN, RECRUITMENT_ADMIN.
-- ============================================================================

-- ============================================================================
-- 1. recruitment_agencies
-- ============================================================================
CREATE TABLE IF NOT EXISTS recruitment_agencies (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL,
    name                VARCHAR(200) NOT NULL,
    contact_person      VARCHAR(200),
    email               VARCHAR(200),
    phone               VARCHAR(50),
    website             VARCHAR(500),
    address             TEXT,
    fee_type            VARCHAR(20) CHECK (fee_type IN ('FIXED', 'PERCENTAGE', 'RETAINER')),
    fee_amount          NUMERIC(15, 2),
    contract_start_date DATE,
    contract_end_date   DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL'
                        CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PENDING_APPROVAL')),
    specializations     TEXT,
    notes               TEXT,
    rating              INTEGER     CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by          UUID,
    updated_by          UUID,
    version             BIGINT      NOT NULL DEFAULT 0,
    is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agency_tenant
    ON recruitment_agencies (tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_agency_tenant_status
    ON recruitment_agencies (tenant_id, status) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_agency_tenant_name
    ON recruitment_agencies (tenant_id, name) WHERE is_deleted = false;

-- ============================================================================
-- 2. agency_submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS agency_submissions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    agency_id       UUID        NOT NULL REFERENCES recruitment_agencies(id),
    candidate_id    UUID        NOT NULL REFERENCES candidates(id),
    job_opening_id  UUID        NOT NULL REFERENCES job_openings(id),
    submitted_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    fee_agreed      NUMERIC(15, 2),
    fee_currency    VARCHAR(3)  NOT NULL DEFAULT 'INR',
    status          VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED'
                    CHECK (status IN ('SUBMITTED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED', 'WITHDRAWN')),
    hired_at        DATE,
    invoice_status  VARCHAR(20) DEFAULT 'NOT_APPLICABLE'
                    CHECK (invoice_status IN ('NOT_APPLICABLE', 'PENDING', 'INVOICED', 'PAID')),
    invoice_amount  NUMERIC(15, 2),
    invoice_date    DATE,
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT      NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_tenant
    ON agency_submissions (tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_submission_tenant_agency
    ON agency_submissions (tenant_id, agency_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_submission_tenant_job
    ON agency_submissions (tenant_id, job_opening_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_submission_tenant_candidate
    ON agency_submissions (tenant_id, candidate_id) WHERE is_deleted = false;

-- ============================================================================
-- 3. Seed agency permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'AGENCY:VIEW', 'View Agencies', 'View recruitment agency details', 'agency', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'AGENCY:CREATE', 'Create Agencies', 'Create new recruitment agencies', 'agency', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'AGENCY:UPDATE', 'Update Agencies', 'Update recruitment agency details', 'agency', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'AGENCY:DELETE', 'Delete Agencies', 'Soft-delete recruitment agencies', 'agency', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'AGENCY:MANAGE', 'Manage Agency Submissions', 'Submit candidates and manage agency workflows', 'agency', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- 4. Assign agency permissions to HR_ADMIN and RECRUITMENT_ADMIN
-- ============================================================================

-- HR_ADMIN: full agency CRUD + manage
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440021',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('AGENCY:VIEW', 'AGENCY:CREATE', 'AGENCY:UPDATE', 'AGENCY:DELETE', 'AGENCY:MANAGE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- RECRUITMENT_ADMIN: full agency CRUD + manage
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000003',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('AGENCY:VIEW', 'AGENCY:CREATE', 'AGENCY:UPDATE', 'AGENCY:DELETE', 'AGENCY:MANAGE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000003'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- HR_MANAGER: view + manage submissions (no delete)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000002',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('AGENCY:VIEW', 'AGENCY:CREATE', 'AGENCY:UPDATE', 'AGENCY:MANAGE')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );
