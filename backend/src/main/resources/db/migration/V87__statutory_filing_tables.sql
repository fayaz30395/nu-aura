-- V82: Statutory Filing Format Generation tables
-- Supports PF ECR, ESI Return, PT Challan, Form 16, Form 24Q, LWF Return

-- ─── Statutory Filing Templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS statutory_filing_templates
(
  id
  UUID
  PRIMARY
  KEY
  DEFAULT
  gen_random_uuid
(
),
  tenant_id UUID NOT NULL,
  filing_type VARCHAR
(
  30
) NOT NULL,
  name VARCHAR
(
  100
) NOT NULL,
  description VARCHAR
(
  500
),
  format VARCHAR
(
  10
) NOT NULL,
  template_version VARCHAR
(
  20
) DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT now
(
),
  created_by UUID,
  last_modified_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP,
  CONSTRAINT uq_sft_tenant_type UNIQUE
(
  tenant_id,
  filing_type
)
  );

CREATE INDEX IF NOT EXISTS idx_sft_tenant ON statutory_filing_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sft_type ON statutory_filing_templates(tenant_id, filing_type);

-- ─── Statutory Filing Runs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS statutory_filing_runs
(
  id
  UUID
  PRIMARY
  KEY
  DEFAULT
  gen_random_uuid
(
),
  tenant_id UUID NOT NULL,
  filing_type VARCHAR
(
  30
) NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  status VARCHAR
(
  20
) NOT NULL DEFAULT 'DRAFT',
  generated_by UUID NOT NULL,
  generated_at TIMESTAMP,
  file_storage_path VARCHAR
(
  500
),
  file_name VARCHAR
(
  200
),
  content_type VARCHAR
(
  50
),
  file_size BIGINT,
  validation_errors TEXT,
  total_records INTEGER,
  submitted_at TIMESTAMP,
  submitted_by UUID,
  remarks TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT now
(
),
  created_by UUID,
  last_modified_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP
  );

CREATE INDEX IF NOT EXISTS idx_sfr_tenant ON statutory_filing_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sfr_tenant_type_period ON statutory_filing_runs(tenant_id, filing_type, period_month, period_year);
CREATE INDEX IF NOT EXISTS idx_sfr_status ON statutory_filing_runs(tenant_id, status);

-- ─── Enable RLS ──────────────────────────────────────────────────────────────
ALTER TABLE statutory_filing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_filing_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies (tenant isolation)
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statutory_filing_templates' AND policyname = 'sft_tenant_isolation') THEN
        CREATE
POLICY sft_tenant_isolation ON statutory_filing_templates
            USING (tenant_id = current_setting('app.current_tenant')::uuid);
END IF;

    IF
NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statutory_filing_runs' AND policyname = 'sfr_tenant_isolation') THEN
        CREATE
POLICY sfr_tenant_isolation ON statutory_filing_runs
            USING (tenant_id = current_setting('app.current_tenant')::uuid);
END IF;
END $$;

-- ─── Seed Filing Template Configurations (for demo tenant) ──────────────────
-- These are inserted per-tenant; in production, run this for each tenant or via onboarding
INSERT INTO statutory_filing_templates (tenant_id, filing_type, name, description, format, template_version)
SELECT t.id, ft.filing_type, ft.name, ft.description, ft.format, '1.0'
FROM (VALUES ('PF_ECR', 'PF ECR', 'Electronic Challan-cum-Return for EPFO portal upload', 'TEXT'),
             ('ESI_RETURN', 'ESI Return', 'Employee State Insurance monthly contribution return', 'EXCEL'),
             ('PT_CHALLAN', 'Professional Tax Challan', 'State-level Professional Tax payment challan', 'CSV'),
             ('FORM_16', 'Form 16', 'Annual TDS certificate for employees (Income Tax)', 'PDF'),
             ('FORM_24Q', 'Form 24Q', 'Quarterly TDS return for salary payments', 'EXCEL'),
             ('LWF_RETURN', 'LWF Return', 'Labour Welfare Fund semi-annual contribution return',
              'CSV')) AS ft(filing_type, name, description, format)
       CROSS JOIN (SELECT DISTINCT id
                   FROM statutory_filing_templates
                   UNION
                   SELECT id
                   FROM (SELECT gen_random_uuid() AS id WHERE FALSE) AS empty) AS t(id)
WHERE FALSE;
-- Disabled by default; enable per tenant during onboarding

-- Seed permissions for statutory filing management
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'STATUTORY:FILING_VIEW', 'Statutory Filing View', 'View statutory filing reports',
        'STATUTORY', 'FILING_VIEW', now(), now(), 0, false),
       (gen_random_uuid(), 'STATUTORY:FILING_GENERATE', 'Statutory Filing Generate',
        'Generate statutory filing reports', 'STATUTORY', 'FILING_GENERATE', now(), now(), 0, false),
       (gen_random_uuid(), 'STATUTORY:FILING_SUBMIT', 'Statutory Filing Submit', 'Submit statutory filings to portals',
        'STATUTORY', 'FILING_SUBMIT', now(), now(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;
