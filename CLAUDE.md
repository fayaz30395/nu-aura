# NU-AURA — Project Instructions

> **Stack**: Next.js 14 (App Router) + Mantine UI + Tailwind CSS | Spring Boot 3.4.1 (Java 17) | PostgreSQL (Neon dev / PG 16 prod) | Redis 7 | Kafka | Google OAuth 2.0
> **Sub-apps**: NU-HRMS, NU-Hire, NU-Grow, NU-Fluence
> **Package root**: `com.hrms` (NOT `com.nulogic.aura`)

---

## Product Vision

**NU-AURA** is an internal platform built by NULogic for NULogic. It provides shared SSO, RBAC, and infrastructure for multiple internal applications. It is NOT a SaaS product for external sale.

**NU-HRMS** is the immediate priority — a direct replacement for KEKA (which NULogic currently pays for). The goal is to eliminate that cost by building an internal alternative.

**Distributed workforce:** NULogic employees work across different regions, timezones, and project sections. All features must account for timezone-aware scheduling, region-specific policies, and cross-project visibility.

**Sub-apps on the platform:**
| App | Purpose | Priority |
|-----|---------|----------|
| NU-HRMS | KEKA replacement — HR core (employees, leave, attendance, payroll) | **Highest — active build** |
| NU-Hire | Internal recruitment & onboarding | High |
| NU-Grow | Performance reviews, training, engagement | Medium |
| NU-Fluence | Internal knowledge management & collaboration | Phase 2 |

**NU-AURA is NOT:** a SaaS product, a project management tool, a chat platform, a finance/accounting system, or a mobile app.

---

## Project Structure

```
nu-aura/
├── frontend/                    # Next.js 14 App Router
│   ├── app/                     # Route pages (200+ routes)
│   ├── components/              # UI components (ui/, platform/, layout/)
│   ├── lib/
│   │   ├── api/                 # Axios client — DO NOT create new instances
│   │   ├── hooks/               # React hooks (190 files)
│   │   ├── services/            # API service functions (92 files)
│   │   ├── config/              # apps.ts (route-to-app mapping)
│   │   └── stores/              # Zustand stores (auth, UI)
│   ├── middleware.ts            # Edge middleware (OWASP headers, auth)
│   └── e2e/                    # Playwright E2E tests
├── backend/                     # Spring Boot 3.4.1 Monolith
│   └── src/main/java/com/hrms/
│       ├── api/                 # REST controllers
│       ├── application/         # Service layer
│       ├── domain/              # Entities + Repositories
│       ├── common/              # Config, security, DTOs
│       └── infrastructure/      # Kafka, Elasticsearch, integrations
├── docker-compose.yml           # Redis, Kafka, Elasticsearch, Prometheus
├── deployment/kubernetes/       # 10 K8s manifests (GCP GKE)
└── docs/                        # build-kit/, adr/, runbooks/
```

---

## Coding Conventions

### Java / Spring Boot
- Java 17, records for DTOs, MapStruct for mapping
- `@RequiresPermission("module.action")` on every endpoint — SuperAdmin bypasses automatically
- Thin controllers, logic in services, exceptions via `@ControllerAdvice`
- `JpaRepository<Entity, Long>`, Flyway migrations (`V{n}__description.sql`)
- SLF4J logging, JUnit 5 + Mockito tests

### Next.js / Frontend
- TypeScript strict — **never use `any`**
- **Mantine UI** (NOT Material UI) + Tailwind CSS
- **React Query** for all data fetching — no `useEffect` + `fetch`
- **React Hook Form + Zod** for all forms
- **Zustand** for global state, existing **Axios** client only
- PascalCase components, one per file

### Design System (Blue Monochrome, hue ~228)
- Colors via CSS variables — NO `bg-white`, raw hex, or `shadow-sm/md/lg`
- Allowed tokens: `accent-*`, `success-*`, `danger-*`, `warning-*`, `info-*`, `surface-*`
- BANNED: `sky-*`, `rose-*`, `amber-*`, `emerald-*`, `gray-*`, `slate-*`, `blue-*`, `red-*`, `green-*`
- Shadows: `shadow-[var(--shadow-card)]`, `shadow-[var(--shadow-elevated)]`, `shadow-[var(--shadow-dropdown)]`
- 8px spacing grid (p-2/4/6/8) — no p-3/p-5
- Radius: `rounded-md` / `rounded-lg` / `rounded-xl`
- Buttons: skeuomorphic (`skeuo-button`, `active:translate-y-px`)
- Focus: `focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]`
- All icon-only buttons: `aria-label` required
- All interactive elements: `cursor-pointer` required

### UI Sizing & Density (Desktop-First — DO NOT apply mobile standards)
NU-AURA is a **desktop-first internal tool**. Mobile 44px touch target rules do NOT apply.
Use compact, professional sizing consistent with tools like Linear, Notion, and Stripe Dashboard.

