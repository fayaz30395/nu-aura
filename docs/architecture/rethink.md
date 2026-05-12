# NU-AURA Platform — Architecture Improvements & Missing Features

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Architecture Improvements

### ARCH-1: External Message Broker for WebSocket (Priority: High)

**Current**: SimpleMessageBroker (in-memory) for WebSocket/STOMP. Only works with single pod.

**Problem**: HPA scales to 2-10 pods. Users on different pods can't receive real-time messages from
each other.

**Proposed Solution**:

- Option A: Redis Pub/Sub as STOMP relay (simplest, aligns with existing Redis)
- Option B: RabbitMQ with STOMP plugin (more feature-rich, additional infrastructure)
- Option C: Kafka-backed WebSocket adapter (reuses existing Kafka, but higher latency)

**Recommendation**: Option A (Redis Pub/Sub) — minimal infrastructure change, sub-millisecond
latency.

### ARCH-2: API Gateway / BFF Pattern (Priority: Medium)

**Current**: Next.js middleware handles auth checks at edge, then proxies to Spring Boot directly.

**Problem**: No centralized API gateway for cross-cutting concerns (rate limiting, logging, circuit
breaking, API versioning).

**Proposed Solution**:

- Add Spring Cloud Gateway or Kong as API gateway in front of backend
- Move rate limiting, CORS, and request logging to gateway
- Enable API versioning (v1, v2) at gateway level
- Add circuit breaker (Resilience4j) for external service calls

**Recommendation**: Defer until microservices split is needed. Current monolith handles all concerns
internally.

### ARCH-3: Read Replicas for Analytics (Priority: Medium)

**Current**: All queries (OLTP + analytics) hit the same PostgreSQL instance.

**Problem**: Heavy analytics queries (org health, scheduled reports, dashboard aggregations) can
degrade OLTP performance during peak hours.

**Proposed Solution**:

- Add read replica for analytics queries
- Route read-only `@Transactional(readOnly = true)` queries to replica
- Spring Boot's `AbstractRoutingDataSource` can route based on transaction type

### ARCH-4: Event Sourcing for Audit Trail (Priority: Low)

**Current**: Audit events published to Kafka and consumed into audit table. But the audit table is
append-only log, not a true event store.

**Problem**: Can't reconstruct entity state at a point in time. Can't replay events for data
recovery.

**Proposed Solution**:

- Implement event sourcing for critical entities (Employee, Leave, Payroll)
- Store domain events in event store, project to read models
- Enable temporal queries ("what was the employee's salary on March 1?")

**Recommendation**: Low priority. Current audit trail sufficient for compliance.

### ARCH-5: Feature Flags Infrastructure (Priority: Medium)

**Current**: `featureflag` module exists but appears to be stub-level.

**Problem**: No way to gradually roll out features, A/B test UI changes, or kill-switch problematic
features in production.

**Proposed Solution**:

- Implement tenant-level feature flags (database-backed)
- Frontend `useFeatureFlag()` hook for conditional rendering
- Backend `@ConditionalOnFeature` annotation for endpoint gating
- Admin UI for flag management

### ARCH-6: Database Connection Pooling with PgBouncer (Priority: Medium)

**Current**: Each backend pod has its own HikariCP pool (max 20 connections). With 10 pods, that's
200 connections to PostgreSQL.

**Problem**: Neon/Cloud SQL may have connection limits. 200 concurrent connections is expensive.

**Proposed Solution**:

- Deploy PgBouncer as sidecar or standalone service
- Use transaction-level pooling to multiplex connections
- Reduce HikariCP pool to 5 per pod (50 total → PgBouncer manages actual DB connections)

---

## Missing Features

### FEAT-1: SSO SAML/OIDC (Priority: High)

**Impact**: Enterprise customers require SAML/OIDC SSO with their identity provider (Okta, Azure AD,
OneLogin).

**Current**: Only Google OAuth supported. No SAML/OIDC.

**Implementation**:

- Add Spring Security SAML2 support
- Per-tenant IdP configuration (SAML metadata URL, OIDC discovery URL)
- Admin UI for tenant SSO configuration
- Fallback to email/password when SSO unavailable

### FEAT-2: Multi-Language (i18n) (Priority: Medium)

**Impact**: Platform locked to English. International tenants need localization.

**Implementation**:

- Frontend: next-intl or react-i18next
- Extract all user-facing strings to locale files
- Backend: MessageSource for API error messages
- Date/number formatting based on tenant locale
- Admin UI for language selection

