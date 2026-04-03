-- =====================================================================
-- Contract Management Module - Database Schema
-- =====================================================================

-- Enums for Contract Management
CREATE TYPE contract_type AS ENUM ('EMPLOYMENT', 'VENDOR', 'NDA', 'SLA', 'FREELANCER', 'OTHER');
CREATE TYPE contract_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_SIGNATURES', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED');
CREATE TYPE signature_status AS ENUM ('PENDING', 'SIGNED', 'DECLINED');
CREATE TYPE signer_role AS ENUM ('EMPLOYEE', 'MANAGER', 'HR', 'LEGAL', 'VENDOR');
CREATE TYPE reminder_type AS ENUM ('EXPIRY', 'RENEWAL', 'REVIEW');

-- =====================================================================
-- contracts table
-- =====================================================================
CREATE TABLE contracts
(
  id                  UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
  tenant_id           UUID            NOT NULL,
  title               VARCHAR(255)    NOT NULL,
  type                contract_type   NOT NULL DEFAULT 'OTHER',
  status              contract_status NOT NULL DEFAULT 'DRAFT',
  employee_id         UUID,
  vendor_name         VARCHAR(255),
  start_date          DATE            NOT NULL,
  end_date            DATE,
  auto_renew          BOOLEAN                  DEFAULT FALSE,
  renewal_period_days INTEGER,
  value               DECIMAL(15, 2),
  currency            VARCHAR(3)               DEFAULT 'USD',
  description         TEXT,
  terms               JSONB,
  document_url        VARCHAR(500),
  created_by          UUID,
  updated_by          UUID,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version             BIGINT                   DEFAULT 1,
  is_deleted          BOOLEAN                  DEFAULT FALSE,
  CONSTRAINT fk_contracts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_contracts_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
  CONSTRAINT check_contract_dates CHECK (start_date <= COALESCE(end_date, start_date)),
  CONSTRAINT check_contract_value CHECK (value IS NULL OR value >= 0)
);

CREATE INDEX idx_contracts_tenant_id ON contracts (tenant_id);
CREATE INDEX idx_contracts_employee_id ON contracts (employee_id);
CREATE INDEX idx_contracts_status ON contracts (status);
CREATE INDEX idx_contracts_type ON contracts (type);
CREATE INDEX idx_contracts_start_date ON contracts (start_date);
CREATE INDEX idx_contracts_end_date ON contracts (end_date);
CREATE INDEX idx_contracts_is_deleted ON contracts (is_deleted);

-- Row Level Security for contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE
POLICY contracts_tenant_isolation ON contracts
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================================
-- contract_versions table - For audit trail and version history
-- =====================================================================
CREATE TABLE contract_versions
(
  id             UUID PRIMARY KEY   DEFAULT gen_random_uuid(),
  contract_id    UUID      NOT NULL,
  version_number INTEGER   NOT NULL,
  content        JSONB     NOT NULL,
  change_notes   TEXT,
  created_by     UUID,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contract_versions_contract FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
  CONSTRAINT unique_contract_version UNIQUE (contract_id, version_number)
);

CREATE INDEX idx_contract_versions_contract_id ON contract_versions (contract_id);
CREATE INDEX idx_contract_versions_created_at ON contract_versions (created_at);

-- Row Level Security for contract_versions
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
CREATE
POLICY contract_versions_isolation ON contract_versions
    USING (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.current_tenant_id')::uuid))
    WITH CHECK (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));

-- =====================================================================
-- contract_signatures table - For tracking signature status
-- =====================================================================
CREATE TABLE contract_signatures
(
  id                  UUID PRIMARY KEY          DEFAULT gen_random_uuid(),
  contract_id         UUID             NOT NULL,
  signer_id           UUID,
  signer_name         VARCHAR(255)     NOT NULL,
  signer_email        VARCHAR(255)     NOT NULL,
  signer_role         signer_role      NOT NULL DEFAULT 'EMPLOYEE',
  status              signature_status NOT NULL DEFAULT 'PENDING',
  signed_at           TIMESTAMP,
  signature_image_url VARCHAR(500),
  ip_address          VARCHAR(45),
  created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contract_signatures_contract FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE
);

CREATE INDEX idx_contract_signatures_contract_id ON contract_signatures (contract_id);
CREATE INDEX idx_contract_signatures_status ON contract_signatures (status);
CREATE INDEX idx_contract_signatures_signer_email ON contract_signatures (signer_email);
CREATE INDEX idx_contract_signatures_created_at ON contract_signatures (created_at);

-- Row Level Security for contract_signatures
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;
CREATE
POLICY contract_signatures_isolation ON contract_signatures
    USING (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.current_tenant_id')::uuid))
    WITH CHECK (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));

-- =====================================================================
-- contract_templates table - For reusable contract templates
-- =====================================================================
CREATE TABLE contract_templates
(
  id         UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
  tenant_id  UUID          NOT NULL,
  name       VARCHAR(255)  NOT NULL,
  type       contract_type NOT NULL DEFAULT 'OTHER',
  content    JSONB         NOT NULL,
  is_active  BOOLEAN                DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contract_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX idx_contract_templates_tenant_id ON contract_templates (tenant_id);
CREATE INDEX idx_contract_templates_type ON contract_templates (type);
CREATE INDEX idx_contract_templates_is_active ON contract_templates (is_active);

-- Row Level Security for contract_templates
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
CREATE
POLICY contract_templates_tenant_isolation ON contract_templates
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================================
-- contract_reminders table - For managing contract reminders
-- =====================================================================
CREATE TABLE contract_reminders
(
  id            UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
  contract_id   UUID          NOT NULL,
  reminder_date DATE          NOT NULL,
  reminder_type reminder_type NOT NULL,
  is_completed  BOOLEAN                DEFAULT FALSE,
  notified_at   TIMESTAMP,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contract_reminders_contract FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE
);

CREATE INDEX idx_contract_reminders_contract_id ON contract_reminders (contract_id);
CREATE INDEX idx_contract_reminders_reminder_date ON contract_reminders (reminder_date);
CREATE INDEX idx_contract_reminders_reminder_type ON contract_reminders (reminder_type);
CREATE INDEX idx_contract_reminders_is_completed ON contract_reminders (is_completed);

-- Row Level Security for contract_reminders
ALTER TABLE contract_reminders ENABLE ROW LEVEL SECURITY;
CREATE
POLICY contract_reminders_isolation ON contract_reminders
    USING (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.current_tenant_id')::uuid))
    WITH CHECK (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));
