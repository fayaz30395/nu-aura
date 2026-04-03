-- R2-015 FIX: Add composite index on attendance_records for common per-employee,
-- per-date range queries.
--
-- Without this index, queries like "get all attendance for employee X in month Y"
-- require a full table scan filtered only by tenant_id. On large datasets (millions
-- of rows across tenants) this causes significant query latency.
--
-- The index covers the three most common filter columns in order of selectivity:
--   1. tenant_id   — eliminates all other tenants immediately
--   2. employee_id — narrows to one person
--   3. attendance_date — date range within that employee's records
--
-- CONCURRENTLY ensures the index is built without locking writes on the table.
-- IF NOT EXISTS prevents failure on re-runs.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_records_tenant_employee_date
  ON attendance_records (tenant_id, employee_id, attendance_date);
