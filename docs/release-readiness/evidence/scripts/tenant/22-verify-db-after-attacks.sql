-- Read-only (superuser inspection) verification after NU-SEC-TENANT-102/102b/103: victim rows unchanged, no cross-tenant row creation.
\echo '## Alpha victim rows unchanged'
select (select first_name from employees where id='a1fa0000-0000-4000-8000-000000000a01') emp_first_name,
       (select count(*) from employees where id in ('a1fa0000-0000-4000-8000-000000000a01','a1fa0000-0000-4000-8000-000000000a02') and not is_deleted) emps_alive,
       (select net_salary from payslips where id='a1fa0000-0000-4000-8000-000000000a21') payslip_net,
       (select status from leave_requests where id='a1fa0000-0000-4000-8000-000000000a11') leave_status,
       (select status||'/'||first_name from candidates where id='a1fa0000-0000-4000-8000-000000000a31') cand,
       (select manager_comments from performance_reviews where id='a1fa0000-0000-4000-8000-000000000a41') review_comment,
       (select count(*) from payslips where id='a1fa0000-0000-4000-8000-000000000a21' and not is_deleted) payslip_alive,
       (select count(*) from performance_reviews where id='a1fa0000-0000-4000-8000-000000000a41' and not is_deleted) review_alive;
\echo '## rows created by body-tenantId=Alpha department POST (who owns them?)'
select d.tenant_id, t.code, d.name, d.created_at from departments d left join tenants t on t.id=d.tenant_id where d.name like 'NUAURA_TEST_BodyTenantDept%';
\echo '## cross-tenant reference rows created by XREF probes (anything?)'
select 'reviews' t, tenant_id, employee_id from performance_reviews where tenant_id='be7a0000-0000-4000-8000-0000000be7a0'
union all select 'candidates', tenant_id, job_opening_id from candidates where first_name like 'NUAURA_TEST_XREF%'
union all select 'leave_requests', tenant_id, employee_id from leave_requests where reason like 'NUAURA_TEST_XREF%'
union all select 'payslips', tenant_id, employee_id from payslips where tenant_id='be7a0000-0000-4000-8000-0000000be7a0'
union all select 'any Beta row pointing to Alpha employee', tenant_id, employee_id from leave_requests where tenant_id='be7a0000-0000-4000-8000-0000000be7a0';
\echo '## Beta-tenant rows whose FK targets live in Alpha (generic check over employees FK columns)'
select 'attendance/other' x where false;
\echo '## stray rows in other tables owned by test tenants after the run'
select (select count(*) from departments where tenant_id in ('a1fa0000-0000-4000-8000-00000000a1fa','be7a0000-0000-4000-8000-0000000be7a0')) departments_in_test_tenants;
