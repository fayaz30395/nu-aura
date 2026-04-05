# Loop 12: Infrastructure & Fluence Module QA Report

**Date:** 2026-04-01
**Auditor:** Claude Code (Opus 4.6)
**Scope:** Kafka, Scheduled Jobs, Elasticsearch, WebSocket/STOMP, MinIO, Fluence Module, Health
Check

---

## 1. Kafka Configuration

**Status: PASS**

**Config Location:** `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaConfig.java`
**Topics Constants:** `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaTopics.java`

### Topics Verified (6 topics + 6 DLT topics = 12 total)

| Topic                        | Partitions | Retention | DLT Topic                        | DLT Retention |
|------------------------------|------------|-----------|----------------------------------|---------------|
| `nu-aura.approvals`          | 3          | 24h       | `nu-aura.approvals.dlt`          | 7 days        |
| `nu-aura.notifications`      | 5          | 24h       | `nu-aura.notifications.dlt`      | 7 days        |
| `nu-aura.audit`              | 10         | 30 days   | `nu-aura.audit.dlt`              | 7 days        |
| `nu-aura.employee-lifecycle` | 2          | 24h       | `nu-aura.employee-lifecycle.dlt` | 7 days        |
| `nu-aura.fluence-content`    | 3          | 24h       | `nu-aura.fluence-content.dlt`    | 7 days        |
| `nu-aura.payroll-processing` | 2          | 24h       | `nu-aura.payroll-processing.dlt` | 7 days        |

**Note:** Documentation says 5 topics, but codebase has 6 (includes `nu-aura.payroll-processing`
added later). Update CLAUDE.md docs to reflect 6 topics.

### Consumers Verified (7 consumers)

| Consumer                  | Container Factory                              | Group ID                           |
|---------------------------|------------------------------------------------|------------------------------------|
| ApprovalEventConsumer     | approvalEventListenerContainerFactory          | nu-aura-approvals-service          |
| NotificationEventConsumer | notificationEventListenerContainerFactory      | nu-aura-notifications-service      |
| AuditEventConsumer        | auditEventListenerContainerFactory             | nu-aura-audit-service              |
| EmployeeLifecycleConsumer | employeeLifecycleEventListenerContainerFactory | nu-aura-employee-lifecycle-service |
| FluenceSearchConsumer     | fluenceContentEventListenerContainerFactory    | nu-aura-fluence-search-service     |
| PayrollProcessingConsumer | payrollProcessingEventListenerContainerFactory | nu-aura-payroll-processing-service |
| DeadLetterHandler         | dltListenerContainerFactory                    | nu-aura-dlt-handler                |

### DLT Handling

- **FailedKafkaEvent entity:** EXISTS at `domain/kafka/FailedKafkaEvent.java`
- **FailedKafkaEventRepository:** EXISTS at `infrastructure/kafka/repository/`
- **DeadLetterHandler:** COMPREHENSIVE implementation with:
  - Persist-to-DB (idempotent via topic/partition/offset lookup)
  - Micrometer counter per topic (`kafka.dlt.messages.total{topic="..."}`)
  - Replay API (`replayFailedEvent`) with poison-pill guard (max 3 replays)
  - Ignore API (`ignoreFailedEvent`) for known bad events
  - Pre-registered counters for 5 known DLT topics
- **DeadLetterPublishingRecoverer:** Configured with exponential backoff (1s, 5s, 30s cap, 36s max
  elapsed)

### Producer Config

- Idempotent producer enabled (`ENABLE_IDEMPOTENCE_CONFIG=true`)
- Snappy compression
- `acks=all`
- 3 retries

**Finding INF-001 (Low/Doc):** Kafka topics documentation in CLAUDE.md says "5 topics + 5 DLT
topics" but codebase has 6 topics + 6 DLT topics (includes `nu-aura.payroll-processing`). Also,
DeadLetterHandler only pre-registers metrics for 5 DLT topics (missing `PAYROLL_PROCESSING_DLT`).

---

## 2. Scheduled Jobs

**Status: PASS (with note)**

**ShedLock Config:** `backend/src/main/java/com/hrms/common/config/ShedLockConfig.java`

- Uses `JdbcTemplateLockProvider` with `usingDbTime()`
- Default max lock: 30 minutes
- `@EnableSchedulerLock` active

### All Scheduled Jobs (23 found)

