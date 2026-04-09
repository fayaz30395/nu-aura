-- V129: Add payroll_recalculation_required flag to employees table
-- NEW-10: Supports flagging employees for payroll recalculation after department transfers

ALTER TABLE employees ADD COLUMN IF NOT EXISTS payroll_recalculation_required BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN employees.payroll_recalculation_required IS 'Flag indicating employee needs payroll recalculation (e.g., after department transfer affecting allowances or statutory deductions)';
