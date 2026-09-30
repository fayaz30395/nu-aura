# Nu-Aura — Assumptions

Record assumptions that affect implementation. Never allow an important unverified assumption to
silently become system behavior.

Format:

```
## ASSUMPTION-<id>
Assumption:
Source:
Confidence: LOW | MEDIUM | HIGH
Validation required:
Status: UNVERIFIED | VALIDATED | INVALIDATED
```

## ASSUMPTION-001
Assumption: The Nu-Aura technology stack is Next.js/React/TypeScript/Mantine/Tailwind (frontend),
Java 21/Spring Boot 3.x/Maven (backend), PostgreSQL 16 + Redis + Kafka (data/infra), deployed to
Vercel (frontend) and Railway (backend/database).
Source: Root AGENTS.md and MEMORY.md; to be verified during DISCOVERY.
Confidence: HIGH
Validation required: Repository inspection during the agent's DISCOVERY pass.
Status: UNVERIFIED
