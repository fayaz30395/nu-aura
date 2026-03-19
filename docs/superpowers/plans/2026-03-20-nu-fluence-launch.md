# NU-Fluence Launch Sprint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all 8 NU-Fluence modules (Wiki, Blogs, Search, Templates, My Content, AI Chat, Drive, Wall) in 2-3 days by closing the ~15% gap in the existing codebase.

**Architecture:** NU-Fluence is ~85% built. Backend has 7 controllers, 8 services, 15 entities — all real implementations. Frontend has 16 pages, 16 components, 45+ hooks — all real. The work is: (1) add Elasticsearch infrastructure + Kafka-based indexing, (2) complete missing backend service layers (comments, likes, watches, favorites, views, file attachments), (3) wire Wall activity feed, (4) connect notifications, (5) add @mention + permalink support, (6) rewire Drive from Google OAuth to MinIO attachments, (7) add "someone else editing" warning.

**Tech Stack:** Spring Boot 3.4.1, Java 17, PostgreSQL (Neon), Elasticsearch 8.11, Kafka 7.6, MinIO 8.6, Groq API (Llama 3.1), Next.js 14, TypeScript, Mantine UI, TanStack Query, TipTap

**Parallel Tracks:** 5 independent tracks that can be worked on simultaneously. Each track has no dependencies on other tracks unless explicitly noted.

---

## File Structure

### Track A: Elasticsearch Infrastructure + Search Indexing
```
MODIFY: docker-compose.yml                                          — Add elasticsearch service
MODIFY: docker-compose.prod.yml                                     — Add elasticsearch service (prod)
MODIFY: backend/pom.xml                                             — Add spring-boot-starter-data-elasticsearch
MODIFY: backend/src/main/resources/application.yml                  — Add elasticsearch config section
CREATE: backend/src/main/java/com/hrms/common/config/ElasticsearchConfig.java     — ES client config
CREATE: backend/src/main/java/com/hrms/infrastructure/search/document/FluenceDocument.java — ES document model
CREATE: backend/src/main/java/com/hrms/infrastructure/search/repository/FluenceDocumentRepository.java — ES repository
CREATE: backend/src/main/java/com/hrms/infrastructure/search/service/FluenceIndexingService.java — Index CRUD
CREATE: backend/src/main/java/com/hrms/infrastructure/search/service/FluenceSearchService.java — ES search queries
CREATE: backend/src/main/java/com/hrms/infrastructure/kafka/events/FluenceContentEvent.java — Kafka event
CREATE: backend/src/main/java/com/hrms/infrastructure/kafka/consumer/FluenceSearchConsumer.java — Kafka → ES consumer
MODIFY: backend/src/main/java/com/hrms/infrastructure/kafka/KafkaTopics.java      — Add FLUENCE_CONTENT topic
MODIFY: backend/src/main/java/com/hrms/infrastructure/kafka/KafkaConfig.java      — Add consumer factory + topic bean
MODIFY: backend/src/main/java/com/hrms/infrastructure/kafka/producer/EventPublisher.java — Add publishFluenceContent()
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/WikiPageService.java — Publish events on CRUD
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/BlogPostService.java — Publish events on CRUD
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/DocumentTemplateService.java — Publish events on CRUD
MODIFY: backend/src/main/java/com/hrms/api/knowledge/controller/KnowledgeSearchController.java — Use ES search
CREATE: deployment/kubernetes/elasticsearch-deployment.yaml          — K8s deployment
CREATE: deployment/kubernetes/elasticsearch-service.yaml             — K8s service
```

### Track B: Wiki Polish + Comments + Likes + Watches + Templates
```
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/WikiCommentService.java — Comment CRUD
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/BlogCommentService.java — Comment CRUD
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/ContentEngagementService.java — Likes, favorites, views, watches
CREATE: backend/src/main/java/com/hrms/api/knowledge/controller/FluenceCommentController.java — Comment endpoints
CREATE: backend/src/main/java/com/hrms/api/knowledge/controller/ContentEngagementController.java — Engagement endpoints
CREATE: backend/src/main/java/com/hrms/api/knowledge/dto/WikiCommentDto.java — Comment response DTO
CREATE: backend/src/main/java/com/hrms/api/knowledge/dto/CreateCommentRequest.java — (enhance existing stub)
CREATE: backend/src/main/java/com/hrms/api/knowledge/dto/FavoriteDto.java — Favorite response DTO
CREATE: backend/src/main/java/com/hrms/domain/knowledge/FluenceFavorite.java — Favorite entity
CREATE: backend/src/main/resources/db/migration/V56__fluence_favorites_and_enhancements.sql — Favorites table + comment enhancements
MODIFY: backend/src/main/java/com/hrms/infrastructure/knowledge/repository/WikiPageCommentRepository.java — Add query methods
MODIFY: backend/src/main/java/com/hrms/infrastructure/knowledge/repository/BlogCommentRepository.java — Add query methods
MODIFY: backend/src/main/java/com/hrms/infrastructure/knowledge/repository/BlogLikeRepository.java — Add query methods
MODIFY: backend/src/main/java/com/hrms/infrastructure/knowledge/repository/WikiPageWatchRepository.java — Add query methods
MODIFY: backend/src/main/java/com/hrms/infrastructure/knowledge/repository/KnowledgeViewRepository.java — Add query methods
MODIFY: backend/src/main/java/com/hrms/domain/knowledge/WikiPageComment.java — Add parentComment, mentions fields
MODIFY: backend/src/main/java/com/hrms/domain/knowledge/BlogComment.java — Add parentComment, mentions fields
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/WikiSpaceApprovalService.java — Per-space approval config
MODIFY: backend/src/main/java/com/hrms/domain/knowledge/WikiSpace.java — Add approvalEnabled, approverEmployeeId fields
```

### Track C: Blogs + Wall (Activity Feed)
```
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/FluenceActivityService.java — Activity feed generation
CREATE: backend/src/main/java/com/hrms/domain/knowledge/FluenceActivity.java — Activity entity
CREATE: backend/src/main/java/com/hrms/infrastructure/knowledge/repository/FluenceActivityRepository.java — Activity queries
CREATE: backend/src/main/java/com/hrms/api/knowledge/controller/FluenceActivityController.java — Activity feed endpoints
CREATE: backend/src/main/java/com/hrms/api/knowledge/dto/FluenceActivityDto.java — Activity response DTO
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/WikiPageService.java — Record activities on CRUD
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/BlogPostService.java — Record activities on CRUD
MODIFY: backend/src/main/resources/db/migration/V56__fluence_favorites_and_enhancements.sql — Add fluence_activities table
MODIFY: frontend/app/fluence/wall/page.tsx — Replace redirect with real activity feed UI
CREATE: frontend/components/fluence/ActivityFeed.tsx — Activity feed component
CREATE: frontend/components/fluence/ActivityCard.tsx — Single activity card with content preview
```

### Track D: AI Chat (Groq) + Drive (MinIO Attachments)
```
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/FluenceAttachmentService.java — MinIO file upload/download for Fluence
CREATE: backend/src/main/java/com/hrms/api/knowledge/controller/FluenceAttachmentController.java — File endpoints
CREATE: backend/src/main/java/com/hrms/api/knowledge/dto/FluenceAttachmentDto.java — Attachment response DTO
MODIFY: backend/src/main/java/com/hrms/domain/knowledge/KnowledgeAttachment.java — Add minio fields (objectName, contentType, fileSize)
MODIFY: backend/src/main/java/com/hrms/infrastructure/knowledge/repository/KnowledgeAttachmentRepository.java — Add query methods
MODIFY: frontend/app/fluence/drive/page.tsx — Replace Google Drive with MinIO file browser
CREATE: frontend/components/fluence/FileUploader.tsx — Drag-and-drop file upload component
CREATE: frontend/components/fluence/FileList.tsx — List attached files with download links
MODIFY: frontend/lib/services/fluence.service.ts — Add attachment API methods
MODIFY: frontend/lib/types/fluence.ts — Add FluenceAttachment interface
MODIFY: frontend/lib/hooks/queries/useFluence.ts — Add useAttachments, useUploadAttachment hooks
```

