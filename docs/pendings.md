---
title: "Pendings — Docs / Knowledge-Base Workstream"
tags:
  - "type/tracker"
  - "area/documentation"
summary: "Open and in-progress items for the docs reset + Obsidian knowledge-base consolidation. Broader project blockers live in MEMORY.md."
updated: 2026-06-25
---

# Pendings — Docs / Knowledge-Base Workstream

Tracking the docs reset → regenerate → merge → ready effort. Broader project/production
blockers are tracked in `MEMORY.md`, not here.

## 📌 Pending — Ponytail (lean-code) backlog (audited 2026-06-25, implement later)

Findings from a full repo ponytail audit run on 2026-06-25. **Do not implement without reading
both ends** — each item is documented here for planning. Items marked ⚠️ HIGH RISK must be
read end-to-end and have a regression test before touching.

### Frontend (~-127,500 lines possible)

- [ ] **delete** `lib/generated/api/` — 154 of 185 Orval-generated controller directories are
      never imported (83%). The codebase migrated to TanStack Query hooks; the generated clients
      were never pruned. Only 29 dirs have active callers. Orval regenerates on demand — safe to
      delete the unused dirs. Estimated ~126,880 lines.

- [ ] **delete** `app/admin/mobile-api/page.tsx` + `lib/hooks/queries/useMobileApi.ts` +
      `lib/services/core/mobile-api.service.ts` (~380 lines). The route renders static API docs
      (code snippets) for a mobile client that does not exist. YAGNI scaffold.

- [ ] **shrink** `lib/hooks/useDebounce.ts` — remove 3 dead exports: `useAbortController`
      (lines 64–98), `useDebouncedFetch` (lines 99–173), `useThrottledCallback` (lines 174–222).
      Zero production callers; only referenced in the test file. Use native `AbortController` +
      fetch signal at call sites. ~159 lines.

- [ ] **delete** `lib/stores/useNotificationStore.ts` (~38 lines). Store comment says
      "no production component owns this state yet; forward-looking placeholder." Zero consumers
      outside the file itself.

- [ ] **shrink** `lib/utils/index.ts` — remove `isAdmin()` and `hasPermission()` (~20 lines).
      Both duplicate logic from `usePermissions` hook. 4 callers bypass the proper hook — migrate
      them to `usePermissions()`.

- [ ] **delete** `lib/hooks/useFeatureFlag.ts` (~8 lines). Pure re-export shim; the barrel
      `lib/hooks/index.ts` already re-exports from `queries/useFeatureFlags` at line 53.
      Point the 1 remaining direct import (FeatureGate.tsx) to the source directly.

- [ ] **delete** `lib/utils/date.ts` (~6 lines + 26 caller renames). `toLocalDateString()`
      duplicates `dateUtils.ts:getLocalDateString()` under a different name. Migrate 26 callers,
      delete the file.

- [ ] **shrink** `next.config.js` (~7 lines). Remove 6 dead `experimental.optimizePackageImports`
      entries for Radix UI packages removed in the prior audit (`react-dialog`, `react-dropdown-menu`,
      `react-select`, `react-tabs`, `react-tooltip`) plus `@tanstack/react-table` which is not in
      `package.json`. Also remove the `webpack: (config) => config` no-op line — comment above it
      confirms the warning it guarded against was resolved by the `turbopack:{}` entry.

- [ ] **delete** `.claude-flow/data/` inside `lib/generated/api/` — swarm agent runtime
      artifact that wandered into the source tree. Not code, not committed intentionally.

### Backend (~-390 lines possible)

- [ ] **delete** `common/config/CacheMetricsConfig.java` (~200 lines). AOP around Spring cache
      methods records `cache.hits` / `cache.misses` meters that stay at 0 forever (the class
      comment admits this). Spring Actuator + Micrometer already instruments Spring caches via
      `RedisCacheMetrics`. Add `management.metrics.cache.instrument=true` to yml and delete.

- [ ] **delete** `common/config/MetricsConfig.java` — the 6 unused Counter/Timer `@Bean`
      definitions (~60 lines). `MetricsService` creates its own meters inline via `MeterRegistry`;
      none of the 6 beans are injected anywhere. Keep only the `TimedAspect` bean.

- [ ] **delete** `common/config/EmailConfig.java` (~48 lines). `spring-boot-starter-mail` +
      `JavaMailSenderAutoConfiguration` builds `JavaMailSender` from `spring.mail.*` automatically.
      This class re-wires the exact same properties manually. Move SMTP auth/starttls to
      `spring.mail.properties.*` in yml.

- [ ] **shrink** `common/config/JpaQueryConfig.java` — remove the `RepositoryQueryAspect` inner
      class (lines 39–112, ~75 lines). It intercepts every `JpaRepository.*(..)` call with
      `System.nanoTime()` + dynamic `Timer.builder().register()` — AOP overhead on all 321
      entities' repos. `SlowQueryInterceptor` (also in this file) already handles slow SQL at
      the correct layer.

