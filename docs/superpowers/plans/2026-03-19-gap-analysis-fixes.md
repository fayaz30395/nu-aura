# NU-AURA Gap Analysis Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 critical, 5 high-priority, and 3 medium-priority issues identified in the full platform gap analysis.

**Architecture:** Fixes are organized into 3 phases: go-live blockers (frontend health endpoint, admin forms, helpdesk page, API wiring), tenant isolation hardening (knowledge entities, AttendanceTimeEntry, LeaveBalance locking), and feature completion (AI usage tracking, avatarUrl, reports React Query migration). Each task is independent within its phase.

**Tech Stack:** Spring Boot 3.4, Java 17, Next.js 14, TypeScript 5.9, Mantine 8.3, PostgreSQL, Flyway (next = V40), React Query, React Hook Form + Zod.

---

## Phase 1 — Go-Live Blockers

### Task 1: Create Frontend Health Endpoint for K8s Probes

**Files:**
- Create: `frontend/app/api/health/route.ts`

K8s `frontend-deployment.yaml` probes point to `/api/health` on port 3000. This endpoint does not exist. Pods will restart-loop on deploy.

- [ ] **Step 1: Create the health endpoint**

```typescript
// frontend/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

- [ ] **Step 2: Verify endpoint works locally**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/frontend && npx next dev &`
Then: `curl http://localhost:3000/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/health/route.ts
git commit -m "fix(infra): add /api/health endpoint for K8s probes"
```

---

### Task 2: Fix Admin Page Uncontrolled Forms

**Files:**
- Modify: `frontend/app/admin/page.tsx`

The admin page uses raw `useState` + `onChange` for the role assignment form (lines 283-305) and search input (lines 152-166). This violates the mandatory React Hook Form + Zod rule.

**Important context:**
- The search input (`pendingSearch`) is a filter, not a form submission — it can stay as `useState` (search filters don't need form validation).
- The role assignment form (`roleEmail` + `selectedRole` + submit button) MUST use React Hook Form + Zod.
- Existing imports: `useMemo, useState` from React. Need to add `useForm` from react-hook-form and `z, zodResolver` from zod.
- Existing mutation: `useUpdateUserRole()` returns `updateRoleMutation`.
- Existing handler: `handleAssignRole()` reads `roleEmail` and `selectedRole` from state.

- [ ] **Step 1: Add React Hook Form + Zod imports and schema**

Add after the existing imports (around line 11):

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
```

Add after `ROLE_OPTIONS` constant (around line 21):

```typescript
const roleAssignmentSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email'),
  role: z.string().min(1, 'Role is required'),
});

type RoleAssignmentForm = z.infer<typeof roleAssignmentSchema>;
```

- [ ] **Step 2: Replace useState with useForm in the component**

Inside `AdminDashboardPage`, remove these two lines:
```typescript
const [roleEmail, setRoleEmail] = useState('');
const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0]?.value ?? Roles.SUPER_ADMIN);
```

Replace with:
```typescript
const {
  register: registerRole,
  handleSubmit: handleRoleSubmit,
  reset: resetRoleForm,
  watch: watchRole,
  formState: { errors: roleErrors },
} = useForm<RoleAssignmentForm>({
  resolver: zodResolver(roleAssignmentSchema),
  defaultValues: {
    email: '',
    role: ROLE_OPTIONS[0]?.value ?? Roles.SUPER_ADMIN,
  },
});
```

- [ ] **Step 3: Update handleAssignRole to receive form data**

Replace the existing `handleAssignRole` function. It currently reads `roleEmail` and `selectedRole` from state. Change it to accept form data:

```typescript
const handleAssignRole = async (data: RoleAssignmentForm) => {
  const matchedUser = users.find(
    (u) => u.email.toLowerCase() === data.email.trim().toLowerCase(),
  );
  if (!matchedUser) {
    notifications.show({ title: 'Error', message: 'User not found in the current list.', color: 'red' });
    return;
  }
  setConfirmDialog({ isOpen: true, email: data.email, role: data.role });
};
```

- [ ] **Step 4: Update the filteredByEmail memo to use watch**

Replace `roleEmail` references with `watchRole('email')`:

```typescript
const watchedEmail = watchRole('email');

