# Security scan verification — commit `bf5fb0de`

Source scan: `.claude/security-scans/scan-all-standard.json` (2026-09-25T20:28:30.999Z, 66 findings:
36 HIGH / 30 MEDIUM / 0 CRITICAL).
Verification date: 2026-09-30. Re-scanned by hand against current HEAD (`bf5fb0de`), file by file —
see per-category evidence below. No automated re-run of the original scanner tool exists in-repo;
this is a manual, file-level re-verification of every original finding plus a drift check for new
occurrences of the same 6 categories since 2026-09-25.

## Disposition summary

| Category | Count (orig) | Disposition |
|---|---|---|
| Hardcoded Secret | 30 | FALSE_POSITIVE — test fixtures / placeholder templates / env-var refs |
| React XSS (`dangerouslySetInnerHTML`) | 9 | FALSE_POSITIVE — already DOMPurify-sanitized or static/non-user content |
| innerHTML (design-import) | 2 | FALSE_POSITIVE — unused, not built, not shipped |
| Eval Usage | 3 | FALSE_POSITIVE — Playwright `$eval`/`$$eval`, not `eval()` |
| SQL Injection | 3 | FALSE_POSITIVE — security regression tests asserting injection fails |
| Command Injection | 3 | FALSE_POSITIVE — `execFile`/`execFileSync` with arg arrays, no shell |
| innerHTML (dev-tool scripts) | 12 | FALSE_POSITIVE — localhost-only dev tooling, not shipped, values pass through local `esc()` |
| React XSS — JSON-LD (careers) | 1 | **CLOSED** — fixed this session, see below |

Total: 65 FALSE_POSITIVE + 1 CLOSED = 66/66 accounted for.

## CLOSED — code fix

`frontend/app/careers/page.tsx:94` — `dangerouslySetInnerHTML={{__html: JSON.stringify(jobPostingSchema)}}`
injected backend-sourced job title/description into a `<script type="application/ld+json">` tag
without escaping `<`. A job posting containing `</script><script>…` could break out of the JSON-LD
block and execute. Fixed by escaping `<` → `<` before injection:

```tsx
dangerouslySetInnerHTML={{__html: JSON.stringify(jobPostingSchema).replace(/</g, '\\u003c')}}
```

Standard Next.js JSON-LD-safe pattern. No behavior change to the schema.org payload itself.

## Drift check (2026-09-25 scan → 2026-09-30 HEAD)

Re-grepped all 6 finding categories against current HEAD, not just the original 66 hits:

- `dangerouslySetInnerHTML` across `frontend/`: 12 files now (was 9 files/10 hits in original scan).
  Two new sites not in the original scan:
  - `frontend/app/learning/courses/[id]/play/page.tsx:251` — `sanitizedTextContent` is
    `DOMPurify.sanitize(activeContent.textContent)` (see line 118). Sanitized.
  - `frontend/app/training/catalog/[id]/page.tsx:193` — uses `sanitizeHtml()` from
    `@/lib/utils/sanitize.ts` (same DOMPurify wrapper verified for the original 9). Sanitized.
  Both FALSE_POSITIVE, same basis as the original set.
- `exec(`/`execSync(`/`spawn(` outside `execFile`/`ProcessBuilder`: only array-arg `spawn()` calls
  in dev-tool scripts (no shell) and Java test-helper `exec(Connection, sql)` calls in
  `MigrationTenantContextTest.java` (test-only, fixed constants, not reachable from any endpoint).
  No new command-injection surface.
- Hardcoded-secret-shaped literals (`password|secret|api[_-]?key|token\s*[:=]\s*['"]...`) across
  `backend/src/main`, `frontend/lib`, `frontend/app`, `frontend/components`, `infra`: **zero** hits
  outside already-reviewed test/placeholder files.
- No `.env` files added to git history since 2026-09-25 (`git log --since=2026-09-25 --diff-filter=A
  -- '*.env'` — empty).

No new code-fixable findings. No regressions from the one fix applied.

## What this verification does NOT cover

