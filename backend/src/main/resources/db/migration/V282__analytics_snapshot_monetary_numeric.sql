-- P1-2 (wave-10 audit): currency precision hardening.
-- Monetary aggregates on analytics_snapshots were stored as DOUBLE PRECISION,
-- which cannot represent decimal currency amounts exactly. All transactional
-- money columns in the schema are already numeric(15,2); this aligns the
-- analytics aggregates with that standard. Values are rounded HALF-UP to 2dp.

ALTER TABLE analytics_snapshots
    ALTER COLUMN cost_per_hire      TYPE numeric(15, 2) USING round(cost_per_hire::numeric, 2),
    ALTER COLUMN total_payroll_cost TYPE numeric(15, 2) USING round(total_payroll_cost::numeric, 2),
    ALTER COLUMN average_salary     TYPE numeric(15, 2) USING round(average_salary::numeric, 2),
    ALTER COLUMN median_salary      TYPE numeric(15, 2) USING round(median_salary::numeric, 2),
    ALTER COLUMN salary_range_min   TYPE numeric(15, 2) USING round(salary_range_min::numeric, 2),
    ALTER COLUMN salary_range_max   TYPE numeric(15, 2) USING round(salary_range_max::numeric, 2),
    ALTER COLUMN training_cost      TYPE numeric(15, 2) USING round(training_cost::numeric, 2);
