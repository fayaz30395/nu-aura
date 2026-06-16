# NU-Fluence — Knowledge & Social Sub-App

> Deep dive into NU-Fluence, the knowledge-management and internal-social
> sub-application of the NU-AURA platform. All claims below are grounded in the
> files cited inline.

NU-Fluence is the company knowledge hub: a Confluence-style **wiki**, a
**blog** surface for long-form writing, reusable page **templates**, a file
**drive**, an **activity wall** for praise / shout-outs, unified full-text
**search**, and an **AI chat** assistant that answers questions grounded in the
knowledge base via RAG.

The landing page tagline captures the intent — *"The handbook the whole company
actually opens. Wikis, blogs, templates, and the wall — structured, searchable,
never a blank page."*
(`frontend/app/fluence/page.tsx`).

---

## 1. Purpose & Surfaces

| Surface | Route | What it does |
|---------|-------|--------------|
| Hub / home | `/fluence` | Bento navigation, at-a-glance stats (active spaces, pages/blogs this week, contributions), recent cross-content activity feed |
| Wiki | `/fluence/wiki` | Spaces → pages tree, source-of-truth docs |
| Blogs | `/fluence/blogs` | Long-form posts, categories, drafts/published |
| Templates | `/fluence/templates` | Pre-built page structures so no one starts blank |
| Drive | `/fluence/drive` | File/attachment storage and browsing |
| Wall | `/fluence/wall` | "Activity Wall" — praise, shout-outs, posts, reactions, comments |
| Search | `/fluence/search` | Unified full-text search across wiki/blog/template |
| My Content | `/fluence/my-content` | The current user's own wiki pages, blog posts, and favorites |
| Analytics | `/fluence/analytics` | Content engagement dashboard (top content by views, activity trends, distribution) |
| AI Chat | floating widget | Streaming RAG Q&A — **no dedicated route** (see §2 note) |

The hub gates access to anyone holding `KNOWLEDGE:VIEW`, `WIKI:VIEW`, or
`BLOG:VIEW`; users without any are redirected to `/me/dashboard`
(`frontend/app/fluence/page.tsx`, `usePermissions`).

---

## 2. Frontend Routes (`frontend/app/fluence`)

Verified file tree (each leaf route also ships `error.tsx` / `loading.tsx`, and
most ship a `layout.tsx` that sets the browser tab `Metadata`):

```text
app/fluence/
├── page.tsx                         # hub (bento nav + stats + activity)
├── layout.tsx                       # metadata: title "NU-Fluence"
├── analytics/   page.tsx + FluenceAnalyticsCharts.tsx (lazy charts)
├── blogs/       page.tsx · new/page.tsx · [slug]/page.tsx · [slug]/edit/page.tsx
├── dashboard/   page.tsx
├── drive/       page.tsx
├── my-content/  page.tsx
├── search/      page.tsx
├── templates/   page.tsx · new/page.tsx · [id]/page.tsx
├── wall/        page.tsx
└── wiki/        page.tsx · new/page.tsx · [slug]/page.tsx · [slug]/edit/page.tsx
```

**AI Chat has no `app/fluence/chat` directory.** The hub bento tile links to
`/fluence/chat`, but chat is actually delivered as a global floating widget
mounted in the app shell:
`AppLayout.tsx` lazy-imports `FluenceChatWidget` and renders it at the bottom of
the layout
(`frontend/components/layout/AppLayout.tsx` lines 33, 456;
`frontend/components/fluence/FluenceChatWidget.tsx`).

### Data layer

- Query hooks live in `frontend/lib/hooks/queries/useFluence.ts`
  (`useWikiSpaces`, `useWikiPages`, `useWikiPage`, `useBlogPosts`,
  `useMyWikiPages`, `useMyBlogPosts`, `useFluenceSearch`, template hooks) with a
  structured `fluenceKeys` query-key factory.
- Wall uses `frontend/lib/hooks/queries/useWall.ts`
  (`useInfiniteWallPosts`, `useCreatePost`).
- Chat uses `frontend/lib/hooks/useFluenceChat.ts`, a multi-turn store that
  calls `streamFluenceChat` from
  `frontend/lib/services/platform/fluence-chat.service.ts`
  (native `fetch` + `ReadableStream` against `${baseUrl}/fluence/chat`).

### Notable components (`frontend/components/fluence`)

