# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records documenting significant technical decisions
made for the Nu-Aura HRMS platform.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision along with its context
and consequences. ADRs are immutable once accepted - superseded decisions are marked as such, not
deleted.

## ADR Index

| ADR                                                   | Title                                           | Status   | Date    |
|-------------------------------------------------------|-------------------------------------------------|----------|---------|
| [ADR-001](ADR-001-multi-tenant-architecture.md)       | Multi-Tenant Architecture with Shared Database  | Accepted | 2025-01 |
| [ADR-002](ADR-002-authentication-strategy.md)         | JWT-based Authentication with HTTP-only Cookies | Accepted | 2025-01 |
| [ADR-003](ADR-003-caching-strategy.md)                | Redis Caching with Tenant-Aware Key Generation  | Accepted | 2025-01 |
| [ADR-004](ADR-004-webhook-delivery-system.md)         | Reliable Webhook Delivery with Circuit Breaker  | Accepted | 2026-02 |
| [ADR-005](ADR-005-theme-consolidation.md)             | Theme Consolidation                             | Accepted | 2026-03 |
| [ADR-006](ADR-006-jwt-token-optimization.md)          | JWT Token Optimization                          | Accepted | 2026-03 |
| [ADR-007](ADR-007-payroll-saga-pattern.md)            | Payroll Saga Pattern                            | Accepted | 2026-03 |
| [ADR-008](ADR-008-recruitment-ats-gap-analysis.md)    | Recruitment ATS Gap Analysis                    | Accepted | 2026-03 |
| [ADR-009](ADR-009-database-connection-pool-sizing.md) | Database Connection Pool Sizing                 | Accepted | 2026-03 |
| [ADR-010](ADR-010-row-level-security-tenancy.md)      | Row-Level Security for Tenant Isolation         | Accepted | 2026-05 |
| [ADR-011](ADR-011-kafka-idempotent-consumers.md)      | Kafka Idempotent Consumer Pattern               | Accepted | 2026-05 |
| [ADR-012](ADR-012-timezone-handling.md)               | Tenant-Aware Timezone Handling                  | Proposed | 2026-05 |

ADRs 005–009 were merged in from the legacy `docs/build-kit/` tree during Phase 2 of the repo layout cleanup (2026-05-13). The original numbering inside build-kit (001–005) was renumbered to 005–009 to avoid collision with the foundational ADRs above. Original index preserved as `build-kit-adr-index.md`.

ADRs 010–012 were added 2026-05-14 to close documentation gaps for decisions already in code:
RLS tenancy (V36 migration), Kafka idempotency (audit-closed), and timezone handling
(wave-10 P0 fix). See `docs/patterns/` for the runtime patterns these ADRs realize.

## ADR Status Lifecycle

```
PROPOSED → ACCEPTED → DEPRECATED → SUPERSEDED
              ↓
           REJECTED
```

- **Proposed**: Under discussion
- **Accepted**: Decision has been made and implemented
- **Deprecated**: Decision is being phased out
- **Superseded**: Replaced by a newer ADR
- **Rejected**: Decision was considered but not adopted

## ADR Template

When creating a new ADR, use this template:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context
[Describe the issue motivating this decision, and any context that influences or constrains the decision]

## Decision
[Describe our response to these forces. This is the decision statement.]

## Rationale
[Explain why this decision was made, including alternatives considered]

## Consequences
### Positive
[List positive outcomes]

### Negative
[List negative outcomes and trade-offs]

### Mitigations
[How we address the negative consequences]

## Related Decisions
[List related ADRs]
```

## Contributing

1. Copy the template above
2. Create a new file: `ADR-XXX-short-title.md`
3. Fill in all sections
4. Submit for review
5. Once approved, update this README index
