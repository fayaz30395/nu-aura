-- NU-AURA release-readiness (agent: tenant). Victim data for tenant NUAURA_TEST_Alpha (a1fa0000-0000-4000-8000-00000000a1fa).
-- Superuser seed, LOCAL DEV DB. Fixed IDs (...0aXX) so attack scripts can target them. All strings prefixed NUAURA_TEST_.
-- Beta (be7a...) gets one marker employee so "own data visible, other tenant not" can be asserted.
BEGIN;
\set A 'a1fa0000-0000-4000-8000-00000000a1fa'
\set B 'be7a0000-0000-4000-8000-0000000be7a0'
-- employees (victim PII): Alpha x2 linked to the Alpha users, Beta x1
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, joining_date, employment_type, status, is_deleted, version, personal_email)
SELECT v.id, v.tid, v.code, (SELECT id FROM users WHERE email=v.mail AND tenant_id=v.tid), v.fn, 'Victim', date '2025-01-06', 'FULL_TIME', 'ACTIVE', false, 0, v.mail
FROM (VALUES
 ('a1fa0000-0000-4000-8000-000000000a01'::uuid,'a1fa0000-0000-4000-8000-00000000a1fa'::uuid,'NUAURA_TEST_A001','NUAURA_TEST_AlphaEmpOne','nuaura_test_alpha_emp@nuaura-test.example'),
 ('a1fa0000-0000-4000-8000-000000000a02'::uuid,'a1fa0000-0000-4000-8000-00000000a1fa'::uuid,'NUAURA_TEST_A002','NUAURA_TEST_AlphaAdminEmp','nuaura_test_alpha_admin@nuaura-test.example'),
 ('be7a0000-0000-4000-8000-000000000b01'::uuid,'be7a0000-0000-4000-8000-0000000be7a0'::uuid,'NUAURA_TEST_B001','NUAURA_TEST_BetaEmpOne','nuaura_test_beta_emp@nuaura-test.example')
) v(id,tid,code,fn,mail)
ON CONFLICT (id) DO NOTHING;
-- leave type + leave request (Alpha)
INSERT INTO leave_types (id, tenant_id, leave_code, leave_name, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a10', :'A', 'NUAURA_TEST_AL', 'NUAURA_TEST_AnnualLeave', false, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO leave_requests (id, tenant_id, employee_id, leave_type_id, request_number, start_date, end_date, total_days, reason, status, applied_on, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a11', :'A', 'a1fa0000-0000-4000-8000-000000000a01', 'a1fa0000-0000-4000-8000-000000000a10',
        'NUAURA_TEST_LR-001', date '2026-12-01', date '2026-12-02', 2, 'NUAURA_TEST_ confidential medical reason', 'PENDING', now(), false, 0) ON CONFLICT (id) DO NOTHING;
-- payroll run + payslip (Alpha)
INSERT INTO payroll_runs (id, tenant_id, pay_period_month, pay_period_year, payroll_date, status, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a20', :'A', 10, 2026, date '2026-10-31', 'PAID', false, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO payslips (id, tenant_id, payroll_run_id, employee_id, pay_period_month, pay_period_year, pay_date, basic_salary, gross_salary, total_deductions, net_salary, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a21', :'A', 'a1fa0000-0000-4000-8000-000000000a20', 'a1fa0000-0000-4000-8000-000000000a01', 10, 2026, date '2026-10-31', 123456.00, 234567.00, 11111.00, 223456.00, false, 0) ON CONFLICT (id) DO NOTHING;
-- recruitment: job + candidate (Alpha)
INSERT INTO job_openings (id, tenant_id, job_code, job_title, status, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a30', :'A', 'NUAURA_TEST_JOB1', 'NUAURA_TEST_Secret Role', 'OPEN', false, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO candidates (id, tenant_id, candidate_code, job_opening_id, first_name, last_name, email, status, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a31', :'A', 'NUAURA_TEST_C001', 'a1fa0000-0000-4000-8000-000000000a30', 'NUAURA_TEST_Cand', 'Victim', 'nuaura_test_cand@nuaura-test.example', 'NEW', false, 0) ON CONFLICT (id) DO NOTHING;
-- performance: cycle + review (Alpha)
INSERT INTO review_cycles (id, tenant_id, cycle_name, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a40', :'A', 'NUAURA_TEST_Cycle', false, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO performance_reviews (id, tenant_id, employee_id, reviewer_id, review_cycle_id, manager_comments, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a41', :'A', 'a1fa0000-0000-4000-8000-000000000a01', 'a1fa0000-0000-4000-8000-000000000a02', 'a1fa0000-0000-4000-8000-000000000a40', 'NUAURA_TEST_ confidential review comment', false, 0) ON CONFLICT (id) DO NOTHING;
-- wiki: private space + private page (Alpha)
INSERT INTO wiki_spaces (id, tenant_id, name, slug, visibility, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a50', :'A', 'NUAURA_TEST_PrivateSpace', 'nuaura-test-private-space', 'PRIVATE', false, 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO wiki_pages (id, tenant_id, space_id, title, slug, content, visibility, status, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a51', :'A', 'a1fa0000-0000-4000-8000-000000000a50', 'NUAURA_TEST_Private Page', 'nuaura-test-private-page', '{"type":"doc","content":[{"type":"text","text":"NUAURA_TEST_ alpha secret wiki body"}]}'::jsonb, 'PRIVATE', 'PUBLISHED', false, 0) ON CONFLICT (id) DO NOTHING;
-- uploaded file metadata (Alpha)
INSERT INTO file_metadata (id, tenant_id, file_name, storage_path, content_type, file_size, is_deleted, version)
VALUES ('a1fa0000-0000-4000-8000-000000000a60', :'A', 'NUAURA_TEST_alpha-secret.txt', 'nuaura-test/alpha/alpha-secret.txt', 'text/plain', 28, false, 0) ON CONFLICT (id) DO NOTHING;
COMMIT;
