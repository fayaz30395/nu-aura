-- =============================================================================
-- V70: Add composite indexes on step_executions for approval inbox performance
-- =============================================================================
-- Addresses MED-3 from DB production readiness review.
--
-- The approval inbox (findInboxForUser) is a high-traffic query that filters on
-- (tenant_id, assigned_to_user_id, status) and sorts by assigned_at DESC.
-- Currently the only index is idx_step_executions_tenant on (tenant_id) alone,
-- which forces index scan + filter for every inbox page load.
--
-- Additional queries that benefit:
--   - findPendingForUser (tenant_id, assigned_to_user_id, status = PENDING)
--   - countPendingForUser (same filter, COUNT)
--   - findPendingForUserSortedByDate (same filter, ORDER BY assigned_at ASC)
--   - findOverdueSteps (tenant_id, status = PENDING, deadline)
--   - findEscalatedPendingSteps (tenant_id, escalated = true, status = PENDING)
--   - findStaleStepsForEscalation (tenant_id, status = PENDING, assigned_at)
--   - findActionsBy (tenant_id, action_by_user_id, executed_at)
--   - countTodayActionsByUser (tenant_id, action_by_user_id, executed_at)
-- =============================================================================

-- Primary inbox index: covers findInboxForUser, findPendingForUser,
-- countPendingForUser, and findPendingForUserSortedByDate.
-- Trailing assigned_at DESC enables index-ordered pagination without a sort.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_step_executions_inbox
    ON step_executions (tenant_id, assigned_to_user_id, status, assigned_at DESC);

-- Escalation index: covers findOverdueSteps, findEscalatedPendingSteps,
-- and findStaleStepsForEscalation.
-- Partial index on PENDING status reduces index size (most steps are completed).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_step_executions_pending_deadline
    ON step_executions (tenant_id, deadline, assigned_at)
    WHERE status = 'PENDING';

-- Action history index: covers findActionsBy and countTodayActionsByUser.
-- Trailing executed_at DESC supports ORDER BY executed_at DESC without a sort.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_step_executions_action_by
    ON step_executions (tenant_id, action_by_user_id, executed_at DESC);

-- FK index on workflow_execution_id: covers findPendingSteps,
-- findByExecutionAndStepOrder, and countApprovedSteps which all filter
-- by workflow_execution_id. Without this, JOINs to workflow_executions
-- force sequential scans on step_executions.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_step_executions_workflow_exec
    ON step_executions (workflow_execution_id);
