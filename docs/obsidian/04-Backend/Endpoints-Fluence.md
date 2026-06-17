---
title: NU-Fluence Endpoint Catalog — Per-Method
tags: [backend, api, endpoints, rest, catalog, nu-fluence]
---

# NU-Fluence Endpoint Catalog — Per-Method

> Per-method companion to [[Controller-Index]] and [[APIs]] for [[Nu-Fluence]] — wiki,
> blogs, wall, search, AI chat, comments, attachments, engagement, and edit locks. Every
> handler in all 16 NU-Fluence controllers (`api/knowledge` × 15 + `api/wall` × 1) is
> listed with its full path (class base + method path), `@RequiresPermission` value, and a
> short purpose. Evidence is the controller source under `backend/src/main/java/com/nulogic/api/`.

## Counts

| Metric | Count |
|--------|-------|
| Controllers covered | **16** (15 `api/knowledge` + 1 `api/wall`) |
| Total endpoints | **96** |

> Permission column reflects the `@RequiresPermission(Permission.XXX)` on each handler. The
> `SUPER_ADMIN` role bypasses the aspect (see [[APIs]] → Authorization). `FluenceAttachmentController`
> and `FluenceEditLockController` additionally carry a class-level `@RequiresFeature(ENABLE_FLUENCE)`
> gate. Edit-lock and comment handlers list multiple permissions when the annotation passes an
> array (any-of). All wall endpoints fall in the **`WALL` rate bucket** (30/min) — see [[Middleware]].

### BlogCategoryController

Base path: `/api/v1/knowledge/blogs/categories`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/knowledge/blogs/categories` | `KNOWLEDGE_BLOG_CREATE` | Create blog category |
| GET | `/api/v1/knowledge/blogs/categories/{categoryId}` | `KNOWLEDGE_BLOG_READ` | Get category by ID |
| GET | `/api/v1/knowledge/blogs/categories` | `KNOWLEDGE_BLOG_READ` | List all categories |
| GET | `/api/v1/knowledge/blogs/categories/ordered` | `KNOWLEDGE_BLOG_READ` | List categories ordered |
| PUT | `/api/v1/knowledge/blogs/categories/{categoryId}` | `KNOWLEDGE_BLOG_UPDATE` | Update blog category |
| DELETE | `/api/v1/knowledge/blogs/categories/{categoryId}` | `KNOWLEDGE_BLOG_DELETE` | Delete blog category |

### BlogPostController

Base path: `/api/v1/knowledge/blogs`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/knowledge/blogs` | `KNOWLEDGE_BLOG_CREATE` | Create blog post |
| GET | `/api/v1/knowledge/blogs/{postId}` | `KNOWLEDGE_BLOG_READ` | Get post by ID |
| GET | `/api/v1/knowledge/blogs/slug/{slug}` | `KNOWLEDGE_BLOG_READ` | Get post by slug |
| GET | `/api/v1/knowledge/blogs` | `KNOWLEDGE_BLOG_READ` | List published posts |
| GET | `/api/v1/knowledge/blogs/active` | `KNOWLEDGE_BLOG_READ` | List active posts |
| GET | `/api/v1/knowledge/blogs/category/{categoryId}` | `KNOWLEDGE_BLOG_READ` | List posts by category |
| GET | `/api/v1/knowledge/blogs/featured` | `KNOWLEDGE_BLOG_READ` | List featured posts |
| PUT | `/api/v1/knowledge/blogs/{postId}` | `KNOWLEDGE_BLOG_UPDATE` | Update blog post |
| POST | `/api/v1/knowledge/blogs/{postId}/publish` | `KNOWLEDGE_BLOG_PUBLISH` | Publish blog post |
| POST | `/api/v1/knowledge/blogs/{postId}/schedule` | `KNOWLEDGE_BLOG_PUBLISH` | Schedule blog post |
| POST | `/api/v1/knowledge/blogs/{postId}/archive` | `KNOWLEDGE_BLOG_UPDATE` | Archive blog post |
| DELETE | `/api/v1/knowledge/blogs/{postId}` | `KNOWLEDGE_BLOG_DELETE` | Delete blog post |
| GET | `/api/v1/knowledge/blogs/search` | `KNOWLEDGE_SEARCH` | Search blog posts |

### ContentEngagementController

