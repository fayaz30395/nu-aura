# 13 Deployment readiness (repo and config evidence only) - 2026-11-15

Agent `secgate`, IDs NU-SEC-GATE-1xx. HEAD `568b6aa3`. Scope: what the repository, config and local stack prove. Everything that needs a remote host
(Railway, Vercel, Neon, live TLS, platform env values, backups) is **BLOCKED: needs explicit user authorization**. Nothing remote was contacted.
Companion: `07-security-audit.md`, `evidence/defects-secgate.md`, `evidence/matrix-secgate.csv`.

## Verdict

**Not deployment-ready as configured.** Blockers are config and process items, not architecture: the Render/Railway blueprint defines none of the security-critical
variables, three of the five High defects sit in deploy config, backup/restore is documented but unevidenced, and the transactional outbox (the live event path) has no alert or replay.

## 1. Topology as evidenced by the repo

| Piece | Evidence | Note |
|---|---|---|
| Backend image | `backend/Dockerfile`: multi-stage, final `eclipse-temurin:21-jre-alpine`, `USER hrms` (:144), `HEALTHCHECK` on `/actuator/health/liveness` every 30 s (:148), `ENV SPRING_PROFILES_ACTIVE=render` (:151), `JAVA_OPTS` `-Xmx320m -XX:+UseSerialGC -XX:TieredStopAtLevel=1` (:156) | Heap and JIT tuned for a free tier. Re-size for real load (see NU-OPS-PERF). |
| Entry point | `render-entrypoint` runs Java on an internal port and a `socat` TCP proxy on `$PORT` that answers `503 Service starting` until liveness passes (:100-135) | Raw TCP proxy: the app always sees peer `127.0.0.1`; client IP must come from `X-Forwarded-For` (`trusted-proxy-hops`, default 1). Hop count unverified (DEF-08). |
| Backend host | Railway (per `MEMORY.md`); no `railway.json/toml` in repo; `deploy.yml` uses Railway CLI for staging and preproduction services | Production service config lives outside git. BLOCKED. |
| Blueprint | `render.yaml`: web plan `free`, keyvalue `free`, Postgres, `healthCheckPath: /actuator/health/readiness` (:51), FE `healthCheckPath: /` | Free plans: no SLA, DB expiry and no backups on Render free Postgres. Treat as demo only. |
| Frontend | Vercel; `frontend/vercel.json` = `{"fluid": true}` only; headers via `next.config.js` and `proxy.ts` | Vercel Git integration not connected (per `MEMORY.md`), so deploys are manual CLI. BLOCKED to confirm. |
| Other manifests | `infra/deployment/{helm,kubernetes,kyverno,cloudbuild.yaml,app.yaml}`, `docker-compose.prod.yml` (all required secrets use compose `:?`) | GKE path exists and uses `prod` profile; the live path is `render`. The two profiles differ materially (DEF-06). |

## 2. Profile and environment contract

- Default profile is `dev` when `SPRING_PROFILES_ACTIVE` is unset (`application.yml:17`). `dev` opens swagger, actuator metrics/prometheus/health details, turns demo credentials on, enables repair-on-migrate (DEF-11). Dockerfile and `render.yaml` pin `render`; Railway env unverified.
- `render.yaml` env list (lines 54-103) contains: profile, scheduling, RLS probe, JVM, Flyway and datasource creds, Redis, `PROMETHEUS_SCRAPE_TOKEN`, `APP_SLACK_SIGNING_SECRET`, `JWT_SECRET`, storage, Drive. It does **not** define `APP_SECURITY_ENCRYPTION_KEY` / `ENCRYPTION_KEY` (0 matches), `CORS`/`APP_CORS_ALLOWED_ORIGINS`, `CAPTCHA_ENABLED`/`RECAPTCHA_*`, `VIRUSSCAN_*`, `APP_TRUSTED_PROXY_HOPS`, `DEMO_CREDENTIALS_ENABLED`, SMTP, `SLACK_WEBHOOK_URL`. Consequences if an environment is provisioned only from this file: the render profile's `:?` placeholder becomes a public default key (DEF-02) and the converter columns fail closed (`KEY_NOT_CONFIGURED`, writes throw); captcha and AV are NoOp (DEF-06); CORS falls back to `https://hrms-frontend-vert.vercel.app` (`application-render.yml:222`).
- Required before go-live (names only): `SPRING_PROFILES_ACTIVE`, `JWT_SECRET` (validator needs 32+ chars and rejects weak words, `JwtSecretValidator.java`), `APP_SECURITY_ENCRYPTION_KEY` (and `ENCRYPTION_KEY` as the converter reads env only, 32-byte Base64), `CAPTCHA_ENABLED=true` + `RECAPTCHA_*`, `VIRUSSCAN_ENABLED=true` + ClamAV host, `APP_TRUSTED_PROXY_HOPS`, `CORS` origins for the custom domain, SMTP, `PROMETHEUS_SCRAPE_TOKEN`, `NEXT_PUBLIC_DEMO_MODE=false` at FE build (DEF-01).
- K8s secret template is an explicit `CHANGEME` placeholder (`infra/deployment/kubernetes/secrets.yaml`); `JwtSecretValidator` would refuse it at boot (good fail-closed).

