# NU-Fluence Launch Sprint — Execution Handoff

> **For Claude Code:** Read this file completely, then execute the implementation plan at `docs/superpowers/plans/2026-03-20-nu-fluence-launch.md` using parallel subagents (one per track). All context you need is in this file.

---

## What To Do

Execute the NU-Fluence launch plan with **5 parallel tracks** using subagent-driven development. The plan is at:

```
docs/superpowers/plans/2026-03-20-nu-fluence-launch.md
```

### Execution Order

**Phase 1 — Start simultaneously (no dependencies):**
- **Track A:** Tasks A1-A8 (Elasticsearch infra + Kafka consumer + search rewiring)
- **Track B:** Tasks B1-B4 (Flyway migration, comments, engagement, approval) — B1 first, then B2-B4
- **Track D:** Tasks D1-D3 (MinIO attachments + Drive rewrite + AI Chat verify)

**Phase 2 — After Track B Task B2 (comments service) completes:**
- **Track C:** Tasks C1-C3 (Activity feed backend + wire into services + Wall frontend)
- **Track E:** Tasks E1-E5 (Notifications + Redis edit lock + edit lock UI + polish + sidebar)

**Phase 3 — After all tracks complete:**
- **Task V1:** End-to-end smoke test checklist

---

## Critical Context (DO NOT SKIP)

These are verified facts from the codebase that prevent common mistakes:

### Migration Version
- **Next Flyway migration = V56** (V54 `seed_default_workflow_definitions` and V55 `consolidate_project_member_tables` already exist)
- The plan file already uses V56. Do not change it.

### File Paths
- React Query hooks: `frontend/lib/hooks/queries/useFluence.ts` (NOT `frontend/lib/hooks/useFluence.ts`)
- Chat hook: `frontend/lib/hooks/useFluenceChat.ts` (at hooks root, not in queries/)
- Fluence service: `frontend/lib/services/fluence.service.ts`
- Chat service: `frontend/lib/services/fluence-chat.service.ts`
- Search controller: `backend/src/main/java/com/hrms/api/knowledge/controller/KnowledgeSearchController.java` (mapped to `/api/v1/knowledge/search`)
- Apps config: `frontend/lib/config/apps.ts`