Base path: `/api/v1/fluence/engagement`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/fluence/engagement/likes/wiki/{pageId}` | `KNOWLEDGE_WIKI_READ` | Toggle wiki page like |
| POST | `/api/v1/fluence/engagement/likes/blog/{postId}` | `KNOWLEDGE_BLOG_READ` | Toggle blog post like |
| GET | `/api/v1/fluence/engagement/likes/wiki/{pageId}/status` | `KNOWLEDGE_WIKI_READ` | Check wiki like status |
| GET | `/api/v1/fluence/engagement/likes/blog/{postId}/status` | `KNOWLEDGE_BLOG_READ` | Check blog like status |
| POST | `/api/v1/fluence/engagement/favorites/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_READ` | Toggle favorite on content |
| GET | `/api/v1/fluence/engagement/favorites/{contentType}/{contentId}/status` | `KNOWLEDGE_WIKI_READ` | Check favorite status |
| GET | `/api/v1/fluence/engagement/favorites` | `KNOWLEDGE_WIKI_READ` | List user favorites |
| GET | `/api/v1/fluence/engagement/favorites/type/{contentType}` | `KNOWLEDGE_WIKI_READ` | List favorites by type |
| POST | `/api/v1/fluence/engagement/views/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_READ` | Record a view |
| GET | `/api/v1/fluence/engagement/views/{contentType}/{contentId}/viewers` | `KNOWLEDGE_WIKI_READ` | Get content viewers |
| POST | `/api/v1/fluence/engagement/watches/wiki/{pageId}` | `KNOWLEDGE_WIKI_READ` | Toggle wiki page watch |
| GET | `/api/v1/fluence/engagement/watches/wiki/{pageId}/status` | `KNOWLEDGE_WIKI_READ` | Check watch status |

### FluenceActivityController

Base path: `/api/v1/fluence/activities`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/fluence/activities` | `KNOWLEDGE_WIKI_READ` | Get activity feed |
| GET | `/api/v1/fluence/activities/me` | `KNOWLEDGE_WIKI_READ` | Get current user activity |

### FluenceAttachmentController

Base path: `/api/v1/fluence/attachments` — class-level `@RequiresFeature(ENABLE_FLUENCE)`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/fluence/attachments/recent` | `KNOWLEDGE_WIKI_READ` | Get recent attachments |
| POST | `/api/v1/fluence/attachments/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_CREATE` | Upload file attachment |
| GET | `/api/v1/fluence/attachments/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_READ` | List content attachments |
| GET | `/api/v1/fluence/attachments/{id}/download` | `KNOWLEDGE_WIKI_READ` | Get presigned download URL |
| DELETE | `/api/v1/fluence/attachments/{id}` | `KNOWLEDGE_WIKI_DELETE` | Delete an attachment |

### FluenceChatController

Base path: `/api/v1/fluence/chat`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/fluence/chat` | `KNOWLEDGE_SEARCH` | Stream AI chat response (SSE) |

### FluenceCommentController

Base path: `/api/v1/fluence/comments`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/fluence/comments/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_READ` | List comments for content |
| POST | `/api/v1/fluence/comments/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_CREATE` | Create a comment |
| PUT | `/api/v1/fluence/comments/{contentType}/{contentId}/{commentId}` | `KNOWLEDGE_WIKI_UPDATE` | Update a comment |
| DELETE | `/api/v1/fluence/comments/{contentType}/{contentId}/{commentId}` | `KNOWLEDGE_WIKI_DELETE` | Delete a comment |
| GET | `/api/v1/fluence/comments/{contentType}/{contentId}/{commentId}/permalink` | `KNOWLEDGE_WIKI_READ` | Get comment permalink |

### FluenceEditLockController

Base path: `/api/v1/fluence/edit-lock` — class-level `@RequiresFeature(ENABLE_FLUENCE)`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/fluence/edit-lock/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_UPDATE` or `KNOWLEDGE_BLOG_UPDATE` | Acquire edit lock |
| DELETE | `/api/v1/fluence/edit-lock/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_UPDATE` or `KNOWLEDGE_BLOG_UPDATE` | Release edit lock |
| GET | `/api/v1/fluence/edit-lock/{contentType}/{contentId}` | `KNOWLEDGE_WIKI_READ` or `KNOWLEDGE_BLOG_READ` | Check lock status |
| PUT | `/api/v1/fluence/edit-lock/{contentType}/{contentId}/heartbeat` | `KNOWLEDGE_WIKI_UPDATE` or `KNOWLEDGE_BLOG_UPDATE` | Refresh lock (heartbeat) |

### FluenceSearchController

Base path: `/api/v1/fluence/search`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/fluence/search` | `KNOWLEDGE_SEARCH` | Unified Fluence search (ES, PG fallback) |

### KnowledgeSearchController

Base path: `/api/v1/knowledge/search`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/knowledge/search/wiki` | `KNOWLEDGE_SEARCH` | Search wiki pages |
| GET | `/api/v1/knowledge/search/blog` | `KNOWLEDGE_SEARCH` | Search blog posts |
| GET | `/api/v1/knowledge/search/all` | `KNOWLEDGE_SEARCH` | Search all knowledge content |

### LinkedinPostController