`editor/FluenceEditor.tsx` (Tiptap-based, with `FloatingBar`, `SlashMenu`,
`CalloutNode`), `WikiPageTree.tsx`, `Breadcrumbs.tsx`, `TableOfContents.tsx`,
`InlineComments.tsx`, `MentionInput.tsx`, `WatchButton.tsx`, `EditLockWarning.tsx`,
`SpacePermissionsDrawer.tsx` / `AccessControlSection.tsx`, `FileUploader.tsx` /
`FileList.tsx`, `MacroRenderer.tsx` + `macros/` (CalloutPanel, CodeBlock,
ExpandCollapse, TableOfContents), `ChatMessage.tsx` / `ChatSourceCard.tsx` /
`FluenceChatWidget.tsx`, and `ActivityFeed.tsx`.

---

## 3. Backend Domains

### Controllers — `backend/src/main/java/com/nulogic/api`

Two route families serve Fluence: the **`/knowledge`** CRUD family and the
**`/fluence`** experiential family, plus the Wall under `/wall`.

| Controller | Base path | Responsibility |
|------------|-----------|----------------|
| `WikiSpaceController` | `/api/v1/knowledge/wiki/spaces` | Space CRUD, archive, members (add/update/remove) |
| `WikiPageController` | `/api/v1/knowledge/wiki/pages` | Page CRUD, publish, archive, pin, tree/root/children, breadcrumbs, move, export, versions, search |
| `BlogPostController` | `/api/v1/knowledge/blogs` | Post CRUD, by-slug, published/active/featured, by-category, publish, schedule, archive, search |
| `BlogCategoryController` | `/api/v1/knowledge/blogs/categories` | Blog category management |
| `TemplateController` | `/api/v1/knowledge/templates` | Template CRUD, by-slug/category, featured, popular, toggle active/featured |
| `KnowledgeSearchController` | `/api/v1/knowledge/search` | Knowledge search (PostgreSQL-backed) |
| `WikiInlineCommentController` | (under knowledge) | Inline (anchored) comments on wiki pages |
| `FluenceSearchController` | `/api/v1/fluence/search` | Elasticsearch full-text search → `Page<FluenceDocument>` |
| `FluenceChatController` | `/api/v1/fluence/chat` | SSE streaming AI chat (RAG) |
| `FluenceActivityController` | `/api/v1/fluence/activities` | Activity feed (`/` and `/me`) |
| `FluenceCommentController` | `/api/v1/fluence/comments` | Comments on Fluence content |
| `ContentEngagementController` | `/api/v1/fluence/engagement` | Views / likes / engagement signals |
| `FluenceAttachmentController` | `/api/v1/fluence/attachments` | File attachments (Drive) |
| `FluenceEditLockController` | `/api/v1/fluence/edit-lock` | Distributed edit locks: acquire / release / check / heartbeat per `{contentType}/{contentId}` |
| `WallController` | `/api/v1/wall` | Posts, reactions, comments/replies, pin, vote, praise-for-employee |
| `LinkedinPostController` | (under knowledge) | LinkedIn post integration |

### Domain entities — `backend/.../domain/knowledge`

`WikiSpace`, `WikiPage`, `WikiPageVersion`, `WikiPageComment`,
`WikiInlineComment`, `WikiPageLike`, `WikiPageWatch`, `WikiPageApprovalTask`,
`SpaceMember`, `BlogPost`, `BlogCategory`, `BlogComment`, `BlogLike`,
`DocumentTemplate`, `TemplateInstantiation`, `KnowledgeAttachment`,
`KnowledgeView`, `KnowledgeSearch`, `FluenceActivity`, `FluenceFavorite`.

Wall lives in its own context: `backend/.../domain/wall/model`, served by
`WallController` + `WallService`.

### Database & RLS

Fluence tables (`wiki_*`, `blog_*`, `document_templates`) were the subject of a
notable RLS history: `V15__knowledge_base_fluence_integration.sql` integrated the
knowledge base, and `V24__fix_rls_policies.sql` patched 15 Fluence/Knowledge
tables that had `ENABLE ROW LEVEL SECURITY` but **zero policies** — these were
given permissive (allow-all) policies with isolation enforced at the application
layer (`TenantContext` ThreadLocal + JPA `WHERE tenant_id` filters). Later
hardening (`V177`, `V254`) reasserted strict, fail-closed tenant policies
platform-wide. Wall feed performance is indexed via
`V94__add_wall_post_feed_index.sql`.

---

## 4. Key Flows

### 4.1 Wiki authoring & publishing

