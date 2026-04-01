-- V4: Add billing_rate and cost_rate columns to project_employees for resource costing

ALTER TABLE project_employees
    ADD COLUMN IF NOT EXISTS billing_rate NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS cost_rate NUMERIC(10,2);

COMMENT ON COLUMN project_employees.billing_rate IS 'Hourly billing rate charged to client';
COMMENT ON COLUMN project_employees.cost_rate IS 'Internal cost rate for this allocation';
