# NU-AURA Platform — Architectural Patterns Deep Review

**Reviewer:** Principal Architect (30yr FAANG perspective)
**Date:** March 18, 2026
**Scope:** Pattern analysis, stability assessment, change recommendations

---

## Part 1: Pattern Catalog — What's Used and How Well

### 1.1 Service Layer Pattern (Backend)

**Quality: 7/10 — Functional but inconsistent**

The backend follows a clean Controllers → Services → Repositories → Domain layering. Every service is `@Service` with constructor injection and explicit `@Transactional` boundaries. This is textbook Spring.

Where it breaks down: **enrichment logic is inconsistent**. `EmployeeService.getAllEmployees()` uses batch map-building (`buildDepartmentNameMap`, `buildEmployeeNameMap`) to avoid N+1 queries, but `getEmployee()` on the same service does individual `departmentRepository.findById()` and `employeeRepository.findById()` lookups — four separate queries for one employee fetch. At 500 employees per page, the list endpoint is optimized. The detail endpoint is not. This will bite you when someone adds a "quick view" panel that fetches employee details in a loop.

The bigger issue: **some services don't publish domain events**. `EmployeeService` publishes `EmployeeCreatedEvent` and `EmployeeUpdatedEvent`. `LeaveRequestService` does not publish anything. This means notifications, analytics, and audit subscribers are blind to leave lifecycle changes. In an event-driven system, silent writes are architectural debt — they create invisible coupling where downstream consumers assume events exist and quietly return empty results.

**Verdict: Stable foundation, needs consistency enforcement.**

---

### 1.2 Domain-Driven Design (Backend)

**Quality: 8/10 — Strong entity modeling, weak aggregate boundaries**

The domain entities are genuinely rich — not anemic POJOs. `Employee` has behavioral methods like `terminate()`, `resign()`, `activate()`. `WorkflowExecution` guards state transitions with `canBeApproved()`. `User` tracks login attempts with `recordFailedLogin()` and `recordSuccessfulLogin()`. This is proper DDD — entities that enforce their own invariants.

What's missing is the **Aggregate Root** concept. Multiple services can independently modify an `Employee` — the `EmployeeService` can change department, the `PayrollService` can change compensation, the `LeaveService` can change balance — all without coordinating through a single transactional boundary. In DDD terms, `Employee` should be an aggregate root, and all mutations should go through it (or at minimum through a single service that owns the aggregate). Without this, concurrent updates race silently.

The `TenantAware` base entity is a well-executed pattern — every tenant-scoped entity inherits `tenantId` automatically via `TenantEntityListener`. This is the right abstraction layer.

**Verdict: Mature entity modeling. Aggregate boundaries need formalization before you hit concurrency bugs at scale.**

---

### 1.3 Event-Driven Architecture (Backend)

**Quality: 9/10 — Best pattern in the codebase**

This is where the architecture genuinely shines. The `DomainEventPublisher` + `KafkaDomainEventBridge` combination implements what's effectively a **Transactional Outbox with Bridge** pattern:

1. Services publish events via `DomainEventPublisher.publish(event)`
2. If inside a transaction, the event is deferred to `AFTER_COMMIT` via `TransactionSynchronizationManager`
3. `KafkaDomainEventBridge` listens with `@TransactionalEventListener(phase = AFTER_COMMIT)`
4. Only publishes to Kafka for terminal workflow states (smart filtering)
5. Metadata enrichment happens at bridge time

This solves the dual-write problem: if the DB transaction rolls back, the event is never published. If Kafka is down, the event is logged to `failed_kafka_events` table for retry. The `IdempotencyService` prevents duplicate processing on the consumer side.

The four Kafka topics are well-scoped: `nu-aura.approvals`, `nu-aura.notifications`, `nu-aura.audit`, `nu-aura.employee-lifecycle`. Each has a dead-letter topic (`.dlt`). Producer config is production-grade: `acks=all`, idempotent, Snappy compression.

One anti-pattern: the `buildMetadata()` method in the bridge uses hardcoded string-switch dispatch (`"LEAVE_REQUEST" -> "LEAVE"`, `"EXPENSE_CLAIM" -> "EXPENSE"`). This should be an enum or registry, not string matching. But this is a minor code smell in an otherwise excellent implementation.

**Verdict: Production-ready. This is the most mature part of the architecture. Ship it.**

---

### 1.4 Workflow Engine / State Machine (Backend)

