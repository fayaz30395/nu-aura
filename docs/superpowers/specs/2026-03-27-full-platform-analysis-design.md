# NU-AURA Full Platform Analysis — Agent Team Design

**Date:** 2026-03-27
**Status:** Approved (revised after spec review)
**Goal:** Comprehensive multi-layer analysis of the entire NU-AURA platform — find every issue and fix it, looping until clean.

---

## 1. Problem Statement

NU-AURA is a large-scale HRMS platform (1,622 Java files, 11,701 TS/TSX files, 200+ page routes, 254 DB tables, 4 sub-apps). Prior QA rounds have been incremental. This effort is a full-stack, zero-tolerance sweep: UI, code health, API contracts, integration health, and security — with an autonomous fix loop that runs until the platform is clean.

---

## 2. Approach: Parallel Agent Team by Analysis Layer

Six specialized discovery agents run in parallel (each uses distinct tools, zero resource contention). Their findings merge into a unified report. A fixer agent processes the report. The entire cycle repeats until no issues remain.

---

## 3. Agent Specifications

### Agent 1: UI/QA Sweep

**Purpose:** Browser-test all accessible routes, capture runtime errors.

**Scope:**
- All 200+ page routes across NU-HRMS (~95% built), NU-Hire (~92%), NU-Grow (~90%)
- Skip NU-Fluence (Phase 2 — frontend UI not started)
- Must log in as SuperAdmin to access all routes

**Session management:**
- Login at start, store JWT cookie
- After every 20 routes, verify session is still active (hit `/api/v1/auth/me`)
- If 401 received, re-login automatically before continuing
- Dynamic routes (e.g., `/employees/:id`) — skip with 404 as expected; only flag if list routes also fail

**Checks per route:**
- JavaScript console errors (warnings, errors, unhandled rejections)
- Failed network requests (4xx, 5xx responses)
- Broken layouts (overflow, missing styles, overlapping elements)
- Empty data states (tables with no rows, missing fallback UI)
- Loading spinners that never resolve (stuck states)
- Missing images or broken asset references

**Tools:** Chrome DevTools MCP (navigate, console messages, network requests, screenshots)

**Output:** Excel bug report with columns: Module, Route, Bug Type, Description, Severity, Screenshot Path, Console Error, Network Error

---

### Agent 2: TypeScript Health

**Purpose:** Static analysis of the entire frontend codebase for code quality violations.

**Checks:**
1. `npx tsc --noEmit` — capture all TypeScript compilation errors
2. `any` type usage — grep for `: any`, `as any`, `<any>` (violates strict mode rule)
3. Raw data fetching — `useEffect` + `fetch`/`axios.get` patterns outside React Query (should use `useQuery`/`useMutation`)
4. Axios instance violations — `new axios` or `axios.create` (must use existing instance in `frontend/lib/`)
5. Uncontrolled forms — grep for files with `<form` or `<input` that import `useState` but NOT `useForm` from react-hook-form. Manual review only (high false-positive rate — flagged, not auto-fixed)
6. Dead imports — imported symbols not referenced in the file
7. Console.log statements left in production code
8. Unused React Query hooks — hook files in `frontend/lib/hooks/` that export `useQuery`/`useMutation` but are never imported by any component or page
9. Missing error states in mutations — `useMutation` calls where the component JSX doesn't reference `error` or `isError` (users won't see failure feedback)

**Tools:** Bash (`tsc`, `npx`), Grep, Read

**Output:** Structured list with: File, Line, Violation Type, Current Code, Suggested Fix, Auto-fixable (yes/no)

---

### Agent 3: Backend Code Health

**Purpose:** Scan all 209 services and 151 controllers for Java anti-patterns and bugs.

**Checks:**
1. **LazyInitializationException risks** — Methods in `@Scheduled` jobs or async handlers that access lazy-loaded entity relationships without `@Transactional`. Pattern: entity getter calls on proxy objects outside a Hibernate session. (Known bug: `ApprovalEscalationJob.java:131`)
2. **Missing tenant_id filters** — Repository queries (custom `@Query` or method names) that don't include `tenantId` as a parameter. Note: some queries may be filtered at the service layer or via a Hibernate filter/aspect — check for `TenantContext` usage in the calling service before flagging. All findings go to manual review (never auto-fixed).
3. **Missing @Transactional** — Service methods that call `.save()`, `.delete()`, or `.saveAll()` without `@Transactional` on the method or class.
4. **N+1 query patterns** — Loops that call repository methods inside iteration (e.g., `for (entity : list) { repo.findBy...(entity.getId()) }`)
5. **Missing test coverage** — Controllers and services without ANY corresponding test class in the test directory (existence check, not coverage percentage).
6. **Unclosed resources** — Streams, InputStreams, or connections not wrapped in try-with-resources.
7. **Missing audit log writes** — Service methods performing critical operations (delete, approve, reject, create employee, modify payroll) without corresponding `auditService` or `AuditLog` calls.
8. **Kafka producer exception handling** — Services publishing to Kafka topics without try-catch. If a publish fails, the transaction may commit but the event is lost.

