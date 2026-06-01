-- V266: Enforce one active employee row per tenant user.
--
-- Employee.user is modeled as @OneToOne and login/auth context loading expects a
-- single active employee row for each (tenant_id, user_id). Older demo seed
-- repairs could leave duplicate non-deleted rows, which makes Optional<Employee>
-- repository methods throw NonUniqueResultException during login.

WITH ranked_employee_links AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY tenant_id, user_id
               ORDER BY
                   CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END,
                   created_at ASC,
                   id ASC
           ) AS row_rank
    FROM employees
    WHERE is_deleted = false
)
UPDATE employees e
SET is_deleted = true,
    deleted_at = COALESCE(e.deleted_at, NOW()),
    updated_at = NOW(),
    version = COALESCE(e.version, 0) + 1
FROM ranked_employee_links r
WHERE e.id = r.id
  AND r.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_tenant_active_link
    ON employees (user_id, tenant_id)
    WHERE is_deleted = false;
