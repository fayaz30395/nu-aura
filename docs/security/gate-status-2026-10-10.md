# Security gate status, 2026-10-10

**Release security gate: NOT_PASS.** Nothing in this document changes that. It stays NOT_PASS until every
condition in section 1 is evidenced. No credential was rotated and no deployment happened.

Status of this file: working draft for review, uncommitted. Facts marked *verified* were checked on
2026-10-10; everything else is stated as a claim or an unknown.

## Corrections, 2026-10-13

Original text above is kept as written. These corrections come from a read-only re-check at HEAD `e5e4e44f` plus the dirty working tree. No secret values are recorded here.

- **Rotation list is incomplete (sections 1 and 3).** Two more generations of committed `.env`
  values exist: `6b348f80` (`.env.production`, 2025-12-20) and `5840992c` (`config/.env.production`,
  2026-01-11). They hold a different DB password and a different `JWT_SECRET` from the `d5961fef`
  set, so both generations need rotation. `83f70807` (`backend/start-backend.sh`, 2026-03-16) holds a
  literal `gsk_` key as a shell default; revoke it at the provider (3.4). The claim that all values
  were committed in 3 commits is incomplete.
- **"7 unreviewed controllers" is stale (section 4).** Only 5 controllers carry no auth annotation,
  and all 5 are intentionally public: `AuthController`, `PaymentWebhookController`,
  `RootProbeController`, `PublicOfferController`, `PublicCareerController`. Per-record ownership gaps
  in Grow, LMS, OKR and 360 are real, but they come from the feature audits, not from this count.
- **Encryption key default (2a, related to 3.2).** `application-render.yml:199` is fail-fast at HEAD
  (`${APP_SECURITY_ENCRYPTION_KEY:?...}`). Literal defaults existed in history (`7c798c95`,
  2026-04-05; `ed55ba4f`, 2026-04-08). Confirming that Railway sets the variable is an ops check
  (names and lengths only). Key rotation is still not safe: on decrypt failure the converter returns a
  placeholder that a later save can write over the real value. Fix that before any rotation.
- **Flyway migrations (new blocker, not in this doc before).** Commit `6ffccf49` ("ADLC",
  2026-09-21) changed 36 migration files under `db/migration/` that were already applied. Checksum
  validation will fail on any DB that ran the old scripts. Do not use `repair` on prod. Restore each file
  byte-identical to `6ffccf49^` and carry the fixes as new forward migrations. `V337` has two versions:
  `a34dd47c` and `7d481ca3` (the latter is reachable from `main`). Check `flyway_schema_history` in each
  environment before choosing.

## 1. Conditions to leave NOT_PASS

| # | Condition | State |
|---|---|---|
| 1 | All seven credential rotations done and evidenced (section 3) | Open (human) |
| 2 | Encryption-key dual-key migration executed and spot-checked | Open (human, needs approval) |
| 3 | CI `Frontend / Security audit (npm)` gate green or formally excepted | Open (needs a policy decision) |
| 4 | CI `Container scan (Trivy)` actually runs and passes | Open (workflow bug, section 2) |
| 5 | Maven dependency vulnerability scanning exists and is clean or triaged | Open (not performed anywhere, section 4) |
| 6 | Secret scan covers git history, not only the last commit | Open (section 4) |
| 7 | Pre-commit secret hook wired on contributor machines | Open (human) |
| 8 | The 9 remaining npm findings carry a recorded decision (section 5) | Recorded, decision pending |

## 2. CI evidence for commit `b115351d` (verified)

Runs on both forks (`Fayaz-Deen/nu-aura`, `fayaz30395/nu-aura`) gave identical results.

| Workflow | Result | Detail | Caused by this session? |
|---|---|---|---|
| CI Pipeline / Backend | Pass | The previous push (`4d3d24e7`) failed in "Run Backend Tests"; this one passed | No regression |
| CI Pipeline / Frontend | **Fail** | Step `Security audit (npm)` runs `npm audit --audit-level=high --omit=dev`; 5 high findings remain (section 5). The previous push failed at the same step | No. Pre-existing; this session reduced 48 to 9 findings but the gate needs 0 high |
| CI Pipeline / Docker Build | Skipped | Depends on the frontend job | n/a |
| Security Scan / CodeQL Java | Pass | | |
| Security Scan / CodeQL JS/TS | Pass | | |
| Security Scan / gitleaks | Pass | Scans the last commit only (`--log-opts=-1`) | |
| Security Scan / Trivy | **Fail, never executed** | Step "Free disk space" runs `rm -rf /usr/local/lib/android` and gets `Permission denied`, exit 1, before any scan | No. Pre-existing workflow bug |
| agent-os | **Fail** | Test 33 asserts the main working tree is untouched, but the orchestrator writes `qa-reports/runs/*` (tracked `index.json` plus new run files) | No. Reproduced identically at the parent commit `bfbba0b7`; no green run in the last six |