### Track E: Notifications + "Someone Editing" + My Content Polish
```
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/FluenceNotificationService.java — Notification wiring
CREATE: backend/src/main/java/com/hrms/infrastructure/kafka/events/FluenceNotificationEvent.java — Notification event type
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/WikiCommentService.java — Trigger notifications on @mention
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/BlogCommentService.java — Trigger notifications on @mention
MODIFY: backend/src/main/java/com/hrms/application/knowledge/service/WikiPageService.java — Trigger notifications on watch
CREATE: backend/src/main/java/com/hrms/application/knowledge/service/FluenceEditLockService.java — Redis-based edit lock
CREATE: backend/src/main/java/com/hrms/api/knowledge/controller/FluenceEditLockController.java — Lock/unlock endpoints
MODIFY: frontend/app/fluence/wiki/[slug]/edit/page.tsx — Add "someone else editing" warning
CREATE: frontend/components/fluence/EditLockWarning.tsx — Warning banner component
MODIFY: frontend/lib/services/fluence.service.ts — Add lock/unlock API methods
MODIFY: frontend/lib/hooks/queries/useFluence.ts — Add useEditLock hook
```

---

## Track A: Elasticsearch Infrastructure + Search Indexing

### Task A1: Add Elasticsearch to Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`

- [ ] **Step 1: Add Elasticsearch service to dev docker-compose.yml**

Add after the `minio` service block:

```yaml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: hrms-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -q '\"status\":\"green\\|yellow\"'"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - hrms_network
```

Add `elasticsearch_data:` to the `volumes:` section.

Add `elasticsearch` to backend's `depends_on` with `condition: service_healthy`.

- [ ] **Step 2: Add Elasticsearch service to prod docker-compose.prod.yml**

Same as dev but with `restart: always` and no exposed ports (internal only).

- [ ] **Step 3: Verify docker-compose config is valid**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura && docker-compose config --quiet`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml
git commit -m "feat(fluence): add Elasticsearch 8.11 to Docker Compose"
```

---

### Task A2: Add Elasticsearch Maven Dependency + Spring Config

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/java/com/hrms/common/config/ElasticsearchConfig.java`

- [ ] **Step 1: Add Maven dependency to pom.xml**

Add in the `<dependencies>` section:

```xml
<!-- Elasticsearch -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

- [ ] **Step 2: Add Elasticsearch config to application.yml**

Add under the `app:` section:

```yaml
  elasticsearch:
    enabled: ${ELASTICSEARCH_ENABLED:true}
    host: ${ELASTICSEARCH_HOST:localhost}
    port: ${ELASTICSEARCH_PORT:9200}
```

Add Spring Data Elasticsearch config:

```yaml
spring:
  elasticsearch:
    uris: ${ELASTICSEARCH_URIS:http://localhost:9200}
```

- [ ] **Step 3: Create ElasticsearchConfig.java**

```java
package com.hrms.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.client.ClientConfiguration;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;

@Configuration
@ConditionalOnProperty(name = "app.elasticsearch.enabled", havingValue = "true", matchIfMissing = false)
@EnableElasticsearchRepositories(basePackages = "com.hrms.infrastructure.search.repository")
public class ElasticsearchConfig extends ElasticsearchConfiguration {

    @Value("${spring.elasticsearch.uris:http://localhost:9200}")
    private String elasticsearchUri;

    @Override
    public ClientConfiguration clientConfiguration() {
        return ClientConfiguration.builder()
                .connectedTo(elasticsearchUri.replace("http://", "").replace("https://", ""))
                .withConnectTimeout(5000)
                .withSocketTimeout(60000)
                .build();
    }
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/pom.xml backend/src/main/resources/application.yml backend/src/main/java/com/hrms/common/config/ElasticsearchConfig.java
git commit -m "feat(fluence): add Elasticsearch dependency and Spring config"
```

---

### Task A3: Create Elasticsearch Document Model + Repository

**Files:**
- Create: `backend/src/main/java/com/hrms/infrastructure/search/document/FluenceDocument.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/search/repository/FluenceDocumentRepository.java`

- [ ] **Step 1: Create FluenceDocument.java**

```java
package com.hrms.infrastructure.search.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Document(indexName = "fluence-documents")
@Setting(shards = 1, replicas = 0)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FluenceDocument {

    @Id
    private String id;

    @Field(type = FieldType.Keyword)
    private UUID tenantId;

    @Field(type = FieldType.Keyword)
    private String contentType; // WIKI, BLOG, TEMPLATE

    @Field(type = FieldType.Keyword)
    private UUID contentId;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String title;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String excerpt;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String bodyText; // Plain text extracted from TipTap JSON

    @Field(type = FieldType.Keyword)
    private String slug;

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Keyword)
    private String visibility;

    @Field(type = FieldType.Keyword)
    private UUID authorId;

    @Field(type = FieldType.Text)
    private String authorName;

    @Field(type = FieldType.Keyword)
    private List<String> tags;

    @Field(type = FieldType.Keyword)
    private UUID spaceId; // Wiki only

    @Field(type = FieldType.Keyword)
    private String spaceName; // Wiki only

    @Field(type = FieldType.Keyword)
    private String category; // Blog/Template only

    @Field(type = FieldType.Integer)
    private int viewCount;

    @Field(type = FieldType.Integer)
    private int likeCount;

    @Field(type = FieldType.Date, format = DateFormat.epoch_millis)
    private Instant createdAt;

    @Field(type = FieldType.Date, format = DateFormat.epoch_millis)
    private Instant updatedAt;

    @Field(type = FieldType.Date, format = DateFormat.epoch_millis)
    private Instant publishedAt;

    @Field(type = FieldType.Boolean)
    private boolean deleted;

    // Composite ID for uniqueness: contentType + contentId
    public static String buildId(String contentType, UUID contentId) {
        return contentType + "_" + contentId.toString();
    }
}
```

- [ ] **Step 2: Create FluenceDocumentRepository.java**

```java
package com.hrms.infrastructure.search.repository;

import com.hrms.infrastructure.search.document.FluenceDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FluenceDocumentRepository extends ElasticsearchRepository<FluenceDocument, String> {

    Page<FluenceDocument> findByTenantIdAndDeletedFalse(UUID tenantId, Pageable pageable);

    Page<FluenceDocument> findByTenantIdAndContentTypeAndDeletedFalse(UUID tenantId, String contentType, Pageable pageable);

    void deleteByContentTypeAndContentId(String contentType, UUID contentId);

    List<FluenceDocument> findByTenantIdAndContentIdIn(UUID tenantId, List<UUID> contentIds);
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/hrms/infrastructure/search/
git commit -m "feat(fluence): add Elasticsearch document model and repository"
```

---

### Task A4: Create Indexing Service + Search Service

**Files:**
- Create: `backend/src/main/java/com/hrms/infrastructure/search/service/FluenceIndexingService.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/search/service/FluenceSearchService.java`

- [ ] **Step 1: Create FluenceIndexingService.java**