## 3. Health checks (NU-SEC-GATE-102)

- Groups: render readiness `ping,db`, liveness `ping,diskSpace` threshold 10 MB (`application-render.yml:126-140`); prod readiness `ping,db,redis`, liveness `ping` only with a comment that diskSpace must not be in liveness (`application-prod.yml:160-173`). The render liveness includes disk (low risk with the 10 MB threshold).
- Local observation: overall `/actuator/health` returns **503 DOWN** whenever `mail` is DOWN (SMTP unconfigured), while the `liveness`/`readiness` groups stay UP. A platform check pointed at `/actuator/health` would flap or fail on an unconfigured mailer. Point Railway at `/actuator/health/readiness` (as `render.yaml` does) and keep SMTP configured.
- `/actuator/health` shows details only on `dev`; prod `never`, render `when-authorized` (authenticated callers).

## 4. TLS, headers, cookies (config only; live TLS BLOCKED)

Config: `forward-headers-strategy: framework` (render:146, prod:203), `app.cookie.secure: true` (render:199, prod:254), HSTS 1 year + subdomains (`SecurityConfig.java:154-158`, `SecurityHeadersFilter.java:64`), CSRF double-submit, `__Host-` cookie variant set alongside plain cookies. Observed locally: auth cookies `access_token` and `refresh_token` have `HttpOnly; SameSite=Lax` (Secure only on the `__Host-` pair; Secure is off for http local). Live certificate chain, HSTS header on the real hosts, redirect http->https, and DB `sslmode` on Neon/Railway: BLOCKED. The prod profile comments require `?sslmode=require` for Neon (`application-prod.yml:40`).

## 5. Monitoring and alerting (NU-SEC-GATE-103)

- `infra/monitoring/prometheus/rules/hrms-alerts.yml` (122 lines, 34 alerts): ApplicationDown, HighErrorRate, HighAuthFailureRate, HighFailedLoginRate, HighRateLimitExceeded, PayrollRunFailed, PayrollProcessingDelayed, ScheduledJobFailed, DatabaseConnectionPoolLow, RedisDown, HighMemoryUsage, WebhookCircuitBreakerOpen, Kafka lag/DLQ, and others. Alertmanager routes everything to Slack `#nu-aura-alerts`; the webhook URL is injected from `SLACK_WEBHOOK_URL` at start (`alertmanager.yml`), repeat interval 12 h.
- `/actuator/prometheus` is open only to SUPER_ADMIN or a bearer scrape token; the token defaults to empty in prod and render, which fails closed (scraper gets 403 until set) (`SecurityConfig.java:318-341`).
- Gaps: no alert for outbox FAILED rows or oldest PENDING age (DEF-14); Kafka alerts are irrelevant on Railway where Kafka is excluded; no evidence a Prometheus/Alertmanager/Grafana stack exists for the Railway deployment (the stack is compose/K8s). Railway-side log drains, uptime checks and paging: BLOCKED.

## 6. Migration path (NU-SEC-GATE-104)

