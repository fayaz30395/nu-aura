-- V135: Add missing columns to expense_claims table
-- Fixes BUG-016: Expense claim approve/save fails with Data Integrity Violation
-- because entity maps columns that don't exist in the DB table.

-- Add title column (entity has @Column(nullable = false, length = 255) @Builder.Default = "")
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '';

-- Add policy_id column
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS policy_id UUID;

-- Add reimbursed_at column
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMPTZ;

-- Add reimbursement_ref column
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS reimbursement_ref VARCHAR(200);

-- Add total_items column (entity has @Builder.Default = 0)
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS total_items INTEGER NOT NULL DEFAULT 0;

-- Add receipt_scan_status column
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS receipt_scan_status VARCHAR(20);

-- Add deleted_at column (used by TenantAware/BaseEntity soft delete)
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
