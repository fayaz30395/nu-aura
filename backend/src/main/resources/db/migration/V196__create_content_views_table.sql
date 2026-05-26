CREATE TABLE IF NOT EXISTS content_views
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  view_duration_seconds INTEGER,
  view_source VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_content_view_unique UNIQUE (tenant_id, content_type, content_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_content_view_content
  ON content_views (tenant_id, content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_content_view_employee
  ON content_views (tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_content_view_created
  ON content_views (tenant_id, created_at);

ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;
