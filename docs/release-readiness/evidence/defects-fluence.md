# Fluence defects (agent fluence, 2026-11-15, local only)
Production Railway DB/JDBC config not probed (remote forbidden). DEF-01 may not reproduce there if the JDBC URL carries stringtype=unspecified: unverified.

## DEF-FLUENCE-01 High: wiki/blog/template writes and view-count updates 500 on PostgreSQL
Root cause: `content` is a String mapped with columnDefinition JSONB and no JSON JDBC type; PG rejects varchar into jsonb ("column content is of type jsonb but expression is of type character varying").
Files: backend/src/main/java/com/nulogic/domain/knowledge/WikiPage.java:47, BlogPost.java:46, DocumentTemplate.java:39 (also TemplateInstantiation.java:32, WikiPageVersion.java:40).
Repro (twice): POST /api/v1/knowledge/wiki/pages, /knowledge/blogs, /knowledge/templates as admin@ or tenant.admin@ -> 500. GET /knowledge/blogs/{id} and GET /knowledge/wiki/pages/{id} -> 500 (view-count save is an UPDATE of content). Wiki comments POST -> 500. Log: backend-session.log requestId 9bde922d-e2e6-4830-9428-e1c8e786ef42.
Fix: `@JdbcTypeCode(SqlTypes.JSON)` on these fields (as other entities do) or stringtype=unspecified; add a create+read integration test. Effort: S.

## DEF-FLUENCE-02 High: wiki create UI sends content as object, API expects String
Files: frontend/app/fluence/wiki/new/page.tsx:166,197 vs backend api/knowledge/dto/CreateWikiPageRequest.java:32. UI Publish Page -> 400 "Cannot deserialize String from Object" (screenshots/fluence/NU-FLUENCE-E2E-U13). Fix: stringify on FE or change DTO to JsonNode. Effort: S.

## DEF-FLUENCE-03 High: wiki list/my/space endpoints 500 (LazyInitializationException)
GET /knowledge/wiki/pages, /pages/my, /pages/space/{id}, plus /knowledge/search/all: "Could not initialize proxy WikiSpace ... no session" when DTO mapping reads page.space outside a transaction (WikiPageController toDto/toDtoBatch). Any page with a space triggers it. UI: /fluence/wiki shows error (U04, U11 console 500). Fix: fetch join space or map inside the transaction. Effort: S.

## DEF-FLUENCE-04 High: draft and PRIVATE content is not access-controlled
No status/visibility/space-membership check in WikiPageService.getPageById (WikiPageService.java:140-153), list/tree/search/chat paths. Live proof as tenant.admin@ on admin@'s content:
- GET /fluence/search?query=private&contentType=wiki returns DRAFT+PRIVATE pages (logs/fluence/NU-FLUENCE-E2E-search-leak.txt); blog DRAFT also returned.
- GET /knowledge/wiki/pages/space/{id}/tree lists draft and private titles; /pages/{id}/related lists private page titles.
- POST /fluence/chat retrieval returns draft/private wiki and draft blog as sources/context (logs/fluence/NU-FLUENCE-E2E-chat.json); with a real LLM their text would be summarised.
- Direct GET of a draft currently 500 only because of DEF-01; code has no guard, so fixing DEF-01 exposes it.
Impact today limited to roles holding KNOWLEDGE:* (admin-class), but any role later granted WIKI_READ (DEF-05) sees everyone's drafts/private pages. Fix: central visibility predicate (author, space member, status=PUBLISHED, visibility) in repositories used by list/tree/search/retriever/related; 404 on miss. Effort: M.

## DEF-FLUENCE-05 High (product decision): only HR_ADMIN/TENANT_ADMIN/SUPER_ADMIN hold any KNOWLEDGE:* permission
EMPLOYEE, MANAGER, TEAM_LEAD, HR_MANAGER, FINANCE_ADMIN, PAYROLL_ADMIN, RECRUITMENT_ADMIN: zero. Every wiki/blog/template/search/AI-chat call returns 403 (matrix in logs/fluence/api-battery2-results.json). Wall: EMPLOYEE/HR_ADMIN/HR_MANAGER view only (no post/react/comment). Employee UI still shows the Wiki page shell with a New Page button over 403s (U01). A Keka-replacement wiki/AI-chat for employees cannot work as seeded. Server-side gating itself is correct. Fix: seed WIKI_READ/BLOG_READ/SEARCH/TEMPLATE_READ (+WALL_POST/REACT/COMMENT) for EMPLOYEE only together with DEF-04. Effort: S.

## DEF-FLUENCE-06 Medium: ENABLE_FLUENCE flag absent for tenant
Edit-lock and attachment controllers carry @RequiresFeature(ENABLE_FLUENCE); no flag row exists, so everyone except TENANT_ADMIN/SUPER_ADMIN gets 403 "This feature is not enabled" (admin@ HR_ADMIN denied, requestId 94ac30d3-42a4-4616-b6c4-23c8b6b760be). Two-editor conflict test impossible. Fix: seed flag per tenant (default on). Effort: S.

## DEF-FLUENCE-07 Low: chat SSE connection stays open after done event (>45s); UI shows "Connection issue" under test harness (U06, INCONCLUSIVE, harness proxy suspected).
## DEF-FLUENCE-08 Low: unknown page id returns 400 "Wiki page not found" (not 404); real-but-broken id returns 500 (existence oracle). Wall own-only edit/delete returns 400 not 403.
## DEF-FLUENCE-09 Low/info: XSS filter (common/validation/InputSanitizer.java:15) is a blocklist; entity-encoded `&#106;avascript:` and iframe srcdoc are stored. Wall UI renders them as inert text (U11), so no exploit seen.
