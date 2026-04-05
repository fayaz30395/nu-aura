# Integration Framework — Design Specification

**Date:** 2026-03-21
**Status:** Approved (Rev 2 — post-review fixes)
**Author:** Architecture Team
**Scope:** Generic Connector Framework, DocuSign E-Signature Integration, Admin Integration Hub
**Approach:** Hybrid (Approach C) — Thin framework + parallel connector implementation

---

## 1. Problem Statement

The KEKA gap analysis identified third-party integrations as a key weakness (Score: 5/10). NU-AURA
has strong internal integration infrastructure (Kafka, webhooks, Slack, Twilio, payment adapters)
but lacks:

1. **A generic connector abstraction** — Each integration is hand-coded with no shared lifecycle,
   config, or health monitoring pattern
2. **DocuSign e-signatures** — No e-signature provider for offer letters, contracts, policy
   acknowledgements, onboarding docs
3. **A unified admin UI** — Integration management is scattered across individual config pages with
   no central hub

### What Already Exists (Reuse, Don't Rebuild)

- **Webhook system:** 31 event types, HMAC-SHA256 signatures, retry with exponential backoff,
  circuit breaker, delivery history — `WebhookDeliveryService`, `WebhookController`
- **Slack integration:** Fully working webhook + bot API, Block Kit rich messages, 7+ HRMS
  templates — `SlackNotificationService`
- **Twilio SMS:** Production-ready with mock mode — `TwilioSmsServiceImpl`
- **Payment gateway adapter pattern:** `PaymentGatewayAdapter` interface with Stripe/Razorpay stubs
- **Multi-channel notification framework:** 8 channels (email, SMS, push, in-app, Slack, Teams,
  WhatsApp, webhook), per-tenant config, templates — `NotificationChannelConfig`,
  `NotificationTemplate`
- **API key management:** Scoped keys, rotation, usage tracking — `ApiKeyService`,
  `ApiKeyController`
- **Kafka event publishing:** 5 topics, DLT handler, type-safe publisher — `EventPublisher`
- **Frontend integration catalog:** `/app/integrations/` showcasing 14+ integrations;
  `/admin/integrations/` for SMS/payment config
- **Encrypted config storage:** `NotificationChannelConfig.configJson` with field-level encryption

---

## 2. Architecture Decisions

| Decision                       | Choice                                                              | Rationale                                                                            |
|--------------------------------|---------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| Framework depth                | Thin interface (6 methods) + registry + config table                | Avoids over-engineering; DocuSign validates the pattern immediately                  |
| Config storage                 | New `integration_connector_configs` table with encrypted JSON       | Separates connector config from notification-specific `notification_channel_configs` |
| Event routing                  | Kafka consumer → `IntegrationEventRouter` → matching connectors     | Leverages existing Kafka infrastructure; connectors subscribe declaratively          |
| DocuSign auth                  | OAuth 2.0 JWT Grant (server-to-server)                              | No per-user interaction needed; works with backend-only flows                        |
| DocuSign status sync           | Inbound webhook callbacks (DocuSign Connect)                        | Real-time status updates without polling                                             |
| Teams connector                | DROPPED — user confirmed Slack-only                                 | Reduces scope, deepens DocuSign quality                                              |
| Admin UI                       | New Integration Hub at `/admin/integrations/`                       | Central management, generic card-based layout for any connector                      |
| Existing integration migration | Optional — Slack/Twilio CAN be wrapped in connector interface later | Low priority; they already work. Framework proves itself with DocuSign first         |

---

## 3. Connector Framework

### 3.1 `IntegrationConnector` Interface

```java
public interface IntegrationConnector {

    /** Unique connector identifier (e.g., "docusign", "slack", "twilio") */
    String getConnectorId();

    /** Connector type classification */
    ConnectorType getType();

    /** Declare what this connector can do */
    ConnectorCapabilities getCapabilities();

    /** Test provider connectivity and return health status */
    ConnectionTestResult testConnection(ConnectorConfig config);

    /** Apply/update configuration for this connector (called on save) */
    void configure(ConnectorConfig config);

    /** Handle an HRMS event that this connector is subscribed to */
    void handleEvent(IntegrationEvent event);

    /** Handle an inbound webhook callback from the external provider */
    WebhookCallbackResult handleWebhookCallback(String connectorId, Map<String, String> headers, String body);
}
```

### 3.2 Supporting Types