This service converts domain entities to ES documents and indexes them. It extracts plain text from TipTap JSONB content (reuses logic from `FluenceContentRetriever.extractTextFromTipTapJson`).

Key methods:
- `indexWikiPage(WikiPage page)` — Convert WikiPage entity → FluenceDocument and save
- `indexBlogPost(BlogPost post)` — Convert BlogPost entity → FluenceDocument and save
- `indexTemplate(DocumentTemplate template)` — Convert template → FluenceDocument and save
- `removeDocument(String contentType, UUID contentId)` — Delete from index
- `reindexAll(UUID tenantId)` — Full reindex for a tenant
- `extractPlainText(String tipTapJson)` — Extract searchable text from JSONB

- [ ] **Step 2: Create FluenceSearchService.java**

This service handles search queries against Elasticsearch.

Key methods:
- `search(UUID tenantId, String query, String contentType, Pageable pageable)` — Multi-field search with boosting (title^3, excerpt^2, bodyText^1)
- `searchWithFilters(UUID tenantId, String query, String contentType, String visibility, List<String> tags, Pageable pageable)` — Filtered search
- Build NativeQuery with `must` (query) + `filter` (tenantId, contentType, visibility, deleted=false)

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/hrms/infrastructure/search/service/
git commit -m "feat(fluence): add ES indexing and search services"
```

---

### Task A5: Kafka Event + Consumer for ES Indexing

**Files:**
- Create: `backend/src/main/java/com/hrms/infrastructure/kafka/events/FluenceContentEvent.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/kafka/consumer/FluenceSearchConsumer.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaTopics.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaConfig.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/kafka/producer/EventPublisher.java`

- [ ] **Step 1: Add topic constants to KafkaTopics.java**

```java
public static final String FLUENCE_CONTENT = "nu-aura.fluence-content";
public static final String FLUENCE_CONTENT_DLT = FLUENCE_CONTENT + ".dlt";
public static final String GROUP_FLUENCE_SEARCH = "nu-aura-fluence-search-service";
```

- [ ] **Step 2: Create FluenceContentEvent.java**

Extend `BaseKafkaEvent`. Fields: `contentType` (WIKI/BLOG/TEMPLATE), `contentId` (UUID), `action` (CREATED/UPDATED/DELETED), `tenantId` (UUID).

- [ ] **Step 3: Add topic bean + consumer factory to KafkaConfig.java**

Follow the existing `approvalsTopic()` pattern. Create `fluenceContentTopic()` with 3 partitions, 24h retention. Add consumer factory method.

- [ ] **Step 4: Add publishFluenceContent() to EventPublisher.java**

Follow the existing `publishApprovalEvent()` pattern.

- [ ] **Step 5: Create FluenceSearchConsumer.java**

Listen on `FLUENCE_CONTENT` topic. On CREATED/UPDATED: load entity from DB, call `FluenceIndexingService.indexXxx()`. On DELETED: call `removeDocument()`. Follow `ApprovalEventConsumer` pattern with error handling and DLT.

**IMPORTANT:** Add `@ConditionalOnProperty(name = "app.elasticsearch.enabled", havingValue = "true")` to this consumer class so the app starts without Elasticsearch in existing dev environments.

- [ ] **Step 6: Verify compilation**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/hrms/infrastructure/kafka/
git commit -m "feat(fluence): add Kafka topic and consumer for ES indexing"
```

---

### Task A6: Wire Content Services to Publish Kafka Events

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/knowledge/service/WikiPageService.java`
- Modify: `backend/src/main/java/com/hrms/application/knowledge/service/BlogPostService.java`
- Modify: `backend/src/main/java/com/hrms/application/knowledge/service/DocumentTemplateService.java`

- [ ] **Step 1: Inject EventPublisher into WikiPageService**

After every `createPage`, `updatePage`, `publishPage`, `deletePage` — call `eventPublisher.publishFluenceContent(...)` with the appropriate action.

- [ ] **Step 2: Same for BlogPostService**

After every `createPost`, `updatePost`, `publishPost`, `deletePost`.

- [ ] **Step 3: Same for DocumentTemplateService**

After every `createTemplate`, `updateTemplate`, `deleteTemplate`.

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/hrms/application/knowledge/service/
git commit -m "feat(fluence): publish Kafka events on content CRUD for ES indexing"
```

---

### Task A7: Rewire KnowledgeSearchController to Use Elasticsearch

**Files:**
- Modify: `backend/src/main/java/com/hrms/api/knowledge/controller/KnowledgeSearchController.java`

- [ ] **Step 1: Add a new search endpoint under `/api/v1/fluence/search`**

The existing controller is at `/api/v1/knowledge/search` but the frontend calls `/fluence/search`. Either:
- Add `@RequestMapping("/api/v1/fluence/search")` to a new controller method, OR
- Add an alias `@GetMapping` in the existing controller

Inject `FluenceSearchService` alongside existing `KnowledgeSearchService`. When `app.elasticsearch.enabled=true`, delegate to `FluenceSearchService`. Otherwise fall back to existing PostgreSQL search. Use `@Value("${app.elasticsearch.enabled:false}")` to toggle.

- [ ] **Step 2: Verify compilation**

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/hrms/api/knowledge/controller/KnowledgeSearchController.java
git commit -m "feat(fluence): wire Elasticsearch search with PostgreSQL fallback"
```

---

### Task A8: Kubernetes Manifests for Elasticsearch

**Files:**
- Create: `deployment/kubernetes/elasticsearch-deployment.yaml`
- Create: `deployment/kubernetes/elasticsearch-service.yaml`

- [ ] **Step 1: Create elasticsearch-deployment.yaml**

Single-node ES 8.11 deployment with PVC for data, resource limits (512Mi-1Gi), health checks. Follow `backend-deployment.yaml` pattern for labels and namespace.

- [ ] **Step 2: Create elasticsearch-service.yaml**

ClusterIP service on port 9200. Follow `backend-service.yaml` pattern.

- [ ] **Step 3: Commit**

```bash
git add deployment/kubernetes/elasticsearch-*.yaml
git commit -m "feat(fluence): add Kubernetes manifests for Elasticsearch"
```

---

## Track B: Wiki Polish + Comments + Likes + Watches + Approval

### Task B1: Flyway Migration for Favorites + Comment Enhancements

**Files:**
- Create: `backend/src/main/resources/db/migration/V56__fluence_favorites_and_enhancements.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Fluence Favorites table
CREATE TABLE IF NOT EXISTS fluence_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL, -- WIKI, BLOG, TEMPLATE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fluence_favorite UNIQUE (tenant_id, user_id, content_id, content_type)
);

CREATE INDEX idx_fluence_favorites_tenant_user ON fluence_favorites(tenant_id, user_id);
CREATE INDEX idx_fluence_favorites_content ON fluence_favorites(tenant_id, content_id, content_type);

-- Add mentions JSONB to wiki_page_comments
ALTER TABLE wiki_page_comments ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]';
ALTER TABLE wiki_page_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES wiki_page_comments(id);

-- Add mentions JSONB to blog_comments
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]';
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES blog_comments(id);

-- Fluence Activities table (for Wall)
CREATE TABLE IF NOT EXISTS fluence_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, PUBLISHED, COMMENTED, LIKED
    content_type VARCHAR(20) NOT NULL, -- WIKI, BLOG, TEMPLATE
    content_id UUID NOT NULL,
    content_title VARCHAR(500),
    content_excerpt TEXT, -- 5-10 line preview
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fluence_activities_tenant ON fluence_activities(tenant_id, created_at DESC);
CREATE INDEX idx_fluence_activities_actor ON fluence_activities(tenant_id, actor_id);