```mermaid
flowchart LR
  A[Create space\nPOST /knowledge/wiki/spaces] --> B[Create page\nPOST /knowledge/wiki/pages]
  B --> C[Edit in Tiptap FluenceEditor]
  C -->|acquire| L[(Edit lock\nPUT/POST /fluence/edit-lock)]
  C --> V[WikiPageVersion snapshot]
  C --> D[Publish\nPOST /pages/{id}/publish]
  D --> E[Kafka FluenceContentEvent\naction=PUBLISHED]
  E --> F[Elasticsearch index]
```

Concurrent editing is protected by `FluenceEditLockController` — acquire on edit
start, periodic `heartbeat` to keep the lock alive, release on exit. The
frontend surfaces conflicts via `EditLockWarning.tsx`. Page hierarchy is exposed
through `tree`, `root`, `children`, `breadcrumbs`, and `move` endpoints, rendered
by `WikiPageTree.tsx` and `Breadcrumbs.tsx`.

### 4.2 Search indexing (CDC pipeline)

Search is **eventually consistent** between PostgreSQL (system of record) and
Elasticsearch (read model), kept in sync by Kafka:

```mermaid
sequenceDiagram
  participant Svc as Wiki/Blog/Template service
  participant PG as PostgreSQL
  participant K as Kafka (nu-aura.fluence-content)
  participant C as FluenceSearchConsumer
  participant ES as Elasticsearch

  Svc->>PG: persist content change
  Svc->>K: FluenceContentEvent{contentType, contentId, action}
  K->>C: @KafkaListener FLUENCE_CONTENT
  alt CREATED / UPDATED / PUBLISHED
    C->>PG: load entity
    C->>ES: index FluenceDocument
  else DELETED
    C->>ES: removeDocument
  end
```

- Event: `FluenceContentEvent` with `content_type` (`wiki`/`blog`/`template`),
  `content_id`, `action` (`CREATED`/`UPDATED`/`PUBLISHED`/`DELETED`)
  (`backend/.../infrastructure/kafka/events/FluenceContentEvent.java`).
- Consumer: `FluenceSearchConsumer` listens on `KafkaTopics.FLUENCE_CONTENT`,
  routing to `FluenceIndexingService.indexWikiPage / indexBlogPost /
  indexTemplate` or `removeDocument`
  (`backend/.../infrastructure/kafka/consumer/FluenceSearchConsumer.java`).
- Index document: `FluenceDocument` carries `tenantId`, `contentType`,
  `contentId`, `title`, `excerpt`, `bodyText`, `slug`, `status`, `visibility`,
  `author*`, `tags`, `spaceId/spaceName` — tenant-scoped at the index level
  (`backend/.../infrastructure/search/document/FluenceDocument.java`).
- `FluenceIndexingService.reindexAll(tenantId)` supports backfill/repair.
- Query path: `/fluence/search` → `FluenceSearchService` → returns
  `Page<FluenceDocument>`; frontend `useFluenceSearch` filters by `contentType`
  and `visibility` (`frontend/app/fluence/search/page.tsx`).

> Elasticsearch is **opt-in** (`app.elasticsearch.enabled`, default off). When
> disabled, the `KnowledgeSearchController` (`/knowledge/search`,
> PostgreSQL-backed) provides a fallback search path.

### 4.3 AI Chat (RAG over the knowledge base)

```mermaid
sequenceDiagram
  participant U as Browser (FluenceChatWidget)
  participant API as FluenceChatController\nPOST /fluence/chat (SSE)
  participant S as FluenceChatService
  participant R as FluenceContentRetriever
  participant LLM as LlmStreamingService

  U->>API: message + conversationId + history
  API->>S: handleChatMessage (RequiresPermission KNOWLEDGE_SEARCH)
  S->>R: retrieveRelevantContent(message)
  R-->>S: ContentChunk[] (grounding context)
  S->>S: build system prompt + context block + recent turns
  S->>LLM: stream completion
  loop tokens
    LLM-->>S: token
    S-->>U: SSE event: token
  end
  S-->>U: SSE event: sources (citations w/ URLs)
  S-->>U: SSE event: done (conversationId)
```

- The controller returns an `SseEmitter` and sets `Cache-Control: no-transform`,
  `X-Accel-Buffering: no`, `Connection: keep-alive` to defeat proxy buffering so
  tokens stream live (`FluenceChatController.java`).
