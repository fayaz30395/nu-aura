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

## ✅ Ponytail (lean-code) backlog — closed out 2026-09-20 (`US-2FZ0BC70DYQ9`)

Originally audited 2026-06-25. Re-verified against current HEAD before touching (3 months of
drift — several items were already gone). Below: what actually happened, not the stale 06-25 text.

### Frontend

- [x] **deleted** `lib/generated/api/` — 156/185 zero-caller dirs removed (re-verified whole-repo,
      not just app/), 29 kept. Also removed `.claude-flow/data/` (moot for git, dir is gitignored).
- [x] **deleted** `app/admin/mobile-api/` (page+hook+service) + its 3 barrel re-exports + the nav
      sidebar entry + the route-guard entry — leaving those would 404 the sidebar link.
- [x] **shrunk** `lib/hooks/useDebounce.ts` — removed `useAbortController`/`useThrottledCallback`
      (confirmed test-only). `useDebouncedFetch` never existed in the current file — stale line.
- [x] `useNotificationStore.ts` — already deleted (commit `2a60c3a3`, predates this cleanup).
      Only a stale README table row remained; fixed.
- [x] **shrunk** `lib/utils/index.ts` — removed `isAdmin()`/`hasPermission()`, migrated 4 real
      callers to `usePermissions()`.
- [x] `useFeatureFlag.ts` shim — didn't exist; `FeatureGate.tsx` already imports the real source.
- [x] **deleted** `lib/utils/date.ts` — migrated 20 callers to `dateUtils.getLocalDateString`.
      (5 other files have their own unrelated local copy of the same 6-line function — left alone.)
- [x] **shrunk** `next.config.js` — removed the `@tanstack/react-table` entry (not in
      package.json); the Radix entries + webpack no-op line were already gone.

### Backend

- [x] `CacheMetricsConfig.java`, `MetricsConfig.java` dead beans, `EmailConfig.java`,
      `JpaQueryConfig.java`'s `RepositoryQueryAspect`, `AIConfig.java`'s `objectMapper()` bean —
      **already gone**, someone cleaned these in an earlier pass. Zero action needed.
- [ ] **stdlib, held**: two duplicate `ObjectMapper` fields (`ExpensePolicyResponse.java:24`,
      `PaymentConfigDto.java:25`) — the target shared bean (`AIConfig.objectMapper()`) no longer
      exists (removed above), and both DTOs are static-factory classes, not Spring-managed, so
      constructor injection doesn't fit. Not fixed — would need a new shared utility class as its
      own follow-up, not a 2-line dedup. Flagging rather than inventing one.
- [ ] **held, not attempted**: `infrastructure/sms/SmsService.java`/`MockSmsService.java` and
      `infrastructure/payment/PaymentGatewayService.java`/`MockPaymentService.java` yagni
      collapses — untouched this pass.
- [ ] ⚠️ **HIGH RISK — still flag only, do not touch without regression test**:
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

- [x] **Document management** — done: `US-2FYBYHPKK1HW` (approval trigger via generic
      WorkflowService), `US-2FYBYJFZTKF8` (access ACL), `US-2FYBYK78PV8B` (expiry+scheduler).
      Dead `DocumentApprovalWorkflow`/`DocumentApprovalTask` deleted (`US-2FYEC05CBB21`).
- [x] **Wiki approval enforcement** — done (`US-2FYDT45QRKY5`): page-publish flow now checks
      `isApprovalRequired`, sets PENDING_APPROVAL, adds approve/reject endpoints.
- [x] **360-feedback peer nomination** — done (`US-2FYDT4BEB1G7`): nomination hook + UI wired.
- [x] **Competing 360-feedback implementation** — resolved: `CalibrationMatrix.tsx` +
      `FeedbackRequestForm`/`FeedbackResponseForm.tsx` confirmed dead, deleted (`US-2FYDXEMGD2V1`).
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
- [x] **Probation: no negative-outcome path** — done (`US-2FYDVJW3DG3Q`): Extend/Fail buttons
      wired to `useExtendProbation`/`useFailProbation`.
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
- [ ] **11 dead exports in `useCompensation.ts`** (of 17 total) — `useActiveCycles`,
      `useCompensationCycleDetail`, `useCycleStatistics`, `useCreateCycle`,
      `useUpdateCycleStatus`, `useRevisionsByCycle`, `usePendingApprovals`, `useRevisionDetail`,
      `useSubmitRevision`, `useReviewRevision`, `useApplyRevision` — zero callers anywhere.
      Confirmed via exact-name grep (a coarse grep earlier substring-matched an unrelated
      `usePendingApprovalsCount` in `useResources.ts` — false lead, corrected). NOT a blind
      delete candidate: `useSubmitRevision`/`useReviewRevision`/`useApplyRevision` look like
      scaffolding for a submit→review→apply revision workflow the page hasn't finished wiring
      (only approve/reject exist today) — check with whoever owns compensation before removing.
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
