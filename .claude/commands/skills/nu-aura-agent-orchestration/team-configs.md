# NU-AURA Agent Teams Configurations

> **Prerequisite:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + Claude Code v2.1.32+
> **Token warning:** Teams use 10–15× tokens vs single session. Reserve for major efforts.
> **File ownership rule:** Every agent must work in distinct directories. Shared files need
> task-list coordination.

---

## Config 1: Full Feature Build (6 Agents)

**When:** Building a complete new module end-to-end (UI + API + DB + tests + docs).
**Ideal for:** Modules like Expense Management, Shift Management, Training, Wellness, NU-Fluence
Phase 2.
**Duration:** 1–2 hours of parallel agent work.

```
Spawn a team of 6 agents to build the {MODULE_NAME} module for {NU-HRMS | NU-Hire | NU-Grow | NU-Fluence}.

=== SHARED CONTEXT (all agents must know) ===
- Platform: NU-AURA multi-tenant bundle app (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence)
- Backend: Spring Boot 3.4.1, Java 17, package root: com.hrms
- Frontend: Next.js 14 + Mantine UI + Tailwind Sky palette + TypeScript strict
- DB: PostgreSQL, tenant_id UUID on all tables, RLS enforced
- Auth: JWT in cookies, roles only. Permissions from DB. @RequiresPermission("module.action") on every endpoint.
- SuperAdmin bypasses ALL checks. Never gate SuperAdmin.
- Flyway migrations: V0–V93 applied. NEXT = V94. File: V94__{desc}.sql
- Shared file protocol: Before editing SecurityConfig.java, application.yml, or apps.ts — post to task list and WAIT for acknowledgment.

=== AGENT ROLES ===

ARCHITECT (starts immediately, unblocks everyone):
"You are the NU-AURA Architect for the {MODULE_NAME} module.
Design: API contract (OpenAPI 3.0 style), Flyway V94 migration SQL (PostgreSQL), RBAC permission strings,
Mermaid sequence diagram for the key workflow.
Key requirements: {list the module requirements here}.
Post your design to the shared task list when complete — other agents are waiting for it.
Output: problem statement, 2+ design options with trade-offs, recommended approach, full API contract,
full Flyway SQL (V94__{module_name}.sql), Mermaid diagram, risks."

BACKEND-DEV (waits for architect design):
"You are the NU-AURA Backend Developer for the {MODULE_NAME} module.
WAIT for architect to post the design to the shared task list before starting.
Then implement:
- {ModuleName}Controller.java (backend/src/main/java/com/hrms/api/{module}/)
- {ModuleName}Service.java (backend/src/main/java/com/hrms/application/{module}/)
- {ModuleName}Repository.java (backend/src/main/java/com/hrms/domain/{module}/)
- {ModuleName}Entity.java (backend/src/main/java/com/hrms/domain/{module}/)
- DTOs as Java records (backend/src/main/java/com/hrms/common/dto/{module}/)
- MapStruct mapper interface
- Flyway migration from architect's SQL (backend/src/main/resources/db/migration/)
- JUnit 5 unit tests for all service methods
Rules: @RequiresPermission on every endpoint, tenant_id in all queries, @Transactional on mutating methods,
pagination on all list endpoints, audit logs for sensitive operations.
Post to task list as each file is complete."

FRONTEND-DEV (waits for architect API contract):
"You are the NU-AURA Frontend Developer for the {MODULE_NAME} module.
WAIT for architect to post the API contract to the shared task list before starting.
Then implement:
- frontend/app/{module}/page.tsx (main list page)
- frontend/app/{module}/[id]/page.tsx (detail/edit page)
- frontend/components/{module}/{ModuleName}Form.tsx (React Hook Form + Zod)
- frontend/components/{module}/{ModuleName}Table.tsx (Mantine DataTable with pagination)
- frontend/lib/hooks/use{ModuleName}.ts (React Query hooks — useQuery/useMutation)
- frontend/lib/services/{module}Service.ts (Axios calls using existing frontend/lib/api/ client)
Rules: TypeScript strict (no any), Mantine UI components, Tailwind Sky palette (sky-700),
React Hook Form + Zod for ALL forms, React Query for ALL data fetching,
NEVER create a new Axios instance.
Post to task list as each file is complete."

QA-ENGINEER (waits for backend + frontend):
"You are the NU-AURA QA Engineer for the {MODULE_NAME} module.
WAIT for backend-dev and frontend-dev to post their completions to the task list.
Then produce:
1. RBAC boundary test matrix (all 10 roles × all endpoints)
2. Edge case scenarios (nulls, unicode, XSS, cross-tenant, concurrent)
3. JUnit integration tests: @SpringBootTest for {ModuleName}Controller endpoints
4. Playwright E2E test spec: frontend/e2e/{module}.spec.ts covering full CRUD flow
5. Bug reports for any issues found (table: ID | Severity | Steps | Expected | Actual)
Roles to test: Super Admin, Tenant Admin, HR Admin, App Admin, HR Manager, Hiring Manager, Team Lead, Employee, Candidate, Viewer."

DEVOPS (starts independently, works in parallel):
"You are the NU-AURA DevOps Engineer.
While the feature team builds, prepare the infrastructure updates:
1. If {module} needs a new service/volume: update docker-compose.yml — post to task list first.
2. Add the {module} test job to .github/workflows/ci.yml
3. Create/update K8s deployment manifest if needed: deployment/kubernetes/{module}-deployment.yaml
4. Document new environment variables (table: NAME | DESCRIPTION | EXAMPLE | REQUIRED)
5. Add health check endpoint reference if the module has async processing
Rules: never hardcode secrets, all containers need health checks, multi-stage Docker builds."

TECH-WRITER (works incrementally as others complete):
"You are the NU-AURA Tech Writer for the {MODULE_NAME} module.
Monitor the task list and document as other agents complete their work:
1. Add SpringDoc @Operation, @Tag, @ApiResponse annotations to {ModuleName}Controller.java
2. Create docs/modules/{module-name}.md (module README: overview, architecture, API reference, data model, testing)
3. If significant design decisions were made: create docs/adr/ADR-{next}-{decision}.md
4. Update the main MEMORY.md if new architectural patterns were introduced
Start after architect posts design. Refine as backend and frontend complete."

=== DEPENDENCY ORDER ===
1. architect completes → unblocks: backend-dev, frontend-dev, tech-writer
2. backend-dev completes API → unblocks: frontend-dev (can switch to real API), qa-engineer
3. backend-dev + frontend-dev complete → unblocks: qa-engineer (E2E tests)
4. devops: works independently from minute 0
5. tech-writer: works incrementally, finishes last

=== SUCCESS CRITERIA ===
- All endpoints have @RequiresPermission with correct permission strings
- All list endpoints paginated
- TypeScript strict passes (npx tsc --noEmit = 0 errors)
- JUnit unit tests written for all service methods
- RBAC boundary tests cover all 10 roles
- Flyway migration is V94 (or next available number)
- No tenant_id filtering gaps
```