- [ ] **yagni** `infrastructure/sms/SmsService.java` interface + `MockSmsService.java` (~40 lines
      total). Only one implementation exists; `TwilioConfig.java` exists but nothing wires it to
      the interface. Collapse into a concrete class; restore the interface when a second provider
      arrives.

- [ ] **yagni** `infrastructure/payment/PaymentGatewayService.java` interface +
      `MockPaymentService.java` (~30 lines total). Same pattern as SMS — `MockPaymentService` IS
      the only implementation. Collapse into one class.

- [ ] **shrink** `common/config/AIConfig.java` — remove `objectMapper()` @Bean (~15 lines).
      `JacksonAutoConfiguration` auto-builds this; `jackson-datatype-jsr310` is on the classpath
      via `spring-boot-starter-web` so `JavaTimeModule` is auto-registered. Move settings to
      `spring.jackson.*` yml keys. Keep the `RestTemplate` bean (Spring does NOT auto-create it).

- [ ] **stdlib** Two `private static final ObjectMapper MAPPER = new ObjectMapper()` fields in
      `api/expense/dto/ExpensePolicyResponse.java:24` and `api/payment/dto/PaymentConfigDto.java:25`.
      These bypass the configured Spring bean, miss `JavaTimeModule` and `FAIL_ON_UNKNOWN_PROPERTIES`.
      Inject via constructor instead.

- [ ] ⚠️ **HIGH RISK — flag only, do not touch without regression test**:
      `ApprovalEscalationJob` vs `WorkflowEscalationScheduler` — both enabled
      (`matchIfMissing=true`), different ShedLock names so they can run concurrently, and both
      mutate the same `StepExecution` rows via different code paths (Job copies; Scheduler calls
      `step.escalate()` in-place). Potential double-escalation and conflicting status writes. Read
      both end-to-end and write a regression test before touching either.

---

## 📌 Pending — knowledge-base polish (proposed, not yet started)

- [ ] **Tidy residual section markers**: a few merged notes still have cosmetic `§2` / `§3.2`
      markers trailing wikilinks (e.g. `[[Services]] §2`) left over from citing the old flat
      docs by section. Harmless, but could be cleaned for polish.

## 📌 Pending — Keka-parity push, 2026-09-20 (faylo-sdlc, 6 parallel agents)

Multi-agent faylo-sdlc run auditing Hire/Grow/Fluence for real gaps + a "built but unwired"
component sweep (pattern: complete, well-typed component/service with zero callers). Full
story list: `faylo status` (epic `EP-2FWVEHJV5G29`). Backend regression suite green after
this batch (4319 tests, 3 pre-existing/environmental failures unrelated to this work).

### ⏳ Blocked on human action (implementation done, needs signoff/decision)

- [ ] `faylo signoff` on 6 hard-gate stories: `US-2FWVF01PY12F`, `US-2FX1618JXKEP`,
      `US-2FX161DHPZHC`, `US-2FX161HKZRS3` (a11y backfills), `US-2FX9MY3RY0PS` (resource-pools
      real persistence, V317 migration).
- [ ] `faylo decision resolve DC-2FXAQEN3BKW5` — DocuSign replaces internal e-sign when tenant
      configured, falls back to internal otherwise (conservative option already implemented,
      `US-2FXAK3826HTN`, commit `f380b673`).
- [ ] `faylo decision resolve DC-2FXAJXP90KYN` — `RelatedContent.tsx` widget has no real backend
      data source (search endpoints are query-based, not similarity/tags); build a minimal
      related-content endpoint, or drop the ticket (`US-2FXAH0C9PR5D`).
- [ ] `faylo decision resolve DC-2FXCFFBVNYMX` — contract reminder cadence: preserve the
      30/15/7-day multi-window model (implemented, `US-2FXCB6GNEF0X`) vs. collapse to one
      reminder/contract+type.

### 🔲 Held — scoped but not dispatched (feature-sized, needs a product call first)

- [ ] **Document management** (`DocumentWorkflowService`, 355 lines, zero controller) — scoped
      into 3 independent tickets, now in progress: `US-2FYBYHPKK1HW` (approval trigger via the
      *generic* `WorkflowService`/`DOCUMENT_REQUEST` engine — do NOT rebuild approve/reject,
      that already exists), `US-2FYBYJFZTKF8` (access ACL endpoints), `US-2FYBYK78PV8B` (expiry
      tracking + scheduler). Once the approval trigger ships, `DocumentApprovalWorkflow`/
      `DocumentApprovalTask` become dead code — follow-up ponytail delete, don't remove yet.
