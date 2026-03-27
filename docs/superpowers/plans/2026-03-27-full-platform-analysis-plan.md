# NU-AURA Full Platform Analysis — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks 1-6 are INDEPENDENT and MUST run in parallel. Task 7+ are sequential.

**Goal:** Deploy 6 parallel analysis agents across UI, TypeScript, backend, API, integration, and security layers. Merge findings. Auto-fix safe issues. Loop until clean.

**Architecture:** Parallel discovery phase (6 agents) → merge → fix → verify → re-scan loop (max 5 iterations). Each agent produces a structured JSON findings file. The fixer reads all findings, applies safe fixes, and re-runs static analysis until convergence.

**Tech Stack:** Bash, Grep, Read, Chrome DevTools MCP, curl, npx tsc, Excel (openpyxl via nu-aura-dev skill patterns)

**Spec:** `docs/superpowers/specs/2026-03-27-full-platform-analysis-design.md`

---

## Task 1: Agent 2 — TypeScript Health Analysis (PARALLEL)

**Files:**
- Read: `frontend/` (entire frontend codebase)
- Create: `docs/superpowers/reports/typescript-health.json`

- [ ] **Step 1: Run TypeScript compiler check**

```bash
cd /sessions/wizardly-eager-franklin/mnt/nu-aura/frontend && npx tsc --noEmit 2>&1 | head -500
```

Capture all errors. Parse into structured format: `{file, line, code, message}`.

- [ ] **Step 2: Scan for `any` type violations**

```bash
# Grep for : any, as any, <any> — exclude node_modules, .next, type definition files from libraries
cd /sessions/wizardly-eager-franklin/mnt/nu-aura/frontend
```
Use Grep tool with patterns:
- `: any` in `**/*.{ts,tsx}` (exclude `node_modules`, `.next`)
- `as any` in `**/*.{ts,tsx}`
- `<any>` in `**/*.{ts,tsx}`

For each hit, record: file, line number, surrounding context.

- [ ] **Step 3: Scan for raw data fetching patterns**

Use Grep tool to find files importing `useEffect` that also contain `fetch(` or `axios.get(` or `axios.post(` but do NOT import from `@tanstack/react-query` or use `useQuery`/`useMutation`. These should use React Query instead.

Pattern: Files in `frontend/app/` and `frontend/components/` that match `useEffect` AND (`fetch(` OR `axios.`) but NOT `useQuery`.

- [ ] **Step 4: Scan for Axios instance violations**

```bash
# Must use existing client at frontend/lib/api/client.ts
```
Use Grep tool for:
- `axios.create` in `**/*.{ts,tsx}` (exclude `frontend/lib/api/client.ts` and `frontend/lib/api/public-client.ts`)
- `import axios from` in `**/*.{ts,tsx}` (direct imports instead of using the client)

- [ ] **Step 5: Scan for console.log statements**

Use Grep for `console.log` in `frontend/app/**/*.{ts,tsx}` and `frontend/components/**/*.{ts,tsx}` and `frontend/lib/**/*.{ts,tsx}`. Exclude test files.

- [ ] **Step 6: Scan for unused React Query hooks**

For each file in `frontend/lib/hooks/`:
1. Extract exported function names (e.g., `useGetEmployees`)
2. Grep the rest of the codebase for imports of that name
3. If zero imports found, flag as unused

- [ ] **Step 7: Scan for missing error states in mutations**

Use Grep to find files that call `useMutation` but don't reference `error` or `isError` in the same file. These mutations silently swallow failures.

- [ ] **Step 8: Compile findings into JSON report**

Write all findings to `docs/superpowers/reports/typescript-health.json` with structure:
```json
{
  "agent": "typescript-health",
  "timestamp": "2026-03-27T...",
  "findings": [
    {
      "file": "frontend/app/employees/page.tsx",
      "line": 42,
      "type": "any-type",
      "severity": "medium",
      "description": "Uses `: any` for employee prop",
      "current_code": "const data: any = ...",
      "auto_fixable": true
    }
  ],
  "summary": {
    "tsc_errors": 0,
    "any_types": 0,
    "raw_fetch": 0,
    "axios_violations": 0,
    "console_logs": 0,
    "unused_hooks": 0,
    "missing_error_states": 0
  }
}
```