| #  | Lock Name                    | Schedule                              | Location                     |
|----|------------------------------|---------------------------------------|------------------------------|
| 1  | executeScheduledReports      | `0 * * * * *` (every minute)          | ScheduledReportExecutionJob  |
| 2  | webhookProcessRetries        | fixedRate=60000 (1 min)               | WebhookDeliveryService       |
| 3  | processPendingPunches        | fixedDelay=120000 (2 min)             | BiometricIntegrationService  |
| 4  | processContractLifecycle     | `0 30 2 * * *` UTC (2:30 AM)          | ContractLifecycleScheduler   |
| 5  | sendBirthdayEmails           | `0 0 9 * * *` (9 AM)                  | EmailSchedulerService        |
| 6  | sendAnniversaryEmails        | `0 0 9 * * *` (9 AM)                  | EmailSchedulerService        |
| 7  | retryFailedEmails            | `0 0 * * * *` (hourly)                | EmailSchedulerService        |
| 8  | sendScheduledEmails          | `0 */15 * * * *` (every 15 min)       | EmailSchedulerService        |
| 9  | sendBirthdayNotifications    | `0 0 8 * * *` (8 AM)                  | ScheduledNotificationService |
| 10 | sendAnniversaryNotifications | `0 30 8 * * *` (8:30 AM)              | ScheduledNotificationService |
| 11 | sendAttendanceReminders      | `0 0 10 * * MON-FRI` (10 AM weekdays) | ScheduledNotificationService |
| 12 | sendCheckoutReminders        | `0 0 17 * * MON-FRI` (5 PM weekdays)  | ScheduledNotificationService |
| 13 | autoRegularizeAttendance     | `0 30 19 * * *` UTC (1 AM IST)        | AutoRegularizationScheduler  |
| 14 | autoApproveCompOff           | `0 0 20 * * *` UTC (1:30 AM IST)      | AutoRegularizationScheduler  |
| 15 | syncApplicationCounts        | `0 0 */6 * * *` (every 6 hours)       | JobBoardIntegrationService   |
| 16 | expireOldPostings            | `0 0 2 * * *` (2 AM)                  | JobBoardIntegrationService   |
| 17 | accrueMonthlyLeave           | `0 0 2 1 * *` UTC (1st of month 2 AM) | LeaveAccrualScheduler        |
| 18 | tenantCacheRefresh           | fixedRate (configured)                | TenantFilter                 |
| 19 | workflowProcessEscalations   | `0 15 * * * *` (hourly at :15)        | WorkflowEscalationScheduler  |
| 20 | approvalProcessEscalations   | fixedRate=900000 (15 min)             | ApprovalEscalationJob        |
| 21 | orphanFileCleanup            | `0 0 2 * * SUN` UTC (Sundays 2 AM)    | OrphanFileCleanupScheduler   |
| 22 | checkRedisHealth             | fixedRate=30000 (30 sec)              | RateLimitingFilter           |
| 23 | rateLimitBucketCleanup       | fixedRate (configured)                | RateLimitingFilter           |

### ShedLock Verification

- All 23 `@Scheduled` methods have matching `@SchedulerLock` annotations
- **No duplicate lock names** detected
- All locks specify both `lockAtLeastFor` and `lockAtMostFor`

**Finding INF-002 (Low/Doc):** Documentation claims 25 scheduled jobs but only 23 were found. Update
CLAUDE.md to reflect 23.

---

## 3. Elasticsearch Integration

**Status: PASS**

**Config:** `backend/src/main/java/com/hrms/common/config/ElasticsearchConfig.java`

- Conditional on `app.elasticsearch.enabled=true` (safe for envs without ES)
- Repository scanning: `com.hrms.infrastructure.search.repository`

### Index Mapping

**Document:** `infrastructure/search/document/FluenceDocument.java`

- Index: `fluence-documents`
- Shards: 1, Replicas: 0
- Fields: tenantId (Keyword), contentType (Keyword), contentId (Keyword), title (Text), excerpt (
  Text), bodyText (Text), slug (Keyword), status (Keyword), visibility (Keyword),
  authorId/authorName, tags (Keyword list), spaceId/spaceName, category, viewCount, likeCount,
  createdAt/updatedAt/publishedAt (Date epoch_millis), deleted (Boolean)
- Composite ID via `buildId(contentType, contentId)` for cross-type uniqueness

### Search Service

**File:** `infrastructure/search/service/FluenceSearchService.java`

- Multi-field boosted search: `title^3`, `excerpt^2`, `bodyText^1`
- `TextQueryType.BestFields` with `fuzziness=AUTO`
- Mandatory tenant isolation via bool filter on `tenantId`
- Mandatory `deleted=false` filter
- Optional `contentType` and `visibility` filters
- Paginated results

### Search Repository

**File:** `infrastructure/search/repository/FluenceDocumentRepository.java` -- EXISTS

**Finding INF-003 (Low):** ES replicas set to 0 in `@Setting(shards = 1, replicas = 0)`. Acceptable
for dev, but should be at least 1 for production. Consider externalizing via config.

---

## 4. WebSocket / STOMP

**Status: PASS**

**Config:** `backend/src/main/java/com/hrms/config/WebSocketConfig.java`

