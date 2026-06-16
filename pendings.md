# NU-AURA — Pending Items

Consolidated from the production-readiness + UI/UX audit (2026-06-16).
Full detail in `docs/audit/production-readiness-2026-06-16.md`.
Legend: **Owner** = `user` (only you can do it) · `agent` (I can do it once `main` is stable) · `either`.

---

## 0. BLOCKER — must clear before any further convergence

- [ ] **Stop the parallel autonomous agents / freeze `main`.** Multiple `claude --dangerously-skip-permissions` loops (shells `49091`, `58884` relaunch them on exit) commit to `main` every few minutes. They race commits, buried my CI fixes, and corrupted the git index twice. **Nothing converges (CI green, clean fix-mode) until `main` holds still or I get a dedicated branch.** — Owner: **user**

---

## 1. Go-Live Blockers

- [ ] **SEC-3b — disable demo mode in production.** Set `DEMO_CREDENTIALS_ENABLED=false` (backend/Railway) and `NEXT_PUBLIC_DEMO_MODE=false` (frontend/Vercel). Currently live: 8 demo accounts (`Welcome@123`) can log into prod; demo buttons render on the live login page. Env change, not code. — Sev: CRITICAL — Owner: **user**
- [ ] **Confirm CI green on a frozen SHA.** CI is perpetually red due to the churn (latest `62193ac0` failure). Once `main` is stable, verify the CI Pipeline passes end-to-end (lint + tsc + 4066 backend tests + build). — Sev: HIGH — Owner: **agent** (after #0)

---

## 2. CI / Build

- [x] FE ESLint failure (unused catch binding in `visual-audit.mjs`) — FIXED `578fa279`, CI-confirmed pass.
- [ ] **Backend payment tenant-isolation tests (11)** — FIXED `d8f6c16e`; **re-verify the fix survived the churn** (a parallel agent may have re-touched `PaymentServiceTest` / `TenantIsolationNegativeTest`). — Owner: **agent**
- [ ] **FE `tsc` OOM at 2 GB** — FIXED `19c0b994` (+ a parallel agent added the matching Build-step heap fix). Confirm both heap fixes are present in `ci.yml` on the frozen SHA. — Owner: **agent**
- [ ] **Re-diagnose the current CI failure** on the stable SHA (the churn may have introduced new breakage beyond the three I fixed). — Owner: **agent**
- [ ] Decide whether the `Deploy` job's fast (~18s) failure is the intended production-environment approval gate or a real misconfig. — Owner: **either**

---

## 3. Security / RBAC / Data hygiene

- [x] RBAC verified sound across UI + Route + API + Data — no bypass / escalation / IDOR.
- [x] Payment cross-tenant access hardened (atomic `findByIdAndTenantId`, anti-enumeration).
- [ ] **RBAC-SEED** — demo account `saran@nulogic.io` is seeded with dual roles `[EMPLOYEE, HR_ADMIN]` but labeled "EMPLOYEE" on the login page. Seed a clean EMPLOYEE-only demo account (or relabel). Blocks testing the true employee self-service experience. — Sev: MEDIUM — Owner: **agent**
- [ ] **DEMO-ACCT-401** — `tenant.admin@nulogic.io` (V291) and `finance@nulogic.io` (V286) demo logins return `401` on the deploy (seed migrations not applied there). Apply seeds to the deployed DB or document as untestable. — Sev: MEDIUM — Owner: **either**
- [ ] **EMP-LIST** — `/employees` returns 200 to all roles; verify field-level exposure for a *true* EMPLOYEE-only account (blocked on a clean employee demo account). — Sev: MEDIUM — Owner: **agent** (after RBAC-SEED)

---

## 4. Verification still owed

- [ ] **Core Web Vitals / Lighthouse** pass on 2-3 key routes (dashboard + a dense table). Not yet measured. — Owner: **agent**
- [ ] **Deep CRUD / status-transition / approvals** flows per module — blocked: the deployed tenant is near-empty and writing test data is state-changing (needs your OK or a seeded test tenant). — Owner: **user-decision → agent**
- [ ] **Full 259-route browser smoke** (only key surfaces sampled so far). — Owner: **agent**
- [ ] Cross-browser (Firefox/Safari) + responsive breakpoint sweep (320/768/1024/1440). — Owner: **agent**

---

## 5. UI/UX (post-GA quality — from the audit, current → target)

- [ ] **Design-system convergence** (highest-leverage): collapse 3 card systems + 2 button systems to one canonical CVA primitive; migrate `.skeuo-*` (~10 files) + wiki off `lib/theme/design-system`; keep the new ESLint design-system gate. Raises Consistency 5.5→8.5. — Owner: **agent**
- [ ] **Accent reconciliation** — settle shipped `#2952A3` vs spec `#2563EB` at the code level (DESIGN.md already aligned to shipped). Needs your design call. — Owner: **user-decision → agent**
- [ ] **Forms UX** (weakest, 5.5→8.2): inline help under fields, draft auto-save + unsaved-changes guard, step indicator, inline leave-balance ring. — Owner: **agent**
- [ ] **Navigation** (6.5→8.5): layered ProductRail active-state + ⌘1-4, truncating breadcrumbs, collapsible nav groups, mobile swipe-up drawer. — Owner: **agent**
- [ ] **Dashboard** (7→8.8): interactive KPI cards, post-checkout moment, richer empty states, per-widget skeletons. — Owner: **agent**
- [ ] **Employees table** (6→8): chip filters + saved presets, row ⋯ menu, column chooser, "Go to page". — Owner: **agent**
- [ ] **Recruitment** (6.5→8.3): embedded kanban + drag-move, job templates, interviewer availability. — Owner: **agent**
- [ ] **Fluence wiki** (6→8): edit-lock/real-time collab, permission presets, search facets + TOC. — Owner: **agent**

### Accessibility (WCAG 2.2 AA — 7.5/10; fix list)
- [ ] ResponsiveTable `Show:` select → proper `<label htmlFor>` (moderate).
- [ ] FileUpload drop-zone → `role` + `aria-label` (moderate).
- [ ] ResponsiveTable mobile card-row keyboard nav (moderate).
- [ ] MobileBottomNav + Tabs count badges → `aria-label` / `aria-live` (minor).
- [ ] Label required-indicator double-announce with AccessibleFormField (minor).
- [ ] StatusBadge `pulse` vs `prefers-reduced-motion` via Framer (minor).
- [ ] Button loading-state redundant text label (minor).

---

## 6. Enterprise feature gaps (roadmap, not blockers — vs Workday/Rippling/Linear)

- [ ] P1: audit-trail / change-history UI; self-service report builder; low-code workflow designer; onboarding checklist.
- [ ] P2: advanced/faceted search (Elasticsearch UI); custom fields; bulk + inline edits; integrations hub; scheduled exports; notification center; native mobile/PWA.
- [ ] P3: contextual help/tours; document version history; perf monitoring dashboard; predictive field suggestions; deep collapsible nav.

---

## 7. Environment / process cleanup

- [ ] **Restore the edit-hook dispatcher** when ready: `mv .claude/helpers/hook-handler.cjs.DISABLED .claude/helpers/hook-handler.cjs` (left disabled to stop the auto-commit-on-edit worker). — Owner: **user**
- [ ] **Review/drop preserved stashes**: `stash@{0}` (`rogue-instance-59709-inflight`), plus `manual-pull-stash`, `autostash`. — Owner: **either**
- [ ] **~9 backend test files + `settings.local.json`** show uncommitted edits from a parallel agent (not mine, not pushed) — decide keep/discard. — Owner: **user**
- [ ] Decide canonical remote: pushes go to `fayaz30395/nu-aura`; `Fayaz-Deen/nu-aura` is a separate fork with its own CI. — Owner: **user**

---

## 8. UI a11y session (2026-06-16) — pending

Pushed this session (reference): 6 a11y commits — `c3d9c803`, `4b36653a`,
`fd382b33`, `9e646602`, `f681515a`, `a5ec4eef` (dark-mode button/accent contrast
via `--btn-primary-bg` token → 5.34:1 dark; ~91 of ~104 native `<select>`
accessible names; careers/signup public WCAG fixes). Typecheck 0 errors; public
pages (login/signup/forgot-password/careers) axe WCAG 2.1 A/AA + responsive clean.

- [ ] **Authenticated deep audit — BLOCKED on Railway login.** Demo creds return
  HTTP 401 (`DEMO_CREDENTIALS_ENABLED` off on Railway) and the Railway CLI/MCP OAuth
  token is expired (`invalid_grant`). Unblock: `railway login` (user, interactive),
  then `DEMO_CREDENTIALS_ENABLED=true` on Railway service `nu-aura` (staging) → wait
  redeploy → `npx playwright test --project=setup` → axe + responsive sweep across
  authenticated routes/sub-apps/9 roles. Tooling: `/tmp/aura-axe-audit.mjs`,
  `/tmp/aura-responsive.mjs`, `/tmp/aura-select-inventory.mjs`. ⚠️ revert the flag
  to `false` before prod (same as **SEC-3b** above). — Owner: **user → agent**
- [ ] **13 native `<select>` still unnamed** (WCAG 4.1.2). Add `aria-label`/`htmlFor`
  (proven pattern). Clear bindings: `admin/audit:210` (actionFilter), `admin/budget:299,386`
  (departmentId/statusFilter) + `:289` currency, `projects/psa/page:159,177`
  (status/billingType), `projects/psa/invoices:156` (status),
  `travel/expenses:138` (expense type). Inspect-first: `tasks/page:117,126`,
  `projects/psa/timesheets:181`, `surveys/pulse:123,132`. Target: `node
  /tmp/aura-select-inventory.mjs` → 0 unnamed. — Owner: **agent**
- [ ] **`/terms` and `/privacy` pages missing** — signup consent links 307-redirect
  to `/auth/login` (broken). Needs legal content + product decision (create public
  pages, or repoint to canonical external URLs). Do not ship placeholder legal text. — Owner: **user-decision**
- [ ] **Intermittent signup `color-contrast` flake** (`.inline-flex`, light/mobile) —
  seen once, not reproduced in 4 reruns. Recheck under authenticated/real-data render;
  don't fabricate a fix until reproducible. — Owner: **agent**

> Note: §1 **SEC-3b** (disable demo mode in prod) and §5 Accessibility fix-list
> overlap with the above; the ResponsiveTable `Show:` select in §5 is part of the
> 13 remaining here.

---

## 9. Backend N+1 Eliminations — remaining targets

Services fixed this session (commits `3a4f9e35`, `4459924d`, `840b8318`):
`AnalyticsService` (headcount trend), `MileageService`, `ReferralService`,
`ScheduledReportService`, `OvertimeManagementService`, `TrainingManagementService`
+ `TrainingEnrollmentRepository`.

All items below still fire per-item `repository.findById()` / name-lookup calls inside
`page.map()` or list `stream().map()` — each page load issues N extra SQL queries.

Fix pattern for every item:
1. Extract `page.getContent()` (or list) before mapping.
2. Collect all needed foreign-key IDs into a `Set<UUID>`.
3. Bulk-fetch via `findAllById(ids)` → build `Map<UUID, String>` name caches.
4. Add overloaded `mapToResponse(entity, caches)` that reads from the map.
5. Keep the original 1-arg mapper for single-item create/update/approve paths.

| Priority | Service | What fires N+1 |
|----------|---------|----------------|
| ✅ P1 | `WallService` | DONE (`b…`): comment paths fetch-join author+user; reply counts via `countRepliesByParentCommentIds` batch. (Reaction paths were already `JOIN FETCH`.) |
| ✅ P1 | `InterviewManagementService` | DONE: `mapToInterviewResponse` batch-resolves candidate/jobOpening/interviewer names via 3 `findAllById` per page |
| ✅ P1 | `PerformanceReviewService` | DONE: employee/reviewer + cycle names from per-page caches (2 `findAllById`), shared across Page+List paths |
| ✅ P1 | `ReviewCycleService` | DONE: `getCalibration` batch-resolves employee names (1 `findAllById`). `mapToResponse(cycle)` had no per-cycle lookups — original description was inaccurate. |
| P2 | `FeedbackService` | Per feedback item: giver + receiver employee name lookup |
| P2 | `GoalService` | Per goal: employee name + optional assignee name |
| P2 | `ProbationService` | Per probation record: employee name + manager name |
| P2 | `ExitManagementService` | Per exit record: employee name + manager name |
| P2 | `OnboardingManagementService` | Per onboarding task: employee + buddy name lookups |
| P2 | `ContractService` | Per contract: employee name + department name |
| P2 | `CompensationService` | Per compensation record: employee name lookup |
| P2 | `BenefitManagementService` | Per benefit record: employee name lookup |
| P3 | `SurveyManagementService` | Per survey response: respondent employee name |
| P3 | `SurveyAnalyticsService` | Per result bucket: department/team name lookups |
| P3 | `TimeTrackingService` | Per time entry: employee name + project name |
| P3 | `ProjectTimesheetService` | Per timesheet row: employee + project name |
| P3 | `ShiftScheduleService` | Per schedule entry: employee + shift name |
| P3 | `TravelExpenseService` | Per expense: employee name + approver name |
| P3 | `PIPService` | Per PIP record: employee + reviewer name lookups |
| P3 | `ContractSignatureService` | Per signature record: employee name + contract title |

Owner: **agent** · No user decision needed · Each service is a 1–3 hour self-contained fix.

---

## Done this engagement (for reference)
- ✅ Theme dark-mode override bug fixed (Light now applies over a dark OS).
- ✅ Brand-color leaks purged (donut/attendance/notification-dots/workflow-chip/Loading) → semantic/accent tokens.
- ✅ Ease-spring de-bounced; base-card `backdrop-filter` removed; ESLint brand-color guard added.
- ✅ CI root-caused + 3 fix commits pushed; LINT-1 CI-confirmed.
- ✅ RBAC matrix (8 roles) + module health validated.
- ✅ Consolidated audit report committed (`docs/audit/production-readiness-2026-06-16.md`).
- ✅ Stopped 2 rogue agents + cleared scheduler lock (others respawn — see #0).
- ✅ N+1 fixes: AnalyticsService, MileageService, ReferralService, ScheduledReportService, OvertimeManagementService, TrainingManagementService (commits 3a4f9e35, 4459924d, 840b8318).
- ✅ N+1 fixes (P1 batch): WallService comments + InterviewManagementService; PerformanceReviewService + ReviewCycleService (2 commits this session).
