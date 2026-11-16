-- NU-SEC-TENANT RLS WRITE proof as the app role (hrms_user). Everything inside BEGIN..ROLLBACK; targets only NUAURA_TEST_ Alpha rows.
\set A 'a1fa0000-0000-4000-8000-00000000a1fa'
\set B 'be7a0000-0000-4000-8000-0000000be7a0'
\echo '### W-sweep: GUC=Beta, UPDATE/DELETE Alpha rows in EVERY tenant table (expect 0 rows affected everywhere)'
BEGIN;
create temp table _w(tbl text, upd bigint, del bigint, err text);
do $$
declare r record; u bigint; d bigint; a uuid:='a1fa0000-0000-4000-8000-00000000a1fa'; b uuid:='be7a0000-0000-4000-8000-0000000be7a0';
begin
 perform set_config('app.current_tenant_id', b::text, true);
 for r in select k.table_name::text tbl from information_schema.columns k join information_schema.tables t on t.table_schema=k.table_schema and t.table_name=k.table_name and t.table_type='BASE TABLE' where k.table_schema='public' and k.column_name='tenant_id' order by 1 loop
  begin
   execute format('update %I set tenant_id = tenant_id where tenant_id = %L', r.tbl, a); get diagnostics u = row_count;
   execute format('delete from %I where tenant_id = %L', r.tbl, a); get diagnostics d = row_count;
   insert into _w values (r.tbl,u,d,null);
  exception when others then insert into _w values (r.tbl,null,null,sqlerrm);
  end;
 end loop;
end $$;
select count(*) tables, count(*) filter (where upd>0) updated_alpha_rows, count(*) filter (where del>0) deleted_alpha_rows, count(*) filter (where err is not null) errored from _w;
select tbl, upd, del, err from _w where upd>0 or del>0 or err is not null;
ROLLBACK;

\echo '### W1-W6 targeted statements (each in its own rolled-back txn)'
\echo 'W1 GUC=Beta UPDATE Alpha employee -> expect UPDATE 0'
BEGIN; select set_config('app.current_tenant_id', :'B', true) \gset
update employees set first_name='NUAURA_TEST_HACKED' where id='a1fa0000-0000-4000-8000-000000000a01'; ROLLBACK;
\echo 'W2 GUC=Beta DELETE Alpha payslip -> expect DELETE 0'
BEGIN; select set_config('app.current_tenant_id', :'B', true) \gset
delete from payslips where id='a1fa0000-0000-4000-8000-000000000a21'; ROLLBACK;
\echo 'W3 GUC=Beta INSERT employee with tenant_id=Alpha -> expect RLS violation'
BEGIN; select set_config('app.current_tenant_id', :'B', true) \gset
insert into employees (id, tenant_id, employee_code, first_name, joining_date, employment_type, status, is_deleted, version)
values (gen_random_uuid(), :'A', 'NUAURA_TEST_X1', 'NUAURA_TEST_Planted', date '2026-01-01', 'FULL_TIME', 'ACTIVE', false, 0); ROLLBACK;
\echo 'W4 GUC=Beta move own employee into Alpha (UPDATE tenant_id=Alpha) -> expect RLS violation'
BEGIN; select set_config('app.current_tenant_id', :'B', true) \gset
update employees set tenant_id=:'A' where id='be7a0000-0000-4000-8000-000000000b01'; ROLLBACK;
\echo 'W5 GUC=Beta INSERT user_roles with tenant_id NULL -> expect RLS violation'
BEGIN; select set_config('app.current_tenant_id', :'B', true) \gset
insert into user_roles (user_id, role_id, tenant_id, is_deleted) select u.id, r.id, null, false from users u, roles r where u.tenant_id=:'B' and r.tenant_id=:'B' limit 1; ROLLBACK;
\echo 'W6 NO GUC: INSERT employee -> expect RLS violation; UPDATE -> 0'
BEGIN; select set_config('app.current_tenant_id', '', true) \gset
insert into employees (id, tenant_id, employee_code, first_name, joining_date, employment_type, status, is_deleted, version)
values (gen_random_uuid(), :'A', 'NUAURA_TEST_X2', 'NUAURA_TEST_Planted', date '2026-01-01', 'FULL_TIME', 'ACTIVE', false, 0); ROLLBACK;
BEGIN; select set_config('app.current_tenant_id', '', true) \gset
update employees set first_name='NUAURA_TEST_HACKED' where tenant_id=:'A'; ROLLBACK;
\echo 'W7 GUC=Beta can set GUC to Alpha mid-transaction (client-controlled GUC; app must never expose this to SQL injection)'
BEGIN; select set_config('app.current_tenant_id', :'B', true) \gset
select set_config('app.current_tenant_id', :'A', true) \gset
select count(*) as alpha_employees_visible_after_guc_switch from employees; ROLLBACK;
\echo 'W8 owner-bypass: app role OWNS the tables; probe table created+rolled back to show owner can drop its own FORCE RLS'
BEGIN;
create table _nuaura_test_probe(id int, tenant_id uuid);
alter table _nuaura_test_probe enable row level security; alter table _nuaura_test_probe force row level security;
create policy p on _nuaura_test_probe using (tenant_id = nullif(current_setting('app.current_tenant_id', true),'')::uuid);
select set_config('app.current_tenant_id', :'A', true) \gset
insert into _nuaura_test_probe values (1, :'A');
select set_config('app.current_tenant_id', :'B', true) \gset
select count(*) as visible_forced_as_owner from _nuaura_test_probe;
alter table _nuaura_test_probe no force row level security;
select count(*) as visible_after_owner_drops_force from _nuaura_test_probe;
ROLLBACK;
select has_table_privilege('hrms_user','employees','TRUNCATE') as app_role_can_truncate_employees, pg_has_role('hrms_user','pg_read_all_data','member') pg_read_all_data;
