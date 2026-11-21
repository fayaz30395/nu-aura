-- Synthetic tenant for ScheduledJobsTenantIterationTest. Executed once per tenant, as the Postgres
-- superuser (bypasses RLS: seeding only). One row set per scheduled job so a run can be checked per tenant.
-- Tokens: {{T}} tenant uuid, {{P}} 8-hex id prefix, {{N}} marker, {{S}} tenant status, {{DEL}} is_deleted,
-- {{TODAY}} tenant-local (Asia/Kolkata) date, {{FREQ}} policy acknowledgment window (NULL = broken policy).
-- Id layout: {{P}}-<type 4 hex>-4000-8000-<n 12 hex>.

INSERT INTO tenants (id, tenant_id, code, name, status, contact_email, country, timezone, is_deleted)
VALUES ('{{T}}', NULL, 'sjob-{{N}}', 'SJOB-{{N}} Tenant', '{{S}}', 'sjob-{{N}}@iso.test', 'IN', 'Asia/Kolkata', {{DEL}});

-- 1 = manager, 2 = staff (reports to 1).
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status)
VALUES ('{{P}}-0001-4000-8000-000000000001', '{{T}}', 'sjob-{{N}}-manager@iso.test', 'SJOB-{{N}}', 'Manager',
        '$2a$10$isolationsuiteplaceholderhashxxxxxxxxxxxxxxxxxxxxxxxx', 'ACTIVE'),
       ('{{P}}-0001-4000-8000-000000000002', '{{T}}', 'sjob-{{N}}-staff@iso.test', 'SJOB-{{N}}', 'Staff',
        '$2a$10$isolationsuiteplaceholderhashxxxxxxxxxxxxxxxxxxxxxxxx', 'ACTIVE');

INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, joining_date, employment_type, status, manager_id)
VALUES ('{{P}}-0003-4000-8000-000000000001', '{{T}}', 'SJOB-{{N}}-001', '{{P}}-0001-4000-8000-000000000001', 'SJOB-{{N}}', 'Manager',
        DATE '2024-01-01', 'FULL_TIME', 'ACTIVE', NULL),
       ('{{P}}-0003-4000-8000-000000000002', '{{T}}', 'SJOB-{{N}}-002', '{{P}}-0001-4000-8000-000000000002', 'SJOB-{{N}}', 'Staff',
        DATE '2024-01-01', 'FULL_TIME', 'ACTIVE', '{{P}}-0003-4000-8000-000000000001');

-- Leave accrual: MONTHLY, 12/year -> 1.00 per employee per month.
INSERT INTO leave_types (id, tenant_id, leave_code, leave_name, annual_quota, accrual_type, is_active)
VALUES ('{{P}}-0005-4000-8000-000000000001', '{{T}}', 'SJMON', 'SJOB-{{N}} Monthly', 12, 'MONTHLY', true);

-- Contract lifecycle: 1 = past end (expire), 3 = ends in 10 days (stays ACTIVE, one EXPIRY reminder at +3).
-- Reminder 1 on contract 1 is already due and un-notified (dispatch).
INSERT INTO contracts (id, tenant_id, title, type, status, employee_id, start_date, end_date, auto_renew, created_by)
VALUES ('{{P}}-000e-4000-8000-000000000001', '{{T}}', 'SJOB-{{N}} Ended', 'EMPLOYMENT', 'ACTIVE',
        '{{P}}-0003-4000-8000-000000000002', DATE '2024-01-01', DATE '{{TODAY}}' - 2, false, '{{P}}-0001-4000-8000-000000000001'),
       ('{{P}}-000e-4000-8000-000000000003', '{{T}}', 'SJOB-{{N}} Expiring', 'EMPLOYMENT', 'ACTIVE',
        '{{P}}-0003-4000-8000-000000000002', DATE '2024-01-01', DATE '{{TODAY}}' + 10, false, '{{P}}-0001-4000-8000-000000000001');