---

## Task 2: Agent 3 — Backend Code Health Analysis (PARALLEL)

**Files:**
- Read: `backend/src/main/java/com/hrms/` (entire backend)
- Create: `docs/superpowers/reports/backend-health.json`

- [ ] **Step 1: Run backend compilation check**

```bash
cd /sessions/wizardly-eager-franklin/mnt/nu-aura/backend && ./mvnw compile -q 2>&1
```

Capture any compilation errors.

- [ ] **Step 2: Scan for LazyInitializationException risks**

Find all `@Scheduled` methods and `@Async` methods. For each:
1. Read the method body
2. Check if it accesses entity relationships (getter calls on entities loaded from repo)
3. Check if the method or class has `@Transactional`
4. If no `@Transactional` and accesses lazy relations → flag as HIGH severity

Known hit: `backend/src/main/java/com/hrms/application/workflow/scheduler/ApprovalEscalationJob.java:131`

Use Grep for `@Scheduled` across all Java files, then Read each file to inspect method bodies.

- [ ] **Step 3: Scan for missing @Transactional on write methods**

Use Grep to find service methods that call `.save(`, `.delete(`, `.saveAll(`, `.deleteAll(` but whose class or method lacks `@Transactional`.

Strategy:
1. Grep for `.save(` in `**/service/**/*.java`
2. For each hit, Read the file and check if `@Transactional` is on the method or the class
3. Exclude `@Scheduled` methods (those go to manual review per spec)

- [ ] **Step 4: Scan for N+1 query patterns**

Use Grep to find `for` or `forEach` loops in service files that contain repository method calls inside the loop body. Pattern: a line with `repo.find` or `repository.find` inside a block that starts with `for (` or `.forEach(` or `.stream().map(`.

- [ ] **Step 5: Scan for missing test coverage**

Strategy:
1. List all controllers: `find backend/src/main/java -name "*Controller.java"`
2. List all services: `find backend/src/main/java -name "*Service.java" -not -name "*ServiceImpl.java"`
3. List all test classes: `find backend/src/test -name "*Test.java" -o -name "*Tests.java"`
4. For each controller/service, check if a corresponding test file exists
5. Flag missing tests as MEDIUM severity

- [ ] **Step 6: Scan for missing audit log writes**

Use Grep to find service methods with names containing `delete`, `approve`, `reject`, `create`, `update` in critical domains (employee, payroll, leave, attendance). Check if these methods reference `auditService` or `AuditLog` or `audit`. Flag methods that perform critical operations without audit logging.

- [ ] **Step 7: Scan for Kafka producer exception handling**

Use Grep for `kafkaTemplate.send` or `.send(` in files that also import `KafkaTemplate`. Check if the send call is wrapped in try-catch. Flag unprotected sends as MEDIUM severity.

- [ ] **Step 8: Scan for missing tenant_id in repository queries**

Use Grep for `@Query` annotations in repository files. For each custom query, check if it includes `tenantId` or `tenant_id` in the WHERE clause. Cross-reference with the service layer to check for `TenantContext` usage. ALL findings go to manual review (never auto-fixed per spec).

- [ ] **Step 9: Compile findings into JSON report**

Write to `docs/superpowers/reports/backend-health.json` with same structure as Task 1.

---

## Task 3: Agent 4 — API Contract Audit (PARALLEL)

**Files:**
- Read: `backend/src/main/java/**/controller/` (for endpoint discovery)
- Create: `docs/superpowers/reports/api-contracts.json`

- [ ] **Step 1: Check health endpoint**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health
```

Expected: 200

- [ ] **Step 2: Login as SuperAdmin and capture JWT**

```bash
curl -s -c /tmp/nu-aura-cookies.txt -b /tmp/nu-aura-cookies.txt \
  -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@nulogic.com","password":"SuperAdmin@123"}' \
  -w "\n%{http_code}"