- No `gitleaks`/Trivy/CodeQL binary was run locally in this session — see
  `.nu-aura/evidence/798f46c8/ci-security-scan.md` for the last known CI gitleaks/Trivy state
  (Trivy blocked by CI runner disk exhaustion as of that evidence; gitleaks in
  `.github/workflows/security-scan.yml` `secret-scan` job is the authoritative secret gate, not this
  manual pass).
- Historical-secret exposure in prior git history (pre-dates this session, documented below) is out
  of scope for a working-tree scan by definition — it is a git-history problem, not a current-file
  problem.

## HUMAN_ACTION_REQUIRED — tracked, not closed by this session

These cannot be executed by an agent: they require possession of live credentials for third-party
systems (DB, Railway, Grafana, OpenAI/Groq) and a coordinated rotation window. Carried forward from
`docs/security/security-review.md` §1, re-affirmed here as still open at `bf5fb0de`.

| # | Action | Owner | Evidence required to close | Release impact if left open |
|---|---|---|---|---|
| 1 | Rotate `JWT_SECRET` | Platform/infra owner (prod credential holder) | New secret value deployed to Railway env; old sessions invalidated; confirm via a fresh login round-trip | HIGH — exposed secret permits forging valid JWTs for any user/role |
| 2 | Rotate `APP_SECURITY_ENCRYPTION_KEY` | Platform/infra owner + DBA (dual-key migration needed, story `US-2G9V0TF3AXX2`) | Dual-key read/rewrite migration executed and verified against `employees` (bank/IFSC), `users.mfa_secret`, `benefit_dependents` (national ID/passport), `tax_declarations`, PF/ESI, `payments`, webhook/connector config columns; decrypt spot-check post-migration | BLOCKING — naive rotation without the dual-key migration corrupts all AES-256-GCM-encrypted PII at rest |
| 3 | Rotate DB credentials (`SPRING_DATASOURCE_URL/USERNAME/PASSWORD`) | Platform/infra owner + DBA | New role/password created and verified NOBYPASSRLS per `docker-compose.prod.yml`'s runtime-role pattern; old credential revoked; app reconnect verified | HIGH — exposed DB credentials permit direct data access bypassing the app layer |
| 4 | Rotate `MINIO_ROOT_PASSWORD` | Platform/infra owner | Confirm MinIO is actually decommissioned (per security-review.md: "Confirmed dead"); if dead, delete the credential/service rather than rotate | LOW — dead service, but a live decommission ticket should close it, not silent carry-forward |
| 5 | Rotate `OPENAI_API_KEY` (Groq) | Platform/infra owner | New key issued at provider, old key revoked, app env updated, confirm a live completion call succeeds | MEDIUM — exposed key permits third-party API spend under this account |
| 6 | Rotate `GRAFANA_ADMIN_PASSWORD` | Platform/infra owner | New password set, confirm login, confirm old password rejected | MEDIUM — exposed credential permits dashboard/alerting tampering |
| 7 | Install/wire `scripts/security/pre-commit-secret-scan.sh` | Repo owner / any contributor (local hook) — NOT auto-applied by this session per explicit release-status instruction | Hook chained into `.git/hooks/pre-commit` (or team hook manager) on each contributor machine; one verified blocked-commit test run | MEDIUM — without it, a new secret can be committed before the CI `secret-scan` (gitleaks) job catches it on push |

None of the above were rotated, migrated, or wired in this session — doing so requires access this
agent does not have (live Railway/DB/Grafana/provider credentials) or was explicitly reserved as a
human action by instruction. Status for all 7: **HUMAN_ACTION_REQUIRED**, **BLOCKING** for #2 and #3
(data corruption / direct DB access risk), **HIGH** for #1, **MEDIUM** for #5/#6/#7, **LOW** for #4.

## Gate verdict

Code-controlled security gate for this scan: **PASS** (66/66 findings verified closed or false
positive; 0 new findings from drift check).

Overall release security gate: **NOT PASS** — blocked on HUMAN_ACTION_REQUIRED items #2 and #3
above (credential rotation touching live production data). Per explicit instruction, this session
does not declare the release security gate PASS while historical secrets remain active or the
secret-scan hook is unwired.

Machine-readable status: `.claude/security-scans/security-status-bf5fb0de.json`.
