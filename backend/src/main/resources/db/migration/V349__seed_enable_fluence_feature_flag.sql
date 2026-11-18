-- ============================================================================
-- V349: Seed enable_fluence feature flag for all tenants
-- F-006: FluenceEditLockController and FluenceAttachmentController have
-- @RequiresFeature(FeatureFlag.ENABLE_FLUENCE) but the flag was never seeded,
-- so non-admin users (e.g. HR_ADMIN) got 403 and the edit lock was never taken.
-- ============================================================================

INSERT INTO feature_flags (id, tenant_id, feature_key, feature_name, description, enabled, category, created_at,
                           updated_at)
SELECT gen_random_uuid(),
       t.id,
       'enable_fluence',
       'NU-Fluence',
       'Enable NU-Fluence edit locks and attachments',
       TRUE,
       'KNOWLEDGE',
       NOW(),
       NOW()
FROM tenants t
WHERE NOT EXISTS (SELECT 1
                  FROM feature_flags ff
                  WHERE ff.tenant_id = t.id
                    AND ff.feature_key = 'enable_fluence');
