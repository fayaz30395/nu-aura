-- V355: G-010/G-011 repair: enrollments marked COMPLETED (e.g. via passed quiz) still showed progress < 100.
-- Per-tenant loop sets app.current_tenant_id (FORCE RLS, see V341) so the UPDATE reaches rows; idempotent.

DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        UPDATE lms_course_enrollments
           SET progress_percentage = 100
         WHERE status = 'COMPLETED'
           AND progress_percentage < 100;
    END LOOP;
END $$;