```java
public enum ConnectorType {
    NOTIFICATION,    // Slack, Teams, Email, SMS
    E_SIGNATURE,     // DocuSign, Adobe Sign
    PAYMENT,         // Stripe, Razorpay
    STORAGE,         // MinIO, Google Drive
    CALENDAR,        // Google Calendar, Outlook
    AUTH,            // Google OAuth, SAML
    ANALYTICS        // Future: BI tool connectors
}

public record ConnectorCapabilities(
    Set<String> supportedEvents,      // Which HRMS events this connector can handle
    boolean supportsWebhookCallback,  // Can receive inbound webhooks
    boolean supportsActionButtons,    // Can render approve/reject buttons
    boolean supportsBatchOperations,  // Can process multiple items at once
    String configSchemaJson           // JSON Schema for the connector's config fields
) {}

public record ConnectionTestResult(
    boolean success,
    String message,
    long latencyMs,
    Map<String, Object> diagnostics   // Provider-specific health info
) {}

public record ConnectorConfig(
    UUID tenantId,
    String connectorId,
    Map<String, Object> settings,     // Decrypted config fields
    Set<String> eventSubscriptions    // Which events trigger this connector
) {}

public record IntegrationEvent(
    String eventType,                 // e.g., "OFFER_CREATED", "LEAVE_APPROVED"
    UUID tenantId,
    UUID entityId,                    // The record that triggered the event
    String entityType,                // e.g., "OfferLetter", "LeaveRequest"
    Map<String, Object> metadata,     // Event-specific data
    Instant timestamp
) {}
```

### 3.3 Connector Registry

```java
@Component
public class ConnectorRegistry {
    private final Map<String, IntegrationConnector> connectors = new ConcurrentHashMap<>();

    @Autowired
    public ConnectorRegistry(List<IntegrationConnector> connectorBeans) {
        connectorBeans.forEach(c -> connectors.put(c.getConnectorId(), c));
        log.info("Registered {} integration connectors: {}",
            connectors.size(), connectors.keySet());
    }

    public Optional<IntegrationConnector> getConnector(String connectorId) {
        return Optional.ofNullable(connectors.get(connectorId));
    }

    public Collection<IntegrationConnector> getAllConnectors() {
        return Collections.unmodifiableCollection(connectors.values());
    }

    public Map<String, ConnectorCapabilities> getCapabilitiesMap() {
        return connectors.entrySet().stream()
            .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().getCapabilities()));
    }
}
```

### 3.4 Integration Event Router

**Design decision (CRIT-001):** The router is NOT a separate Kafka consumer. Adding a second
consumer group on existing topics would cause duplicate processing. Instead, the router is injected
as a service dependency into existing consumers (same pattern as `WebhookDeliveryService`).

```java
@Service
public class IntegrationEventRouter {
    private final ConnectorRegistry registry;
    private final IntegrationConnectorConfigService configService;
    private final IntegrationEventLogService eventLogService;

    /**
     * Called by existing Kafka consumers AFTER their own processing.
     * Example: EmployeeLifecycleConsumer.handleHired() calls this after its own logic.
     * NOT a @KafkaListener — avoids duplicate message processing.
     */
    @Async
    public void routeToConnectors(IntegrationEvent event) {
        List<IntegrationConnectorConfig> activeConfigs =
            configService.findActiveByEventSubscription(event.tenantId(), event.eventType());

        for (IntegrationConnectorConfig config : activeConfigs) {
            registry.getConnector(config.getConnectorId()).ifPresent(connector -> {
                long start = System.currentTimeMillis();
                try {
                    TenantContext.setCurrentTenant(event.tenantId());
                    connector.handleEvent(event);
                    eventLogService.logSuccess(event, config.getConnectorId(),
                        System.currentTimeMillis() - start);
                } catch (Exception e) {
                    log.error("Connector {} failed to handle event {}: {}",
                        config.getConnectorId(), event.eventType(), e.getMessage());
                    eventLogService.logFailure(event, config.getConnectorId(),
                        e.getMessage(), System.currentTimeMillis() - start);
                    // Publish to DLT for manual recovery
                    publishToDlt(event, config.getConnectorId(), e);
                } finally {
                    TenantContext.clear();
                }
            });
        }
    }

    private void publishToDlt(IntegrationEvent event, String connectorId, Exception e) {
        // Uses existing DLT infrastructure: nu-aura.integrations.dlt topic
        // Failed events stored in FailedKafkaEvent table for manual recovery
        // Follows existing DLT handler pattern from KafkaTopics.java
    }
}
```

**Existing consumer integration points** (add `integrationEventRouter.routeToConnectors()` call):

- `EmployeeLifecycleConsumer` — after HIRED, PROMOTED, TRANSFERRED, OFFBOARDED handling
- `ApprovalConsumer` — after APPROVAL_APPROVED, APPROVAL_REJECTED handling
- `NotificationConsumer` — after notification dispatch

