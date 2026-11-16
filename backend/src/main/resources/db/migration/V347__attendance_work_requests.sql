-- V347: Work-From-Home / On-Duty / Remote Clock-in requests (Keka "Attendance Requests" parity).
-- No new permission codes: create/cancel use ATTENDANCE:REGULARIZE, review uses ATTENDANCE:APPROVE
-- (same grants as regularization and comp-off). Forward-only and idempotent.
CREATE TABLE IF NOT EXISTS attendance_work_requests
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL,
    employee_id  UUID         NOT NULL,
    request_type VARCHAR(20)  NOT NULL,
    start_date   DATE         NOT NULL,
    end_date     DATE         NOT NULL,
    reason       TEXT         NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    reviewed_by  UUID,
    reviewed_at  TIMESTAMP,
    review_note  TEXT,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    version      BIGINT       DEFAULT 0,
    CONSTRAINT chk_awr_type CHECK (request_type IN ('WORK_FROM_HOME', 'ON_DUTY', 'REMOTE_CLOCK_IN')),
    CONSTRAINT chk_awr_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_awr_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_awr_tenant_employee ON attendance_work_requests (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_awr_tenant_status ON attendance_work_requests (tenant_id, status);

-- Strict RLS, same pattern as V335 (RlsStartupProbe rejects tenant tables without it).
ALTER TABLE public.attendance_work_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_work_requests_tenant_isolation ON public.attendance_work_requests;
CREATE POLICY attendance_work_requests_tenant_isolation ON public.attendance_work_requests
    USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
    WITH CHECK (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);

DROP POLICY IF EXISTS rls_ctx_required_attendance_work_requests ON public.attendance_work_requests;
CREATE POLICY rls_ctx_required_attendance_work_requests ON public.attendance_work_requests
    AS RESTRICTIVE FOR ALL
    USING (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );

ALTER TABLE public.attendance_work_requests FORCE ROW LEVEL SECURITY;
