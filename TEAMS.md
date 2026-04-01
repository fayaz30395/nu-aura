# NU-AURA — Agent Teams Configuration

> **Prerequisite**: Claude Code 2.1.32+ (current: 2.1.89) and `agentTeams: true` in `.claude/settings.json`
> **When to use**: Large parallel efforts where agents need to coordinate (not sequential tasks)
> **Token warning**: Agent Teams use 5-10x more tokens than a single session. Reserve for big sprints.

---

## Setup

Agent Teams is already enabled in this project via `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "experimental": {
    "agentTeams": true
  }
}
```

And `.claude/claude.json`:

```json
{
  "teammateMode": "in-process"
}
```

No additional setup needed.

---

## Team Configurations

### Config 1: Full Feature Build (6 agents)

Use when building a complete new module (e.g., "Build the Expense Management module for NU-HRMS").

```text
Spawn a team of 6 agents for building the Expense Management module:

TEAM LEAD (you): Coordinate, review, merge.

TEAMMATE 1 — "architect":
"You are the Architect for the Expense Management module in NU-AURA.
Design the API contract (OpenAPI 3.0), database schema (Flyway SQL for PostgreSQL),
RBAC permissions (module.action format), and sequence diagrams.
The module needs: expense creation, approval workflow (Employee →
Team Lead → HR Manager), receipt upload (MinIO), reimbursement tracking.
RBAC: Employee creates, Team Lead approves L1, HR Manager approves L2,
Finance (App Admin) processes payment. SuperAdmin bypasses all checks.
Post your design to the shared task list when done.
Stack: Spring Boot 3.4.1 (Java 17), PostgreSQL, Redis 7. Follow conventions in CLAUDE.md."

TEAMMATE 2 — "backend-dev":
"You are the Backend Developer. Wait for architect's design in the shared task list.
Then implement: ExpenseController, ExpenseService, ExpenseRepository,
Expense/ExpenseApproval entities, DTOs (Java records + MapStruct), Flyway migration.
Every endpoint must have @RequiresPermission. Use pagination on list endpoints.
All tables need tenant_id UUID column for multi-tenancy.
Post to task list when each file is complete.
Work in backend/src/main/java/com/hrms/ (api/, application/, domain/ packages)."

TEAMMATE 3 — "frontend-dev":
"You are the Frontend Developer. Wait for architect's API contract in the shared task list.
Then implement: ExpenseListPage, ExpenseForm, ExpenseApprovalQueue, ExpenseDetail components.
Use Mantine UI + Tailwind CSS (Sky palette), React Query for data fetching,
React Hook Form + Zod for forms, Zustand for local state.
Use existing Axios client in frontend/lib/api/ (do NOT create new instances).
Never use TypeScript 'any' — define proper interfaces.
Work in frontend/app/expenses/ and frontend/components/expenses/."

TEAMMATE 4 — "qa-engineer":
"You are the QA Engineer. Wait for backend and frontend implementation.
Then: Write JUnit 5 tests for ExpenseService (all methods),
RBAC boundary tests for ALL roles on every endpoint,
Playwright E2E tests for the expense flow,
and test tenant isolation (verify no cross-tenant data leaks).
Post bug reports to the shared task list with severity and reproduction steps."

TEAMMATE 5 — "devops":
"You are the DevOps Engineer. While others build, prepare:
- Update docker-compose.yml if new services/volumes needed
- Create GitHub Actions workflow step for expense module tests
- Add health check endpoint for expense service
- Document environment variables needed
Work in docker-compose.yml, .github/workflows/, and deployment/kubernetes/."

TEAMMATE 6 — "tech-writer":
"You are the Tech Writer. As others complete work, document:
- API reference for /api/v1/expenses/* endpoints (SpringDoc OpenAPI annotations)
- Module README at docs/modules/expense-management.md
- ADR for expense approval workflow design decisions
- Update main README with expense module section
Wait for architect's design and backend implementation before starting."

TASK DEPENDENCIES:
1. architect completes design → unblocks backend-dev, frontend-dev, tech-writer
2. backend-dev completes API → unblocks frontend-dev (real endpoints), qa-engineer
3. frontend-dev + backend-dev complete → unblocks qa-engineer (E2E tests)
4. devops works independently (infrastructure is parallel)
5. tech-writer works incrementally as each piece lands
```

