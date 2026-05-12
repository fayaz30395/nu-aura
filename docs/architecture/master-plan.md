# HRMS Master Plan — Consolidated & Simplified

> This is the single actionable reference synthesized from all 17 build-kit documents. It replaces
> the need to read them individually. When giving instructions to an AI agent, point to **this file
** + the relevant section.

---

## 1. What Exists vs. What's Missing

### Already Built (Do Not Rewrite)

| Area                                       | Status                             |
|--------------------------------------------|------------------------------------|
| Next.js 14 frontend shell + routing        | ✅ Done                             |
| 50+ page stubs in `frontend/app/`          | ✅ Scaffolded (some are empty/mock) |
| Spring Boot backend monolith               | ✅ Running                          |
| Docker Compose (Postgres, Redis, Kafka)    | ✅ Running                          |
| Auth (JWT login, middleware)               | ✅ Done                             |
| MFA                                        | ✅ Done                             |
| Mantine UI, Tailwind, React Query, Zustand | ✅ Installed                        |

### What Needs to be Built/Completed

| Module                                    | Priority    | Complexity |
|-------------------------------------------|-------------|------------|
| RBAC enforcement + SuperAdmin bypass      | 🔴 Critical | Medium     |
| Employee CRUD (wire to real API)          | 🔴 Critical | Low        |
| Leave requests + approval flow            | 🔴 Critical | Medium     |
| Attendance check-in/out                   | 🔴 Critical | Low        |
| Unified Approval Inbox                    | 🔴 Critical | Medium     |
| Payroll run + payslip PDF                 | 🔴 Critical | High       |
| Organization tree + department management | 🟡 High     | Low        |
| Recruitment ATS pipeline                  | 🟡 High     | Medium     |
| Performance goals + appraisals            | 🟡 High     | Medium     |
| Notifications (in-app + email)            | 🟡 High     | Low        |
| Asset management                          | 🟢 Medium   | Low        |
| Expense management                        | 🟢 Medium   | Low        |
| Analytics dashboard KPIs                  | 🟢 Medium   | Medium     |
| Document management                       | 🟢 Medium   | Low        |

---

## 2. Architecture Decisions (Final — No More Discussion)

| Decision       | Choice                              | Reason                                  |
|----------------|-------------------------------------|-----------------------------------------|
| Frontend       | Next.js 14 (already in use)         | Already built                           |
| Backend        | Spring Boot monolith                | Already built                           |
| DB             | PostgreSQL, shared schema           | `tenant_id` on every table              |
| Multi-tenancy  | Shared DB + RLS                     | Cost efficient, already designed        |
| RBAC           | `module.action` permission strings  | `role_permission` table, JWT claims     |
| SuperAdmin     | Bypasses ALL Spring Security checks | Global god-mode for platform operator   |
| Approvals      | Generic `workflow_def` engine       | Reusable across Leave, Expense, Assets  |
| Payroll engine | SpEL formula evaluation (DAG order) | Flexible, no code deploys for new rules |
| Notifications  | Kafka consumer → multi-channel      | Decoupled from domain services          |

---

## 3. The Core Data Flow (Memorize This)

```
Employee Action (FE)
  → Axios → Spring Boot Controller
    → Service (checks permission via @PreAuthorize)
      → Repository (filters by tenant_id)
        → PostgreSQL (RLS enforces tenant isolation)
          → Kafka Event (for async side-effects)
            → Notification Service (email/push)
            → Analytics Service (metrics update)
```

For approvals, insert an extra step:

```
Service → POST to approval-service → creates approval_task
  → Manager approves via Inbox
    → approval.decision.approved Kafka event
      → Original service commits the final state change
```

---

## 4. Simplified Module Implementation Guide

Each module follows this exact pattern. AI agents should follow this for every module.

### Backend Pattern (per module)

```
1. Entity.java           → JPA entity with @TenantId field
2. Repository.java       → JpaRepository + @Query with tenant_id filter
3. Service.java          → Business logic, @PreAuthorize("hasPermission('module.action')")
4. Controller.java       → REST endpoints, paginated GET, POST, PUT, PATCH /status
5. Flyway migration .sql → Table DDL with tenant_id, indexes
```

### Frontend Pattern (per module)

```
1. frontend/lib/[module].ts         → All Axios API calls for this module
2. frontend/lib/hooks/use[Module].ts → React Query useQuery + useMutation hooks
3. frontend/app/[module]/page.tsx   → Page: TanStack Table + filter bar
4. components/[module]/[Module]Form.tsx → react-hook-form + zod slide-out Sheet
5. components/[module]/[Module]Card.tsx → Summary card for dashboard
```

---

## 5. RBAC Quick Reference

### How Permissions Work

