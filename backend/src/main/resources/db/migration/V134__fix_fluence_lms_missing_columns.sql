-- V134__fix_fluence_lms_missing_columns.sql
-- Fix: fluence_activities and knowledge_attachments tables are missing columns
-- that BaseEntity/TenantAware JPA entities expect (updated_at, version, created_by,
-- last_modified_by, deleted_at, etc.). This causes Hibernate to throw 500 errors
-- on SELECT/INSERT because the mapped columns don't exist in the DB.
-- Also seeds the enable_fluence feature flag so non-admin users can access Fluence.
-- Also adds deleted_at to lms_learning_paths which was missed in V128.

-- =============================================================================
-- 1. fluence_activities — add missing BaseEntity columns
-- =============================================================================
ALTER TABLE fluence_activities
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE fluence_activities
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE fluence_activities
  ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE fluence_activities
  ADD COLUMN IF NOT EXISTS last_modified_by UUID;
ALTER TABLE fluence_activities
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE fluence_activities
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- 2. knowledge_attachments — add missing BaseEntity columns + entity fields
-- =============================================================================
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS last_modified_by UUID;
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS object_name VARCHAR (1000);
ALTER TABLE knowledge_attachments
  ADD COLUMN IF NOT EXISTS content_type_enum VARCHAR (20);

-- =============================================================================
-- 3. lms_learning_paths — add deleted_at (missed in V128)
-- =============================================================================
ALTER TABLE lms_learning_paths
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- 4. Seed enable_fluence feature flag for all tenants
-- =============================================================================
INSERT INTO feature_flags (id, tenant_id, feature_key, feature_name, description, enabled, created_at, updated_at)
SELECT gen_random_uuid(),
       t.id,
       'enable_fluence',
       'NU-Fluence',
       'Enable NU-Fluence knowledge management module',
       true,
       NOW(),
       NOW()
FROM tenants t
WHERE NOT EXISTS (SELECT 1
                  FROM feature_flags ff
                  WHERE ff.tenant_id = t.id
                    AND ff.feature_key = 'enable_fluence') ON CONFLICT DO NOTHING;
