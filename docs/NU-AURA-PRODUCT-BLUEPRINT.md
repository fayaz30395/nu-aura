# NU-AURA — Product Blueprint & UI Redesign Guide

> **Purpose:** Complete product understanding document to guide the comprehensive UI redesign. All data verified from codebase 2026-11-20.

---

## TABLE OF CONTENTS

1. [Platform Overview](#platform-overview)
2. [Complete Screen Inventory](#complete-screen-inventory)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Application Architecture](#application-architecture)
5. [User Journeys](#user-journeys)
6. [Design System Requirements](#design-system-requirements)
7. [Redesign Priority Order](#redesign-priority-order)

---

## PLATFORM OVERVIEW

### What is NU-AURA?

Multi-tenant HR platform bundling **four sub-applications** on shared infrastructure:

| App | Domain | Routes | Entry Point |
|-----|--------|--------|-------------|
| **NU-HRMS** | Core HR, attendance, payroll, expenses, statutory | 190 | `/me/dashboard` |
| **NU-Hire** | Recruitment, ATS, onboarding, offboarding, e-sign | 27 | `/recruitment` |
| **NU-Grow** | Performance, OKRs, learning, recognition, wellness | 38 | `/performance` |
| **NU-Fluence** | Wiki, blogs, knowledge base, AI chat, activity wall | 17 | `/fluence` |

**Total:** 286 pages · 171 components · 1,711 API endpoints

### Tech Stack (Current)

**Frontend:**
- Next.js 16 (App Router), React 19, TypeScript strict
- Mantine UI 9 + Tailwind CSS
- TanStack Query v5 (server state)
- Zustand (client state)
- Tiptap (rich text), Recharts (charts), Framer Motion (animations)

**Backend:**
- Java 21, Spring Boot 3.5.14
- PostgreSQL 16 + Row-Level Security (multi-tenant)
- Redis 7 (cache, rate limiting, locks)
- Kafka (events, optional)
- Elasticsearch 8.11 (search, optional - currently disabled in prod)

**Current Deployment:**
- Frontend: Vercel (https://hrms-frontend-vert.vercel.app)
- Backend: Railway (render profile, PG+Redis, Kafka dormant)

---

## COMPLETE SCREEN INVENTORY

### Public Routes (10 screens, no auth)

| Route | Purpose | Key Actions |
|-------|---------|-------------|
| `/` | Marketing landing | Sign up, log in |
| `/auth/login` | Login page | Email/password, Google OAuth |
| `/auth/signup` | Signup page | Create account |
| `/auth/forgot-password` | Password reset | Request reset link |
| `/careers` | Public job board | Browse jobs, apply |
| `/offer-portal` | Candidate offer acceptance | View/accept offer |
| `/preboarding/portal/[token]` | Pre-join portal | Submit info, documents, e-sign |
| `/sign/[token]` | E-signature portal | Sign documents |
| `/exit-interview/[token]` | Exit survey | Complete exit interview |
| `/about`, `/pricing`, `/contact`, `/features` | Marketing pages | SEO, conversion |

---

### NU-HRMS Routes (190 screens)

#### Self-Service Portal (`/me/*` — 8 screens)

| Route | Purpose | Primary User | Key Actions |
|-------|---------|--------------|-------------|
| `/me/dashboard` | Personal dashboard | All employees | View attendance, leave balance, upcoming holidays, quick actions |
| `/me/profile` | View/edit profile | All employees | Update personal info, photo, emergency contacts |
| `/me/leaves` | Leave history | All employees | View requests, balances, upcoming leaves |
| `/me/attendance` | Attendance records | All employees | View attendance, regularize punches |
| `/me/payslips` | Payslip access | Employees | Download payslips by month |
| `/me/documents` | Personal documents | All employees | View uploaded docs |
| `/me/assets` | Assigned assets | All employees | View assigned equipment |
| `/me/skills` | Skill profile | All employees | Add/update skills |

#### Admin Console (`/admin/*` — 26 screens)

| Area | Screens | Primary User | Purpose |
|------|---------|--------------|---------|
| Core admin | `/admin`, `/admin/settings`, `/admin/system` | TENANT_ADMIN, HR_ADMIN | Platform config, tenant settings |
| User management | `/admin/users`, `/admin/roles`, `/admin/permissions`, `/admin/implicit-roles` | TENANT_ADMIN, HR_ADMIN | RBAC management |
| Organization | `/admin/departments`, `/admin/employees`, `/admin/org-hierarchy`, `/admin/office-locations` | HR_ADMIN, HR_MANAGER | Org structure |
| Time & attendance | `/admin/holidays`, `/admin/shifts`, `/admin/leave-types`, `/admin/leave-requests` | HR_ADMIN, HR_MANAGER | Leave/attendance policy |
| Payroll & finance | `/admin/payroll`, `/admin/budget` | PAYROLL_ADMIN | Payroll configuration |
| System | `/admin/feature-flags`, `/admin/integrations`, `/admin/mobile-api`, `/admin/audit`, `/admin/reports` | TENANT_ADMIN, HR_ADMIN | Platform administration |
| Data | `/admin/import-keka`, `/admin/custom-fields` | TENANT_ADMIN, HR_ADMIN | Bulk operations, field customization |

#### People & Organization (7 screens)

| Route | Purpose | Primary User |
|-------|---------|--------------|
| `/employees` | Employee directory | HR, Managers |
| `/employees/directory` | Advanced directory with filters | All employees |
| `/employees/[id]` | Employee profile | HR, Managers |
| `/employees/[id]/edit` | Edit employee | HR_ADMIN |
| `/employees/[id]/compensation` | Compensation details | HR_ADMIN, PAYROLL_ADMIN |
| `/employees/change-requests` | Profile change requests | HR_MANAGER |
| `/employees/import` | Bulk employee import | HR_ADMIN |
| `/departments` | Department management | HR_ADMIN |
| `/team-directory` | Team view | Managers |

#### Time & Attendance (19 screens)

| Area | Routes | Purpose |
|------|--------|---------|
| Attendance core | `/attendance`, `/attendance/my-attendance`, `/attendance/team`, `/attendance/regularization`, `/attendance/comp-off`, `/attendance/shift-swap` | Clock in/out, view, regularize, comp-off |
| Shifts | `/shifts`, `/shifts/definitions`, `/shifts/patterns`, `/shifts/my-schedule`, `/shifts/swaps` | Shift management, roster, swaps |
| Time tracking | `/time-tracking`, `/time-tracking/new`, `/time-tracking/[id]`, `/time-tracking/[id]/edit`, `/timesheets` | Project time tracking, timesheets |
| Supporting | `/overtime`, `/holidays`, `/restricted-holidays`, `/biometric-devices` | OT requests, holiday calendar, device sync |

#### Leave Management (8 screens)

| Route | Purpose | Workflow |
|-------|---------|----------|
| `/leave` | Leave overview | Dashboard view |
| `/leave/apply` | Request leave | Apply → pending approval |
| `/leave/my-leaves` | Personal leave history | View status, cancel |
| `/leave/team` | Team leave calendar | Manager view |
| `/leave/approvals` | Pending approvals | Manager/HR approve/reject |
| `/leave/calendar` | Organization leave calendar | Planning view |
| `/leave/encashment` | Leave encashment | Submit encashment requests |
| `/leave/admin/carry-forward` | Year-end carry-forward | Admin bulk operation |

#### Finance & Payroll (28 screens)

| Area | Routes | Primary User | Purpose |
|------|--------|--------------|---------|
| Payroll | `/payroll`, `/payroll/runs`, `/payroll/runs/[id]`, `/payroll/bulk-processing`, `/payroll/payslips`, `/payroll/components`, `/payroll/salary-structures`, `/payroll/structures` | PAYROLL_ADMIN | Process payroll, manage structures |
| Compensation | `/compensation`, `/benefits` | PAYROLL_ADMIN | Comp planning, benefits |
| Expenses | `/expenses`, `/expenses/[id]`, `/expenses/approvals`, `/expenses/reports`, `/expenses/mileage`, `/expenses/settings` | Employees, Managers | Submit/approve expenses |
| Loans & assets | `/loans`, `/loans/new`, `/loans/[id]`, `/assets` | HR, Employees | Loan management, asset tracking |
| Travel | `/travel`, `/travel/new`, `/travel/[id]`, `/travel/expenses` | Employees | Travel requests, expense claims |
| Statutory & tax | `/statutory`, `/statutory/filings`, `/tax`, `/tax/declarations`, `/lwf`, `/payments`, `/payments/config` | PAYROLL_ADMIN | Indian statutory compliance |

#### Projects & Resources (14 screens)

| Area | Routes | Purpose |
|------|--------|---------|
| Projects | `/projects`, `/projects/[id]`, `/projects/calendar`, `/projects/gantt` | Project tracking |
| PSA | `/projects/psa`, `/projects/psa/timesheets`, `/projects/psa/invoices` | Professional services automation |
| Resources | `/allocations`, `/allocations/summary`, `/resources`, `/resources/pool`, `/resources/availability`, `/resources/capacity`, `/resources/workload`, `/resources/approvals`, `/projects/resource-conflicts` | Resource planning, utilization |

#### Documents & Communications (13 screens)

| Route | Purpose |
|-------|---------|
| `/documents` | Document management |
| `/letters`, `/letters/templates` | HR letters, templates |
| `/announcements` | Company announcements |
| `/inbox` | Inbox/notifications |
| `/notifications` | Notification center |
| `/helpdesk`, `/helpdesk/tickets`, `/helpdesk/tickets/[id]`, `/helpdesk/sla`, `/helpdesk/knowledge-base` | HR helpdesk ticketing |
| `/contracts`, `/contracts/new`, `/contracts/[id]`, `/contracts/templates` | Contract management |

#### Reports & Analytics (14 screens)

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main dashboard |
| `/dashboards/employee` | Employee dashboard |
| `/dashboards/executive` | Executive dashboard |
| `/dashboards/manager` | Manager dashboard |
| `/analytics`, `/analytics/org-health` | Organization health analytics |
| `/predictive-analytics` | AI-powered predictions |
| `/reports` | Report hub |
| `/reports/builder` | Custom report builder |
| `/reports/scheduled` | Scheduled reports |
| `/reports/headcount`, `/reports/attrition`, `/reports/leave`, `/reports/payroll`, `/reports/performance`, `/reports/utilization` | Specific reports |

#### Settings & Workflows (15 screens)

| Area | Routes | Purpose |
|------|--------|---------|
| Settings | `/settings`, `/settings/profile`, `/settings/notifications`, `/settings/privacy`, `/settings/rbac`, `/settings/security`, `/settings/security/api-keys`, `/settings/sso` | User preferences, security |
| Workflows | `/workflows`, `/workflows/[id]`, `/approvals`, `/approvals/inbox` | Workflow automation, approval queue |
| Integrations | `/integrations`, `/integrations/slack`, `/integrations/webhooks` | Third-party integrations |
| Calendar | `/calendar`, `/calendar/new`, `/calendar/[id]`, `/nu-calendar` | Calendar management |

#### Supporting & Misc (12 screens)

| Route | Purpose |
|-------|---------|
| `/compliance`, `/probation`, `/security`, `/tasks` | Compliance, probation tracking, security, tasks |
| `/company-spotlight`, `/linkedin-posts`, `/knowledge` | Internal comms, LinkedIn integration, knowledge access |
| `/import-export`, `/executive` | Data operations, executive portal |
| `/nu-drive`, `/nu-mail` | Drive access, mail integration |

---

### NU-HIRE Routes (27 screens)

#### Recruitment Core (`/recruitment/*` — 14 screens)

| Route | Purpose | Primary User | Key Features |
|-------|---------|--------------|--------------|
| `/recruitment` | Recruitment dashboard | Recruiters | Stats, pipeline view, interviews this week |
| `/recruitment/jobs` | Job openings | Recruiters | Requisitions, status management |
| `/recruitment/candidates` | Candidate list | Recruiters | Search, filter, status |
| `/recruitment/candidates/[id]` | Candidate profile | Recruiters | Resume, evaluation, notes, timeline |
| `/recruitment/candidates/[id]/offer` | Generate offer | Recruiters | Offer letter creation |
| `/recruitment/pipeline` | Pipeline view | Recruiters | Stage-based view |
| `/recruitment/kanban` | Kanban board (all jobs) | Recruiters | Drag-drop candidates |
| `/recruitment/[jobId]/kanban` | Per-job kanban | Recruiters | Job-specific board |
| `/recruitment/interviews` | Interview scheduling | Recruiters, Interviewers | Schedule, feedback |
| `/recruitment/scorecards` | Scorecard templates | Recruiters | Evaluation rubrics |
| `/recruitment/agencies` | Partner agencies | Recruiters | Agency list |
| `/recruitment/agencies/[id]` | Agency detail | Recruiters | Submissions, performance |
| `/recruitment/job-boards` | Job board syndication | Recruiters | External posting |
| `/recruitment/career-page` | Career page management | Recruiters | Public page config |

#### Onboarding & Offboarding (12 screens)

| Route | Purpose | Primary User |
|-------|---------|--------------|
| `/onboarding` | Onboarding overview | HR, Managers |
| `/onboarding/new` | Start onboarding | HR |
| `/onboarding/[id]` | Onboarding process detail | HR, Buddy |
| `/onboarding/templates` | Checklist templates | HR |
| `/onboarding/templates/new` | Create template | HR |
| `/onboarding/templates/[id]` | Template detail | HR |
| `/offboarding` | Offboarding overview | HR |
| `/offboarding/[id]` | Offboarding process | HR |
| `/offboarding/[id]/exit-interview` | Exit interview | HR |
| `/offboarding/[id]/fnf` | Full & final settlement | HR, Payroll |
| `/offboarding/exit/fnf` | FnF overview | HR, Payroll |
| `/offboarding/fnf` | FnF list | HR, Payroll |

#### Supporting (1 screen)

| Route | Purpose |
|-------|---------|
| `/referrals` | Employee referral submissions |

**Public routes handled by NU-Hire:** `/careers`, `/offer-portal`, `/sign/[token]`, `/preboarding/portal/[token]`, `/exit-interview/[token]`

---

### NU-GROW Routes (38 screens)

#### Performance & Reviews (`/performance/*` — 16 screens)

| Route | Purpose | Primary User |
|-------|---------|--------------|
| `/performance` | Performance hub | Employees, Managers |
| `/performance/revolution` | Continuous performance | All |
| `/performance/reviews` | Review list | All |
| `/performance/cycles` | Review cycles | HR, Managers |
| `/performance/cycles/[id]/calibration` | Calibration session | Managers |
| `/performance/cycles/[id]/nine-box` | 9-box grid | HR, Managers |
| `/performance/calibration` | Calibration overview | HR |
| `/performance/9box` | Talent grid | HR |
| `/performance/feedback` | Continuous feedback | All |
| `/performance/pip` | Performance Improvement Plans | Managers, HR |
| `/performance/goals` | Goals | All |
| `/performance/okr`, `/performance/okrs` | OKRs | All |
| `/performance/360-feedback` | 360° feedback | All |
| `/performance/competency-framework` | Competency framework | HR |
| `/performance/competency-matrix` | Competency matrix | All |

#### Goals & OKRs (3 screens)

| Route | Purpose |
|-------|---------|
| `/goals` | Goal management |
| `/okr` | OKR dashboard |
| `/feedback360` | 360° feedback overview |

#### Learning & Training (11 screens)

| Area | Routes | Purpose |
|------|--------|---------|
| LMS | `/learning`, `/learning/courses`, `/learning/courses/[id]`, `/learning/courses/[id]/play`, `/learning/courses/[id]/quiz/[quizId]`, `/learning/paths`, `/learning/certificates` | E-learning courses, quizzes, certificates |
| Training | `/training`, `/training/catalog`, `/training/catalog/[id]`, `/training/my-learning` | Instructor-led training programs |

#### Engagement & Wellness (8 screens)

| Route | Purpose | Primary User |
|-------|---------|--------------|
| `/one-on-one` | 1-on-1 meetings | Managers, Employees |
| `/recognition` | Peer recognition | All |
| `/surveys` | Survey list | All |
| `/surveys/pulse` | Pulse surveys | All |
| `/surveys/[id]` | Survey detail | All |
| `/surveys/[id]/respond` | Take survey | All |
| `/surveys/[id]/analytics` | Survey results | HR, Managers |
| `/wellness`, `/wellness/admin` | Wellness programs, challenges | All, HR Admin |

---

### NU-FLUENCE Routes (17 screens)

| Area | Routes | Purpose |
|------|--------|---------|
| Hub | `/fluence`, `/fluence/dashboard`, `/fluence/my-content` | Knowledge hub, recent content |
| Wiki | `/fluence/wiki`, `/fluence/wiki/new`, `/fluence/wiki/[slug]`, `/fluence/wiki/[slug]/edit` | Company wiki, documentation |
| Blogs | `/fluence/blogs`, `/fluence/blogs/new`, `/fluence/blogs/[slug]`, `/fluence/blogs/[slug]/edit` | Long-form posts |
| Templates | `/fluence/templates`, `/fluence/templates/new`, `/fluence/templates/[id]` | Page templates |
| Collaboration | `/fluence/drive`, `/fluence/wall` | File storage, activity wall |
| Discovery | `/fluence/search`, `/fluence/analytics` | Full-text search, engagement analytics |

**AI Chat Widget:** Global floating widget (no dedicated route)

---

### Launcher Pages (4 screens)

| Route | Purpose |
|-------|---------|
| `/app/hrms` | NU-HRMS landing |
| `/app/hire` | NU-Hire landing |
| `/app/grow` | NU-Grow landing |
| `/app/fluence` | NU-Fluence landing |

---

## USER ROLES & PERMISSIONS

### Role Hierarchy

```
SUPER_ADMIN (rank 100)
  ↓ TENANT_ADMIN (rank 90)
    ↓ HR_ADMIN (rank 70)
      ↓ HR_MANAGER (rank 60)
        ↓ HR_EXECUTIVE (rank 50)
```

**Superset chain:** TENANT_ADMIN ⊇ HR_ADMIN ⊇ HR_MANAGER

### Core Roles (11 explicit)

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **SUPER_ADMIN** | Platform super admin | All permissions, global bypass |
| **TENANT_ADMIN** | Tenant administrator | All tenant config, user management, all apps |
| **HR_ADMIN** | HR administrator | Full HR operations, some config |
| **HR_MANAGER** | HR manager | View all employees, approve operations |
| **HR_EXECUTIVE** | HR executive | Limited HR operations, no financial access |
| **PAYROLL_ADMIN** | Payroll administrator | Salary edit, payroll processing, statutory |
| **RECRUITMENT_ADMIN** | Recruitment specialist | Full recruitment operations |
| **DEPARTMENT_MANAGER** | Department head | Department-scoped employee view, approvals |
| **TEAM_LEAD** | Team manager | Team-scoped view, leave approvals |
| **EMPLOYEE** | Standard employee | Self-service, submit requests |
| **CONTRACTOR** | Contractor | Limited self-service, no leave |

### Specialized Roles (8 explicit)

| Role | Purpose |
|------|---------|
| **EXPENSE_MANAGER** | Expense approval authority |
| **LMS_ADMIN** | Learning management system admin |
| **COMPLIANCE_OFFICER** | Compliance and audit |
| **INTERVIEWER** | Recruitment interviewer |
| **FINANCE_ADMIN** | Finance operations |
| **MANAGER** | Generic manager role |
| **INTERN** | Intern user |

### Implicit Roles (7 auto-assigned)

Generated based on context:
- **LINE_MANAGER** (assigned manager)
- **TEAM_MEMBER** (team relationship)
- **PROJECT_MANAGER** (project ownership)
- **APPROVER** (approval chain)
- **INTERVIEWER** (interview participation)
- **REVIEWER** (review cycles)
- **TRAINER** (training delivery)

### Permission Categories & Examples

**Core HR:**
- `EMPLOYEE:VIEW_ALL`, `EMPLOYEE:VIEW_SELF`, `EMPLOYEE:CREATE`, `EMPLOYEE:UPDATE`, `EMPLOYEE:DELETE`
- `LEAVE:VIEW`, `LEAVE:REQUEST`, `LEAVE:APPROVE`
- `ATTENDANCE:MARK`, `ATTENDANCE:VIEW`, `ATTENDANCE:MANAGE`
- `PAYROLL:VIEW`, `PAYROLL:PROCESS`, `PAYROLL:APPROVE`

**Financial & Sensitive:**
- `FIELD:EMPLOYEE:SALARY:VIEW` / `EDIT`
- `FIELD:EMPLOYEE:BANK:VIEW` / `EDIT`
- `FIELD:EMPLOYEE:TAX_ID:VIEW`
- `PAYROLL:APPROVE`, `PAYMENT:INITIATE`, `COMPENSATION:MANAGE`

**Recruitment:**
- `RECRUITMENT:VIEW`, `RECRUITMENT:MANAGE`
- `CANDIDATE:VIEW`, `CANDIDATE:EVALUATE`
- `ONBOARDING:MANAGE`
- `AGENCY:MANAGE`

**Performance & Growth:**
- `REVIEW:VIEW`, `REVIEW:CREATE`, `REVIEW:APPROVE`
- `OKR:VIEW`, `OKR:CREATE`, `OKR:APPROVE`
- `FEEDBACK_360:VIEW`, `FEEDBACK_360:MANAGE`
- `LMS:COURSE_VIEW`, `LMS:COURSE_MANAGE`, `LMS:ENROLL`

**Knowledge:**
- `KNOWLEDGE:VIEW`, `KNOWLEDGE:WIKI_READ`, `KNOWLEDGE:BLOG_CREATE`
- `KNOWLEDGE:SEARCH` (AI chat access)
- `WALL:POST`, `WALL:COMMENT`, `WALL:REACT`, `WALL:MANAGE`

**Administration:**
- `ROLE:MANAGE`, `USER:MANAGE`, `PERMISSION:MANAGE`
- `TENANT:MANAGE`, `PLATFORM:MANAGE`
- `SETTINGS:UPDATE`
- `AUDIT:VIEW`

**Total:** ~350 permission keys across all modules

---

## APPLICATION ARCHITECTURE

### App Switcher & Navigation

**Global App Shell:**
- Left sidebar: Product rail (4 apps) + navigation panel
- Top bar: Search, notifications, user menu
- Main content area
- Floating AI chat widget (Fluence)

**App-Specific Navigation:**

Each app has its own sidebar section structure:

**HRMS** (catch-all, default):
- Home
- My Space (self-service)
- People (employees, departments)
- HR Operations (attendance, leave, shifts)
- Finance (payroll, expenses, compensation)
- Projects (PSA, allocations)
- Reports & Analytics
- Settings & Admin

**Hire**:
- Recruitment Dashboard
- Jobs & Candidates
- Interviews & Scorecards
- Agencies & Job Boards
- Onboarding / Offboarding
- Careers & Referrals

**Grow**:
- Performance Hub
- Goals & OKRs
- Reviews & 360 Feedback
- Learning & Training
- Engagement (recognition, surveys, wellness)

**Fluence**:
- Knowledge Hub
- Wiki
- Blogs & Templates
- Drive & Wall
- Search & Analytics

### Component Inventory (171 components)

**UI Primitives (44 components):**
Button, Card, Modal, Select, Input, Tabs, ResponsiveTable, StatCard, EmptyState, Toast, ConfirmDialog, FileUpload, AdvancedFilterPanel, ErrorBoundary, AccessibleFormField, Sidebar, Skeleton, SlidePanel, Spinner, Switch, etc.

**Layout Shell (16 components):**
AppLayout, Header, GlobalSearch, NotificationDropdown, UserMenu, menuSections, Breadcrumbs, ProductRail, NavPanel, TopBar, CommandPalette, etc.

**Domain Components:**
- Fluence (30): RichTextEditor, WikiPageTree, ContentViewer, ChatWidget, etc.
- Dashboard (13): various widgets
- Charts (11): Recharts wrappers
- Resource Management (10): PSA/allocation components
- Auth (7): AuthGuard, PermissionGate, FeatureGate, MFA
- And more for recruitment, performance, notifications, etc.

### State Management

**Server State (TanStack Query):**
- 93 domain query hooks in `lib/hooks/queries/`
- Orval-generated typed API clients
- 5-min stale time, 10-min garbage collection
- No retry on mutations (writes not idempotent)

**Client State (Zustand):**
- Auth store (user, session)
- UI store (sidebar, modals)
- Theme store (dark mode)
- Notification store

**Realtime (WebSocket):**
- STOMP over SockJS
- Notifications, approval tasks
- Multi-pod relay via Redis pub/sub

---

## USER JOURNEYS

### Core Employee Journey

```
Login → Dashboard → View attendance/leave balance → 
  Clock in/out OR Apply leave → 
  View payslip → 
  Update profile
```

### Manager Journey

```
Login → Dashboard → View team attendance/leave →
  Approve/reject requests →
  View team reports →
  Conduct 1-on-1 →
  Review performance
```

### HR Admin Journey

```
Login → Admin Dashboard → Manage employees →
  Configure leave types/shifts →
  Process payroll →
  Generate reports →
  Review compliance
```

### Recruitment Flow

```
Create job opening →
  Receive applications (public/agency/referral) →
  Screen candidates →
  Schedule interviews →
  Evaluate (scorecards) →
  Generate offer →
  E-sign →
  Preboarding →
  Onboarding →
  Convert to employee
```

### Leave Request Flow

```
Employee: Apply leave → Check balance →
Manager: View pending → Approve/reject →
System: Update balance → Notify employee →
Payroll: Reflects in monthly processing
```

### Performance Review Cycle

```
HR: Create review cycle →
Employees/Managers: Set goals/OKRs →
360° feedback requests →
Self-review + manager review →
Calibration session →
9-box talent grid →
Final ratings →
PIP for underperformers
```

### Learning Journey

```
Browse catalog →
Enroll in course/learning path →
Complete modules →
Take quiz →
Pass → Certificate issued →
Skills updated
```

### Knowledge Work (Fluence)

```
Search knowledge base →
  OR Create wiki page →
  Collaborate (comments, edits) →
  Publish →
  Indexed for search/AI chat →
Post to wall (social) →
React, comment
```

---

## DESIGN SYSTEM REQUIREMENTS

### Visual Principles

1. **Premium, Apple-quality aesthetic**
2. **Clean and minimal** — no clutter
3. **Excellent hierarchy** — scannable, clear priority
4. **Consistent spacing** — systematic rhythm
5. **Refined typography** — intentional type scale
6. **Thoughtful interactions** — micro-animations, states
7. **Accessible** — WCAG AA minimum
8. **Professional enterprise SaaS** — not consumer app

### Design Constraints

**Avoid:**
- Generic AI-generated aesthetics
- Excessive gradients/glassmorphism
- Decorative elements without purpose
- Inconsistent styling
- Visual clutter
- Template-like appearance

**Prioritize:**
- Information clarity
- Functional minimalism
- Refined details
- System cohesion
- Premium feel

### Component System Needs

**Typography:**
- Font families (primary, secondary)
- Scale (8-10 sizes)
- Weights (regular, medium, semibold, bold)
- Line heights

**Colors:**
- Brand colors
- Semantic colors (success, warning, error, info)
- Background hierarchy (3-4 levels)
- Text colors (primary, secondary, tertiary, disabled)
- Light theme (required)
- Dark theme (optional, consider later)

**Spacing:**
- Base unit (4px or 8px)
- Scale (xs, sm, md, lg, xl, 2xl, etc.)
- Component padding/margin rules

**Layout:**
- Grid system (12-column or similar)
- Container max-widths
- Breakpoints (mobile, tablet, desktop)
- Sidebar widths

**Shadows:**
- Elevation levels (0-5)
- Use cases per level

**Borders:**
- Default thickness
- Radius values (none, sm, md, lg, full)
- Border colors

**Icons:**
- Icon set (Lucide, Tabler, or custom)
- Sizes (16, 20, 24px standard)
- Stroke width

### Key Component Patterns

**Navigation:**
- Sidebar (collapsed/expanded states)
- Product rail (app switcher)
- Breadcrumbs
- Tabs
- Command palette (Cmd+K)

**Forms:**
- Input fields (text, email, number, etc.)
- Select dropdowns
- Multi-select
- Date/time pickers
- File upload
- Form validation states
- Inline vs modal forms

**Data Display:**
- Tables (sortable, filterable, paginated)
- Responsive tables (mobile)
- Cards (various densities)
- Stat tiles/KPI cards
- Lists
- Empty states
- Loading skeletons

**Feedback:**
- Toasts/notifications
- Alerts (info, success, warning, error)
- Confirmation dialogs
- Inline error messages
- Progress indicators

**Overlays:**
- Modals (small, medium, large, full-screen)
- Drawers/slide panels (left, right)
- Popovers
- Tooltips
- Dropdown menus

**Dashboard Widgets:**
- Chart cards
- Summary cards
- Activity feeds
- Quick action buttons
- Calendar widgets
- Progress rings/bars

### Application-Specific Patterns

**HRMS:**
- Time clock widget (punch in/out)
- Leave balance ring
- Attendance calendar
- Payslip viewer
- Employee directory cards

**Hire:**
- Candidate kanban board
- Interview scheduler
- Scorecard evaluation form
- Job posting card
- Pipeline funnel

**Grow:**
- OKR tree view
- 9-box grid
- Review forms
- Course player
- Recognition feed
- Competency matrix

**Fluence:**
- Rich text editor (Tiptap)
- Wiki page tree
- Blog post card
- Activity wall post
- AI chat widget (floating)
- File upload/browser

---

## REDESIGN PRIORITY ORDER

### Phase 1: Foundation (Week 1)

**1. Design System Establishment**
- Color palette
- Typography
- Spacing scale
- Component primitives

**2. Shared Application Shell**
- Product rail (app switcher)
- Sidebar navigation
- Top bar (search, notifications, user menu)
- Responsive behavior

**3. Global Components**
- Buttons (all variants)
- Form inputs
- Cards
- Modals/drawers
- Toast notifications
- Loading states
- Empty states

---

### Phase 2: Core Experiences (Week 2-3)

**4. HRMS Self-Service Portal**
Priority: Highest (every employee touches daily)
- `/me/dashboard` (time clock, leave balance, quick actions)
- `/me/profile`
- `/me/leaves`
- `/me/attendance`
- `/me/payslips`

**5. HRMS Core Workflows**
- `/dashboard` (main dashboard)
- `/employees` (directory)
- `/employees/[id]` (profile detail)
- `/leave/apply` (request leave)
- `/leave/approvals` (manager approvals)
- `/attendance` (attendance tracking)

**6. HRMS Admin Console**
- `/admin` (admin dashboard)
- `/admin/employees`
- `/admin/roles`
- `/admin/settings`

---

### Phase 3: Advanced Modules (Week 3-4)

**7. NU-Hire**
- `/recruitment` (dashboard)
- `/recruitment/candidates`
- `/recruitment/candidates/[id]`
- `/recruitment/kanban`
- `/onboarding/[id]`

**8. NU-Grow**
- `/performance` (hub)
- `/performance/reviews`
- `/performance/okr`
- `/learning/courses`
- `/learning/courses/[id]/play`

**9. NU-Fluence**
- `/fluence` (hub)
- `/fluence/wiki`
- `/fluence/wiki/[slug]`
- `/fluence/search`
- AI chat widget

---

### Phase 4: Specialized Screens (Week 4-5)

**10. Reports & Analytics**
- Chart components
- Dashboard layouts
- Report builder
- Analytics views

**11. Settings & Configuration**
- Settings pages
- Integration screens
- Workflow designer

**12. Forms & Data Entry**
- Complex forms
- Multi-step wizards
- Bulk operations

---

### Phase 5: Polish & States (Week 5-6)

**13. Responsive Design**
- Mobile layouts
- Tablet optimizations
- Responsive tables

**14. Edge Cases & States**
- Loading states
- Empty states
- Error states
- Success states
- Permission-denied states

**15. Interactions & Animations**
- Micro-interactions
- Transitions
- Loading animations
- Success confirmations

---

## NEXT STEPS FOR FIGMA

### 1. Create Figma Workspace Structure

**Recommended Pages:**

```
00 — Product Architecture
  └─ Platform overview
  └─ 4 sub-apps diagram
  └─ User role hierarchy
  └─ Permission matrix

01 — User Flows
  └─ Employee journey
  └─ Manager journey
  └─ HR admin journey
  └─ Recruitment flow
  └─ Performance cycle
  └─ Learning journey

02 — Screen Inventory
  └─ All 286 screens mapped
  └─ Route structure
  └─ Screen-to-screen navigation
  └─ Permission gates

03 — Design System
  └─ Colors
  └─ Typography
  └─ Spacing
  └─ Components (primitives)
  └─ Patterns

04 — Shared Platform
  └─ App shell
  └─ Navigation
  └─ Global search
  └─ Notifications

05 — NU-HRMS
  └─ Self-service portal
  └─ Admin console
  └─ People & organization
  └─ Time & attendance
  └─ Leave management
  └─ Finance & payroll
  └─ Reports

06 — NU-Hire
  └─ Recruitment
  └─ Candidates
  └─ Onboarding
  └─ Public careers

07 — NU-Grow
  └─ Performance
  └─ Goals & OKRs
  └─ Learning
  └─ Engagement

08 — NU-Fluence
  └─ Knowledge hub
  └─ Wiki
  └─ Blogs
  └─ AI chat

09 — Responsive
  └─ Mobile layouts
  └─ Tablet layouts

10 — Progress Tracker
  └─ Redesign checklist
  └─ Module completion status
```

### 2. Start with Design System

Before designing any screens:
1. Define color palette (brand, semantic, backgrounds, text)
2. Establish typography scale
3. Set spacing system
4. Create button components (all variants, states)
5. Create input components
6. Create card components
7. Create modal/drawer components

### 3. Design Shared Shell First

Before diving into apps:
1. App switcher (product rail)
2. Sidebar navigation (collapsed/expanded)
3. Top bar
4. Breadcrumbs
5. Command palette

### 4. Prioritize High-Impact Screens

Start with most-used experiences:
1. `/me/dashboard` (every employee, every day)
2. `/dashboard` (main landing)
3. `/employees/[id]` (most-viewed detail screen)
4. `/leave/apply` (most common action)
5. `/recruitment/candidates/[id]` (recruitment core)

### 5. Maintain Consistency Checklist

For each screen designed:
- [ ] Uses design system components
- [ ] Follows spacing system
- [ ] Typography hierarchy clear
- [ ] Empty/loading/error states accounted for
- [ ] Responsive behavior considered
- [ ] Permission gates noted
- [ ] Matches other apps' patterns

---

## DESIGN ARTIFACTS TO CREATE

### Documentation Needed

1. **Component Library** — All reusable components with variants
2. **Pattern Library** — Common UI patterns (tables, forms, cards, etc.)
3. **Screen Catalog** — All 286 screens designed
4. **Flow Diagrams** — User journeys with screen transitions
5. **Responsive Specs** — Mobile/tablet/desktop breakpoints
6. **Interaction Specs** — Micro-interactions, animations, transitions
7. **Developer Handoff** — Redlines, spacing, measurements

### Quality Checklist

Before considering redesign complete:

**Visual Design:**
- [ ] Hierarchy immediately obvious
- [ ] Typography consistent
- [ ] Spacing systematic
- [ ] Colors purposeful
- [ ] Alignment precise
- [ ] No visual clutter

**UX:**
- [ ] Purpose clear at a glance
- [ ] Primary action obvious
- [ ] Workflow logical
- [ ] Navigation clear
- [ ] Cognitive load reduced
- [ ] Complex operations simplified

**Product Consistency:**
- [ ] Feels like NU-AURA
- [ ] Matches other applications
- [ ] Uses design system
- [ ] Patterns reusable
- [ ] All 4 apps cohesive

**Functionality:**
- [ ] All original actions preserved
- [ ] All workflows supported
- [ ] Permissions respected
- [ ] States accounted for
- [ ] No features removed without justification

---

## REFERENCE

**Codebase Verification Date:** 2026-11-20

**Key Documentation:**
- Full vault: `docs/obsidian/00-Home.md`
- Route map: `docs/obsidian/03-Frontend/Route-Map-Full.md`
- Components: `docs/obsidian/03-Frontend/Components.md`
- Modules: `docs/obsidian/02-Modules/*.md`
- RBAC: `docs/obsidian/05-RBAC/RBAC-Matrix.md`

**Live Deployment:**
- Frontend: https://hrms-frontend-vert.vercel.app
- Credentials: `arun@nulogic.io` / `Welcome@123` (demo account)

---

**End of Blueprint Document**

This document is the authoritative source of truth for the NU-AURA UI redesign. Use it to guide every design decision, screen layout, and component creation.
