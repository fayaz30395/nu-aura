-- =============================================================================
-- V169 — Dashboard partial indexes for "recent failures / pending" queries
-- =============================================================================
-- Wave-10 audit recommendation P2-4 (S12-D).
--
-- Several dashboard widgets — failed-notification banner, pending-approvals
-- inbox, open-ticket counts — issue tenant-scoped queries that filter on a
-- single status value (FAILED / PENDING / OPEN / ACTIVE) and order by
-- created_at DESC. Today those queries scan the full table because the
-- existing indexes are not predicate-aware.
--
-- A partial index whose WHERE clause matches the dashboard predicate is
-- typically <5% of full-table size and lets the planner do an index-only
-- scan with the correct sort order — replacing seq-scans that are O(N) in
-- tenant_size with O(failed_rows_per_tenant).
--
-- Each index is wrapped in an idempotent DO block that:
--   * checks information_schema.tables before CREATE INDEX (so a missing
--     table on a downstream branch will not abort the migration)
--   * uses CREATE INDEX IF NOT EXISTS for re-runnability
--
-- This pattern matches V161 / V162 — both predicate-existence and table-
-- existence are guarded.
--
-- Notes on table-name reconciliation (verified against V0__init.sql):
--   * spec said "loans"             → actual table is employee_loans
--   * spec said "helpdesk_tickets"  → actual table is tickets
--   * spec said multi_channel_notifications.delivery_status → actual
--     column is status (mapped to NotificationStatus.FAILED)
--   * interview_scorecards uses ScorecardStatus { DRAFT, SUBMITTED } —
--     it has no PENDING state, so that index is intentionally omitted
--   * audit_logs partial-by-time is intentionally skipped (the audit
--     predicate "created_at > now() - interval '7 days'" is constant-
--     folded at plan time and the index would prune nightly).
-- =============================================================================

-- 1) multi_channel_notifications — failed deliveries surfaced on admin dash --
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'multi_channel_notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_mcn_failed
            ON multi_channel_notifications (tenant_id, created_at DESC)
            WHERE status = 'FAILED';
    END IF;
END $$;

-- 2) email_notifications — failed transactional emails ----------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_email_notifications_failed
            ON email_notifications (tenant_id, created_at DESC)
            WHERE status = 'FAILED';
    END IF;
END $$;

-- 3) webhook_deliveries — failed outbound webhook attempts ------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_deliveries') THEN
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_failed
            ON webhook_deliveries (tenant_id, created_at DESC)
            WHERE status = 'FAILED';
    END IF;
END $$;

-- 4) leave_requests — pending-approval inbox --------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        CREATE INDEX IF NOT EXISTS idx_leave_requests_pending
            ON leave_requests (tenant_id, created_at DESC)
            WHERE status = 'PENDING';
    END IF;
END $$;

-- 5) expense_claims — pending-approval inbox --------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_claims') THEN
        CREATE INDEX IF NOT EXISTS idx_expense_claims_pending
            ON expense_claims (tenant_id, created_at DESC)
            WHERE status = 'PENDING';
    END IF;
END $$;

-- 6) employee_loans — active / overdue loans on payroll widget --------------
--    (Spec called this "loans"; canonical table name is employee_loans.
--     LoanStatus enum has no OVERDUE value — closest live-loan states are
--     ACTIVE and DISBURSED. We index the two live states the dashboard
--     widget actually filters on.)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_loans') THEN
        CREATE INDEX IF NOT EXISTS idx_employee_loans_active
            ON employee_loans (tenant_id, created_at DESC)
            WHERE status IN ('ACTIVE', 'DISBURSED');
    END IF;
END $$;

-- 7) tickets — open helpdesk tickets ----------------------------------------
--    (Spec called this "helpdesk_tickets"; canonical table name is tickets.)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_open
            ON tickets (tenant_id, created_at DESC)
            WHERE status = 'OPEN';
    END IF;
END $$;

-- 8) signature_requests — pending e-sign actions ----------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_requests') THEN
        CREATE INDEX IF NOT EXISTS idx_signature_requests_pending
            ON signature_requests (tenant_id, created_at DESC)
            WHERE status = 'PENDING';
    END IF;
END $$;

-- 9) interview_scorecards — SKIPPED -----------------------------------------
--    The ScorecardStatus enum is {DRAFT, SUBMITTED} (see V116). There is
--    no PENDING state; a WHERE status = 'PENDING' partial index would
--    index zero rows forever. Intentionally omitted.

-- 10) audit_logs — SKIPPED --------------------------------------------------
--    "WHERE created_at > now() - interval '7 days'" is constant-folded at
--    plan time, so the index predicate gets stale immediately and prunes
--    nightly. Per audit spec, skip.
