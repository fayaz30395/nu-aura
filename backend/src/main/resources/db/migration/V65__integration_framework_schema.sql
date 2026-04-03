-- ============================================================================
-- V65: Integration Framework Schema
-- Creates tables for integration connectors, events, DocuSign support, and
-- seeds integration permissions for demo tenant.
-- ============================================================================

-- =============================================================================
-- SECTION A: CREATE TABLES
-- =============================================================================

-- 1. integration_connector_configs
--    Stores configuration for each integration connector (e.g., DocuSign, Slack)
--    per tenant. One connector type per tenant (enforced by UNIQUE constraint).
CREATE TABLE integration_connector_configs
(
  id                   UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
  tenant_id            UUID         NOT NULL,
  connector_id         VARCHAR(50)  NOT NULL,
  display_name         VARCHAR(255) NOT NULL,
  config_json          TEXT         NOT NULL,
  status               VARCHAR(20)  NOT NULL DEFAULT 'INACTIVE',
  event_subscriptions  TEXT,
  last_health_check_at TIMESTAMPTZ,
  last_error_message   TEXT,
  is_deleted           BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_icc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT uk_connector_per_tenant UNIQUE (tenant_id, connector_id)
);

-- 2. integration_event_log
--    Audit log for all integration events (API calls, webhook receipts, etc.)
CREATE TABLE integration_event_log
(
  id            UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL,
  connector_id  VARCHAR(50)  NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50),
  entity_id     UUID,
  status        VARCHAR(20)  NOT NULL,
  error_message TEXT,
  duration_ms   INT,
  metadata_json TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_iel_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

-- 3. docusign_envelopes
--    Tracks DocuSign envelope instances (each envelope = one signing request)
CREATE TABLE docusign_envelopes
(
  id                  UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
  tenant_id           UUID         NOT NULL,
  envelope_id         VARCHAR(100) NOT NULL,
  entity_type         VARCHAR(50)  NOT NULL,
  entity_id           UUID         NOT NULL,
  status              VARCHAR(30)  NOT NULL DEFAULT 'CREATED',
  recipients_json     TEXT,
  signed_document_url VARCHAR(500),
  error_message       TEXT,
  sent_at             TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  is_deleted          BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_de_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT uk_docusign_envelope UNIQUE (tenant_id, envelope_id)
);

-- 4. docusign_template_mappings
--    Maps document types in NU-AURA to DocuSign template IDs
CREATE TABLE docusign_template_mappings
(
  id                   UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
  tenant_id            UUID         NOT NULL,
  document_type        VARCHAR(50)  NOT NULL,
  docusign_template_id VARCHAR(100) NOT NULL,
  description          TEXT,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted           BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_dtm_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT uk_template_mapping UNIQUE (tenant_id, document_type)
);

-- =============================================================================
-- SECTION B: CREATE INDEXES
-- =============================================================================

-- Indexes for integration_connector_configs
CREATE INDEX idx_icc_tenant_id ON integration_connector_configs (tenant_id);
CREATE INDEX idx_icc_connector_id ON integration_connector_configs (connector_id);
CREATE INDEX idx_icc_status ON integration_connector_configs (status);
CREATE INDEX idx_icc_is_deleted ON integration_connector_configs (is_deleted);

-- Indexes for integration_event_log
CREATE INDEX idx_iel_tenant_id ON integration_event_log (tenant_id);
CREATE INDEX idx_iel_connector_id ON integration_event_log (connector_id);
CREATE INDEX idx_iel_entity_type ON integration_event_log (entity_type);
CREATE INDEX idx_iel_entity_id ON integration_event_log (entity_id);
CREATE INDEX idx_iel_status ON integration_event_log (status);
CREATE INDEX idx_iel_created_at ON integration_event_log (created_at);

