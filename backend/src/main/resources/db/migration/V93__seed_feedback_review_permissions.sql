-- ============================================================================
-- V93: Seed new FEEDBACK and REVIEW permissions from autonomous sweep
-- ============================================================================
-- These permission codes were added to Permission.java during the sweep to
-- fix FeedbackController (DEF-36) and PerformanceReviewController (DEF-41)
-- RBAC granularity. Without seeding them, non-SuperAdmin users are denied
-- access because the codes don't exist in the permissions table.
-- ============================================================================

-- Feedback CRUD permissions (split from blanket REVIEW_VIEW)
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'FEEDBACK:CREATE', 'Create Feedback', 'Create feedback entries for performance reviews',
        'feedback', 'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'FEEDBACK:UPDATE', 'Update Feedback', 'Update existing feedback entries', 'feedback',
        'update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'FEEDBACK:DELETE', 'Delete Feedback', 'Delete feedback entries', 'feedback', 'delete', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

-- Review granular permissions (previously only CREATE/VIEW existed)
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:UPDATE', 'Update Review', 'Update performance review records', 'review', 'update',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:DELETE', 'Delete Review', 'Delete performance review records', 'review', 'delete',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- NOTE: Role assignments are NOT included here. Administrators should assign
-- these permissions to appropriate roles (HR_ADMIN, HR_MANAGER, etc.) via the
-- admin UI after this migration runs. SuperAdmin bypasses all checks and is
-- unaffected.
-- ============================================================================