**Quality: 7.5/10 — Powerful but growing monolithic**

The workflow engine is data-driven: `WorkflowDefinition → ApprovalStep[] → StepExecution[]`. Workflows aren't hardcoded — they're configured per tenant via the definition tables. This is the right architectural choice for an HR platform where every customer wants different approval chains.

The `WorkflowService` at 969 lines is the most complex service in the codebase. The `processApprovalAction()` method is 132 lines handling five action types (APPROVE, REJECT, RETURN_FOR_MODIFICATION, DELEGATE, HOLD). This is a **God Method** — a classic anti-pattern where too many responsibilities converge into a single method.

The fix is textbook Strategy pattern:

```java
interface ApprovalActionHandler {
    void handle(WorkflowExecution execution, StepExecution step, ActionRequest request);
}
// ApproveHandler, RejectHandler, DelegateHandler, etc.
```

Critical bug: `findDepartmentHead()` always returns `null` — it's a stub with a debug log. Any workflow routed to `DEPARTMENT_HEAD` will silently fail. This is a production blocker for customers using department-head-based approval chains.

Workflow versioning has a gap: when a definition is updated while executions are active, a new version is created. But the execution doesn't record which definition version it was started under. If there's ever a dispute about "which rules applied to my leave approval", there's no way to reconstruct it.

**Verdict: Architecturally sound, implementation needs refactoring. The department head stub is a blocker.**

---

### 1.5 Repository Pattern + Specification Pattern (Backend)

**Quality: 8.5/10 — Excellent JPA usage**

Repositories use `JpaRepository` + `JpaSpecificationExecutor` composition consistently. `@EntityGraph` is used where it matters (e.g., `Employee` with eagerly loaded `User`). Custom `@Query` methods handle complex lookups (upcoming birthdays with date arithmetic, org chart hierarchy). Tenant isolation is enforced at the repository level — every method filters by `tenantId`.

The `DataScopeService` implements the Specification pattern for RBAC-based data filtering. It composes `Specification<T>` objects based on the user's permission scope (GLOBAL → LOCATION → DEPARTMENT → TEAM → SELF). This is elegant — the same repository method can serve different users with different visibility levels by composing different specifications.

Minor issue: the `tryAddPredicate()` helper swallows `IllegalArgumentException` when a field doesn't exist on an entity. This is defensive coding for generic specifications that apply across different entity types, but it makes debugging harder. A better approach: validate field existence at startup, not at query time.

**Verdict: Stable. This is clean, well-understood Spring Data JPA.**

---

### 1.6 Security Architecture (Backend)

**Quality: 9/10 — Enterprise-grade**

The security layering is textbook:

**Filter chain:** `RateLimitingFilter → TenantFilter → JwtAuthenticationFilter → CorrelationIdFilter → SecurityHeadersFilter → XssRequestWrapperFilter`

**Permission model:** JWT carries `module.action` permission strings (e.g., `employee.read`, `payroll.run`) with scope qualifiers (GLOBAL, DEPARTMENT, TEAM, SELF). The `DataScopeService` translates scopes into JPA specifications. `@RequiresPermission` aspects enforce method-level access.

**Multi-tenancy:** Thread-local `TenantContext` set by `TenantFilter`, propagated to all services. Every query filters by `tenantId`. Cache keys prefixed with `tenant:{tenantId}` to prevent cross-tenant cache collisions. PostgreSQL RLS as defense-in-depth (now re-enabled with TenantRlsTransactionManager).

**Token management:** httpOnly cookies (not localStorage — XSS-safe), CSRF double-submit, token blacklisting via Redis, token revocation by timestamp (for "log out all sessions" after password change), impersonation tokens for SuperAdmin cross-tenant access.

The BUG-009 fix is notable: async/scheduled jobs without tenant context were populating the permission cache with null tenant keys, causing cross-tenant permission leaks. The fix adds a `condition = "#root.target.isTenantContextPresent()"` guard on `@Cacheable`. This shows the team understands the subtleties of multi-tenant caching.

**Verdict: Ship-ready. One of the strongest security implementations I've reviewed for an HR SaaS.**

---

### 1.7 Encryption Service (Backend)

**Quality: 3/10 — Cryptographically broken, urgent fix needed**

This is the single worst component in the codebase. The `EncryptionService` uses:

- **AES in ECB mode** (Electronic Codebook) — the default when you call `Cipher.getInstance("AES")` without specifying a mode. ECB encrypts each block independently, meaning identical plaintext blocks produce identical ciphertext blocks. This leaks patterns.
- **No IV/Nonce** — deterministic encryption means the same input always produces the same output. An attacker can build a dictionary.
- **Zero-byte padding for short keys** — instead of using PBKDF2 or HKDF to derive a proper key from a passphrase, the code pads with `0x00` bytes. This dramatically reduces the effective key space.
- **Default key in code** — `"default-secure-key-change-in-production"` is the fallback. If the env var is missing, the app runs with a well-known key.

This service is used for encrypting API keys and sensitive fields. If an attacker dumps the database, they can trivially decrypt these values.

**Fix:** Replace with AES-256-GCM (authenticated encryption):
```java
Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
byte[] iv = new byte[12]; // 96-bit nonce
SecureRandom.getInstanceStrong().nextBytes(iv);
cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
// Prepend IV to ciphertext for decryption
```

**Verdict: Fix immediately. This is a security incident waiting to happen.**

---

### 1.8 Frontend: State Management Architecture

**Quality: 8/10 — Clean separation of concerns**

The frontend uses the right tool for each state category:

- **Server state:** React Query (TanStack Query v5) — 80+ custom hooks with stratified stale times (2min for lists, 5min for details, 10min for managers). Optimistic updates on mutations.
- **Auth state:** Zustand with sessionStorage persistence — stores user, permissions, roles. Not persisting tokens (they're in httpOnly cookies).
- **UI state:** React useState for local concerns (modals, tabs, form state).
- **Real-time state:** STOMP over SockJS with WebSocket provider — auto-reconnect with exponential backoff + jitter.

The React Query hook pattern is well-structured:
```typescript
const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (params) => [...employeeKeys.lists(), params] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id) => [...employeeKeys.details(), id] as const,
};
```

This query key factory pattern enables precise cache invalidation. The BUG-013 fix (documented inline) shows the team understands stale closure issues.

**Issue:** JWT decoding happens three times across login, Google login, and session restore flows — should be extracted to a shared helper. Permission extraction in `usePermissions` is O(n×m) nested loops while `useActiveApp` uses the more efficient Set-based approach. These are consistency issues, not architectural problems.

**Verdict: Stable, well-executed. Minor duplication to clean up.**

---

### 1.9 Frontend: API Client Architecture

**Quality: 8.5/10 — Production-grade security**

The Axios singleton in `client.ts` is one of the better API client implementations I've seen:

- `withCredentials: true` for cookie-based auth
- CSRF token extraction from cookie + injection via `X-XSRF-TOKEN` header
- Token refresh with promise deduplication (shared `refreshPromise` prevents concurrent refresh calls)
- Redirect debounce with 5-second window (prevents redirect loops when multiple 401s fire simultaneously)
- Tenant ID from localStorage sent in `X-Tenant-ID` header

**Missing:** No request timeout. Axios defaults to unlimited, which means a slow backend response will keep the connection open forever. Add `timeout: 30000` to the instance config.

**Missing:** No circuit breaker. If the backend is down, every component that uses React Query will retry independently, creating a thundering herd. Consider a global error handler that detects consecutive failures and shows a "Service unavailable" banner instead of per-component error states.

**Verdict: Strong. Add timeout and circuit breaker for production resilience.**

---

### 1.10 Frontend: Component Composition

**Quality: 6.5/10 — Monolithic pages, good atomic components**

The design system is excellent — `card-aura`, `table-aura`, `badge-status`, `input-aura` CSS classes provide consistent styling across 60+ pages. The `NuAuraLoader`, `SkeletonTable`, `EmptyState` components follow the design system precisely.

Where it falls apart: **page components are monolithic**. `payroll/page.tsx` has 28+ hook imports from a single `usePayroll.ts` file. Multiple `useState` calls manage modal visibility for create, view, edit, and delete dialogs. Zod schemas are defined inline at module scope. Tab content for Payroll Runs, Payslips, and Salary Structures all live in one file.

This is the "Big Ball of Mud" page anti-pattern. Each tab should be a separate component file with its own hooks, state, and schemas. The page component should be a thin router between tabs.

The AppSwitcher component is well-built — clean RBAC gating with lock icons, Framer Motion animations, proper keyboard navigation. The sidebar is app-aware with permission-filtered sections. These platform-level components show good craftsmanship.

**Verdict: Design system is excellent. Page components need decomposition.**

---

### 1.11 Frontend: Form Patterns

**Quality: 7.5/10 — Correct stack, needs extraction**

All forms use React Hook Form + Zod as mandated. The `zodResolver` integration is clean. TypeScript types are inferred from schemas via `z.infer<typeof schema>`.

Recurring pattern: `.optional().or(z.literal(''))` appears 10+ times across forms for optional string fields. This should be extracted:
```typescript
// lib/validations/common.ts
export const optionalString = () => z.string().optional().or(z.literal(''));
```

**Missing:** Server-side validation errors don't flow back to form fields. If the backend returns a 400 with field-level errors (`{ errors: { employeeCode: "Already exists" } }`), the form doesn't display them inline. The global error handler shows a toast notification, but the user doesn't see which field has the problem.

**Verdict: Mechanically correct, needs ergonomic improvements.**

---

## Part 2: Stability Assessment — What's Solid vs. What Will Break

### Rock Solid (Don't Touch)

| Component | Why It's Stable |
|-----------|----------------|
| Multi-tenant isolation (app layer) | Every query filters by tenantId. TenantContext is thread-safe. Cache keys are prefixed. |
| JWT auth + httpOnly cookies | No tokens in localStorage. CSRF double-submit. Token blacklisting via Redis. |
| Event publishing pipeline | Transactional outbox pattern. Kafka DLT. Idempotency service. |
| React Query data fetching | 80+ hooks following consistent patterns. Stale times are reasonable. |
| API client (Axios singleton) | Refresh dedup, redirect debounce, CSRF injection. |
| Design system (CSS variables) | Single source of truth for colors. Dark mode works automatically. |
| Flyway migrations | 36 migrations, out-of-order support, clean disabled. |
| RBAC permission model | `module.action` with scope qualifiers. Specification-based data filtering. |

### Needs Immediate Attention (Will Break Under Load)

| Component | Risk | Fix |
|-----------|------|-----|
| EncryptionService | ECB mode leaks patterns. Default key in code. | Replace with AES-256-GCM + managed key. |
| `findDepartmentHead()` stub | Returns null. Workflow type silently fails. | Implement the lookup from Department entity. |
| Monolithic page components | 1300+ LOC files are unmaintainable. | Extract tab content to separate components. |
| `getEmployee()` N+1 queries | 4 separate DB calls per detail fetch. | Use the batch map pattern from `getAllEmployees()`. |
| Missing domain events in LeaveService | Downstream consumers are blind. | Add LeaveRequestCreated/Approved/Rejected events. |
| No Axios request timeout | Slow backend = infinite client wait. | Add `timeout: 30000`. |

### Stable But Has Technical Debt

| Component | Debt | Priority |
|-----------|------|----------|
| WorkflowService (969 lines) | God methods, string-switch dispatch | Medium — refactor to Strategy pattern |
| Cache invalidation (`allEntries=true`) | Entire cache flushed on any write | Medium — use targeted key eviction |
| JWT decoded 3x in auth flows | Code duplication | Low — extract to shared helper |
| H2 tests mask PostgreSQL bugs | UUID, JSONB, RLS differences | Medium — migrate to Testcontainers |
| Sidebar rebuilds on badge count | Unnecessary re-render cascade | Low — memoize menu sections |
| `strictNullChecks: false` | Silent null propagation | High — incremental migration over 2 weeks |
| Duplicate date utility files | Two files, two libraries (date-fns + dayjs) | Low — consolidate when convenient |

---

## Part 3: Architectural Decisions — What I'd Change at FAANG Scale

### 3.1 Keep: Shared Schema Multi-Tenancy

At your current scale (< 1000 tenants, < 50K employees total), shared schema with `tenant_id` columns is the right choice. Database-per-tenant adds operational overhead (migration management, connection pool explosion) that isn't justified yet. The application-layer isolation + RLS defense-in-depth (now re-enabled) is sufficient.

**When to reconsider:** If you onboard a tenant with > 100K employees, their queries will contend with smaller tenants. At that point, consider database-per-tenant for large accounts only (hybrid approach).

### 3.2 Keep: Monolith Backend

The Spring Boot monolith with 137 controllers is the right choice. You don't have the team size or operational maturity for microservices yet. The service layer has clean domain separation — when you're ready to extract, the boundaries are clear (LeaveService → Leave microservice, PayrollService → Payroll microservice).

**When to reconsider:** When independent deployment of modules becomes a business requirement (e.g., payroll needs weekly releases but HR core is monthly).

### 3.3 Change: Add Command/Query Separation (CQRS-Lite)

The current services mix reads and writes. `EmployeeService.getEmployee()` and `EmployeeService.createEmployee()` live in the same class. At 500 lines+, these services become hard to reason about.

Split into `EmployeeQueryService` (reads, caching, projections) and `EmployeeCommandService` (writes, validation, events). This isn't full CQRS with separate databases — it's just a clean separation that makes services easier to test, cache, and optimize independently.

### 3.4 Change: Formalize Aggregate Boundaries

Define which service "owns" each entity and route all mutations through that owner. Example:

- `EmployeeAggregate`: owns Employee, EmployeeDocument, EmployeeAsset
- `LeaveAggregate`: owns LeaveRequest, LeaveBalance, LeaveType
- `PayrollAggregate`: owns PayrollRun, Payslip, SalaryComponent

Cross-aggregate references use IDs only (already the case). Cross-aggregate operations use domain events (partially implemented — needs LeaveService events).

### 3.5 Change: Replace EncryptionService with Vault Integration

Don't fix the broken encryption in-house. Integrate with HashiCorp Vault (or AWS KMS if you're on AWS). The transit secrets engine handles encryption/decryption with proper key management, rotation, and audit logging. This is a solved problem — don't re-solve it badly.

