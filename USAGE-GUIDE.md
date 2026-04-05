# NU-AURA — Agent Orchestration Usage Guide

> Quick reference for using the agent system day-to-day.

---

## Decision Matrix: Which Approach?

```text
Is this a simple, single-scope task?
  YES → Use single session with @role prefix (Layer 1)
  NO  ↓

Does the task decompose into sequential steps?
  YES → Use subagents — one per step (Layer 2)
  NO  ↓

Do the workers need to coordinate or work in parallel?
  YES → Use Agent Teams (Layer 3)
```

| Scenario                            | Approach                         | Example                                      |
|-------------------------------------|----------------------------------|----------------------------------------------|
| Fix a bug in one service            | Single session + `@dev`          | "Fix null pointer in LeaveService.approve()" |
| Add a new API endpoint              | Single session + `@dev`          | "Add GET /api/v1/departments/{id}/employees" |
| Design + implement + test a feature | Subagents (sequential)           | "Build leave request module"                 |
| Research best practices             | Subagents (parallel)             | "Compare JWT rotation strategies"            |
| Build a full module end-to-end      | Agent Teams (6 agents)           | "Build expense management for NU-HRMS"       |
| Debug a complex cross-cutting issue | Agent Teams (3 agents, debate)   | "Why do users get 401 after 30 min?"         |
| Execute 5 sprint tickets            | Agent Teams (5 agents, parallel) | "Sprint 4 execution"                         |
| Review a PR                         | Single session + `@reviewer`     | "Review the expense module PR"               |
| Update deployment config            | Single session + `@devops`       | "Add Redis to docker-compose"                |

---

## Layer 1: Single Session with Role Prefixes

### How to Use

Open Claude Code in your NU-AURA project root (where `CLAUDE.md` lives). Claude automatically reads
it.

```bash
cd ~/IdeaProjects/nulogic/nu-aura
claude
```

Then prefix your message with a role:

```text
@architect Design the schema for an employee attendance tracking module.
Include: check-in/check-out, overtime calculation, integration with leave module.
Use PostgreSQL, tenant_id for multi-tenancy, Flyway migration V94+.
```

```text
@dev Implement AttendanceController and AttendanceService based on the schema above.
Work in backend/src/main/java/com/hrms/api/ and com/hrms/application/
Frontend in frontend/app/attendance/
```

```text
@qa Generate RBAC boundary tests for all attendance endpoints across all roles.
Include tenant isolation tests. Use JUnit 5 (backend) and Playwright (E2E).
```

```text
@reviewer Review the attendance module. Check @RequiresPermission, error handling, N+1 queries, tenant_id filtering.
```

```text
@devops Add the attendance module's health check to docker-compose health checks.
Update deployment/kubernetes/ manifests if needed.
```

```text
@docs Write the API reference for /api/v1/attendance/* endpoints with SpringDoc OpenAPI annotations.
```

### Tips

- You can switch roles mid-conversation — Claude adjusts its persona
- For complex tasks, chain roles: design first (`@architect`), then implement (`@dev`)
- The role prefix activates the full persona defined in CLAUDE.md

---

## Layer 2: Subagents

### How to Use

In your Claude Code session, ask Claude to spawn subagents using the `Agent` tool.
Reference the prompts in `AGENTS.md`.

**Example: Feature Build Pipeline**

```text
I need to build an Employee Onboarding Checklist feature for NU-Hire.

Step 1: Spawn an @architect subagent to design the module:
- Checklist template management (HR Manager creates templates)
- Checklist assignment (auto-assigned when candidate status → HIRED)
- Task completion tracking (employee marks items done)
- Dashboard view for HR to track onboarding progress
- API contract, PostgreSQL schema, RBAC (module.action format), sequence diagram

Step 2: After architect completes, spawn @dev subagent to implement the backend.
Work in backend/src/main/java/com/hrms/ and frontend/app/onboarding/

Step 3: After dev completes, spawn @qa subagent to write tests.

Execute steps sequentially. Wait for each to complete before starting the next.
```

**Example: Parallel Research**

```text
Spawn 3 subagents in parallel:
1. Research: Best file upload strategy for Spring Boot with MinIO (S3-compatible)
2. Research: Mantine UI file upload components with drag-drop and preview
3. Research: Virus scanning integration for uploaded files in Java

Synthesize findings into a recommendation for NU-AURA's document upload feature.
```

### Tips