```

Capture the `access_token` cookie and `XSRF-TOKEN` cookie from the cookie jar. If login fails, try common test credentials or check `backend/src/main/resources/` for seed data.

- [ ] **Step 3: Discover all API endpoints from controllers**

Use Grep to extract all `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@RequestMapping` annotations from controller files. Build a list of all endpoint paths.

- [ ] **Step 4: Hit list endpoints for each business module**

For each module endpoint discovered in Step 3, hit the GET list endpoint with SuperAdmin auth:

```bash
curl -s -b /tmp/nu-aura-cookies.txt \
  -H "X-XSRF-TOKEN: <token>" \
  -w "\n%{http_code}" \
  http://localhost:8080/api/v1/{module}
```

Record: endpoint, status code, response time, whether response is valid JSON, whether it has pagination structure.

- [ ] **Step 5: Test permission enforcement (401/403)**

Hit 5 protected endpoints WITHOUT auth cookies → expect 401:
```bash
curl -s -w "%{http_code}" http://localhost:8080/api/v1/employees
curl -s -w "%{http_code}" http://localhost:8080/api/v1/payroll
curl -s -w "%{http_code}" http://localhost:8080/api/v1/attendance
curl -s -w "%{http_code}" http://localhost:8080/api/v1/leave
curl -s -w "%{http_code}" http://localhost:8080/api/v1/recruitment
```

- [ ] **Step 6: Test CORS headers**

```bash
curl -s -I -X OPTIONS http://localhost:8080/api/v1/employees \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Verify: `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`

- [ ] **Step 7: Test rate limiting**

Send 6 rapid login requests. The 6th should return 429:
```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

- [ ] **Step 8: Compile findings into JSON report**

Write to `docs/superpowers/reports/api-contracts.json`.

---

## Task 4: Agent 5 — Integration Health Check (PARALLEL)

**Files:**
- Read: Backend logs, actuator endpoints
- Create: `docs/superpowers/reports/integration-health.json`

- [ ] **Step 1: Check actuator health for all services**

```bash
curl -s http://localhost:8080/actuator/health | python3 -m json.tool
```

Parse the response for status of: db, redis, kafka, elasticsearch, diskSpace. Record UP/DOWN/DEGRADED for each.

- [ ] **Step 2: Check Kafka consumer groups**

```bash
# Check via actuator
curl -s -b /tmp/nu-aura-cookies.txt http://localhost:8080/actuator/health | python3 -c "
import json, sys
data = json.load(sys.stdin)
kafka = data.get('components', {}).get('kafka', {})
print(json.dumps(kafka, indent=2))
"
```

Also grep backend logs (if accessible) for consumer group activity on topics: `nu-aura.approvals`, `nu-aura.notifications`, `nu-aura.audit`, `nu-aura.employee-lifecycle`, `nu-aura.fluence-content`.

- [ ] **Step 3: Check Redis health**

Verify via actuator health component. Also verify permission caching is working by checking for Redis connection in health details.

- [ ] **Step 4: Check MinIO health and buckets**

```bash
# Check via actuator if MinIO health is exposed, otherwise check via backend logs
curl -s http://localhost:8080/actuator/health | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(json.dumps(data.get('components', {}).get('minio', data.get('components', {}).get('s3', {})), indent=2))
"
```

- [ ] **Step 5: Check Elasticsearch health**

```bash
curl -s http://localhost:8080/actuator/health | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(json.dumps(data.get('components', {}).get('elasticsearch', {}), indent=2))
"
```

- [ ] **Step 6: Check scheduled job health**

Use Grep to find all `@Scheduled` methods in the backend codebase. List them. Then check backend logs for any ERROR entries from these job classes.

```bash
# Find all scheduled jobs
cd /sessions/wizardly-eager-franklin/mnt/nu-aura
```
Use Grep for `@Scheduled` in `backend/src/**/*.java` — list all 24 jobs.

- [ ] **Step 7: Check database and Flyway status**

```bash
curl -s http://localhost:8080/actuator/health | python3 -c "
import json, sys
data = json.load(sys.stdin)
db = data.get('components', {}).get('db', {})
print(json.dumps(db, indent=2))
"
# Check Flyway
curl -s http://localhost:8080/actuator/flyway 2>/dev/null | python3 -m json.tool | tail -20
```

- [ ] **Step 8: Check WebSocket endpoint**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ws/info
```

