-- Synthetic tenant for the two-tenant isolation suite. Executed once per tenant by
-- TwoTenantFixture as the Postgres superuser (bypasses RLS on purpose: seeding only).
-- Tokens: {{P}} id prefix (8 hex), {{T}} tenant uuid, {{N}} marker letter (A/B), {{n}} lower-case letter.
-- Every human-readable column carries the marker ISO-{{N}} so a leak is greppable in any response body.
-- Id layout: {{P}}-<type 4 hex>-4000-8000-<n 12 hex>; TwoTenantFixture.id() builds the same ids.

INSERT INTO tenants (id, tenant_id, code, name, status, contact_email, country, timezone)
VALUES ('{{T}}', NULL, 'iso-{{n}}', 'ISO-{{N}} Tenant', 'ACTIVE', 'tenant-{{n}}-contact@iso.test', 'IN', 'Asia/Kolkata');

-- Roles: clone every role of the seeded NuLogic tenant (codes + scoped grants) so permission
-- hydration in JwtAuthenticationFilter works exactly as for a real tenant. Only global
-- permission rows (tenant_id IS NULL) are referenced.
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, parent_role_id)
SELECT md5('{{N}}:' || r.id::text)::uuid, '{{T}}', r.code, r.name || ' ISO-{{N}}', r.description, r.is_system_role,
       CASE WHEN r.parent_role_id IS NULL THEN NULL ELSE md5('{{N}}:' || r.parent_role_id::text)::uuid END
FROM roles r
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001' AND r.is_deleted = false;

INSERT INTO role_permissions (tenant_id, role_id, permission_id, scope)
SELECT '{{T}}', md5('{{N}}:' || rp.role_id::text)::uuid, rp.permission_id, rp.scope
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id AND p.tenant_id IS NULL
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001' AND r.is_deleted = false AND rp.is_deleted = false;

-- Users: 1 = tenant admin, 2 = plain employee, 3 = super admin (home tenant {{N}}).
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status)
VALUES ('{{P}}-0001-4000-8000-000000000001', '{{T}}', 'tenant-{{n}}-admin@iso.test', 'ISO-{{N}}', 'Admin', '$2a$10$isolationsuiteplaceholderhashxxxxxxxxxxxxxxxxxxxxxxxx', 'ACTIVE'),
       ('{{P}}-0001-4000-8000-000000000002', '{{T}}', 'tenant-{{n}}-employee@iso.test', 'ISO-{{N}}', 'Employee', '$2a$10$isolationsuiteplaceholderhashxxxxxxxxxxxxxxxxxxxxxxxx', 'ACTIVE'),
       ('{{P}}-0001-4000-8000-000000000003', '{{T}}', 'tenant-{{n}}-super@iso.test', 'ISO-{{N}}', 'Super', '$2a$10$isolationsuiteplaceholderhashxxxxxxxxxxxxxxxxxxxxxxxx', 'ACTIVE');

INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT '{{P}}-0001-4000-8000-000000000001'::uuid, r.id, '{{T}}'::uuid FROM roles r
WHERE r.tenant_id = '{{T}}' AND r.code IN ('TENANT_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN', 'RECRUITMENT_ADMIN', 'FINANCE_ADMIN');
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT '{{P}}-0001-4000-8000-000000000002'::uuid, r.id, '{{T}}'::uuid FROM roles r WHERE r.tenant_id = '{{T}}' AND r.code = 'EMPLOYEE';
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT '{{P}}-0001-4000-8000-000000000003'::uuid, r.id, '{{T}}'::uuid FROM roles r WHERE r.tenant_id = '{{T}}' AND r.code = 'SUPER_ADMIN';

INSERT INTO departments (id, tenant_id, code, name, is_active)
VALUES ('{{P}}-0004-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-ENG', 'ISO-{{N}} Engineering', true);

INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, personal_email, joining_date,
                       employment_type, status, department_id, designation, manager_id)
VALUES ('{{P}}-0003-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-001', '{{P}}-0001-4000-8000-000000000001', 'ISO-{{N}}', 'AdminEmp',
        'tenant-{{n}}-admin.personal@iso.test', DATE '2024-01-01', 'FULL_TIME', 'ACTIVE', '{{P}}-0004-4000-8000-000000000001', 'ISO-{{N}} Head', NULL),
       ('{{P}}-0003-4000-8000-000000000002', '{{T}}', 'ISO-{{N}}-002', '{{P}}-0001-4000-8000-000000000002', 'ISO-{{N}}', 'StaffEmp',
        'tenant-{{n}}-employee.personal@iso.test', DATE '2024-02-01', 'FULL_TIME', 'ACTIVE', '{{P}}-0004-4000-8000-000000000001', 'ISO-{{N}} Engineer',
        '{{P}}-0003-4000-8000-000000000001');

