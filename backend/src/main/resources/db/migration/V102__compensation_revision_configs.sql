-- V101: Create compensation_revision_configs table for rating-to-increment mappings
-- Used by PerformanceCompensationListener to auto-generate draft salary revisions

CREATE TABLE IF NOT EXISTS compensation_revision_configs
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
  rating_label VARCHAR
(
  50
) NOT NULL,
  min_increment_pct DECIMAL
(
  5,
  2
),
  max_increment_pct DECIMAL
(
  5,
  2
),
  default_increment_pct DECIMAL
(
  5,
  2
) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW
(
) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW
(
) NOT NULL,
  created_by UUID,
  updated_by UUID,
  version BIGINT DEFAULT 0,
  UNIQUE
(
  tenant_id,
  rating_label
)
  );

CREATE INDEX idx_comp_rev_config_tenant ON compensation_revision_configs (tenant_id);
CREATE INDEX idx_comp_rev_config_rating ON compensation_revision_configs (tenant_id, rating_label);
