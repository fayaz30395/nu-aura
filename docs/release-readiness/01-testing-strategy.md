# NU-AURA Release-Readiness Audit 2026-11-15 — Shared Rules (all agents read this first)

Repo: /Users/fayaz.m/IdeaProjects/nulogic/nu-aura  | HEAD 568b6aa3 + ~686 uncommitted files (do NOT touch, stash, reset, or commit).
Question being answered: can NU-AURA safely replace paid Keka in production? Independent, evidence-based. Prior docs
(docs/release-readiness/{BASELINE,E2E,SECURITY,TENANCY-RLS,ABJ-CHECKPOINT}.md from 2026-09-22, MEMORY.md, docs/qa/*)
are LEADS, never proof. Re-verify live.

## Mode = AUDIT, not fix
- Do NOT edit business logic, security config, migrations, or committed source. Record defect + proposed fix only.
- Allowed writes: docs/release-readiness/** (your own files only), scratch under the session scratchpad, test
  scripts under docs/release-readiness/evidence/scripts/<your-agent>/ , and NUAURA_TEST_* synthetic data in the LOCAL dev DB.
- Never overwrite existing files in docs/release-readiness/ (BASELINE.md, E2E.md, SECURITY.md, TENANCY-RLS.md, ABJ-CHECKPOINT.md exist).
- Temporary local config changes: allowed only if isolated + logged in evidence/logs/config-changes.md + restored.

## Safety (hard)
- LOCAL ONLY: FE http://localhost:3000, BE http://localhost:8080. Do NOT probe/test any remote host (Vercel, Railway,
  Neon, prod URLs) — deployment items needing remote access = BLOCKED "needs explicit user authorization".
- Demo accounts only, from docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md (table ~line 100-120; shared demo password documented there).
  NEVER use real-owner accounts (fayaz.m@, sarankarthick.maran@ — see runbook rule 2). Do not invent accounts.
- Never print/log/commit secrets, passwords, tokens, cookies, encryption keys. Write [REDACTED]. Read .env / local-db.env only
  via sourcing in a subshell, never cat them. Evidence files must contain no secrets.
- No real email/SMS/bank/payment. No destructive ops (DROP/TRUNCATE/DELETE of non-NUAURA_TEST_ rows). Never disable RLS/auth.
- No Flyway as superuser for normal tests; no checksum edits. No `render` profile locally.
- All records you create: prefix `NUAURA_TEST_`. Log each in docs/release-readiness/evidence/test-data-<agent>.md.

## Shared environment (single shared stack — be a good neighbour)
- Stack already UP (BE actuator 503 only because `mail` DOWN = harmless; check `/actuator/health` components, DB/redis UP).
  If down: `~/.config/nu-aura/start-all.sh` (wait ~90s). Do NOT restart BE/FE unless it is dead; others are using it.
- Auth rate-limit is 5/min/login and lockout 5 attempts/15min. LOGIN ONCE per account, reuse cookies/storageState.
  NEVER brute-force or lock a real demo account. Brute-force/lockout tests: only against your own NUAURA_TEST_ user.
- CSRF double-submit: mutating calls need `X-XSRF-TOKEN` header = XSRF-TOKEN cookie value.
- Do NOT run `next build` in frontend/ while FE dev server is running (clobbers .next). Do NOT run `mvn clean`, and never
  `mvn compile/test` concurrently with another mvn. Backend jar target/hrms-backend-1.0.0.jar is live — do not rebuild it.
- psql: /opt/homebrew/opt/postgresql@16/bin/psql. DB hrms_dev @localhost:5432. App role `hrms_user` (creds via sourcing
  ~/.config/nu-aura/local-db.env in a subshell). Superuser `fayaz.m` = setup/inspection only, NEVER for isolation/RBAC proof.
- Docker/colima is DOWN -> Testcontainers tests = BLOCKED (do not sudo). Report exact count blocked.
- Browser: use headless Playwright (frontend has it; own script + own storageState + own output dir). Do NOT use the shared
  Chrome MCP. Viewports: 1440x900, 1280x800, 768x1024, 390x844. Capture console errors + failed requests.
- Parallel agents write different files; never edit another agent's file.

## Test IDs & evidence
IDs: NU-HRMS-E2E-nnn, NU-HIRE-E2E-nnn, NU-GROW-E2E-nnn, NU-FLUENCE-E2E-nnn, NU-PAY-nnn, NU-SEC-TENANT-nnn,
NU-SEC-RBAC-nnn, NU-SEC-GATE-nnn, NU-API-nnn, NU-BE-nnn (backend/auto tests), NU-FE-nnn, NU-UI-nnn, NU-OPS-PERF-nnn, NU-KEKA-nnn.
Status vocab: PASS (executed + evidence) | FAIL | BLOCKED (env/cred/access) | NOT TESTED | INCONCLUSIVE. Never turn BLOCKED/skipped into PASS.
Each agent produces:
1. Its results markdown (path given in brief) with a table: Test ID | Scenario | Steps actually run | Expected | Actual | Status | Evidence path | Severity | Repro.
2. `docs/release-readiness/evidence/matrix-<agent>.csv` columns: id,area,scenario,status,severity,evidence,defect_id
3. Defects in `docs/release-readiness/evidence/defects-<agent>.md`: DEF-<AGENT>-nn, severity (Critical/High/Medium/Low), root cause guess,
   affected files:lines, repro, proposed fix, effort. Critical = cross-tenant leak, authz bypass on payroll/PII, wrong pay math, data loss, auth bypass.
4. Raw proof: screenshots -> evidence/screenshots/<id>.png ; logs/HTTP transcripts -> evidence/logs/<id>.txt (secrets redacted).
Final reply to orchestrator: <=25 lines: counts (executed/pass/fail/blocked/not-tested), every Critical/High defect one line
with evidence path, what you could not test and why. No narrative. Don't pad.

## Method discipline
- Server-side authz proof = direct API call as the wrong user -> expect 403/404; UI hiding is not proof.
- A journey is PASS only if: UI action done -> UI result shown -> API response checked -> DB row verified (read-only SQL as app role
  where permitted). Page-load alone is never PASS.
- Reproduce every defect twice before logging it. Check against code (file:line) to separate real defect from test-setup error.
- Do not trust QA-count claims: re-check against current main (lesson from prior pilot: audit counts drifted 64->1, 476->20).
- Use grep/targeted reads; never dump big files. Keep tokens lean.
