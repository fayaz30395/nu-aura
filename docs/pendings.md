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

## ✅ Done this workstream

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
