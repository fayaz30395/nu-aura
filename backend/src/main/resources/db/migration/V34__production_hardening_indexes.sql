-- =============================================================================
-- V34: Production Hardening — Missing Indexes, Tenant Isolation, Soft-Delete
-- =============================================================================
-- Addresses audit findings:
--   DB-004: Missing FK indexes on high-volume tables
--   DB-005: Join tables missing tenant_id
--   DB-007: No indexes on is_deleted for soft-delete queries
--   DB-009: JSONB columns missing GIN indexes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- DB-004: Missing Foreign Key Indexes on High-Volume Tables
-- ---------------------------------------------------------------------------
-- Without these, JOINs on FK columns force sequential scans.
-- All indexes use CONCURRENTLY to avoid write locks in production.

-- audit_logs: frequently queried by entity and actor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_id
    ON audit_logs (entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor_id
    ON audit_logs (actor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_action
    ON audit_logs (tenant_id, action, created_at DESC);

-- notifications: queried by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
    ON notifications (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_user_read
    ON notifications (tenant_id, user_id, is_read, created_at DESC);

-- webhook_deliveries: queried by webhook
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_deliveries_webhook_id
    ON webhook_deliveries (webhook_id);

-- compliance_audit_logs: queried by entity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_audit_entity
    ON compliance_audit_logs (entity_type, entity_id);

-- leave_balances: queried by employee + leave type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_balances_tenant_emp_type
    ON leave_balances (tenant_id, employee_id, leave_type_id);

-- approval_tasks: queried by assignee and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_tasks_assignee_status
    ON approval_tasks (tenant_id, assignee_id, status);

-- approval_instances: queried by entity reference
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_instances_entity
    ON approval_instances (tenant_id, entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- DB-005: Add tenant_id to Junction Tables
-- ---------------------------------------------------------------------------
-- user_roles and app_role_permissions lack tenant_id, creating a cross-tenant
-- permission leakage risk. Adding tenant_id with default NULL first, then
-- backfilling from the parent table.

-- user_roles: add tenant_id
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill user_roles.tenant_id from users table
UPDATE user_roles ur
SET tenant_id = u.tenant_id
FROM users u
WHERE ur.user_id = u.id
  AND ur.tenant_id IS NULL;

-- Index for tenant-scoped role lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_tenant
    ON user_roles (tenant_id);

-- app_role_permissions: add tenant_id
ALTER TABLE app_role_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill app_role_permissions.tenant_id from roles table
UPDATE app_role_permissions arp
SET tenant_id = r.tenant_id
FROM roles r
WHERE arp.role_id = r.id
  AND arp.tenant_id IS NULL;

-- Index for tenant-scoped permission lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_role_perms_tenant
    ON app_role_permissions (tenant_id);

-- ---------------------------------------------------------------------------
-- DB-007: Indexes on is_deleted for Soft-Delete Queries
-- ---------------------------------------------------------------------------
-- Every query on active records filters WHERE is_deleted = false.
-- Without a partial index, the DB scans all rows including deleted ones.
-- Partial indexes are optimal: they only index non-deleted rows.

-- High-volume tables: employees, attendance, leave, payroll, notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_active
    ON employees (tenant_id, id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_records_active
    ON attendance_records (tenant_id, employee_id, attendance_date) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_active
    ON leave_requests (tenant_id, employee_id, status) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payslips_active
    ON payslips (tenant_id, employee_id, pay_period_year, pay_period_month) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_active
    ON notifications (tenant_id, user_id, is_read) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_departments_active
    ON departments (tenant_id, id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_reviews_active
    ON performance_reviews (tenant_id, employee_id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_active
    ON audit_logs (tenant_id, created_at DESC) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- DB-009: GIN Indexes for JSONB Columns
-- ---------------------------------------------------------------------------
-- JSONB columns used in WHERE/filter queries need GIN indexes for performance.

-- Only create if the column exists (safe for incremental migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_settings' AND column_name = 'settings'
    ) THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_settings_gin
            ON tenant_settings USING gin (settings);
    END IF;
END $$;
