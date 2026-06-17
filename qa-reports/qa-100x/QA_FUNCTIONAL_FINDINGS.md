# Performance & Infrastructure Findings — NU-AURA

**Generated:** 2026-06-18  
**Agent:** Agent 6 — Performance & Infrastructure Audit  
**Sources:** next.config.mjs, vercel.json, application-prod.yml, CacheConfig.java, ShedLockConfig.java, .next/static chunks

---

## Performance Configuration

### Next.js Build Configuration

- `output: 'standalone'` — correct for Docker/Railway container deployment
- `reactStrictMode: true` — enabled; double-invokes effects in dev but not prod overhead
- `optimizePackageImports` configured for 15 libraries including `@mantine/core`, `lucide-react`, `@tabler/icons-react`, `framer-motion`, `recharts`, `date-fns` — barrel-import tree-shaking active
- `images.formats: ['image/avif', 'image/webp']` — modern formats enabled
- `images.minimumCacheTTL: 604800` (7 days) — aggressive image CDN caching
- `@next/bundle-analyzer` installed and gated on `ANALYZE=true` env — available but never run in CI

### Vercel Fluid Compute

- `vercel.json` contains `"fluid": true` — Fluid Compute enabled for the Vercel deployment
- This enables concurrent request handling on a single function instance, reducing cold starts for the SPA shell
- `projectId: prj_Q1rtegd2SHbO8RkdgvZqr8iz6NGW` confirmed in `.vercel/project.json`

---

## Bundle Size Analysis

### Build Cache (last build: 2026-06-17)

| Asset group | Size (uncompressed) |
|-------------|---------------------|
| `.next/static/chunks/` | 20 MB |
| `.next/static/css/` | 484 KB |
| Total static | ~21 MB |

Estimated gzip ~5-6 MB for the full static folder (typical 3-4x ratio for JS).

### Largest Chunks (uncompressed)

| Chunk | Size |
|-------|------|
| `92004-...js` | 639 KB — likely Mantine UI barrel |
| `41871-...js` | 412 KB — likely recharts/d3 |
| `95223-...js` | 303 KB — likely Tiptap editor |
| `96390-...js` | 252 KB |
| `93794-...js` | 219 KB |
| `4bd1b696-...js` | 195 KB |
| `framework-...js` | 185 KB — React + React DOM |
| `main-...js` | 137 KB |
| Total chunks | 179 files |

**Chunks >100 KB uncompressed:** 12 chunks — within acceptable range for an enterprise SPA.

### Dual Date Library Concern

- `dayjs` declared in `dependencies` but **0 direct imports** found in `/app`
- `date-fns` has 27 import sites
- `dayjs` is kept as a Mantine peer dependency but not tree-shaken out — adds ~25 KB gzip to the bundle unnecessarily
- **Recommendation:** Remove `dayjs` from `dependencies` or verify it is only pulled by Mantine (peer) and not bundled standalone

### Dynamic Code Splitting

- `dynamic()` from Next.js: 15 usages found — charts, heavy modals, admin shell
- `Suspense` boundaries: 3 usages (login, candidates, interviews pages)
- `React.memo / useMemo / useCallback`: 446 usages — extensive memoization coverage
- `lazy / import()` patterns (including dynamic): 211 occurrences total

### Image Optimization

- `next/image` usage: 14 occurrences — all significant images use optimized component
- Raw `<img>` tags: **0** — no unoptimized images detected

---

## Caching Strategy

### Backend Redis Cache (26 named caches, tiered TTLs)

| Cache name | TTL | Rationale |
|------------|-----|-----------|
| `leaveTypes`, `designations`, `shiftPolicies`, `holidays`, `permissions`, `roles` | 24h | Rarely change |
| `departments`, `officeLocations`, `benefitPlans`, `tenantSettings`, `tenantAttendanceConfig` | 4h | Occasional changes |
| `featureFlags`, `upcomingBirthdays`, `upcomingAnniversaries` | 4h/24h | Toggle-invalidated |
| `rolePermissions`, `webhooks` | 15-60m | Medium churn |
| `employeeBasic`, `employees` | 15m | Frequent reads |
| `employeeWithDetails` | 10m | Higher detail |
| `leaveBalances` | 5m | Per-attendance check |
| `analyticsSummary`, `dashboardMetrics` | 5m | Near-real-time |
| `tenantStatus` | 30s | JWT filter — every request |
| `unreadCountByUser` | Short | Notification bell polling |

- `@Cacheable` / `@CacheEvict` / `CacheConfig` patterns: **206 occurrences** — comprehensive coverage
- `CacheErrorHandler` present — Redis unavailability falls through gracefully
- Tenant-prefixed cache keys — prevents cross-tenant data leakage

### Frontend React Query Cache