-- Wiki space approval fields
ALTER TABLE wiki_spaces ADD COLUMN IF NOT EXISTS approval_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE wiki_spaces ADD COLUMN IF NOT EXISTS approver_employee_id UUID;

-- Wiki page like table (analogous to blog_likes)
CREATE TABLE IF NOT EXISTS wiki_page_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    wiki_page_id UUID NOT NULL REFERENCES wiki_pages(id),
    liked_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wiki_page_like UNIQUE (tenant_id, wiki_page_id, liked_by)
);

CREATE INDEX idx_wiki_page_likes_page ON wiki_page_likes(tenant_id, wiki_page_id);

-- Soft-delete columns (project convention: is_deleted + deleted_at on all entities)
ALTER TABLE fluence_favorites ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE fluence_favorites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE fluence_activities ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE fluence_activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE wiki_page_likes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE wiki_page_likes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Edit locks table (for "someone else is editing" warning)
-- Using Redis instead, so no DB table needed

-- RLS policies
ALTER TABLE fluence_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluence_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY fluence_favorites_tenant_isolation ON fluence_favorites
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY fluence_activities_tenant_isolation ON fluence_activities
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY wiki_page_likes_tenant_isolation ON wiki_page_likes
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

- [ ] **Step 2: Verify migration naming is correct (V56)**

V54 and V55 already exist. Next available = V56. Verify with: `ls backend/src/main/resources/db/migration/V5*.sql | sort`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V56__fluence_favorites_and_enhancements.sql
git commit -m "feat(fluence): V54 migration for favorites, activities, comment enhancements"
```

---

### Task B2: Comment Service + Controller (Wiki + Blog)

**Files:**
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/WikiCommentService.java`
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/BlogCommentService.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceCommentController.java`
- Modify: `backend/src/main/java/com/hrms/api/knowledge/dto/CreateCommentRequest.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/dto/WikiCommentDto.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/WikiPageCommentRepository.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/BlogCommentRepository.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/WikiPageComment.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/BlogComment.java`

- [ ] **Step 1: Add mentions JSONB field to WikiPageComment entity**

The `parentComment` field already exists on both WikiPageComment and BlogComment. Only add the `mentions` field:
```java
@Column(columnDefinition = "jsonb")
@JdbcTypeCode(SqlTypes.JSON)
private List<UUID> mentions;
```

- [ ] **Step 2: Same for BlogComment entity — add mentions field only**

- [ ] **Step 3: Add repository query methods**

WikiPageCommentRepository:
```java
Page<WikiPageComment> findByTenantIdAndWikiPageIdAndParentCommentIsNullOrderByCreatedAtDesc(UUID tenantId, UUID pageId, Pageable pageable);
List<WikiPageComment> findByTenantIdAndParentCommentId(UUID tenantId, UUID parentId);
long countByTenantIdAndWikiPageId(UUID tenantId, UUID pageId);
```

BlogCommentRepository: same pattern with `blogPostId`.

- [ ] **Step 4: Enhance CreateCommentRequest DTO**

The existing DTO has `content` field. Add: `parentCommentId` (UUID, optional), `mentions` (List<UUID>, optional). Note: the frontend sends `body` and `parentId` — add `@JsonAlias("body")` on `content` and `@JsonAlias("parentId")` on `parentCommentId` for compatibility.

- [ ] **Step 5: Create WikiCommentDto**

Fields: `id`, `content`, `authorId`, `authorName`, `likeCount`, `parentCommentId`, `mentions`, `replies` (List<WikiCommentDto>), `createdAt`, `updatedAt`. Static factory `fromEntity()`.

- [ ] **Step 6: Create WikiCommentService**

Methods: `createComment(tenantId, pageId, request)`, `getComments(tenantId, pageId, pageable)` (loads top-level + nested replies), `updateComment(tenantId, commentId, content)`, `deleteComment(tenantId, commentId)`, `likeComment(tenantId, commentId, userId)`.

- [ ] **Step 7: Create BlogCommentService** (same pattern)

- [ ] **Step 8: Create FluenceCommentController**

REST endpoints:
- `GET /api/v1/fluence/comments/{contentType}/{contentId}` — List comments (paginated)
- `POST /api/v1/fluence/comments/{contentType}/{contentId}` — Create comment
- `PUT /api/v1/fluence/comments/{contentType}/{contentId}/{commentId}` — Update comment (matches frontend)
- `DELETE /api/v1/fluence/comments/{contentType}/{contentId}/{commentId}` — Delete comment (matches frontend)
- `GET /api/v1/fluence/comments/{contentType}/{contentId}/{commentId}/permalink` — Get comment permalink

Route to WikiCommentService or BlogCommentService based on `contentType` path variable.

- [ ] **Step 9: Verify compilation**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/hrms/application/knowledge/service/WikiCommentService.java \
       backend/src/main/java/com/hrms/application/knowledge/service/BlogCommentService.java \
       backend/src/main/java/com/hrms/api/knowledge/controller/FluenceCommentController.java \
       backend/src/main/java/com/hrms/api/knowledge/dto/ \
       backend/src/main/java/com/hrms/infrastructure/knowledge/repository/ \
       backend/src/main/java/com/hrms/domain/knowledge/
git commit -m "feat(fluence): add comment service with threading, @mentions, and permalinks"
```

---

### Task B3: Content Engagement Service (Likes, Favorites, Views, Watches)

