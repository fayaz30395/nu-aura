-- NU-SEC-TENANT RLS proof, run as the ACTUAL app role (hrms_user). Read-only except ROLLBACKed blocks.
\set A 'a1fa0000-0000-4000-8000-00000000a1fa'
\set B 'be7a0000-0000-4000-8000-0000000be7a0'
\set N '660e8400-e29b-41d4-a716-446655440001'
\echo '### R1 identity / attributes'
select current_user, (select rolsuper from pg_roles where rolname=current_user) super, (select rolbypassrls from pg_roles where rolname=current_user) bypassrls;
select pg_get_userbyid(c.relowner) table_owner, count(*) tables, count(*) filter (where c.relrowsecurity) rls_on, count(*) filter (where c.relforcerowsecurity) forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' group by 1;

\echo '### R2 per-table sweep (every public table with a tenant_id column): rows visible per GUC state'
create temp table _t as
 select k.table_name::text tbl from information_schema.columns k
 join information_schema.tables t on t.table_schema=k.table_schema and t.table_name=k.table_name and t.table_type='BASE TABLE'
 where k.table_schema='public' and k.column_name='tenant_id' order by 1;
select count(*) as tenant_id_tables from _t;

create temp table _res(tbl text, no_guc bigint, beta_total bigint, beta_sees_alpha bigint, beta_sees_nulogic bigint, alpha_total bigint, alpha_sees_beta bigint, nulogic_sees_alpha bigint, nulogic_total bigint);
do $$
declare r record; a uuid:='a1fa0000-0000-4000-8000-00000000a1fa'; b uuid:='be7a0000-0000-4000-8000-0000000be7a0'; n uuid:='660e8400-e29b-41d4-a716-446655440001';
  c0 bigint; cb bigint; cba bigint; cbn bigint; ca bigint; cab bigint; cna bigint; cn bigint;
begin
 for r in select tbl from _t loop
  perform set_config('app.current_tenant_id','',true);
  execute format('select count(*) from %I',r.tbl) into c0;
  perform set_config('app.current_tenant_id',b::text,true);
  execute format('select count(*) from %I',r.tbl) into cb;
  execute format('select count(*) from %I where tenant_id=%L',r.tbl,a) into cba;
  execute format('select count(*) from %I where tenant_id=%L',r.tbl,n) into cbn;
  perform set_config('app.current_tenant_id',a::text,true);
  execute format('select count(*) from %I',r.tbl) into ca;
  execute format('select count(*) from %I where tenant_id=%L',r.tbl,b) into cab;
  perform set_config('app.current_tenant_id',n::text,true);
  execute format('select count(*) from %I',r.tbl) into cn;
  execute format('select count(*) from %I where tenant_id=%L',r.tbl,a) into cna;
  insert into _res values (r.tbl,c0,cb,cba,cbn,ca,cab,cna,cn);
 end loop;
 perform set_config('app.current_tenant_id','',true);
end $$;
\echo '--- tables where NO GUC returns rows (must be 0 rows; expected exceptions = global catalogs / outbox)'
select tbl, no_guc from _res where no_guc>0 order by 1;
\echo '--- tables where Beta GUC sees Alpha or NuLogic rows (must be 0 rows)'
select tbl, beta_sees_alpha, beta_sees_nulogic from _res where beta_sees_alpha>0 or beta_sees_nulogic>0 order by 1;
\echo '--- tables where Alpha GUC sees Beta rows (must be 0 rows)'
select tbl, alpha_sees_beta from _res where alpha_sees_beta>0 order by 1;
\echo '--- tables where NuLogic GUC sees Alpha rows (must be 0 rows)'
select tbl, nulogic_sees_alpha from _res where nulogic_sees_alpha>0 order by 1;
\echo '--- control: tables where Alpha GUC sees its own rows (proves seed visible to owner tenant)'
select tbl, alpha_total from _res where alpha_total>0 order by 1;
\echo '--- control: totals'
select count(*) tables_swept, count(*) filter (where no_guc>0) leak_no_guc, count(*) filter (where beta_sees_alpha>0 or beta_sees_nulogic>0) leak_beta, count(*) filter (where alpha_sees_beta>0) leak_alpha_to_beta, count(*) filter (where nulogic_sees_alpha>0) leak_nulogic_to_alpha, sum(nulogic_total) nulogic_rows_visible_to_nulogic from _res;
