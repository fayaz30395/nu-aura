# NU-AURA — Mental Model (Code-Grounded)

> A single, code-verified mental model of the platform. Every claim is traceable
> to a `file_path:line_number`. Built by reading source (Java, TypeScript, SQL,
> YAML) without relying on other docs.
>
> Last refreshed: 2026-05-20.

---

## 0. One-page picture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │  Next.js 14.2 · React 18 · TS strict                    │
                    │  frontend/app/  →  4 bundle pages (hrms|hire|grow|fluence)│
                    │                                                         │
                    │  Providers stack (top→bottom, providers.tsx:48-65):     │
                    │   QueryClient → Toast → DarkMode → Mantine → WebSocket  │
                    │   → TokenRefreshManager (50min proactive · 30min idle)  │
                    │                                                         │
                    │  Axios client.ts → httpOnly cookies + X-XSRF-TOKEN      │
                    │  Refresh mutex around /auth/refresh (concurrent-safe)   │
                    │  STOMP/SockJS @ /ws (heartbeat 4s, 5 retries)           │
                    └────────────────────────────┬────────────────────────────┘
                                                 │ HTTPS
   ┌─────────────────────────────────────────────▼────────────────────────────┐
   │  Spring Boot 3.4 · Java 21 · com.nulogic                                 │
   │                                                                          │
   │  Filter chain (SecurityConfig:243-253):                                  │
   │   RateLimitingFilter → TenantFilter → ApiKeyAuth → JwtAuth               │
   │   → UsernamePasswordAuth → CsrfDoubleSubmit                              │
   │                                                                          │
   │  Layers:                                                                 │
   │   api/         177 @RestController across 55+ subdomains, /api/v1/*      │
   │   application/ services + domain-event publishers                        │
   │   domain/      JPA entities (zero Spring imports)                        │
   │   infrastructure/ repos · kafka · redis · search · storage               │
   │   common/      30 @Configuration · 41 security files · validation       │
   │                                                                          │
   │  GlobalExceptionHandler (@ControllerAdvice) → ErrorResponse wrapper      │
   └────┬──────────────┬──────────────┬──────────────┬───────────┬──────────┘
        │              │              │              │           │
   ┌────▼────┐    ┌────▼──────┐  ┌────▼────┐    ┌────▼────┐ ┌────▼───────┐
   │Postgres │    │ Redis 7    │  │ Kafka   │    │ ES 8.11 │ │Google Drive│
   │ RLS     │    │ 20+ caches │  │ 7 topics│    │ search  │ │ all files  │
   │ Flyway  │    │ pub/sub WS │  │ + .dlt  │    │         │ │            │
   │ 168 mig │    │ rate-limit │  │ ShedLock│    │         │ │            │
   │ V0-V120+│    │ blacklist  │  │         │    │         │ │            │
   └─────────┘    └────────────┘  └─────────┘    └─────────┘ └────────────┘
```

---

## 1. Backend layered architecture

Conventional Spring layering, **not** hexagonal:

- **`domain/`** — JPA-first POJOs. Zero Spring imports; only `jakarta.persistence.*` + Lombok. Entities ARE the model.
- **`application/`** — service layer, orchestrates repos + publishes domain events. Imports `infrastructure/*` directly (no ports/adapters indirection).
- **`infrastructure/`** — Spring Data repos, Kafka, Redis, Elasticsearch, Google Drive, search.
- **`api/`** — 177 `@RestController` classes, all `@RequestMapping("/api/v1/...")`. Uses `BeanUtils.copyProperties()` with **explicit ignore-lists** to block mass-assignment (e.g., `PayrollController:54`, `LeaveRequestController:69`). No MapStruct in this code, despite the dependency being present.
- **`common/`** — cross-cutting. 30 `@Configuration` classes + 41 security files.

Bootstrap (`HrmsApplication.java`):
`@EnableCaching · @EnableJpaAuditing · @EnableScheduling · @EnableAsync · @EntityScan · @EnableJpaRepositories(bootstrapMode=LAZY)`, Elasticsearch auto-config excluded.

---

## 2. Configuration catalog (30 @Configuration classes)

| Subsystem | Class | What it wires |
|---|---|---|
| **Security** | `SecurityConfig:31-300` | Filter chain order, BCrypt encoder, AuthenticationManager, endpoint perms |
| | `SamlSecurityConfig` | SAML 2.0 SSO (Shibboleth lib) |
| | `WebSocketSecurityConfig` | JWT validation on STOMP CONNECT |
| | `DevSecurityConfig` | Relaxed dev profile |
| **JPA** | `JpaConfig:33-62` | `@Primary TenantRlsTransactionManager` — sets `app.current_tenant_id` per tx |
| | `JpaAuditingConfig` | TenantAwareAuditorProvider |
| | `RoutingDataSourceConfig` | Optional read-replica routing on `@Transactional(readOnly=true)` |
| **Cache** | `CacheConfig:34-214` | RedisCacheManager + 20+ named caches + tenant-aware KeyGenerator |
| | `RedisConfig` | `RedisTemplate` (String key, Jackson value serializer) |
| **Kafka** | `KafkaConfig:45-523` | 6 topics + 6 DLTs, producer/consumer factories, DLT recoverer |
| **Scheduling** | `ShedLockConfig:22-34` | JDBC lock provider, `defaultLockAtMostFor=PT30M` |
| **Async** | `AsyncConfig:32-82` | `taskExecutor` core=10/max=50/queue=500, `TenantAwareTaskDecorator` |
| **WebSocket** | `WebSocketConfig:22-140` | STOMP `/ws`, simple broker `/topic /queue`, 64KB msg limit |
| | `WebSocketRedisConfig:25-45` | Redis Pub/Sub `ws:relay` for cross-pod fan-out |
| **Rate limit** | `RateLimitConfig:21-169` | Bucket4j: auth 5/min, api 100/min, export 5/5min, wall 30/min |
| **Misc** | `OpenApiConfig` `EmailConfig` `GoogleDriveConfig` `ElasticsearchConfig` `TwilioConfig` `MetricsConfig` `AIConfig` `PasswordPolicyConfig` `CookieConfig` | self-explanatory |

### Named Redis caches (by TTL bucket)

- **24h** — leaveTypes, designations, shiftPolicies, holidays, permissions, roles, upcomingBirthdays, upcomingAnniversaries
- **4h** — departments, officeLocations, benefitPlans, tenantSettings, tenantAttendanceConfig
- **15min** — employeeBasic, employees, rolePermissions
- **10min** — employeeWithDetails
- **5min** — leaveBalances, analyticsSummary, dashboardMetrics
- **30s** — tenantStatus, unreadCountByUser
- **30min** — activeWebhooks

### Kafka topics (all with `.dlt` siblings, 7-day retention)

| Topic | Partitions | Retention | Consumer group | Consumer class |
|---|---|---|---|---|
| `nu-aura.approvals` | 3 | 24h | approvals-group | `ApprovalEventConsumer` |
| `nu-aura.notifications` | 5 | 24h | notifications-group | `NotificationEventConsumer` |
| `nu-aura.audit` | 10 | 30d | audit-group | `AuditEventConsumer` |
| `nu-aura.employee-lifecycle` | 2 | 24h | employee-lifecycle-group | `EmployeeLifecycleConsumer` |
| `nu-aura.fluence-content` | 3 | 24h | fluence-search-group | `FluenceSearchConsumer` |
| `nu-aura.payroll-processing` | 2 | 24h | payroll-group (concurrency=1) | `PayrollProcessingConsumer` |

DLQ: exponential backoff 1s → 5s → 30s, max 36s, then routed to `.dlt`.

### Scheduled jobs (20+ enumerated, all ShedLock-clustered)

| File | Schedule | Purpose |
|---|---|---|
| `RateLimitingFilter:223` | fixedRate 30s | bucket cleanup |
| `TokenBlacklistService:87` | fixedDelay 30s | expired-token sweep |
| `TenantFilter:198` | fixedRate 5min | tenant ACTIVE cache refresh |
| `AutoRegularizationScheduler:61,85` | 19:30 + 20:00 UTC | auto-regularize attendance |
| `BiometricIntegrationService:227` | fixedDelay 2min | biometric sync |
| `WebhookDeliveryService:422,492` | hourly + fixedRate 60s | retry + cleanup |
| `ContractLifecycleScheduler:72` | 02:30 UTC | contract expiry |
| `ApprovalEscalationJob:63` | fixedRate 15min | stale-approval bump |
| `WorkflowEscalationScheduler:62` | hourly :15 | workflow escalation |
| `LeaveAccrualScheduler:56` | 1st @ 02:00 UTC | monthly leave accrual |
| `ScheduledReportExecutionJob:56` | every 1 min | report runner |
| `ScheduledNotificationService` (×4) | 08:00, 08:30, MON-FRI 10:00 / 17:00 | notifications |
| `EmailSchedulerService` (×4) | 09:00 / hourly / 15min | email batching |
| `JobBoardIntegrationService:147,175` | every 6h + 02:00 | external job-board sync |

---

## 3. Multi-tenancy — 4-layer defense

| Layer | Mechanism | File |
|---|---|---|
| **1. JWT** | tenantId claim → `TenantContext.setCurrentTenant()` | `JwtAuthenticationFilter:86,118` |
| **2. ThreadLocal** | `TenantContext` is plain `ThreadLocal<UUID>` (not `Inheritable`) | `TenantContext:12-45` |
| **3. JPA listener** | `@PrePersist` auto-injects, `@PreUpdate/@PreRemove` throw `SecurityException` on mismatch | `TenantEntityListener:44-121` |
| **4. PostgreSQL RLS** | Connection-init runs `SELECT set_config('app.current_tenant_id', ?, false)` on every `getConnection()` | `TenantAwareDataSourceConfig:104` |

RLS policy shape (e.g., `V36__reinstate_tenant_rls_policies.sql:48-59`):

```sql
CREATE POLICY wiki_spaces_tenant_rls ON wiki_spaces AS RESTRICTIVE FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)::uuid
  OR current_setting('app.current_tenant_id', true) IS NULL
  OR current_setting('app.current_tenant_id', true) = ''
);
```

The `OR NULL` is the **bypass for Flyway and unscoped jobs** — important to know.

**Hibernate-native multi-tenancy is NOT used.** There is no
`MultiTenantConnectionProvider` / `CurrentTenantIdentifierResolver` bean. The
model is: Filter + ThreadLocal + EntityListener + RLS.

### Header fallback rules (`TenantFilter:107-125`)

- `X-Tenant-ID` is only honored when path starts with `/api/v1/public/`.
- If an access-token cookie is present, the header is **ignored with a warning** — JWT wins.

### Async propagation

- `@Async` → `TenantAwareTaskDecorator:37-94` captures tenant at submit, restores in worker, clears in finally.
- Kafka consumers re-establish manually: `ApprovalEventConsumer:68-70` and every other consumer call `TenantContext.setCurrentTenant(event.getTenantId())`. Tenant ID is **carried in every event payload**.

### TenantStatusCache

5-minute refresh (`TenantFilter:59` — `CACHE_REFRESH_INTERVAL_MS = 5*60*1000`),
with hard size limit of 10,000 entries (full clear when exceeded), plus explicit
`invalidateTenant(UUID)` on tenant deactivation (`TenantFilter:227-230`).

---

## 4. AuthN / AuthZ

### Login (`AuthController:104-119`)

1. BCrypt verify via `authenticationManager`.
2. `JwtTokenProvider.generateToken()` issues access + refresh.
3. Response sets **4 cookies** (dual-emit pattern):
   - `__Host-hrms-access` — HttpOnly, Secure, SameSite=Strict, Path=/ (hardened)
   - `__Host-hrms-refresh` — same flags
   - Legacy access + refresh cookies (back-compat)
4. Tokens **scrubbed from response body** (`AuthController:115-116`).

### Refresh (`AuthController:185-221`)

Old token revoked via Redis blacklist `jwt:blacklist:{token}` (TTL = refresh
expiry); new tokens dual-emitted again. Client mutex (`client.ts:96-155`,
atomic nullish-coalescing assign at :121) prevents concurrent refresh storms
across tabs.

### Logout (`AuthController:223-259`)

Blacklist both tokens, expire all 4 cookies via `Max-Age=0`.

### Permission model

- `@RequiresPermission(value = {...}, allOf = {...}, revalidate = boolean)`
- Enforced **twice**: `PermissionHandlerInterceptor` before `@Valid`
  (no info-leak), `PermissionAspect` AOP again for service-to-service.
- 190+ permissions in `RESOURCE:ACTION` form.
- 18 explicit + 7 implicit roles (`REPORTING_MANAGER`, `INTERVIEWER`, etc.,
  derived from employee relations).
- `SUPER_ADMIN` bypasses **both** layers, with audit log at each bypass.

### Data scopes

`ALL / LOCATION / TEAM / SELF` checked in `DataScopeService` inside services —
not at controller. Example: `EmployeeController` exposes
`/api/v1/employees/{id}` then service calls `enforceEmployeeViewScope()` for
IDOR defense.

---

## 5. Persistence model

### Base hierarchy

`BaseEntity:24-57` (MappedSuperclass + `AuditingEntityListener`):

- `UUID id` (UUID strategy)
- `createdAt / updatedAt / createdBy / lastModifiedBy` (Spring auditing)
- `Long version` (optimistic lock)
- `isDeleted boolean / deletedAt LocalDateTime` (soft delete) — combined with
  `@Where(clause="is_deleted = false")` on subclasses.

`TenantAware:20-24` extends `BaseEntity`, adds **immutable** `UUID tenantId` +
`TenantEntityListener`. ~360 entities inherit.

### Repository pattern

Plain `JpaRepository<E, UUID>` with **explicit `findByTenantIdAnd…`** queries
(e.g., `PaymentRefundRepository:13-24`). Tenant isolation actually rides on RLS,
but the repos still pass `tenantId` defensively. Payroll uses
`@Lock(PESSIMISTIC_WRITE)` (`PayrollRunRepository.findByTenantIdAndPeriodForUpdate`).

### Encryption at column level

Sensitive fields (e.g., `User.mfaSecret`) use `EncryptedStringConverter`.

### Flyway

168 migrations under `backend/src/main/resources/db/migration/`. `V0__init.sql`
is a 199KB monolithic baseline. Subsequent migrations are raw PostgreSQL DDL
(no PL/pgSQL). RLS waves: V24 baseline PERMISSIVE allow-all, V36 RESTRICTIVE
tenant policies overlay, V37 core HR policies. Config (`application.yml:95-110`):
`baseline-version=18`, `outOfOrderEnabled=true`, `validateOnMigrate`.

### HikariCP (`application.yml:26-45`, prod override 524-575)

- dev max=10/min=2; prod max=20/min=5
- `keepaliveTime=120s` (Neon idle handling)
- **Connection-init SQL**:
  `SET app.current_tenant_id = ''; SET statement_timeout = '120s'`
  — seeds the RLS variable on connection acquire (defensive).

---

## 6. Frontend

### Stack (`frontend/package.json`)

Next.js 14.2, React 18.2, Mantine 8.3, Tailwind 3.4, Zustand 4.4,
React Query 5.17, Axios 1.15, RHF 7.49 + Zod 3.22, Framer Motion 12.23,
ExcelJS 4.4, Tiptap 3.20, STOMP 7.2 + SockJS 1.6, Vitest 3.2, Playwright 1.57.

### Next.js config (`next.config.js`)

- API URL via `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`)
- `optimizePackageImports` for Lucide / Tabler / Mantine / Framer
- Headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Permissions-Policy` disables camera/mic/geo
- Prod compiler strips `console.log` except error/warn
- Webpack splits vendor / React Query / charts chunks

### Provider stack (`providers.tsx:48-65` — order matters)

1. `QueryClientProvider`
2. `ToastProvider` (custom)
3. `DarkModeProvider` (toggles `<html class="dark">`, persists to localStorage)
4. `MantineThemeProvider` (forceColorScheme synced to dark-mode state)
5. `WebSocketProvider`
6. `TokenRefreshManager` — proactive refresh at 50min, force-logout on 30min idle

### Design tokens (`globals.css:17-313`)

180+ CSS custom properties — light/dark pairs for surfaces, accents
(`--accent-primary: #2563EB` light / `#5B8CF5` dark), sidebar
(`--bg-sidebar: #0E111A` warm dark), chart palette. WCAG AA opacity adjustments
at globals.css:93-99.

### Tailwind config

- `darkMode: 'class'`
- Colors map to CSS vars: `bg-background → var(--bg-main)`,
  `text-foreground → var(--text-primary)`, etc.
- Custom animations: fade-in, rise-in, shimmer (1.5s infinite),
  page-enter (200ms ease-out).

### Mantine theme (`mantine-theme.ts`)

primaryColor `aura` (blue-600 scale), shade 6 light / 4 dark, defaultRadius
`md`, body font from `--font-sans`, headings from `--font-display`, default
Button/Input size `sm` h=`2.25rem` (36px — the "compact desktop" rule).

### Auth store (`useAuth.ts:83-330`)

Zustand. Persists `user` (separate sessionStorage key `nu-aura-user` to dodge
Zustand `partialize` HMR bug) and `isAuthenticated`. **No tokens ever
client-side** — only httpOnly cookies. Session restore tries `/auth/me` first;
falls back to `/auth/refresh` on 401/403/400 (avoids N-tab refresh cascades).

### API client (`client.ts:75-242`)

Axios, `withCredentials: true`. Attaches `X-XSRF-TOKEN` (double-submit). 401
path: shared `refreshPromise` mutex (atomic nullish-coalescing assign at :121),
`onSessionRefreshed()` callback to rehydrate Zustand, 5-sec debounced redirect
to `/auth/login?reason=expired` (REDIRECT_DEBOUNCE_MS).

### Routing (`/app/app/{hrms|hire|grow|fluence}/page.tsx`)

Each is a guard + redirect. `AuthGuard` checks `isAuthenticated`,
`useActiveApp` derives bundle from pathname and checks `hasAppAccess(bundle)`.
`AppLayout` builds sidebar from `APP_SIDEBAR_SECTIONS` config; sidebar
collapsible state persisted in localStorage.

### Realtime (`WebSocketContext.tsx:1-233`)

STOMP over SockJS at `/ws`. Heartbeats 4s both ways. Reconnect delay 5s, max 5
attempts. Three subscriptions when authenticated:

- `/topic/broadcast` — global
- `/topic/user/{employeeId}` — user
- `/topic/user/{employeeId}/approvals` — fires approval callbacks

---

## 7. Three end-to-end flows

### Login

```
Frontend login page → axios POST /api/v1/auth/login
AuthController:104-119 → AuthService.login()
  → authenticationManager.authenticate() → BCrypt verify
  → JwtTokenProvider.generateToken() (access + refresh)
  → Set 4 cookies (__Host-hrms-access/refresh + legacy)
  → Response body scrubbed of tokens
  → Returns { user, roles, permissions }
On 401 anywhere:
  client.ts mutex → POST /auth/refresh
  → AuthController:185-221 reads __Host-hrms-refresh (legacy fallback)
  → revokes old token via Redis blacklist jwt:blacklist:{token}
  → Re-issues + dual-emits cookies
  → onSessionRefreshed() rehydrates Zustand
```

### Leave request → approval

```
POST /api/v1/leave-requests
LeaveRequestController:59-87 — BeanUtils with explicit ignore list
  → normalizes halfDayPeriod (MORNING→FIRST_HALF, AFTERNOON→SECOND_HALF)
  → LeaveRequestService:73-121
    → findOverlappingLeaves() validates conflicts
    → Computes totalDays (server-side, weekends excluded)
    → reservePendingDays(0.5 for half-day)
    → save status=PENDING
    → publish LeaveRequestedEvent
Consumers:
  → NotificationEventListener → in-app + email to manager
  → AuditEventListener → audit row
  → CalendarIntegrationListener → blocks calendar slots
Manager approve: POST /api/v1/leave-requests/{id}/approve
  → service validates approver IS the employee's manager
    (AccessDeniedException otherwise)
  → status=APPROVED, deductApprovedDays(0.5)
  → publish LeaveApprovedEvent
  → PayrollIntegrationListener creates LOP_DEDUCTION adjustment if unpaid leave
```

### Payroll run

```
POST /api/v1/payroll/runs/process { payrollRunId }
PayrollController:137-165 — @RequiresPermission(PAYROLL_PROCESS, revalidate=true)
  → PayrollRunService.markProcessing() — state guard DRAFT→PROCESSING
    (pessimistic lock via findByTenantIdAndPeriodForUpdate)
  → eventPublisher.publishPayrollProcessingEvent() (sync .get() — fail-fast)
  → if Kafka fails: rollback to DRAFT via failProcessing()
  → returns 202 Accepted
Async PayrollProcessingConsumer (group concurrency=1, serialized):
  For each employee:
    1. Active SalaryStructure on payroll date
    2. PayrollAdjustments from LeaveApproved/OvertimeApproved/ExpenseApproved events
    3. Evaluate PayComponent formulas in evaluationOrder
    4. Compute earnings + deductions (PT/IT/PF/loan)
    5. Create Payslip { totalEarnings, totalDeductions, netPay }
  After all employees: payrollRun.process() → status=PROCESSED
  publish PayrollProcessedEvent
States: DRAFT → PROCESSING → PROCESSED → APPROVED → LOCKED
FnFCalculationService.getOrCalculate(exitProcessId):
  → accrued leave payout + notice buyout + gratuity
    (years × basic/12 × factor)
    + unpaid salary − loan recovery − asset damage − tax
  → save FullAndFinalSettlement status=PENDING_APPROVAL
```

---

## 8. Notable findings vs common assumptions

| Common assumption | Code reality |
|---|---|
| Hibernate multi-tenancy resolver in use | **Not present.** Tenancy is Filter + ThreadLocal + EntityListener + RLS. |
| MapStruct used for DTO mapping | **Dependency present, not used.** Controllers use `BeanUtils.copyProperties()` with ignore-lists. |
| Single access-cookie | **Dual-emit** — `__Host-` hardened + legacy fallback. |
| TenantStatusCache 30-second TTL | **5 minutes** (`CACHE_REFRESH_INTERVAL_MS = 5*60*1000`). |
| RLS strict tenant isolation | **Graceful fallback** — `OR setting IS NULL` lets Flyway/jobs run without context. |
| Payroll concurrency = optimistic | **Pessimistic** — `@Lock(PESSIMISTIC_WRITE)` on `findByTenantIdAndPeriodForUpdate`. Also Kafka consumer concurrency=1 for payroll. |
| Standardized API response wrapper | **None** — controllers return raw entities or domain DTOs; only errors are wrapped (by `GlobalExceptionHandler`). |
| Hibernate-native cascade ORM | **Mostly UUID FKs, no `@OneToMany`.** Only `User↔Role` `@ManyToMany`, `Role↔RolePermission` `@OneToMany`, `Employee↔User` `@OneToOne`. The rest are explicit `someEntityId` UUID fields. |

---

## 9. One-paragraph summary

NU-AURA is a Next.js 14 frontend hitting a Spring Boot 3.4 monolith organized
as 4 packages (`api/application/domain/infrastructure`) with one cross-cutting
`common/`. Multi-tenancy is enforced four times over (JWT → ThreadLocal → JPA
listener → PostgreSQL RLS via session variable set on every `getConnection()`).
Every entity inherits `TenantAware → BaseEntity` (UUID id, audit fields,
optimistic version, soft-delete columns). Auth uses dual-emitted httpOnly
cookies (`__Host-hrms-*` + legacy), Redis blacklist for revocation, and a
permission system enforced twice (interceptor before `@Valid`, AOP again inside
services). 30 `@Configuration` classes wire 20+ Redis caches with
tenant-prefixed keys, 6 Kafka topics with DLT siblings, 20+ ShedLock-clustered
schedulers, and a STOMP WebSocket layer that fans out cross-pod via Redis
Pub/Sub `ws:relay`. Data is mostly UUID-foreign-keyed (not ORM-cascaded),
repositories pass `tenantId` defensively even though RLS would catch it, and
payroll uses pessimistic locks + serialized Kafka consumers because money. The
frontend has a single global provider stack with QueryClient + custom Toast +
DarkMode + Mantine + WebSocket + a proactive token refresher; design tokens
live in `globals.css` as 180+ CSS vars and are bridged into both Tailwind and
the Mantine theme. The whole thing trades hexagonal purity for Spring
conventions, and trades MapStruct for explicit `BeanUtils`-with-ignore-lists to
defend against mass-assignment.