No production deployment occurred. `deploy.yml` is `workflow_dispatch` only.

### CI on Batch 1 (`2e4f630c`, both forks, 2026-10-11)

Same outcome as the baseline, with no new failures: Backend, CodeQL (Java and JS/TS) and gitleaks pass; the
frontend `Security audit (npm)` step fails (the 5 known high findings); Trivy fails at "Free disk space"; Docker
Build is skipped. The backend job runs the real-Postgres tests, including the new payslip release-status suite.

**Coverage gap:** because the audit step fails first, the frontend job **skips ESLint, the TypeScript check, unit
tests and the production build** (verified step by step). CI therefore verifies no frontend code on this commit or
on earlier ones with the same failure; the frontend evidence for Batch 1 is local only. Reordering or isolating the
audit step is part of the separate, reviewed CI change, not done here.

## 3. Credential rotation checklist (nothing executed)

Context: `docs/security/security-review.md` section 1 records a committed root `.env` with
production-grade credentials in history (commits `d5961fef`, `8de12a5f`; values changed at `ede44ab0`),
reachable from about 85 refs across two remotes. `fayaz30395/nu-aura` is **public** (verified via the
API), so those historical values should be treated as world-readable. That makes this list urgent.

Suggested order: 3.3 and 3.1 first (direct access and token forgery), then 3.2 (needs the longest
preparation, start the prerequisites now), then the rest.

Common prerequisites for every item: a named owner holding the live credential, a maintenance window
announced to users, a verified recent backup or snapshot where data is involved, and a way to see
application logs during the change.

### 3.1 `JWT_SECRET` (HIGH)
- **Where it lives:** backend environment (Railway production service). Not verified here.
- **Impact:** all issued tokens become invalid, so every user is signed out. Sessions are httpOnly
  cookies, so no client change is needed.
- **Procedure:** generate a new random secret of at least 256 bits; set it in the backend env; redeploy
  or restart; confirm the old secret appears nowhere else (other environments, CI secrets).
- **Rollback:** restoring the old value restores availability but re-exposes the compromised secret.
  Use only as a short emergency step, then rotate again.
- **Verification:** fresh login succeeds; a token signed with the old secret is rejected (401); no
  auth errors spike in logs.

### 3.2 `APP_SECURITY_ENCRYPTION_KEY` (BLOCKING, do not rotate naively)
- **Impact if done wrongly:** all AES-256-GCM encrypted data becomes unreadable (employee bank and IFSC,
  `users.mfa_secret`, dependant national ID and passport, tax declarations, PF/ESI, payments,
  webhook and connector configuration).
- **State found in code (verified):** `EncryptedStringConverter` reads a previous key from
  `ENCRYPTION_KEY_PREVIOUS` / `APP_SECURITY_ENCRYPTION_KEY_PREVIOUS`, so read-side dual-key support
  exists. **Unknown:** whether a re-encrypt (rewrite) job exists and covers every encrypted column. The
  tracking story is `US-2G9V0TF3AXX2`.
- **Prerequisites:** column inventory of every converter use; full database snapshot restored and tested
  elsewhere; an idempotent, resumable rewrite job; a dry run on a copy of production data.
- **Procedure:** set the new key as primary and the old one as previous; run the rewrite; verify every
  column; only then drop the previous key.
- **Rollback:** keep the old key and the snapshot until verification is signed off. Before the rewrite
  completes, swapping keys back is safe; after it, restore requires the previous key.
- **Verification:** decrypt spot checks per column family; row counts unchanged; no `AEADBadTag`
  style errors in logs; application reads of bank details work.
- **Requires explicit approval before any step.**

### 3.3 Database credentials (`SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD`) (BLOCKING)
- **Impact:** brief reconnect; wrong ordering causes an outage.
- **Procedure:** create a new role with the same grants and `NOBYPASSRLS` (per the runtime-role pattern in
  `docker-compose.prod.yml`); update backend env; restart; confirm connections; revoke and drop the old
  role last. Flyway uses its own credentials (`FLYWAY_PASSWORD`), rotate those too.
- **Rollback:** keep the old role until the new one is verified, then revoke.
- **Verification:** application healthy; `pg_stat_activity` shows only the new role; old credentials
  rejected; RLS still enforced (the existing RLS tests are the check).

### 3.4 `OPENAI_API_KEY` (Groq) (MEDIUM)
- **Impact:** AI features fail until the new key is deployed.
- **Procedure:** issue a new key at the provider; update env; revoke the old key.
- **Rollback:** none needed; the old key must stay revoked.
- **Verification:** one live completion call succeeds; old key returns 401.

