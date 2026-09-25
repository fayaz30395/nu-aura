-- ============================================================================
-- V333: Demo LMS content — courses + one published learning path (2026-09-25)
--
-- Why: BUG-L1 fixed the missing GET /lms/learning-paths and
-- POST /lms/learning-paths/{id}/enroll endpoints, but `lms_courses` and
-- `lms_learning_paths` had ZERO rows in every environment (verified: both
-- tables empty on a fully migrated DB). With no data the endpoints can only
-- ever return an empty page, so the user workflow — open Programs, see a path,
-- enrol, see progress — could not be verified end to end, and the LMS
-- dynamic-route e2e specs could only skip.
--
-- Gated by the same ${demoCredentialsEnabled} placeholder as V314/V331:
--   * dev / demo / test -> "true"  : demo content seeded.
--   * prod / render     -> "false" : no-op. Production tenants author their
--     own catalogue; this must never inject demo courses there.
--
-- Idempotent: every insert is ON CONFLICT (id) DO NOTHING, so a re-run (or a
-- repair-driven re-apply) changes nothing.
-- ============================================================================

DO $$
DECLARE
    demo_tenant  CONSTANT UUID := '660e8400-e29b-41d4-a716-446655440001';
    course_one   CONSTANT UUID := '48000000-0e05-0000-0000-000000000001';
    course_two   CONSTANT UUID := '48000000-0e05-0000-0000-000000000002';
    course_three CONSTANT UUID := '48000000-0e05-0000-0000-000000000003';
    path_one     CONSTANT UUID := '48000000-0e06-0000-0000-000000000001';
BEGIN
    IF lower('${demoCredentialsEnabled}') <> 'true' THEN
        RAISE NOTICE 'V333: demoCredentialsEnabled=false — skipping demo LMS seed (production environment).';
        RETURN;
    END IF;

    -- RLS is fail-closed on these tables; set the tenant GUC for this transaction.
    PERFORM set_config('app.current_tenant_id', demo_tenant::text, true);

    INSERT INTO lms_courses (id, tenant_id, title, code, description, short_description,
                             status, difficulty_level, duration_hours, is_mandatory,
                             is_self_paced, is_certificate_enabled, total_enrollments)
    VALUES
      (course_one, demo_tenant, 'Workplace Security Essentials', 'SEC-101',
       'Phishing, password hygiene, device security and incident reporting for every employee.',
       'Security basics every employee needs.', 'PUBLISHED', 'BEGINNER', 3, TRUE, TRUE, TRUE, 0),
      (course_two, demo_tenant, 'Data Privacy and Handling', 'SEC-201',
       'How to classify, store and share personal data, and what to do when something leaks.',
       'Handle personal data correctly.', 'PUBLISHED', 'INTERMEDIATE', 4, TRUE, TRUE, TRUE, 0),
      (course_three, demo_tenant, 'Managing Your First Team', 'MGR-101',
       'One-on-ones, feedback, goal setting and the first ninety days as a new manager.',
       'Practical first-time manager training.', 'PUBLISHED', 'INTERMEDIATE', 6, FALSE, TRUE, TRUE, 0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO lms_learning_paths (id, tenant_id, title, description, difficulty_level,
                                    estimated_hours, is_published, is_mandatory, total_courses)
    VALUES
      (path_one, demo_tenant, 'Security and Compliance Onboarding',
       'The security and privacy training every new joiner completes in their first month.',
       'BEGINNER', 7, TRUE, TRUE, 2)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO lms_learning_path_courses (id, tenant_id, path_id, course_id, order_index, is_required)
    VALUES
      ('48000000-0e07-0000-0000-000000000001', demo_tenant, path_one, course_one, 0, TRUE),
      ('48000000-0e07-0000-0000-000000000002', demo_tenant, path_one, course_two, 1, TRUE)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'V333: seeded demo LMS catalogue (3 courses, 1 published learning path).';
END $$;