**New Kafka topic:** `nu-aura.integrations.dlt` — Dead Letter Topic for failed connector events.
Follows existing DLT pattern with `FailedKafkaEvent` table storage.

---

## 4. Data Model

### 4.1 New Table: `integration_connector_configs`

```sql
CREATE TABLE integration_connector_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    connector_id        VARCHAR(50) NOT NULL,       -- "docusign", "slack", "stripe"
    display_name        VARCHAR(255) NOT NULL,       -- User-facing label
    config_json         TEXT NOT NULL,                -- Encrypted JSON (provider credentials)
    status              VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',  -- ACTIVE, INACTIVE, ERROR
    event_subscriptions TEXT,                         -- JSON array of subscribed event types
    last_health_check_at TIMESTAMPTZ,
    last_error_message  TEXT,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_icc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT uk_connector_per_tenant UNIQUE (tenant_id, connector_id)
);

CREATE INDEX idx_icc_tenant_status ON integration_connector_configs(tenant_id, status);
CREATE INDEX idx_icc_connector_active ON integration_connector_configs(connector_id, status) WHERE status = 'ACTIVE';

ALTER TABLE integration_connector_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_integration_connector_configs ON integration_connector_configs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

### 4.2 New Table: `integration_event_log`

```sql
CREATE TABLE integration_event_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    connector_id    VARCHAR(50) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    status          VARCHAR(20) NOT NULL,  -- SUCCESS, FAILED, SKIPPED
    error_message   TEXT,
    duration_ms     INT,
    metadata_json   TEXT,                  -- Event details (truncated for storage)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_iel_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_iel_tenant_connector ON integration_event_log(tenant_id, connector_id, created_at DESC);
CREATE INDEX idx_iel_tenant_status ON integration_event_log(tenant_id, status, created_at DESC);

ALTER TABLE integration_event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_integration_event_log ON integration_event_log
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

### 4.3 New Tables: DocuSign-Specific

```sql
CREATE TABLE docusign_envelopes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    envelope_id         VARCHAR(100) NOT NULL,       -- DocuSign's envelope ID
    entity_type         VARCHAR(50) NOT NULL,         -- OFFER_LETTER, DOCUMENT, CONTRACT
    entity_id           UUID NOT NULL,                -- FK to the originating record
    status              VARCHAR(30) NOT NULL DEFAULT 'CREATED',
                        -- CREATED, SENT, DELIVERED, COMPLETED, DECLINED, VOIDED, ERROR
    recipients_json     TEXT,                          -- JSON array of recipients + signing status
    signed_document_url VARCHAR(500),                  -- MinIO URL after completion
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_de_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT uk_docusign_envelope UNIQUE (tenant_id, envelope_id)
);

CREATE INDEX idx_de_tenant_status ON docusign_envelopes(tenant_id, status);
CREATE INDEX idx_de_entity ON docusign_envelopes(tenant_id, entity_type, entity_id);

ALTER TABLE docusign_envelopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_docusign_envelopes ON docusign_envelopes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE TABLE docusign_template_mappings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL,
    document_type           VARCHAR(50) NOT NULL,         -- OFFER_LETTER, NDA, EMPLOYMENT_CONTRACT, etc.
    docusign_template_id    VARCHAR(100) NOT NULL,        -- DocuSign template ID
    description             TEXT,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_dtm_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT uk_template_mapping UNIQUE (tenant_id, document_type)
);

ALTER TABLE docusign_template_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_docusign_template_mappings ON docusign_template_mappings
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

## 5. DocuSign Connector

### 5.1 Authentication

OAuth 2.0 JWT Grant flow (server-to-server, no browser redirect needed):

1. On configure(): Validate RSA private key can sign a JWT
2. On each API call: Generate JWT → exchange for access token (cached, 1-hour expiry)
3. Token refresh handled transparently by `DocuSignAuthService`

Config fields (stored encrypted in `config_json`):

```json
{
  "integrationKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "accountId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "rsaPrivateKey": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "baseUrl": "https://demo.docusign.net",
  "connectWebhookUrl": "https://api.nuaura.com/api/v1/integrations/docusign/webhook"
}
```

### 5.2 Core Service: `DocuSignConnector`

```
@Component
public class DocuSignConnector implements IntegrationConnector {

    getConnectorId() → "docusign"
    getType() → E_SIGNATURE
    getCapabilities() → {
        supportedEvents: ["OFFER_CREATED", "DOCUMENT_CREATED", "EMPLOYEE_ONBOARDED"],
        supportsWebhookCallback: true,
        supportsActionButtons: false,
        supportsBatchOperations: true,
        configSchemaJson: <JSON Schema for DocuSign config fields>
    }