### 3.5 `GRAFANA_ADMIN_PASSWORD` (MEDIUM)
- **Procedure:** set a new admin password; update whichever secret store feeds Grafana.
- **Verification:** login works with the new password; the old one is rejected.
- **Rollback:** reset through the Grafana admin CLI.

### 3.6 `MINIO_ROOT_PASSWORD` (LOW)
- **Procedure:** the service is recorded as removed. Confirm it is gone, then delete the credential
  everywhere rather than rotating it. Open a decommission ticket.
- **Verification:** no running MinIO endpoint; no reference left in manifests, compose files or env.

### 3.7 Wire `scripts/security/pre-commit-secret-scan.sh` (MEDIUM)
- **Action:** chain it into each contributor's `.git/hooks/pre-commit` or the team hook manager. The
  existing hook already runs `scripts/handoff/pre-commit-check.sh`, so it must be chained, not replaced.
- **Verification:** a test commit containing a dummy secret is blocked on each machine.

## 4. Security scan coverage (what was and was not checked)

This section deliberately does not present one tool as a substitute for another.

### Performed this session (local)
| Check | Scope | What it can and cannot tell you |
|---|---|---|
| `npm audit --omit=dev` | Frontend production dependency tree | Known npm advisories only. Says nothing about Maven or code. |
| Pattern greps on the backend | Native-query concatenation, weak hash/random, command execution, unsafe XML/deserialization, open CORS, `csrf.disable` | A fixed pattern list. Not a SAST tool; misses anything outside the patterns. |
| Secret-shape grep over tracked files | Common key formats (AWS, GitHub, Slack, OpenAI-style, private keys) | Working tree only. Not history. Not a substitute for gitleaks. |
| Manual re-read of the 66 legacy scan findings | Current code at each location | Judgement, not tooling. One verdict ("localhost-only") was found wrong and fixed. |
| DB-backed tests | Payslip release gating on real Postgres 16 | Covers that change only. |

### Performed by CI (verified on `b115351d`)
CodeQL for Java and JavaScript/TypeScript (pass); gitleaks on the **last commit only** (pass);
`npm audit --audit-level=high` (fail); Trivy (never ran).

### Not covered
| Gap | Why it matters |
|---|---|
| **Maven dependency CVE scanning** | Nothing scans the backend dependency tree. `dependabot.yml` lists maven, npm, actions and docker, but **Dependabot alerts are disabled on both forks** (verified via the API). The only other route is the Trivy image scan, which never runs. `npm audit` does not cover this. |
| Secrets in git history | CI gitleaks scans one commit. The repo's own review documents historical credentials, and `fayaz30395/nu-aura` is public. |
| Container image scan | Trivy is CRITICAL-only and currently blocked before it starts. |
| IaC and config scan | Kubernetes manifests, `docker-compose*.yml`, workflows. Not scanned by anything seen. |
| Pinned actions | `aquasecurity/trivy-action@master` is unpinned. |
| Authorization coverage | Project notes say 171 of 178 controllers carry `@RequiresPermission`. The remaining 7 were not reviewed here. |
| DAST, penetration test, SBOM, licence scan | Not performed. |
| npm devDependencies | `--omit=dev` was used deliberately; build-time tooling is outside this view. |

Decision for later: whether to install Gitleaks, Semgrep and Trivy locally, and whether to enable
Dependabot alerts. No tool was installed.

## 5. Remaining production npm findings (9, after the Tiptap upgrade)

Decisions kept: Tailwind CSS 3.4.19 and ExcelJS 4.4.0 unchanged; no major upgrade, no downgrade.

| Package | Sev | Advisory | Exploitability | Status |
|---|---|---|---|---|
| braces | high | Stack exhaustion on deeply nested patterns (CVSS 7.5) | Low. Pattern input comes from build-time globs (Tailwind content config) and the dev watcher, not from requests | Accepted, pending decision; fix needs Tailwind 4 |
| micromatch | high | Via braces | Low, same path | As above |
| fast-glob | high | Via micromatch | Low, same path | As above |
| chokidar | high | Via braces | Low. File watching, dev time | As above |
| tailwindcss | high | Aggregate of the four above | Low. Build-time CSS generation; the dependency is declared as a production dependency but only runs at build | As above. Consider moving it to devDependencies, which would also clear the CI gate; not done, needs your decision |
| postcss-selector-parser | moderate | Quadratic selector parsing, CPU exhaustion | Low. Parses the project's own CSS at build time | Accepted |
| postcss-nested | moderate | Via the above | Low | Accepted |
| uuid | moderate | Missing buffer bounds check in v3/v5/v6 when `buf` is supplied (CVSS 7.5) | **Not exploitable here (verified).** The installed copy is 8.3.2 and ExcelJS calls only `uuidv4()` with no arguments (`cf-rule-ext-xform.js:43,77`) | Accepted |
| exceljs | moderate | Via uuid | Not exploitable, as above | Accepted; npm's suggested "fix" is a downgrade to 3.4.0 |

