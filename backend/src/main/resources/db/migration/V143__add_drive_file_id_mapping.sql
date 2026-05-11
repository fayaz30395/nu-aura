-- ============================================================================
-- V143: Map logical object paths to opaque Google Drive file IDs to enforce
-- tenant isolation server-side. (Audit finding 2.1, severity CRITICAL.)
--
-- Background:
--   GoogleDriveStorageProvider previously returned `uploadedFile.getId()` (an
--   opaque Drive fileId like `1nxFEMR9JKa-XmFLi9YIPmZWZ`) as the storage
--   identifier. The tenant isolation guard in FileUploadController
--   (`objectName.startsWith(tenantId + "/")`) NEVER matched against an opaque
--   Drive fileId, so any authenticated user could pass another tenant's
--   fileId and download/delete their files.
--
-- Fix:
--   FileStorageService now returns the LOGICAL path
--   (tenantId/category/entityId/timestamp_uuid.ext) as `objectName`. This
--   table maps the logical path back to the opaque Drive fileId so the
--   provider can still talk to Drive. The startsWith(tenantId+"/") check is
--   now meaningful, and the Drive fileId never leaves the server.
--
-- Note:
--   This migration was originally specified as V130 but that slot was already
--   taken by V130__seed_enable_lms_feature_flag.sql, so it landed in V143.
-- ============================================================================

CREATE TABLE IF NOT EXISTS drive_file_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    object_name VARCHAR(512) NOT NULL,
    drive_file_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_drive_mapping_object_name UNIQUE (object_name),
    CONSTRAINT uk_drive_mapping_drive_id UNIQUE (drive_file_id)
);

CREATE INDEX IF NOT EXISTS idx_drive_mapping_tenant
    ON drive_file_mapping(tenant_id);

CREATE INDEX IF NOT EXISTS idx_drive_mapping_object_name_tenant
    ON drive_file_mapping(tenant_id, object_name);
