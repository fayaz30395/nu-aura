-- V172: Hot-path indexes for top slow queries identified by perf audit
--
-- Evidence (from /tmp/backend-startup.log):
--   - SLOW_QUERY: 350.findByStatus took 931ms   -> tenants(is_deleted, status)
--   - SLOW_QUERY: 355.findByWorkflowDefinitionIdAndTenantIdAndIsActiveTrue took 909ms
--   - SLOW_QUERY: 352.findAllByProcessedStatus took 280ms
--   - SLOW_QUERY: 353.findDistinctTenantIds took 269ms (webhook_deliveries)
--
-- All indexes use IF NOT EXISTS so the migration is idempotent and safe to
-- re-run against environments that already have any of these indexes.
--
-- PROD ROLLOUT NOTE: For production, change CREATE INDEX to
-- CREATE INDEX CONCURRENTLY (and disable Flyway transactions for this
-- migration via -- flyway:executeInTransaction=false). Dev/Neon does not
-- need CONCURRENTLY — the active-tenant scheduler runs every minute, so
-- the brief lock has no user-visible impact here.

-- 1. tenants(is_deleted, status) — used by every scheduled job that loops
-- active tenants (ApprovalEscalationJob, EmailSchedulerService,
-- ScheduledNotificationService). Composite ordering matters: most
-- queries filter is_deleted=false first, then status='ACTIVE'.
CREATE INDEX IF NOT EXISTS idx_tenants_is_deleted_status
    ON tenants (is_deleted, status);

-- 2. approval_escalation_config (workflow_definition_id, tenant_id, is_active)
-- Called per-stale-step in ApprovalEscalationJob; under load the per-step
-- lookup dominates the scheduler runtime.
CREATE INDEX IF NOT EXISTS idx_approval_escalation_wfid_tenant_active
    ON approval_escalation_config (workflow_definition_id, tenant_id, is_active);

-- 3. biometric_punch_logs(processed_status, tenant_id) — batch processor
-- selects unprocessed punches every 2 minutes via findAllByProcessedStatus.
-- Composite (status, tenant_id) supports both the global scan and the
-- per-tenant retry path.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'biometric_punch_logs'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_biometric_punch_logs_status_tenant
            ON biometric_punch_logs (processed_status, tenant_id);
    END IF;
END $$;

-- 4. webhook_deliveries(tenant_id, status) — findDistinctTenantIds and the
-- retry filter both need this. Existing single-column tenant_id index does
-- not cover the status predicate.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'webhook_deliveries'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_status
            ON webhook_deliveries (tenant_id, status);
    END IF;
END $$;

-- 5. RoleRepository.findByCodeInAndTenantId is already covered by
-- V48__fix_soft_delete_unique_constraints.sql via idx_role_code_tenant:
--   ON roles (code, tenant_id) WHERE is_deleted = false
-- Do not create a duplicate non-partial roles(code, tenant_id) index here.