- [ ] **Wiki approval enforcement** — write-path now correctly routes through
      `WikiSpaceApprovalService.configureApproval()` (`US-2FXCB6R6V47Y`, done), but nothing in
      the page-publish flow checks `isApprovalRequired`/routes to the approver yet. Needs a page
      status model (DRAFT/PENDING_APPROVAL/PUBLISHED) + submit/approve endpoints.
- [ ] **360-feedback peer nomination** — `FeedbackRequestForm.tsx`/`FeedbackResponseForm.tsx`
      (743 lines combined) are complete, zero usages; backend has the endpoints but no frontend
      mutation hook was ever built to call them. Real gap, not a pure wire-in.
- [ ] **Competing 360-feedback implementation** — `CalibrationMatrix.tsx` (447 lines) +
      `lib/types/grow/performance-360.ts` (used by nothing else in the codebase) look like an
      entire alternate calibration subsystem from commit `4b57ecc6` that lost to the
      inline-built 9-box that actually shipped (`app/performance/calibration/page.tsx`,
      `app/performance/9box/page.tsx`). Needs a call: confirmed-dead (delete) or should replace
      what's live.
- [ ] **Fluence ActivityFeed wiring** — `ActivityFeed.tsx` (complete, actively maintained)
      vs. the cruder inline activity blocks duplicated in `app/fluence/wall/page.tsx` and
      `app/fluence/analytics/page.tsx`. Swapping it in is a page-redesign call, not a pure wire.
- [ ] **Offboarding Phase 2 (dashboard, interview analytics, asset-recovery actions)** —
      core exit process is solidly wired end-to-end, but a distinct hook cluster in
      `lib/hooks/queries/useExit.ts` has zero callers: `useExitDashboard`,
      `useExitInterviewAnalytics`, `useScheduledInterviews`, `useAllExitInterviews` (no HR-wide
      exit dashboard exists), `useCreateAssetRecovery`/`useRecordAssetReturn`/
      `useMarkAssetAsLost`/`useWaiveAssetRecovery`/`useVerifyAssetReturn` (assets are
      display-only, no action UI), `useSettlementById`/`usePendingSettlementApprovals` (no
      finance-facing settlement queue). Reads as an unbuilt Phase 2, not an accidental miss.
- [ ] **Probation: no negative-outcome path** — `useExtendProbation`/`useFailProbation`
      (`lib/hooks/queries/useProbation.ts`) unused; `app/probation/page.tsx` only wires the
      pass-probation flow (`useConfirmEmployee`/`useAddEvaluation`). No UI action exists for
      extending or failing probation.
- [ ] **Payroll bulk processing** — `usePayroll.ts`'s `useBulkProcessPayroll`/
      `useBulkProcessingStatus`/`usePreviewBulkProcessing` unused; `BulkProcessingWizard.tsx`
      calls `payrollService` directly instead, and the whole feature is gated off by
      `BULK_PROCESSING_AVAILABLE = false` in `payroll.service.ts:456`. Deliberate, not a bug —
      flagging in case someone wants to revisit flipping the flag.
- [ ] **Expense-advance + compensation-cycle hook clusters** — ~80 individually-unused hooks
      found across `useExpenses`/`useCompensation`/etc; the expense-advance lifecycle
      (`useCreateExpenseAdvance`/`useApproveExpenseAdvance`/`useDisburseExpenseAdvance`/
      `useSettleExpenseAdvance`) and compensation cycle-creation/revision-approval set look the
      most feature-shaped. Not individually verified against their owning pages — lower
      confidence than the items above, scope as a separate follow-up sweep if pursued.
- [ ] **Two parallel recruitment domain models** — `Candidate`/`RecruitmentController` (13-stage
      `RecruitmentStage`, backs the nav-linked `/recruitment/candidates` list) vs `Applicant`/
      `ApplicantController` (10-stage `ApplicationStatus`, backs the live `/recruitment/pipeline`
      kanban). Neither is dead — both have a real, reachable, actively-maintained UI surface —
      but they model the same "candidate moving through a hiring pipeline" concept twice with
      different stage counts. Needs a product/architecture call on consolidation, not a blind fix.
- [ ] **10x `.skip` test files**, all inert since the 2026-05-13 package rename
      (`TenantScopingArchitectureTest`, `PerformanceReviewControllerTest`,
      `DocuSignApiClientTest`, `LeaveRequestControllerTest`, `AnalyticsControllerTest`,
      `IntegrationEventRouterTest`, `AssetManagementControllerTest`,
      `NotificationControllerTest`, `RoleControllerTest`, `AdminServiceTest`) — needs a call:
      fix and re-enable, or delete. Dead weight either way until decided.

## ✅ Done this workstream

