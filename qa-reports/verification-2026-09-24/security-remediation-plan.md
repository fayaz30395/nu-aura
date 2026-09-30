# Security Remediation Plan — Credential Exposure (2026-09-24)

Planning and prevention only. Nothing in this document has been executed: no credential was
rotated, tested, or revoked; no git history was rewritten; no secret value is printed anywhere
below (config keys, file paths, and key-type prefixes only).

Builds on `docs/release-readiness/SECURITY.md` (A4 / A4-followup / A4-followup-2, 2026-09-22),
which already prepared the history-purge command and the blast-radius walk for the two secrets
it covered (Groq key, `.env`@`24a6c4c7`). Note: I could not find a decision record literally
named `DC-2G4FXS4TT3VY` anywhere in the repo (`grep -r` across tracked files, empty result) —
`docs/release-readiness/SECURITY.md` is the closest and only matching artifact, so this plan
treats it as that prior decision and extends it to the fuller 7-credential / 2-incident scope
from this session's audit.

---

## 1. Rotation runbook, ordered by blast radius

Order = safest/most-isolated first, sharpest/most-disruptive last. Do NOT batch these — rotate
and verify one at a time, in this order, so a mistake on item 7 doesn't compound with an
in-flight rotation of item 1.

### 1. Groq-format `OPENAI_API_KEY` (Incident A — `backend/start-backend.sh`, commit `83f70807`)
- **Consumed at**: `application.yml` → `${OPENAI_API_KEY:}` (empty default). Backend calls an
  OpenAI-compatible endpoint with a Groq `base-url` override — see `EncryptedStringConverter`-
  adjacent AI config, not the encryption path.
- **Who reads it**: Railway backend env only. Not read by frontend, not read locally unless a
  developer's shell exports it.
- **Rotate**: generate a new key at console.groq.com, revoke the old one, set the new value as
  `OPENAI_API_KEY` in Railway's service variables, redeploy.
- **What breaks during rotation**: nothing user-facing. Whatever AI-assist feature calls this
  key returns errors for the ~seconds-to-minutes between revoking the old key and Railway
  picking up the new one. No session invalidation, no data risk.
- **Sequencing**: safe to do first, any time, zero coordination needed.

### 2. `MINIO_ROOT_PASSWORD`
- **Consumed at**: not found in any tracked `application*.yml`, Java source, or shell script in
  this repo (`grep -rn MINIO` across `.yml/.java/.sh`, repo-wide, zero hits outside the leaked
  `.env`). Either MinIO was a short-lived local-dev experiment that was never wired into the
  deployed stack, or it's referenced from an untracked/external compose file this session
  doesn't have visibility into.
- **Action before rotating**: confirm with the operator whether a MinIO instance is actually
  running anywhere (Railway add-on, local Docker, elsewhere). If none exists, this credential is
  dead — rotation is a no-op; just confirm no service consumes it, then treat it as closed. If
  one does exist, rotate its root password via the MinIO console/`mc admin user` and update
  wherever it's actually consumed (not discoverable from this repo).
- **What breaks**: unknown until the operator confirms a live instance exists. If none exists,
  nothing breaks.

### 3. `NEON_JDBC_URL` / `NEON_DB_USERNAME` / `NEON_DB_PASSWORD`
- **Consumed at**: these are the Neon-specific names from the leaked `.env`; production actually
  reads the generic Spring names — see item 4 below, which is the credential that's live on
  Railway today. Treat this trio as the same underlying Neon Postgres credential, exposed under
  an alternate naming convention (likely from an earlier local-dev `.env` before the app
  standardized on `SPRING_DATASOURCE_*`).
- **Rotate**: in the Neon console, reset the database role's password (or rotate via
  `mcp__neon__reset_postgres_role_password` if this is done as a follow-up session — not run
  here per the no-rotation instruction). This invalidates the old password immediately.
- **What breaks during rotation**: any running backend instance holding the old password in
  memory loses its DB connection pool the moment the password changes, until it's restarted with
  the new value. **This is a hard outage window if sequenced wrong.**
- **Safe sequencing**: update the Railway env var (`SPRING_DATASOURCE_PASSWORD` — see item 4)
  to the new value FIRST, save without deploying if the platform allows staging the value, then
  rotate in Neon, then trigger the Railway redeploy immediately after. If Railway doesn't support
  staging an env var without an immediate restart, accept a short (~30-60s) connection-pool
  outage: rotate in Neon, then immediately push the new value + redeploy. Do this at low-traffic
  time.