Base path: `/api/v1/linkedin-posts` (stub controller — returns empty results)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/linkedin-posts/active` | `KNOWLEDGE_BLOG_READ` | List active LinkedIn posts |
| GET | `/api/v1/linkedin-posts` | `KNOWLEDGE_BLOG_READ` | List all LinkedIn posts |

### TemplateController

Base path: `/api/v1/knowledge/templates`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/knowledge/templates` | `KNOWLEDGE_TEMPLATE_CREATE` | Create template |
| GET | `/api/v1/knowledge/templates/{templateId}` | `KNOWLEDGE_TEMPLATE_READ` | Get template by ID |
| GET | `/api/v1/knowledge/templates/slug/{slug}` | `KNOWLEDGE_TEMPLATE_READ` | Get template by slug |
| GET | `/api/v1/knowledge/templates` | `KNOWLEDGE_TEMPLATE_READ` | List active templates |
| GET | `/api/v1/knowledge/templates/category/{category}` | `KNOWLEDGE_TEMPLATE_READ` | List templates by category |
| GET | `/api/v1/knowledge/templates/featured` | `KNOWLEDGE_TEMPLATE_READ` | List featured templates |
| GET | `/api/v1/knowledge/templates/popular` | `KNOWLEDGE_TEMPLATE_READ` | List popular templates |
| PUT | `/api/v1/knowledge/templates/{templateId}` | `KNOWLEDGE_TEMPLATE_UPDATE` | Update template |
| POST | `/api/v1/knowledge/templates/{templateId}/toggle-active` | `KNOWLEDGE_TEMPLATE_UPDATE` | Toggle active status |
| POST | `/api/v1/knowledge/templates/{templateId}/toggle-featured` | `KNOWLEDGE_TEMPLATE_UPDATE` | Toggle featured status |
| DELETE | `/api/v1/knowledge/templates/{templateId}` | `KNOWLEDGE_TEMPLATE_DELETE` | Delete template |

### WikiInlineCommentController

Base path: **method-level** (no class `@RequestMapping`; each handler sets full path)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/inline-comments` | `KNOWLEDGE_WIKI_READ` | List page inline comments |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/inline-comments/open` | `KNOWLEDGE_WIKI_READ` | List open inline comments |
| POST | `/api/v1/knowledge/wiki/pages/{pageId}/inline-comments` | `KNOWLEDGE_WIKI_UPDATE` | Create inline comment |
| POST | `/api/v1/knowledge/wiki/inline-comments/{commentId}/reply` | `KNOWLEDGE_WIKI_UPDATE` | Reply to inline comment |
| POST | `/api/v1/knowledge/wiki/inline-comments/{commentId}/resolve` | `KNOWLEDGE_WIKI_UPDATE` | Resolve inline comment |
| DELETE | `/api/v1/knowledge/wiki/inline-comments/{commentId}` | `KNOWLEDGE_WIKI_DELETE` | Delete inline comment |

### WikiPageController

Base path: `/api/v1/knowledge/wiki/pages`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/knowledge/wiki/pages` | `KNOWLEDGE_WIKI_CREATE` | Create wiki page |
| GET | `/api/v1/knowledge/wiki/pages` | `KNOWLEDGE_WIKI_READ` | List all wiki pages |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}` | `KNOWLEDGE_WIKI_READ` | Get page by ID |
| GET | `/api/v1/knowledge/wiki/pages/space/{spaceId}` | `KNOWLEDGE_WIKI_READ` | List pages by space |
| PUT | `/api/v1/knowledge/wiki/pages/{pageId}` | `KNOWLEDGE_WIKI_UPDATE` | Update wiki page |
| POST | `/api/v1/knowledge/wiki/pages/{pageId}/publish` | `KNOWLEDGE_WIKI_PUBLISH` | Publish wiki page |
| POST | `/api/v1/knowledge/wiki/pages/{pageId}/archive` | `KNOWLEDGE_WIKI_UPDATE` | Archive wiki page |
| POST | `/api/v1/knowledge/wiki/pages/{pageId}/toggle-pin` | `KNOWLEDGE_WIKI_UPDATE` | Toggle pin status |
| DELETE | `/api/v1/knowledge/wiki/pages/{pageId}` | `KNOWLEDGE_WIKI_DELETE` | Delete wiki page |
| GET | `/api/v1/knowledge/wiki/pages/search` | `KNOWLEDGE_SEARCH` | Search wiki pages |
| GET | `/api/v1/knowledge/wiki/pages/space/{spaceId}/tree` | `KNOWLEDGE_WIKI_READ` | Get space page tree |
| GET | `/api/v1/knowledge/wiki/pages/space/{spaceId}/root` | `KNOWLEDGE_WIKI_READ` | Get space root pages |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/children` | `KNOWLEDGE_WIKI_READ` | Get direct child pages |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/breadcrumbs` | `KNOWLEDGE_WIKI_READ` | Get ancestor breadcrumbs |
| PATCH | `/api/v1/knowledge/wiki/pages/{pageId}/move` | `KNOWLEDGE_WIKI_UPDATE` | Move page to new parent |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/export` | `KNOWLEDGE_WIKI_READ` | Export page (PDF/DOCX) |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/versions` | `KNOWLEDGE_WIKI_READ` | Get page version history |

