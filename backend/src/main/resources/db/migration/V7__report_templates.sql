-- V7: Custom report templates for the report builder
CREATE TABLE IF NOT EXISTS report_templates
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
  name VARCHAR
(
  100
) NOT NULL,
  description VARCHAR
(
  500
),
  module VARCHAR
(
  50
) NOT NULL, -- EMPLOYEE, ATTENDANCE, LEAVE, PAYROLL, PERFORMANCE
  selected_columns TEXT NOT NULL, -- JSON array of column names
  filters TEXT, -- JSON array of filter conditions
  sort_by VARCHAR
(
  50
),
  sort_direction VARCHAR
(
  4
) DEFAULT 'ASC',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW
(
),
  updated_at TIMESTAMP DEFAULT NOW
(
),
  is_deleted BOOLEAN DEFAULT FALSE
  );

CREATE INDEX IF NOT EXISTS idx_report_templates_tenant ON report_templates(tenant_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_report_templates_module ON report_templates(tenant_id, module) WHERE NOT is_deleted;
