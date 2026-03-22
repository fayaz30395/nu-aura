-- ============================================================================
-- V66: Fix RBAC Permission Gaps
-- ============================================================================
-- ROOT CAUSE: Controllers check permissions like RECRUITMENT:VIEW, NOTIFICATIONS:VIEW,
-- WORKFLOW:VIEW, etc. in UPPERCASE:COLON format. But database (seeded in V19, V60)
-- only has old-format codes like 'recruitment.read' (lowercase:dot).
--
-- Permission normalizer handles BOTH formats:
--   - DB format: 'module.action' (e.g., 'recruitment.read')
--   - Code format: 'MODULE:ACTION' (e.g., 'RECRUITMENT:READ')
--   - Normalizer converts both to 'MODULE:ACTION' for comparison
--
-- ISSUE: Controllers check for codes like 'RECRUITMENT:VIEW' which don't exist
-- in the permissions table. This causes all permission checks to fail for
-- non-SuperAdmin roles.
--
-- SOLUTION: Insert all missing permissions in UPPERCASE:COLON format.
-- Use ON CONFLICT DO NOTHING for idempotency (unique constraint on code).
--
-- COVERAGE:
-- 1. Recruitment, Candidate, and Hire module permissions
-- 2. Performance/OKR/Feedback permissions
-- 3. Training & LMS permissions
-- 4. Surveys and Wellness permissions
-- 5. Contracts and Onboarding permissions
-- 6. Notifications, Workflows, Recognition, Wall permissions
-- 7. Resource Management (Allocation) permissions
-- 8. Additional admin/system permissions (Role, User, Statutory, etc.)
--
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- ============================================================================

-- =============================================================================
-- SECTION A: INSERT MISSING PERMISSIONS (UPPERCASE:COLON FORMAT)
-- =============================================================================
-- All permissions stored in UPPERCASE:COLON format.
-- Normalizer will convert database.lowercase.format during app startup.
-- Uses UNIQUE constraint on 'code' for idempotency.