    testConnection(config):
        1. Generate JWT access token using RSA key
        2. Call GET /v2.1/accounts/{accountId}/users
        3. Return success with user count + API version

    configure(config):
        1. Validate all required fields present
        2. Test connection
        3. Register DocuSign Connect webhook (if not already registered)
        4. Store/update config

    handleEvent(event):
        switch event.eventType:
            "OFFER_CREATED":
                offerLetter = offerLetterRepository.findById(event.entityId)
                candidate = candidateRepository.findById(offerLetter.candidateId)
                templateId = templateMappingRepository.findByDocumentType("OFFER_LETTER")
                envelope = docuSignApiClient.createEnvelope(
                    templateId, candidate.email, candidate.name,
                    offerLetter.documentUrl, offerLetter.subject
                )
                docuSignEnvelopeRepository.save(envelope)

            "DOCUMENT_CREATED":
                document = documentRepository.findById(event.entityId)
                if !document.requiresSignature: return
                employee = employeeRepository.findById(document.employeeId)
                user = userRepository.findByEmployeeId(employee.id)
                templateId = templateMappingRepository.findByDocumentType(document.type)
                envelope = docuSignApiClient.createEnvelope(...)
                docuSignEnvelopeRepository.save(envelope)

            "EMPLOYEE_ONBOARDED":
                // Batch-send all onboarding documents that require signature
                docs = documentRepository.findOnboardingDocsRequiringSignature(event.entityId)
                for each doc: handleEvent(new IntegrationEvent("DOCUMENT_CREATED", doc.id, ...))

    handleWebhookCallback(headers, body):
        1. Verify HMAC signature using connector secret
        2. Parse DocuSign Connect XML/JSON payload
        3. Extract envelopeId + status + recipientStatuses
        4. Update docusign_envelopes record
        5. If status == COMPLETED:
            a. Download signed PDF from DocuSign
            b. Upload to MinIO
            c. Update signed_document_url
            d. Update originating entity status (offer → SIGNED, document → COMPLETED)
            e. Publish notification event to requester
        6. If status == DECLINED:
            a. Update originating entity status
            b. Notify requester with decline reason
        7. Return WebhookCallbackResult
}
```

### 5.3 DocuSign API Client

Wrapper around DocuSign REST API v2.1:

```
DocuSignApiClient:
    createEnvelope(templateId, recipientEmail, recipientName, documentUrl, subject) → EnvelopeResponse
    getEnvelopeStatus(envelopeId) → EnvelopeStatusResponse
    voidEnvelope(envelopeId, reason) → void
    downloadDocument(envelopeId, documentId) → byte[]
    listTemplates() → List<TemplateResponse>
    registerConnectWebhook(webhookUrl, events) → void
