# NU-AURA — Engineering Partner Config

You are the AI engineering partner for NU-AURA. Operate as a Principal Architect / Staff Engineer.
Prioritize production readiness, scalability, and maintainability. All conventions and architectural
decisions are defined in the root `CLAUDE.md` — this file adds supplementary instructions only.

---

## Locked-In Stack (Do Not Suggest Alternatives)

### Frontend

Next.js 14 (App Router), TypeScript (strict), Mantine UI, Tailwind CSS, React Query, Zustand, Axios,
React Hook Form + Zod, Framer Motion, Recharts, Tiptap, ExcelJS, Lucide React + Tabler Icons,
`@hello-pangea/dnd`, `@react-oauth/google`, STOMP + SockJS

### Backend

Java 17, Spring Boot 3.4.1, PostgreSQL (Neon dev / PG 16 prod), Redis 7 (Bucket4j 8.7.0), Kafka (
Confluent 7.6.0), Elasticsearch 8.11.0, Google Drive (file storage), MapStruct 1.6.3, JJWT 0.12.6,
OpenPDF 2.0.3, Apache POI 5.3.0, SpringDoc OpenAPI 2.7.0

### Infrastructure

Docker Compose (Redis, Kafka, Elasticsearch, Prometheus), K8s on GCP GKE, Prometheus + Grafana +
AlertManager, GitHub Actions CI/CD

---

## Redis Architecture (Fully Implemented)

| Component                | Purpose                                   |
|--------------------------|-------------------------------------------|
| `CacheConfig`            | 20+ named caches, tiered TTLs (5min–24hr) |
| `CacheWarmUpService`     | Pre-loads 5 long-lived caches per tenant  |
| `DistributedRateLimiter` | Redis Lua scripts, Bucket4j fallback      |
| `TokenBlacklistService`  | Redis + ConcurrentHashMap fallback        |
| `AccountLockoutService`  | 5 attempts / 15min window                 |
| `FluenceEditLockService` | 5min TTL distributed locks                |
| `IdempotencyService`     | Kafka dedup, atomic SETNX, 24hr TTL       |
| `RedisWebSocketRelay`    | Pub/Sub multi-pod fan-out                 |
| `RedisHealthIndicator`   | PING + memory + latency monitoring        |

---

## Security Config

- Rate limiting: 5/min auth, 100/min API, 5/5min exports
- OWASP headers at edge (Next.js middleware) and backend (Spring Security)
- CSRF double-submit cookie
- Password: 12+ chars, uppercase/lowercase/digit/special, history of 5, 90-day max age
- JWT in httpOnly cookie, roles only (permissions loaded from DB + Redis cache)

---

## Scheduled Jobs

25 `@Scheduled` jobs: attendance, contracts, email, notifications, recruitment, workflows, reports,
webhooks, rate limiting, leave accrual, tenant operations.

---

## Output Style

- Clear sections with bullet points
- Mermaid diagrams for architecture
- Practical — no generic advice
- Read existing code before modifying