1. User logs in → backend returns `{ user, permissions: ["employee.read", "leave.apply", ...] }`
2. Zustand stores this in `useAuthStore().permissions`
3. Frontend: `<RequirePermission code="employee.create">` hides buttons
4. Backend: `@PreAuthorize("hasPermission(null, 'employee.create')")` rejects unauthorized API calls

### SuperAdmin Rule

```java
// In Spring Security filter — check this FIRST before any permission evaluation
if (authentication.getAuthorities().contains("ROLE_SUPER_ADMIN")) {
    return true; // bypass all checks
}
```

```typescript
// In Next.js middleware
if (user.role === 'SUPER_ADMIN') return NextResponse.next(); // bypass all route guards
```

### Role Hierarchy (Simplified for MVP)

| Role                | Scope                          |
|---------------------|--------------------------------|
| `SUPER_ADMIN`       | Everything, all tenants        |
| `TENANT_ADMIN`      | Everything within their tenant |
| `HR_ADMIN`          | All employees, all HR modules  |
| `REPORTING_MANAGER` | Own team's data only           |
| `FINANCE_ADMIN`     | Payroll, expenses, assets      |
| `EMPLOYEE`          | Own data only (self-service)   |

---

## 6. Kafka Events Quick Reference

Only implement events that have real consumers. Don't publish events nobody listens to.

| Event                    | Producer         | Consumer(s)                                                                          |
|--------------------------|------------------|--------------------------------------------------------------------------------------|
| `employee.created`       | employee-service | auth-service (create user), attendance-service (init), leave-service (init balances) |
| `employee.terminated`    | employee-service | auth-service (revoke JWT), asset-service (recover assets)                            |
| `leave.requested`        | leave-service    | approval-service (start workflow), notification-service                              |
| `leave.approved`         | approval-service | leave-service (deduct balance), attendance-service (mark roster)                     |
| `expense.submitted`      | expense-service  | approval-service (start workflow)                                                    |
| `expense.approved`       | approval-service | expense-service (mark paid), payroll-service (add to next run)                       |
| `payroll.generated`      | payroll-service  | notification-service (email payslips)                                                |
| `approval.task.assigned` | approval-service | notification-service (alert approver)                                                |

---

## 7. Payroll Engine — Simplified Steps

For MVP, implement these 6 steps only (drop arrears, F&F, split-month for now):

```
1. LOCK: Set payroll_run.status = PROCESSING
2. FETCH: Get all ACTIVE employees with salary_structures
3. FETCH: Get payable_days from daily_attendance for the month
4. CALCULATE GROSS: Apply component formulas in dependency order
5. DEDUCT TAX: Apply flat-rate or bracket tax (configurable per tenant)
6. COMMIT: Save payslips, set payroll_run.status = FINALIZED
7. PUBLISH: kafka → payroll.generated → trigger employee email notifications
```

---

## 8. Leave Engine — Simplified Steps

```
1. APPLY: Employee submits leave_request → status = PENDING
2. VALIDATE: Check holiday_calendar, check balance > requested_days
3. ROUTE: Trigger approval workflow (Employee → Manager → HR)
4. APPROVE: In DB transaction: status = APPROVED + deduct leave_balance
5. SYNC: Kafka → leave.approved → attendance marks day as ON_LEAVE
```

---

## 9. Parallel Agent Build Plan (1-2 Days)

Use 5 simultaneous Claude/Cursor sessions. Each agent owns one vertical slice.

| Agent | Owns                                                 | Key Files                                            |
|-------|------------------------------------------------------|------------------------------------------------------|
| **A** | RBAC + SuperAdmin + route guards                     | `middleware.ts`, Spring Security config, sidebar nav |
| **B** | Employee CRUD                                        | `frontend/app/employees/`, `EmployeeController.java` |
| **C** | Leave + Attendance                                   | `frontend/app/leave/`, `frontend/app/attendance/`    |
| **D** | Payroll + Approval Inbox                             | `frontend/app/payroll/`, `ApprovalController.java`   |
| **E** | Polish: loading states, empty states, error handling | All pages                                            |

**Rule:** Each agent writes ONLY to their designated directory. No cross-contamination.

**Integration (Day 2):** One final session runs `tsc --noEmit`, fixes TypeScript errors, smoke-tests
the 5 critical flows, and deploys.

---

## 10. Critical User Flows to Test Before Going Live

1. **Login → Dashboard loads with real KPI data** (not hardcoded numbers).
2. **Employee applies for leave → Manager sees it in Inbox → Approves → Balance decreases.**
3. **Employee clocks in → HR sees them as "Present" on the attendance board.**
4. **HR runs payroll → Payslip is generated → Employee can download the PDF.**
5. **SuperAdmin logs in → Can see `/admin` with all employees across all tenants.**
