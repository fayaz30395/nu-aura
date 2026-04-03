-- V108: Add missing start_date and end_date columns to review_cycles
-- Root cause: V0__init.sql CREATE TABLE review_cycles omitted these columns
-- that the ReviewCycle JPA entity maps (startDate, endDate fields).
-- Without these columns, any INSERT/UPDATE on review_cycles fails with
-- "column start_date does not exist" from PostgreSQL.

ALTER TABLE review_cycles
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_review_cycles_dates
  ON review_cycles (tenant_id, start_date, end_date)
  WHERE is_deleted = false;
