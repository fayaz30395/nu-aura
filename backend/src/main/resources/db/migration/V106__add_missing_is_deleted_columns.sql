-- V105: Add missing is_deleted column to tables that predate the soft-delete standard.
-- Uses IF NOT EXISTS to be safe on fresh installs where V0 already created the column.

ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE overtime_records
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Also add deleted_at for overtime_records (entity has this field mapped)
ALTER TABLE overtime_records
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE training_programs
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to speed up the soft-delete filter on hot tables
CREATE INDEX IF NOT EXISTS idx_assets_not_deleted ON assets (tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_overtime_records_not_deleted ON overtime_records (tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_training_programs_not_deleted ON training_programs (tenant_id) WHERE is_deleted = false;
