# Test data created by fluence agent (2026-11-15, local dev DB hrms_dev, tenant NuLogic)
All rows prefixed NUAURA_TEST_. No deletes performed. Previous aborted run left no evidence file; nothing to reuse.

| Kind | Name / marker | How created | Notes |
|---|---|---|---|
| wiki_spaces | NUAURA_TEST_space (id a437ab8f-...) | API as admin@ (201) | ORGANIZATION visibility |
| wiki_pages x4 | NUAURA_TEST_draft_private (DRAFT/PRIVATE, canary ZEBRA7731), NUAURA_TEST_pub_org (PUBLISHED/ORG, QUOKKA5519), NUAURA_TEST_private_published (PUBLISHED/PRIVATE, WOMBAT8842), NUAURA_TEST_org_draft (DRAFT/ORG, OTTER2210) | SQL as app role hrms_user under tenant GUC (RLS on), scripts/fluence/seed.sql | API create returns 500 (DEF-FLUENCE-01) so seeding was the only way to get content; author = admin@nulogic.io |
| blog_posts x2 | NUAURA_TEST_blog_draft (DRAFT, LLAMA6603), NUAURA_TEST_blog_pub (PUBLISHED, HERON3308) | same seed | |
| knowledge_templates | NUAURA_TEST_template | same seed | |
| social_posts x3 | 2x NUAURA_TEST_XSS ... (author mani@), 1x NUAURA_TEST_UI_wall_<ts> (UI, author dhanush@) | API + UI | |
| post_comments x4, post_reactions x2 | NUAURA_TEST_comment / NUAURA_TEST_reply | API as dhanush@ / mani@ | 2 runs of the wall script |
Demo accounts used (shared demo password, redacted): admin@ (HR_ADMIN), tenant.admin@ (TENANT_ADMIN), arun@ and anshuman@ (EMPLOYEE), sumit@ (MANAGER), jagadeesh@ (HR_MANAGER), finance@ (FINANCE_ADMIN), mani@ and dhanush@ (TEAM_LEAD).
Cleanup not done (audit mode, no destructive ops).
