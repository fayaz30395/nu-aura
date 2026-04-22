# NU-AURA Super E2E Report

- Run: `docs/qa/runs/super-e2e-20260421T185356Z`
- Mode: **FULL** (10 workers, 53 pages × 6 roles + 11 lifecycles target)
- Git SHA: `0b3aee04866bc12dacb7168dfb5590b7d5dc1386`
- Started: 2026-04-21T18:53:56Z
- Wall-time: ~90 min (including diagnostic phase)
- Testers dispatched: 10 | Fixers dispatched: 0 (run aborted pre-fix on harness defect)
- Bugs found: 18 (5 in `bugs.jsonl`, remainder in per-worker reports)

---

## TL;DR — Run aborted due to harness-level defect (NOT a product regression)

**Root cause** (architectural, confirmed via `/api/v1/auth/me` identity flip):
Chrome-MCP tabs share a single browser profile → a single httpOnly cookie jar.
Parallel demo logins across 10 tabs stomped each other's JWT. W7 login-as-Saran-V
was observed flipping to Fayaz M / SUPER_ADMIN mid-run. W1/W4/W5 aborted pre-report;
W6/W7 sessions poisoned mid-run; W2/W3/W8/W9/W10 partial results.

**Resolution applied to skill doc** (`.claude/skills/nu-chrome-super-e2e/SKILL.md`):
restructured to role-pass serialization — orchestrator performs ONE login per role,
dispatches all same-role workers in parallel within that pass, logs out between
passes. Worker `LOGIN PROCEDURE` replaced with a `SESSION CONTRACT` (workers verify
via `/api/v1/auth/me` on entry and every 3 pages; abort with `role-mismatch` on flip).

The product-level bugs surfaced below are still real findings worth triaging, even
though coverage is incomplete.

---

## Summary

| Worker | Role                         | Tab        | Status                   | Pages Pass/Fail/Skip | Bugs                              |
|--------|------------------------------|------------|--------------------------|----------------------|-----------------------------------|
| W1     | SuperAdmin (Fayaz M)         | 1283664350 | ABORTED (click no-op)    | 0/0/14               | 1                                 |
| W2     | HR Admin→HR Manager fallback | 1283664351 | PARTIAL                  | data-driven          | 3+                                |
| W3     | HR Admin→Recruitment Admin   | 1283664352 | PARTIAL (session kicked) | 4/0/6                | 3                                 |
| W4     | HR Manager                   | 1283664353 | ABORTED                  | 0/0/7                | 0                                 |
| W5     | Employee (Saran V)           | 1283664354 | ABORTED                  | 0/0/?                | 0                                 |
| W6     | Employee                     | 1283664355 | PARTIAL (poisoned)       | data-driven          | ≥1                                |
| W7     | Employee RBAC negatives      | 1283664356 | PARTIAL (identity flip)  | 1/0/—                | 1 (BUG-W7-01 infra)               |
| W8     | SuperAdmin workflows         | 1283664357 | PARTIAL                  | data-driven          | ≥4                                |
| W9     | Team Lead approvals          | 1283664358 | PARTIAL                  | 1/2/1                | 2                                 |
| W10    | Known-bug verification       | 1283664359 | RAN                      | per-bug verdicts     | 6 FIXED / 3 OPEN / 3 CANNOT_REPRO |

---

## Critical Findings

### P0 / Infra

- **BUG-W7-01** Chrome-MCP single-profile cookie-jar collision — blocks parallel multi-role testing.
  **FIXED at skill-doc layer** (role-pass serialization). No code change.

### P1

- **BUG-W3-02** `POST /api/v1/auth/refresh` returns 401 when the same demo user is logged in from a
  second tab → Tab A gets kicked to `/auth/login`. Likely expected refresh-token single-use behavior
  but needs verification / better UX (no error toast, silent redirect).
  `backend/.../auth/controller/AuthController.java`.
- **BUG-W8-01** Wiki action buttons non-functional on Fluence shard (per W8 findings).
- **BUG-W8-02** Expenses page renders empty-main (no data, no empty-state copy).
- **BUG-W8-04** API timeouts (>10s) on >1 endpoint during workflow GIF capture.
- **BUG-W2-01/02/03** 404s + Access Denied on HR Admin→HR Manager fallback paths.

### P2

- **BUG-W1-01** Fayaz M demo card click on tab 1283664350 didn't fire `/api/v1/auth/login` POST (
  possibly the cookie-jar race — could not repro in isolation). `frontend/app/auth/login/page.tsx`.
- **BUG-W3-01** Demo Login Panel has no `HR Admin` card. 8 cards shown: SUPER ADMIN, MANAGER, 3×TEAM
  LEAD, EMPLOYEE, HR MANAGER, RECRUITMENT ADMIN. Docs reference HR Admin as a distinct role.
  Product-level doc vs. demo mismatch.
- **BUG-W9-01** `/approvals/history` route missing (404). Frontend page not built; API likely
  exists.
- **BUG-W9-02** `/approvals/delegations` route missing (404). API exists per W9.

---

## RBAC Matrix

**NOT VALIDATED this run.** Cookie-jar collision invalidates cross-role observations.
Re-run under the new role-pass model to produce a reliable matrix.

---

## Known Bug Status (W10 — verified in isolated known-bug pass)

| Count | Verdict                                     |
|-------|---------------------------------------------|
| 6     | FIXED (no longer reproduces)                |
| 3     | STILL_OPEN (confirmed)                      |
| 3     | CANNOT_REPRO (needs more context or closed) |

See `workers/w10/report.json` for the F-03…F-09 per-ID verdict detail.

---

## Lifecycle Scenarios

**NOT COMPLETED.** 11 lifecycles were planned; none finished cleanly under harness defect.
Queue for re-run.

---

## Attachments

- `workers/w{1..10}/report.json` — per-worker raw output
- `workers/w{1..10}/findings.jsonl` — streamed findings (where written)
- `bugs.jsonl` — flock-appended streaming bug queue (5 entries; most bugs also live in per-worker
  `bugs[]`)
- No screenshots/gifs centralized this run (workers aborted before evidence collection)
- `../../UNCOMMITTED-CHANGES.md` — (none; no fixer dispatch)

---

## Next Steps

1. Re-run this skill — it now serializes logins. Target wall-time ~30 min (6 role passes × ~5 min
   each).
2. Triage the P1 bugs above independently of the re-run (especially BUG-W3-02 refresh UX).
3. Decide product intent: should `HR Admin` be a demo-login card, or is the role being retired?