### Config 2: Cross-Module Refactor (4 agents)

Use when changing something that spans multiple sub-apps (e.g., "Refactor RBAC permission model").

```text
Spawn a team of 4 agents for RBAC refactor:

TEAMMATE 1 — "core-rbac":
"Refactor the core RBAC model in NU-AURA to support scoped permissions.
Current: permission = module.action (e.g., employee.read)
New: permission = module.action:scope (e.g., employee.read:own_department)
Modify: SecurityConfig, JwtAuthenticationFilter, PermissionAspect,
SecurityService.getCachedPermissions(), role_permissions table.
Create Flyway migration (V94+) for schema changes. Ensure backward compatibility —
unscoped permissions still work.
Work in backend/src/main/java/com/hrms/common/config/ and com/hrms/common/security/."

TEAMMATE 2 — "sub-app-migration":
"After core-rbac posts schema changes, update all sub-app controllers and services to use
scoped permissions where applicable. Focus on NU-HRMS and NU-Hire first.
Map existing permissions to scoped equivalents. Update @RequiresPermission annotations.
Work in backend/src/main/java/com/hrms/api/ and com/hrms/application/."

TEAMMATE 3 — "frontend-guards":
"After core-rbac posts the new permission format, update all frontend permission checks.
Modify: middleware.ts, usePermissions hook, Zustand auth store.
Ensure UI elements hide/show based on scoped permissions.
Update frontend/lib/config/apps.ts if app-level RBAC gating is affected.
Work in frontend/lib/ and frontend/components/."

TEAMMATE 4 — "regression-tester":
"Write comprehensive regression tests for the RBAC refactor.
Test: All roles x all endpoints x scoped and unscoped permissions.
Test backward compatibility — old permission strings must still work.
Test: permission cache invalidation in Redis after role changes.
Test: tenant isolation still works with scoped permissions.
Start writing test scaffolds immediately, fill in assertions as teammates post changes."
```

### Config 3: Bug Hunt / Debugging (3 agents)

Use when a complex bug needs multiple investigation angles.

```text
Spawn 3 agents to debug: "Users intermittently get 401 Unauthorized after being
authenticated for ~30 minutes, but only on NU-HRMS endpoints."

TEAMMATE 1 — "token-investigator":
"Investigate the JWT token lifecycle. Check: token expiration time, refresh token rotation,
Redis session TTL, clock skew between services.
Look at JwtAuthenticationFilter, SecurityService, and Redis configuration
in backend/src/main/java/com/hrms/common/config/.
Check if refresh token endpoint is being called correctly.
Remember: JWT is stored in cookies, not Authorization header."

TEAMMATE 2 — "gateway-investigator":
"Investigate the API Gateway layer. Check: Spring Cloud Gateway route configuration for
NU-HRMS, rate limiting settings (Bucket4j + Redis: 100/min API, 5/min auth),
request timeout configuration, cookie forwarding (is JWT cookie being passed through?).
Check CORS config. Check gateway logs for 401 patterns."

TEAMMATE 3 — "cache-investigator":
"Investigate Redis caching. Check: permission cache TTL vs JWT expiration alignment,
cache eviction policy, connection pool settings, whether SecurityService.getCachedPermissions()
is being invalidated correctly on token refresh.
Check if Redis is running low on memory. Check Bucket4j rate limit state."

All three: Share findings in the task list. Challenge each other's hypotheses.
Converge on the root cause. The theory that survives peer review wins.
```

### Config 4: Sprint Execution (5 agents)

Use for executing multiple independent tickets in parallel.

