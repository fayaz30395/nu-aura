# NUAURA_TEST cleanup (REST API only, no DB writes)

Deleted as hradmin (arun's wall posts as employee arun). Counts below are by is_deleted flag; "soft" = API soft-delete (row stays, is_deleted=true).

| type | ids deleted | status | remaining live |
|---|---|---|---|
| key_results | 401cc4c5 | soft-deleted | 0 |
| objectives | 0458fb4d, 21b8e3a0 | soft | 0 |
| goals | 1ee8c62f | soft | 0 |
| review_cycles | 4ace109f | soft | 0 |
| announcements | 11266796 | soft | 0 |
| job_openings (6) | a9002ba3, 4f18851d, 212f1657, 1b0720c3, b13da14d, ee2b979d | hard | 0 |
| recruitment_agencies (2) | afc93ea1, 9e8c31c2 | soft | 0 |
| scorecard_templates | 53dc139f | soft | 0 |
| onboarding_checklist_templates (3) | 6a5ad3d4, e1469912, c6370bc3 | soft | 0 |
| surveys | ea02e0c3 | hard | 0 |
| knowledge_templates | 04ccda1a | soft | 0 |
| blog_posts | e0556f89 | soft | 0 |
| wiki_pages (5) | de931c4b, ba12d612, 856e60e7, 1974494e, 5a23a500 | soft | 0 |
| wiki_spaces | 3ad822cc | soft | 0 |
| social_posts (8, incl. 1988ed4b) | all 8 | soft | 0 |
| leave_requests (3, incl. f46db6e7) | cancelled via API | status CANCELLED (no delete API) | 3 rows, cancelled |
| attendance_work_requests (3) | NOT touched | already APPROVED; cancel only allows PENDING (409), no delete API | 3 |
| tickets 34c02a4b | NOT touched | DELETE needs HELPDESK:TICKET_MANAGE, close needs TICKET_RESOLVE; neither hradmin nor employee has them | 1 (OPEN) |
| post_comments (9) | NOT touched | no cascade from soft-deleted posts; DELETE /wall/comments/{id} is author-only; hradmin/employee got 400/404 (authors unidentified) | 9 live, orphaned under deleted posts |
| employee_referrals d9547b20 | NOT touched | no delete endpoint in ReferralController | 1 |