### 3.6 Change: Frontend Page Decomposition

Every page with tabs should follow this structure:
```
app/payroll/
  page.tsx              ← Thin wrapper with tab router
  _components/
    PayrollRunsTab.tsx  ← Self-contained with own hooks/state
    PayslipsTab.tsx
    SalaryTab.tsx
```

This enables route-level code splitting (each tab lazy-loaded), independent testing, and parallel development.

---

## Part 4: Maturity Scorecard

| Dimension | Score | FAANG Baseline | Gap |
|-----------|-------|----------------|-----|
| **Security** | 9/10 | 9/10 | EncryptionService is the only gap |
| **Multi-tenancy** | 8.5/10 | 9/10 | RLS just re-enabled, needs testing |
| **Data Layer** | 8/10 | 9/10 | N+1 queries, missing aggregate boundaries |
| **Event Architecture** | 9/10 | 9/10 | Excellent — matches FAANG patterns |
| **API Design** | 8/10 | 9/10 | OpenAPI documented, but no pagination standard |
| **Frontend Architecture** | 7.5/10 | 8.5/10 | Good patterns, monolithic pages |
| **Testing** | 6.5/10 | 8.5/10 | H2 instead of Testcontainers, 94 tests for 137 controllers |
| **Observability** | 7.5/10 | 9/10 | Prometheus + MDC logging, but no distributed tracing |
| **CI/CD** | 8/10 | 9/10 | Trivy scanning, Docker builds, but no staging environment |
| **Documentation** | 7/10 | 8/10 | Good inline docs, missing architecture decision records |