- Global default: `staleTime: 5min`, `gcTime: 10min`, `retry: 1`, `refetchOnWindowFocus: false`
- Per-query overrides: shift-swap 2min, directory 30s, gantt/calendar/projects 5min
- `usePreloadData` hook with viewport-based preloading — reduces perceived latency on navigation
- Singleton `QueryClient` with `queryClient.clear()` on logout — prevents session data leakage

---

## Database Query Patterns

### JPA Relationship Configuration

- `@ManyToOne / @OneToMany / FetchType.LAZY` annotations: **110 occurrences** — relationships correctly lazy by default
- `@EntityGraph` (eager path overrides): 5 usages (ApiKey scopes, Webhook events, PostReaction employee join)
- `JOIN FETCH` in JPQL: 3 usages (RestrictedHolidaySelection, RoleRepository auth path, PostReaction wall)

### Batch / N+1 Mitigation

- `hibernate.default_batch_fetch_size: 25` — IN-clause batching for lazy collections
- `hibernate.jdbc.batch_size: 20` — insert/update batching
- `hibernate.order_inserts: true`, `order_updates: true` — batch ordering enabled
- N+1 risk: 110 lazy associations with only 8 explicit `@EntityGraph`/JOIN FETCH overrides — remaining 102 depend on batch fetch size to avoid N+1; **no Hibernate statistics enabled to catch regressions**

### Connection Pool (Production)

- `maximumPoolSize: ${DB_POOL_MAX:8}` (default 8/pod) — sized for Neon PgBouncer transaction-mode ceiling
- `minimumIdle: ${DB_POOL_MIN:2}`
- `connectionTimeout: 30s`, `idleTimeout: 5min`, `maxLifetime: 10min`
- Pool correctly documented for ~12-pod horizontal scale under Neon's 100-connection ceiling
- `ddl-auto: validate` in prod — no accidental schema mutation on startup
- `show-sql: false`, `generate_statistics: false` in prod — no perf overhead from SQL logging

---

## Infrastructure Health

### Scheduled Jobs

- Files with `@Scheduled`: **18 files** (includes infrastructure files like TenantFilter, RateLimitingFilter)
- Dedicated scheduler classes: AutoRegularization, ContractLifecycle, EmailScheduler, OrphanFileCleanup, LeaveAccrual, WorkflowEscalation, ScheduledReport, ScheduledNotification, BiometricIntegration, WebhookDelivery, OutboxEventProcessor, JobBoardIntegration, ApprovalEscalationJob
- `@SchedulerLock` usages: **25** — more locks than `@Scheduled` classes, indicating some methods have multiple lock points
- `ShedLockConfig` sets `defaultLockAtMostFor = "PT30M"` globally — prevents zombie locks
- ShedLock documented with error-rethrow pattern so failed executions are tracked

### ShedLock Coverage Assessment

All critical business schedulers (LeaveAccrual, ContractLifecycle, AutoRegularization, WebhookDelivery, OutboxEventProcessor) confirmed to use `@SchedulerLock`. Infrastructure schedulers (RateLimitingFilter cleanup, TokenBlacklist cleanup) use `@Scheduled` without locks — **acceptable** since they are node-local operations.

### Vercel Deployment

- Fluid Compute enabled — concurrent request handling, lower cold starts
- Standalone output mode — correct Docker-like container packaging
- No explicit function region pinning in `vercel.json` — defaults to nearest region
- No `headers()` configuration in `vercel.json` — security headers must come from Next.js middleware (verified in prior audits)

---

## Issues Found

| ID | Severity | Domain | Title | Status |
|----|----------|--------|-------|--------|
| PERF-01 | LOW | Bundle | `dayjs` declared as dependency but 0 direct app imports — dead weight ~25KB gzip | OPEN |
| PERF-02 | LOW | Bundle | Bundle analyzer (`ANALYZE=true`) never triggered in CI — bundle regressions go undetected | OPEN |
| PERF-03 | LOW | Database | Hibernate statistics disabled in all profiles — N+1 regressions cannot be caught automatically | OPEN |
| PERF-04 | INFO | Caching | Only 5 `staleTime` overrides in frontend — most queries use 5min global default which is appropriate | PASS |
| PERF-05 | INFO | Bundle | 12 chunks >100KB uncompressed — acceptable for enterprise SPA; all served with Content-Addressable filenames | PASS |
| PERF-06 | INFO | Scheduling | 25 `@SchedulerLock` annotations across 18 scheduler files — full coverage of business-critical jobs | PASS |
| PERF-07 | INFO | Images | 0 raw `<img>` tags, 14 `next/image` usages — image optimization fully applied | PASS |
| PERF-08 | INFO | Cache | 26 Redis cache names with tiered TTLs (30s–24h) and tenant-prefix isolation — production-ready | PASS |