```

HTTP client: Use the existing Axios-equivalent (RestTemplate/WebClient) with:

- Token caching (1-hour expiry)
- Rate limiting (respect DocuSign's 1000 calls/hour)
- Circuit breaker (same pattern as `SlackNotificationService`)
- Request/response logging for debugging

### 5.4 Error Handling

| Scenario                   | Behavior                                                        |
|----------------------------|-----------------------------------------------------------------|
| DocuSign API down          | Circuit breaker opens after 5 failures; events queued for retry |
| Rate limit hit (429)       | Exponential backoff, retry up to 3x                             |
| Invalid template ID        | Mark envelope as ERROR, notify admin                            |
| Recipient email invalid    | Mark as ERROR with reason, notify admin                         |
| Webhook signature mismatch | Reject with 401, log suspicious activity                        |
| Signed doc download fails  | Retry 3x, then mark envelope as COMPLETED_NO_DOC and alert      |

---

## 6. API Endpoints

### Connector Framework

| Method | Path                                                           | Permission           | Description                               |
|--------|----------------------------------------------------------------|----------------------|-------------------------------------------|
| GET    | `/api/v1/integrations/connectors`                              | `INTEGRATION:READ`   | List all available connectors with status |
| GET    | `/api/v1/integrations/connectors/{connectorId}`                | `INTEGRATION:READ`   | Get connector details + capabilities      |
| PUT    | `/api/v1/integrations/connectors/{connectorId}/config`         | `INTEGRATION:MANAGE` | Save/update connector config              |
| POST   | `/api/v1/integrations/connectors/{connectorId}/test`           | `INTEGRATION:MANAGE` | Test connection                           |
| POST   | `/api/v1/integrations/connectors/{connectorId}/activate`       | `INTEGRATION:MANAGE` | Activate connector                        |
| POST   | `/api/v1/integrations/connectors/{connectorId}/deactivate`     | `INTEGRATION:MANAGE` | Deactivate connector                      |
| GET    | `/api/v1/integrations/events?connectorId=&status=&page=&size=` | `INTEGRATION:READ`   | Event log (paginated)                     |

### DocuSign-Specific

| Method | Path                                                                      | Permission                           | Description                        |
|--------|---------------------------------------------------------------------------|--------------------------------------|------------------------------------|
| POST   | `/api/v1/integrations/docusign/webhook`                                   | Public (HMAC-verified, see CRIT-002) | Inbound DocuSign Connect callbacks |
| GET    | `/api/v1/integrations/docusign/envelopes?entityType=&status=&page=&size=` | `INTEGRATION:READ`                   | List envelopes                     |
| GET    | `/api/v1/integrations/docusign/envelopes/{id}`                            | `INTEGRATION:READ`                   | Envelope details                   |
| POST   | `/api/v1/integrations/docusign/envelopes/{id}/void`                       | `INTEGRATION:MANAGE`                 | Void an envelope                   |
| POST   | `/api/v1/integrations/docusign/envelopes/{id}/resend`                     | `INTEGRATION:MANAGE`                 | Resend signing request             |
| GET    | `/api/v1/integrations/docusign/templates`                                 | `INTEGRATION:READ`                   | List DocuSign templates            |
| GET    | `/api/v1/integrations/docusign/template-mappings`                         | `INTEGRATION:READ`                   | List NU-AURA → DocuSign mappings   |
| PUT    | `/api/v1/integrations/docusign/template-mappings`                         | `INTEGRATION:MANAGE`                 | Create/update template mapping     |

### New Permissions

Add to `Permission.java`:

```java
INTEGRATION_READ("INTEGRATION:READ"),
INTEGRATION_MANAGE("INTEGRATION:MANAGE"),
```

Add to V60 seed data (or new migration): Grant `INTEGRATION:MANAGE` to SUPER_ADMIN, TENANT_ADMIN;
`INTEGRATION:READ` to HR_MANAGER.

---

## 7. Frontend: Admin Integration Hub

### 7.1 Route: `/admin/integrations/page.tsx`

**Layout:**

- Header with title "Integration Hub" + summary badges (X connected, Y available)
- Filter tabs: All | Notifications | E-Signatures | Payments | Storage
- Card grid showing all connectors

**Connector Card Component:**

```tsx
<ConnectorCard
  connectorId="docusign"
  name="DocuSign"
  description="Send documents for e-signature"
  type="E_SIGNATURE"
  icon={<DocuSignIcon />}
  status="ACTIVE"          // from API
  lastHealthCheck="2m ago"
  onConfigure={() => openConfigPanel("docusign")}
