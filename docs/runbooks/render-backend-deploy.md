# Render Backend Deploy — Granular Step-by-Step

**Goal:** get the NU-AURA Spring Boot backend live on Render so the already-deployed Vercel
frontend (`https://hrms-frontend-vert.vercel.app`) works end-to-end.

**Verified pre-state (2026-06-09):**
- Frontend: live on Vercel (HTTP 200), built against `https://nu-aura-backend.onrender.com/api/v1`.
- Backend: NOT deployed (`nu-aura-backend.onrender.com` → 404).
- `main` @ `c105e0bd`: BUILD SUCCESS, 4029 tests pass, full Flyway V0→V271 chain applies cleanly
  (Testcontainers postgres:16). Safe to deploy.
- Security gate satisfied: `SPRING_PROFILES_ACTIVE=prod` (demo creds off), `V270` neutralizer present,
  `RLS_PROBE_FAIL_ON_BYPASS=true`.

**What the Blueprint (`render.yaml`) creates:** `nu-aura-postgres` (PG16), `nu-aura-redis`,
`nu-aura-backend` (Docker), and `nu-aura-frontend` (Docker — you'll suspend this; FE stays on Vercel).

**Time:** ~20–30 min (plus first build ~8–12 min).

---

## Storage: pick one before you start

The backend hard-requires Google Drive credentials under the `prod` profile **unless** you opt out.
Pick a path:

| Path | What you do | Tradeoff |
|------|-------------|----------|
| **A. Full Google Drive** (default) | Appendix A **all** steps + Secret File + folder id | File upload/download fully works |
| **B. Minimal JSON** (live now, files later) | Appendix A steps **1–3 only**; upload the JSON; skip folder share + `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Boots live; file up/download fail until you finish the folder setup. **Works on current `main`, no code merge.** |
| **C. No Google at all** | Set `APP_STORAGE_PROVIDER=none`; **skip every Google step** (no Secret File, no folder, no creds) | Boots live; document upload/download safely no-op. **Requires merging branch `feat/storage-disable-escape-hatch` to `main` first** (`render.yaml` already carries the var on that branch). |

> Why B works: the storage bean only checks *file-exists + JSON-parse* at boot and makes no Drive
> API call until an actual upload. A well-formed service-account JSON is enough to boot.
> Why C needs the merge: `render.yaml` auto-deploys `main`, so the escape-hatch commit must be on `main`.

If you choose **C**, in Step 3 set `APP_STORAGE_PROVIDER=none` and skip the Secret File +
`GOOGLE_DRIVE_*` vars and the whole of Appendix A.

---

## 0. Prerequisites — have these ready BEFORE you start

| # | Item | How to get it |
|---|------|---------------|
| 0.1 | Render.com account | render.com — free tier is fine. Verify email. |
| 0.2 | GitHub connected to Render | Render → Account Settings → connect the GitHub account that owns `fayaz30395/nu-aura`. |
| 0.3 | `psql` client locally | `brew install libpq && brew link --force libpq` (for the role-creation step). |
| 0.4 | Google service-account JSON (+ Drive folder for Path A) | **Path A/B only** — see **Appendix A**. Skip entirely for **Path C** (`APP_STORAGE_PROVIDER=none`). |
| 0.5 | (optional) Slack signing secret | Only if you use the Slack integration; otherwise use a throwaway value. |

---

## 1. Generate the app secrets (local, keep private)

Run locally; copy each value somewhere safe (a password manager, not a chat window):

```bash
openssl rand -base64 48     # → JWT_SECRET
openssl rand -hex 24        # → PROMETHEUS_SCRAPE_TOKEN
```

Also pick a strong password for the DB runtime role — call it `<RLS_PW>` below.

---

## 2. Apply the Render Blueprint

1. Render Dashboard → **New +** → **Blueprint**.
2. Pick repository **`fayaz30395/nu-aura`**. Render reads `render.yaml` from the repo root.
3. It will list 4 resources to create: `nu-aura-postgres`, `nu-aura-redis`, `nu-aura-backend`,
   `nu-aura-frontend`. Give the blueprint a name (e.g. `nu-aura`).
4. Render will prompt for the `sync: false` env vars — you **can leave the backend
   `SPRING_DATASOURCE_USERNAME/PASSWORD` blank for now** (set in Step 4). Fill the rest in Step 3.
5. Click **Apply**. Postgres + Redis start provisioning immediately. The backend's first build
   will start but is expected to **fail/again-retry** until Steps 3–4 are done — that's fine.

---

## 3. Fill the backend secrets

Open the **`nu-aura-backend`** service → **Environment**. Confirm/set:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | the `openssl rand -base64 48` output |
| `PROMETHEUS_SCRAPE_TOKEN` | the `openssl rand -hex 24` output |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | your Drive folder id (Appendix A) |
| `APP_SLACK_SIGNING_SECRET` | your Slack signing secret, or any non-empty throwaway |

Then add the Google credentials as a **Secret File** (Environment → Secret Files):
- **Filename / mount path:** `/etc/secrets/google-drive-credentials.json`
- **Contents:** paste the full service-account JSON from Appendix A.

> Already set by `render.yaml` (do not change): `SPRING_PROFILES_ACTIVE=prod`,
> `RLS_PROBE_FAIL_ON_BYPASS=true`, `APP_SCHEDULING_ENABLED=false`, `STORAGE_PROVIDER=google-drive`,
> `GOOGLE_DRIVE_CREDENTIALS_PATH=/etc/secrets/google-drive-credentials.json`, and the
> `FLYWAY_*` / `SPRING_DATASOURCE_URL` / `SPRING_REDIS_*` wiring.

---

## 4. Create the `nu_app_rls` runtime role (the critical RLS step)

The app refuses to start if its DB role can bypass RLS (`RLS_PROBE_FAIL_ON_BYPASS=true`). Render
gives one owner role that CAN bypass RLS, so you must create a separate non-bypass role. Migrations
`V179` (grants privileges) and `V254` (reasserts `NOBYPASSRLS`) only run **`IF EXISTS`**, so this
role MUST exist before the backend's first successful boot.

1. `nu-aura-postgres` → **Connect** → copy the **External Connection String** (`postgres://…`).
2. Connect as the owner and create the role:

```bash
psql "<EXTERNAL_CONNECTION_STRING>"
```
```sql
CREATE ROLE nu_app_rls LOGIN PASSWORD '<RLS_PW>' NOBYPASSRLS;
GRANT CONNECT ON DATABASE hrms TO nu_app_rls;
\q
```

That is the **only** manual grant you do — V179 handles table/sequence/function privileges and
`ALTER DEFAULT PRIVILEGES` for future tables during the Flyway run.

3. Back in **`nu-aura-backend` → Environment**, set:
   - `SPRING_DATASOURCE_USERNAME` = `nu_app_rls`
   - `SPRING_DATASOURCE_PASSWORD` = `<RLS_PW>`

---

## 5. Deploy & watch the logs

1. `nu-aura-backend` → **Manual Deploy → Deploy latest commit** (or it auto-deploys on save).
2. Watch **Logs** for this sequence (in order):
   - `Flyway … Successfully applied N migrations` (up to `V271`)
   - `V179: granted runtime privileges to nu_app_rls`
   - no RLS-probe failure
   - `Started …Application in N seconds`
3. Health check: `render.yaml` uses `healthCheckPath=/actuator/health/readiness`. Render marks the
   service **Live** once that returns 200.

> **First request after idle is slow (~50s).** The Dockerfile runs a socat proxy that returns a
> "starting" response during cold start — expected on free tier, not an error.

---

## 6. Suspend the duplicate Render frontend

You're keeping Vercel. Open **`nu-aura-frontend`** (Render) → **Settings → Suspend** so it doesn't
build/run. (Skip only if you intend to move the FE to Render.)

---

## 7. Verify (ping me here and I'll do this with you)

```bash
curl -s https://nu-aura-backend.onrender.com/actuator/health/readiness   # → {"status":"UP"}
curl -s -o /dev/null -w "%{http_code}\n" https://nu-aura-backend.onrender.com/api/v1   # not 404
```

I will also confirm: prod profile active, demo credentials disabled, and that
`hrms-frontend-vert.vercel.app` can authenticate against the live backend.

---

## 8. Connect the frontend

- If Render gave the backend exactly `https://nu-aura-backend.onrender.com`, the Vercel FE
  (already built against `…/api/v1`) works with **no change**.
- If the hostname differs:
  ```bash
  cd frontend
  vercel env rm NEXT_PUBLIC_API_URL production
  vercel env add NEXT_PUBLIC_API_URL production   # value: https://<your-backend>.onrender.com/api/v1
  vercel --prod
  ```

---

## Troubleshooting

| Symptom in logs | Cause | Fix |
|-----------------|-------|-----|
| `role nu_app_rls does not exist` | Step 4 skipped or ran after first boot | Run the `CREATE ROLE` SQL, then redeploy |
| App exits at startup citing RLS / `BYPASSRLS` | `SPRING_DATASOURCE_USERNAME` points at the owner | Point it at `nu_app_rls` (Step 4.3) |
| `FlywayException … checksum mismatch` | DB has partial/old migrations | Fresh DB: it's empty, so re-check you didn't run migrations manually; else reset the DB |
| Boot fails loading Google Drive | Secret File missing/wrong path | Confirm mount `/etc/secrets/google-drive-credentials.json` and folder id |
| Health stuck "starting" >2 min | Free-tier cold start or OOM | Check memory; `JAVA_TOOL_OPTIONS` caps heap; retry; consider paid instance |
| Login 401/“network error” from FE | FE pointing at wrong API URL | Step 8 — set `NEXT_PUBLIC_API_URL` and redeploy Vercel |

---

## Free-tier caveats (expected)
- Cold starts (~50s after idle). No managed Elasticsearch → search degraded. 512 MB heap.
  Schedulers disabled (`APP_SCHEDULING_ENABLED=false`). Postgres/Redis free plans have storage/row caps.

## Rollback
- Render → `nu-aura-backend` → **Deploys** → pick a previous successful deploy → **Rollback**.
- DB schema: Flyway is forward-only; for a bad migration restore from `scripts/db/backups/` (see
  `docs/runbooks/rollback.md`).

---

## Appendix A — Google Drive service account + folder

1. Google Cloud Console → create/select a project → **APIs & Services → Enable APIs** → enable
   **Google Drive API**.
2. **IAM & Admin → Service Accounts → Create** → name it (e.g. `nu-aura-storage`) → Done.
3. Open the service account → **Keys → Add key → JSON** → download. This JSON is the Secret File
   contents for Step 3.
4. In Google Drive, create a folder (e.g. `NU-AURA-Storage`) → **Share** it with the service
   account's email (`…@…iam.gserviceaccount.com`) as **Editor**.
5. Open the folder; the URL is `https://drive.google.com/drive/folders/<FOLDER_ID>` — that
   `<FOLDER_ID>` is `GOOGLE_DRIVE_ROOT_FOLDER_ID`.

> Shortcut if you want it live before wiring Drive: ask me to verify whether the backend can boot
> with local/disk storage instead of `google-drive`, and I'll check the code before you rely on it.