- Flyway enabled on render (`FLYWAY_ENABLED:true`, `application-render.yml:111`); Flyway user is separate from the runtime user, and `RlsStartupProbe` refuses a BYPASSRLS runtime role when `RLS_PROBE_FAIL_ON_BYPASS` is true (`render.yaml:58,73`). Base config: `baseline-on-migrate`, baseline 18, `out-of-order: true` (`application.yml:108-112`); prod profile sets `out-of-order: false`, `repair-on-migrate: false`.
- Local DB: 331 history rows, head V341, all success (`flyway_schema_history`). A throwaway database accepted all 330 files in order with 0 SQL errors (`logs/NU-SEC-GATE-D1-scratch-migrate.txt`; psql, not Flyway, so no checksum or per-file transaction semantics).
- Per `MEMORY.md` prod head is V316; V317-V341 (25 migrations, including RLS rewrites V335/V341 and all-tenant data migrations V337/V340) are not yet applied there. Run them first against a restored prod snapshot. V298 and V301 are already applied on prod and carry DEF-03.
- Rollback is forward-fix only (runbook). There is no down-migration path; V298/V301 sentinels are one-way.

## 7. Outbox processor and stuck events (NU-SEC-GATE-105)

- Live event path on Railway (Kafka excluded in `application-render.yml:20-26`). `OutboxEventProcessor` polls every 5 s (`app.outbox.poll-interval-ms`), takes `FOR UPDATE SKIP LOCKED` per event in a `REQUIRES_NEW` transaction, `MAX_RETRIES = 5`, then status FAILED (`OutboxEventProcessor.java:44,91-130`). Because processing and row lock share one transaction there is no half-claimed "processing" state to reclaim.
- Local table: 2 rows, both PROCESSED (`logs/NU-SEC-GATE-DEP1-outbox-status.txt`). Unit test `OutboxEventProcessorTest` exists (not executed by me).
- Gaps (DEF-14): FAILED is terminal, there is no metric, alert or replay endpoint, and a mutual-exclusion guard against Kafka plus outbox exists but was not exercised. Needed: gauge of FAILED and oldest PENDING, alert, and an admin replay.

## 8. Backup and restore (NU-SEC-GATE-106)

- Documented objectives (runbook `docs/obsidian/10-Runbooks/Production-Support.md:135-145`): RPO 1 h (hourly WAL shipping), RTO 4 h, quarterly DR drill, DB rollbacks forward-fix only, single region.
- Evidence gap: the runbooks reference `backup-restore.md` and `dr-drill-checklist.md`; neither exists in the checkout (`find` returns nothing) and the runbook itself says those files are missing. No restore-test record. Railway/Neon backup configuration is not in the repo. Status: FAIL for evidence, BLOCKED to inspect the platform. Need: platform backup setting export, one timed restore into a scratch DB, and a documented Drive content backup.

## 9. Test results

| ID | Check | Status | Sev | Evidence |
|---|---|---|---|---|
| NU-SEC-GATE-100 | Outbox FAILED alert and replay | FAIL | Medium | DEF-SECGATE-14 |
| NU-SEC-GATE-101 | Remote checks (live TLS, headers, env, health, backups) | BLOCKED | - | needs authorization |
| NU-SEC-GATE-102 | Health check design and local behavior | PASS with note (use readiness path) | Low | `logs/NU-SEC-GATE-F02-actuator.txt`, config |
| NU-SEC-GATE-103 | Alert rules and routing present | PASS (config), gaps noted | Medium | `hrms-alerts.yml`, `alertmanager.yml` |
| NU-SEC-GATE-104 | Migration path (fresh apply, prod delta plan) | PASS fresh apply; prod snapshot rehearsal NOT TESTED | Medium | `logs/NU-SEC-GATE-D1` |
| NU-SEC-GATE-105 | Outbox retry, locking | PASS design; no alert | Medium | `OutboxEventProcessor.java` |
| NU-SEC-GATE-106 | Backup/restore evidence | FAIL (docs only, runbooks missing) | High | runbook, `find` |
| NU-SEC-GATE-107 | Blueprint defines security-critical env | FAIL | High | `render.yaml` (0 matches) -> DEF-SECGATE-02/06 |

## 10. Pre-go-live checklist (owner action)

1. Authorize or run: confirm Railway env for the variables in section 2; export prod DB `select email,status from users where status='ACTIVE' and password_hash in (<3 demo digests>)`; check live FE bundle for the demo password; confirm hop count.
2. Fix DEF-01..05 (all S to M except rotation).
3. Add `APP_SECURITY_ENCRYPTION_KEY`, captcha, AV, CORS, trusted-proxy, SMTP to the blueprint (names only, values in the platform secret store).
4. Rehearse V317-V341 on a prod snapshot; implement or remove V298/V301 sentinels first.
5. Evidence a restore: platform backup setting plus one timed restore.
6. Add outbox alert and replay.