const filteredByEmail = useMemo(() => {
  if (!watchedEmail.trim()) return users;
  const lowered = watchedEmail.trim().toLowerCase();
  return users.filter((u) => u.email.toLowerCase().includes(lowered));
}, [watchedEmail, users]);
```

- [ ] **Step 5: Update the Role Management JSX form**

Replace the Role Management panel div (around lines 275-320) with a `<form>` element. Replace the raw `<input>` and `<select>` with `{...registerRole('email')}` and `{...registerRole('role')}`:

```tsx
<form onSubmit={handleRoleSubmit(handleAssignRole)} className="bg-[var(--bg-card)] rounded-xl shadow-soft border border-[var(--border-main)] p-4 sm:p-6 space-y-4">
  <div>
    <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
      Role Management
    </h2>
    <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
      Search by user email and assign or revoke a high-level role.
    </p>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="md:col-span-2">
      <label className="block text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
        User Email
      </label>
      <input
        type="email"
        placeholder="user@example.com"
        {...registerRole('email')}
        className="w-full px-3 py-2 text-sm border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
      />
      {roleErrors.email && (
        <p className="text-xs text-red-500 mt-1">{roleErrors.email.message}</p>
      )}
    </div>
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
        Role
      </label>
      <select
        {...registerRole('role')}
        className="w-full px-3 py-2 text-sm border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {roleErrors.role && (
        <p className="text-xs text-red-500 mt-1">{roleErrors.role.message}</p>
      )}
    </div>
  </div>
  <div className="flex justify-end">
    <button
      type="submit"
      disabled={updateRoleMutation.isPending}
      className="px-4 py-2 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {updateRoleMutation.isPending ? 'Updating...' : 'Assign / Update Role'}
    </button>
  </div>
</form>
```

- [ ] **Step 6: Update confirmDialog handler to reset form on success**

In the existing `handleConfirmRole` (or equivalent confirm handler), add after successful mutation:

```typescript
resetRoleForm();
```

- [ ] **Step 7: Verify the page compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/frontend && npx next build --no-lint 2>&1 | head -30`
Expected: No TypeScript errors related to admin page.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/admin/page.tsx
git commit -m "fix(admin): migrate role assignment form to React Hook Form + Zod"
```

---

### Task 3: Build Helpdesk Landing Page

**Files:**
- Modify: `frontend/app/helpdesk/page.tsx`

Currently the entire file is a redirect to `/helpdesk/sla`. Replace with a proper dashboard showing SLA stats, pending escalations, and quick actions. Use the existing `useHelpdeskSla` hooks and `helpdeskSLAService`.

**Existing hooks available** (from `frontend/lib/hooks/queries/useHelpdeskSla.ts`):
- `useSLADashboard()` — returns `SLADashboard` with averageCSAT, slaComplianceRate, etc.
- `useMyPendingEscalations()` — returns `TicketEscalation[]`
- `useSlaConfigs()` — returns paginated SLA configs

**Existing types** (from `frontend/lib/services/helpdesk-sla.service.ts`):
- `SLADashboard`, `TicketEscalation`, `TicketSLA`

- [ ] **Step 1: Replace helpdesk/page.tsx with dashboard implementation**

Replace the entire file with a proper helpdesk landing page:

```typescript
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout, PageHeader } from '@/components/layout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useSLADashboard, useMyPendingEscalations, useSlaConfigs } from '@/lib/hooks/queries/useHelpdeskSla';
import {
  Headphones,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  BarChart3,
  Settings,
  Bell,
} from 'lucide-react';