INSERT INTO leave_types (id, tenant_id, leave_code, leave_name, description, is_active)
VALUES ('{{P}}-0005-4000-8000-000000000001', '{{T}}', 'ISO{{N}}CL', 'ISO-{{N}} Casual Leave', 'ISO-{{N}} leave type', true);

-- Balance is resolved for the tenant-local "today" year; seed this year and next (year-boundary safe).
INSERT INTO leave_balances (tenant_id, employee_id, leave_type_id, year, opening_balance, accrued, used, pending, available,
                            carried_forward, encashed, lapsed)
SELECT '{{T}}', '{{P}}-0003-4000-8000-000000000002', '{{P}}-0005-4000-8000-000000000001', y, 20, 0, 0, 0, 20, 0, 0, 0
FROM generate_series(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int + 1) AS y;

INSERT INTO leave_requests (id, tenant_id, employee_id, leave_type_id, request_number, start_date, end_date, total_days, reason, status, applied_on)
VALUES ('{{P}}-0006-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', '{{P}}-0005-4000-8000-000000000001',
        'ISO-{{N}}-LR-001', DATE '2030-03-02', DATE '2030-03-03', 2, 'ISO-{{N}} family trip', 'PENDING', now());

INSERT INTO expense_claims (id, tenant_id, employee_id, claim_date, category, description, amount, status)
VALUES ('{{P}}-0007-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', DATE '2030-01-10', 'TRAVEL',
        'ISO-{{N}} taxi claim', 123.45, 'SUBMITTED');

INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience)
VALUES ('{{P}}-0008-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} Townhall', 'ISO-{{N}} announcement body', 'GENERAL', 'MEDIUM', 'PUBLISHED', 'ALL_EMPLOYEES');

INSERT INTO ticket_categories (id, tenant_id, name, is_active)
VALUES ('{{P}}-0009-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} IT', true);

INSERT INTO tickets (id, tenant_id, ticket_number, employee_id, subject, description, priority, status)
VALUES ('{{P}}-000a-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-TKT-001', '{{P}}-0003-4000-8000-000000000002', 'ISO-{{N}} laptop broken',
        'ISO-{{N}} ticket body', 'MEDIUM', 'OPEN');

INSERT INTO holidays (id, tenant_id, holiday_name, holiday_date, holiday_type, year)
VALUES ('{{P}}-000b-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} Founders Day', DATE '2030-05-0{{D}}', 'COMPANY_EVENT', 2030);

INSERT INTO assets (id, tenant_id, asset_code, asset_name, status, assigned_to)
VALUES ('{{P}}-000c-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-AST-001', 'ISO-{{N}} MacBook', 'ASSIGNED',
        '{{P}}-0003-4000-8000-000000000001');

INSERT INTO employee_loans (id, tenant_id, employee_id, loan_type, principal_amount, status)
VALUES ('{{P}}-000d-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', 'SALARY_ADVANCE', 5000, 'PENDING');

INSERT INTO contracts (id, tenant_id, title, type, status, employee_id, start_date, description)
VALUES ('{{P}}-000e-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} Employment Contract', 'EMPLOYMENT', 'DRAFT',
        '{{P}}-0003-4000-8000-000000000002', DATE '2024-02-01', 'ISO-{{N}} contract');

-- contract_versions has no tenant_id: isolation must come from its parent contract.
INSERT INTO contract_versions (id, contract_id, version_number, content, change_notes)
VALUES ('{{P}}-0021-4000-8000-000000000001', '{{P}}-000e-4000-8000-000000000001', 1,
        '{"text":"ISO-{{N}} contract v1 terms"}'::jsonb, 'ISO-{{N}} initial version');

INSERT INTO job_openings (id, tenant_id, job_code, job_title, department_id, status, is_active)
VALUES ('{{P}}-000f-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-JOB-001', 'ISO-{{N}} Backend Engineer',
        '{{P}}-0004-4000-8000-000000000001', 'OPEN', true);

INSERT INTO candidates (id, tenant_id, candidate_code, job_opening_id, first_name, last_name, email, status)
VALUES ('{{P}}-0010-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-CAN-001', '{{P}}-000f-4000-8000-000000000001', 'ISO-{{N}}',
        'Candidate', 'candidate-{{n}}@iso.test', 'NEW');