**Overall: 7.8/10** — Above average for a startup-stage SaaS. Below FAANG baseline primarily in testing depth and observability, which is expected at this stage.

---

## Part 5: The One-Page Summary

**What NU-AURA gets right that most startups don't:**
Multi-tenant security, event-driven workflows, httpOnly cookie auth, transactional event publishing, tenant-prefixed caching, RBAC with data scoping, and a genuine design system with CSS variables.

**What will hurt you first at scale:**
The EncryptionService is a liability. The N+1 queries will cause latency spikes. The monolithic page components will slow feature development. The missing domain events will create silent data inconsistencies.

**What to do this quarter:**
1. Replace EncryptionService with Vault/KMS (week 1-2)
2. Implement `findDepartmentHead()` (day 1 — it's a blocker)
3. Add domain events to LeaveService, PayrollService (week 1)
4. Extract payroll/employees pages into tab components (week 2-3)
5. Add Axios timeout and enable `strictNullChecks` incrementally (ongoing)

**What to do next quarter:**
1. Migrate tests to Testcontainers
2. Add distributed tracing (OpenTelemetry)
3. Implement CQRS-lite split (Query/Command services)
4. Formalize aggregate boundaries
5. Add architecture decision records (ADRs) for each locked-in decision

---

*End of Patterns Review*
