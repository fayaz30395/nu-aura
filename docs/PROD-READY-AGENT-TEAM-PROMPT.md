# NU-AURA — Production Readiness Agent Team Prompt

> Copy-paste this into Claude Code to launch the team.
> Requires: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json (already enabled).

---

## The Prompt

```text
Goal: Make NU-AURA 100% production-ready. NU-AURA is a bundle app platform
(Next.js 14 + Spring Boot 3.4.1 + PostgreSQL + Redis + Kafka) with 4 sub-apps:
NU-HRMS, NU-Hire, NU-Grow, NU-Fluence. The end result should be a platform where
every endpoint is permission-guarded, every TODO in backend services is resolved,
test coverage reaches 80%+ on controllers, frontend stub pages are completed,
and a final production readiness report confirms zero blockers.

Create a team of 5 teammates using Sonnet:

1. **Security Hardener** — Fix all permission and security gaps in the backend.
   "You are the Security Engineer for NU-AURA.
   Your working directory: backend/src/main/java/com/hrms/

   TASK 1: Find and fix the 3 controllers missing @RequiresPermission annotations.
   Search all controllers in api/*/controller/ for any that lack @RequiresPermission
   or @PreAuthorize. Add the correct permission using module.action format
   (e.g., @RequiresPermission('mobile_attendance.read')). SuperAdmin bypasses all
   checks automatically via PermissionAspect — do not add SuperAdmin exceptions.

   TASK 2: Audit and resolve the 12 backend services with TODO/FIXME comments.
   Key files: DocuSignController, StripeAdapter, RazorpayAdapter, SlackCommandService,
   EmployeeImportService, KekaImportService, AttendanceRecordService, ZKTecoAdapter,
   ESSLAdapter, ExecutiveDashboardService, PaymentWebhookController,
   IntegrationConnectorConfigEntity. For each:
   - If the TODO is a missing implementation: implement it
   - If the TODO is a future enhancement: convert to a proper code comment with
     a ticket reference placeholder (// FUTURE: NUAURA-XXX — description)
   - If the TODO is dead code: remove it

   TASK 3: Verify CORS config in SecurityConfig.java uses environment-based
   allowed-origins (not hardcoded localhost). Verify rate limiting filter is in
   the security chain. Verify CSRF handling is documented.

   CONVENTIONS: Package root is com.hrms. Use @RequiresPermission('module.action').
   Log with SLF4J. Exceptions via @ControllerAdvice with ApiErrorResponse DTO.
   Post status updates to the shared task list after each task."

2. **Backend Test Engineer** — Close the test coverage gap on controllers.
   "You are the Backend Test Engineer for NU-AURA.
   Your working directory: backend/src/test/java/com/hrms/

   CONTEXT: There are 147 controllers but only 54 have dedicated test files.
   93 controllers lack tests. Target: 80% controller coverage. That means
   writing tests for at least 63 more controllers (prioritized by risk).

   TASK 1 (HIGH PRIORITY — write tests for these first):
   - All authentication/authorization controllers (auth/*, security/*)
   - All payroll controllers (payroll/*)
   - All leave controllers (leave/*)
   - All employee controllers (employee/*)
   - All recruitment controllers (recruitment/*)
   These are the highest-risk modules for production.

   TASK 2 (MEDIUM PRIORITY):
   - Approval workflow controllers
   - Benefits controllers
   - Asset management controllers
   - Attendance controllers
   - Performance review controllers

   TASK 3 (LOWER PRIORITY — if time permits):
   - Report controllers
   - Notification controllers
   - Settings/admin controllers
   - Knowledge/Fluence controllers

   TEST PATTERNS:
   - Use JUnit 5 + Mockito
   - @WebMvcTest(ControllerName.class) for slice tests
   - Mock the service layer, test HTTP status codes and response shapes
   - Test RBAC: verify @RequiresPermission is enforced (test with and without permission)
   - Test validation: invalid input returns 400
   - Test not-found: missing resource returns 404
   - Test pagination on list endpoints
   - Test tenant isolation: verify tenant_id filtering
   - Name pattern: {ControllerName}Test.java

   DEPENDENCY: Wait for Security Hardener to finish Task 1 (permission fixes)
   before writing permission-related tests for those 3 controllers.
   Post progress to task list after every 10 test files."

3. **Frontend Completer** — Finish all stub pages and resolve frontend TODOs.
   "You are the Frontend Developer for NU-AURA.
   Your working directory: frontend/

   CONTEXT: There are 181 files with TODO/FIXME comments across frontend/app/.
   Most pages are functional but some have incomplete features or placeholder UI.

   TASK 1 (CRITICAL — complete these stub pages):
   - /performance/calibration/page.tsx — implement 9-box grid calibration view
   - /performance/competency-matrix/page.tsx — implement competency matrix table
   - /resources/pool/page.tsx — implement resource pool management
   - /import-export/page.tsx — implement bulk import/export dashboard
   - /letters/page.tsx — implement letter template generation page
   - /helpdesk/tickets/[id]/page.tsx — implement ticket detail view

   TASK 2 (RESOLVE TODOs — audit and fix across all pages):
   - Search all files in app/ for TODO and FIXME comments
   - If the TODO is a missing feature: implement it using existing patterns
   - If the TODO is a UI placeholder: replace with proper Mantine UI components
   - If the TODO is a future enhancement: convert to // FUTURE: comment

   TASK 3 (VERIFY DESIGN COMPLIANCE):
   - Ensure zero instances of bg-white, shadow-sm/md/lg, or banned color tokens
   - All colors must use CSS variables from globals.css or allowed Tailwind tokens
   - All spacing must follow 8px grid (p-2/4/6/8, gap-2/4/6/8 — no p-3/5, gap-3/5)
   - All shadows must use var(--shadow-card/elevated/dropdown)
   - All icon-only buttons must have aria-label
   - All interactive elements must have cursor-pointer

   CONVENTIONS:
   - Mantine UI as primary component library (NOT Material UI)
   - React Query (TanStack) for all data fetching — no raw useEffect + fetch
   - React Hook Form + Zod for all forms — no uncontrolled inputs
   - Zustand for global state (auth, UI)
   - Axios client from frontend/lib/api/ — NEVER create new instances
   - TypeScript strict mode — NEVER use 'any'
   - Blue monochrome palette (hue ~228, anchor #2952A3)
   Post progress to task list after completing each stub page."

4. **E2E Test Engineer** — Expand Playwright coverage for all critical flows.
   "You are the E2E Test Engineer for NU-AURA.
   Your working directory: frontend/e2e/

   CONTEXT: There are 57 existing .spec.ts files covering core flows.
   But there are gaps in cross-module workflows and RBAC boundary testing.

   TASK 1 (CROSS-MODULE E2E FLOWS — write these new test files):
   - hire-to-onboard.spec.ts: Candidate applies → Interview → Offer → Accept →
     Auto-create employee record in NU-HRMS
   - leave-approval-chain.spec.ts: Employee requests leave → Team Lead approves →
     HR Manager approves → Balance deducted → Notification sent
   - payroll-end-to-end.spec.ts: Salary structure → Components → Run payroll →
     Generate payslip → Employee views payslip
   - performance-review-cycle.spec.ts: Admin creates cycle → Manager sets goals →
     Employee self-reviews → Manager reviews → Calibration
   - fluence-content-lifecycle.spec.ts: Create wiki page → Edit → Version history →
     Search → Blog publish → Template usage

   TASK 2 (RBAC BOUNDARY E2E TESTS):
   - rbac-employee-boundaries.spec.ts: Verify Employee role CANNOT access admin
     pages, payroll config, other employees' data
   - rbac-manager-boundaries.spec.ts: Verify Manager role CAN approve team leave
     but CANNOT access payroll or recruitment admin
   - rbac-tenant-isolation.spec.ts: Verify Tenant A user CANNOT see Tenant B data
     across all modules
   - rbac-superadmin.spec.ts: Verify SuperAdmin CAN access everything across all
     tenants and modules

   TASK 3 (SMOKE TESTS FOR ALL 4 SUB-APPS):
   - sub-app-smoke.spec.ts: Navigate to each sub-app via app switcher, verify
     dashboard loads, at least one CRUD operation works per sub-app

   TEST PATTERNS:
   - Use Playwright test fixtures for auth (login once, reuse session)
   - Page Object Model for complex pages
   - Test data cleanup after each test (soft-delete or API cleanup)
   - Screenshot on failure
   - Tag tests: @smoke, @rbac, @critical, @regression

   DEPENDENCY: Wait for Frontend Completer to finish Task 1 (stub pages)
   before writing E2E tests for those pages.
   Post progress to task list after each spec file."

5. **Production Auditor** — Generate the final production readiness report.
   "You are the Production Readiness Auditor for NU-AURA.
   Your working directory: project root (nu-aura/)

   CONTEXT: The other 4 teammates are fixing security gaps, writing backend tests,
   completing frontend stubs, and adding E2E tests. Your job is to audit the
   ENTIRE platform and produce a comprehensive go/no-go report.

   TASK 1 (START IMMEDIATELY — baseline audit while others work):
   - Count total controllers, services, entities, repositories, DTOs
   - Count total frontend pages, components, hooks, services
   - Check Flyway migration count and status
   - Verify docker-compose.yml has all 8 services with health checks
   - Verify deployment/kubernetes/ manifests are complete (10 manifests)
   - Check .github/workflows/ci.yml pipeline stages
   - Verify application.yml has proper profiles (dev, staging, prod)
   - Check all environment variables are documented
   - Verify Redis config (CacheConfig, RedisConfig, rate limiting)
   - Verify Kafka config (5 topics + 5 DLT topics + DLT handler)
   - Check monitoring: Prometheus rules, Grafana dashboards, health indicators

   TASK 2 (AFTER TEAMMATES FINISH — final verification):
   - Verify Security Hardener fixed all 3 controllers (grep for @RequiresPermission)
   - Verify Backend Test Engineer achieved 80%+ controller coverage (count test files)
   - Verify Frontend Completer resolved stub pages (check each page listed in Task 1)
   - Verify E2E Test Engineer added cross-module and RBAC tests
   - Run: cd backend && mvn compile (verify no compilation errors)
   - Run: cd frontend && npm run build (verify no build errors)
   - Run: cd frontend && npx tsc --noEmit (verify no type errors)
   - Run: cd frontend && npm run lint (verify no lint errors)

   TASK 3 (GENERATE REPORT — final deliverable):
   Write docs/PRODUCTION-READINESS-REPORT.md with this structure:

   # NU-AURA Production Readiness Report
   ## Date: {today}
   ## Overall Verdict: GO / NO-GO / CONDITIONAL GO

   ### Platform Metrics
   (total controllers, services, entities, pages, tests, migrations)

   ### Security Checklist
   - [ ] All endpoints have @RequiresPermission
   - [ ] CORS configured for production origins
   - [ ] Rate limiting active (Bucket4j + Redis)
   - [ ] OWASP headers on all responses
   - [ ] JWT in httpOnly cookies (not Authorization header)
   - [ ] CSRF protection documented
   - [ ] Account lockout after 5 failed attempts
   - [ ] Token blacklist service operational
   - [ ] Password policy enforced (12+ chars, complexity)
   - [ ] Tenant isolation via PostgreSQL RLS

   ### Test Coverage
   - Backend: X/Y controllers tested (Z%)
   - Frontend: X E2E specs, Y component tests
   - RBAC boundary tests: present/missing

   ### Infrastructure
   - [ ] CI/CD pipeline complete
   - [ ] Docker multi-stage builds
   - [ ] K8s manifests complete
   - [ ] Health checks on all services
   - [ ] Monitoring (Prometheus + Grafana)
   - [ ] Structured logging for cloud

   ### Sub-App Status
   - NU-HRMS: GO/NO-GO (details)
   - NU-Hire: GO/NO-GO (details)
   - NU-Grow: GO/NO-GO (details)
   - NU-Fluence: GO/NO-GO (details)

   ### Remaining Risks
   (list any unresolved items with severity)

   ### Recommended Actions Before Go-Live
   (ordered by priority)

   DEPENDENCY: Wait for ALL other teammates to complete before Task 2 and Task 3.
   Start Task 1 immediately."

TASK DEPENDENCIES:
1. Security Hardener starts immediately → unblocks Backend Test Engineer (Task 1 partial)
2. Frontend Completer starts immediately → unblocks E2E Test Engineer (partial)
3. Backend Test Engineer waits for Security Hardener Task 1, then works independently
4. E2E Test Engineer waits for Frontend Completer Task 1, then works independently
5. Production Auditor does baseline audit immediately, final report after ALL complete

COORDINATION RULES:
- If modifying a shared file (SecurityConfig, application.yml, globals.css,
  tailwind.config.js), post to task list FIRST and wait for acknowledgment
- All agents follow coding conventions in CLAUDE.md
- Post completion status to task list when each task finishes
- Challenge each other's work — if you spot an issue in a teammate's output,
  message them directly

Final deliverables:
- Zero controllers without @RequiresPermission
- Zero TODO/FIXME in backend services (resolved or converted to FUTURE tickets)
- All frontend stub pages completed with real UI
- 80%+ backend controller test coverage
- 15+ new E2E test specs covering cross-module flows and RBAC boundaries
- docs/PRODUCTION-READINESS-REPORT.md — comprehensive go/no-go assessment
```
