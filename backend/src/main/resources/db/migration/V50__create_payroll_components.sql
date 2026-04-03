-- V48: Add formula-based payroll components with SpEL evaluation support
-- Components reference each other via formulas and are evaluated in DAG order.
-- Circular dependency detection is enforced at the application layer.

CREATE TABLE payroll_components
(
  id               UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL,
  code             VARCHAR(50)  NOT NULL,
  name             VARCHAR(100) NOT NULL,
  component_type   VARCHAR(30)  NOT NULL,
  formula          VARCHAR(500),
  default_value    NUMERIC(12, 2),
  evaluation_order INTEGER      NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  is_taxable       BOOLEAN      NOT NULL DEFAULT TRUE,
  description      VARCHAR(500),
  created_at       TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT now(),
  created_by       UUID,
  updated_by       UUID,
  version          BIGINT       NOT NULL DEFAULT 0,
  is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,

  CONSTRAINT uq_payroll_comp_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_payroll_comp_type CHECK (component_type IN ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'))
);

CREATE INDEX idx_payroll_comp_tenant ON payroll_components (tenant_id);
CREATE INDEX idx_payroll_comp_type ON payroll_components (tenant_id, component_type);
CREATE INDEX idx_payroll_comp_order ON payroll_components (tenant_id, evaluation_order);

-- Enable RLS for tenant isolation
ALTER TABLE payroll_components ENABLE ROW LEVEL SECURITY;

CREATE
POLICY payroll_components_tenant_isolation ON payroll_components
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT
ON TABLE payroll_components IS 'Formula-based salary components evaluated in dependency order (DAG). Circular dependencies are detected at the application layer via topological sort.';
COMMENT
ON COLUMN payroll_components.code IS 'Unique identifier within tenant, referenced in other components formulas (e.g., basic, hra, pf_employee)';
COMMENT
ON COLUMN payroll_components.formula IS 'SpEL expression referencing other component codes (e.g., basic * 0.4). NULL means value is provided directly.';
COMMENT
ON COLUMN payroll_components.evaluation_order IS 'Computed by topological sort. Lower values are evaluated first (no dependencies).';