-- ============================================================================
-- Recruitment Module Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECRUITMENT:VIEW', 'View Recruitment', 'View job openings and recruitment data', 'recruitment', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECRUITMENT:VIEW_ALL', 'View All Recruitment', 'View all job openings across the organization', 'recruitment', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECRUITMENT:VIEW_TEAM', 'View Team Recruitment', 'View job openings for team', 'recruitment', 'view_team', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECRUITMENT:CREATE', 'Create Recruitment', 'Create job openings and recruitment requests', 'recruitment', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECRUITMENT:UPDATE', 'Update Recruitment', 'Update job openings and recruitment requests', 'recruitment', 'update', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECRUITMENT:DELETE', 'Delete Recruitment', 'Delete job openings and recruitment requests', 'recruitment', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECRUITMENT:MANAGE', 'Manage Recruitment', 'Full recruitment management including publishing and closing openings', 'recruitment', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Candidate Module Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CANDIDATE:VIEW', 'View Candidates', 'View candidate profiles and applications', 'candidate', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CANDIDATE:EVALUATE', 'Evaluate Candidates', 'Evaluate and rate candidates during recruitment', 'candidate', 'evaluate', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Performance & OKR Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OKR:VIEW', 'View OKRs', 'View objectives and key results', 'okr', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OKR:CREATE', 'Create OKRs', 'Create new objectives and key results', 'okr', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OKR:UPDATE', 'Update OKRs', 'Update objectives and key results', 'okr', 'update', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OKR:APPROVE', 'Approve OKRs', 'Approve objectives and key results', 'okr', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OKR:VIEW_ALL', 'View All OKRs', 'View all objectives and key results across the organization', 'okr', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 360 Feedback Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'FEEDBACK_360:VIEW', 'View 360 Feedback', 'View 360 degree feedback', 'feedback_360', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'FEEDBACK_360:CREATE', 'Create 360 Feedback', 'Create 360 degree feedback requests', 'feedback_360', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'FEEDBACK_360:SUBMIT', 'Submit 360 Feedback', 'Submit 360 degree feedback responses', 'feedback_360', 'submit', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'FEEDBACK_360:MANAGE', 'Manage 360 Feedback', 'Manage 360 degree feedback cycles and responses', 'feedback_360', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Training & LMS Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAINING:VIEW', 'View Training', 'View training programs and enrollments', 'training', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAINING:CREATE', 'Create Training', 'Create training programs', 'training', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAINING:EDIT', 'Edit Training', 'Edit training programs', 'training', 'edit', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAINING:ENROLL', 'Enroll in Training', 'Enroll employees in training programs', 'training', 'enroll', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAINING:APPROVE', 'Approve Training', 'Approve training enrollments and completions', 'training', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- LMS (Learning Management System) Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:COURSE_VIEW', 'View LMS Courses', 'View learning management system courses', 'lms', 'course_view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:COURSE_CREATE', 'Create LMS Courses', 'Create learning management system courses', 'lms', 'course_create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:COURSE_MANAGE', 'Manage LMS Courses', 'Manage learning management system courses', 'lms', 'course_manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:MODULE_CREATE', 'Create LMS Modules', 'Create course modules in learning management system', 'lms', 'module_create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:QUIZ_CREATE', 'Create LMS Quizzes', 'Create quizzes in learning management system', 'lms', 'quiz_create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:ENROLL', 'Enroll in LMS Courses', 'Enroll in learning management system courses', 'lms', 'enroll', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:CERTIFICATE_VIEW', 'View LMS Certificates', 'View learning management system course certificates', 'lms', 'certificate_view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Survey Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SURVEY:VIEW', 'View Surveys', 'View employee surveys', 'survey', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SURVEY:MANAGE', 'Manage Surveys', 'Manage employee surveys and responses', 'survey', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SURVEY:SUBMIT', 'Submit Surveys', 'Submit survey responses', 'survey', 'submit', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Wellness Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WELLNESS:VIEW', 'View Wellness', 'View wellness programs', 'wellness', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WELLNESS:CREATE', 'Create Wellness Programs', 'Create wellness initiatives', 'wellness', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WELLNESS:MANAGE', 'Manage Wellness', 'Manage wellness programs and initiatives', 'wellness', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Contract Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:VIEW', 'View Contracts', 'View employee contracts', 'contract', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:CREATE', 'Create Contracts', 'Create new contracts', 'contract', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:UPDATE', 'Update Contracts', 'Update existing contracts', 'contract', 'update', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:DELETE', 'Delete Contracts', 'Delete contracts', 'contract', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:APPROVE', 'Approve Contracts', 'Approve contracts', 'contract', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:SIGN', 'Sign Contracts', 'Sign contracts digitally', 'contract', 'sign', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:TEMPLATE_MANAGE', 'Manage Contract Templates', 'Manage contract templates', 'contract', 'template_manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Notification Permissions (NOTIFICATIONS with S for system notifications)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATIONS:VIEW', 'View Notifications', 'View system notifications', 'notifications', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATIONS:CREATE', 'Create Notifications', 'Create system notifications', 'notifications', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATIONS:DELETE', 'Delete Notifications', 'Delete system notifications', 'notifications', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Notification Permissions (NOTIFICATION without S for user notifications)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATION:VIEW', 'View User Notifications', 'View personal notifications', 'notification', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATION:CREATE', 'Create Notifications', 'Create user notifications', 'notification', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATION:MANAGE', 'Manage Notifications', 'Manage notification settings and recipients', 'notification', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATION:SEND', 'Send Notifications', 'Send notifications to users', 'notification', 'send', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Workflow Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WORKFLOW:VIEW', 'View Workflows', 'View approval workflows', 'workflow', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WORKFLOW:CREATE', 'Create Workflows', 'Create approval workflows', 'workflow', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WORKFLOW:MANAGE', 'Manage Workflows', 'Manage approval workflows and definitions', 'workflow', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WORKFLOW:EXECUTE', 'Execute Workflows', 'Execute and perform workflow actions', 'workflow', 'execute', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Recognition Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECOGNITION:VIEW', 'View Recognition', 'View employee recognition and awards', 'recognition', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECOGNITION:CREATE', 'Create Recognition', 'Recognize employees', 'recognition', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'RECOGNITION:MANAGE', 'Manage Recognition', 'Manage recognition programs and awards', 'recognition', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Wall / Social Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WALL:VIEW', 'View Wall', 'View company wall and posts', 'wall', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WALL:POST', 'Post to Wall', 'Post on company wall', 'wall', 'post', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WALL:COMMENT', 'Comment on Wall', 'Comment on wall posts', 'wall', 'comment', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WALL:REACT', 'React on Wall', 'React to wall posts and comments', 'wall', 'react', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WALL:MANAGE', 'Manage Wall', 'Manage company wall moderation and settings', 'wall', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WALL:PIN', 'Pin Posts on Wall', 'Pin posts on company wall', 'wall', 'pin', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Onboarding Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ONBOARDING:VIEW', 'View Onboarding', 'View employee onboarding tasks and progress', 'onboarding', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ONBOARDING:CREATE', 'Create Onboarding', 'Create onboarding programs and checklists', 'onboarding', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ONBOARDING:MANAGE', 'Manage Onboarding', 'Manage onboarding programs and track progress', 'onboarding', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Resource Allocation Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ALLOCATION:VIEW', 'View Allocations', 'View resource allocations', 'allocation', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ALLOCATION:CREATE', 'Create Allocations', 'Create resource allocation requests', 'allocation', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ALLOCATION:APPROVE', 'Approve Allocations', 'Approve resource allocation requests', 'allocation', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ALLOCATION:MANAGE', 'Manage Allocations', 'Manage resource allocations and capacities', 'allocation', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Administrative Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ROLE:MANAGE', 'Manage Roles', 'Create and manage user roles', 'role', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'USER:MANAGE', 'Manage Users', 'Create and manage user accounts', 'user', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'STATUTORY:VIEW', 'View Statutory', 'View statutory and compliance information', 'statutory', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'STATUTORY:MANAGE', 'Manage Statutory', 'Manage statutory and compliance settings', 'statutory', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CUSTOM_FIELD:VIEW', 'View Custom Fields', 'View custom fields configuration', 'custom_field', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CUSTOM_FIELD:CREATE', 'Create Custom Fields', 'Create new custom fields', 'custom_field', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CUSTOM_FIELD:UPDATE', 'Update Custom Fields', 'Update custom fields', 'custom_field', 'update', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CUSTOM_FIELD:DELETE', 'Delete Custom Fields', 'Delete custom fields', 'custom_field', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CUSTOM_FIELD:MANAGE', 'Manage Custom Fields', 'Full management of custom fields', 'custom_field', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PREBOARDING:VIEW', 'View Preboarding', 'View preboarding tasks', 'preboarding', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PREBOARDING:CREATE', 'Create Preboarding', 'Create preboarding checklists', 'preboarding', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PREBOARDING:MANAGE', 'Manage Preboarding', 'Manage preboarding programs', 'preboarding', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LETTER:TEMPLATE_VIEW', 'View Letter Templates', 'View letter templates', 'letter', 'template_view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LETTER:TEMPLATE_CREATE', 'Create Letter Templates', 'Create new letter templates', 'letter', 'template_create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LETTER:TEMPLATE_MANAGE', 'Manage Letter Templates', 'Manage letter templates', 'letter', 'template_manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LETTER:GENERATE', 'Generate Letters', 'Generate letters for employees', 'letter', 'generate', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LETTER:APPROVE', 'Approve Letters', 'Approve generated letters', 'letter', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LETTER:ISSUE', 'Issue Letters', 'Issue letters to employees', 'letter', 'issue', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PERMISSION:MANAGE', 'Manage Permissions', 'Create and manage system permissions', 'permission', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SYSTEM:ADMIN', 'System Administrator', 'Full system administrative access', 'system', 'admin', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HELPDESK:CATEGORY_MANAGE', 'Manage Helpdesk Categories', 'Manage helpdesk ticket categories', 'helpdesk', 'category_manage', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HELPDESK:TICKET_VIEW', 'View Helpdesk Tickets', 'View helpdesk tickets', 'helpdesk', 'ticket_view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PROJECT:VIEW', 'View Projects', 'View projects and allocations', 'project', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PROJECT:CREATE', 'Create Projects', 'Create new projects', 'project', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION B: ASSIGN PERMISSIONS TO ROLES (Demo Tenant)
-- =============================================================================
-- Demo Tenant ID: 660e8400-e29b-41d4-a716-446655440001
-- Role IDs:
--   MANAGER:      550e8400-e29b-41d4-a716-446655440022
--   EMPLOYEE:     550e8400-e29b-41d4-a716-446655440023
--   TEAM_LEAD:    48000000-0e01-0000-0000-000000000001
--   HR_ADMIN:     550e8400-e29b-41d4-a716-446655440021
--   HR_MANAGER:   48000000-0e01-0000-0000-000000000002