- [x] **Keka-parity sweep, 2026-09-20** (see pending section above for the full backlog it
      surfaced): resource-pools real persistence (V317); Fluence page-tree nav wired
      (`WikiPageTree`); Grow performance-spider chart fixed to real per-employee competency data
      (was hardcoded for every employee) + real OKR owner names; Hire offer accept/decline now
      fires notifications; Hire scheduled reminders (onboarding tasks + upcoming interviews,
      `HireReminderScheduler`); Fluence Expand/Collapse + TOC macros wired into editor/viewer;
      orphan `WikiPageApprovalTask` entity deleted + misleading `DeleteSpaceModal` copy fixed;
      interview scorecard submit + summary display wired (`ScorecardForm`/`ScorecardSummary`);
      integrations `ConnectionTestButton` + `EventSubscriptionPicker` wired into
      `ConnectorConfigPanel`; dead `MacroRenderer.tsx` deleted (superseded by Tiptap NodeViews);
      dead `PermissionScopeMerger.java` deleted (superseded by `AuthService`+
      `ScopeContextService`, confirmed duplicate RBAC scope-merge logic); `WikiSpaceController`
      routed through `WikiSpaceApprovalService.configureApproval()` instead of inline field-sets;
      `/tenants/register` locked down to `TENANT_MANAGE` (was public self-serve, no product
      justification — internal platform, not SaaS).
  - **Incident caught + fixed mid-run**: a concurrent agent's stale file write silently reverted
    ~15 already-committed files back to pre-fix content in the shared working tree — including
    the `/tenants/register` security lockdown reopening to unauthenticated access, and the
    Grow spider-chart fix reverting to hardcoded data. Caught via `git diff` before commit,
    restored from HEAD, recompiled clean, no data lost. **Lesson for future multi-agent runs on
    this repo**: no per-agent worktree isolation here (matches the existing worktree-hazard
    memory) — concurrent `git stash`, stale cached full-file `Write` calls, and concurrent `mvn
    test` runs in the same checkout all caused near-misses this session. Prefer `Edit` over
    full-file `Write` on shared files, `git status` before every commit, avoid `git stash`.


- [x] **Obsidian Bases dashboard** (2026-06-17): built `docs/obsidian/Knowledge-Base.base` — a
      filterable index of all 42 vault notes with three table views (All Notes grouped by
      section, Decisions & ADRs, Catalogs & References). Section derives from the folder via a
      `replace()` formula; type comes from `tags:`. Note: the vault's real frontmatter schema is
      flat `tags: [...]` + `title:` (+ `status:` on the 5 ADRs), **not** the `area/type/layer`
      namespaced tags this item originally assumed. Linked as a data-driven entry point from
      [[00-Home]].
- [x] **RuFlo sync — decision: KEEP/restore, not retire** (2026-06-17): on inspection the
      `docs/swarm/` source (README, `domains.yaml`, `registry.yaml`, 6 workflow pipelines) is
      **already present and tracked at HEAD** — deleted in the `ed6f023d` reset but re-added in
      `b2801919`, so the original "no source" premise was stale. `./scripts/ruflo-sync.sh
      --check` reports no drift vs the live gitignored `.claude-flow/` runtime, which
      `ruflo-start.sh` / `start-work.sh` / `AGENTS.md` all depend on — so retiring the sync was
      rejected. No file restore was needed; root `CLAUDE.md` note corrected to reflect this.

- [x] Keep root project-wide Obsidian vault; remove `docs/.obsidian/`; track vault in git
      (workspace UI state ignored). Pushed.
- [x] Full `docs/` reset + regenerate from codebase via parallel workflow (15 evidence-based
      docs, Mermaid). Pushed (`ed6f023d`).
- [x] Update root `CLAUDE.md` "read before acting" routing table (v1, flat layout). Pushed
      (`6561522e`).
- [x] **Merge** the flat docs + the separately-added `docs/obsidian/` vault into ONE unified
      vault (`nu-aura-docs-merge`, 12 agents). New notes: `06-Database/Migrations.md`,
      `01-Architecture/Code-Patterns.md`, `07-DevOps/Local-Setup.md`. Vault = 42 notes.
- [x] Delete merged flat sources (`architecture/ reference/ apps/ patterns/ setup/ Home.md`)
      and empty placeholders (`advanced.md`, `app/getting-started.md`).
- [x] Delete stray root scratch files (`Untitled.base/.canvas`, daily note, `*-image.md`)
      and gitignore the patterns so the root-opened vault can't pollute the repo again.
- [x] Focus the Obsidian vault: `userIgnoreFilters` in `.obsidian/app.json` excludes
      `node_modules`, `frontend`, `backend`, `build`, etc. from graph/search.
- [x] Update root `CLAUDE.md` routing table (v2) to point at the unified `docs/obsidian/` vault
      (now also covers ADRs, RBAC, security, testing, runbooks).
- [x] Repoint all stale flat-doc citations across the vault to `[[wikilinks]]`; verified
      `docs/README.md` links and vault references resolve (no dangling `.md` paths).