- `FluenceChatService` orchestrates the RAG pipeline: retrieve context → build a
  grounded prompt → stream the LLM response → emit source citations. Its system
  prompt explicitly instructs the model to answer only from the provided context,
  cite document titles, **always include document URLs**, and admit when nothing
  relevant exists in the knowledge base. Conversations are persisted via
  `ChatbotConversationRepository`; only the last few turns are sent to stay within
  the context window (`backend/.../application/knowledge/service/FluenceChatService.java`).
- The async pipeline runs on a `taskExecutor`; tenant context is re-set on the
  worker thread because ThreadLocal does not propagate (noted backlog item T4-17).
- Frontend: `useFluenceChat` accumulates streamed tokens into the active message,
  attaches `sources` on the `sources` event, and marks the message done; sources
  render via `ChatSourceCard.tsx`.

### 4.4 Activity Wall

`WallController` (`/api/v1/wall`) backs the "Activity Wall" page. Capabilities:
create/update/delete posts, list (all, by-type, single), **pin**, **reactions**
(add / remove / reactor details), **comments + nested replies**, **vote** /
remove-vote, and **praise-for-employee** lookups
(`backend/.../api/wall/controller/WallController.java`). The frontend wall is
infinite-scrolled via `useInfiniteWallPosts` and posts created with
`useCreatePost`, distinguishing "praise sent" vs "post published" toasts
(`frontend/app/fluence/wall/page.tsx`).

---

## 5. Permissions

Fluence is governed by a dedicated permission cluster
(`frontend/lib/hooks/usePermissions.ts`):

| Area | Permission codes |
|------|------------------|
| Knowledge (root) | `KNOWLEDGE:VIEW/CREATE/UPDATE/DELETE/MANAGE`, `KNOWLEDGE:SEARCH` (chat gate) |
| Wiki | `WIKI:VIEW/CREATE/MANAGE` and granular `KNOWLEDGE:WIKI_READ/CREATE/UPDATE/DELETE/PUBLISH/APPROVE` |
| Blog | `BLOG:VIEW/CREATE/MANAGE` |
| Wall | `WALL:VIEW/POST/COMMENT/REACT/MANAGE/PIN` plus `WALL_FLUENCE:VIEW/POST/MANAGE` |

Backend enforcement uses `@RequiresPermission` (e.g.
`FluenceChatController` requires `Permission.KNOWLEDGE_SEARCH`). The hub route
performs an `hasAnyPermission(KNOWLEDGE_VIEW, WIKI_VIEW, BLOG_VIEW)` check and
redirects unauthorized users to `/me/dashboard`.

---

## 6. Cross-Cutting Notes

- **Edit locking** is distributed (Redis-backed `FluenceEditLockService`, 5-min
  TTL per project memory) and exposed via heartbeat semantics — required for the
  collaborative Tiptap editor.
- **Tenant isolation** spans three layers for Fluence content: application
  `TenantContext`, PostgreSQL RLS (permissive-then-hardened per migration
  history), and a tenant-keyed Elasticsearch index (`FluenceDocument.tenantId`).
- **Storage**: Drive attachments flow through `FluenceAttachmentController` and
  the platform's Google Drive `StorageProvider` abstraction.
- **Engagement analytics**: `KnowledgeView` / `ContentEngagementController` feed
  the `/fluence/analytics` dashboard (top content by `viewCount`, activity-trend
  and distribution charts, lazy-loaded from `FluenceAnalyticsCharts.tsx`).

---

### Primary evidence files

- `frontend/app/fluence/page.tsx`, `frontend/app/fluence/{search,wall,drive,my-content,analytics}/page.tsx`
- `frontend/components/layout/AppLayout.tsx`, `frontend/components/fluence/FluenceChatWidget.tsx`
- `frontend/lib/hooks/queries/useFluence.ts`, `frontend/lib/hooks/useFluenceChat.ts`, `frontend/lib/services/platform/fluence-chat.service.ts`
- `backend/.../api/knowledge/controller/{WikiSpace,WikiPage,BlogPost,Template,FluenceChat,FluenceSearch,FluenceActivity,FluenceEditLock}Controller.java`
- `backend/.../api/wall/controller/WallController.java`
- `backend/.../application/knowledge/service/FluenceChatService.java`
- `backend/.../infrastructure/kafka/{events/FluenceContentEvent,consumer/FluenceSearchConsumer}.java`
- `backend/.../infrastructure/search/{document/FluenceDocument,service/FluenceIndexingService}.java`
- `backend/src/main/resources/db/migration/{V15,V24,V94}*.sql`
