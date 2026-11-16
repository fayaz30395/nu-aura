begin;
set local app.current_tenant_id='660e8400-e29b-41d4-a716-446655440001';
with c(t) as (values ('NUAURA_TEST_CANARY_ZEBRA7731 private draft secret'),('NUAURA_TEST_PUBLISHED_QUOKKA5519 shared body'),('NUAURA_TEST_PRIVPUB_WOMBAT8842 private but published'),('NUAURA_TEST_ORGDRAFT_OTTER2210 org draft'))
select 1;
insert into wiki_pages(id,tenant_id,space_id,title,slug,excerpt,content,status,visibility,created_by,updated_by,published_at,published_by,body_text)
select gen_random_uuid(),'660e8400-e29b-41d4-a716-446655440001','a437ab8f-28cf-4ba2-8f5d-c4569e308f8b',v.title,v.slug,'NUAURA_TEST',
 json_build_object('type','doc','content',json_build_array(json_build_object('type','paragraph','content',json_build_array(json_build_object('type','text','text',v.body)))))::jsonb,
 v.st,v.vis,'48000000-0e02-0000-0000-000000000099','48000000-0e02-0000-0000-000000000099',
 case when v.st='PUBLISHED' then now() end, case when v.st='PUBLISHED' then '48000000-0e02-0000-0000-000000000099'::uuid end,
 v.body
from (values
 ('NUAURA_TEST_draft_private','nuaura-test-draft-private','DRAFT','PRIVATE','NUAURA_TEST_CANARY_ZEBRA7731 private draft secret'),
 ('NUAURA_TEST_pub_org','nuaura-test-pub-org','PUBLISHED','ORGANIZATION','NUAURA_TEST_PUBLISHED_QUOKKA5519 shared body'),
 ('NUAURA_TEST_private_published','nuaura-test-private-published','PUBLISHED','PRIVATE','NUAURA_TEST_PRIVPUB_WOMBAT8842 private but published'),
 ('NUAURA_TEST_org_draft','nuaura-test-org-draft','DRAFT','ORGANIZATION','NUAURA_TEST_ORGDRAFT_OTTER2210 org draft')
) v(title,slug,st,vis,body);
insert into blog_posts(id,tenant_id,title,slug,excerpt,content,status,visibility,created_by,updated_by,body_text)
select gen_random_uuid(),'660e8400-e29b-41d4-a716-446655440001',v.title,v.slug,'NUAURA_TEST',
 json_build_object('type','doc','content',json_build_array(json_build_object('type','paragraph','content',json_build_array(json_build_object('type','text','text',v.body)))))::jsonb,
 v.st,'ORGANIZATION','48000000-0e02-0000-0000-000000000099','48000000-0e02-0000-0000-000000000099',v.body
from (values
 ('NUAURA_TEST_blog_draft','nuaura-test-blog-draft','DRAFT','NUAURA_TEST_BLOGDRAFT_LLAMA6603 draft blog'),
 ('NUAURA_TEST_blog_pub','nuaura-test-blog-pub','PUBLISHED','NUAURA_TEST_BLOGPUB_HERON3308 published blog')) v(title,slug,st,body);
insert into knowledge_templates(id,tenant_id,name,slug,category,content,created_by,updated_by)
values(gen_random_uuid(),'660e8400-e29b-41d4-a716-446655440001','NUAURA_TEST_template','nuaura-test-tpl','GENERAL','{"type":"doc","content":[]}'::jsonb,'48000000-0e02-0000-0000-000000000099','48000000-0e02-0000-0000-000000000099');
commit;
select title,status,visibility,id from wiki_pages where title like 'NUAURA_TEST%' order by title;
select title,status,id from blog_posts where title like 'NUAURA_TEST%';
