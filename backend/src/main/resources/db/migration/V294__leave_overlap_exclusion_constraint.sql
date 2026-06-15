-- =============================================================================
-- V294: DB-level exclusion constraint for concurrent leave approval (RACE-1)
-- =============================================================================
-- CONTEXT:
--   RACE-1 (ISSUE_BOARD): The approval-time overlap re-check in LeaveRequestService
--   is a read-only query without a pessimistic lock. Two concurrent approval
--   transactions can both pass the overlap check against committed data and
--   both commit, producing overlapping APPROVED leaves for the same employee.
--
-- FIX:
--   A PostgreSQL EXCLUDE constraint is enforced at commit time by the storage
--   engine — one of the two racing transactions gets a conflict error and rolls
--   back, even if both passed the application-level check concurrently.
--
--   The constraint prevents any two rows in leave_requests where:
--     - same tenant_id AND same employee_id
--     - date ranges overlap (daterange with both endpoints inclusive)
--     - both are APPROVED and not soft-deleted
--
--   When a second concurrent approval conflicts, Spring's
--   DataIntegrityViolationException is caught by GlobalExceptionHandler and
--   returned to the client as HTTP 409 Conflict (existing handler at line ~148).
--
-- REQUIRES: btree_gist extension (for UUID = operator in GIST index).
--   btree_gist is a standard PostgreSQL extension bundled with all versions ≥9.1.
--   Neon PostgreSQL 16 supports it. The CREATE EXTENSION is idempotent (IF NOT EXISTS).
--
-- SAFETY:
--   If existing data already has overlapping APPROVED leaves, this migration will
--   fail. This is intentional — such data violates the business rule and should be
--   investigated before deploying. In fresh environments (Railway staging) this
--   should pass cleanly since the BA-6 overlap check has been enforced since launch.
-- =============================================================================

-- Enable btree_gist so UUID types work inside a GIST exclusion index
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent concurrent approvals from creating overlapping approved leaves.
-- The WHERE partial condition limits the constraint to only APPROVED, non-deleted rows,
-- so PENDING / REJECTED / CANCELLED rows are unaffected.
ALTER TABLE leave_requests
  ADD CONSTRAINT uq_leave_no_overlapping_approved
  EXCLUDE USING GIST (
    tenant_id   WITH =,
    employee_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  )
  WHERE (status = 'APPROVED' AND is_deleted = false);
