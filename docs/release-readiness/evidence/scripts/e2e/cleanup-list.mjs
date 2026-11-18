import {sql} from './lib.mjs';
const T = [
['announcements','title'],['attendance_work_requests','reason'],['blog_posts','title'],['blog_posts','slug'],['employee_referrals','job_title'],['goals','title'],['job_openings','job_title'],['key_results','title'],['knowledge_templates','name'],['leave_requests','reason'],['objectives','title'],['onboarding_checklist_templates','name'],['post_comments','content'],['recruitment_agencies','name'],['review_cycles','cycle_name'],['scorecard_templates','name'],['social_posts','content'],['surveys','title'],['tickets','subject'],['tickets','description'],['wiki_pages','title'],['wiki_pages','slug'],['wiki_spaces','name'],['wiki_spaces','slug'],['wiki_spaces','description']];
for (const [t,c] of T) {
  try { const o = sql(`SELECT id, left(${c}::text,70) FROM ${t} WHERE ${c}::text ILIKE '%NUAURA_TEST%'`); console.log(`## ${t}.${c}\n${o.trim()||'(none)'}`); } catch(e){ console.log(`## ${t}.${c} ERR ${e.message}`); }
}
for (const [t,id] of [['social_posts','1988ed4b-9aa9-4cbd-a9ca-5776897c0374'],['tickets','34c02a4b-85af-47c0-b77b-aafccda8f903'],['leave_requests','f46db6e7-a7a8-4856-af59-31f629b9f5b9']]) {
  try { console.log(`## known ${t}\n`+sql(`SELECT id, status FROM ${t} WHERE id='${id}'`).trim()); } catch(e){ console.log(`known ${t} ERR ${e.message}`); }
}