**Files:**
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/ContentEngagementService.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/controller/ContentEngagementController.java`
- Create: `backend/src/main/java/com/hrms/domain/knowledge/FluenceFavorite.java`
- Create: `backend/src/main/java/com/hrms/domain/knowledge/WikiPageLike.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/FluenceFavoriteRepository.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/WikiPageLikeRepository.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/dto/FavoriteDto.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/BlogLikeRepository.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/WikiPageWatchRepository.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/KnowledgeViewRepository.java`

- [ ] **Step 1: Create FluenceFavorite entity**

Fields: `id`, `tenantId`, `userId`, `contentId`, `contentType`, `createdAt`. Map to `fluence_favorites` table.

- [ ] **Step 2: Create WikiPageLike entity**

Fields: `id`, `tenantId`, `wikiPage` (ManyToOne), `likedBy`, `createdAt`. Map to `wiki_page_likes` table.

- [ ] **Step 3: Create repositories with query methods**

FluenceFavoriteRepository:
```java
List<FluenceFavorite> findByTenantIdAndUserId(UUID tenantId, UUID userId);
Optional<FluenceFavorite> findByTenantIdAndUserIdAndContentIdAndContentType(UUID tenantId, UUID userId, UUID contentId, String contentType);
void deleteByTenantIdAndUserIdAndContentIdAndContentType(UUID tenantId, UUID userId, UUID contentId, String contentType);
```

WikiPageLikeRepository:
```java
Optional<WikiPageLike> findByTenantIdAndWikiPageIdAndLikedBy(UUID tenantId, UUID pageId, UUID userId);
boolean existsByTenantIdAndWikiPageIdAndLikedBy(UUID tenantId, UUID pageId, UUID userId);
void deleteByTenantIdAndWikiPageIdAndLikedBy(UUID tenantId, UUID pageId, UUID userId);
```

Add similar methods to BlogLikeRepository, WikiPageWatchRepository, KnowledgeViewRepository.

- [ ] **Step 4: Create ContentEngagementService**

Methods:
- `likeWikiPage(tenantId, pageId, userId)` / `unlikeWikiPage(...)` — Toggle like, update counter
- `likeBlogPost(tenantId, postId, userId)` / `unlikeBlogPost(...)`
- `addFavorite(tenantId, userId, contentId, contentType)` / `removeFavorite(...)`
- `getFavorites(tenantId, userId)` — List all user favorites
- `recordView(tenantId, contentId, contentType, userId)` — Track view, increment counter
- `getViewers(tenantId, contentId, contentType)` — List viewers
- `watchWikiPage(tenantId, pageId, userId)` / `unwatchWikiPage(...)` — Subscribe/unsubscribe
- `getWatchers(tenantId, pageId)` — List watchers
- `isLiked(tenantId, contentId, userId, contentType)` — Check if user liked
- `isFavorited(tenantId, contentId, userId, contentType)` — Check if user favorited

- [ ] **Step 5: Create ContentEngagementController**

REST endpoints:
- `POST /api/v1/fluence/wiki/pages/{id}/like` — Like wiki page
- `DELETE /api/v1/fluence/wiki/pages/{id}/like` — Unlike wiki page
- `POST /api/v1/fluence/blog/posts/{id}/like` — Like blog post
- `DELETE /api/v1/fluence/blog/posts/{id}/like` — Unlike blog post
- `GET /api/v1/fluence/favorites` — List user favorites
- `POST /api/v1/fluence/favorites` — Add favorite
- `DELETE /api/v1/fluence/favorites/{contentType}/{contentId}` — Remove favorite
- `POST /api/v1/fluence/views/{contentType}/{contentId}` — Record view
- `GET /api/v1/fluence/views/{contentType}/{contentId}` — Get viewers
- `POST /api/v1/fluence/wiki/pages/{id}/watch` — Watch page
- `DELETE /api/v1/fluence/wiki/pages/{id}/watch` — Unwatch page

- [ ] **Step 6: Verify compilation**

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/hrms/application/knowledge/service/ContentEngagementService.java \
       backend/src/main/java/com/hrms/api/knowledge/controller/ContentEngagementController.java \
       backend/src/main/java/com/hrms/domain/knowledge/FluenceFavorite.java \
       backend/src/main/java/com/hrms/domain/knowledge/WikiPageLike.java \
       backend/src/main/java/com/hrms/infrastructure/knowledge/repository/ \
       backend/src/main/java/com/hrms/api/knowledge/dto/FavoriteDto.java
git commit -m "feat(fluence): add engagement service for likes, favorites, views, watches"
```

---

### Task B4: Wiki Space Approval Configuration

**Files:**
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/WikiSpace.java`
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/WikiSpaceApprovalService.java`
- Modify: `backend/src/main/java/com/hrms/api/knowledge/controller/WikiSpaceController.java`
- Modify: `backend/src/main/java/com/hrms/api/knowledge/dto/CreateWikiSpaceRequest.java`

- [ ] **Step 1: Add approval fields to WikiSpace entity**

```java
@Column(name = "approval_enabled")
private Boolean approvalEnabled = false;

@Column(name = "approver_employee_id")
private UUID approverEmployeeId;
```

- [ ] **Step 2: Add fields to CreateWikiSpaceRequest DTO**

```java
private Boolean approvalEnabled;
private UUID approverEmployeeId;
```

- [ ] **Step 3: Create WikiSpaceApprovalService**

Methods:
- `isApprovalRequired(UUID tenantId, UUID spaceId)` — Check if space has approval enabled
- `getApprover(UUID tenantId, UUID spaceId)` — Get assigned approver
- `configureApproval(UUID tenantId, UUID spaceId, boolean enabled, UUID approverEmployeeId)` — Set/update approval config

- [ ] **Step 4: Modify WikiSpaceController to pass approval config on create/update**

- [ ] **Step 5: Verify compilation + Commit**

```bash
git add backend/src/main/java/com/hrms/domain/knowledge/WikiSpace.java \
       backend/src/main/java/com/hrms/application/knowledge/service/WikiSpaceApprovalService.java \
       backend/src/main/java/com/hrms/api/knowledge/controller/WikiSpaceController.java \
       backend/src/main/java/com/hrms/api/knowledge/dto/CreateWikiSpaceRequest.java
git commit -m "feat(fluence): add per-space approval configuration"
```

---

## Track C: Blogs + Wall (Activity Feed)

### Task C1: Activity Feed Backend

**Files:**
- Create: `backend/src/main/java/com/hrms/domain/knowledge/FluenceActivity.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/FluenceActivityRepository.java`
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/FluenceActivityService.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceActivityController.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/dto/FluenceActivityDto.java`

- [ ] **Step 1: Create FluenceActivity entity**

Fields: `id`, `tenantId`, `actorId`, `action` (CREATED/UPDATED/PUBLISHED/COMMENTED/LIKED), `contentType` (WIKI/BLOG/TEMPLATE), `contentId`, `contentTitle`, `contentExcerpt` (5-10 line preview), `metadata` (JSONB), `createdAt`.

- [ ] **Step 2: Create FluenceActivityRepository**

Methods:
```java
Page<FluenceActivity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
Page<FluenceActivity> findByTenantIdAndContentTypeOrderByCreatedAtDesc(UUID tenantId, String contentType, Pageable pageable);
Page<FluenceActivity> findByTenantIdAndActorIdOrderByCreatedAtDesc(UUID tenantId, UUID actorId, Pageable pageable);
```

- [ ] **Step 3: Create FluenceActivityService**

Methods:
- `recordActivity(tenantId, actorId, action, contentType, contentId, contentTitle, contentExcerpt)` — Create activity record
- `getActivityFeed(tenantId, pageable)` — Get paginated feed
- `getActivityFeedByType(tenantId, contentType, pageable)` — Filtered feed
- `getUserActivity(tenantId, actorId, pageable)` — User-specific activity

The `contentExcerpt` should be first 5-10 lines extracted from TipTap JSON content (reuse extraction logic from `FluenceContentRetriever`).

- [ ] **Step 4: Create FluenceActivityDto**

Fields: `id`, `actorId`, `actorName`, `action`, `contentType`, `contentId`, `contentTitle`, `contentExcerpt`, `metadata`, `createdAt`. Static `fromEntity()` factory.

- [ ] **Step 5: Create FluenceActivityController**

Endpoints:
- `GET /api/v1/fluence/activities` — Get activity feed (paginated)
- `GET /api/v1/fluence/activities?contentType=WIKI` — Filtered by type
- `GET /api/v1/fluence/activities/me` — Current user's activity

- [ ] **Step 6: Verify compilation + Commit**

```bash
git add backend/src/main/java/com/hrms/domain/knowledge/FluenceActivity.java \
       backend/src/main/java/com/hrms/infrastructure/knowledge/repository/FluenceActivityRepository.java \
       backend/src/main/java/com/hrms/application/knowledge/service/FluenceActivityService.java \
       backend/src/main/java/com/hrms/api/knowledge/controller/FluenceActivityController.java \
       backend/src/main/java/com/hrms/api/knowledge/dto/FluenceActivityDto.java
git commit -m "feat(fluence): add activity feed backend service and controller"
```

---

### Task C2: Wire Activity Recording into Content Services

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/knowledge/service/WikiPageService.java`
- Modify: `backend/src/main/java/com/hrms/application/knowledge/service/BlogPostService.java`
- Modify: `backend/src/main/java/com/hrms/application/knowledge/service/DocumentTemplateService.java`

- [ ] **Step 1: Inject FluenceActivityService into WikiPageService**

After `createPage` → record CREATED activity.
After `updatePage` → record UPDATED activity.
After `publishPage` → record PUBLISHED activity.

Extract first 5-10 lines of content for `contentExcerpt`.

- [ ] **Step 2: Same for BlogPostService**