### 4. `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`
- **Consumed at**: `backend/src/main/resources/application.yml:33-35` (`datasource.url` /
  `.username` / `.password`), and reused by Flyway at `application.yml:137-139`
  (`spring.flyway.url/user/password`, defaulting to the datasource values).
- **Who reads it**: Railway backend at runtime and at every Flyway migration-on-boot. Not
  read by the frontend. Locally, whatever `.env`/shell profile a developer points at their own
  Neon branch or local Postgres.
- **Rotate**: this is the SAME underlying Neon password as item 3 — rotate once in Neon, update
  this Railway variable (the one actually wired to the running app), redeploy. See item 3 for
  the outage-avoidance sequencing; it applies here, not to the `NEON_*`-named trio.
- **What breaks**: DB connection pool for every backend pod until redeploy completes; Flyway
  will also fail to run against the old password if a deploy is mid-migration when the password
  changes — avoid rotating during an in-flight deploy.

### 5. `JWT_SECRET` — sharpest low-risk item, but see explicit warning below
- **Consumed at**: `backend/src/main/java/com/nulogic/common/security/JwtTokenProvider.java`
  (`@Value("${app.jwt.secret}")`, HMAC-SHA256 signing/verification), validated at startup by
  `JwtSecretValidator`.
- **Who reads it**: Railway backend only, to sign and verify access/refresh tokens. Frontend
  never sees the secret — it only holds the resulting JWT in an httpOnly cookie.
- **CONFIRMED (code-read, `JwtTokenProvider.java`): this codebase supports exactly ONE signing
  key at a time.** `getSigningKey()` derives a single `SecretKey` from `app.jwt.secret` and both
  `signWith(...)` and every `verifyWith(...)` call use that same key — there is no secondary/
  previous-key list, no key ID (`kid`) claim, no grace-period verification path. **There is no
  dual-key option available today without a code change.**
- **What breaks**: rotating `JWT_SECRET` immediately invalidates every currently-issued access
  and refresh token, for every logged-in user, the moment the new secret is live. Every active
  session gets a 401 on its next request and must log in again. This is unavoidable with the
  current code — the only real choice is:
  - **Option A (recommended, immediate rotation + forced re-login)**: rotate now, accept that
    every user is logged out and must sign back in. Simple, no code change, matches "the secret
    may be compromised" urgency. Warn users/support ahead of the deploy if possible (a support
    ticket spike is likely right after).
  - **Option B (dual-key grace period)**: NOT available without implementing it. Would require
    adding a `kid`-tagged verification step that tries current-then-previous secret, is real
    engineering work (touches token issuance, verification, and `JwtSecretValidator`), and is
    unlikely to be worth building solely to soften one rotation event, given the leaked window
    dates from `d5961fef` (2026-03-23) forward and rotation status is already unknown/assume
    compromised. Recommendation: take Option A. Only build Option B if the team expects to
    rotate `JWT_SECRET` routinely going forward (e.g. on a schedule) rather than as an incident
    response.
- **Sequencing**: rotate LAST among the "just swap the env var" items, at a communicated
  maintenance window, since it's the one with guaranteed, unavoidable user-visible impact
  (universal logout). Coordinate with whoever owns user communication before flipping it.

### 6. `APP_SECURITY_ENCRYPTION_KEY` — highest risk item, see Section 2

Do not rotate this one using the "just swap the env var" pattern used above. See Section 2 — it
requires a re-encryption migration, not a simple swap, or it will make existing data
permanently unreadable.

---

## 2. `APP_SECURITY_ENCRYPTION_KEY` — encryption-at-rest risk (READ THIS BEFORE TOUCHING IT)

**Confirmed: yes, extensive data at rest is encrypted with this exact key, via AES-256-GCM
(`EncryptedStringConverter` / `CryptoConverter`, `backend/src/main/java/com/nulogic/common/`).**
Consumed at `application.yml:334-336` (`app.security.encryption.key`, empty default — startup
fails without it in prod via `ProductionReadinessValidator`) and `application-render.yml:197-199`
(hard-required, `:?` syntax — Railway boot fails outright without it).

**Code-confirmed: `EncryptedStringConverter` resolves exactly one active key at a time**
(`ENCRYPTION_KEY` or `APP_SECURITY_ENCRYPTION_KEY`, no fallback list, no key versioning in the
stored ciphertext format — storage is `Base64(IV):Base64(ciphertext+tag)`, nothing else). **If
you rotate this key by simply changing the env var and redeploying, every existing encrypted
column becomes permanently undecryptable** — the app will throw on every read of every affected
row (or, per the converter's legacy-plaintext fallback path, silently treat still-valid-looking
old ciphertext as opaque garbage — it does NOT know how to try a previous key).