### Configuration Verified

| Setting            | Value                                       | Status                          |
|--------------------|---------------------------------------------|---------------------------------|
| STOMP Endpoint     | `/ws`                                       | REGISTERED with SockJS fallback |
| Allowed Origins    | Configurable via `app.cors.allowed-origins` | No wildcard `*`                 |
| Broker Prefixes    | `/topic` (broadcast), `/queue` (user)       | Correct                         |
| App Prefix         | `/app`                                      | Correct                         |
| User Prefix        | `/user`                                     | Correct                         |
| Heartbeat          | 10s server/client                           | Configured                      |
| Message Size Limit | 64 KB                                       | Abuse prevention                |
| Send Buffer        | 512 KB                                      | Configured                      |
| Send Timeout       | 20s                                         | Configured                      |

### Supporting Components

- `WebSocketSecurityConfig` -- EXISTS at `common/websocket/`
- `RedisWebSocketRelay` -- EXISTS at `infrastructure/websocket/` (cross-pod fan-out via Redis
  Pub/Sub)
- `RedisWebSocketSubscriber` -- EXISTS
- `WebSocketRedisConfig` -- EXISTS
- `WebSocketNotificationService` -- EXISTS (both domain and application layer)
- `WebSocketNotificationController` -- EXISTS

**No findings.** WebSocket stack is well-configured with security, cross-pod relay, and proper
transport limits.

---

## 5. MinIO File Storage

**Status: PASS**

**Config:** `backend/src/main/java/com/hrms/common/config/MinioConfig.java`

- Conditional on `app.storage.provider=minio` (matchIfMissing=true for backward compat)
- Configurable endpoint, access-key, secret-key via properties

### MinioStorageProvider

**File:** `backend/src/main/java/com/hrms/application/document/service/MinioStorageProvider.java`

| Operation          | Implemented | Notes                                            |
|--------------------|-------------|--------------------------------------------------|
| upload             | YES         | `putObject` with contentType + user metadata     |
| getDownloadUrl     | YES         | Presigned GET URL with configurable expiry hours |
| download           | YES         | `getObject` returns InputStream                  |
| delete             | YES         | `removeObject`                                   |
| exists             | YES         | `statObject`                                     |
| copy               | YES         | `copyObject`                                     |
| ensureStorageReady | YES         | Auto-creates bucket if missing                   |

- Implements `StorageProvider` interface (strategy pattern for multi-provider support)
- All operations have proper error handling + logging

**No findings.** MinIO integration is complete with all CRUD + presigned URL operations.

---

## 6. Fluence Module Frontend Routes

**Status: PASS**

### Routes Verified

| Route                        | File                                              | Status |
|------------------------------|---------------------------------------------------|--------|
| `/fluence`                   | `frontend/app/fluence/page.tsx`                   | EXISTS |
| `/fluence/wiki`              | `frontend/app/fluence/wiki/page.tsx`              | EXISTS |
| `/fluence/wiki/new`          | `frontend/app/fluence/wiki/new/page.tsx`          | EXISTS |
| `/fluence/wiki/[slug]`       | `frontend/app/fluence/wiki/[slug]/page.tsx`       | EXISTS |
| `/fluence/wiki/[slug]/edit`  | `frontend/app/fluence/wiki/[slug]/edit/page.tsx`  | EXISTS |
| `/fluence/blogs`             | `frontend/app/fluence/blogs/page.tsx`             | EXISTS |
| `/fluence/blogs/new`         | `frontend/app/fluence/blogs/new/page.tsx`         | EXISTS |
| `/fluence/blogs/[slug]`      | `frontend/app/fluence/blogs/[slug]/page.tsx`      | EXISTS |
| `/fluence/blogs/[slug]/edit` | `frontend/app/fluence/blogs/[slug]/edit/page.tsx` | EXISTS |
| `/fluence/search`            | `frontend/app/fluence/search/page.tsx`            | EXISTS |
| `/fluence/my-content`        | `frontend/app/fluence/my-content/page.tsx`        | EXISTS |
| `/fluence/wall`              | `frontend/app/fluence/wall/page.tsx`              | EXISTS |
| `/fluence/dashboard`         | `frontend/app/fluence/dashboard/page.tsx`         | EXISTS |
| `/fluence/templates`         | `frontend/app/fluence/templates/page.tsx`         | EXISTS |
| `/fluence/templates/new`     | `frontend/app/fluence/templates/new/page.tsx`     | EXISTS |
| `/fluence/templates/[id]`    | `frontend/app/fluence/templates/[id]/page.tsx`    | EXISTS |
| `/fluence/drive`             | `frontend/app/fluence/drive/page.tsx`             | EXISTS |

**Total: 17 Fluence frontend routes** -- all present and accounted for.

---

## 7. Fluence Backend Controllers + RBAC