- [ ] **Step 3: Same for DocumentTemplateService**

- [ ] **Step 4: Verify compilation + Commit**

```bash
git add backend/src/main/java/com/hrms/application/knowledge/service/
git commit -m "feat(fluence): wire activity recording into content CRUD services"
```

---

### Task C3: Wall Frontend — Activity Feed UI

**Files:**
- Modify: `frontend/app/fluence/wall/page.tsx`
- Create: `frontend/components/fluence/ActivityFeed.tsx`
- Create: `frontend/components/fluence/ActivityCard.tsx`
- Modify: `frontend/lib/services/fluence.service.ts`
- Modify: `frontend/lib/types/fluence.ts`
- Modify: `frontend/lib/hooks/queries/useFluence.ts`

- [ ] **Step 1: Add FluenceActivity type to fluence.ts**

```typescript
export interface FluenceActivity {
  id: string;
  actorId: string;
  actorName: string;
  action: 'CREATED' | 'UPDATED' | 'PUBLISHED' | 'COMMENTED' | 'LIKED';
  contentType: 'WIKI' | 'BLOG' | 'TEMPLATE';
  contentId: string;
  contentTitle: string;
  contentExcerpt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
```

- [ ] **Step 2: Add API methods to fluence.service.ts**

```typescript
export async function getActivityFeed(page = 0, size = 20, contentType?: string) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (contentType) params.set('contentType', contentType);
  const { data } = await apiClient.get<Page<FluenceActivity>>(`/fluence/activities?${params}`);
  return data;
}
```

- [ ] **Step 3: Add useActivityFeed hook to useFluence.ts**

```typescript
export function useActivityFeed(page = 0, contentType?: string) {
  return useQuery({
    queryKey: fluenceKeys.activities(page, contentType),
    queryFn: () => getActivityFeed(page, 20, contentType),
    staleTime: 30 * 1000,
  });
}
```

- [ ] **Step 4: Create ActivityCard.tsx component**

Display: user avatar + "**John** created wiki page **Remote Work Policy**" + 5-10 line content preview in a collapsible section. Clicking title navigates to content. Show relative time ("2 hours ago").

- [ ] **Step 5: Create ActivityFeed.tsx component**

Infinite scroll list of ActivityCards. Filter tabs: All, Wiki, Blog, Template. Uses `useActivityFeed` hook.

- [ ] **Step 6: Rewrite wall/page.tsx**

Replace the redirect with a proper page layout:
- Page title: "Activity Wall"
- Filter tabs at top
- ActivityFeed component
- Sidebar with "Trending Content" (top 5 most viewed this week)

- [ ] **Step 7: Commit**

```bash
git add frontend/app/fluence/wall/ frontend/components/fluence/Activity* frontend/lib/services/fluence.service.ts frontend/lib/types/fluence.ts frontend/lib/hooks/queries/useFluence.ts
git commit -m "feat(fluence): add activity wall with feed UI and content preview"
```

---

## Track D: AI Chat (Groq) + Drive (MinIO Attachments)

### Task D1: Fluence Attachment Service (MinIO Integration)

**Files:**
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/FluenceAttachmentService.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceAttachmentController.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/dto/FluenceAttachmentDto.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/KnowledgeAttachment.java`
- Modify: `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/KnowledgeAttachmentRepository.java`

- [ ] **Step 1: Enhance KnowledgeAttachment entity**

Add/verify fields: `objectName` (MinIO object key), `contentType` (MIME), `fileSize` (long), `contentId` (UUID — the wiki/blog it's attached to), `contentTypeEnum` (WIKI/BLOG). Ensure it extends TenantAware.

- [ ] **Step 2: Add repository query methods**

```java
List<KnowledgeAttachment> findByTenantIdAndContentIdAndContentType(UUID tenantId, UUID contentId, String contentType);
Optional<KnowledgeAttachment> findByTenantIdAndId(UUID tenantId, UUID id);
long countByTenantIdAndContentIdAndContentType(UUID tenantId, UUID contentId, String contentType);
```

- [ ] **Step 3: Create FluenceAttachmentService**

Inject existing `FileStorageService` (from `com.hrms.application.document.service`). Use category `CATEGORY_ATTACHMENTS` or create `CATEGORY_FLUENCE`.

Methods:
- `uploadAttachment(tenantId, contentId, contentType, MultipartFile file)` — Validate (50MB limit, all types allowed), upload to MinIO, create KnowledgeAttachment record
- `getAttachments(tenantId, contentId, contentType)` — List attachments
- `getDownloadUrl(tenantId, attachmentId)` — Get pre-signed MinIO download URL
- `deleteAttachment(tenantId, attachmentId)` — Delete from MinIO + DB

- [ ] **Step 4: Create FluenceAttachmentDto**

Fields: `id`, `fileName`, `fileSize`, `contentType`, `downloadUrl`, `createdAt`, `createdBy`. Static `fromEntity()`.

- [ ] **Step 5: Create FluenceAttachmentController**

Endpoints:
- `POST /api/v1/fluence/attachments/{contentType}/{contentId}` — Upload file (multipart)
- `GET /api/v1/fluence/attachments/{contentType}/{contentId}` — List attachments
- `GET /api/v1/fluence/attachments/{id}/download` — Get download URL
- `DELETE /api/v1/fluence/attachments/{id}` — Delete attachment

- [ ] **Step 6: Verify compilation + Commit**

```bash
git add backend/src/main/java/com/hrms/application/knowledge/service/FluenceAttachmentService.java \
       backend/src/main/java/com/hrms/api/knowledge/controller/FluenceAttachmentController.java \
       backend/src/main/java/com/hrms/api/knowledge/dto/FluenceAttachmentDto.java \
       backend/src/main/java/com/hrms/domain/knowledge/KnowledgeAttachment.java \
       backend/src/main/java/com/hrms/infrastructure/knowledge/repository/KnowledgeAttachmentRepository.java
