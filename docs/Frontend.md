# NU-AURA Frontend — Deep Architecture Reference

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Overview

Next.js 14 App Router application with TypeScript strict mode. 196 pages across 4 sub-apps, 129 components, 94 API services, 85+ hooks. Production-hardened with OWASP security headers, cookie-based auth, and comprehensive E2E testing.

---

## Page Inventory (196 Pages)

### NU-HRMS (Core HR)
| Route | Page | Purpose |
|-------|------|---------|
| `/auth/login` | Login | Email/password + Google SSO |
| `/auth/signup` | Register | New user registration |
| `/auth/forgot-password` | Password Reset | Email-based reset flow |
| `/me/dashboard` | Self-Service Dashboard | Employee's personal view |
| `/me/profile` | My Profile | View/edit own profile |
| `/me/attendance` | My Attendance | Personal punch records |
| `/me/leaves` | My Leaves | Personal leave balance + requests |
| `/employees/directory` | Employee Directory | Searchable employee list |
| `/employees/[id]/edit` | Employee Edit | Admin employee editing |
| `/departments` | Departments | Department management |
| `/organization-chart` | Org Chart | Visual org hierarchy |
| `/attendance/*` | Attendance Suite | team, shift-swap, comp-off, regularization |
| `/leave/*` | Leave Suite | my-leaves, calendar, request |
| `/payroll/*` | Payroll Suite | payslips, bulk-processing, statutory |
| `/compensation` | Compensation | Salary structure management |
| `/expenses` | Expenses | Expense claims + approval |
| `/loans/[id]` | Loans | Loan applications |
| `/travel` | Travel | Travel requests |
| `/assets` | Assets | Asset management |
| `/benefits` | Benefits | Benefit enrollment |
| `/helpdesk` | Help Desk | Support tickets |
| `/letters` | Letters | Letter generation (offer, experience, etc.) |
| `/admin/*` | Admin Panel | 15+ admin pages (roles, holidays, shifts, etc.) |
| `/reports/*` | Reports | Payroll, scheduled, utilization |
| `/analytics/*` | Analytics | Org health, advanced analytics |
| `/calendar` | Calendar | Event management |
| `/documents` | Documents | Document management |
| `/settings` | Settings | System + security settings |

### NU-Hire (Recruitment)
| Route | Purpose |
|-------|---------|
| `/recruitment/[jobId]/kanban` | ATS Kanban board |
| `/recruitment/pipeline` | Recruitment pipeline view |
| `/recruitment/interviews` | Interview scheduling |
| `/recruitment/job-boards` | Job board integration |
| `/onboarding/[id]` | Onboarding process |
| `/onboarding/templates/[id]` | Onboarding template editor |
| `/offboarding/exit/fnf` | Full & final settlement |
| `/preboarding/portal/[token]` | Public preboarding portal |
| `/careers` | Public careers page |
| `/offer-portal` | Offer acceptance portal |

### NU-Grow (Performance & Learning)
| Route | Purpose |
|-------|---------|
| `/performance/9box` | 9-box matrix |
| `/performance/cycles/[id]/nine-box` | Cycle-specific calibration |
| `/performance/revolution` | Performance revolution |
| `/okr` | OKR management |
| `/feedback360` | 360-degree feedback |
| `/learning/courses/[id]/play` | Course player |
| `/learning/paths` | Learning paths |
| `/learning/certificates` | Certificate management |
| `/training` | Training management |
| `/recognition` | Employee recognition |
| `/wellness` | Wellness programs |
| `/surveys` | Pulse surveys |

### NU-Fluence (Knowledge)
| Route | Purpose |
|-------|---------|
| `/fluence/wiki` | Wiki spaces |
| `/fluence/wiki/[slug]` | Wiki page view |
| `/fluence/wiki/[slug]/edit` | Wiki page editor |
| `/fluence/blogs` | Blog listing |
| `/fluence/templates/[id]` | Template viewer |
| `/fluence/drive` | Drive integration |
| `/fluence/search` | Knowledge search |
| `/fluence/wall` | Social wall |
| `/fluence/dashboard` | Fluence dashboard |

### Platform
| Route | Purpose |
|-------|---------|
| `/app/hrms` | NU-HRMS entry point |
| `/app/hire` | NU-Hire entry point |
| `/app/grow` | NU-Grow entry point |
| `/app/fluence` | NU-Fluence entry point |
| `/dashboards/employee` | Employee dashboard |
| `/dashboards/manager` | Manager dashboard |
| `/dashboards/executive` | Executive dashboard |
| `/approvals/inbox` | Approval inbox |
| `/projects/*` | Project management (gantt, calendar, resource-conflicts) |
| `/resources/*` | Resource management (availability, capacity, workload) |
| `/contracts/*` | Contract management |
| `/announcements` | Company announcements |
| `/time-tracking` | Time tracking |
| `/timesheets` | Timesheets |

