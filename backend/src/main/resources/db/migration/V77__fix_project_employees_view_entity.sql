-- V77: Fix ProjectEmployee entity mapping for project_employees VIEW
--
-- Root cause: ProjectEmployee extended TenantAware -> BaseEntity which added
-- columns (created_by, updated_by, version, is_deleted, deleted_at) that do
-- not exist in the project_employees VIEW (created in V55).
--
-- Fix: The Java entity was changed to a standalone class with only the columns
-- present in the view. No database changes are needed.
--
-- If a previous failed V77 entry exists in flyway_schema_history, run:
--   flyway repair
-- before applying this migration.

SELECT 1;