git commit -m "feat(fluence): add MinIO-based file attachment service"
```

---

### Task D2: Drive Frontend — MinIO File Browser

**Files:**
- Modify: `frontend/app/fluence/drive/page.tsx`
- Create: `frontend/components/fluence/FileUploader.tsx`
- Create: `frontend/components/fluence/FileList.tsx`
- Modify: `frontend/lib/services/fluence.service.ts`
- Modify: `frontend/lib/types/fluence.ts`
- Modify: `frontend/lib/hooks/queries/useFluence.ts`

- [ ] **Step 1: Add FluenceAttachment type to fluence.ts**

```typescript
export interface FluenceAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  downloadUrl: string;
  createdAt: string;
  createdBy: string;
}
```

- [ ] **Step 2: Add attachment API methods to fluence.service.ts**

```typescript
export async function uploadAttachment(contentType: string, contentId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<FluenceAttachment>(`/fluence/attachments/${contentType}/${contentId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getAttachments(contentType: string, contentId: string) {
  const { data } = await apiClient.get<FluenceAttachment[]>(`/fluence/attachments/${contentType}/${contentId}`);
  return data;
}

export async function deleteAttachment(id: string) {
  await apiClient.delete(`/fluence/attachments/${id}`);
}
```

- [ ] **Step 3: Add hooks to useFluence.ts**

`useAttachments(contentType, contentId)`, `useUploadAttachment()`, `useDeleteAttachment()`

- [ ] **Step 4: Create FileUploader.tsx**

Drag-and-drop zone using Mantine's `Dropzone` component. 50MB limit. Shows upload progress. On success, invalidates attachments query.

- [ ] **Step 5: Create FileList.tsx**

List of attached files with: file icon (based on type), name, size (formatted), download button, delete button (with confirmation). Uses `useAttachments` hook.

- [ ] **Step 6: Rewrite drive/page.tsx**

Replace Google Drive OAuth with a simple file management page:
- Remove `@react-oauth/google` import and `useGoogleLogin` usage
- "My Files" section — recent uploads across all content
- Upload area (FileUploader component)
- File list organized by content type (Wiki attachments, Blog attachments)
- Search/filter by file name

Note: `@react-oauth/google` is used in 6+ other pages (login, nu-drive, nu-mail, nu-calendar, onboarding, providers.tsx) so do NOT remove from package.json. Only remove the import from this page.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/fluence/drive/ frontend/components/fluence/File* frontend/lib/services/fluence.service.ts frontend/lib/types/fluence.ts frontend/lib/hooks/queries/useFluence.ts
git commit -m "feat(fluence): add MinIO-based drive page with file upload/download"
```

---

### Task D3: Verify AI Chat (Groq) End-to-End

**Files:**
- Read: `backend/src/main/java/com/hrms/application/knowledge/service/FluenceChatService.java`
- Read: `backend/src/main/java/com/hrms/application/knowledge/service/FluenceContentRetriever.java`
- Read: `frontend/components/fluence/FluenceChatWidget.tsx`

The AI Chat with Groq is already implemented. This task is verification:

- [ ] **Step 1: Verify Groq API key is configured**

Check `application.yml` for `ai.openai.api-key` and `ai.openai.base-url` pointing to Groq.

- [ ] **Step 2: Verify FluenceChatService handles errors gracefully**

Read the service — confirm mock fallback exists when API key is missing.

- [ ] **Step 3: Verify frontend chat widget connects properly**

Read `FluenceChatWidget.tsx` — confirm it calls the correct SSE endpoint.

- [ ] **Step 4: Document any issues found, fix if needed**

- [ ] **Step 5: Commit any fixes**

```bash
# Only commit if fixes were needed. Stage specific changed files:
git add backend/src/main/java/com/hrms/application/knowledge/service/FluenceChatService.java \
       frontend/components/fluence/FluenceChatWidget.tsx
git commit -m "fix(fluence): verify and fix AI chat Groq integration"
```

---

## Track E: Notifications + Edit Lock + Polish

### Task E1: Fluence Notification Service

**Files:**
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/FluenceNotificationService.java`

- [ ] **Step 1: Create FluenceNotificationService**

Inject `EventPublisher` (for Kafka notification events) and `NotificationService` (for direct in-app notifications).

Methods:
- `notifyWatchers(tenantId, pageId, actorId, action, pageTitle)` — Get all watchers of a page, send notification to each (except the actor)
- `notifyMentionedUsers(tenantId, mentionedUserIds, actorId, contentType, contentId, contentTitle)` — Send @mention notification
- `notifyCommentOnOwnContent(tenantId, contentOwnerId, actorId, contentType, contentId, contentTitle)` — Notify content owner of new comment

Each method creates a `NotificationEvent` and publishes to Kafka `NOTIFICATIONS` topic. Event payload includes:
- `userId` (recipient)
- `type` (FLUENCE_WATCH / FLUENCE_MENTION / FLUENCE_COMMENT)
- `title` ("New comment on your wiki page")
- `message` (actor name + action description)
- `actionUrl` ("/fluence/wiki/{slug}" or "/fluence/blogs/{slug}")
- `relatedEntityId`, `relatedEntityType`

- [ ] **Step 2: Wire into WikiCommentService (from Task B2)**

After creating a comment:
1. Extract @mentions from request
2. Call `notifyMentionedUsers()`
3. Call `notifyCommentOnOwnContent()` if commenter != page owner
4. Call `notifyWatchers()` for all page watchers

- [ ] **Step 3: Wire into BlogCommentService (same pattern)**

- [ ] **Step 4: Wire into WikiPageService**

After `updatePage` and `publishPage`: call `notifyWatchers()`.

- [ ] **Step 5: Verify compilation + Commit**

```bash
git add backend/src/main/java/com/hrms/application/knowledge/service/FluenceNotificationService.java \
       backend/src/main/java/com/hrms/application/knowledge/service/WikiCommentService.java \
       backend/src/main/java/com/hrms/application/knowledge/service/BlogCommentService.java \
       backend/src/main/java/com/hrms/application/knowledge/service/WikiPageService.java
git commit -m "feat(fluence): wire notifications for watches, @mentions, and comments"
```

---

### Task E2: Redis-Based Edit Lock ("Someone Else is Editing")

**Files:**
- Create: `backend/src/main/java/com/hrms/application/knowledge/service/FluenceEditLockService.java`
- Create: `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceEditLockController.java`

- [ ] **Step 1: Create FluenceEditLockService**

Uses Redis (already configured via `spring-boot-starter-data-redis`) for distributed edit locks.

Redis key pattern: `fluence:edit-lock:{contentType}:{contentId}`
Value: JSON `{"userId": "uuid", "userName": "John Doe", "lockedAt": "2026-03-20T10:00:00Z"}`
TTL: 5 minutes (auto-expires if user navigates away without releasing)

Methods:
- `acquireLock(tenantId, contentType, contentId, userId, userName)` — Set Redis key with TTL. If key exists and userId != current user, return the existing lock holder info. If key exists and userId == current user, refresh TTL.
- `releaseLock(tenantId, contentType, contentId, userId)` — Delete Redis key if owned by this user.
- `getLockInfo(tenantId, contentType, contentId)` — Return current lock holder or null.
- `refreshLock(tenantId, contentType, contentId, userId)` — Extend TTL (called every 2 minutes by frontend heartbeat).

```java
@Service
public class FluenceEditLockService {
    private final StringRedisTemplate redisTemplate;
    private static final long LOCK_TTL_MINUTES = 5;
    private static final String KEY_PREFIX = "fluence:edit-lock:";

    // ... implementation
}
```

- [ ] **Step 2: Create FluenceEditLockController**

Endpoints:
- `POST /api/v1/fluence/edit-lock/{contentType}/{contentId}` — Acquire lock (returns lock info or conflict)
- `DELETE /api/v1/fluence/edit-lock/{contentType}/{contentId}` — Release lock
- `GET /api/v1/fluence/edit-lock/{contentType}/{contentId}` — Check lock status
- `PUT /api/v1/fluence/edit-lock/{contentType}/{contentId}/heartbeat` — Refresh TTL

Response DTO:
```java
public record EditLockResponse(
    boolean locked,
    UUID lockedByUserId,
    String lockedByUserName,
    Instant lockedAt,
    boolean isOwnLock
) {}
```

- [ ] **Step 3: Verify compilation + Commit**

```bash
git add backend/src/main/java/com/hrms/application/knowledge/service/FluenceEditLockService.java \
       backend/src/main/java/com/hrms/api/knowledge/controller/FluenceEditLockController.java
git commit -m "feat(fluence): add Redis-based edit lock for concurrent editing warning"
```

---

### Task E3: Edit Lock Frontend Warning

**Files:**
- Create: `frontend/components/fluence/EditLockWarning.tsx`
- Modify: `frontend/app/fluence/wiki/[slug]/edit/page.tsx`
- Modify: `frontend/app/fluence/blogs/[slug]/edit/page.tsx`
- Modify: `frontend/lib/services/fluence.service.ts`
- Modify: `frontend/lib/hooks/queries/useFluence.ts`

- [ ] **Step 1: Add edit lock API methods to fluence.service.ts**

```typescript
export async function acquireEditLock(contentType: string, contentId: string) {
  const { data } = await apiClient.post<EditLockResponse>(`/fluence/edit-lock/${contentType}/${contentId}`);
  return data;
}

export async function releaseEditLock(contentType: string, contentId: string) {
  await apiClient.delete(`/fluence/edit-lock/${contentType}/${contentId}`);
}

export async function checkEditLock(contentType: string, contentId: string) {
  const { data } = await apiClient.get<EditLockResponse>(`/fluence/edit-lock/${contentType}/${contentId}`);
  return data;
}

export async function refreshEditLock(contentType: string, contentId: string) {
  await apiClient.put(`/fluence/edit-lock/${contentType}/${contentId}/heartbeat`);
}
```

- [ ] **Step 2: Add EditLockResponse type to fluence.ts**

```typescript
export interface EditLockResponse {
  locked: boolean;
  lockedByUserId: string | null;
  lockedByUserName: string | null;
  lockedAt: string | null;
  isOwnLock: boolean;
}
```

- [ ] **Step 3: Add useEditLock hook to useFluence.ts**

Custom hook that:
1. On mount: calls `acquireEditLock()`
2. Sets up 2-minute interval for `refreshEditLock()` heartbeat
3. On unmount: calls `releaseEditLock()`
4. Returns `{ lockInfo, isLocked, lockedByName }`

- [ ] **Step 4: Create EditLockWarning.tsx component**

A Mantine `Alert` banner at the top of the editor:
- Color: yellow/warning
- Icon: lock icon
- Text: "**{userName}** is currently editing this page. Your changes may conflict."
- Action button: "Edit Anyway" (force acquire lock)

- [ ] **Step 5: Wire into wiki/[slug]/edit/page.tsx**

At the top of the edit page, use `useEditLock('WIKI', pageId)`. If locked by another user, show `EditLockWarning`. If own lock, proceed normally.

- [ ] **Step 6: Same for blogs/[slug]/edit/page.tsx**

- [ ] **Step 7: Commit**

```bash
git add frontend/components/fluence/EditLockWarning.tsx \
       frontend/app/fluence/wiki/*/edit/ \
       frontend/app/fluence/blogs/*/edit/ \
       frontend/lib/services/fluence.service.ts \
       frontend/lib/types/fluence.ts \
       frontend/lib/hooks/queries/useFluence.ts
git commit -m "feat(fluence): add edit lock warning UI with heartbeat"
```

---

### Task E4: My Content + Analytics Polish

**Files:**
- Verify: `frontend/app/fluence/my-content/page.tsx` (should already work)
- Verify: `frontend/app/fluence/dashboard/page.tsx` (should already show basic analytics)

- [ ] **Step 1: Verify My Content page works with real APIs**

Read the page. Confirm it uses `useMyWikiPages` and `useMyBlogPosts` hooks. Confirm the backend has `/fluence/wiki/pages/my` and `/fluence/blog/posts/my` endpoints (check WikiPageController and BlogPostController).

If missing backend endpoints, add them:
```java
// In WikiPageController
@GetMapping("/my")
public ResponseEntity<Page<WikiPageDto>> getMyPages(@RequestParam(defaultValue = "0") int page, ...) {
    UUID userId = SecurityContextHolder.getContext().getAuthentication()...;
    // Query pages where createdBy = userId
}
```

- [ ] **Step 2: Verify Dashboard page shows basic analytics**

Read the dashboard page. Confirm it shows: total wiki pages, total blog posts, total templates, recent content. If any data source is missing, wire it up.

- [ ] **Step 3: Add "Top Pages" and "Trending" widgets if missing**

Query: pages sorted by `viewCount DESC` (top pages) and pages sorted by `updatedAt DESC` (trending/recent).

- [ ] **Step 4: Commit any fixes**

```bash
git add frontend/app/fluence/my-content/ frontend/app/fluence/dashboard/
git commit -m "fix(fluence): polish my-content and dashboard pages"
```

---

### Task E5: Add Fluence Routes to Sidebar Navigation

**Files:**
- Verify: `frontend/lib/config/apps.ts` — Sidebar sections for Fluence

- [ ] **Step 1: Verify sidebar config includes all 8 modules**

Check that the Fluence sidebar includes links to:
- Wiki (`/fluence/wiki`)
- Blogs (`/fluence/blogs`)
- Templates (`/fluence/templates`)
- Drive (`/fluence/drive`)
- Search (`/fluence/search`)
- My Content (`/fluence/my-content`)
- Wall (`/fluence/wall`)
- Dashboard (`/fluence/dashboard`)

**KNOWN ISSUE:** The current `routePrefixes` in `apps.ts` is missing `/fluence/wall` and `/fluence/dashboard`. Without these, navigating to those routes falls through to HRMS default sidebar. Add them:
```typescript
routePrefixes: [
  '/fluence/wiki',
  '/fluence/blogs',
  '/fluence/templates',
  '/fluence/drive',
  '/fluence/search',
  '/fluence/my-content',
  '/fluence/wall',       // ADD
  '/fluence/dashboard',  // ADD
],
```

- [ ] **Step 2: Verify app switcher shows NU-Fluence**

Check `AppSwitcher.tsx` renders the Fluence card with correct gradient, icon, and permissions gating.

- [ ] **Step 3: Commit any fixes**

```bash
git add frontend/lib/config/apps.ts
git commit -m "fix(fluence): ensure all 8 modules in sidebar navigation"
```

---

## Post-Implementation Verification

### Task V1: End-to-End Smoke Test Checklist

After all tracks are complete, verify these flows work:

- [ ] **Wiki:** Create space → Create page → Edit page → Version history → Rollback → Comment with @mention → Like → Watch → Search
- [ ] **Blog:** Create category → Create post → Publish → Comment → Like → Favorite → Search
- [ ] **Templates:** Browse templates → Instantiate (creates wiki page) → Edit resulting page
- [ ] **Search:** Search for wiki content → Search for blog content → Filter by type
- [ ] **AI Chat:** Ask question about wiki content → Verify citations → Multi-turn conversation
- [ ] **Drive:** Upload file to wiki page → Download → Delete
- [ ] **Wall:** Verify activities appear after wiki/blog CRUD → Filter by type → Content preview shows
- [ ] **My Content:** Verify own pages/blogs appear → Favorites tab works
- [ ] **Edit Lock:** Open edit page → Verify lock acquired → Open same page in incognito → Verify warning
- [ ] **Notifications:** Comment on watched page → Verify notification appears → @mention → Verify notification

---

## Dependency Map

```
Track A (Elasticsearch)     ──── independent ────
Track B (Wiki/Comments)     ──── independent ────
Track C (Wall)              ──── depends on B2 (comment service for COMMENTED activities) ────
Track D (Drive/AI Chat)     ──── independent ────
Track E (Notifications)     ──── depends on B2 (comment service to wire notifications) ────

Within tracks:
A: A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 (sequential)
B: B1 first (migration), then B2 → B3 → B4 (B2-B4 can partially parallel after B1)
C: C1 → C2 → C3 (sequential)
D: D1 → D2 (sequential), D3 independent
E: E1 (after B2) → E2 → E3 (sequential), E4-E5 independent
```

**Recommended execution order:**
1. Start B1 (migration) and A1-A2 (infra) and D1 (attachment service) simultaneously
2. After B1: start B2 (comments) and B3 (engagement) in parallel
3. After B2: start C1 (activities) and E1 (notifications) in parallel
4. After A2: continue A3-A7 sequentially
5. After D1: continue D2 (frontend) and D3 (AI chat verify)
6. After E1: start E2-E3 (edit lock)
7. Last: E4-E5 (polish) and A8 (K8s) and V1 (smoke test)