**Status: PASS**

### Controllers (14 total in `api/knowledge/controller/`)

| Controller                  | @RequiresPermission Count | Endpoint Methods | Coverage |
|-----------------------------|---------------------------|------------------|----------|
| BlogPostController          | 13                        | 13               | 100%     |
| BlogCategoryController      | 6                         | 6                | 100%     |
| WikiPageController          | 10                        | 10               | 100%     |
| WikiSpaceController         | 7                         | 7                | 100%     |
| TemplateController          | 11                        | 11               | 100%     |
| ContentEngagementController | 12                        | 12               | 100%     |
| FluenceActivityController   | 2                         | 2                | 100%     |
| FluenceAttachmentController | 5                         | 5                | 100%     |
| FluenceChatController       | 1                         | 1                | 100%     |
| FluenceCommentController    | 5                         | 5                | 100%     |
| FluenceEditLockController   | 4                         | 4                | 100%     |
| FluenceSearchController     | 1                         | 1                | 100%     |
| KnowledgeSearchController   | 3                         | 3                | 100%     |
| LinkedinPostController      | 2                         | 2                | 100%     |

**All 82 endpoint methods have @RequiresPermission annotations.** RBAC coverage is 100%.

---

## 8. API Health Check

**Status: PASS**

**Endpoint:** `GET http://localhost:8080/actuator/health`
**Overall Status:** `UP`

### Component Statuses

| Component      | Status | Details                                                                         |
|----------------|--------|---------------------------------------------------------------------------------|
| application    | UP     | Uptime: 15m 49s, Heap: 393.7 MB / 3.56 GB (10.8%), Processors: 10, Profile: dev |
| database       | UP     | PostgreSQL, response time: 397ms (warning: high)                                |
| db             | UP     | PostgreSQL, validation: SELECT 1                                                |
| diskSpace      | UP     | 131 GB free / 494 GB total                                                      |
| livenessState  | UP     | --                                                                              |
| ping           | UP     | --                                                                              |
| readinessState | UP     | --                                                                              |
| redis          | UP     | Version 8.6.1                                                                   |
| ssl            | UP     | No invalid chains                                                               |
| webhook        | UP     | 0 active webhooks, 0 pending, 100% success rate                                 |

**Health groups:** liveness, readiness (K8s probes ready)

**Finding INF-004 (Medium):** Database response time is 397ms with warning "High response time
detected". This is expected for Neon cloud dev database (remote PG) but should be monitored.
Connection pooling settings may need tuning if this impacts API latency.

**Finding INF-005 (Info):** Kafka and Elasticsearch are not reported in health components. Kafka has
`fatalIfBrokerNotAvailable=false` (graceful degradation), and Elasticsearch is conditional on
`app.elasticsearch.enabled=true`. Both are likely not running in local dev. This is acceptable
design -- services start without these dependencies.

---

## Summary

| Area                    | Status | Findings                                                                 |
|-------------------------|--------|--------------------------------------------------------------------------|
| Kafka Configuration     | PASS   | 1 Low (doc: 6 topics not 5; missing payroll DLT metric pre-registration) |
| Scheduled Jobs          | PASS   | 1 Low (doc: 23 jobs found, not 25)                                       |
| Elasticsearch           | PASS   | 1 Low (replicas=0, fine for dev)                                         |
| WebSocket/STOMP         | PASS   | None                                                                     |
| MinIO File Storage      | PASS   | None                                                                     |
| Fluence Frontend Routes | PASS   | None (17 routes present)                                                 |
| Fluence Backend RBAC    | PASS   | None (14 controllers, 82 endpoints, 100% @RequiresPermission)            |
| API Health Check        | PASS   | 1 Medium (DB latency 397ms), 1 Info (Kafka/ES not in health)             |

### Findings Summary

| ID      | Severity | Category      | Description                                                                                                                                                                               |
|---------|----------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| INF-001 | Low      | Documentation | Kafka topics count in CLAUDE.md says 5 but codebase has 6 (payroll-processing added). DeadLetterHandler.registerMetrics() pre-registers 5 DLT counters but misses PAYROLL_PROCESSING_DLT. |
| INF-002 | Low      | Documentation | CLAUDE.md says 25 scheduled jobs but only 23 found in codebase.                                                                                                                           |
| INF-003 | Low      | Config        | Elasticsearch replicas=0 in FluenceDocument @Setting. Acceptable for dev, needs >=1 for production.                                                                                       |
| INF-004 | Medium   | Performance   | Database health check response time 397ms (Neon cloud). Monitor and tune connection pool if impacting API.                                                                                |
| INF-005 | Info     | Architecture  | Kafka and Elasticsearch absent from /actuator/health. By design (graceful degradation) but consider adding conditional health indicators for production observability.                    |
