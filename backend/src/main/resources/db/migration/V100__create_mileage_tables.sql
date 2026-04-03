-- V100: Create mileage tracking tables for GAP-006

-- Mileage policies table
CREATE TABLE IF NOT EXISTS mileage_policies
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
  200
) NOT NULL,
  rate_per_km NUMERIC
(
  6,
  2
) NOT NULL,
  max_daily_km NUMERIC
(
  8,
  2
),
  max_monthly_km NUMERIC
(
  8,
  2
),
  vehicle_rates JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  created_by VARCHAR
(
  255
),
  last_modified_by VARCHAR
(
  255
),
  version BIGINT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP,
  CONSTRAINT uk_mileage_policy_tenant_name UNIQUE
(
  tenant_id,
  name
)
  );

CREATE INDEX idx_mileage_policy_tenant ON mileage_policies (tenant_id);
CREATE INDEX idx_mileage_policy_tenant_active ON mileage_policies (tenant_id, is_active);

-- Mileage logs table
CREATE TABLE IF NOT EXISTS mileage_logs
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
  employee_id UUID NOT NULL,
  travel_date DATE NOT NULL,
  from_location VARCHAR
(
  500
) NOT NULL,
  to_location VARCHAR
(
  500
) NOT NULL,
  distance_km NUMERIC
(
  8,
  2
) NOT NULL,
  purpose VARCHAR
(
  1000
),
  vehicle_type VARCHAR
(
  30
) NOT NULL DEFAULT 'CAR',
  rate_per_km NUMERIC
(
  6,
  2
),
  reimbursement_amount NUMERIC
(
  10,
  2
),
  status VARCHAR
(
  20
) NOT NULL DEFAULT 'DRAFT',
  expense_claim_id UUID,
  approved_by UUID,
  approved_at TIMESTAMP,
  rejection_reason VARCHAR
(
  500
),
  notes VARCHAR
(
  1000
),
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  created_by VARCHAR
(
  255
),
  last_modified_by VARCHAR
(
  255
),
  version BIGINT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP
  );

CREATE INDEX idx_mileage_log_tenant ON mileage_logs (tenant_id);
CREATE INDEX idx_mileage_log_tenant_employee ON mileage_logs (tenant_id, employee_id);
CREATE INDEX idx_mileage_log_status ON mileage_logs (status);
CREATE INDEX idx_mileage_log_tenant_status ON mileage_logs (tenant_id, status);
CREATE INDEX idx_mileage_log_travel_date ON mileage_logs (travel_date);
CREATE INDEX idx_mileage_log_expense_claim ON mileage_logs (expense_claim_id);

-- Add MILEAGE to expense category enum if the column is an enum type
-- Since ExpenseCategory is stored as VARCHAR via @Enumerated(EnumType.STRING), no ALTER TYPE needed.
-- The TRANSPORT category will be used for auto-generated expense claims from mileage logs.
