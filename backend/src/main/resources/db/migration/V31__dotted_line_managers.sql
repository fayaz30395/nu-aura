-- V31: Add optional dotted-line manager columns to employees table
-- Supports matrix reporting structures with up to 2 dotted-line managers per employee.
-- These are informational only — they do NOT participate in approval workflows.

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS dotted_line_manager1_id UUID,
    ADD COLUMN IF NOT EXISTS dotted_line_manager2_id UUID;

CREATE INDEX IF NOT EXISTS idx_employee_dotted_mgr1 ON employees(dotted_line_manager1_id);
CREATE INDEX IF NOT EXISTS idx_employee_dotted_mgr2 ON employees(dotted_line_manager2_id);

COMMENT ON COLUMN employees.dotted_line_manager1_id IS 'Optional first dotted-line manager (matrix reporting, informational only)';
COMMENT ON COLUMN employees.dotted_line_manager2_id IS 'Optional second dotted-line manager (matrix reporting, informational only)';