### Entity Gotchas
- `parentComment` field **ALREADY EXISTS** on both `WikiPageComment.java` and `BlogComment.java` — only add the `mentions` JSONB field
- All entities use **Lombok** (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@SuperBuilder`) — never write manual getters/setters
- All new tables must have `is_deleted BOOLEAN DEFAULT FALSE` and `deleted_at TIMESTAMPTZ` columns (project convention)
- All new entities must extend `TenantAware` base class (provides id, tenantId, createdAt, updatedAt, createdBy, lastModifiedBy)

### API Path Mismatches to Fix
- Search: existing controller is at `/api/v1/knowledge/search` but frontend calls `/fluence/search` — create a new endpoint or alias
- Comments: frontend sends `body` and `parentId` fields but backend DTO has `content` and `parentCommentId` — add `@JsonAlias("body")` and `@JsonAlias("parentId")` to the backend DTO

### Elasticsearch Safety
- `ElasticsearchConfig.java` MUST have `@ConditionalOnProperty(name = "app.elasticsearch.enabled", havingValue = "true", matchIfMissing = false)`
- `FluenceSearchConsumer.java` (Kafka consumer) MUST also have `@ConditionalOnProperty` — otherwise the app won't start without ES running
- Default `app.elasticsearch.enabled` in `application.yml` should be `false` so existing dev environments are unaffected

### Package Dependencies
- `@react-oauth/google` is used by 6+ other pages (login, nu-drive, nu-mail, nu-calendar, onboarding, providers.tsx) — do NOT remove from package.json when rewriting the Drive page. Only remove the import from `frontend/app/fluence/drive/page.tsx`.
- Groq AI chat is **already fully implemented** (backend `FluenceChatService` + `FluenceContentRetriever` + frontend `FluenceChatWidget`) — Task D3 is verification only, not new code

### Existing Codebase State (What's Already Built)
| Layer | Status | Details |
|-------|--------|---------|
| Backend controllers | 7 REAL | WikiSpace, WikiPage, BlogPost, BlogCategory, Template, KnowledgeSearch, FluenceChat |
| Backend services | 8 REAL | All core services with full business logic |
| Backend entities | 15 REAL | All JPA entities with proper annotations |
| Backend repositories | 8 REAL + 7 STUB | Core repos have custom queries; comment/like/watch/attachment repos are basic CRUD stubs |
| Backend tests | 0 | Zero tests for knowledge module (acknowledged tech debt for this sprint) |
| Frontend pages | 16 REAL | All pages have real implementations (not stubs) |
| Frontend components | 16 REAL | TipTap editor, chat widget, content grid, access control, etc. |
| Frontend service | 43 methods | All calling real API endpoints |
| Frontend hooks | 45+ hooks | Full React Query coverage with mock data fallback |
| Frontend types | 23+ interfaces | Fully typed, no `any` |
| Frontend validations | 19 Zod schemas | Complete validation coverage |

### What's Missing (What This Plan Builds)
1. **Elasticsearch** — Not in codebase at all. New Docker service + K8s + Maven + config + index + Kafka consumer
2. **Comment service layer** — Entities exist but no WikiCommentService/BlogCommentService or FluenceCommentController
3. **Engagement service** — Like/unlike, favorites, views, watches — entities exist but no service layer
4. **Activity feed** — Wall page currently redirects to /fluence/wiki — needs real backend + frontend
5. **File attachments** — KnowledgeAttachment entity exists but no MinIO integration service
6. **Drive page** — Currently Google Drive OAuth skeleton, needs to become MinIO file browser
7. **Notifications** — Fluence events not connected to existing notification system
8. **Edit lock** — "Someone else is editing" warning not implemented
9. **@mentions in comments** — MentionInput.tsx component exists but no backend notification wiring
10. **Per-space approval** — WikiPageApprovalTask entity exists but no approval config on WikiSpace
11. **Missing route prefixes** — `/fluence/wall` and `/fluence/dashboard` not in apps.ts routePrefixes

---

## Project Rules (Non-Negotiable)

From CLAUDE.md — every agent must follow these:

- **Never create a new Axios instance** — use `frontend/lib/api/client.ts`
- **Never use `any` in TypeScript** — define proper interfaces
- **All forms: React Hook Form + Zod** — no uncontrolled inputs
- **All data fetching: React Query** — no raw `useEffect` + `fetch`
- **Never rewrite what already exists** — read the file first, then extend
- **No new npm packages** without checking `package.json` first
- **Flyway only** — `db/changelog/` is legacy Liquibase, DO NOT USE
- **Multi-tenancy** — `tenant_id` on every table, TenantContext in every service, PostgreSQL RLS on every new table
- **Kafka pattern** — follow existing `ApprovalEventConsumer` for new consumers, `EventPublisher` for publishing
- **Commit format** — `type(scope): subject` (e.g., `feat(fluence): add comment service`)

---

## Design Decisions (From Grill Session — March 20, 2026)

These decisions were made during the design session. Do not re-evaluate:

| Decision | Choice |
|----------|--------|
| **Product identity** | Built-in knowledge hub (not Confluence replacement). HR policy/SOP as anchor, general knowledge as growth. |
| **Wiki = permanent knowledge** | Blog = time-sensitive announcements |
| **All 8 modules ship together** | Wiki, Blogs, Search, Templates, My Content, AI Chat, Drive, Wall |
| **Wiki polish level** | Fully polished — CRUD, spaces, page tree, access control, versioning, comments, watch |
| **Real-time collab** | NO — optimistic locking + "someone else editing" warning. Deferred to later. |
| **Blog moderation** | Direct publish. SuperAdmin + upper hierarchy can moderate. |
| **Wiki approval** | Optional per-space. Approver assigned on space creation. Follows org hierarchy. |
| **Space creation** | Admin-only (HR Admin, System Admin, SuperAdmin) |
| **Search engine** | Elasticsearch 8.x (mandatory). Kafka-based async indexing. PostgreSQL fallback when ES disabled. |
| **Search scope** | Fluence-only at launch. Cross-app deferred. |
| **LLM provider** | Groq free tier (Llama 3.1). Zero cost. Behind abstraction layer. |
| **AI Chat capability** | RAG Q&A with citations. No content creation by AI. |
| **Templates** | Wiki page templates only (Meeting Notes, Project Brief, Onboarding Checklist). No PDF generation. |
| **Drive** | MinIO file attachments on wiki/blog. All file types. 50MB limit. No standalone file browser. |
| **Wall** | Auto-generated activity feed + 5-10 line content preview. No social posting. |
| **Comments** | @mentions (tag + notify users) + permalink to specific comments |
| **Content lifecycle** | Never delete. All content stays as reference data forever. |
| **Notifications** | NU-AURA notification system. In-app + email. Watch, comment, @mention triggers. |
| **Analytics** | Basic — views, top pages, top authors, trending content |
| **File limits** | 50MB per upload, all file types allowed |
| **Timeline** | 2-3 days aggressive sprint |

---

## New Infrastructure Required

| Component | What to Add | Where |
|-----------|-------------|-------|
| **Elasticsearch 8.11** | Docker service + K8s manifest + Maven dependency + Spring config | docker-compose.yml, pom.xml, application.yml, deployment/kubernetes/ |
| **Kafka topic** | `nu-aura.fluence-content` + DLT + consumer group | KafkaTopics.java, KafkaConfig.java |
| **Groq API** | Already configured at `ai.openai.base-url: https://api.groq.com/openai/v1` | No changes needed |

---

## Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Backend | Java 17, Spring Boot 3.4.1, Maven |
| Database | PostgreSQL 14+ (Neon cloud dev), Flyway |
| Cache | Redis 7 |
| Search | Elasticsearch 8.11 (NEW) |
| Events | Kafka 7.6 |
| Files | MinIO 8.6 |
| AI | Groq API (Llama 3.1-8b-instant) |
| Frontend | Next.js 14.2, TypeScript 5.9, React 18.2 |
| UI | Mantine 8.3, Tailwind 3.4 |
| State | TanStack Query 5.17, Zustand 4.4 |
| Editor | TipTap 3.20 |
| Forms | React Hook Form 7.51 + Zod 3.23 |
| HTTP | Axios 1.7 (existing client at `frontend/lib/api/client.ts`) |

---

## After Completion

When all tracks are done and Task V1 smoke test passes:
1. Commit all work with: `feat(fluence): complete NU-Fluence launch sprint — all 8 modules`
2. Update `frontend/lib/config/apps.ts` to confirm `available: true` for FLUENCE
3. Run `cd frontend && npm run build` to verify no TypeScript errors
4. Run `cd backend && ./mvnw compile` to verify no Java errors
