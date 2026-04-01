-- Composite index for the wall feed query:
-- WHERE tenant_id = ? AND is_deleted = false ORDER BY is_pinned DESC, created_at DESC
-- Eliminates full table scan on social_posts for the main feed endpoint.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wall_post_feed
    ON social_posts (tenant_id, is_deleted, is_pinned DESC, created_at DESC);