The CI gate (`--audit-level=high`) stays red because of the five high entries. Options for a later
decision, none applied: move `tailwindcss` to devDependencies (it is build-time), add a documented audit
exception, or schedule the Tailwind 4 migration.

## 6. Remediation update, 2026-10-14

Release gate: still NOT_PASS. Items below are changes in the working tree. Nothing is committed, pushed
or deployed, and no CI run has exercised the workflow edits.

Verified locally on the final tree: backend 5,281 tests, 0 failures, 2 skipped (Docker classes included,
Flyway runs on the restored migrations). Frontend `tsc`, lint, 2,607 tests and the production build pass.
`npm audit --audit-level=high --omit=dev` exits 0.

| Gate item | Change | Remaining |
|---|---|---|
| npm audit (section 5) | `tailwindcss` 3.4.19 moved to devDependencies. The Dockerfile build stage runs a full `npm ci`, the runner stage copies only the standalone output, and nothing imports Tailwind at runtime. | This reclassifies a build-time dependency. It does not patch braces, micromatch, fast-glob or chokidar, so a plain `npm audit` still lists them. Real fix: Tailwind 4. |
| CI skipped steps | The npm audit moved into its own required job `frontend-audit`. The Frontend job's lint, tsc, tests and build run independently. The Docker job needs the audit. | Not run in Actions. |
| Trivy never ran | The cleanup step uses `sudo`. `trivy-action` pinned to v0.36.0. New `dependency-scan` job: Trivy filesystem scan, CRITICAL fails the job. | Not run in Actions. First run of the pinned version may behave differently. |
| gitleaks scope | Scans the pushed or PR commit range instead of the last commit only. | Scheduled and manual runs scan full history and will fail on the known history secrets. No baseline file was added, on purpose. |
| Flyway checksums | 36 migrations restored byte-identical to their contents before commit 6ffccf49. A database built from the 2026-06-25 tree gives V316 checksum 921701256, the production value. The restored tree gives 0 mismatches across 306 migrations. The 36 current files gave 36 mismatches. Fresh-database comparison of current files against restored files showed matching schema and seed data on natural keys. | An operator must run `flyway validate` against a restored prod snapshot. V312 (two versions) and V337 (two versions) were not restored and need a prod checksum read. `migrate` on an existing database was not run. A proposed forward migration V342 was dropped because it would have tagged the 402 global permission rows with the demo tenant on prod. |
| Encryption key | `EncryptedStringConverter` now refuses to write `***DECRYPTION_FAILED***` or `***KEY_NOT_CONFIGURED***` over real data. | `EncryptedLocalDateConverter` can still overwrite ciphertext with NULL after a decrypt failure. Key rotation stays blocked: no rewrite job, no previous-key support in `EncryptionService` and `CryptoConverter`. |
| Application defects | Authorization and ownership fixes across attendance, leave, payroll, expenses, PSA, helpdesk, performance, recruitment, surveys, learning, travel, letters and exit settlements. CSRF skip list reduced to exact machine paths. Biometric punches bound to the key's device. SAML default role tenant-scoped. Public rate-limit bucket added and auth buckets keyed by IP. Slack signature check no longer fails open on non-prod profiles. ORDER BY injection in the approval inbox closed. Render profile no longer exposes Swagger. Login audit rows no longer fail on a null actor. Report exports are audited. | See the checklist below. |

Open and not changed:
- Credential rotation, including the three commits missing from the original list (`6b348f80`, `5840992c`,
  `83f70807`). Needs the operator.
- Secrets in public git history. Needs a history rewrite, which is not authorized.
- Maven CVE results. The new Trivy scan covers this once it runs.
- CAPTCHA on public forms (careers, offers, preboarding). Needs a provider decision.
- Render profile has no `server.forward-headers-strategy`. Needs a live check of Railway's forwarded headers.
- `SPRING_PROFILES_ACTIVE` defaults to `dev`.
- Slack body caching and DocuSign base64 signature format may reject valid callbacks (fail-closed).
- No server-side HTML sanitizer for stored rich text.
- Pending-approval lists and exit clearances still need scoping. Nine admin pages have no frontend route gate.

Hardening checklist (13 of 19 verified, from `.claude/security-checklist.json`):
fixed or passing: row level security, auth on every API route, hide admin pages, rate limiting, lock down
CORS, security headers, parameterized queries, check file upload types, log admin actions, debug mode off in
prod, private storage buckets, verify webhook signatures, Claude security review. Still open: stop IDOR bugs
(partial), never trust the frontend (partial), CAPTCHA on public forms (fail), HTTPS everywhere (partial),
sanitize user input (partial), update vulnerable packages (partial).
