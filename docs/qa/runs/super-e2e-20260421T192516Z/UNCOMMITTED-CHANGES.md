# Uncommitted changes from this Super E2E run

**Post-triage fixer dispatch.** After triage reduced 21 raw bugs → 7 real, the orchestrator
applied minimal-diff fixes to the highest-priority subset (auth refresh loop + three RBAC
page-shell drifts). Remaining bugs (BUG-W3-01, BUG-W1-05, BUG-W8-03) and the
`/admin/tenants` product decision (BUG-W8-01) are deferred to the next iteration.

## Product code changes

| File                                                                         | Bug       | Change                                                                                                                                                                                            |
|------------------------------------------------------------------------------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `backend/src/main/java/com/hrms/api/auth/controller/AuthController.java`     | BUG-W3-02 | Wrap `authService.refresh()` in try/catch; clear auth cookies on `RuntimeException` so the browser stops sending the stale refresh cookie that was causing the 401 loop.                          |
| `backend/src/test/java/com/hrms/api/auth/controller/AuthControllerTest.java` | BUG-W3-02 | Added `shouldClearCookiesOnRefreshFailure` regression test asserting `Set-Cookie` headers with empty values are emitted when `authService.refresh()` throws.                                      |
| `frontend/lib/hooks/useTokenRefresh.ts`                                      | BUG-W3-02 | Raise `MIN_REFRESH_GAP_MS` from 5 min → 30 min. Visibility-change bursts in multi-tab sessions were consuming single-use refresh tokens faster than the 50-min periodic timer could replace them. |
| `frontend/app/assets/page.tsx`                                               | BUG-W2-02 | Wrap page body in `PermissionGate permission={Permissions.ASSET_VIEW}` so a 403 on the list API renders Access-Denied instead of an empty state with "Add Asset" CTA.                             |
| `frontend/app/contracts/page.tsx`                                            | BUG-W2-04 | Same page-shell fix with `Permissions.CONTRACT_VIEW`.                                                                                                                                             |

`/overtime` (BUG-W2-03) deliberately NOT gated — it legitimately serves users who have
`OVERTIME_REQUEST` but not `OVERTIME_VIEW` (e.g., employees submitting their own requests).
Its "Request Overtime" CTA is correct; the bug there is that the *team list* section
should render denial, not the whole page. Deferred to a targeted section-level gate fix.

## Files modified on behalf of this run

| File                                                | Change           | Why                                                                                                                                                                                                                                                                          |
|-----------------------------------------------------|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `.claude/skills/nu-chrome-super-e2e/SKILL.md`       | 413 → ~480 lines | Codify every edge case surfaced in this run + the prior (20260421T185356Z) aborted run so the next invocation doesn't rediscover them. Added **Hard rule 15** (sidebar-driven navigation only, no URL speculation) after triage revealed 11 of 21 bugs were speculated URLs. |
| `docs/qa/runs/super-e2e-20260421T192516Z/TRIAGE.md` | new              | Post-run triage classifying 21 raw bugs → 7 real + 1 needs-decision + 11 invalid, with verified alternate paths for each false positive.                                                                                                                                     |

### SKILL.md changelog

Three sections reworked:

1. **DISPATCH "Before dispatching a pass"** — replaced card-click login sequence with direct
   `/api/v1/auth/login` POST using IIFE + absolute URL + CSRF double-submit cookie. Added
   canonical 8-account demo roster table (SUPER_ADMIN / MANAGER / 3×TEAM_LEAD / EMPLOYEE /
   HR_MANAGER / RECRUITMENT_ADMIN with real emails & display names).

2. **PER-WORKER CONTRACT session verification** — added 3×10s retry loop on "Browser
   extension is not connected" transience; session probe wrapped in IIFE with absolute URL
   (`http://localhost:8080/api/v1/auth/me`) to survive top-level-await ban and relative-URL
   404 surprises. Explicit abort paths for `session-not-ready`, `role-mismatch`,
   `session-poisoned`.

3. **Hard rules 9–14 + SPEED & SAFETY GUARDRAILS** — added ~16 bullets covering:

- Status taxonomy `PASS | PASS-EMPTY | PASS-DENIED | FAIL`
- IIFE requirement on every `javascript_tool` eval (top-level await is a SyntaxError)
- Extension-disconnect retry before failing a shard
- No form submissions during page sweeps (sweeps are read-only)
- React error boundary → automatic P1 bug
- Silent `/auth/login` redirect with `/auth/me` still 200 → `session-poisoned`
- Direct-API auth preferred over card-click (citing BUG-W1-01 click flake)
- Empty 200 bodies from `/auth/logout` are valid — don't retry
- Pass-abort path writes `SKIPPED_PASSES.md` so final report can acknowledge coverage gaps
- Tab reuse via `tabs_context_mcp` rather than recreating each run
- Fixer-dispatch gate (operator may pause before fixers for triage-first runs like this one)

## What was NOT changed

- No backend Java source
- No frontend TypeScript source
- No Flyway migrations
- No CLAUDE.md, docker-compose.yml, or CI config
- No git commits created (per project rule: never auto-commit)

Re-run `/nu-chrome-super-e2e` with passes P4–P6 when ready. The 21 P1/P2 bugs in
`bugs.jsonl` are the triage queue; address BUG-W3-02 (`/auth/refresh` 401 loop) before the
re-run so long sessions don't get poisoned.
