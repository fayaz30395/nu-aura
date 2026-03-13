# Kafka Setup Checklist for NU-AURA HRMS

Use this checklist to verify all Kafka components are properly implemented and integrated.

## Phase 1: Core Infrastructure ✓

- [x] Kafka configuration in docker-compose.yml
- [x] Zookeeper service added to docker-compose.yml
- [x] Kafka volumes for data persistence created
- [x] Kafka environment variables configured
- [x] Backend dependency on Kafka added to docker-compose.yml

## Phase 2: Kafka Configuration ✓

- [x] KafkaConfig.java created with:
  - [x] Producer factory with JSON serialization
  - [x] Consumer factories for each event type
  - [x] Topic creation (4 primary + 4 DLT topics)
  - [x] Listener container factories with manual commit
  - [x] Idempotent producer configuration
  - [x] Compression enabled (snappy)

- [x] KafkaTopics.java created with:
  - [x] All topic name constants
  - [x] Consumer group IDs
  - [x] DLT topic names

- [x] kafka.properties created with:
  - [x] Bootstrap server configuration
  - [x] Producer settings
  - [x] Consumer settings
  - [x] Retention policies
  - [x] Logging configuration

## Phase 3: Event DTOs ✓

- [x] BaseKafkaEvent.java with:
  - [x] eventId (UUID)
  - [x] eventType (string)
  - [x] tenantId (UUID for multi-tenancy)
  - [x] timestamp
  - [x] source

- [x] ApprovalEvent.java with:
  - [x] approval types (LEAVE, EXPENSE, ASSET, WIKI_PAGE)
  - [x] status field (APPROVED/REJECTED)
  - [x] metadata map for domain-specific data
  - [x] terminal workflow status tracking

- [x] NotificationEvent.java with:
  - [x] Multi-channel support (EMAIL, PUSH, IN_APP, SMS)
  - [x] Template name and data fields
  - [x] Retry count and max retries
  - [x] Priority levels

- [x] AuditEvent.java with:
  - [x] User action tracking
  - [x] Before/after state capture
  - [x] HTTP context (IP, user agent, method, URI)
  - [x] Performance metrics (duration, status code)

- [x] EmployeeLifecycleEvent.java with:
  - [x] Event types (HIRED, ONBOARDED, PROMOTED, TRANSFERRED, OFFBOARDED)
  - [x] Employee context fields
  - [x] Event-specific metadata
  - [x] Bulk operation flag

## Phase 4: Event Publishing ✓

- [x] EventPublisher.java service with:
  - [x] publishApprovalEvent() method
  - [x] publishNotificationEvent() method
  - [x] publishAuditEvent() method
  - [x] publishEmployeeLifecycleEvent() method
  - [x] Async send handling with CompletableFuture
  - [x] Proper error logging

## Phase 5: Event Consumers ✓

- [x] ApprovalEventConsumer.java with:
  - [x] Approval event listening
  - [x] Idempotent processing cache
  - [x] APPROVED decision handling (deduct leave, update expense, etc.)
  - [x] REJECTED decision handling
  - [x] Type-specific handlers for LEAVE, EXPENSE, ASSET, WIKI_PAGE
  - [x] Manual offset commit
  - [ ] TODO: Integrate with leave/expense/asset/wiki services

- [x] NotificationEventConsumer.java with:
  - [x] Channel routing (EMAIL, PUSH, IN_APP, SMS)
  - [x] Template rendering logic placeholder
  - [x] Exponential backoff retry logic
  - [x] DLT forwarding on max retries
  - [x] Idempotent processing
  - [ ] TODO: Integrate with email/push/SMS services

- [x] AuditEventConsumer.java with:
  - [x] Batch accumulation for efficiency
  - [x] Bulk insert to database
  - [x] Fire-and-forget error handling
  - [x] Graceful shutdown with pending flush
  - [x] Idempotent processing
  - [ ] TODO: Implement audit_logs table persistence

- [x] EmployeeLifecycleConsumer.java with:
  - [x] Event type routing (HIRED, ONBOARDED, PROMOTED, TRANSFERRED, OFFBOARDED)
  - [x] Handler for each lifecycle event
  - [x] Metadata extraction and processing
  - [ ] TODO: Integrate with employee services
  - [ ] TODO: Implement leave balance creation
  - [ ] TODO: Implement compensation updates
  - [ ] TODO: Implement access control changes

- [x] DeadLetterHandler.java with:
  - [x] Multi-topic DLT listening
  - [x] Failed event logging
  - [ ] TODO: Implement failed_events table storage
  - [ ] TODO: Implement alert sending
  - [ ] TODO: Implement event replay functionality

## Phase 6: Utilities ✓

- [x] KafkaEventUtil.java with:
  - [x] Idempotency key generation
  - [x] Event validation
  - [x] Serialization/deserialization
  - [x] Tenant ID extraction
  - [x] Error context creation
  - [x] Event staleness detection

## Phase 7: Integration Tasks (Next Steps)

### Approval Service Integration
- [ ] Import EventPublisher in ApprovalService
- [ ] Call publishApprovalEvent() on approval decisions
- [ ] Implement TODO in ApprovalEventConsumer.handleLeaveApproved()
- [ ] Implement TODO in ApprovalEventConsumer.handleExpenseApproved()
- [ ] Implement TODO in ApprovalEventConsumer.handleAssetApproved()
- [ ] Implement TODO in ApprovalEventConsumer.handleWikiPageApproved()

### Notification Service Integration
- [ ] Import EventPublisher in NotificationService
- [ ] Implement emailService.sendEmail() in NotificationEventConsumer
- [ ] Implement pushService.sendNotification() in NotificationEventConsumer
- [ ] Implement inAppNotificationService.createNotification() in NotificationEventConsumer
- [ ] Implement smsService.sendSms() in NotificationEventConsumer
- [ ] Create email templates (leave-approved, leave-rejected, expense-*, etc.)

