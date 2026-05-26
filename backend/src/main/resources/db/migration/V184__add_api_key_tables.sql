-- ============================================================================
-- V184: Add API key tables used by common.security.ApiKey
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_used_ip VARCHAR(50),
  rate_limit INTEGER DEFAULT 1000,
  rate_limit_window_seconds INTEGER DEFAULT 3600
);

CREATE TABLE IF NOT EXISTS api_key_scopes
(
  api_key_id UUID NOT NULL,
  scope VARCHAR(255) NOT NULL,
  PRIMARY KEY (api_key_id, scope),
  CONSTRAINT fk_api_key_scopes_api_key
    FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
