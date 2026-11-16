-- Positive-control support: reviewer = Alpha SUPER_ADMIN's auto-created employee (review access is relationship-gated), plus an Alpha salary structure.
UPDATE performance_reviews SET reviewer_id='a964966a-bd45-4be4-8880-11a592ff884a' WHERE id='a1fa0000-0000-4000-8000-000000000a41';
INSERT INTO salary_structures (id, tenant_id, employee_id, effective_date, basic_salary, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a70','a1fa0000-0000-4000-8000-00000000a1fa','a1fa0000-0000-4000-8000-000000000a01', date '2025-01-06', 777777.00, false, 0)
ON CONFLICT (id) DO NOTHING;