### FEAT-3: Mobile App (Priority: Medium)

**Impact**: Mobile-responsive web works but native app provides better UX for attendance (GPS), push
notifications, biometric auth.

**Current**: Mobile API endpoints exist (`/api/v1/mobile/*`), mobile-responsive frontend built.

**Implementation**:

- React Native (shares TypeScript/React skills)
- Reuse existing mobile API endpoints
- Push notifications via Firebase Cloud Messaging
- Biometric auth for clock-in

### FEAT-4: Advanced Reporting / Report Builder (Priority: Medium)

**Impact**: HR teams need custom reports without developer involvement.

**Current**: Pre-built reports (payroll, utilization, scheduled) exist. No custom report builder.

**Implementation**:

- Drag-and-drop report builder UI
- Define data sources (entities/views)
- Column selection, filtering, grouping, sorting
- Chart visualization (bar, line, pie)
- Schedule and email reports
- Export to CSV, Excel, PDF

### FEAT-5: Workflow Builder (Priority: Medium)

**Impact**: Current approval workflows are admin-configured but not visually designed.

**Implementation**:

- Visual workflow designer (drag-and-drop nodes)
- Conditional branching (if amount > 10K, add finance approval)
- Parallel approval steps
- Automatic escalation timers (already have `WorkflowEscalationScheduler`)
- Template library for common workflows

### FEAT-6: Integration Hub (Priority: Medium)

**Impact**: Customers need to connect NU-AURA with their existing tools.

**Current**: Job boards, Google Calendar, Gmail, Twilio integrated. No generic integration
framework.

**Implementation**:

- Webhook event catalog (employee.created, leave.approved, etc.)
- REST API with API key authentication for external systems
- Pre-built connectors: Slack, Microsoft Teams, QuickBooks, Tally, SAP
- Zapier/n8n integration via webhook endpoints

### FEAT-7: Geo-fencing for Attendance (Priority: Low)

**Impact**: Mobile attendance currently records GPS but doesn't validate against office location
boundaries.

**Implementation**:

- Define geo-fence radius per office location
- Validate GPS coordinates on clock-in against allowed radius
- Alert for out-of-bounds clock-ins
- Admin override capability

### FEAT-8: Org-Level Analytics Dashboard (Priority: Low)

**Impact**: Executive dashboards exist but lack deep organizational analytics.

**Implementation**:

- Attrition prediction (ML model)
- Diversity & inclusion metrics
- Compensation benchmarking
- Skills inventory heatmap
- Succession planning visualization

---

## Scalability Improvements

### SCALE-1: Database Sharding Strategy

**Current**: Single database, shared schema. Works for ~100 tenants, ~50K employees.
**When needed**: 500+ tenants or 500K+ employees.
**Strategy**: Shard by tenant_id (consistent hashing). Use Citus or manual shard routing.

### SCALE-2: File Storage CDN

**Current**: MinIO serves files directly. No CDN.
**Fix**: Add CloudFront/Cloud CDN in front of MinIO for static assets and document downloads.

### SCALE-3: Search Infrastructure

**Current**: Database-level LIKE queries for search. No full-text search engine.
**When needed**: When knowledge base grows to 10K+ documents.
**Strategy**: Add Elasticsearch/OpenSearch for full-text search. Keep PostgreSQL as source of truth.

### SCALE-4: Background Job Orchestration

**Current**: @Scheduled with fixed rates. No job queue, no retry, no monitoring.
**Fix**: Replace with Spring Batch or Temporal for complex job orchestration with retry, monitoring,
and distributed execution.

---

## Technical Debt

### DEBT-1: MapStruct Not Used Consistently

MapStruct declared as dependency but manual DTO mapping found in most services. Either adopt
MapStruct fully or remove the dependency.

### DEBT-2: Inconsistent Error Handling in Frontend

Some pages show `EmptyState` on error, others show toast notifications, some silently fail.
Standardize error handling pattern.

### DEBT-3: Legacy Liquibase Files

`backend/src/main/resources/db/changelog/` contains legacy Liquibase files that are not used. Should
be removed to avoid confusion.

### DEBT-4: Unused Mobile API Controllers

5 mobile controllers exist but no native mobile app consumes them. These are tested via E2E but may
have diverged from actual mobile app requirements.

### DEBT-5: Test Coverage Gaps

JaCoCo target is 80% but actual coverage may be lower for newer modules (wellness, recognition,
knowledge). Need to verify and add tests.
