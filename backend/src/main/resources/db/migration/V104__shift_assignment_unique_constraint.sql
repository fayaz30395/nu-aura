-- F-28: Add unique constraint on (employee_id, effective_from) in shift_assignments
-- Idempotent: deduplicates first, skips constraint creation if it already exists.

DO
$$
BEGIN
    -- Step 1: Remove duplicate rows, keeping the most recently updated per (employee_id, effective_from)
WITH ranked AS (SELECT id,
                       ROW_NUMBER() OVER (
                   PARTITION BY employee_id, effective_from
                   ORDER BY updated_at DESC NULLS LAST, id DESC
               ) AS rn
                FROM shift_assignments)
DELETE
FROM shift_assignments
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: Add unique constraint only if it doesn't already exist
IF
NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_shift_assignment_employee_effective'
          AND conrelid = 'shift_assignments'::regclass
    ) THEN
ALTER TABLE shift_assignments
  ADD CONSTRAINT uq_shift_assignment_employee_effective
    UNIQUE (employee_id, effective_from);
END IF;

EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists from a prior partial run — safe to ignore
        NULL;
END $$;
