-- V41__ai_usage_log.sql
-- AI usage tracking for billing and analytics

CREATE TABLE IF NOT EXISTS ai_usage_log
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
  user_id UUID,
  feature VARCHAR
(
  100
) NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC
(
  10,
  6
) DEFAULT 0,
  model_name VARCHAR
(
  100
),
  request_metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  created_by UUID,
  updated_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
  );

CREATE INDEX idx_ai_usage_log_tenant ON ai_usage_log (tenant_id);
CREATE INDEX idx_ai_usage_log_tenant_created ON ai_usage_log (tenant_id, created_at DESC);
CREATE INDEX idx_ai_usage_log_feature ON ai_usage_log (tenant_id, feature);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE
POLICY ai_usage_log_allow_all
  ON ai_usage_log AS PERMISSIVE FOR ALL USING (true);

CREATE
POLICY ai_usage_log_tenant_rls
  ON ai_usage_log AS RESTRICTIVE FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  );
