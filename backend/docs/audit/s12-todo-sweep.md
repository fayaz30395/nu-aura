# S12 TODO Sweep — Sprint S12 Letter-Tagged Tracks

**Auditor:** Aux-S12TodoSweep (read-only sibling wave)
**Scope:** `nu-aura/backend/src/main/java`, `src/test/java`
**Snapshot:** 2026-05-14 (mid-wave; results may shift as the 11 sibling agents close
in-flight `TODO(S12-B)` sites)
**Patterns searched:** `TODO(S12-*)`, `FIXME(S12-*)`, `HACK(S12-*)`, `XXX(S12-*)`,
`S12-*:` in comments, `// S12-*`

---

## Summary

| Metric                              | Value                                  |
|-------------------------------------|----------------------------------------|
| Distinct S12 sprint tags found      | **3** (S12-B, S12-F, S12-J)            |
| Total annotated sites               | **46**                                 |
| Open `TODO(S12-*)` markers          | **0** (all closed or resolved)         |
| Open `FIXME/HACK/XXX(S12-*)` markers| **0**                                  |
| Files touched                       | **21**                                 |

**Sprint coverage of the alphabet:** A, C, D, E, G, H, I, K–Z are **unused** in source. Only
B (tenant time), F (soft-delete guard), and J (captcha) appear in code. Other S12 letter
tracks either landed without tag annotations, were rolled into other sprints, or were
never scoped.

---

## Per-tag breakdown

### S12-B — tenant time (IN-FLIGHT WAVE — 11 agents currently active)

- **Theme:** Replace JVM-local `LocalDate.now()`/`LocalDateTime.now()`/`Instant.now()` with
  `tenantTimeService.now(tenantId)` / `today(tenantId)` so that "today" and "now" reflect
  each tenant's configured timezone instead of server zone (IST fallback for legacy paths).
- **Sites:** 32 across 14 files (16 application services + 1 test class)
- **Status:** **ACTIVE WAVE — do not duplicate work.** All comment markers that previously
  carried `TODO(S12-B): inject TenantTimeService` have been collapsed to the resolved form
  (`— resolved via TenantTimeService.`) as the sibling agents complete each migration.
  As of this snapshot the count of literal open `TODO(S12-B)` substrings is **zero**.

**File map (sites per file):**

| File                                                                                                  | Sites |
|-------------------------------------------------------------------------------------------------------|------:|
| `application/workflow/service/WorkflowService.java`                                                   | 10    |
| `application/workflow/scheduler/WorkflowEscalationScheduler.java`                                     | 4     |
| `application/recruitment/service/RecruitmentManagementService.java`                                   | 3     |
| `application/contract/scheduler/ContractLifecycleScheduler.java`                                      | 3     |
| `application/contract/service/ContractService.java`                                                   | 2     |
| `application/recruitment/listener/OfferLetterSignatureListener.java`                                  | 2     |
| `application/recruitment/service/JobOpeningService.java`                                              | 1     |
| `application/recruitment/service/JobBoardIntegrationService.java`                                     | 1     |
| `application/recruitment/service/ApplicantService.java`                                               | 1     |
| `application/recruitment/service/AgencyService.java`                                                  | 1     |
| `application/workflow/scheduler/ApprovalEscalationJob.java`                                           | 1     |
| `application/lms/service/QuizAssessmentService.java`                                                  | 1     |
| `application/helpdesk/service/HelpdeskService.java`                                                   | 1     |
| `test/.../common/util/TenantTimeServiceTest.java` (coverage matrix header)                            | 1     |

**Effort:** N/A — already in flight; on completion, sibling Aux-TenantTimeService-Tests
agent owns regression coverage matrix.

---

### S12-F — soft-delete guard on native queries

- **Theme:** Hibernate's `@Where` clause is **bypassed** by native SQL queries
  (`@Query(nativeQuery = true)`). Repositories that issue native queries against
  soft-delete entities must add an explicit `deleted_at IS NULL` (or equivalent) filter,
  marked with the `SOFT_DELETE_GUARD (S12-F)` comment for auditability.
- **Sites:** 5 sites across 5 repository files (all `infrastructure/.../*Repository.java`)
- **Status:** **CLOSED** — every occurrence is a self-documenting marker on an
  already-implemented guard (not a TODO). Pattern is stable; remaining work is **forward
  hygiene** — new native queries on soft-delete entities must keep the convention.

**Files:**

| File                                                                                  |
|---------------------------------------------------------------------------------------|
| `infrastructure/knowledge/repository/WikiPageRepository.java:73`                      |
| `infrastructure/knowledge/repository/BlogPostRepository.java:65`                      |
| `infrastructure/workflow/repository/StepExecutionRepository.java:155`                 |
| `infrastructure/workflow/repository/WorkflowExecutionRepository.java:74`              |
| `infrastructure/payroll/repository/PayslipRepository.java:165`                        |