export default function HelpdeskPage() {
  const router = useRouter();
  const { data: dashboard, isLoading: dashboardLoading } = useSLADashboard();
  const { data: escalations = [], isLoading: escalationsLoading } = useMyPendingEscalations();
  const { data: slasResponse } = useSlaConfigs(0, 100);

  const activeSlaCount = useMemo(
    () => (slasResponse?.content ?? []).filter((s) => s.isActive).length,
    [slasResponse],
  );

  const isLoading = dashboardLoading || escalationsLoading;

  const statCards = [
    {
      label: 'SLA Compliance',
      value: dashboard ? `${dashboard.slaComplianceRate.toFixed(1)}%` : '—',
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      label: 'Avg First Response',
      value: dashboard ? `${dashboard.averageFirstResponseMinutes} min` : '—',
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: 'Avg Resolution',
      value: dashboard ? `${dashboard.averageResolutionMinutes} min` : '—',
      icon: BarChart3,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      label: 'Avg CSAT',
      value: dashboard ? `${dashboard.averageCSAT.toFixed(1)} / 5` : '—',
      icon: Headphones,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/20',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Helpdesk"
          description="Manage SLA policies, escalations, and support metrics"
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{card.label}</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {isLoading ? '...' : card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Escalations */}
        {escalations.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                Pending Escalations ({escalations.length})
              </h3>
            </div>
            <div className="space-y-2">
              {escalations.slice(0, 5).map((esc) => (
                <div
                  key={esc.id}
                  className="flex items-center justify-between bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Ticket #{esc.ticketId.slice(0, 8)}
                    </span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {esc.escalationLevel} — {esc.escalationReason.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(esc.escalatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">SLA Policies</p>
                <p className="text-xs text-[var(--text-muted)]">{activeSlaCount} active policies</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Escalations</p>
                <p className="text-xs text-[var(--text-muted)]">{escalations.length} pending</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={() => router.push('/helpdesk/sla')}
            className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">SLA Dashboard</p>
                <p className="text-xs text-[var(--text-muted)]">View detailed metrics</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Summary Stats */}
        {dashboard && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 shadow-soft">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3">Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{dashboard.slaMetCount}</p>
                <p className="text-xs text-[var(--text-muted)]">SLAs Met</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{dashboard.slaBreachedCount}</p>
                <p className="text-xs text-[var(--text-muted)]">SLAs Breached</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{dashboard.firstContactResolutions}</p>
                <p className="text-xs text-[var(--text-muted)]">First Contact Resolutions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{activeSlaCount}</p>
                <p className="text-xs text-[var(--text-muted)]">Active SLA Policies</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/frontend && npx next build --no-lint 2>&1 | head -30`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/helpdesk/page.tsx
git commit -m "feat(helpdesk): replace redirect stub with proper landing dashboard"
```

---

### Task 4: Fix LeaveType Activate/Deactivate Return Type

**Files:**
- Modify: `backend/src/main/java/com/hrms/api/leave/controller/LeaveTypeController.java`

The activate and deactivate endpoints return `ResponseEntity<Void>` (204 No Content), but the frontend expects the updated `LeaveType` entity back. The service methods (`activateLeaveType`, `deactivateLeaveType`) likely return void. We need to return the entity.

- [ ] **Step 1: Update activate endpoint to return LeaveTypeResponse**

In `LeaveTypeController.java`, replace lines 80-83:

```java
// BEFORE:
@PatchMapping("/{id}/activate")
@RequiresPermission(Permission.LEAVE_APPROVE)
public ResponseEntity<Void> activateLeaveType(@PathVariable UUID id) {
    leaveTypeService.activateLeaveType(id);
    return ResponseEntity.noContent().build();
}
```

With:

```java
// AFTER:
@PatchMapping("/{id}/activate")
@RequiresPermission(Permission.LEAVE_APPROVE)
public ResponseEntity<LeaveTypeResponse> activateLeaveType(@PathVariable UUID id) {
    leaveTypeService.activateLeaveType(id);
    LeaveType leaveType = leaveTypeService.getLeaveTypeById(id);
    return ResponseEntity.ok(toResponse(leaveType));
}
```

- [ ] **Step 2: Update deactivate endpoint to return LeaveTypeResponse**

Replace lines 86-90:

```java
// BEFORE:
@PatchMapping("/{id}/deactivate")
@RequiresPermission(Permission.LEAVE_APPROVE)
public ResponseEntity<Void> deactivateLeaveType(@PathVariable UUID id) {
    leaveTypeService.deactivateLeaveType(id);
    return ResponseEntity.noContent().build();
}
```

With:

```java
// AFTER:
@PatchMapping("/{id}/deactivate")
@RequiresPermission(Permission.LEAVE_APPROVE)
public ResponseEntity<LeaveTypeResponse> deactivateLeaveType(@PathVariable UUID id) {
    leaveTypeService.deactivateLeaveType(id);
    LeaveType leaveType = leaveTypeService.getLeaveTypeById(id);
    return ResponseEntity.ok(toResponse(leaveType));
}
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/hrms/api/leave/controller/LeaveTypeController.java
git commit -m "fix(leave): return LeaveType entity from activate/deactivate endpoints"
```

---

### Task 5: Add Shift Activate/Deactivate Endpoints to Backend

**Files:**
- Modify: `backend/src/main/java/com/hrms/api/shift/controller/ShiftManagementController.java`
- Modify: `backend/src/main/java/com/hrms/application/shift/service/ShiftManagementService.java` (if methods don't exist)

The frontend calls `PATCH /shifts/{id}/activate` and `PATCH /shifts/{id}/deactivate` but these endpoints don't exist. The shift entity likely has an `isActive` field. Add endpoints that toggle it.

- [ ] **Step 1: Check if ShiftManagementService has activate/deactivate methods**

Search for existing methods in the service class. If they don't exist, add them.

- [ ] **Step 2: Add activate endpoint to ShiftManagementController**

Add after the `deleteShift` method (around line 93), before the Shift Assignments section:

```java
@PatchMapping("/{shiftId}/activate")
@RequiresPermission(Permission.ATTENDANCE_APPROVE)
public ResponseEntity<ShiftResponse> activateShift(@PathVariable UUID shiftId) {
    log.info("Activating shift: {}", shiftId);
    ShiftResponse response = shiftManagementService.activateShift(shiftId);
    return ResponseEntity.ok(response);
}

@PatchMapping("/{shiftId}/deactivate")
@RequiresPermission(Permission.ATTENDANCE_APPROVE)
public ResponseEntity<ShiftResponse> deactivateShift(@PathVariable UUID shiftId) {
    log.info("Deactivating shift: {}", shiftId);
    ShiftResponse response = shiftManagementService.deactivateShift(shiftId);
    return ResponseEntity.ok(response);
}
```

- [ ] **Step 3: Add service methods if missing**

If `ShiftManagementService` doesn't have `activateShift`/`deactivateShift`, add:

```java
@Transactional
public ShiftResponse activateShift(UUID shiftId) {
    Shift shift = shiftRepository.findById(shiftId)
        .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));
    shift.setActive(true);
    shift = shiftRepository.save(shift);
    return mapToResponse(shift);
}

@Transactional
public ShiftResponse deactivateShift(UUID shiftId) {
    Shift shift = shiftRepository.findById(shiftId)
        .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));
    shift.setActive(false);
    shift = shiftRepository.save(shift);
    return mapToResponse(shift);
}
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/hrms/api/shift/controller/ShiftManagementController.java
git add backend/src/main/java/com/hrms/application/shift/service/ShiftManagementService.java
git commit -m "feat(shifts): add activate/deactivate endpoints to match frontend API"
```

---

## Phase 2 — Tenant Isolation Hardening

### Task 6: Refactor Knowledge Entities to Extend TenantAware

**Files:**
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/WikiPageVersion.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/BlogLike.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/WikiPageWatch.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/WikiPageApprovalTask.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/KnowledgeSearch.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/KnowledgeAttachment.java`
- Modify: `backend/src/main/java/com/hrms/domain/knowledge/KnowledgeView.java`

All 7 entities extend `BaseEntity` and manually declare `private UUID tenantId`. They should extend `TenantAware` (which already extends `BaseEntity` and provides `tenantId` with `@Column(nullable = false, updatable = false)` and the `TenantEntityListener`).

**Pattern for each entity:**

1. Change `extends BaseEntity` to `extends TenantAware`
2. Change import from `com.hrms.common.entity.BaseEntity` to `com.hrms.common.entity.TenantAware`
3. Remove the manual `private UUID tenantId` field
4. Keep all other fields unchanged

- [ ] **Step 1: Fix WikiPageVersion.java**

Change:
```java
import com.hrms.common.entity.BaseEntity;
// ...
public class WikiPageVersion extends BaseEntity {
    @Column(nullable = false)
    private UUID tenantId;
```

To:
```java
import com.hrms.common.entity.TenantAware;
// ...
public class WikiPageVersion extends TenantAware {
    // tenantId inherited from TenantAware — REMOVED manual declaration
```

- [ ] **Step 2: Fix BlogLike.java**

Same pattern: `BaseEntity` → `TenantAware`, remove manual `tenantId` field.

- [ ] **Step 3: Fix WikiPageWatch.java**

Same pattern.

- [ ] **Step 4: Fix WikiPageApprovalTask.java**

Same pattern.

- [ ] **Step 5: Fix KnowledgeSearch.java**

Same pattern.

- [ ] **Step 6: Fix KnowledgeAttachment.java**

Same pattern.

- [ ] **Step 7: Fix KnowledgeView.java**

Same pattern.

- [ ] **Step 8: Verify backend compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`
Expected: BUILD SUCCESS. If any code references `entity.getTenantId()`, it will still work because `TenantAware` provides the same getter.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/hrms/domain/knowledge/
git commit -m "fix(knowledge): refactor 7 entities to extend TenantAware for consistent tenant isolation"
```

---

### Task 7: Fix AttendanceTimeEntry Tenant Isolation

**Files:**
- Modify: `backend/src/main/java/com/hrms/domain/attendance/AttendanceTimeEntry.java`
- Create: `backend/src/main/resources/db/migration/V40__attendance_time_entry_tenant_id.sql`

`AttendanceTimeEntry` extends `BaseEntity` with no `tenantId`. Must extend `TenantAware` and add a Flyway migration to backfill `tenant_id` from the parent `attendance_records` table.

- [ ] **Step 1: Change entity to extend TenantAware**

In `AttendanceTimeEntry.java`, change:
```java
import com.hrms.common.entity.BaseEntity;
// ...
public class AttendanceTimeEntry extends BaseEntity {
```

To:
```java
import com.hrms.common.entity.TenantAware;
// ...
public class AttendanceTimeEntry extends TenantAware {
```

- [ ] **Step 2: Create Flyway migration V40**

```sql
-- V40__attendance_time_entry_tenant_id.sql
-- Add tenant_id to attendance_time_entries and backfill from parent attendance_records

-- Step 1: Add column (nullable initially for backfill)
ALTER TABLE attendance_time_entries ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Step 2: Backfill from parent attendance_records
UPDATE attendance_time_entries ate
SET tenant_id = ar.tenant_id
FROM attendance_records ar
WHERE ate.attendance_record_id = ar.id
  AND ate.tenant_id IS NULL;

-- Step 3: Set NOT NULL after backfill
ALTER TABLE attendance_time_entries ALTER COLUMN tenant_id SET NOT NULL;

-- Step 4: Add index for tenant-scoped queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_time_entries_tenant
  ON attendance_time_entries (tenant_id);

-- Step 5: Enable RLS
ALTER TABLE attendance_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_time_entries_allow_all
  ON attendance_time_entries AS PERMISSIVE FOR ALL USING (true);

CREATE POLICY attendance_time_entries_tenant_rls
  ON attendance_time_entries AS RESTRICTIVE FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  );
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/hrms/domain/attendance/AttendanceTimeEntry.java
git add backend/src/main/resources/db/migration/V40__attendance_time_entry_tenant_id.sql
git commit -m "fix(attendance): add tenant isolation to AttendanceTimeEntry with migration V40"
```

---

### Task 8: Add Pessimistic Locking to LeaveBalance Operations

**Files:**
- Modify: `backend/src/main/java/com/hrms/infrastructure/leave/repository/LeaveBalanceRepository.java`
- Modify: `backend/src/main/java/com/hrms/application/leave/service/LeaveBalanceService.java`

The `accrueLeave`, `deductLeave`, and `creditLeave` methods call `getOrCreateBalance()` then modify and save. Concurrent requests can cause race conditions. `LeaveBalance` already has `@Version` for optimistic locking, but we should add a pessimistic lock query for the critical path.

**Note:** `LeaveBalance` already has `@Version` (inherited from `BaseEntity`), which provides optimistic locking. The comment `R2-001 FIX` in LeaveBalance.java confirms this was intentional. However, optimistic locking throws `ObjectOptimisticLockingFailureException` on conflict — it doesn't prevent the race, it just detects it. For leave deductions where we need guaranteed consistency, pessimistic locking is safer.

- [ ] **Step 1: Add pessimistic lock query to LeaveBalanceRepository**

Add to `LeaveBalanceRepository.java`:

```java
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT lb FROM LeaveBalance lb WHERE lb.employeeId = :employeeId AND lb.leaveTypeId = :leaveTypeId AND lb.year = :year AND lb.tenantId = :tenantId")
Optional<LeaveBalance> findForUpdate(
    @Param("employeeId") UUID employeeId,
    @Param("leaveTypeId") UUID leaveTypeId,
    @Param("year") Integer year,
    @Param("tenantId") UUID tenantId);
```

- [ ] **Step 2: Update LeaveBalanceService to use pessimistic lock for mutations**

In `LeaveBalanceService.java`, update the `getOrCreateBalance` method (or create a `getOrCreateBalanceForUpdate` variant) to use `findForUpdate` when called from mutation methods:

Add a new private method:

```java
private LeaveBalance getOrCreateBalanceForUpdate(UUID employeeId, UUID leaveTypeId, int year) {
    UUID tenantId = TenantContext.getCurrentTenant();
    return leaveBalanceRepository.findForUpdate(employeeId, leaveTypeId, year, tenantId)
        .orElseGet(() -> {
            LeaveBalance balance = LeaveBalance.builder()
                .tenantId(tenantId)
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .year(year)
                .build();
            return leaveBalanceRepository.save(balance);
        });
}
```

Then update `accrueLeave`, `deductLeave`, and `creditLeave` to call `getOrCreateBalanceForUpdate` instead of `getOrCreateBalance`.

- [ ] **Step 3: Verify backend compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/hrms/infrastructure/leave/repository/LeaveBalanceRepository.java
git add backend/src/main/java/com/hrms/application/leave/service/LeaveBalanceService.java
git commit -m "fix(leave): add pessimistic locking to prevent leave balance race conditions"
```

---

## Phase 3 — Feature Completion

### Task 9: Implement ai_usage_log Table and Complete AiUsageService

**Files:**
- Create: `backend/src/main/resources/db/migration/V41__ai_usage_log.sql`
- Modify: `backend/src/main/java/com/hrms/application/admin/service/AiUsageService.java`
- Create: `backend/src/main/java/com/hrms/domain/admin/AiUsageLog.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/admin/repository/AiUsageLogRepository.java`

- [ ] **Step 1: Create Flyway migration V41**

```sql
-- V41__ai_usage_log.sql
-- AI usage tracking for billing and analytics

CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    feature VARCHAR(100) NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0,
    model_name VARCHAR(100),
    request_metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_ai_usage_log_tenant ON ai_usage_log (tenant_id);
CREATE INDEX idx_ai_usage_log_tenant_created ON ai_usage_log (tenant_id, created_at DESC);
CREATE INDEX idx_ai_usage_log_feature ON ai_usage_log (tenant_id, feature);

-- RLS
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_log_allow_all
  ON ai_usage_log AS PERMISSIVE FOR ALL USING (true);

CREATE POLICY ai_usage_log_tenant_rls
  ON ai_usage_log AS RESTRICTIVE FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  );
```

- [ ] **Step 2: Create AiUsageLog entity**

```java
// backend/src/main/java/com/hrms/domain/admin/AiUsageLog.java
package com.hrms.domain.admin;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "ai_usage_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AiUsageLog extends TenantAware {

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String feature;

    @Column(name = "tokens_used", nullable = false)
    @Builder.Default
    private Integer tokensUsed = 0;

    @Column(name = "cost_usd", precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal costUsd = BigDecimal.ZERO;

    @Column(name = "model_name", length = 100)
    private String modelName;

    @Column(name = "request_metadata", columnDefinition = "JSONB")
    private String requestMetadata;
}
```

- [ ] **Step 3: Create repository**

```java
// backend/src/main/java/com/hrms/infrastructure/admin/repository/AiUsageLogRepository.java
package com.hrms.infrastructure.admin.repository;

import com.hrms.domain.admin.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

    @Query("SELECT COALESCE(SUM(a.tokensUsed), 0) FROM AiUsageLog a WHERE a.tenantId = :tenantId AND a.isDeleted = false")
    long sumTokensByTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COALESCE(SUM(a.tokensUsed), 0) FROM AiUsageLog a WHERE a.isDeleted = false")
    long sumAllTokens();
}
```

- [ ] **Step 4: Update AiUsageService to use real queries**

Replace the placeholder methods in `AiUsageService.java`:

```java
private final AiUsageLogRepository aiUsageLogRepository;

@Transactional(readOnly = true)
public long getAiCreditsUsedForTenant(UUID tenantId) {
    return aiUsageLogRepository.sumTokensByTenant(tenantId);
}

@Transactional(readOnly = true)
public long getAiCreditsUsedAcrossAllTenants() {
    return aiUsageLogRepository.sumAllTokens();
}
```

Update constructor injection (add `AiUsageLogRepository` to `@RequiredArgsConstructor` fields, remove `AuditLogRepository` if no longer needed).

- [ ] **Step 5: Verify backend compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V41__ai_usage_log.sql
git add backend/src/main/java/com/hrms/domain/admin/AiUsageLog.java
git add backend/src/main/java/com/hrms/infrastructure/admin/repository/AiUsageLogRepository.java
git add backend/src/main/java/com/hrms/application/admin/service/AiUsageService.java
git commit -m "feat(admin): implement ai_usage_log table and complete AiUsageService"
```

---

### Task 10: Add Employee avatarUrl Field

**Files:**
- Modify: `backend/src/main/java/com/hrms/domain/employee/Employee.java`
- Create: `backend/src/main/resources/db/migration/V42__employee_avatar_url.sql`
- Modify: `backend/src/main/java/com/hrms/application/mobile/service/MobileService.java` (remove TODO)

- [ ] **Step 1: Add avatarUrl field to Employee entity**

In `Employee.java`, add after the existing `country` field (around line 78):

```java
@Column(name = "avatar_url", length = 500)
private String avatarUrl;
```

- [ ] **Step 2: Create migration V42**

```sql
-- V42__employee_avatar_url.sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
```

- [ ] **Step 3: Fix MobileService TODO**

In `MobileService.java`, replace:
```java
.avatarUrl(null) // TODO: Add avatarUrl field to Employee entity
```

With:
```java
.avatarUrl(employee.getAvatarUrl())
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend && ./mvnw compile -q`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/hrms/domain/employee/Employee.java
git add backend/src/main/resources/db/migration/V42__employee_avatar_url.sql
git add backend/src/main/java/com/hrms/application/mobile/service/MobileService.java
git commit -m "feat(employee): add avatarUrl field with migration V42"
```

---

### Task 11: Migrate Reports Page to React Query

**Files:**
- Modify: `frontend/app/reports/page.tsx`
- Create: `frontend/lib/hooks/queries/useReportDownload.ts`

The reports page imports `reportService` directly and calls it in async handlers. This bypasses React Query. Since reports are download-only (blob responses), the best pattern is `useMutation` for each download action.

- [ ] **Step 1: Create useReportDownload hook**

```typescript
// frontend/lib/hooks/queries/useReportDownload.ts
'use client';

import { useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { reportService, ReportRequest, ReportType } from '@/lib/services/report.service';

const downloadFns: Record<ReportType, (req: ReportRequest) => Promise<void>> = {
  'employee-directory': (req) => reportService.downloadEmployeeReport(req),
  'attendance': (req) => reportService.downloadAttendanceReport(req),
  'department-headcount': (req) => reportService.downloadDepartmentReport(req),
  'leave': (req) => reportService.downloadLeaveReport(req),
  'payroll': (req) => reportService.downloadPayrollReport(req),
  'performance': (req) => reportService.downloadPerformanceReport(req),
};

export function useReportDownload() {
  return useMutation<void, Error, { type: ReportType; request: ReportRequest }>({
    mutationFn: ({ type, request }) => {
      const fn = downloadFns[type];
      if (!fn) throw new Error(`Unknown report type: ${type}`);
      return fn(request);
    },
    onError: (error) => {
      notifications.show({
        title: 'Download Failed',
        message: error.message || 'Failed to download report',
        color: 'red',
      });
    },
  });
}
```

- [ ] **Step 2: Update reports/page.tsx to use the hook**

Replace the direct `reportService` import:
```typescript
// REMOVE:
import { reportService, ReportRequest } from '@/lib/services/report.service';
```

With:
```typescript
// ADD:
import { ReportRequest, ReportType } from '@/lib/services/report.service';
import { useReportDownload } from '@/lib/hooks/queries/useReportDownload';
```

Inside the component, add:
```typescript
const downloadMutation = useReportDownload();
```

Then update the download handler to use the mutation instead of calling `reportService` directly:
```typescript
const handleDownload = (endpoint: string, request: ReportRequest) => {
  downloadMutation.mutate({ type: endpoint as ReportType, request });
};
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/macbook/IdeaProjects/nulogic/nu-aura/frontend && npx next build --no-lint 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/hooks/queries/useReportDownload.ts
git add frontend/app/reports/page.tsx
git commit -m "refactor(reports): migrate report downloads to React Query useMutation"
```

---

## Summary

| Task | Phase | Severity | Est. Time |
|------|-------|----------|-----------|
| 1. Health endpoint | 1 | CRITICAL | 5 min |
| 2. Admin forms | 1 | CRITICAL | 30 min |
| 3. Helpdesk landing | 1 | CRITICAL | 30 min |
| 4. LeaveType return type | 1 | HIGH | 15 min |
| 5. Shift activate/deactivate | 1 | HIGH | 30 min |
| 6. Knowledge entities TenantAware | 2 | CRITICAL | 45 min |
| 7. AttendanceTimeEntry tenant_id | 2 | CRITICAL | 30 min |
| 8. LeaveBalance pessimistic locking | 2 | MEDIUM | 30 min |
| 9. ai_usage_log implementation | 3 | HIGH | 45 min |
| 10. Employee avatarUrl | 3 | HIGH | 15 min |
| 11. Reports React Query migration | 3 | HIGH | 30 min |

**Total estimated time: ~5 hours across 3 phases**
