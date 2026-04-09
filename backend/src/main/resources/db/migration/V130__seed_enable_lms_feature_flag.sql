-- ============================================================================
-- V130: Seed enable_lms feature flag for all tenants (2026-04-09)
-- BUG-R04: LmsController has @RequiresFeature(FeatureFlag.ENABLE_LMS) but
-- the feature flag was never seeded, blocking all non-admin LMS access.
-- ============================================================================

INSERT INTO feature_flags (id, tenant_id, feature_key, feature_name, description, enabled, category, created_at, updated_at)
SELECT
    gen_random_uuid(),
    t.id,
    'enable_lms',
    'Learning Management System',
    'Enable LMS course catalog, enrollment, certificates, and skill gap analysis',
    TRUE,
    'LEARNING',
    NOW(),
    NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM feature_flags ff
    WHERE ff.tenant_id = t.id AND ff.feature_key = 'enable_lms'
);
