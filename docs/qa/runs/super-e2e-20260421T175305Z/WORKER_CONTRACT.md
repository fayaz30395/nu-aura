# Super E2E Worker Contract (shared, read once)

RUN_DIR: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/runs/super-e2e-20260421T175305Z`

## Hard rules

1. Use ONLY your assigned tab_id. Never create, close, or switch tabs. Never call `tabs_create_mcp`.
2. NEVER click links that open native confirm/alert/prompt. NEVER click mailto/external links.
3. Before any click that might be destructive (Delete, Logout), skip it.
4. Auth rate limit: 5 logins/min. Stagger — sleep `${W_INDEX}*12` seconds before your FIRST
   navigate.
5. On every page:

- `navigate` → wait 1.5s for render
- `read_page` to verify DOM rendered (not blank/spinner)
- `read_console_messages` with pattern `"Error|Failed|403|500|Uncaught"`
- `read_network_requests` filter 4xx/5xx
- Screenshot → `workers/w{N}/screenshots/{slug}.png`
- Classify: PASS | PASS-EMPTY | FAIL

6. On each FAIL, append a JSON line to `$RUN_DIR/bugs.jsonl` via:
   ```
   flock $RUN_DIR/bugs.jsonl.lock -c 'echo "{...}" >> $RUN_DIR/bugs.jsonl'
   ```
   Schema:
   `{"bug_id":"BUG-W{N}-{n}","worker":"W{N}","tab_id":...,"severity":"P0|P1|P2|P3","category":"rbac|api|ui|regression|perf","title":"...","url":"...","endpoint":"...","http_status":...,"repro":["..."],"evidence":"workers/w{N}/screenshots/...","detected_at":"<iso>"}`
7. If login/page load fails 2× → mark shard FAILED, return early.
8. Final report: `$RUN_DIR/workers/w{N}/report.json` with schema:
   ```json
   {"worker":"W{N}","role":"...","tab_id":...,"started_at":"...","finished_at":"...",
    "pages":[{"url":"...","status":"PASS|PASS-EMPTY|FAIL","screenshot":"...","console_errors":[],"network_errors":[]}],
    "flows":[],"bugs":[],"summary":{"total":N,"pass":N,"fail":N,"skipped":N}}
   ```

## Credentials (CORRECTED — password is `Welcome@123` for all demo users)

- SuperAdmin: `fayaz@nulogic.io` / `Welcome@123`  ⚠ may be locked out for 15min after failed
  Password@123 attempts
- HR_ADMIN: `hradmin@nulogic.io` / `Welcome@123`
- HR_MANAGER: `hrmanager@nulogic.io` / `Welcome@123`
- TEAM_LEAD: `teamlead@nulogic.io` / `Welcome@123`
- EMPLOYEE: `sarankarthick.maran@nulogic.io` / `Welcome@123`

(If login fails with intended creds, try `fayaz@nulogic.io` as a fallback and note the fixture gap.)

## Login flow (each worker does this once on their tab)

1. Navigate → `http://localhost:3000/auth/login`
2. form_input email → your role email
3. form_input password → `Password@123`
4. Click "Sign in"
5. Wait for redirect to `/dashboard` (or assigned landing)
6. Screenshot → `workers/w{N}/screenshots/login.png`

## Known fixes active on this run (regression focus)

Backend is restarted with:

- `SecurityContext.hasRole()` shape-tolerant (both `SUPER_ADMIN` and `ROLE_SUPER_ADMIN`)
- Flyway V130 — EMPLOYEE granted HELPDESK:TICKET_VIEW/CREATE
- Flyway V138 — OKR composite indexes
- Cache bean `WORKFLOW_INBOX_COUNT` (30s TTL)
- `FluenceActivityController` — removed dual `@Transactional`
- `OkrService.attachKeyResults()` — batch key-results fetch
- `frontend/app/helpdesk/tickets/page.tsx` — real Link anchors
- `frontend/app/employees/page.tsx` — URL-backed pagination

Priority: verify these 8 fixes hold, plus discover new regressions.