---

## Config 2: Cross-Module Refactor (4 Agents)

**When:** Changing something that spans multiple sub-apps — RBAC model, DB schema, permission
format, auth flow, shared components.

```
Spawn a team of 4 agents for a cross-module refactor.

=== SHARED CONTEXT ===
- NU-AURA: Multi-tenant bundle (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence)
- Monolith: single Spring Boot app, package root com.hrms
- Frontend: Next.js 14, single Next.js app, sub-apps share auth/state
- Critical shared files (COORDINATE before touching):
  SecurityConfig.java, JwtAuthenticationFilter.java, JwtTokenProvider.java,
  apps.ts (route-to-app mapping), middleware.ts (auth/OWASP headers),
  application.yml, docker-compose.yml
- Flyway next migration: V94

TEAMMATE 1 — "core-layer":
"Implement the core {refactor description} change.
Work exclusively in:
- backend/src/main/java/com/hrms/common/config/  (SecurityConfig, JwtAuthFilter)
- backend/src/main/java/com/hrms/common/security/ (permission evaluation)
- backend/src/main/resources/db/migration/ (Flyway migration if schema changes)
Ensure backward compatibility — existing behavior must be preserved.
Post to task list: (a) what changed, (b) any new interfaces/contracts other agents must implement, (c) completion status."

TEAMMATE 2 — "module-migration":
"Wait for core-layer to post its changes.
Then update all sub-app modules to use the new {contracts/patterns/formats}.
Focus in order: NU-HRMS (backend/src/main/java/com/hrms/api/hrms/),
then NU-Hire (com/hrms/api/hire/), then NU-Grow (com/hrms/api/grow/).
Do NOT touch SecurityConfig or shared infrastructure — that's core-layer's domain.
Post progress to task list as each sub-app is migrated."

TEAMMATE 3 — "frontend-migration":
"Wait for core-layer to post what changed.
Then update the frontend to align with the new {contracts/patterns/formats}:
- frontend/lib/stores/ (Zustand auth store)
- frontend/lib/hooks/ (permission hooks, useActiveApp)
- frontend/components/platform/ (AppSwitcher, Header, Sidebar)
- frontend/middleware.ts (if auth or routing logic changed)
- Any component using the changed pattern
Run npx tsc --noEmit after your changes — must be 0 errors.
Post progress to task list."

TEAMMATE 4 — "regression-tester":
"Start writing test scaffolds immediately based on the refactor goal.
FILL IN ASSERTIONS as teammates post their changes.
Produce:
1. Regression test matrix: what must still work after this refactor
2. JUnit tests for the core layer changes
3. Tests for backward compatibility (old patterns must still work during migration)
4. Playwright E2E smoke tests for: login, permission check, cross-module navigation
5. Bug report for any regressions discovered

Special attention:
- All 10 roles must still authenticate and reach their pages
- SuperAdmin bypass must still work
- Permission cache invalidation must still work after role changes"

=== COORDINATION PROTOCOL ===
Before any agent touches a SHARED FILE: post "REQUESTING EDIT: {filename} — reason" to task list.
Wait for acknowledgment from team lead (you) or until 5 minutes pass with no objection.
After editing: post "COMPLETED EDIT: {filename} — what changed"
```

