import {chromium, newContext, uiLogin, BE} from './lib.mjs';
const b = await chromium.launch();
let c = await newContext(b, {role:'hradmin'});
const A='/api/v1';
// [type, id, method, path]
const J=[
['key_results','401cc4c5-428b-46de-8869-1f69d7822518','DELETE',`${A}/okr/key-results/`],
['objectives','0458fb4d-8a6b-40b0-887d-d0535945b063','DELETE',`${A}/okr/objectives/`],
['objectives','21b8e3a0-c28e-4788-92ce-73a3df1694fb','DELETE',`${A}/okr/objectives/`],
['goals','1ee8c62f-39fc-4b8e-ba74-d503684eb9b9','DELETE',`${A}/goals/`],
['review_cycles','4ace109f-50a0-4cfc-82c7-73c01da64782','DELETE',`${A}/review-cycles/`],
['announcements','11266796-6441-4f39-8fc1-b9cec4440d69','DELETE',`${A}/announcements/`],
['attendance_work_requests','4571a7cc-0dfd-4100-875f-67503857877d','POST',`${A}/attendance/work-requests/`,'/cancel'],
['attendance_work_requests','d9434b1c-aff3-4b65-a6fe-f3bdb1a6f57c','POST',`${A}/attendance/work-requests/`,'/cancel'],
['attendance_work_requests','d62f9401-23e5-4ce9-a254-8a3f64ce4ac1','POST',`${A}/attendance/work-requests/`,'/cancel'],
['leave_requests','9b2a69cb-2cef-4c06-9731-394fe41371c0','POST',`${A}/leave-requests/`,'/cancel'],
['leave_requests','f46db6e7-a7a8-4856-af59-31f629b9f5b9','POST',`${A}/leave-requests/`,'/cancel'],
['leave_requests','300d5482-e0f0-4d1a-916d-2d5897756fef','POST',`${A}/leave-requests/`,'/cancel'],
['tickets','34c02a4b-85af-47c0-b77b-aafccda8f903','DELETE',`${A}/helpdesk/tickets/`],
...['a9002ba3-6e9a-4592-a453-6902142f149e','4f18851d-b5ec-4e44-954c-9f9674a2d32c','212f1657-5819-4bc0-93d4-631aee395516','1b0720c3-2d96-4530-8d9f-1737d74bc3e8','b13da14d-7047-4b53-8083-bcf451ecea29','ee2b979d-dc15-4a6f-9684-2db5931a5453'].map(i=>['job_openings',i,'DELETE',`${A}/recruitment/job-openings/`]),
...['afc93ea1-5560-4b94-a3d3-b7064d5caed8','9e8c31c2-c2fe-4014-9a5d-272efc406efa'].map(i=>['recruitment_agencies',i,'DELETE',`${A}/recruitment/agencies/`]),
['scorecard_templates','53dc139f-dbef-4b0f-b60d-de20cc763499','DELETE',`${A}/recruitment/scorecards/`],
...['6a5ad3d4-85bf-41c2-a8f8-f571cee59549','e1469912-f019-4240-8c10-ba78057e653b','c6370bc3-5cf8-4d39-9653-8ffa0712f27a'].map(i=>['onboarding_checklist_templates',i,'DELETE',`${A}/onboarding/templates/`]),
['surveys','ea02e0c3-c14c-4c8f-9939-01461dcbb75a','DELETE',`${A}/survey-management/`],
['knowledge_templates','04ccda1a-fa19-493e-8105-d21021f73bef','DELETE',`${A}/knowledge/templates/`],
['blog_posts','e0556f89-d531-46a8-a693-dd10e036d1c6','DELETE',`${A}/knowledge/blogs/`],
...['de931c4b-fa1b-4b68-a25f-6ca2b0f4fc57','ba12d612-728f-4717-8f45-1bd60c797c7d','856e60e7-6e8d-4e2e-bd38-7b04ce4c415a','1974494e-541b-40ac-9e84-7ffa292ce519','5a23a500-5e78-45de-ae27-5662c270e99e'].map(i=>['wiki_pages',i,'DELETE',`${A}/knowledge/wiki/pages/`]),
['wiki_spaces','3ad822cc-9f37-448c-8417-d4b3da52939e','DELETE',`${A}/knowledge/wiki/spaces/`],
...['21d7828c-f1f4-4495-9cd4-8c8b3f20f339','2ed4f3f4-6377-414b-8cf2-627bb1d8a502','a602557d-14c3-4287-80a8-e9c2fce086b0','1988ed4b-9aa9-4cbd-a9ca-5776897c0374','e0c0ac32-7f40-4fd2-89e4-62bf5902b5d4','335b7cf2-af37-43fe-8e4a-fb6eef52814d','85ce366e-656f-4a6d-98dd-84b179b6f60d','30c759b4-45cc-4944-b337-409ea312e58b'].map(i=>['social_posts',i,'DELETE',`${A}/wall/posts/`]),
];
let relog=false;
for (const [t,id,m,p,suf=''] of J) {
  const call = async () => { const x=(await c.storageState()).cookies.find(k=>k.name==='XSRF-TOKEN')?.value||''; return c.request.fetch(BE+p+id+suf,{method:m,headers:{'X-XSRF-TOKEN':x}}); };
  let r = await call();
  if (r.status()===401 && !relog) { relog=true; await c.close(); await uiLogin(b,'hradmin','admin@nulogic.io'); c = await newContext(b,{role:'hradmin'}); r = await call(); }
  console.log(t,id,m,r.status(),(r.status()>=300?(await r.text()).slice(0,120):''));
}
await b.close();