-- Indexes for docusign_envelopes
CREATE INDEX idx_de_tenant_id ON docusign_envelopes (tenant_id);
CREATE INDEX idx_de_envelope_id ON docusign_envelopes (envelope_id);
CREATE INDEX idx_de_entity_type ON docusign_envelopes (entity_type);
CREATE INDEX idx_de_entity_id ON docusign_envelopes (entity_id);
CREATE INDEX idx_de_status ON docusign_envelopes (status);
CREATE INDEX idx_de_is_deleted ON docusign_envelopes (is_deleted);

-- Indexes for docusign_template_mappings
CREATE INDEX idx_dtm_tenant_id ON docusign_template_mappings (tenant_id);
CREATE INDEX idx_dtm_document_type ON docusign_template_mappings (document_type);
CREATE INDEX idx_dtm_is_active ON docusign_template_mappings (is_active);
CREATE INDEX idx_dtm_is_deleted ON docusign_template_mappings (is_deleted);

-- =============================================================================
-- SECTION C: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE integration_connector_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE docusign_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE docusign_template_mappings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION D: CREATE RLS POLICIES (PERMISSIVE allow-all baseline)
-- =============================================================================
-- These PERMISSIVE policies allow all rows by default (for Flyway, background jobs).
-- RESTRICTIVE policies from V36 will enforce tenant isolation when session var is set.

CREATE
POLICY integration_connector_configs_allow_all ON integration_connector_configs
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY integration_event_log_allow_all ON integration_event_log
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY docusign_envelopes_allow_all ON docusign_envelopes
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY docusign_template_mappings_allow_all ON docusign_template_mappings
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- SECTION E: CREATE RESTRICTIVE RLS POLICIES (Tenant isolation)
-- =============================================================================
-- These RESTRICTIVE policies enforce tenant isolation when app.current_tenant_id is set,
-- but gracefully allow all rows when not set (Flyway, background jobs).
-- Pattern from V36: allow-all if session var is NULL or empty string.

CREATE
POLICY integration_connector_configs_tenant_rls ON integration_connector_configs
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

CREATE
POLICY integration_event_log_tenant_rls ON integration_event_log
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

CREATE
POLICY docusign_envelopes_tenant_rls ON docusign_envelopes
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

CREATE
POLICY docusign_template_mappings_tenant_rls ON docusign_template_mappings
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- =============================================================================
-- SECTION F: SEED INTEGRATION PERMISSIONS
-- =============================================================================
-- Seed two permissions: integration.read and integration.manage
-- DB format: lowercase dot-separated (module.action)

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000501',
        'integration.read',
        'View Integrations',
        'View integration connectors and event logs',
        'integration',
        'read',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000502',
        'integration.manage',
        'Manage Integrations',
        'Create, configure, and manage integration connectors',
        'integration',
        'manage',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION G: GRANT PERMISSIONS TO ROLES
-- =============================================================================
-- Grant INTEGRATION:MANAGE to SUPER_ADMIN and TENANT_ADMIN
-- Grant INTEGRATION:READ to SUPER_ADMIN, TENANT_ADMIN, and HR_MANAGER

-- 1. Grant integration.manage to SUPER_ADMIN (if roles exist in demo tenant)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
       JOIN permissions p ON p.code = 'integration.manage'
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'SUPER_ADMIN' ON CONFLICT DO NOTHING;

-- 2. Grant integration.manage to TENANT_ADMIN
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
       JOIN permissions p ON p.code = 'integration.manage'
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'TENANT_ADMIN' ON CONFLICT DO NOTHING;

-- 3. Grant integration.read to SUPER_ADMIN
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
       JOIN permissions p ON p.code = 'integration.read'
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'SUPER_ADMIN' ON CONFLICT DO NOTHING;

-- 4. Grant integration.read to TENANT_ADMIN
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
       JOIN permissions p ON p.code = 'integration.read'
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'TENANT_ADMIN' ON CONFLICT DO NOTHING;

-- 5. Grant integration.read to HR_MANAGER
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       r.id,
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
       JOIN permissions p ON p.code = 'integration.read'
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'HR_MANAGER' ON CONFLICT DO NOTHING;