---

## Config 3: Bug Hunt — Competing Hypotheses (3 Agents)

**When:** Complex intermittent bugs, cross-cutting issues, production incidents where root cause is
unknown.

```
Spawn 3 agents to debug: "{Exact bug description with symptoms, frequency, and affected users/roles}"

=== INVESTIGATION RULES ===
- Each agent has a different hypothesis about the root cause
- All agents post findings to the shared task list
- Each agent MUST challenge the other agents' hypotheses
- The hypothesis that survives peer review is the root cause
- Do NOT fix anything — only diagnose and propose. You (team lead) approve and fix.

TEAMMATE 1 — "auth-investigator":
"Investigate the authentication and authorization layer.
Check:
- JwtTokenProvider: token expiration, refresh rotation, clock skew
- JwtAuthenticationFilter: token parsing, role extraction, error handling
- SecurityConfig: filter chain, route patterns, CORS settings
- Redis session cache: TTL alignment with JWT expiry, eviction policy
- PermissionAspect: how @RequiresPermission is evaluated, exception paths
Files: backend/src/main/java/com/hrms/common/config/SecurityConfig.java
       backend/src/main/java/com/hrms/common/security/JwtAuthenticationFilter.java
       backend/src/main/java/com/hrms/common/security/JwtTokenProvider.java
       backend/src/main/java/com/hrms/common/security/PermissionAspect.java

Post findings with: (a) what you found, (b) your hypothesis, (c) evidence, (d) challenge to other investigators."

TEAMMATE 2 — "data-investigator":
"Investigate the data and query layer.
Check:
- Repository queries: are tenant_id filters present on all queries for affected entities?
- PostgreSQL RLS: is RLS enabled and enforced on the affected tables?
- N+1 patterns: could query load cause timeouts that manifest as auth errors?
- Flyway migrations: did a recent migration change a critical table or index?
- Entity relationships: could a missing fetch strategy cause LazyInitializationException?
Files: backend/src/main/java/com/hrms/domain/ (affected entity and repository)
       backend/src/main/resources/db/migration/ (recent migrations V85–V93)

Post findings with: (a) what you found, (b) your hypothesis, (c) evidence, (d) challenge to other investigators."

TEAMMATE 3 — "cache-infra-investigator":
"Investigate the caching and infrastructure layer.
Check:
- Redis: permission cache TTL, eviction policy, memory usage, connection pool
- SecurityService.getCachedPermissions(): cache key format, cache miss handling
- Bucket4j rate limiting: could rate limit be hitting legitimate users?
- Kafka: could a backpressure issue cause delayed event processing affecting state?
- Application.yml: any misconfiguration that could be environment-specific?
Files: backend/src/main/java/com/hrms/application/security/SecurityService.java
       backend/src/main/java/com/hrms/common/config/RedisConfig.java
       backend/src/main/resources/application.yml

Post findings with: (a) what you found, (b) your hypothesis, (c) evidence, (d) challenge to other investigators."

=== CONVERGENCE PROTOCOL ===
After all 3 post initial findings:
- Each reads the other 2 reports
- Each challenges: "Why couldn't X explain this instead of Y?"
- You (team lead) review all 3 final hypotheses
- The hypothesis that explains ALL symptoms and survives peer challenge = root cause
- You then spawn a @dev subagent with the confirmed root cause to implement the fix
```