**Tools:** Grep, Read, Bash (compile check via `./mvnw compile`)

**Output:** Structured list with: File, Line, Issue Type, Severity (Critical/High/Medium), Description, Auto-fixable (yes/no)

---

### Agent 4: API Contract Audit

**Purpose:** Hit live API endpoints to verify correctness.

**Prerequisites:** Backend running on localhost:8080. Obtain SuperAdmin JWT via login endpoint.

**Checks:**
1. **Health check** — `GET /actuator/health` returns 200
2. **Auth flow** — `POST /api/v1/auth/login` returns JWT in httpOnly cookie, verify cookie attributes
3. **CRUD sampling** — For each business module (employees, departments, attendance, leave, payroll, benefits, assets, expenses, loans, compensation, recruitment, onboarding, performance, training, recognition, surveys, wellness, helpdesk, projects, time-tracking, travel, contracts, documents, notifications), hit `GET /api/v1/{module}` (list) and verify: 200 response, valid JSON, correct pagination structure. Derive full endpoint list from controller scan.
4. **Permission enforcement** — Hit 5 protected endpoints without auth → expect 401. Hit with EMPLOYEE role against admin endpoints → expect 403.
5. **CORS headers** — Send preflight OPTIONS request, verify `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`
6. **Rate limiting** — Send 6 rapid requests to `/api/v1/auth/login` → verify 429 on request 6 (limit is 5/min)
7. **Error response format** — Verify all error responses follow consistent JSON structure (message, status, timestamp)

**Tools:** Bash (curl), Read

**Output:** Pass/fail matrix with: Endpoint, Method, Expected Status, Actual Status, Response Time, Notes

---

### Agent 5: Integration Health

**Purpose:** Verify all infrastructure connections and background processes are healthy.

**Checks:**
1. **Kafka** — Check `/actuator/health` for Kafka status. Grep backend logs for consumer group activity on all 5 topics. Check for DLT (dead-letter topic) events in logs.
2. **Redis** — Verify via actuator health. Test permission cache by checking logs for `getCachedPermissions` calls after login.
3. **MinIO** — Check actuator health. Verify default buckets exist.
4. **Elasticsearch** — Check actuator health. Verify NU-Fluence content index exists.
5. **Scheduled jobs** — Grep backend logs for all 24 `@Scheduled` job executions. Flag any that threw exceptions (like the known `ApprovalEscalationJob` LazyInit error).
6. **WebSocket/STOMP** — Verify the STOMP endpoint at `/ws` is accessible.
7. **Database** — Check connection pool health via actuator. Verify Flyway migration status is clean.

**Log strategy:** Backend runs via `./start-backend.sh` which outputs to stdout. Agent captures recent log output (last 500 lines) via process inspection. For scheduled jobs, use actuator endpoints (`/actuator/scheduledtasks`) if available, or grep for `@Scheduled` method names in log output. For DLT events, query the `FailedKafkaEvent` table directly via API or actuator.

**Tools:** Bash (curl, grep logs), Read, Grep

**Output:** Infrastructure health matrix: Service, Status (UP/DOWN/DEGRADED), Last Error, Details

---

### Agent 6: Security & RBAC Audit

**Purpose:** Deep verification of the security layer against documented requirements.

**Checks:**
1. **Permission matrix completeness** — Extract all `@RequiresPermission("X:Y")` annotations from controllers. Cross-reference against `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`. Flag: permissions used in code but not in matrix, permissions in matrix but not used in code.
2. **SuperAdmin bypass** — Verify the bypass pattern exists in all 4 locations:
   - `PermissionAspect.java` — `SecurityContext.isSuperAdmin()` check
   - `FeatureFlagAspect.java` — same pattern
   - `frontend/lib/hooks/usePermissions.ts` — `isAdmin` check
   - `frontend/middleware.ts` — SUPER_ADMIN role bypass
3. **OWASP headers** — Hit an API endpoint and verify all security headers: X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy, CSP
4. **CSRF** — Verify double-submit cookie pattern: login sets XSRF-TOKEN cookie, subsequent requests must include X-XSRF-TOKEN header
5. **Password policy** — Read `PasswordValidator` and verify it enforces: 12+ chars, uppercase, lowercase, digit, special char, max 3 consecutive identical, history of 5, 90-day max age
6. **Public endpoints** — Verify only the 6 known public controllers are accessible without auth (Auth, MFA, PaymentWebhook, Tenant, PublicCareer, PublicOffer). Hit ALL controllers' first GET endpoint without auth — verify 401 for all except the 6 public ones (not just a 10-sample spot-check).
7. **Frontend/backend permission alignment** — For each frontend route that checks a permission via `usePermissions` or `requiredPermission`, verify the corresponding backend controller has a matching `@RequiresPermission`. Flag routes where frontend gates on a permission that backend doesn't enforce (false sense of security).
8. **Unused reserved permissions** — Permissions in the matrix doc but not used in any controller are flagged as WARNING (not FAIL) since they may be reserved for future features.