-- ============================================================================
-- MANAGER Role — Team Management (scope: TEAM)
-- ============================================================================
-- Recruitment
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('RECRUITMENT:VIEW', 'RECRUITMENT:VIEW_TEAM', 'CANDIDATE:VIEW')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Performance & OKR
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('OKR:VIEW', 'OKR:CREATE', 'OKR:UPDATE', 'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:SUBMIT')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Training & LMS
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('TRAINING:VIEW', 'TRAINING:ENROLL', 'LMS:COURSE_VIEW', 'LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Surveys, Wellness, Contracts, Notifications, Workflow
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SURVEY:VIEW', 'SURVEY:SUBMIT', 'WELLNESS:VIEW', 'CONTRACT:VIEW', 'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW', 'WORKFLOW:VIEW', 'WORKFLOW:EXECUTE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Recognition, Wall, Onboarding, Allocation
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('RECOGNITION:VIEW', 'RECOGNITION:CREATE', 'WALL:VIEW', 'WALL:POST', 'WALL:COMMENT', 'WALL:REACT', 'ONBOARDING:VIEW', 'ALLOCATION:VIEW')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- ============================================================================
-- EMPLOYEE Role — Self-Service (scope: SELF)
-- ============================================================================
-- Training & LMS
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440023', p.id, 'SELF', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('TRAINING:VIEW', 'TRAINING:ENROLL', 'LMS:COURSE_VIEW', 'LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
    AND rp.permission_id = p.id
    AND rp.scope = 'SELF'
);