**Affected tables/columns** (every field below is `@Convert(converter =
EncryptedStringConverter.class)` or `EncryptedLocalDateConverter`, confirmed by reading each
entity class):

| Entity / table | Encrypted fields |
|---|---|
| `employees` | `bankName`, `bankIfscCode`, + others tagged in `Employee.java` |
| `users` | MFA secret and other tagged fields in `User.java` (see `EncryptionBackfillService.backfillUserMfaSecrets`, targets `users.mfa_secret`) |
| `benefit_dependents` | `nationalId`, `passportNumber`, `phone`, `email`, `dateOfBirth` (via `EncryptedLocalDateConverter`), address, pre-existing-conditions flag |
| `benefit_claims` | `bankAccountNumber`, `ifscCode`, + more |
| `tax_declarations` | `previousEmployerName` + more |
| `employee_pf_records` | `uanNumber` + more |
| `employee_esi_records` | `esiNumber` + more |
| `preboarding_candidates` | `emergencyContactName`, `bankName`, `bankIfscCode` + more |
| `candidates` (recruitment) | tagged fields in `Candidate.java` |
| `payment_transactions` | `recipientAccountNumber` + more |
| `payment_config` | tagged fields (alongside a separate `apiKeyEncrypted` column — check whether that one uses the same converter or its own scheme before assuming it's covered) |
| `webhooks` | tagged config fields |
| `integration_connector_config` | tagged fields |

This is a large, PII/financial-data-heavy surface — bank account numbers, national IDs,
passport numbers, UAN/ESI statutory numbers, MFA secrets.

**The safe rotation procedure is a re-encryption migration, not an env-var swap:**

1. Deploy code that can decrypt with the OLD key and re-encrypt with a NEW key in the same pass
   (the repo already has the shape of this: `EncryptionBackfillService` currently does
   plaintext→encrypted backfill by loading each entity via JPA and calling `.save()`, which
   round-trips through the converter. The same pattern works for old-key→new-key, but the
   *converter* needs to accept two keys temporarily — one for decrypt-fallback, one for
   encrypt-going-forward — since today's converter only knows a single key).
2. Stage the new key alongside the old one (e.g. `APP_SECURITY_ENCRYPTION_KEY` = new,
   `APP_SECURITY_ENCRYPTION_KEY_PREVIOUS` = old, converter tries current key first, falls back
   to previous key on decrypt failure, always encrypts with current on write).
3. Run a backfill pass over every table in the list above (extending
   `EncryptionBackfillService`, which already has the query pattern: find rows, load entity,
   `.save()` to force re-encryption) until zero rows are on the old key.
4. Remove the previous-key fallback and the old key from environment once the backfill confirms
   100% migration (verify via the same "does the ciphertext blob decrypt with only the new key"
   check the backfill service uses to find legacy rows, adapted to check key version instead of
   plaintext-vs-encrypted).
5. Only after step 4 is confirmed clean should the old key be considered fully retired.

**This is a multi-day engineering task (converter change + backfill run + verification), not a
same-day operator action like the other 6 credentials.** If `APP_SECURITY_ENCRYPTION_KEY` is
confirmed compromised, the honest tradeoff is: rotating immediately without the backfill makes
all of the above data unreadable (a self-inflicted outage worse than the exposure); not rotating
leaves the data decryptable by anyone who has the leaked key. Recommend: rotate the other 6
credentials now (this session/next operator pass), track `APP_SECURITY_ENCRYPTION_KEY` rotation
as a tracked follow-up ticket with the dual-key converter change as its first deliverable, and in
the interim rely on the fact that decrypting the leaked value still requires database access
(the ciphertext) — i.e. the compromised key alone, without DB access, cannot yet read the data.
Treat this as a live open risk to flag to the operator explicitly, not something this plan can
close today.

---

## 3. History purge — assessment of the prepared `git filter-repo` plan

`docs/release-readiness/SECURITY.md`'s A4-followup-2 already did the blast-radius work
correctly: `24a6c4c7` and `83f70807` are ancestors of `main` on **both** remotes
(`fayaz-deen`, `fayaz30395`) and reachable from roughly **85 refs total** across both remotes
when including every `dependabot/*` branch (re-confirmed this pass: `git branch --all --contains
ede44ab0` → ~85 refs). The prepared command
(`git filter-repo --path .env --path backend/start-backend.sh --invert-paths --force`) is
correctly scoped to the two files that actually held secrets in those two commits.

**Assessment: the plan is correct as far as it goes, but incomplete on scope** — it only covers
Incident A (Groq key) and the `.env` add/delete pair for Incident B's *first* commit
(`24a6c4c7`). Incident B actually spans three commits (`24a6c4c7` → `d5961fef` → `8de12a5f` →
deleted at `ede44ab0`), each adding more secrets to the same `.env` file. A `--path .env
--invert-paths` rewrite removes the whole file's history in one pass regardless of which commit
added which line, so the path-based command is actually fine as scoped — it doesn't need
per-secret precision, just correct file paths, which it has.

**What a real purge requires**, beyond running the command locally:
1. Force-push rewritten `main` to **both** remotes.
2. Every one of the ~85 dependabot branches either gets closed/deleted (letting Dependabot
   regenerate them against the new history) or independently rebased — there is no clean way to
   rebase 85 branches by hand; closing and letting Dependabot recreate them is the only practical
   path.
3. Every collaborator with a local clone must re-clone (not `pull`/`rebase` — filter-repo
   produces genuinely different commit SHAs for the entire rewritten range).
4. Any open PR against an affected commit range breaks and needs re-creation.
5. GitHub caches unreferenced objects for a retention window, and any fork or PR ref (even from
   a closed PR) keeps the old blob reachable — full purge needs a GitHub support request on top
   of the force-push.
6. Both remotes' branch-protection rules (if any) need temporary disabling to accept the
   force-push, then re-enabling.

**Recommendation: rotate-only, skip the history rewrite.** Reasoning:
- Once the 6 straightforward credentials are rotated (Section 1) and
  `APP_SECURITY_ENCRYPTION_KEY` is rotated via the backfill path (Section 2), the leaked values
  are dead — reading them out of history no longer grants access to anything live. This is the
  standard industry position: rotation neutralizes exposure; history rewriting only reduces
  *visibility* of a credential that, if rotation is done properly, is already worthless.
  Purging history is warranted when a credential *can't* be rotated (e.g. a signing key baked
  into distributed artifacts) or when compliance explicitly requires scrubbing PII from history
  — the values exposed here are two service credentials, not customer PII, so that bar isn't met.
- The coordination cost is real and disproportionate: 85 refs across 2 remotes, every
  collaborator re-cloning, every dependabot branch regenerating, all for a benefit (hiding an
  already-rotated, already-dead credential value from `git log -p`) that doesn't change the
  security posture going forward.
- If audit/compliance later requires provable history scrubbing (e.g. a customer or regulator
  asks), the prepared command is ready to run at that point — keep it documented (it already is,
  in `docs/release-readiness/SECURITY.md`) rather than executing it speculatively now.

**Do rotation first, unconditionally. Only revisit history purge if a specific compliance/legal
requirement surfaces that rotation alone doesn't satisfy.**

---

## 4. Prevention — pre-commit secret-scanning guard (written this pass, NOT installed)

Checked for an existing hook framework first, per instruction: no `.pre-commit-config.yaml`
(Python `pre-commit` framework) exists in this repo. One local, uncommitted hook exists already
at `.git/hooks/pre-commit`, which only guards `docs/handoff/**` content
(`scripts/handoff/pre-commit-check.sh`) — unrelated to secrets, and itself not version-controlled
(hooks under `.git/hooks/` are never committed; there's no shared install mechanism in this repo
today).

**Written**: `scripts/security/pre-commit-secret-scan.sh` — a standalone, framework-agnostic
guard that:
- Blocks committing any `.env*` file outright (belt-and-suspenders on top of `.gitignore`, which
  only stops *untracked* files — this also stops `git add -f`).
- Prefers `gitleaks protect --staged` if the operator has it installed (recommended — far more
  secret-shape coverage than hand-rolled regex).
- Falls back to a small regex set matched against the staged diff when `gitleaks` isn't
  installed, covering the exact credential shapes this repo has actually leaked
  (`gsk_...`, `sk-...`, `AKIA...`, `JWT_SECRET=`/`APP_SECURITY_ENCRYPTION_KEY=`/
  `ENCRYPTION_KEY=` assignments, `SPRING_DATASOURCE_PASSWORD=`/`NEON_DB_PASSWORD=`/
  `MINIO_ROOT_PASSWORD=` assignments, and inline-password Postgres URLs).

**Not installed** — per instruction. To enable locally, an operator chains it into the existing
hook rather than replacing it, e.g. append to `.git/hooks/pre-commit`:

```bash
exec "$(git rev-parse --show-toplevel)/scripts/security/pre-commit-secret-scan.sh" || exit $?
```

before or after the existing handoff-guard `exec` line (both must run — use `&&` between them,
not a second unconditional `exec`, since `exec` replaces the process and never returns to run a
second command).

If the team later wants this enforced repo-wide (not just per-developer opt-in), the standard
path is: adopt the `pre-commit` framework (add `.pre-commit-config.yaml` with a `local` hook
entry pointing at this script, or a proper `gitleaks` hook entry), and document `pre-commit
install` as part of onboarding — that's a team decision, not made here.

---

## 5. Verification — how the operator proves rotation is complete

**Per credential, after rotating:**
1. **Groq/`OPENAI_API_KEY`**: in Railway's variable history/audit log, confirm the value changed
   and the deploy picked it up (check Railway deploy logs for a restart after the var change).
   In console.groq.com, confirm the old key shows as revoked (no longer listed as active).
2. **MINIO_ROOT_PASSWORD**: confirm with the operator whether any instance exists; if yes, follow
   MinIO's own admin-console/`mc admin user` confirmation. If no instance exists, confirm and
   document that it's dead — no further verification needed.
3. **Neon DB password** (covers both the `NEON_*` and `SPRING_DATASOURCE_*` entries — same
   credential): in the Neon console, confirm the role's password was reset (timestamp on the
   reset action). Confirm Railway's backend redeployed successfully after the var update (check
   deploy status = success, then hit a live health-check endpoint or confirm the app logs show a
   successful DB connection pool init with no auth errors).