---

## Component Architecture (129 Components)

### Directory Structure
| Directory | Count | Key Components |
|-----------|-------|---------------|
| `ui/` | 20+ | Button, Input, Select, Modal, Card, Skeleton, Spinner, Badge, FileUpload, EmptyState, ResponsiveTable, AnimatedCard |
| `layout/` | 8 | AppLayout, Header, Sidebar, Breadcrumbs, GlobalSearch, MobileBottomNav, DarkModeProvider, MantineThemeProvider |
| `auth/` | 6 | AuthGuard, PermissionGate, MfaSetup, MfaVerification |
| `platform/` | 1 | AppSwitcher (waffle grid) |
| `dashboard/` | 8 | WelcomeBanner, LeaveBalanceWidget, TimeClockWidget, TeamPresenceWidget, HolidayCarousel, PostComposer |
| `fluence/` | 14 | RichTextEditor (TipTap), FluenceChatWidget, SlashMenu, FloatingBar, ContentViewer, TableOfContents |
| `resource-management/` | 7 | AllocationApprovalModal, WorkloadHeatmap, ResourceAvailabilityCalendar |
| `charts/` | 4 | AttendanceTrendChart, DepartmentDistributionChart, HeadcountTrendChart, LeaveDistributionChart |
| `errors/` | 3 | ErrorBoundary, PageErrorFallback, SectionBoundary |
| `notifications/` | 2 | NotificationBell, WebSocketProvider |
| `wall/` | 4 | WallCards, PostComposer, ReactionBar, CommentThread |
| Others | 52 | employee, projects, performance, recruitment, training, expenses, admin, custom-fields |

---

## API Layer

### Axios Client (`frontend/lib/api/client.ts`)
224 lines, production-hardened:

- **Auth**: HttpOnly cookies with `withCredentials: true` (no tokens in localStorage)
- **CSRF**: Double-submit pattern (`X-XSRF-TOKEN` from cookie)
- **Tenant**: `X-Tenant-ID` header on every request (from localStorage)
- **Timeout**: 30 seconds
- **401 Handling**: Shared refresh Promise prevents race conditions; auto-retry after refresh; fallback redirect to `/auth/login?reason=expired`

### Methods
```typescript
get<T>(url, config?)
post<T, D>(url, data?, config?)
put<T, D>(url, data?, config?)
patch<T, D>(url, data?, config?)
delete<T>(url, config?)
setTenantId(tenantId)    // Called after login
clearTokens()            // Revokes all client state
resetRedirectFlag()      // Reset 401 handler after fresh login
```

### Service Files (94 total)
Located in `frontend/lib/api/` and `frontend/lib/services/`. Every backend module has a corresponding service file.

---

## React Query Hooks

### Query Key Pattern (Hierarchical)
```typescript
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (page, size, sortBy, sortDirection) => [...employeeKeys.lists(), {...}] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id) => [...employeeKeys.details(), id] as const,
  search: (query) => [...employeeKeys.all, 'search', query] as const,
  managers: () => [...employeeKeys.all, 'managers'] as const,
};
```

### Mutation Pattern
```typescript
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeeService.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}
```

### Key Hooks by Module
- **Employee**: useEmployees, useEmployee, useMyEmployee, useManagers, useEmployeeHierarchy, useSubordinates
- **Leave**: useLeaves, useMyLeaves, useLeaveBalance, useLeaveApprove/Reject/Cancel, useLeaveTypes
- **Attendance**: useAttendanceRecords, useAttendanceRegularization, useShiftSwap, useTeamAttendance
- **Approvals**: useApprovalInbox (polls every 30s), useApprovalInboxCount, useApprove/Reject
- **Payroll**: usePayroll, usePayrollRun, usePayslips, usePayrollApprove
- **Performance**: usePerformanceReviews, useReviewCreate/Submit, useFeedback360, useCalibrationMatrix
- **Recruitment**: useRecruitment, useApplicants, useJobPostings
- **Projects**: useProjects, useProjectTasks, useProjectUpdate
- **Fluence**: useFluence, useWiki, useWall, useKnowledgeBase
- **Plus**: expenses, benefits, loans, travel, training, compensation, tax, analytics, contracts, recognition, surveys, calendar, integrations, learning, wellness, admin

---