INSERT INTO applicants (id, tenant_id, candidate_id, job_opening_id, status, notes)
VALUES ('{{P}}-0011-4000-8000-000000000001', '{{T}}', '{{P}}-0010-4000-8000-000000000001', '{{P}}-000f-4000-8000-000000000001',
        'APPLIED', 'ISO-{{N}} applicant notes');

INSERT INTO goals (id, tenant_id, employee_id, title, description, start_date, due_date, status)
VALUES ('{{P}}-0012-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', 'ISO-{{N}} Ship v2', 'ISO-{{N}} goal',
        DATE '2030-01-01', DATE '2030-12-31', 'ACTIVE');

INSERT INTO review_cycles (id, tenant_id, cycle_name, status, start_date, end_date)
VALUES ('{{P}}-0013-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} FY30 Cycle', 'ACTIVE', DATE '2030-01-01', DATE '2030-12-31');

INSERT INTO performance_reviews (id, tenant_id, employee_id, reviewer_id, review_cycle_id, review_type, status, strengths)
VALUES ('{{P}}-0014-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', '{{P}}-0003-4000-8000-000000000001',
        '{{P}}-0013-4000-8000-000000000001', 'MANAGER', 'DRAFT', 'ISO-{{N}} strengths');

INSERT INTO training_programs (id, tenant_id, program_code, program_name, description, status)
VALUES ('{{P}}-0015-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-TRN-001', 'ISO-{{N}} Security Training', 'ISO-{{N}} program', 'SCHEDULED');

INSERT INTO pulse_surveys (id, tenant_id, title, description, status, survey_type, start_date, end_date)
VALUES ('{{P}}-0016-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} Pulse', 'ISO-{{N}} survey', 'DRAFT', 'ENGAGEMENT',
        DATE '2030-01-01', DATE '2030-01-31');

INSERT INTO wiki_spaces (id, tenant_id, name, description, slug, visibility)
VALUES ('{{P}}-0017-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} Space', 'ISO-{{N}} wiki space', 'iso-{{n}}-space', 'ORGANIZATION');

INSERT INTO wiki_pages (id, tenant_id, space_id, title, slug, content, status, visibility)
VALUES ('{{P}}-0018-4000-8000-000000000001', '{{T}}', '{{P}}-0017-4000-8000-000000000001', 'ISO-{{N}} Runbook', 'iso-{{n}}-runbook',
        '{"type":"doc","text":"ISO-{{N}} secret runbook"}'::jsonb, 'PUBLISHED', 'ORGANIZATION');

INSERT INTO blog_posts (id, tenant_id, title, slug, content, status, visibility)
VALUES ('{{P}}-0019-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} Blog', 'iso-{{n}}-blog',
        '{"type":"doc","text":"ISO-{{N}} blog body"}'::jsonb, 'PUBLISHED', 'ORGANIZATION');

INSERT INTO social_posts (id, tenant_id, post_type, content, author_id, visibility, likes_count, comments_count)
VALUES ('{{P}}-001a-4000-8000-000000000001', '{{T}}', 'POST', 'ISO-{{N}} wall post', '{{P}}-0003-4000-8000-000000000002',
        'ORGANIZATION', 0, 0);

INSERT INTO payroll_runs (id, tenant_id, pay_period_month, pay_period_year, payroll_date, status)
VALUES ('{{P}}-001b-4000-8000-000000000001', '{{T}}', 1, 2030, DATE '2030-01-31', 'DRAFT');

INSERT INTO payslips (id, tenant_id, payroll_run_id, employee_id, pay_period_month, pay_period_year, pay_date,
                      basic_salary, gross_salary, total_deductions, net_salary)
VALUES ('{{P}}-001c-4000-8000-000000000001', '{{T}}', '{{P}}-001b-4000-8000-000000000001', '{{P}}-0003-4000-8000-000000000002',
        1, 2030, DATE '2030-01-31', 7777{{D}}, 8888{{D}}, 1111, 7777{{D}});

INSERT INTO projects (id, tenant_id, project_code, name, description, start_date, status, priority)
VALUES ('{{P}}-001d-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-PRJ', 'ISO-{{N}} Apollo', 'ISO-{{N}} project', DATE '2030-01-01',
        'IN_PROGRESS', 'HIGH');

INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, start_date)
VALUES ('{{P}}-0023-4000-8000-000000000001', '{{T}}', '{{P}}-001d-4000-8000-000000000001', '{{P}}-0003-4000-8000-000000000002',
        'DEVELOPER', DATE '2030-01-01');