Expected: 200 (SockJS info endpoint)

- [ ] **Step 9: Compile findings into JSON report**

Write to `docs/superpowers/reports/integration-health.json`.

---

## Task 5: Agent 6 — Security & RBAC Audit (PARALLEL)

**Files:**
- Read: `backend/src/main/java/com/hrms/common/security/PermissionAspect.java`
- Read: `backend/src/main/java/com/hrms/common/security/FeatureFlagAspect.java`
- Read: `frontend/lib/hooks/usePermissions.ts`
- Read: `frontend/middleware.ts`
- Read: `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`
- Create: `docs/superpowers/reports/security-audit.json`

- [ ] **Step 1: Extract all @RequiresPermission annotations**

Use Grep for `@RequiresPermission` in `backend/src/**/*.java`. For each match, extract the permission string (e.g., `EMPLOYEE:READ`). Build a set of all permissions used in code.

- [ ] **Step 2: Parse permission matrix document**

Read `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`. Extract all documented permissions. Build a set of all documented permissions.

- [ ] **Step 3: Cross-reference code vs. matrix**

Compare the two sets:
- Permissions in code but NOT in matrix → flag as FAIL (undocumented permission)
- Permissions in matrix but NOT in code → flag as WARNING (unused/reserved)

- [ ] **Step 4: Verify SuperAdmin bypass in all 4 locations**

Read each file and verify the bypass pattern exists:

1. `backend/src/main/java/com/hrms/common/security/PermissionAspect.java` — look for `isSuperAdmin()` check that short-circuits permission evaluation
2. `backend/src/main/java/com/hrms/common/security/FeatureFlagAspect.java` — same pattern
3. `frontend/lib/hooks/usePermissions.ts` — look for `isAdmin` or `isSuperAdmin` check in `hasPermission()`
4. `frontend/middleware.ts` — look for `SUPER_ADMIN` role bypass in route checking

Flag FAIL if any location is missing the bypass.

- [ ] **Step 5: Verify OWASP security headers**

```bash
curl -s -I -b /tmp/nu-aura-cookies.txt http://localhost:8080/api/v1/employees | head -30
```

Check for presence of:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`
- `Content-Security-Policy`

- [ ] **Step 6: Verify CSRF double-submit cookie**

After login (Step 2 from Task 3), check that:
1. `XSRF-TOKEN` cookie was set
2. A subsequent API call without `X-XSRF-TOKEN` header returns 403
3. A subsequent API call WITH the header succeeds

- [ ] **Step 7: Verify password policy in code**

Read the PasswordValidator (find via Grep for `PasswordValidator` or `validatePassword` in backend). Verify it checks:
- Min 12 chars, max 128
- Uppercase, lowercase, digit, special char required
- Max 3 consecutive identical characters
- Password history: last 5
- 90-day max age

- [ ] **Step 8: Verify public endpoint enforcement**

Hit ALL controller base endpoints without auth. Verify that ONLY these 6 return non-401:
- `AuthController` (`/api/v1/auth/**`)
- `MfaController` (`/api/v1/auth/mfa/**`)
- `PaymentWebhookController` (`/api/v1/payments/webhooks/**`)
- `TenantController` (`/api/v1/tenants/**`)
- `PublicCareerController` (`/api/public/careers/**`)
- `PublicOfferController` (`/api/v1/public/offers/**`)

All others must return 401.

- [ ] **Step 9: Check frontend/backend permission alignment**

Use Grep to find all `requiredPermission` strings in `frontend/components/layout/menuSections.tsx` and page-level permission checks. For each, verify a matching `@RequiresPermission` exists in the backend controller that serves that route's data.

- [ ] **Step 10: Compile findings into JSON report**

Write to `docs/superpowers/reports/security-audit.json`.

---

## Task 6: Agent 1 — UI/QA Browser Sweep (PARALLEL)

**Files:**
- Read: `frontend/app/**/page.tsx` (all routes)
- Create: `docs/superpowers/reports/ui-qa-sweep.json`

**NOTE:** This agent uses the `nu-aura-qa` skill which has its own comprehensive browser testing workflow. The agent should:

- [ ] **Step 1: Read the nu-aura-qa skill for instructions**

Read `/sessions/wizardly-eager-franklin/mnt/.claude/skills/nu-aura-qa/SKILL.md` and follow its workflow.

- [ ] **Step 2: Build route list from filesystem**

```bash
find /sessions/wizardly-eager-franklin/mnt/nu-aura/frontend/app -name "page.tsx" | \
  sed 's|.*/frontend/app||; s|/page.tsx||; s|^|/|' | \
  grep -v '/fluence' | sort