/>
```

**Config Panel (SlideOver):**

- React Hook Form + Zod for config fields
- Dynamic form generation from `configSchemaJson` (connector declares its own fields)
- "Test Connection" button with async status
- Event subscription multi-select
- Save → calls `PUT /api/v1/integrations/connectors/{id}/config`

**Activity Log Tab:**

- Table showing recent events: timestamp, event type, entity, status (success/failed/skipped),
  duration
- Filter by status
- React Query with `useIntegrationEvents(connectorId)` hook

### 7.2 New Frontend Files

| File                                                           | Responsibility                          |
|----------------------------------------------------------------|-----------------------------------------|
| `frontend/app/admin/integrations/page.tsx`                     | Integration Hub page (replace existing) |
| `frontend/components/integrations/ConnectorCard.tsx`           | Individual connector card               |
| `frontend/components/integrations/ConnectorConfigPanel.tsx`    | Config slide-over panel                 |
| `frontend/components/integrations/ConnectionTestButton.tsx`    | Test button with async state            |
| `frontend/components/integrations/EventSubscriptionPicker.tsx` | HRMS event multi-select                 |
| `frontend/components/integrations/IntegrationActivityLog.tsx`  | Event log table                         |
| `frontend/lib/services/connectorService.ts`                    | API client for connector endpoints      |
| `frontend/lib/hooks/queries/useConnectors.ts`                  | React Query hooks                       |
| `frontend/lib/types/connector.ts`                              | TypeScript types                        |

### 7.3 DocuSign Admin Section (within Integration Hub)

When DocuSign connector is configured, the config panel shows additional tabs:

- **Templates** — Map NU-AURA document types to DocuSign templates
- **Envelopes** — List all envelopes with status, filter by entity type and status
- **Settings** — DocuSign-specific config (sandbox vs production, webhook URL)

---

## 8. Migration Plan

### V65 — Integration Framework Schema

Single migration file:

1. `CREATE TABLE integration_connector_configs` with RLS
2. `CREATE TABLE integration_event_log` with RLS
3. `CREATE TABLE docusign_envelopes` with RLS
4. `CREATE TABLE docusign_template_mappings` with RLS
5. All indexes and constraints
6. Seed `INTEGRATION:READ` and `INTEGRATION:MANAGE` permissions
7. Grant permissions to SUPER_ADMIN, TENANT_ADMIN, HR_MANAGER roles

---

## 9. Testing Strategy

### Unit Tests

- `ConnectorRegistryTest`: Auto-discovery, lookup by ID, capabilities map
- `IntegrationEventRouterTest`: Event matching against subscriptions, tenant isolation, error
  isolation
- `DocuSignConnectorTest`: Envelope creation for each entity type, webhook callback handling (
  completed, declined, voided), template mapping lookup, error scenarios
- `DocuSignApiClientTest`: Token generation, API call retries, rate limiting, circuit breaker

### Integration Tests

- Full lifecycle: Configure DocuSign → create offer letter → verify envelope created → simulate
  webhook callback → verify signed PDF stored in MinIO → verify offer status updated
- Event routing: Publish Kafka event → verify correct connector receives it
- Health check: Configure connector → test connection → verify status updated

### Edge Cases

- DocuSign API unavailable during envelope creation (circuit breaker + queue)
- Webhook callback for unknown envelope ID (log + ignore)
- Duplicate webhook callbacks (idempotent processing via envelope_id)
- Connector config update while events are in-flight (graceful config reload)
- Tenant with no DocuSign config receives OFFER_CREATED event (skip silently)
- Template mapping missing for document type (error + notify admin, don't block document creation)

---

## 10. Performance Considerations

- **Event routing:** O(active_connectors × subscribed_events) per Kafka message. For 5 connectors
  with ~10 events each: negligible
- **DocuSign API calls:** Async with `@Async`. Rate limited to 1000/hour per tenant. Circuit breaker
  prevents cascading slowdowns
- **Event log table:** Will grow fast. Add retention policy: DELETE events older than 90 days via
  `@Scheduled` job
- **Config caching:** `integration_connector_configs` cached in Redis per tenant. Cache invalidated
  on config save
- **Webhook callback processing:** Async. DocuSign Connect retries on its own if our endpoint fails
  temporarily

---

## 11. Security Considerations

- **Config encryption:** All provider credentials stored in `config_json` are encrypted at rest
  using the existing field-level encryption pattern from `NotificationChannelConfig`
- **DocuSign webhook HMAC:** All inbound callbacks verified using HMAC-SHA256 before processing
- **No credentials in logs:** Config fields are masked in all log output
- **Admin-only access:** All connector config endpoints require `INTEGRATION:MANAGE` permission
- **Tenant isolation:** All tables have `tenant_id` + RLS policies. Event router sets
  `TenantContext` per event.
- **API key alternative:** External systems can use existing API keys with new `integration:*`
  scopes instead of JWT auth

---

## 12. Rollout Plan

1. **Phase 1 (V65 migration):** Schema + permission seeds. No behavior change.
2. **Phase 2 (Backend):** Connector framework, event router, DocuSign connector, webhook callback
   endpoint. Behind `enable_integration_hub` feature flag.
3. **Phase 3 (Frontend):** Admin Integration Hub UI, DocuSign config panel, envelope management,
   template mapping.
4. **Phase 4 (Go-live):** Enable feature flag for demo tenant → QA sweep → production rollout.

---

## 13. Review Fixes (Rev 2)

Issues identified by spec reviewer and resolved below.

### CRIT-001: Kafka Consumer Architecture (RESOLVED)

**Problem:** Original design had `IntegrationEventRouter` as a separate `@KafkaListener` on existing
topics, which would cause duplicate message processing.

**Resolution:** Router is now a `@Service` (not a `@KafkaListener`). Existing consumers call
`integrationEventRouter.routeToConnectors()` after their own processing. This follows the same
pattern as `WebhookDeliveryService`. See updated Section 3.4.

### CRIT-002: DocuSign Webhook Security (RESOLVED)

**Problem:** Webhook endpoint lacked tenant isolation and SecurityConfig registration.

**Resolution:**

1. **SecurityConfig addition:** Add to `SecurityConfig.java`:

```java
.requestMatchers("/api/v1/integrations/docusign/webhook").permitAll()
```

And add to CSRF exclusions (same pattern as existing external webhook endpoints).

2. **Tenant resolution:** Webhook handler extracts `envelope_id` from the DocuSign payload, queries
   `docusign_envelopes` table to get `tenant_id`, then sets `TenantContext` before processing. This
   prevents cross-tenant data exposure:

```java
@PostMapping("/api/v1/integrations/docusign/webhook")
public ResponseEntity<Void> handleDocuSignCallback(@RequestBody String payload,
        @RequestHeader Map<String, String> headers) {
    DocuSignEvent event = parsePayload(payload);
    // Resolve tenant from our envelope record
    DocuSignEnvelope envelope = envelopeRepository
        .findByEnvelopeIdWithoutTenantFilter(event.getEnvelopeId())
        .orElseThrow(() -> new EntityNotFoundException("Unknown envelope"));
    // Verify HMAC using tenant's DocuSign config
    ConnectorConfig config = configService.getConfig(envelope.getTenantId(), "docusign");
    verifyHmacSignature(headers, payload, config.getHmacSecret());
    // Process with correct tenant context
    TenantContext.setCurrentTenant(envelope.getTenantId());
    try {
        processEnvelopeStatus(envelope, event);
    } finally {
        TenantContext.clear();
    }
    return ResponseEntity.ok().build();
}
```

3. **DocuSign signature format:** DocuSign Connect uses HMAC-SHA256 with the payload body. Header:
   `X-DocuSign-Signature-1`. Verification:

```java
private void verifyHmacSignature(Map<String, String> headers, String body, String secret) {
    String signature = headers.get("X-DocuSign-Signature-1");
    if (signature == null) throw new SecurityException("Missing DocuSign signature");
    String computed = HmacUtils.hmacSha256Hex(secret, body);
    if (!MessageDigest.isEqual(computed.getBytes(), Base64.decode(signature))) {
        throw new SecurityException("Invalid DocuSign webhook signature");
    }
}
```

### IMP-001: Dead Letter Topic Integration (RESOLVED)

**Resolution:** Added DLT publishing in `IntegrationEventRouter.publishToDlt()` (Section 3.4). New
topic `nu-aura.integrations.dlt` follows existing DLT pattern. Failed events stored in
`FailedKafkaEvent` table.

### IMP-002: Frontend TypeScript Types (RESOLVED)

```typescript
// frontend/lib/types/connector.ts