INSERT INTO contract_reminders (id, tenant_id, contract_id, reminder_date, reminder_type, is_completed)
VALUES ('{{P}}-0022-4000-8000-000000000001', '{{T}}', '{{P}}-000e-4000-8000-000000000001', DATE '{{TODAY}}' - 3, 'EXPIRY', false);

-- Auto-regularization (default 3-day grace): -10 and -3 (inclusive cutoff) regularize, -2 and -1 stay.
-- Last id group = days ago, in hex.
INSERT INTO attendance_records (id, tenant_id, employee_id, attendance_date, status)
VALUES ('{{P}}-0023-4000-8000-00000000000a', '{{T}}', '{{P}}-0003-4000-8000-000000000002', DATE '{{TODAY}}' - 10, 'INCOMPLETE'),
       ('{{P}}-0023-4000-8000-000000000003', '{{T}}', '{{P}}-0003-4000-8000-000000000002', DATE '{{TODAY}}' - 3, 'INCOMPLETE'),
       ('{{P}}-0023-4000-8000-000000000002', '{{T}}', '{{P}}-0003-4000-8000-000000000002', DATE '{{TODAY}}' - 2, 'INCOMPLETE'),
       ('{{P}}-0023-4000-8000-000000000001', '{{T}}', '{{P}}-0003-4000-8000-000000000002', DATE '{{TODAY}}' - 1, 'INCOMPLETE');

-- Document expiry: document 1 inside its 30-day reminder window, document 2 not yet.
INSERT INTO documents (id, tenant_id, title, file_name)
VALUES ('{{P}}-0024-4000-8000-000000000001', '{{T}}', 'SJOB-{{N}} Passport', 'passport.pdf'),
       ('{{P}}-0024-4000-8000-000000000002', '{{T}}', 'SJOB-{{N}} Visa', 'visa.pdf');
INSERT INTO document_expiry_tracking (id, tenant_id, document_id, expiry_date, reminder_days_before, is_notified)
VALUES ('{{P}}-0025-4000-8000-000000000001', '{{T}}', '{{P}}-0024-4000-8000-000000000001', DATE '{{TODAY}}' + 10, 30, false),
       ('{{P}}-0025-4000-8000-000000000002', '{{T}}', '{{P}}-0024-4000-8000-000000000002', DATE '{{TODAY}}' + 60, 30, false);
INSERT INTO document_access (id, tenant_id, document_id, user_id, access_level, granted_by, is_active)
VALUES ('{{P}}-0026-4000-8000-000000000001', '{{T}}', '{{P}}-0024-4000-8000-000000000001', '{{P}}-0001-4000-8000-000000000002',
        'VIEW', '{{P}}-0001-4000-8000-000000000001', true),
       ('{{P}}-0026-4000-8000-000000000002', '{{T}}', '{{P}}-0024-4000-8000-000000000002', '{{P}}-0001-4000-8000-000000000002',
        'VIEW', '{{P}}-0001-4000-8000-000000000001', true);

-- Hire: onboarding task of staff, assigned to the manager, due tomorrow -> staff + manager reminded once.
INSERT INTO onboarding_tasks (id, tenant_id, process_id, employee_id, task_name, assigned_to, due_date, status)
VALUES ('{{P}}-0027-4000-8000-000000000001', '{{T}}', '{{P}}-0028-4000-8000-000000000001', '{{P}}-0003-4000-8000-000000000002',
        'SJOB-{{N}} Submit ID proof', '{{P}}-0003-4000-8000-000000000001', DATE '{{TODAY}}' + 1, 'PENDING');

-- Policy acknowledgment: published 400 days ago with a 365-day window, nobody acknowledged.
INSERT INTO compliance_policies (id, tenant_id, name, code, category, status, requires_acknowledgment, effective_date,
                                 acknowledgment_frequency_days, policy_version)
VALUES ('{{P}}-0029-4000-8000-000000000001', '{{T}}', 'SJOB-{{N}} Code of Conduct', 'SJ-COC', 'CODE_OF_CONDUCT', 'PUBLISHED', true,
        DATE '{{TODAY}}' - 400, {{FREQ}}, 1);