- Each subagent gets its own context window — it won't see your conversation history
- Include all necessary context in the spawn prompt (don't say "based on what we discussed")
- Subagents report back to you — they can't talk to each other
- Limit to 3-4 subagents to keep things manageable

---

## Layer 3: Agent Teams

### How to Use

Agent Teams is already enabled in `.claude/settings.json`.

Copy a team configuration from `TEAMS.md` and paste it into Claude Code.
Modify the task descriptions to match your current work.

**Example: Launching the team**

```text
I'm building the Expense Management module. Use the "Full Feature Build" team
configuration from TEAMS.md.

Modifications:
- The expense approval chain is: Employee → Team Lead → Finance (App Admin)
- No HR Manager in the approval flow
- Receipt upload should support JPEG, PNG, PDF (max 5MB) via MinIO
- Reimbursement tracking needs status: PENDING, APPROVED, PROCESSING, PAID, REJECTED
- All tables need tenant_id UUID for multi-tenancy

Spawn the team and coordinate.
```

### Monitoring the Team

- The team lead shows you the shared task list with statuses
- You can message individual teammates directly
- You can intervene if an agent goes off track
- Check the task list regularly for blocked tasks

### Tips

- Reserve for large efforts (1+ hour of parallel work)
- Be very specific about file ownership per agent
- Always have an architect agent design first before dev agents implement
- Monitor token usage — set a mental budget before starting

---

## Workflow Examples

### Example 1: New Feature (Medium Complexity)

**Task**: Add department management CRUD to NU-AURA admin panel.

```text
SESSION 1 (5 min):
@architect Design department management. Requirements:
- CRUD for departments (name, code, parent_department for hierarchy)
- Department head assignment (link to employee)
- List with tree view for hierarchy
- API contract, PostgreSQL schema (with tenant_id), RBAC (department.read/write/delete)

SESSION 2 (15 min):
@dev Implement based on architect's design above:
- DepartmentController in backend/src/main/java/com/hrms/api/
- DepartmentService in backend/src/main/java/com/hrms/application/
- Department entity in backend/src/main/java/com/hrms/domain/
- DTOs (Java records + MapStruct), Flyway migration V94__create_departments.sql
- Include unit tests for DepartmentService

SESSION 3 (10 min):
@qa Write tests:
- RBAC boundary tests (only Tenant Admin+ can manage departments)
- Edge cases: circular parent reference, delete department with employees
- Tenant isolation: verify no cross-tenant department access
- Integration test: create → update → soft-delete → verify cascade

SESSION 4 (5 min):
@reviewer Review all department management code. Focus on tree query performance
and tenant_id filtering.
```

**Total time**: ~35 min, single session, sequential roles.

### Example 2: Large Feature (High Complexity)

**Task**: Build complete performance review system for NU-Grow.

```text
Use Agent Teams (Config 1 from TEAMS.md):
- Architect: Design review cycle model (annual/quarterly),
  goal-setting, self-assessment, manager assessment, calibration
- Backend Dev: Implement services, controllers, entities in com.hrms
- Frontend Dev: Review form wizard, rating components, calibration dashboard
  in frontend/app/performance/ using Mantine + React Query
- QA: E2E tests (Playwright) for complete review cycle flow
- DevOps: Scheduled job for review cycle notifications (Kafka event)
- Docs: Module documentation and user guide

Estimated time: 1-2 hours of agent work
```

### Example 3: Emergency Bug Fix

**Task**: Production users report they can't upload profile photos.

```text
SESSION 1:
@dev Investigate: The profile photo upload endpoint POST /api/v1/users/{id}/photo
returns 500 for all users. Check: FileUploadService in com.hrms.application/,
MinIO storage configuration, multipart settings in application.yml.
The error started after yesterday's deployment.

(If complex, escalate to Agent Teams debug pattern with 3 investigators)
```

---

## File Structure

```text
nu-aura/
├── CLAUDE.md                    # ← Main project context + 6 role definitions
├── AGENTS.md                    # ← Subagent spawn prompt library
├── TEAMS.md                     # ← Agent Teams configurations
├── USAGE-GUIDE.md               # ← This file
├── .claude/
│   ├── CLAUDE.md                # ← Detailed engineering instructions (source of truth)
│   ├── settings.json            # ← Agent Teams + plugins enabled
│   ├── claude.json              # ← teammateMode: "in-process"
│   ├── launch.json              # ← Dev server launch configs
│   ├── qa.md                    # ← QA automation playbook (Chrome MCP)
│   └── skills/                  # ← Custom skill definitions (6 skills)
├── frontend/                    # Next.js 14 (App Router)
│   ├── app/                     # Route-level pages (200 routes)
│   ├── components/              # UI components (123 files)
│   ├── lib/                     # Hooks (190), services (92), config, stores
│   └── e2e/                     # Playwright E2E tests
├── backend/                     # Spring Boot 3.4.1
│   └── src/main/java/com/hrms/ # api/, application/, domain/, common/, infrastructure/
├── docker-compose.yml           # 8 services at repo root
├── deployment/kubernetes/       # 10 K8s manifests (GCP GKE)
└── docs/                        # build-kit/ (24), adr/ (5), runbooks/ (4)
```

---

## Cost Management

| Approach               | Relative Token Cost | When to Use                       |
|------------------------|---------------------|-----------------------------------|
| Single session + role  | 1x (baseline)       | Daily tasks, simple changes       |
| 2-3 subagents          | 2-3x                | Feature design → implement → test |
| Agent Teams (3 agents) | 5-8x                | Debugging, research               |
| Agent Teams (6 agents) | 10-15x              | Major module builds               |

**Rules of thumb**:

- Start with Layer 1 (single session). Escalate only when needed.
- Most tasks (70%) need only a single session with the right role prefix.
- Use subagents (25%) for compound tasks that decompose cleanly.
- Use Agent Teams (5%) only for the big stuff — full modules, major refactors, complex debugging.

---

## Iteration and Improvement

After using the system for a sprint:

1. Review which agent prompts produced the best output
2. Refine prompts that gave vague or incorrect results
3. Add new compound patterns that worked well
4. Update CLAUDE.md with any new coding conventions discovered
5. Track which tasks benefited most from multi-agent vs single session