### Audit Service Integration
- [ ] Import EventPublisher in all domain services
- [ ] Call publishAuditEvent() on all significant domain actions
- [ ] Create failed_events table schema
- [ ] Implement auditLogRepository.saveAll() in AuditEventConsumer
- [ ] Implement graceful flush on application shutdown

### Employee Service Integration
- [ ] Import EventPublisher in EmployeeService
- [ ] Call publishEmployeeLifecycleEvent() on HIRED/ONBOARDED/PROMOTED/TRANSFERRED/OFFBOARDED
- [ ] Implement leaveService.createDefaultLeaveBalances() in EmployeeLifecycleConsumer
- [ ] Implement compensationService.updateSalary() in EmployeeLifecycleConsumer
- [ ] Implement performanceService.createReviewCycle() in EmployeeLifecycleConsumer
- [ ] Implement employeeService.updateDepartmentAndLocation() in EmployeeLifecycleConsumer
- [ ] Implement accessControlService.disableEmployeeAccess() in EmployeeLifecycleConsumer

## Phase 8: Testing & Verification

### Local Development Testing
- [ ] Start Kafka: `docker-compose up -d zookeeper kafka`
- [ ] Verify Kafka is healthy: `docker logs hrms-kafka | grep "started"`
- [ ] Start backend: `cd backend && ./start-backend.sh`
- [ ] Verify topics created: `docker exec hrms-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list`
- [ ] Check topic configs: `docker exec hrms-kafka kafka-topics.sh --bootstrap-server localhost:9092 --describe`

### Integration Testing
- [ ] Test approval event publishing and consuming
- [ ] Test notification event multi-channel routing
- [ ] Test audit event batch processing
- [ ] Test employee lifecycle event cascading effects
- [ ] Verify idempotent processing (send duplicate, verify processed once)
- [ ] Test DLT handling (send malformed event, verify in DLT)

### Unit Tests
- [ ] ApprovalEventConsumerTest
- [ ] NotificationEventConsumerTest
- [ ] AuditEventConsumerTest
- [ ] EmployeeLifecycleConsumerTest
- [ ] EventPublisherTest
- [ ] KafkaEventUtilTest

### Performance Testing
- [ ] Load test approval event throughput
- [ ] Load test notification event throughput
- [ ] Load test audit event batching
- [ ] Monitor consumer lag under high load
- [ ] Verify no message loss on consumer restart

## Phase 9: Production Preparation

### Database Schema
- [ ] Create audit_logs table for audit events
- [ ] Create failed_events table for DLT events
- [ ] Create indexes on tenantId and timestamp
- [ ] Add foreign key constraints as needed

### Monitoring & Observability
- [ ] Configure Prometheus scraping for Kafka metrics
- [ ] Create Grafana dashboards for:
  - [ ] Consumer lag by topic and group
  - [ ] Message throughput (messages/sec)
  - [ ] Error rates and DLT message count
  - [ ] Topic partition distribution
  - [ ] Kafka broker health

- [ ] Set up alerting for:
  - [ ] Consumer lag > threshold
  - [ ] DLT messages detected
  - [ ] Producer errors
  - [ ] Kafka broker down

- [ ] Configure logging:
  - [ ] Set appropriate log levels in production
  - [ ] Aggregate logs from all consumers
  - [ ] Create log queries for debugging

### Deployment
- [ ] Deploy to staging with multi-broker Kafka
- [ ] Test failover (stop a broker, verify recovery)
- [ ] Load test with production-like volume
- [ ] Monitor for 24 hours pre-production
- [ ] Create runbook for common issues
- [ ] Document rollback procedures

### High Availability
- [ ] Migrate idempotency cache from in-memory to Redis
  - [ ] Create Redis key: `processed-events:{eventId}`
  - [ ] Set TTL: 7 days
  - [ ] Update all consumer code

- [ ] Configure Kafka for HA:
  - [ ] Use 3+ brokers
  - [ ] Set replication factor to 3
  - [ ] Set min ISR to 2
  - [ ] Enable broker rack awareness

### Security
- [ ] Enable SSL/TLS for Kafka brokers
- [ ] Configure SASL authentication
- [ ] Set up per-topic ACLs
- [ ] Rotate credentials regularly
- [ ] Audit topic access

## Validation Checklist

### Code Quality
- [ ] No compiler warnings in Kafka code
- [ ] All TODO comments addressed or tracked
- [ ] Code follows NU-AURA conventions
- [ ] Proper exception handling throughout
- [ ] Comprehensive logging at DEBUG level

### Configuration
- [ ] All environment variables documented
- [ ] docker-compose.yml validated
- [ ] kafka.properties reviewed
- [ ] Partition counts appropriate for domain
- [ ] Retention policies meet compliance needs

### Documentation
- [ ] KAFKA_IMPLEMENTATION.md complete and accurate
- [ ] KAFKA_INTEGRATION_GUIDE.md with working examples
- [ ] README updated with Kafka setup instructions
- [ ] Architecture diagrams included
- [ ] Runbooks created for operations

## Sign-Off

- [ ] QA Lead: Code review passed
- [ ] Tech Lead: Architecture approved
- [ ] DevOps: Deployment process documented
- [ ] Product: Feature meets requirements
- [ ] Security: No vulnerabilities identified

---

For detailed information, see:
- KAFKA_IMPLEMENTATION.md - Architecture and design
- KAFKA_INTEGRATION_GUIDE.md - Step-by-step integration examples
- docker-compose.yml - Infrastructure configuration
