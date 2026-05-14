---
name: audit-trail-emission
tags: [audit, compliance, kafka, event-sourcing, regulated, traceability]
applies_to: [backend, service-layer, controllers]
references: [ADR-011, MEMORY.md#audit-architecture]
---

# Audit-Trail Emission

## When to use

Any write path on a **regulated entity**: employee record, payroll, leave balance, compensation,
tax, contract, document, role/permission assignment. If a regulator, an HR director, or a
courtroom might ask "who changed this and when?", emit an audit event.

The audit trail is also our forensics tool — when a customer reports "someone deleted Jane's
payslip," `audit_events` is where we look.

## Canonical implementation

### Service-layer emission

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class CompensationService {

    private final CompensationRepository repo;
    private final AuditService audit;
    private final SecurityContext security;  // current user

    @Transactional
    public Compensation update(UUID compensationId, UpdateCompensationCommand cmd) {
        Compensation existing = repo.findById(compensationId)
            .orElseThrow(() -> new NotFoundException("compensation", compensationId));

        Compensation before = existing.snapshot();  // immutable copy

        existing.applyChange(cmd);
        Compensation saved = repo.save(existing);

        // Emit AFTER the DB write. If the audit emit fails, the transaction rolls back
        // (audit failures must NEVER silently drop — the regulated entity didn't actually
        // get audited).
        audit.emit(AuditEvent.builder()
            .tenantId(security.currentTenantId())
            .actorId(security.currentUserId())
            .actorEmail(security.currentUserEmail())
            .action("compensation.update")
            .resourceType("compensation")
            .resourceId(compensationId.toString())
            .before(toJson(before))
            .after(toJson(saved))
            .ipAddress(security.currentIpAddress())
            .userAgent(security.currentUserAgent())
            .build());

        return saved;
    }
}
```

### What `AuditService.emit` does

1. INSERT into `audit_events` (PostgreSQL, partitioned by `created_at`).
2. Publish to Kafka topic `audit.event` (downstream: Elasticsearch indexer for searchable
   audit log, optional SIEM forwarder).
3. Both INSERT and publish run inside the calling transaction. The Kafka publish uses the
   transactional outbox — `audit_outbox` table written within the same TX, then a relay
   ships to Kafka asynchronously (no Kafka-down failure modes inside business code).

### Action naming

`<domain>.<verb>` — `compensation.update`, `employee.terminate`, `leave_balance.adjust`,
`role.assign`, `permission.revoke`. Consistent verbs across the codebase make queries like
"all role assignments in the last 30 days" feasible.

## Anti-patterns

- **DON'T** emit audit events from the controller. Controllers are too thin to know the
  before-state. Emit from the service that performs the change.
- **DON'T** emit BEFORE the DB write. If the write fails, you have an audit entry for
  something that didn't happen. Emit AFTER the change is persisted, INSIDE the same TX.
- **DON'T** put PII in the `action` or `resourceType` fields — those go to logs and Kafka.
  PII lives in `before`/`after` (which are stored with field-level encryption per
  `audit_events.before` schema).
- **DON'T** skip the audit for "minor" updates. The decision of what's auditable belongs to
  compliance, not the developer adding the feature.
- **DON'T** wrap the audit emit in `try/catch` that swallows the exception. If the audit
  store is down, the business operation must FAIL — the alternative is silent
  non-compliance.
- **DON'T** use the same `action` name for different operations. `employee.update` covering
  both "change phone number" and "terminate" makes audit queries useless. Be specific:
  `employee.contact.update`, `employee.terminate`.

## Tests required

- Integration: update compensation → exactly one `audit_events` row with action
  `compensation.update`, correct actor, valid `before` and `after` snapshots
- Integration: audit-store down (Testcontainers PG paused) → service throws, business write
  rolls back, NO compensation change persisted
- Unit: snapshot diff in `before` vs `after` excludes computed/derived fields

## Notes

- `audit_events` is **NOT** soft-deleted. Even ADMIN cannot delete audit rows from the
  application — only DBA via `DELETE` on the partitioned old partition.
- Partition policy: monthly, retain 84 months (7 years) per compliance.
- The `actor_id` may be NULL for system-emitted events (scheduled jobs, Kafka consumers
  acting on behalf of events). In those cases, set `actor_email = 'system:<job-name>'`.
- For high-volume actions (login, page view), audit cost is real. Those go to the access
  log, not `audit_events`. The line is: "would a regulator care about this individual
  event?" If yes, audit. If it's about aggregate patterns (anomaly detection), log.
