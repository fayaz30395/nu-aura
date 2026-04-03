-- F-28: Add unique constraint on (employee_id, effective_from) in shift_assignments
-- Prevents duplicate active shift assignments for the same employee on the same date.

ALTER TABLE shift_assignments
    ADD CONSTRAINT uq_shift_assignment_employee_effective
        UNIQUE (employee_id, effective_from);
