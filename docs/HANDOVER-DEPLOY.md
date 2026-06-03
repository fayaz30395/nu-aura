# NU-AURA — Deploy & Beta Handover

**Date:** 2026-06-04 · **Run by:** deployment-readiness controller (autonomous) · **Branch:** `main`

This is the single source of truth for the current beta-deploy state. It is written so any other
agent or engineer can pick up without context.

---

## 🟢 LIVE BETA URL (frontend)

**https://hrms-frontend-vert.vercel.app**

- Public (deployment protection removed), HTTP 200, serves the build from current `main` code.
- Vercel project: `hrms-frontend` (`prj_Q1rtegd2SHbO8RkdgvZqr8iz6NGW`, team `team_eJXPR56WDXnxRcvSaieqbjs4`), account `fayaz30395-1043`.
- Other prod aliases: `hrms-frontend-fayazs-projects-552c49fd.vercel.app`.

### Validated (UI smoke, headless browser, 2026-06-04)
- `/` → redirects unauthenticated users to `/auth/login` (route guard works).
- Login page renders fully: email + password, Remember me, Forgot password, SSO / Google / Microsoft.
- No runtime crash on interaction; page stays intact. Visual: dark-luxury theme, polished. Screenshot: `docs/audit/release-2026-06-04/live-login.png`.

---

## ⚠️ The one real gap: no public backend

The frontend is live but **login/data won't work end-to-end until a backend is hosted.** This could
not be done autonomously in this environment — it needs credentials/dashboard access not present here:

| Path | Blocker in this env | What's needed |
|---|---|---|
| Render (intended; `render.yaml` present) | Render.com not authenticated (the global `render` CLI is a different tool); blueprint connection unverifiable | Render dashboard → New + → Blueprint → pick `fayaz30395/nu-aura` → fill `sync:false` secrets |
| GitHub Actions deploy (`.github/workflows/deploy.yml` → GKE) | `GCP_PROJECT_ID`/WIF secrets, GitHub MCP has no `GITHUB_TOKEN` | Set repo secrets, then `workflow_dispatch` |
| Fly.io / Railway | no CLI auth | `fly launch` / `railway up` with login |

`nu-aura-backend.onrender.com` currently returns 404 → **not deployed**.

### One-step backend on Render (recommended — `render.yaml` already codifies it)
1. Render Dashboard → **New + → Blueprint** → select repo `fayaz30395/nu-aura` (reads `render.yaml`).
2. Fill dashboard secrets (`sync:false`): `JWT_SECRET`, `SPRING_DATASOURCE_USERNAME/PASSWORD`
   (the NOBYPASSRLS runtime role — see render.yaml RLS note), `GOOGLE_DRIVE_ROOT_FOLDER_ID`,
   `PROMETHEUS_SCRAPE_TOKEN`, `APP_SLACK_SIGNING_SECRET`; mount Google Drive `credentials.json` as a Secret File.
3. After backend is up at `https://nu-aura-backend.onrender.com`, set frontend env and redeploy:
   ```
   cd frontend
   vercel env add NEXT_PUBLIC_API_URL production   # value: https://nu-aura-backend.onrender.com/api/v1
   vercel --prod --yes
   ```
   (The frontend deployed here was already built against that intended API URL.)
4. Render free-tier caveats are real: no managed Elasticsearch (search degraded), 512MB heap
   (schedulers disabled via `APP_SCHEDULING_ENABLED=false`), and you must create a separate
   `NOBYPASSRLS` Postgres runtime role after first provision. See `render.yaml` header + `docs/runbooks/deployment.md`.

---

## Re-runnable workflow (for further E2E testing)

`scripts/release-e2e-workflow.sh` — one idempotent pipeline: FE gates → BE verify → Vercel deploy →
unprotect → live smoke.

```bash
./scripts/release-e2e-workflow.sh                 # full
STAGE=frontend ./scripts/release-e2e-workflow.sh  # tsc + lint + test + prod build
STAGE=backend  ./scripts/release-e2e-workflow.sh  # mvn -pl backend verify (Testcontainers)
STAGE=deploy   ./scripts/release-e2e-workflow.sh  # build + vercel --prod + disable protection
STAGE=smoke    ./scripts/release-e2e-workflow.sh  # curl + (RUN_PLAYWRIGHT=1) chromium smoke
```

Requirements: node, Java 21+ (`JAVA_HOME` defaults to local JDK 23), Docker (backend Testcontainers),
authenticated Vercel CLI.

---

## Environment facts (this machine, 2026-06-04)

- Vercel CLI: ✅ authed `fayaz30395-1043`. Token at `~/Library/Application Support/com.vercel.cli/auth.json`.
- Git push: ✅ SSH as `fayazsephora` (so push/CI works even though `gh` CLI tokens are invalid).
- GitHub MCP: ❌ no `GITHUB_TOKEN` → cannot connect. Use SSH git for repo ops.
- Docker: ✅ running. Maven 3.9.9 + JDK 23 present (no `mvnw` wrapper — use system `mvn`).
- No frontend demo mode → frontend needs a live backend for authenticated flows.

---

## Status vs. Definition of Done

See `DEPLOY_READINESS_REPORT.md` for the gate-by-gate verdict and `TASKS.md` for task tracking.