---

## Config 4: Sprint Execution (5 Agents — Independent Tickets)

**When:** 3–5 independent tickets with no shared state or file dependencies.

```
Spawn 5 agents for sprint execution. Each agent owns one ticket end-to-end.

=== SHARED CONTEXT ===
- NU-AURA multi-tenant platform. All code follows CLAUDE.md conventions.
- Flyway next migration: V94 (first agent to need a migration gets V94, next gets V95, etc.)
- Coordination rule: If 2+ agents need Flyway migrations, coordinate numbering via task list.
- Before touching any shared config file: post to task list and wait.
- Each agent: post "STARTED", progress updates, and "COMPLETED" to task list.

TEAMMATE 1 — "ticket-{ID}":
"Implement {TICKET-ID}: {ticket title}
Backend: {specific endpoints, service methods, files}
Frontend: {specific pages, components, files}
Tests: {what to test}
RBAC: {which roles can access — permission string}
Constraints: {any limits, SLAs, file size limits, etc.}
Migration: If needed, claim V94 (post to task list first)."

TEAMMATE 2 — "ticket-{ID}":
"Implement {TICKET-ID}: {ticket title}
[same structure as above]"

TEAMMATE 3 — "ticket-{ID}":
"Implement {TICKET-ID}: {ticket title}
[same structure as above]"

TEAMMATE 4 — "ticket-{ID}":
"Implement {TICKET-ID}: {ticket title}
[same structure as above]"

TEAMMATE 5 — "ticket-{ID}":
"Implement {TICKET-ID}: {ticket title}
[same structure as above]"

=== POST-SPRINT CHECKLIST ===
After all agents complete:
□ npx tsc --noEmit = 0 errors
□ All new endpoints have @RequiresPermission
□ All new tables have tenant_id
□ Flyway migrations numbered correctly (no gaps, no duplicates)
□ Unit tests written for all service methods
□ No `any` in TypeScript
□ No new Axios instances created
```

---

## Dependency Pattern Reference

```
Sequential Chain (design → build → test → review → docs):
architect ──→ backend ──→ qa ──→ reviewer ──→ tech-writer

Fan-Out / Fan-In (parallel build, unified test):
          ┌──→ backend-dev ──┐
architect─┤                   ├──→ qa-engineer ──→ reviewer
          └──→ frontend-dev ──┘
devops ────────────────────────→ (fully independent)

Fully Parallel (independent tickets — fastest, highest token cost):
ticket-1 ──────────────────────→ done
ticket-2 ──────────────────────→ done
ticket-3 ──────────────────────→ done

Debate (competing hypotheses — bug investigation):
investigator-1 ──┐
investigator-2 ──┼──→ challenge ──→ converge ──→ root cause
investigator-3 ──┘
```

## Team Budget Reference

| Config                | Agents | Est. Token Multiplier | Best For                         |
|-----------------------|--------|-----------------------|----------------------------------|
| Full Feature Build    | 6      | 10–15×                | New module from scratch          |
| Cross-Module Refactor | 4      | 6–10×                 | Platform-wide changes            |
| Bug Hunt              | 3      | 5–8×                  | Unknown root cause, complex bugs |
| Sprint Execution      | 5      | 8–12×                 | Multiple independent tickets     |
