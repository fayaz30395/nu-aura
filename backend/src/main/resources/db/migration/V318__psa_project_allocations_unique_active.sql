-- Prevent duplicate active PSAProjectAllocation rows for the same
-- (project_id, employee_id) pair — PSAService.allocateResources() had no
-- dedup guard, allowing repeated calls to insert duplicate allocations.
-- Follows the partial-unique-index convention from V48 (WHERE is_active).
CREATE UNIQUE INDEX IF NOT EXISTS uk_psa_project_allocations_project_employee_active
  ON psa_project_allocations (project_id, employee_id)
  WHERE is_active = true;
