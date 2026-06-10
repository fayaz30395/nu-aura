# B3 — Backend Hosting Setup (the last GO gate)

Two paths. **Path A (GKE)** uses the existing `deploy.yml` + helm + auto-staging pipeline (production-grade, also closes D-2). **Path B (Render)** uses `render.yaml` — fastest to a live URL for the beta.

CI just proved B3 is *purely* a credentials gap: the Deploy run failed at `Auth GCP` because `GCP_PROJECT_ID` is empty and no WIF/credentials secret exists. Nothing in the code or pipeline is wrong.

---

## Path A — GKE via existing `deploy.yml` (recommended for real staging→prod)

### A1. Close D-2 at the same time: Workload Identity Federation (keyless, no long-lived key)
```bash
# One-time GCP setup (run as a project owner)
PROJECT_ID=<your-gcp-project>; POOL=github-pool; PROVIDER=github-provider
REPO=fayaz30395/nu-aura
SA=hrms-deployer@${PROJECT_ID}.iam.gserviceaccount.com

gcloud iam workload-identity-pools create $POOL --location=global --project=$PROJECT_ID
gcloud iam workload-identity-pools providers create-oidc $PROVIDER \
  --location=global --workload-identity-pool=$POOL --project=$PROJECT_ID \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'"
gcloud iam service-accounts add-iam-policy-binding $SA --project=$PROJECT_ID \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}"
```

### A2. Set GitHub repo secrets/vars (Settings → Secrets and variables → Actions)
| Name | Kind | Value |
|---|---|---|
| `GCP_PROJECT_ID` | secret | your project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | secret | `projects/<num>/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | secret | `hrms-deployer@<project>.iam.gserviceaccount.com` |
| `GKE_CLUSTER`, `GKE_ZONE` | secret | your cluster/zone |
| Backend env secrets | secret | DB url/creds, JWT secret, Redis, Kafka, Google Drive creds (see `application-prod.yml` `${...}` vars) |

Then in `deploy.yml`, switch the `Auth GCP` step from `credentials_json: ${{ secrets.GCP_SA_KEY }}` to:
```yaml
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
```
(`id-token: write` permission is already present — that's the D-2 fix.)

### A3. Trigger
Re-run the failed Deploy workflow (or push). It builds images (now JDK21/Node20 pinned via D-1), pushes, `helm upgrade` to **staging**, smoke-tests `/actuator/health`. Prod stays manual-approval gated.

### A4. Prod profile gate (from HANDOVER-DEPLOY.md — enforce before prod)
- `SPRING_PROFILES_ACTIVE=prod`, `DEMO_CREDENTIALS_ENABLED=false`, Flyway ≥ V270
- `VIRUSSCAN_FAIL_OPEN=false` (already prod default), `COOKIE_USE_HOST_PREFIX=true` (already prod default)
- RLS role `nu_app_rls` (NOBYPASSRLS) provisioned; `RLS_PROBE_FAIL_ON_BYPASS=true` (already in Dockerfile)

---

## Path B — Render (fastest live URL for beta)

1. Render dashboard → New → Blueprint → point at `fayaz30395/nu-aura` → it reads `render.yaml` (backend web service + Postgres + Redis).
2. Set the backend env vars Render prompts for (`sync:false` ones): JWT secret, Google Drive creds, etc.
3. Deploy. Note the degraded-mode caveats (no Elasticsearch, schedulers off, 512MB, manual NOBYPASSRLS role swap) — fine for beta, not prod-equivalent.
4. Copy the live backend URL → `https://<svc>.onrender.com`.

---

## After EITHER path: wire the frontend (already built against an API URL)
```bash
# Vercel project hrms-frontend
vercel env add NEXT_PUBLIC_API_URL production   # -> https://<backend-host>/api/v1
vercel --prod                                   # redeploy FE against the live backend
```

## Then I can close the last gates
Once `/actuator/health` is UP on the hosted backend, hand me the URL and I'll run:
- `nu-chrome-super-e2e` cross-role lifecycle (SYS smoke first, 15s spacing for the 5/min auth cap)
- Perf p95 budgets on live journeys
→ which flips **Testing** and **Performance** from "static-only" to "live-verified" and moves the verdict toward **GO**.