| Element | Correct size | Never use |
|---------|-------------|-----------|
| Action buttons | `px-4 py-2 text-sm` (36px height) | `px-6 py-3` (oversized) |
| Icon buttons | `p-1.5` or `p-2` | `p-3` (too large) |
| Stat card labels | `text-xs uppercase tracking-wide` | `text-sm uppercase` (too heavy) |
| Sidebar icon containers | `w-8 h-8` | `w-10 h-10` or larger |
| Table row padding | `px-4 py-2` (dense) or `px-6 py-4` (comfortable) | `py-6`+ |
| Form inputs | `px-4 py-2 text-sm` | `px-4 py-3 text-base` |
| Badges / chips | `px-2 py-0.5 text-xs` | `px-3 py-1 text-sm` |
| Card padding | `p-4` (compact) or `p-6` (standard) | `p-8`+ on regular cards |

**Alignment rules:**
- Icon + label: always `flex items-center gap-2`
- Section header + action: always `row-between` utility (`flex items-center justify-between`)
- Stat value below label: `mt-1` gap, never `mt-2`+
- Card content rows: `py-2` divider rows, `py-4` for comfortable card body items
- Empty states: icon (`h-8 w-8` or `h-10 w-10`) + `mb-2` + `text-sm text-[var(--text-muted)]`

**Do not inflate sizes based on generic UX audits that target mobile/consumer apps.**
When an audit tool recommends larger sizes, evaluate against this desktop density standard first.

### Database
- `snake_case` plural tables, `tenant_id UUID` on all tenant tables (PostgreSQL RLS)
- Soft deletes: `is_active BOOLEAN DEFAULT TRUE`
- Timestamps: `created_at`, `updated_at` on all tables
- Permission format: `module.action` (DB) → `MODULE:ACTION` (code)

### API
- REST: `GET/POST/PUT/DELETE /api/v1/{resource}`
- Pagination: `?page=0&size=20&sort=createdAt,desc`
- JWT in httpOnly cookie (NOT Authorization header)
- Error: `{ status, error, message, timestamp }`

### Git
- Work on `main` branch directly
- Commits: `feat(module):`, `fix(module):`, `refactor(module):`

---

## Key Architectural Decisions (Locked In)

- **Multi-tenancy**: Shared DB, shared schema, `tenant_id` UUID, PostgreSQL RLS
- **RBAC**: JWT has roles only (cookie size limit). Permissions loaded from DB via `SecurityService.getCachedPermissions()`. SuperAdmin bypasses ALL checks
- **Every User Is an Employee**: Roles are additive. MY SPACE sidebar items never have `requiredPermission`
- **Approval Flows**: Generic engine — `workflow_def` → `workflow_step` → `approval_instance` → `approval_task`
- **Payroll**: SpEL formula engine, DAG evaluation order, DB transaction wrapped
- **Flyway**: V0–V103 active. Next = V104. Legacy Liquibase in `db/changelog/` — DO NOT USE
- **Kafka**: 5 topics (`nu-aura.approvals/notifications/audit/employee-lifecycle/fluence-content`) + 5 DLT topics
- **Security**: Rate limiting (Bucket4j + Redis), OWASP headers (Next.js middleware + Spring Security), CSRF double-submit cookie
- **Platform**: Bundle app with 4 sub-apps via waffle grid switcher. Routes mapped in `frontend/lib/config/apps.ts`. Sidebar is app-aware

### RBAC Hierarchy
```
Super Admin (100) → Tenant Admin (90) → HR Admin (85) → HR Manager (80) → Team Lead (50) → Employee (40)
```

### Sub-Apps
| App | Scope | Status (as of 2026-04-02) |
|-----|-------|--------------------------|
| NU-HRMS | Employees, attendance, leave, payroll, benefits, assets, F&F settlement | ~96% — Production-ready |
| NU-Hire | Jobs, candidates, pipeline, onboarding, offboarding, e-signature, career page | ~95% — Production-ready |
| NU-Grow | Reviews, OKRs, 360 feedback, LMS, training, surveys, wellness, competency | ~94% — Production-ready |
| NU-Fluence | Wiki, blogs, templates, Drive, analytics, space permissions | ~65% frontend (backend done) |

---

## Code Rules (Non-Negotiable)

1. **Read before writing** — never rewrite existing files from scratch
2. **No new Axios instances** — use `frontend/lib/api/`
3. **No `any` in TypeScript** — define interfaces
4. **All forms**: React Hook Form + Zod
5. **All data fetching**: React Query
6. **All endpoints**: `@RequiresPermission` + unit test
7. **No new npm packages** without checking `package.json` first

---

## Quick Commands

```bash
docker-compose up -d                    # Infrastructure (Redis, Kafka, etc.)
cd backend && ./start-backend.sh        # Spring Boot → :8080
cd frontend && npm run dev              # Next.js → :3000
cd backend && mvn test                  # Backend tests
cd frontend && npx playwright test      # E2E tests
```

---

## References
- `docs/build-kit/` — 24 architecture documents
- `docs/adr/` — 5 foundational ADRs
- `docs/runbooks/` — 4 operational guides
- `docs/AGENT-TEAMS-MASTER-REFERENCE.md` — Agent team orchestration guide
- `themes/nulogic.md` — Brand identity + design system spec
