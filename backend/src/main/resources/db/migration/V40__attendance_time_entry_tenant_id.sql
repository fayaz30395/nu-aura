-- V40__attendance_time_entry_tenant_id.sql
-- Add tenant_id to attendance_time_entries and backfill from parent attendance_records

-- Step 1: Add column (nullable initially for backfill)
ALTER TABLE attendance_time_entries ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Step 2: Backfill from parent attendance_records
UPDATE attendance_time_entries ate
SET tenant_id = ar.tenant_id
FROM attendance_records ar
WHERE ate.attendance_record_id = ar.id
  AND ate.tenant_id IS NULL;

-- Step 3: Set NOT NULL after backfill
ALTER TABLE attendance_time_entries ALTER COLUMN tenant_id SET NOT NULL;

-- Step 4: Add index for tenant-scoped queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_time_entries_tenant
  ON attendance_time_entries (tenant_id);

-- Step 5: Enable RLS
ALTER TABLE attendance_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_time_entries_allow_all
  ON attendance_time_entries AS PERMISSIVE FOR ALL USING (true);

CREATE POLICY attendance_time_entries_tenant_rls
  ON attendance_time_entries AS RESTRICTIVE FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  );