export type ConnectorType = 'NOTIFICATION' | 'E_SIGNATURE' | 'PAYMENT' | 'STORAGE' | 'CALENDAR' | 'AUTH';
export type ConnectorStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type EventLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface ConnectorCapabilities {
  supportedEvents: string[];
  supportsWebhookCallback: boolean;
  supportsActionButtons: boolean;
  supportsBatchOperations: boolean;
  configSchema: ConnectorConfigField[];
}

export interface ConnectorConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'textarea' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];  // for select type
}

export interface ConnectorInfo {
  connectorId: string;
  name: string;
  description: string;
  type: ConnectorType;
  iconUrl?: string;
  capabilities: ConnectorCapabilities;
}

export interface ConnectorConfig {
  id: string;
  tenantId: string;
  connectorId: string;
  displayName: string;
  status: ConnectorStatus;
  eventSubscriptions: string[];
  lastHealthCheckAt?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  diagnostics?: Record<string, unknown>;
}

export interface IntegrationEventLog {
  id: string;
  connectorId: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  status: EventLogStatus;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

export interface DocuSignEnvelope {
  id: string;
  envelopeId: string;
  entityType: string;
  entityId: string;
  status: 'CREATED' | 'SENT' | 'DELIVERED' | 'COMPLETED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  signedDocumentUrl?: string;
  sentAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DocuSignTemplateMapping {
  id: string;
  documentType: string;
  docusignTemplateId: string;
  description?: string;
  isActive: boolean;
}
```

**React Query hooks** (follow existing pattern from `useImplicitRoles.ts`):

```typescript
// frontend/lib/hooks/queries/useConnectors.ts

export function useConnectors() {
  return useQuery<ConnectorInfo[]>({
    queryKey: ['connectors'],
    queryFn: () => connectorService.listConnectors(),
  });
}

export function useConnectorConfig(connectorId: string) {
  return useQuery<ConnectorConfig>({
    queryKey: ['connector-config', connectorId],
    queryFn: () => connectorService.getConfig(connectorId),
    enabled: !!connectorId,
  });
}

export function useSaveConnectorConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ connectorId, config }: { connectorId: string; config: Record<string, unknown> }) =>
      connectorService.saveConfig(connectorId, config),
    onSuccess: (_, { connectorId }) => {
      queryClient.invalidateQueries({ queryKey: ['connector-config', connectorId] });
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      notifications.show({ title: 'Configuration saved', color: 'green' });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (connectorId: string) => connectorService.testConnection(connectorId),
  });
}