INSERT INTO notifications (id, tenant_id, user_id, type, title, message, is_read, priority)
VALUES ('{{P}}-001e-4000-8000-000000000001', '{{T}}', '{{P}}-0001-4000-8000-000000000001', 'ANNOUNCEMENT', 'ISO-{{N}} notice',
        'ISO-{{N}} notification body', false, 'NORMAL');

INSERT INTO letter_templates (id, tenant_id, name, code, description, category, template_content, is_active)
VALUES ('{{P}}-001f-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} Experience Template', 'ISO{{N}}EXP', 'ISO-{{N}} template',
        'EXPERIENCE', 'ISO-{{N}} template body', true);

INSERT INTO generated_letters (id, tenant_id, reference_number, template_id, category, letter_title, generated_content, status, employee_id)
VALUES ('{{P}}-0020-4000-8000-000000000001', '{{T}}', 'ISO-{{N}}-LTR-001', '{{P}}-001f-4000-8000-000000000001', 'EXPERIENCE',
        'ISO-{{N}} Experience Letter', 'ISO-{{N}} confidential letter body', 'DRAFT', '{{P}}-0003-4000-8000-000000000002');

-- ── Phase 3: high-risk modules (payroll/statutory, platform-ish config, OKR, recognition) ──
INSERT INTO webhooks (id, tenant_id, name, url, secret, status, consecutive_failures, max_retries, timeout_seconds)
VALUES ('{{P}}-0022-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} hook', 'https://iso-{{n}}.example.test/hook',
        'iso-{{n}}-synthetic-webhook-secret', 'ACTIVE', 0, 3, 10);
INSERT INTO webhook_events (webhook_id, event_type) VALUES ('{{P}}-0022-4000-8000-000000000001', 'EMPLOYEE_CREATED');

INSERT INTO salary_structures (id, tenant_id, employee_id, effective_date, basic_salary, is_active)
VALUES ('{{P}}-0024-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', DATE '2024-01-01', 5555{{D}}, true);

INSERT INTO tax_declarations (id, tenant_id, employee_id, financial_year, tax_regime, status)
VALUES ('{{P}}-0025-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', '2030-31', 'OLD_REGIME', 'DRAFT');

INSERT INTO office_locations (id, tenant_id, location_name, location_code, latitude, longitude, geofence_radius_meters, is_active)
VALUES ('{{P}}-0026-4000-8000-000000000001', '{{T}}', 'ISO-{{N}} HQ', 'ISO{{N}}HQ', 12.97, 77.59, 100, true);

INSERT INTO objectives (id, tenant_id, owner_id, title, description, objective_level, status, start_date, end_date)
VALUES ('{{P}}-0027-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', 'ISO-{{N}} objective',
        'ISO-{{N}} okr', 'INDIVIDUAL', 'ACTIVE', DATE '2030-01-01', DATE '2030-12-31');

INSERT INTO recognitions (id, tenant_id, giver_id, receiver_id, type, title, message, is_public, is_anonymous, is_approved,
                          likes_count, comments_count, points_awarded)
VALUES ('{{P}}-0028-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000001', '{{P}}-0003-4000-8000-000000000002',
        'KUDOS', 'ISO-{{N}} kudos', 'ISO-{{N}} great work', true, false, true, 0, 0, 0);

INSERT INTO expense_items (id, tenant_id, expense_claim_id, description, amount, expense_date, receipt_storage_path, receipt_file_name)
VALUES ('{{P}}-0029-4000-8000-000000000001', '{{T}}', '{{P}}-0007-4000-8000-000000000001', 'ISO-{{N}} taxi receipt', 10,
        DATE '2030-01-10', '{{T}}/receipts/iso-{{n}}-receipt.pdf', 'iso-{{n}}-receipt.pdf');

-- Child tables without tenant_id / RLS (Phase 3 #1) and the platform DLQ (no tenant_id by design).
INSERT INTO announcement_target_departments (announcement_id, department_id)
VALUES ('{{P}}-0008-4000-8000-000000000001', '{{P}}-0004-4000-8000-000000000001');
INSERT INTO failed_kafka_events (id, topic, partition, "offset", payload, payload_truncated, error_message, status, replay_count)
VALUES ('{{P}}-002a-4000-8000-000000000001', 'nu-aura.notifications.dlt', 0, 1{{D}},
        '{"tenantId":"{{T}}","subject":"ISO-{{N}} dlq payload"}', false, 'ISO-{{N}} failure', 'PENDING_REPLAY', 0);