**Effort:** none today; recommend an ArchUnit / regex enforcement test (<1d) that fails
CI when a `nativeQuery = true` query on a `@Where(deleted_at IS NULL)` entity is missing
the guard — turning convention into an invariant.

---

### S12-J — reCAPTCHA gate on `/auth/login`

- **Theme:** Adaptive CAPTCHA gate that activates after N failed login attempts. Backed
  by `CaptchaService` with two implementations (`GoogleRecaptchaScanner` /
  `NoOpScanner`), wired through `AuthController`.
- **Sites:** 9 sites — all in **test code** documenting the integration contract.
- **Status:** **CLOSED** — production wiring is shipped (Spring Sec config + bean
  selection by property). Test references are descriptive (`@DisplayName`, javadoc
  describing what S12-J introduced), not actionable TODOs.

**Files:**

| File                                                                              | Sites |
|-----------------------------------------------------------------------------------|------:|
| `test/.../api/auth/AuthControllerSecurityTest.java` (5 `@DisplayName` + 3 javadoc)| 8     |
| `test/.../infrastructure/security/CaptchaServiceTest.java` (file-level javadoc)   | 1     |

**Effort:** none.

---

## Open actionable items by track

| Tag   | Open TODOs | Open FIXMEs | Action required |
|-------|-----------:|------------:|------------------|
| S12-B | 0          | 0           | In-flight wave will retire the track; sweeper monitors only |
| S12-F | 0          | 0           | Optional: add ArchUnit guard (see below) |
| S12-J | 0          | 0           | None |

There are **no open `TODO(S12-*)`/`FIXME(S12-*)`/`HACK(S12-*)`/`XXX(S12-*)` markers
anywhere in `src/main/java` or `src/test/java`** at snapshot time. Every remaining S12
mention is now a **resolved-state breadcrumb** (audit comment) rather than an open task.

---

## Letter-track coverage matrix

Tags A through Z searched explicitly; only the three below produced hits.

| Letter | Hits | Interpretation                                                       |
|--------|-----:|----------------------------------------------------------------------|
| A      | 0    | Not tagged in code (may live in docs / commit messages only)         |
| **B**  | 32   | tenant-time migration — in-flight wave                                |
| C      | 0    | Not tagged                                                           |
| D      | 0    | Not tagged                                                           |
| E      | 0    | Not tagged                                                           |
| **F**  | 5    | native-query soft-delete guard — convention codified, no open work    |
| G      | 0    | Not tagged                                                           |
| H      | 0    | Not tagged                                                           |
| I      | 0    | Not tagged                                                           |
| **J**  | 9    | reCAPTCHA login gate — shipped; only test breadcrumbs remain          |
| K–Z    | 0    | Not tagged                                                           |

---

## Next-sprint candidates

Because zero open `TODO(S12-*)` markers remain, the S12 letter-track backlog is
**effectively cleared**. Recommendations are forward-hygiene only:

1. **(Low-effort, high-leverage) S12-F enforcement test** — <1d
   Add an ArchUnit / custom test asserting that every method on a Spring Data repository
   annotated with `@Query(nativeQuery = true)` whose return type extends a `@Where`-
   annotated entity contains a `deleted_at IS NULL` (or `is_deleted = false`) predicate
   in its query string. Converts the comment-convention into a compiler-grade invariant
   and prevents future regressions of WAVE-S12-F.

2. **(Sweep cleanup) Collapse S12-B resolved breadcrumbs** — <1d, optional
   The 32 `// S12-B: ... resolved via TenantTimeService.` lines are useful provenance
   today but will become comment-noise once the wave lands. A single follow-up commit
   can shorten them (or drop them) once `TenantTimeService` is universal and the
   migration is in the changelog. Defer until after the active wave merges.

3. **(Doc gap) S12 letter-track ledger** — <1d
   Letters A, C, D, E, G, H, I, K–Z were searched and produced zero hits. Either:
   (a) those tracks were never scoped, (b) they shipped without tag annotations, or
   (c) the tags live only in commit messages / PR titles. Recommend a one-page sprint-
   close note enumerating which S12 letters were assigned and where their
   evidence lives, so future audits don't have to re-derive coverage.

4. **(No-op) S12-J** — no action; track is complete and self-documenting via tests.

---

## Methodology / reproducibility

```bash
# Total references
grep -rn -E "S12-[A-Z]" src/main/java src/test/java | wc -l

# Open TODO/FIXME/HACK/XXX
grep -rn -E "(TODO|FIXME|HACK|XXX)\(S12-[A-Z]" src/main/java src/test/java

# By tag
grep -rho -E "S12-[A-Z]" src/main/java src/test/java | sort | uniq -c

# Files touched
grep -rn -E "S12-[A-Z]" src/main/java src/test/java | awk -F: '{print $1}' | sort -u
```

Snapshot caveat: `TODO(S12-B)` count moved from 3 → 0 during the 20-minute sweep window
as sibling agents committed. Counts above reflect end-of-window state.
