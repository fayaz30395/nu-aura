-- Create keka_import_history table expected by KekaImportHistory.

CREATE TABLE IF NOT EXISTS keka_import_history
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
  file_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  total_rows INTEGER NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  duration BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  uploaded_by VARCHAR(36) NOT NULL,
  error_summary TEXT,
  mapping_config TEXT
);

CREATE INDEX IF NOT EXISTS idx_keka_import_tenant ON keka_import_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_keka_import_status ON keka_import_history(status);
CREATE INDEX IF NOT EXISTS idx_keka_import_uploaded_by ON keka_import_history(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_keka_import_uploaded_at ON keka_import_history(uploaded_at);

ALTER TABLE keka_import_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keka_import_history_tenant_isolation ON keka_import_history;
CREATE POLICY keka_import_history_tenant_isolation ON keka_import_history
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