## Auth Store (Zustand)

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login(credentials: LoginRequest): Promise<void>;
  googleLogin(credentials: GoogleLoginRequest): Promise<void>;
  logout(): Promise<void>;
  setUser(user: User | null): void;
  restoreSession(): Promise<boolean>;
}
```

- **Storage**: `sessionStorage` (per-tab auth state)
- **Partialize**: Only `user` and `isAuthenticated` persisted
- **Session Restore**: `restoreSession()` calls `/auth/refresh` to recover from HttpOnly cookie

---

## Middleware (`frontend/middleware.ts`)

323 lines, OWASP-hardened edge middleware.

### Flow
1. Skip: API routes, Next.js internals, static assets
2. Public routes → Allow with security headers
3. Auth token missing → Redirect `/auth/login?returnUrl=...`
4. Token expired → Redirect to login
5. SUPER_ADMIN → Bypass all further checks
6. Else → Allow (fine-grained checks client-side via AuthGuard)

### Security Headers
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000
Cross-Origin-Opener-Policy: same-origin-allow-popups
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Platform Configuration (`frontend/lib/config/apps.ts`)

### App Definitions
```typescript
interface NuApp {
  code: 'HRMS' | 'HIRE' | 'GROW' | 'FLUENCE';
  name: string;
  entryRoute: string;
  permissionPrefixes: string[];  // RBAC gating
  routePrefixes: string[];       // Route → app mapping
  available: boolean;
  order: number;
}
```

### Sidebar Section Mapping
```typescript
APP_SIDEBAR_SECTIONS: {
  HRMS: ['home', 'my-space', 'people', 'hr-ops', 'finance', 'projects-workspace', 'reports-analytics', 'admin'],
  HIRE: ['hire-hub'],
  GROW: ['grow-hub'],
  FLUENCE: ['fluence-hub'],
}
```

---

## Permission Gating Patterns

```typescript
// Component level
<PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
  <CreateButton />
</PermissionGate>

// Hook level
const { hasPermission, isAdmin } = usePermissions();
if (!hasPermission(Permissions.PAYROLL_APPROVE)) return <AccessDenied />;

// Route level (middleware + AuthGuard)
// Checked at Edge, then client-side
```

---

## Form Pattern (React Hook Form + Zod)

14 validation schema files in `frontend/lib/validations/`.

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema } from '@/lib/validations/employee';

export function CreateEmployeeForm() {
  const form = useForm({
    resolver: zodResolver(createEmployeeSchema),
    mode: 'onChange',
  });
  const { mutate, isPending } = useCreateEmployee();
  return (
    <form onSubmit={form.handleSubmit((data) => mutate(data))}>
      <TextInput label="Code" {...form.register('employeeCode')}
        error={form.formState.errors.employeeCode?.message} />
      <Button type="submit" disabled={isPending}>Create</Button>
    </form>
  );
}
```

---

## Theming

### Tailwind CSS
- Dark mode: `class` strategy (`.dark` on `<html>`)
- Design tokens via CSS variables (`--bg-main`, `--text-primary`, etc.)
- Font: Inter (via next/font)

### Mantine
- Primary color: blue (Radix UI sky scale)
- 30+ component overrides in `lib/theme/mantine-theme.ts`
- Synced with dark mode via `MantineThemeProvider`

### Dark Mode
- Provider: `DarkModeProvider` (React context + localStorage)
- FOUC prevention: Script in layout.tsx reads browser preference
- Options: light, dark, system

---

## Animation (Framer Motion)

- **AnimatedCard**: fadeInUp, scaleIn variants
- **AnimatedList**: stagger effects for list items
- **AppSwitcher**: dropdown with AnimatePresence
- **Modals**: backdrop fade + content slide

---

## E2E Tests (Playwright)

45+ specs covering:
- **Auth**: Login, signup, password reset, MFA, Google OAuth
- **RBAC**: Permission gating, role-based access, app switcher locking
- **Workflows**: Leave approval, expense approval, performance review
- **CRUD**: Employees, projects, recruitment, payroll
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile**: Responsive sidebar, bottom nav
- **Edge Cases**: Network failures, slow endpoints

---

## npm Dependencies (Key)

| Category | Packages |
|----------|----------|
| Framework | next 14.2.35, react 18.2, typescript 5.9.3 |
| UI | @mantine/core 8.3.14, tailwindcss 3.4, framer-motion 12.23 |
| State | zustand 4.4.7, @tanstack/react-query 5.17 |
| HTTP | axios 1.7.8 |
| Forms | react-hook-form 7.49, zod 3.22, @hookform/resolvers 3.9 |
| Rich Text | @tiptap/react 3.20, dompurify 3.3, lowlight 3.3 |
| Charts | recharts 3.5 |
| Icons | lucide-react 0.561, @tabler/icons-react 3.36 |
| WebSocket | @stomp/stompjs 7.2, sockjs-client 1.6 |
| Auth | @react-oauth/google 0.12, jwt-decode 4.0 |
| DnD | @hello-pangea/dnd 18.0 |
| Testing | playwright 1.57, vitest, @testing-library/react 14.2 |