```text
Spawn 5 agents for sprint execution. Each agent owns one ticket:

TEAMMATE 1 — "ticket-101":
"Implement NUAURA-101: Add bulk employee import via CSV upload.
Backend: POST /api/v1/employees/bulk-import (multipart/form-data).
Parse CSV, validate rows, create employees, return import report.
Add @RequiresPermission('employee.import'). Include tenant_id on all records.
Frontend: BulkImportModal with drag-drop, preview table, error display.
Use Mantine UI + React Hook Form + Zod. Work in frontend/app/employees/ and
backend/src/main/java/com/hrms/. Include unit tests. RBAC: HR Manager and above only."

TEAMMATE 2 — "ticket-102":
"Implement NUAURA-102: Add email notification on leave approval.
Backend: NotificationService with email templates (Thymeleaf).
Trigger on LeaveRequest status change to APPROVED/REJECTED.
Publish Kafka event to nu-aura.notifications topic for async processing.
Use existing Kafka producer in com.hrms.infrastructure.kafka/.
Include retry logic and DLT handling. No frontend changes.
Include unit tests for NotificationService."

TEAMMATE 3 — "ticket-103":
"Implement NUAURA-103: Dashboard analytics API for Tenant Admin.
Backend: GET /api/v1/dashboard/analytics with aggregated metrics:
- Total employees by department
- Leave utilization rate
- Open hiring positions
- Pending approvals count
Use Redis caching (5 min TTL). @RequiresPermission('dashboard.read').
Filter by tenant_id. RBAC: Tenant Admin and Super Admin only."

TEAMMATE 4 — "ticket-104":
"Implement NUAURA-104: Add audit log viewer in admin panel.
Backend: GET /api/v1/audit-logs with filters (user, action, date range).
Frontend: AuditLogPage in frontend/app/audit/ with Mantine DataTable,
date range picker, export to CSV (ExcelJS). Use React Query for data fetching.
@RequiresPermission('audit.read'). RBAC: Super Admin only.
Pagination required (logs table is large)."

TEAMMATE 5 — "ticket-105":
"Implement NUAURA-105: Password-less login via magic link as alternative to Google OAuth.
Backend: POST /api/v1/auth/magic-link (send), GET /api/v1/auth/magic-link/verify (consume).
Generate secure token, store in Redis (15 min TTL), send via email (SMTP).
On verify: issue JWT in cookie same as OAuth flow.
Frontend: MagicLinkLogin component in frontend/app/auth/ using Mantine + Zod."

COORDINATION RULES:
- Each agent works independently in their scope
- If you need to modify a shared file (SecurityConfig, application.yml),
  post to task list first and wait for acknowledgment
- All agents follow coding conventions in CLAUDE.md
- Post completion status to task list when done
```

---

## Task Dependency Patterns

### Sequential Chain

```text
architect → dev → qa → reviewer → docs
```

Each waits for the previous to complete. Best for new features.

### Fan-Out / Fan-In

```text
         ┌─ backend-dev ──┐
architect┤                 ├─ qa → reviewer
         └─ frontend-dev ──┘
```

Architect designs, dev work parallelizes, QA integrates.

### Fully Parallel

```text
ticket-1 ─────────────────→ done
ticket-2 ─────────────────→ done
ticket-3 ─────────────────→ done
```

Independent tickets, no dependencies. Fastest but highest token cost.

### Debate Pattern

```text
investigator-1 ──┐
investigator-2 ──┼─ challenge each other → converge
investigator-3 ──┘
```

Multiple hypotheses tested in parallel. Best for complex debugging.

---

## Best Practices

1. **Max 5-6 agents per team** — coordination overhead grows quadratically
2. **Clear file ownership** — each agent works in distinct directories to avoid conflicts
3. **Explicit dependencies** — state what each agent waits for before starting
4. **Shared task list** — all coordination happens through the task list, not assumptions
5. **Team lead reviews** — you (or the lead agent) review before any merge
6. **Kill early** — if an agent goes off track, shut it down and respawn with clearer instructions
7. **Budget awareness** — a 6-agent team for 30 minutes uses ~6x the tokens of a single session

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Agent exits immediately | Missing context in spawn prompt | Add more project context to the prompt |
| Agents editing same file | No file ownership boundaries | Assign explicit file paths per agent |
| Agent stuck waiting | Dependency not posted to task list | Check task list, manually trigger |
| High token burn, low output | Task too vague | Be more specific in the spawn prompt |
| Agents contradicting each other | No shared design | Always have architect produce design first |
| Wrong package paths | Stale prompt | Verify paths match: com.hrms, frontend/app/ |