```

This gives all navigable routes excluding NU-Fluence (Phase 2).

- [ ] **Step 3: Login to the app as SuperAdmin via Chrome**

Navigate to `http://localhost:3000/login`. Enter SuperAdmin credentials. Verify redirect to dashboard.

- [ ] **Step 4: Navigate each route systematically**

For each route from Step 2:
1. Navigate to the route
2. Wait for page load (network idle)
3. Capture console messages (errors, warnings)
4. Capture failed network requests (4xx, 5xx)
5. Take screenshot if errors found
6. Record findings

Every 20 routes, hit `/api/v1/auth/me` to verify session. Re-login if 401.

- [ ] **Step 5: Compile findings into JSON report**

Write to `docs/superpowers/reports/ui-qa-sweep.json` with structure matching other agents.

---

## Task 7: Merge All Findings (SEQUENTIAL — after Tasks 1-6 complete)

**Files:**
- Read: `docs/superpowers/reports/typescript-health.json`
- Read: `docs/superpowers/reports/backend-health.json`
- Read: `docs/superpowers/reports/api-contracts.json`
- Read: `docs/superpowers/reports/integration-health.json`
- Read: `docs/superpowers/reports/security-audit.json`
- Read: `docs/superpowers/reports/ui-qa-sweep.json`
- Create: `docs/superpowers/reports/unified-findings.json`

- [ ] **Step 1: Read all 6 agent reports**

Read each JSON report file. Parse findings arrays.

- [ ] **Step 2: Deduplicate and merge**

Combine all findings into a single array. Deduplicate by (file, line, type). Assign unified IDs.

- [ ] **Step 3: Triage by severity**

Classify each finding:
- **Critical** — 500 errors, security gaps, missing auth, data leaks
- **High** — LazyInitializationException, missing @Transactional, broken UI pages
- **Medium** — TypeScript `any`, missing tests, console.log
- **Low** — Dead imports, cosmetic, code style

- [ ] **Step 4: Classify fixability**

For each finding, mark:
- `auto_fixable: true` — Safe to fix automatically (see spec Section 3, Agent 7, "Auto-fix scope")
- `auto_fixable: false, reason: "manual_review"` — Forbidden auto-fix (see spec "FORBIDDEN auto-fixes")

- [ ] **Step 5: Write unified report**

Save to `docs/superpowers/reports/unified-findings.json` with structure:
```json
{
  "iteration": 1,
  "timestamp": "...",
  "total_findings": 0,
  "by_severity": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "auto_fixable_count": 0,
  "manual_review_count": 0,
  "findings": [...]
}
```

- [ ] **Step 6: Print summary to console**

Output a human-readable summary: total findings, breakdown by severity, breakdown by agent, number auto-fixable vs manual-review.

---

## Task 8: Agent 7 — Auto-Fix Safe Issues (SEQUENTIAL)

**Files:**
- Read: `docs/superpowers/reports/unified-findings.json`
- Modify: Various frontend and backend files (only auto-fixable issues)

**CRITICAL RULES:**
- ONLY fix items marked `auto_fixable: true`
- NEVER touch items in the FORBIDDEN list (see spec)
- Read each file BEFORE modifying
- Follow existing codebase patterns

- [ ] **Step 1: Read unified findings**

Load `docs/superpowers/reports/unified-findings.json`. Filter to `auto_fixable: true` findings only. Sort by severity (critical first).

- [ ] **Step 2: Fix TypeScript `any` types**

For each `any-type` finding:
1. Read the file
2. Determine the correct type from context (function return type, API response shape, prop type)
3. Replace `any` with the correct type
4. Run `npx tsc --noEmit` on the specific file to verify