export function useIntegrationEvents(connectorId?: string, status?: EventLogStatus) {
  return useQuery<PaginatedResponse<IntegrationEventLog>>({
    queryKey: ['integration-events', connectorId, status],
    queryFn: () => connectorService.listEvents({ connectorId, status }),
  });
}
```

**Config form approach:** Instead of JSON Schema → dynamic form (too complex), use
`ConnectorConfigField[]` from capabilities. Each connector declares its config fields with
type/label/required. The frontend `ConnectorConfigPanel` renders Mantine form fields (`TextInput`,
`PasswordInput`, `Select`, `Switch`) based on field type. This is simpler than react-jsonschema-form
and works natively with React Hook Form + Zod.

### IMP-003: V65 Migration SQL (RESOLVED)

Complete migration included in Section 8. Key additions:

```sql
-- Permission seeds (add to existing permissions table)
INSERT INTO permissions (id, tenant_id, code, name, resource, action, description, is_deleted)
SELECT gen_random_uuid(), t.id, 'INTEGRATION:READ', 'View Integrations', 'INTEGRATION', 'READ',
       'View integration connectors and their status', false
FROM tenants t WHERE t.is_deleted = false
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, resource, action, description, is_deleted)
SELECT gen_random_uuid(), t.id, 'INTEGRATION:MANAGE', 'Manage Integrations', 'INTEGRATION', 'MANAGE',
       'Configure, activate, and manage integration connectors', false
FROM tenants t WHERE t.is_deleted = false
ON CONFLICT DO NOTHING;

-- Role permission grants (SUPER_ADMIN + TENANT_ADMIN only for MANAGE)
INSERT INTO role_permissions (id, role_id, permission_id, scope, is_deleted)
SELECT gen_random_uuid(), r.id, p.id, 'ALL', false
FROM roles r
JOIN permissions p ON r.tenant_id = p.tenant_id AND p.code = 'INTEGRATION:MANAGE'
WHERE r.code IN ('SUPER_ADMIN', 'TENANT_ADMIN') AND r.is_deleted = false
ON CONFLICT DO NOTHING;

-- HR_MANAGER gets READ only (not MANAGE — too permissive for org-wide config)
INSERT INTO role_permissions (id, role_id, permission_id, scope, is_deleted)
SELECT gen_random_uuid(), r.id, p.id, 'ALL', false
FROM roles r
JOIN permissions p ON r.tenant_id = p.tenant_id AND p.code = 'INTEGRATION:READ'
WHERE r.code IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER') AND r.is_deleted = false
ON CONFLICT DO NOTHING;
```

### IMP-004: Entity Encryption (RESOLVED)

`IntegrationConnectorConfig` entity uses the existing `@Convert` pattern with
`EncryptedStringConverter`:

```java
@Entity
@Table(name = "integration_connector_configs")
public class IntegrationConnectorConfig extends TenantAware {
    // ... standard fields ...

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "config_json", nullable = false)
    private String configJson;  // Encrypted at rest via AES-256

    // ... rest of entity ...
}
```

This follows the same pattern as `NotificationChannelConfig.configJson`. The
`EncryptedStringConverter` is an existing JPA `AttributeConverter` that uses the application's
encryption key from `app.encryption.key` property.

### IMP-005: Rate Limiting (RESOLVED)

DocuSign API rate limiting integrated with existing Bucket4j infrastructure:

```java
@Service
public class DocuSignApiClient {
    private final Bucket rateLimitBucket;

    public DocuSignApiClient(BucketConfiguration config) {
        // 1000 calls/hour per tenant, distributed via Redis
        this.rateLimitBucket = Bucket4j.builder()
            .addLimit(Bandwidth.classic(1000, Refill.intervally(1000, Duration.ofHours(1))))
            .build();
    }

    private <T> T executeWithRateLimit(Supplier<T> apiCall) {
        if (!rateLimitBucket.tryConsume(1)) {
            throw new RateLimitExceededException("DocuSign API rate limit exceeded (1000/hour)");
        }
        return apiCall.get();
    }
}
```

In practice, the bucket should be Redis-backed (per-tenant key: `docusign:ratelimit:{tenantId}`)
using the existing `Bucket4jService` pattern. Falls back to in-memory if Redis is unavailable.
