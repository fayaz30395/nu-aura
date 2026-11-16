# Local load test (Part B) - 2026-11-15

Run after the browser E2E finished. Local dev profile, 1 backend instance (-Xmx1536m), Postgres 16 and Redis on the same machine, Hikari max 40. Script `evidence/scripts/e2e/pb_load.mjs`; raw numbers `evidence/logs/NU-OPS-PERF-load-results.json`.

## Method
- 5 pre-logged-in sessions (arun EMPLOYEE, sumit MANAGER, admin HR_ADMIN, tenant.admin, suresh RECRUITMENT_ADMIN); cookies shared by the virtual users (user i uses session i mod 5). No login calls during the test (limit is 5/min).
- Closed loop with think time 125-375 ms per user (about 4 req/s per user). Not a saturation test.
- Mix, round-robin per user: `/auth/me`, `/self-service/dashboard`, `/leave-requests?page=0&size=20`, `/knowledge/wiki/pages?...size=20`, `/leave-balances/employee/{id}`, plus `/employees?page=0&size=20` for non-employee sessions. A preflight dropped endpoints a role gets 403 on (recruiter: wiki list, leave balances).
- 60 s per stage, 10 users then 25 users, 8 s pause. Abort rules: error rate >20% or DB/application health not UP. Neither triggered.
- Metrics from `/actuator/metrics` before, after, and peak (sampled every 5 s).

## Results
| Users | Requests | Throughput | p50 | p95 | p99 | Max | Non-200 | 429 |
|---|---|---|---|---|---|---|---|---|
| 10 | 2,307 | 38.3 req/s | 9.6 ms | 18.0 ms | 22.3 ms | 31.6 ms | 0% | 0 |
| 25 | 5,817 | 96.4 req/s | 5.9 ms | 12.8 ms | 17.7 ms | 45.8 ms | 0% | 0 |

| Metric | 10 users before / after / peak | 25 users before / after / peak |
|---|---|---|
| Heap used (MB) | 356 / 353 / 362 | 354 / 236 / 379 |
| Hikari active | 0 / 0 / 2 | 0 / 1 / 3 |
| Hikari pending | 0 / 0 | 0 / 0 |
| Threads live | 71 / 70 | 70 / 70 |
| Process CPU % | 0.1 / 1.4 / 3.6 | 0 / 7.2 / 4.9 |

Proposed thresholds (not agreed targets): p95 < 500 ms, error rate < 1%. Both met with large margin at 25 users. p50 at 25 users is lower than at 10 only because the JIT and caches were warm after the first stage.

## Limits of this test
- Read-only, cheap, cached-friendly endpoints; no writes, no payroll run, no report or export, no PDF generation.
- Load generator and server share one machine; Redis rate limiter was in local mode and never throttled (about 2000 per window per user, header `x-rate-limit-remaining`).
- Small tenant (3-15 rows per list), so list endpoints are not exercised at real data size.
- 25 users with think time is about 100 req/s. It says nothing about 500 or 1000 concurrent users, which needs a data-heavy environment.
- Health: `/actuator/health` overall is DOWN only because `mail` is DOWN (known); db and application were UP before and after.
