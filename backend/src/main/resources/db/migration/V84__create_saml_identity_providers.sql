-- V82: Create SAML Identity Provider table for enterprise SSO
-- Each tenant can have one SAML IdP configuration (Okta, Azure AD, OneLogin, etc.)

CREATE TABLE IF NOT EXISTS saml_identity_providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(200) NOT NULL,
    entity_id       VARCHAR(500) NOT NULL,
    sso_url         VARCHAR(1000) NOT NULL,
    slo_url         VARCHAR(1000),
    certificate     TEXT,
    metadata_url    VARCHAR(1000),
    is_active       BOOLEAN NOT NULL DEFAULT false,
    auto_provision_users BOOLEAN NOT NULL DEFAULT false,
    default_role_id UUID,
    attribute_mapping TEXT,
    sp_entity_id    VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    created_by      UUID,
    updated_by      UUID,
    last_modified_by UUID,
    version         BIGINT DEFAULT 0,
    is_deleted      BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_saml_idp_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_saml_idp_default_role FOREIGN KEY (default_role_id)
        REFERENCES roles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saml_idp_tenant ON saml_identity_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saml_idp_entity_id ON saml_identity_providers(entity_id);
CREATE INDEX IF NOT EXISTS idx_saml_idp_active ON saml_identity_providers(tenant_id, is_active);

-- Enable RLS for tenant isolation (consistent with all other tenant-aware tables)
ALTER TABLE saml_identity_providers ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own tenant's SAML config
CREATE POLICY saml_identity_providers_tenant_isolation ON saml_identity_providers
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Add 'SAML' to auth_provider enum if the column uses a CHECK constraint
-- (The AuthProvider enum in Java already has SAML added)
-- Note: If auth_provider is stored as VARCHAR with an enum type, this migration handles it.
-- The User entity uses @Enumerated(EnumType.STRING), so no DB enum type change is needed.

COMMENT ON TABLE saml_identity_providers IS 'SAML 2.0 Identity Provider configurations per tenant for enterprise SSO';
COMMENT ON COLUMN saml_identity_providers.certificate IS 'IdP X.509 signing certificate (PEM), stored encrypted via EncryptionService';
COMMENT ON COLUMN saml_identity_providers.attribute_mapping IS 'JSON mapping of SAML attributes to user fields (email, firstName, lastName, employeeId, department)';
