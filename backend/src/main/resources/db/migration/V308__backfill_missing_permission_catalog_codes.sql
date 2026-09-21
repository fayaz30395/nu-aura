-- ============================================================================
-- V308: Backfill 24 Permission.java codes missing from the V96 catalog
-- ============================================================================
-- PERM-ISSUE-005: Permission.java declares 358 RESOURCE:ACTION constants but the
-- V96 canonical catalog seeded only 334. The 24-code delta below could only be
-- satisfied via the in-memory RoleHierarchy fallback, never an explicit DB grant
-- (no catalog FK target). This forward migration seeds the missing codes so every
-- declared permission has a catalog row. Idempotent; role_permissions untouched
-- (HrmsRoleInitializer owns grants).
-- ============================================================================


SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'AGENCY:CREATE', 'Agency Create', 'Create agency', 'agency', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'AGENCY:DELETE', 'Agency Delete', 'Delete agency', 'agency', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'AGENCY:MANAGE', 'Agency Manage', 'Manage agency', 'agency', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'AGENCY:UPDATE', 'Agency Update', 'Update agency', 'agency', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'AGENCY:VIEW', 'Agency View', 'View agency', 'agency', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GOAL:DELETE', 'Goal Delete', 'Delete goal', 'goal', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GOAL:UPDATE', 'Goal Update', 'Update goal', 'goal', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GOAL:VIEW', 'Goal View', 'View goal', 'goal', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:TICKET_DELETE', 'Helpdesk Ticket Delete', 'Ticket Delete helpdesk', 'helpdesk', 'ticket_delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:TICKET_MANAGE', 'Helpdesk Ticket Manage', 'Ticket Manage helpdesk', 'helpdesk', 'ticket_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:SPACE_MANAGE', 'Knowledge Space Manage', 'Space Manage knowledge', 'knowledge', 'space_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OKR:DELETE', 'Okr Delete', 'Delete okr', 'okr', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROJECT:DELETE', 'Project Delete', 'Delete project', 'project', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROJECT:UPDATE', 'Project Update', 'Update project', 'project', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SCORECARD:CREATE', 'Scorecard Create', 'Create scorecard', 'scorecard', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SCORECARD:DELETE', 'Scorecard Delete', 'Delete scorecard', 'scorecard', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SCORECARD:TEMPLATE_MANAGE', 'Scorecard Template Manage', 'Template Manage scorecard', 'scorecard', 'template_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SCORECARD:UPDATE', 'Scorecard Update', 'Update scorecard', 'scorecard', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SCORECARD:VIEW', 'Scorecard View', 'View scorecard', 'scorecard', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SURVEY:CREATE', 'Survey Create', 'Create survey', 'survey', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SURVEY:DELETE', 'Survey Delete', 'Delete survey', 'survey', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SURVEY:UPDATE', 'Survey Update', 'Update survey', 'survey', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAINING:DELETE', 'Training Delete', 'Delete training', 'training', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAINING:UPDATE', 'Training Update', 'Update training', 'training', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;