- [ ] **Step 3: Remove console.log statements**

For each `console-log` finding:
1. Read the file
2. Remove the `console.log` line (or replace with proper logging if it's in error handling)
3. Verify file still compiles

- [ ] **Step 4: Fix dead imports**

For each `dead-import` finding:
1. Read the file
2. Remove the unused import
3. Verify file still compiles

- [ ] **Step 5: Add missing @Transactional annotations**

For each `missing-transactional` finding (EXCLUDING `@Scheduled` and `@Async` methods):
1. Read the file
2. Add `@Transactional` to the method
3. Add import if missing: `import org.springframework.transaction.annotation.Transactional;`
4. Verify backend compiles

- [ ] **Step 6: Fix UI bugs from QA sweep**

For each UI bug finding:
1. Read the affected component/page
2. Apply targeted fix (missing error states, broken layouts, etc.)
3. Follow existing patterns in the codebase

- [ ] **Step 7: Update findings report with fix status**

Update `docs/superpowers/reports/unified-findings.json` — mark each fixed item with `status: "fixed"`, unfixed items with `status: "manual_review"` and reason.

---

## Task 9: Verify Fixes Compile (SEQUENTIAL)

- [ ] **Step 1: Run frontend TypeScript check**

```bash
cd /sessions/wizardly-eager-franklin/mnt/nu-aura/frontend && npx tsc --noEmit 2>&1
```

Expected: Zero errors. If errors exist, they are NEW issues introduced by fixes → feed back into loop.

- [ ] **Step 2: Run backend compilation**

```bash
cd /sessions/wizardly-eager-franklin/mnt/nu-aura/backend && ./mvnw compile -q 2>&1
```

Expected: BUILD SUCCESS. If errors exist, they are NEW issues → feed back into loop.

- [ ] **Step 3: Record verification results**

If both pass → proceed to re-scan.
If either fails → capture new errors as findings for the next fix iteration.

---

## Task 10: Re-Scan Static Analysis (CONVERGENCE LOOP)

- [ ] **Step 1: Re-run TypeScript Health checks (Agent 2 checks 1-7)**

Same as Task 1 but only the static analysis checks (tsc, any types, console.log, etc.). Compare findings against previous iteration.

- [ ] **Step 2: Re-run Backend Code Health checks (Agent 3 checks 1-4)**

Same as Task 2 but only the compile check, lazy-init scan, missing-transactional scan, and N+1 scan. Compare against previous iteration.

- [ ] **Step 3: Evaluate convergence**

```
NEW auto-fixable findings = current findings - previous findings (by file+line+type)
```

- If NEW auto-fixable findings == 0 AND compilation passes → **CONVERGED. Exit loop.**
- If same finding appears in 2 consecutive iterations → escalate to manual review, exclude from future iterations
- If iteration count >= 5 → **EXIT with remaining issues surfaced to user**
- Otherwise → **go back to Task 8 (fix) with new findings**

---

## Task 11: Generate Final Report (SEQUENTIAL — after convergence)

**Files:**
- Read: `docs/superpowers/reports/unified-findings.json`
- Create: `docs/superpowers/reports/final-analysis-report.json`

- [ ] **Step 1: Compile final report**

Read the final state of unified findings. Generate summary:
- Total issues found (by agent, by severity)
- Issues auto-fixed (count and list)
- Issues flagged for manual review (count and list with reasons)
- Compilation status (frontend and backend)
- Number of convergence loop iterations taken

- [ ] **Step 2: Create Excel report for manual review items**

Use the xlsx skill patterns to create `docs/superpowers/reports/nu-aura-analysis-report.xlsx` with sheets:
- **Summary** — High-level metrics
- **Auto-Fixed** — All issues that were automatically resolved
- **Manual Review** — All issues requiring human attention, with file paths, descriptions, and recommended actions
- **By Module** — Findings grouped by business module

- [ ] **Step 3: Present results to user**

Output final summary showing:
- How many issues found total
- How many auto-fixed
- How many need manual review
- Link to the Excel report
- Link to the full JSON report
