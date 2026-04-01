-- V82: Create Restricted Holidays feature tables
-- Restricted holidays are optional holidays employees can choose from a predefined list.

-- ─── restricted_holidays ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restricted_holidays (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    holiday_name    VARCHAR(200) NOT NULL,
    holiday_date    DATE NOT NULL,
    description     TEXT,
    holiday_category VARCHAR(50) DEFAULT 'RELIGIOUS',
    applicable_regions TEXT,
    applicable_departments TEXT,
    year            INTEGER NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_restricted_holidays_tenant_id ON restricted_holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_restricted_holidays_date ON restricted_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_restricted_holidays_year ON restricted_holidays(year);
CREATE INDEX IF NOT EXISTS idx_restricted_holidays_tenant_year ON restricted_holidays(tenant_id, year);

-- ─── restricted_holiday_selections ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restricted_holiday_selections (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL,
    employee_id             UUID NOT NULL,
    restricted_holiday_id   UUID NOT NULL REFERENCES restricted_holidays(id),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by             UUID,
    approved_at             TIMESTAMP,
    rejection_reason        VARCHAR(500),
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              UUID,
    updated_by              UUID,
    version                 BIGINT DEFAULT 0,
    CONSTRAINT uk_rhs_employee_holiday UNIQUE (tenant_id, employee_id, restricted_holiday_id)
);

CREATE INDEX IF NOT EXISTS idx_rhs_tenant_id ON restricted_holiday_selections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rhs_employee_id ON restricted_holiday_selections(employee_id);
CREATE INDEX IF NOT EXISTS idx_rhs_holiday_id ON restricted_holiday_selections(restricted_holiday_id);
CREATE INDEX IF NOT EXISTS idx_rhs_status ON restricted_holiday_selections(status);

-- ─── restricted_holiday_policies ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restricted_holiday_policies (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL,
    max_selections_per_year     INTEGER NOT NULL DEFAULT 3,
    requires_approval           BOOLEAN NOT NULL DEFAULT TRUE,
    applicable_departments      TEXT,
    year                        INTEGER NOT NULL,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    min_days_before_selection   INTEGER DEFAULT 7,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at                  TIMESTAMP,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  UUID,
    updated_by                  UUID,
    version                     BIGINT DEFAULT 0,
    CONSTRAINT uk_rhp_tenant_year UNIQUE (tenant_id, year)
);

CREATE INDEX IF NOT EXISTS idx_rhp_tenant_id ON restricted_holiday_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rhp_year ON restricted_holiday_policies(year);

-- ─── RLS Policies ───────────────────────────────────────────────────────────
ALTER TABLE restricted_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricted_holiday_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricted_holiday_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY restricted_holidays_tenant_isolation ON restricted_holidays
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY restricted_holiday_selections_tenant_isolation ON restricted_holiday_selections
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY restricted_holiday_policies_tenant_isolation ON restricted_holiday_policies
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ─── Seed permissions ───────────────────────────────────────────────────────
-- Restricted holiday permissions use LEAVE module since they fall under leave management
-- No new permission constants needed; LEAVE:MANAGE (admin) and LEAVE:APPROVE (manager) cover the use cases