### WikiSpaceController

Base path: `/api/v1/knowledge/wiki/spaces`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/knowledge/wiki/spaces` | `KNOWLEDGE_WIKI_CREATE` | Create wiki space |
| GET | `/api/v1/knowledge/wiki/spaces/{spaceId}` | `KNOWLEDGE_WIKI_READ` | Get space by ID |
| GET | `/api/v1/knowledge/wiki/spaces` | `KNOWLEDGE_WIKI_READ` | List all spaces |
| GET | `/api/v1/knowledge/wiki/spaces/active` | `KNOWLEDGE_WIKI_READ` | List active spaces |
| PUT | `/api/v1/knowledge/wiki/spaces/{spaceId}` | `KNOWLEDGE_WIKI_UPDATE` | Update wiki space |
| POST | `/api/v1/knowledge/wiki/spaces/{spaceId}/archive` | `KNOWLEDGE_WIKI_UPDATE` | Archive wiki space |
| DELETE | `/api/v1/knowledge/wiki/spaces/{spaceId}` | `KNOWLEDGE_WIKI_DELETE` | Delete wiki space |
| GET | `/api/v1/knowledge/wiki/spaces/{spaceId}/members` | `KNOWLEDGE_WIKI_READ` | List space members |
| POST | `/api/v1/knowledge/wiki/spaces/{spaceId}/members` | `KNOWLEDGE_SPACE_MANAGE` | Add space member |
| PATCH | `/api/v1/knowledge/wiki/spaces/{spaceId}/members/{userId}` | `KNOWLEDGE_SPACE_MANAGE` | Update member role |
| DELETE | `/api/v1/knowledge/wiki/spaces/{spaceId}/members/{userId}` | `KNOWLEDGE_SPACE_MANAGE` | Remove space member |

### WallController

Base path: `/api/v1/wall` — all endpoints in the **`WALL` rate bucket (30/min)**; reactions/comments/replies had cross-tenant IDORs (fixed — [[Security-Audit]])

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/wall/posts` | `WALL_POST` | Create wall post |
| GET | `/api/v1/wall/posts` | `WALL_VIEW` | List wall posts |
| GET | `/api/v1/wall/posts/type/{type}` | `WALL_VIEW` | List posts by type |
| GET | `/api/v1/wall/posts/{postId}` | `WALL_VIEW` | Get post by ID |
| PUT | `/api/v1/wall/posts/{postId}` | `WALL_POST` or `WALL_MANAGE` | Update wall post |
| DELETE | `/api/v1/wall/posts/{postId}` | `WALL_POST` or `WALL_MANAGE` | Delete wall post |
| PATCH | `/api/v1/wall/posts/{postId}/pin` | `WALL_PIN` | Pin/unpin post |
| POST | `/api/v1/wall/posts/{postId}/reactions` | `WALL_REACT` | Add reaction to post |
| GET | `/api/v1/wall/posts/{postId}/reactions/details` | `WALL_VIEW` | List post reactors |
| DELETE | `/api/v1/wall/posts/{postId}/reactions` | `WALL_REACT` | Remove reaction |
| POST | `/api/v1/wall/posts/{postId}/comments` | `WALL_COMMENT` | Add comment to post |
| GET | `/api/v1/wall/posts/{postId}/comments` | `WALL_VIEW` | List post comments |
| GET | `/api/v1/wall/comments/{commentId}/replies` | `WALL_VIEW` | List comment replies |
| DELETE | `/api/v1/wall/comments/{commentId}` | `WALL_COMMENT` | Delete a comment |
| POST | `/api/v1/wall/posts/{postId}/vote` | `WALL_REACT` | Vote on a poll |
| DELETE | `/api/v1/wall/posts/{postId}/vote` | `WALL_REACT` | Remove poll vote |
| GET | `/api/v1/wall/praise/employee/{employeeId}` | `WALL_VIEW` | Get praise for employee |

## Related Links

- [[Controller-Index]] — exhaustive 1:1 list of all 180 controllers
- [[APIs]] — curated endpoint-level catalog · [[Services]] — service layer behind these controllers
- [[Feature-Traceability]] — end-to-end feature slices · [[Permissions]] — authorization model
- [[Nu-Fluence]] — sub-app deep dive · [[00-Home]]