-- Surveys, Wellness, Notifications, Workflow, OKR, Feedback, Wall, Recognition
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440023', p.id, 'SELF', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SURVEY:VIEW', 'SURVEY:SUBMIT', 'WELLNESS:VIEW', 'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW', 'WORKFLOW:VIEW', 'OKR:VIEW', 'OKR:CREATE', 'FEEDBACK_360:VIEW', 'FEEDBACK_360:SUBMIT', 'WALL:VIEW', 'WALL:POST', 'WALL:COMMENT', 'WALL:REACT', 'RECOGNITION:VIEW', 'RECOGNITION:CREATE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
    AND rp.permission_id = p.id
    AND rp.scope = 'SELF'
);

-- ============================================================================
-- TEAM_LEAD Role — Team Leadership (scope: TEAM)
-- ============================================================================
-- Recruitment
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('RECRUITMENT:VIEW', 'RECRUITMENT:VIEW_TEAM', 'CANDIDATE:VIEW')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Performance & OKR
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('OKR:VIEW', 'OKR:CREATE', 'OKR:UPDATE', 'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:SUBMIT')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Training & LMS
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('TRAINING:VIEW', 'TRAINING:ENROLL', 'LMS:COURSE_VIEW', 'LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Surveys, Wellness, Contracts, Notifications, Workflow
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('SURVEY:VIEW', 'SURVEY:SUBMIT', 'WELLNESS:VIEW', 'CONTRACT:VIEW', 'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW', 'WORKFLOW:VIEW', 'WORKFLOW:EXECUTE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- Recognition, Wall, Onboarding, Allocation
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('RECOGNITION:VIEW', 'RECOGNITION:CREATE', 'WALL:VIEW', 'WALL:POST', 'WALL:COMMENT', 'WALL:REACT', 'ONBOARDING:VIEW', 'ALLOCATION:VIEW')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
    AND rp.permission_id = p.id
    AND rp.scope = 'TEAM'
);

-- ============================================================================
-- HR_ADMIN Role — Full HR Module Access (scope: ALL)
-- ============================================================================
-- Recruitment, Performance, Training, Contracts, Onboarding, Workflow
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN (
    'RECRUITMENT:VIEW', 'RECRUITMENT:VIEW_ALL', 'RECRUITMENT:CREATE', 'RECRUITMENT:UPDATE', 'RECRUITMENT:DELETE', 'RECRUITMENT:MANAGE',
    'CANDIDATE:VIEW', 'CANDIDATE:EVALUATE',
    'OKR:VIEW', 'OKR:VIEW_ALL', 'OKR:CREATE', 'OKR:UPDATE', 'OKR:APPROVE',
    'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:MANAGE',
    'TRAINING:VIEW', 'TRAINING:CREATE', 'TRAINING:EDIT', 'TRAINING:ENROLL', 'TRAINING:APPROVE',
    'LMS:COURSE_VIEW', 'LMS:COURSE_CREATE', 'LMS:COURSE_MANAGE', 'LMS:MODULE_CREATE', 'LMS:QUIZ_CREATE', 'LMS:ENROLL', 'LMS:CERTIFICATE_VIEW',
    'SURVEY:VIEW', 'SURVEY:MANAGE',
    'WELLNESS:VIEW', 'WELLNESS:CREATE', 'WELLNESS:MANAGE',
    'CONTRACT:VIEW', 'CONTRACT:CREATE', 'CONTRACT:UPDATE', 'CONTRACT:DELETE', 'CONTRACT:APPROVE', 'CONTRACT:SIGN', 'CONTRACT:TEMPLATE_MANAGE',
    'NOTIFICATIONS:VIEW', 'NOTIFICATIONS:CREATE', 'NOTIFICATION:VIEW',
    'WORKFLOW:VIEW', 'WORKFLOW:CREATE', 'WORKFLOW:MANAGE',
    'RECOGNITION:VIEW', 'RECOGNITION:CREATE', 'RECOGNITION:MANAGE',
    'ONBOARDING:VIEW', 'ONBOARDING:CREATE', 'ONBOARDING:MANAGE',
    'ALLOCATION:VIEW', 'ALLOCATION:CREATE', 'ALLOCATION:MANAGE'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
    AND rp.permission_id = p.id
    AND rp.scope = 'ALL'
);

-- Admin & System Permissions for HR_ADMIN
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN (
    'ROLE:MANAGE', 'USER:MANAGE', 'STATUTORY:VIEW', 'STATUTORY:MANAGE',
    'CUSTOM_FIELD:VIEW', 'CUSTOM_FIELD:CREATE', 'CUSTOM_FIELD:UPDATE', 'CUSTOM_FIELD:DELETE', 'CUSTOM_FIELD:MANAGE',
    'PREBOARDING:VIEW', 'PREBOARDING:CREATE', 'PREBOARDING:MANAGE',
    'LETTER:TEMPLATE_VIEW', 'LETTER:TEMPLATE_CREATE', 'LETTER:TEMPLATE_MANAGE', 'LETTER:GENERATE', 'LETTER:APPROVE', 'LETTER:ISSUE',
    'PERMISSION:MANAGE',
    'HELPDESK:CATEGORY_MANAGE'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
    AND rp.permission_id = p.id
    AND rp.scope = 'ALL'
);

-- ============================================================================
-- HR_MANAGER Role — HR Department Management (scope: ALL for HR ops)
-- ============================================================================
-- Recruitment and HR-specific permissions
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000002', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN (
    'RECRUITMENT:VIEW', 'RECRUITMENT:VIEW_ALL', 'RECRUITMENT:CREATE', 'RECRUITMENT:UPDATE', 'RECRUITMENT:MANAGE',
    'CANDIDATE:VIEW',
    'OKR:VIEW', 'OKR:CREATE', 'OKR:UPDATE',
    'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:SUBMIT',
    'TRAINING:VIEW', 'TRAINING:ENROLL',
    'LMS:COURSE_VIEW', 'LMS:ENROLL', 'LMS:CERTIFICATE_VIEW',
    'SURVEY:VIEW', 'SURVEY:SUBMIT',
    'WELLNESS:VIEW',
    'CONTRACT:VIEW',
    'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW',
    'WORKFLOW:VIEW', 'WORKFLOW:EXECUTE',
    'RECOGNITION:VIEW', 'RECOGNITION:CREATE',
    'WALL:VIEW', 'WALL:POST', 'WALL:COMMENT', 'WALL:REACT',
    'ONBOARDING:VIEW', 'ONBOARDING:CREATE', 'ONBOARDING:MANAGE',
    'ALLOCATION:VIEW', 'ALLOCATION:CREATE',
    'PREBOARDING:VIEW',
    'LETTER:GENERATE'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
    AND rp.permission_id = p.id
    AND rp.scope = 'ALL'
);

-- =============================================================================
-- SECTION C: COMPLETION MARKER
-- =============================================================================
-- Migration complete: All missing permissions inserted and role assignments done.
-- This migration is idempotent and safe to re-run.
