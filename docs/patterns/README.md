# Pattern Catalog

Reusable patterns extracted from the NU-AURA codebase. Each pattern is short, copy-pasteable,
and tagged for retrieval. The RuFlo AgentDB indexes these for vector search — keywords in
front-matter feed the HNSW index.

When a pattern emerges three times in similar form, lift it here. When code drifts from a
pattern, the pattern is wrong (or the code is) — fix one of them.

## Index

| Pattern                                                       | When to reach for it                                    |
|---------------------------------------------------------------|---------------------------------------------------------|
| [Redis cache with fallback](redis-cache-with-fallback.md)     | Hot read path where Redis-down must not break the call  |
| [RLS tenant filter](rls-tenant-filter.md)                     | Any new tenant-aware table or query                     |
| [Kafka idempotency](kafka-idempotency.md)                     | New `@KafkaListener` that mutates state                 |
| [Distributed scheduler lock](distributed-scheduler-lock.md)   | New `@Scheduled` job that runs on multi-pod deployment  |
| [Audit-trail emission](audit-trail-emission.md)               | Any write path on a regulated entity (employee, payroll)|

## Pattern file template

```markdown
---
name: <kebab-case-name>
tags: [tag1, tag2, tag3]
applies_to: [layer or module]
references: [ADR-NNN, runbook-path]
---

# <Title>

## When to use
<1-2 sentences, the trigger>

## Canonical implementation
<code block>

## Anti-patterns
- DON'T <thing>
- DON'T <thing>

## Tests required
<bullet list>

## Notes
<edge cases, gotchas>
```

## Adding a new pattern

1. Copy the template above.
2. Tag aggressively — these tags feed vector search.
3. Update `.claude-flow/registry.yaml` `patterns:` section.
4. Reference from the relevant ADR if the pattern realizes a decision.
