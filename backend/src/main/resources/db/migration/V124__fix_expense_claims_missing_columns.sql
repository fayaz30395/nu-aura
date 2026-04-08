-- V124: Add missing columns to expense_claims table
-- The ExpenseClaim entity expects these columns but they were never added via migration.
-- Hibernate generates SELECT/INSERT with these columns, causing SQL errors at runtime.

ALTER TABLE expense_claims
  ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS policy_id UUID,
  ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reimbursement_ref VARCHAR(200),
  ADD COLUMN IF NOT EXISTS total_items INTEGER NOT NULL DEFAULT 0;