4. **JWT_SECRET**: confirm `JwtSecretValidator`'s startup check passed (no boot failure — it
   would throw `IllegalStateException` on a weak/short secret, so a clean boot is partial proof
   the new value is well-formed). Confirm old sessions are actually invalidated: hit an
   authenticated endpoint with a token issued before rotation → expect 401. Confirm a fresh
   login issues a token that validates.
5. **APP_SECURITY_ENCRYPTION_KEY**: do NOT verify a completed rotation until the dual-key
   backfill (Section 2) has actually run and the verification query confirms zero rows still
   encrypted under the old key. Verifying "the app boots" is not sufficient proof here — it only
   proves `ProductionReadinessValidator`'s non-placeholder check passed, not that existing data
   is still readable.

**Confirming no secret has re-entered the tree** (do this regardless of which credentials were
rotated):
- `git log --all -p -- .env '**/.env' 2>/dev/null | grep -i <pattern>` style targeted pickaxe
  search (as the prior audit did) is a partial check, not exhaustive — recommend running an
  actual `gitleaks detect --source . --log-opts="--all"` (or `trufflehog git file://.`) as a
  one-time full-history scan, which neither this pass nor the 2026-09-22 audit executed (the
  prior audit explicitly flagged this as a recommended, not-yet-performed follow-up). This is the
  authoritative way to confirm no *other* undiscovered secret is sitting in history beyond the 7
  credentials already found.
