-- V63__implicit_roles_and_escalation.sql
-- RBAC KEKA Parity: Implicit Roles, Role Hierarchy, Auto-Escalation

-- 1. Implicit Role Rules
CREATE TABLE implicit_role_rules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL,
    rule_name         VARCHAR(255) NOT NULL,
    description       TEXT,
    condition_type    VARCHAR(50) NOT NULL,
    target_role_id    UUID NOT NULL,
    scope             VARCHAR(20) NOT NULL DEFAULT 'TEAM',
    priority          INT NOT NULL DEFAULT 0 CHECK (priority >= 0),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        UUID,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by        UUID,
    version           BIGINT DEFAULT 0,
    CONSTRAINT fk_irr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_irr_role FOREIGN KEY (target_role_id) REFERENCES roles(id),
    CONSTRAINT uk_implicit_rule UNIQUE (tenant_id, condition_type, target_role_id)
);

CREATE INDEX idx_irr_tenant_active ON implicit_role_rules(tenant_id, is_active);
CREATE INDEX idx_irr_target_role ON implicit_role_rules(target_role_id, is_active);

ALTER TABLE implicit_role_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_implicit_role_rules ON implicit_role_rules
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 2. Implicit User Roles
CREATE TABLE implicit_user_roles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL,
    user_id                 UUID NOT NULL,
    role_id                 UUID NOT NULL,
    scope                   VARCHAR(20) NOT NULL,
    derived_from_rule_id    UUID NOT NULL,
    derived_from_context    VARCHAR(500),
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by              UUID,
    version                 BIGINT DEFAULT 0,
    CONSTRAINT fk_iur_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_iur_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_iur_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_iur_rule FOREIGN KEY (derived_from_rule_id) REFERENCES implicit_role_rules(id),
    CONSTRAINT uk_implicit_user_role UNIQUE (tenant_id, user_id, role_id, scope)
);

CREATE INDEX idx_iur_user_active ON implicit_user_roles(user_id, is_active);
CREATE INDEX idx_iur_tenant_active ON implicit_user_roles(tenant_id, is_active);

ALTER TABLE implicit_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_implicit_user_roles ON implicit_user_roles
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 3. Approval Escalation Config
CREATE TABLE approval_escalation_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL,
    workflow_definition_id  UUID NOT NULL,
    timeout_hours           INT NOT NULL DEFAULT 48 CHECK (timeout_hours > 0),
    escalation_type         VARCHAR(30) NOT NULL DEFAULT 'SKIP_LEVEL_MANAGER',
    fallback_role_id        UUID,
    fallback_user_id        UUID,
    max_escalations         INT NOT NULL DEFAULT 2 CHECK (max_escalations >= 1 AND max_escalations <= 10),
    notify_on_escalation    BOOLEAN NOT NULL DEFAULT TRUE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by              UUID,
    version                 BIGINT DEFAULT 0,
    CONSTRAINT fk_aec_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_aec_workflow FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id),
    CONSTRAINT fk_aec_fallback_role FOREIGN KEY (fallback_role_id) REFERENCES roles(id),
    CONSTRAINT fk_aec_fallback_user FOREIGN KEY (fallback_user_id) REFERENCES users(id),
    CONSTRAINT uk_escalation_workflow UNIQUE (tenant_id, workflow_definition_id)
);

ALTER TABLE approval_escalation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_approval_escalation_config ON approval_escalation_config
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 4. Role Hierarchy: Add parent_role_id to roles
ALTER TABLE roles ADD COLUMN parent_role_id UUID;
ALTER TABLE roles ADD CONSTRAINT fk_roles_parent FOREIGN KEY (parent_role_id) REFERENCES roles(id);
CREATE INDEX idx_roles_parent ON roles(parent_role_id) WHERE parent_role_id IS NOT NULL;