**Tools:** Grep, Read, Bash (curl)

**Output:** Security compliance matrix: Check, Expected, Actual, Status (PASS/FAIL), Details

---

### Agent 7: Fixer

**Purpose:** Consolidate findings, auto-fix what's possible, flag what needs manual intervention.

**Input:** Combined output from Agents 1-6.

**Triage severity:**
- **Critical** — 500 errors on routes, security gaps (missing auth on endpoints), data leaks (missing tenant_id)
- **High** — LazyInitializationException, missing @Transactional, broken UI pages
- **Medium** — TypeScript `any` types, missing tests, console.log in production
- **Low** — Cosmetic issues, dead imports, code style

**Auto-fix scope (SAFE — agent can apply directly):**
- UI bugs: Use `nu-aura-dev` skill patterns (read codebase, apply targeted fixes)
- TypeScript violations: Replace `any` with proper interface types (trace type flow, recompile after each fix)
- Add missing imports, remove dead imports
- Remove console.log statements
- Add `@Transactional` to service methods that do writes (EXCLUDING `@Scheduled` methods — see forbidden list)

**FORBIDDEN auto-fixes (must go to manual review):**
- **NEVER** change `FetchType.LAZY` to `FetchType.EAGER` — risk of cartesian products and performance regression
- **NEVER** add `JOIN FETCH` to queries — risk of N+1 inversions and pagination breakage
- **NEVER** add `@Transactional` to `@Scheduled` methods — may break intentional partial-failure tolerance
- **NEVER** modify repository queries to add `tenant_id` — risk of breaking aspect-filtered or cross-tenant admin queries
- **NEVER** create Flyway migrations
- **NEVER** modify `SecurityConfig.java`

**Manual review flags:**
- All fetch strategy changes (LazyInit fixes require human decision on JOIN FETCH vs. DTO projection vs. `@EntityGraph`)
- Tenant_id filter additions (need to verify service-layer filtering isn't already present)
- `@Transactional` on `@Scheduled` or `@Async` methods
- Database migrations required
- Architectural changes (restructuring components)
- Permission matrix updates (needs business validation)
- Changes to SecurityConfig

**Post-fix validation:**
- `cd frontend && npx tsc --noEmit` — must pass
- `cd backend && ./mvnw compile -q` — must pass

---

## 4. Convergence Loop

The system runs in a loop until clean:

```
LOOP:
  Phase 1: Dispatch Agents 1-6 in parallel
  Phase 2: Merge findings into unified report
  Phase 3: Agent 7 fixes all auto-fixable issues
  Phase 4: Verify (tsc --noEmit + backend compile)
  Phase 5: Re-run Agents 2, 3 (static analysis) to check for regressions
  IF new issues found → GOTO Phase 3
  IF clean → EXIT LOOP
```

**Loop termination criteria:**
- Zero TypeScript compilation errors
- Zero backend compilation errors
- Zero NEW auto-fixable issues found by static analysis re-scan (manual-review items do NOT block convergence)
- All auto-fixable issues resolved or escalated

**Cycle detection rule:** If the same issue (same file, same line, same type) appears in 2 consecutive iterations, it is automatically escalated to manual review and excluded from future iterations. This prevents thrashing where fix A introduces issue B which reintroduces issue A.

**Max iterations:** 5 (to prevent infinite loops on intractable issues). After 5 iterations, surface ALL remaining issues to user with a summary of what was attempted and why it didn't converge.

**Phase 1 runs fully only on iteration 1.** Subsequent iterations only re-run Agents 2 and 3 (static analysis) since UI, API, integration, and security checks don't change from code fixes alone.

---

## 5. Execution Constraints

- **Parallelism:** Agents 1-6 run as parallel sub-agents. Agent 7 runs sequentially after.
- **Isolation:** Each agent works in read-only mode during discovery. Only Agent 7 writes code changes.
- **No new packages:** Agents must not add npm or Maven dependencies.
- **No migrations:** Agents must not create Flyway migrations. Flag as manual review.
- **Existing patterns:** Fixes must follow existing codebase patterns (read before write).
- **Git safety:** No commits during the loop. All changes are uncommitted. User decides when to commit.

---

## 6. Known Issues (Pre-discovered)

| Issue | Location | Severity |
|-------|----------|----------|
| LazyInitializationException in ApprovalEscalationJob | `ApprovalEscalationJob.java:131` | High |
| Docker frontend build SIGBUS | `Dockerfile:10` (memory issue during `next build` in Docker) | Medium (dev workflow only) |

---

## 7. Output Deliverables

1. **Unified Excel report** — All findings from all agents, categorized by module, severity, and status (fixed/manual-review/wont-fix)
2. **Code changes** — Uncommitted fixes in the working tree
3. **Summary** — Concise list of what was fixed and what needs manual attention
