-- =============================================================================
-- V82: Expense Management Extension
-- Adds expense categories (table), policies, items, and advances
-- =============================================================================

-- ─── Expense Categories (tenant-configurable, replaces hard-coded enum) ──────
CREATE TABLE IF NOT EXISTS expense_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    max_amount      NUMERIC(12, 2),
    requires_receipt BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    parent_category_id UUID,
    gl_code         VARCHAR(50),
    icon_name       VARCHAR(50),
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT DEFAULT 0,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    CONSTRAINT uk_expense_cat_tenant_name UNIQUE (tenant_id, name),
    CONSTRAINT fk_expense_cat_parent FOREIGN KEY (parent_category_id)
        REFERENCES expense_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_cat_tenant ON expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_cat_tenant_active ON expense_categories(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_expense_cat_parent ON expense_categories(parent_category_id);

-- ─── Expense Policies ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_policies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL,
    name                    VARCHAR(150) NOT NULL,
    description             VARCHAR(500),
    applicable_departments  TEXT,
    applicable_designations TEXT,
    daily_limit             NUMERIC(12, 2),
    monthly_limit           NUMERIC(12, 2),
    yearly_limit            NUMERIC(12, 2),
    single_claim_limit      NUMERIC(12, 2),
    requires_pre_approval   BOOLEAN NOT NULL DEFAULT FALSE,
    pre_approval_threshold  NUMERIC(12, 2),
    receipt_required_above  NUMERIC(12, 2),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    currency                VARCHAR(3) DEFAULT 'INR',
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              UUID,
    updated_by              UUID,
    version                 BIGINT DEFAULT 0,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP,
    CONSTRAINT uk_expense_policy_tenant_name UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_policy_tenant ON expense_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_policy_tenant_active ON expense_policies(tenant_id, is_active);

-- ─── Expense Items (line items per claim) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_claim_id    UUID NOT NULL,
    category_id         UUID,
    legacy_category     VARCHAR(50),
    description         VARCHAR(500) NOT NULL,
    amount              NUMERIC(12, 2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    expense_date        DATE NOT NULL,
    receipt_storage_path VARCHAR(1000),
    receipt_file_name   VARCHAR(255),
    merchant_name       VARCHAR(200),
    is_billable         BOOLEAN NOT NULL DEFAULT FALSE,
    project_code        VARCHAR(50),
    notes               VARCHAR(1000),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID,
    updated_by          UUID,
    version             BIGINT DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP,
    CONSTRAINT fk_expense_item_claim FOREIGN KEY (expense_claim_id)
        REFERENCES expense_claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_expense_item_category FOREIGN KEY (category_id)
        REFERENCES expense_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_item_claim ON expense_items(expense_claim_id);
CREATE INDEX IF NOT EXISTS idx_expense_item_category ON expense_items(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_item_date ON expense_items(expense_date);

-- ─── Expense Advances ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_advances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    employee_id         UUID NOT NULL,
    amount              NUMERIC(12, 2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    purpose             VARCHAR(500) NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    requested_at        TIMESTAMP,
    approved_by         UUID,
    approved_at         TIMESTAMP,
    disbursed_at        TIMESTAMP,
    settled_at          TIMESTAMP,
    settlement_claim_id UUID,
    notes               VARCHAR(1000),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          UUID,
    updated_by          UUID,
    version             BIGINT DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP,
    CONSTRAINT fk_expense_advance_settlement FOREIGN KEY (settlement_claim_id)
        REFERENCES expense_claims(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_adv_tenant ON expense_advances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_adv_tenant_employee ON expense_advances(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_adv_status ON expense_advances(status);

-- ─── Alter expense_claims: add new columns ───────────────────────────────────
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '';
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMP;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS reimbursement_ref VARCHAR(200);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0;

-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_advances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expense_categories_tenant_isolation') THEN
        CREATE POLICY expense_categories_tenant_isolation ON expense_categories
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expense_policies_tenant_isolation') THEN
        CREATE POLICY expense_policies_tenant_isolation ON expense_policies
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expense_advances_tenant_isolation') THEN
        CREATE POLICY expense_advances_tenant_isolation ON expense_advances
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
    END IF;
END $$;

-- ─── Seed Default Expense Categories ─────────────────────────────────────────
-- These are seeded into every existing tenant. New tenants get them via onboarding.
INSERT INTO expense_categories (tenant_id, name, description, requires_receipt, icon_name, sort_order)
SELECT t.id, cat.name, cat.description, cat.requires_receipt, cat.icon_name, cat.sort_order
FROM (SELECT id FROM tenants WHERE is_deleted = FALSE) t
CROSS JOIN (VALUES
    ('Travel',         'Transportation, flights, fuel',       TRUE,  'Plane',        1),
    ('Meals',          'Food and dining expenses',            FALSE, 'UtensilsCrossed', 2),
    ('Accommodation',  'Hotels, lodging during travel',       TRUE,  'Hotel',        3),
    ('Equipment',      'Hardware, tools, peripherals',        TRUE,  'Monitor',      4),
    ('Software',       'Software licenses, subscriptions',    TRUE,  'Code',         5),
    ('Training',       'Courses, certifications, conferences',TRUE,  'GraduationCap',6),
    ('Miscellaneous',  'Other business expenses',             FALSE, 'MoreHorizontal',7)
) AS cat(name, description, requires_receipt, icon_name, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM expense_categories ec WHERE ec.tenant_id = t.id AND ec.name = cat.name
);

-- ─── Seed Expense Permissions ────────────────────────────────────────────────
-- Add EXPENSE:SETTINGS permission for settings management
INSERT INTO permissions (id, name, module, action, description, created_at, updated_at)
SELECT gen_random_uuid(), 'expense.settings', 'expense', 'settings',
       'Manage expense settings (categories, policies)', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'expense.settings');

INSERT INTO permissions (id, name, module, action, description, created_at, updated_at)
SELECT gen_random_uuid(), 'expense.advance_manage', 'expense', 'advance_manage',
       'Manage expense advances (approve, disburse)', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'expense.advance_manage');

INSERT INTO permissions (id, name, module, action, description, created_at, updated_at)
SELECT gen_random_uuid(), 'expense.report', 'expense', 'report',
       'View expense reports and analytics', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'expense.report');