- Going forward, `git status --short` before every commit plus the pre-commit guard in Section 4
  is the ongoing prevention layer — the guard only catches new commits, not what's already in
  history, so the one-time full scan above is still needed to close out this incident.

---

## Summary for operator

- **7 credentials, all UNKNOWN rotation status.** 6 rotate cleanly with standard operational
  care (sequencing matters most for the shared Neon DB password and for `JWT_SECRET`, which
  forces a universal logout by design — no dual-key option exists in this codebase today).
- **`APP_SECURITY_ENCRYPTION_KEY` is the outlier**: it protects a large PII/financial-data
  surface (bank details, national IDs, passports, UAN/ESI numbers, MFA secrets) via single-key
  AES-256-GCM with zero rotation support in the current converter. Rotating it via a plain
  env-var swap will make that data permanently unreadable. Safe rotation needs a converter change
  (dual-key decrypt-fallback) plus a re-encryption backfill (the repo already has the backfill
  *pattern* — `EncryptionBackfillService` — just not yet wired for key rotation, only for
  plaintext→encrypted migration). Treat as a tracked follow-up, not a same-day fix.
- **Recommendation: rotate, don't purge history.** The prepared `git filter-repo` command in
  `docs/release-readiness/SECURITY.md` is correctly scoped and ready if ever needed, but the
  ~85-ref/2-remote coordination cost isn't justified once rotation neutralizes the exposure —
  standard practice, not corner-cutting.
- **Prevention shipped**: `scripts/security/pre-commit-secret-scan.sh` (gitleaks-preferred,
  regex-fallback, blocks `.env` commits) — written, documented, deliberately not installed.
- **Open item this plan cannot close**: a full-history `gitleaks`/`trufflehog` scan has still
  never been run (flagged by the 2026-09-22 audit too) — recommended as the next concrete action
  to rule out any 8th credential neither audit has found yet.
