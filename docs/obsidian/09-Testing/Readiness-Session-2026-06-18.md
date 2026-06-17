---
title: Readiness Session 2026-06-18
tags: [readiness, qa, security, a11y, attendance, timezone, go-no-go, audit]
---

# Readiness-Session-2026-06-18

> Part of the [[00-Home]] vault · Testing section. Companion: [[Ruflo-Autopilot-Hazard]],
> [[Security-Audit]], [[QA-Strategy]]. Evidence-based; SHAs/counts are point-in-time —
> `main` advanced rapidly during the session (see the autopilot note).

## Purpose

Record the outcome of the enterprise production-readiness program run on 2026-06-17→18:
the verdict, every fix landed, the security audit of an autonomously-committed change, and the
single remaining go-live BLOCKER with its exact manual remediation.

## Verdict

**NO-GO · readiness 58/100** (raw weighted ≈84.5, capped to 58 by one BLOCKER per the program's
scoring rules). The codebase is strong; the blocker is deploy-config, not code.

Baseline at audit time: HEAD `8fe7d79c`. A 31-agent, code-grounded swarm (every finding
adversarially re-verified) produced the verdict. Full report:
`qa-reports/readiness-2026-06-17/swarm-readiness-report.md`.

### Dimension scores

| Dimension | Score | Note |
|-----------|------:|------|
| Build health | 92 | both tiers green; CI needs `NEXT_PUBLIC_API_URL` injected (prebuild gate) |
| RBAC / Authorization | 90 | 1750 `@RequiresPermission` across 173/180 controllers + fail-closed RLS |
| Security (OWASP) | 88 | hardened; only material risk is the config-gated demo path (the BLOCKER) |
| Architecture | 88 | clean hexagonal backend (184 controllers) + App Router FE (285 routes) |
| UX | 85 | machine-enforced design system; god-component size the main liability |
| Core flows | 79 | auth/nav strong; attendance tz had 1 HIGH + MEDIUMs (now fixed) |
| Known findings | 72 | demo-creds BLOCKER + tz + RSC 503 (503 confirmed already fixed) |

## Fixes landed this session

| Commit | Severity | Fix | Verification |
|--------|----------|-----|--------------|
| `a0558f23` | HIGH | **Attendance tenant-zone tz** — see [[#Attendance timezone fix]] | mvn compile + tsc + eslint + next build 250/250 |
| `3222369e` | MEDIUM | **a11y label gate + 491 fixes** across 102 `app/` files (`jsx-a11y/label-has-associated-control` enabled) | eslint app + build |
| `4092c0dd` | MEDIUM | **a11y gate extended to `components/`** — 33 more violations in 16 files (the app/-scoped sweep missed them; `eslint .` covers all dirs) | `npm run lint` exit 0 repo-wide + build |
| (via `d29ec59a`) | MEDIUM | **safeUrl** on user-supplied hrefs (stored-`javascript:` XSS) | tsc + eslint |
| `e3882f55` | — | **mass-assignment**: `OrganizationController` → 5 request DTOs (autonomously committed; DTOs independently verified correct) | mvn compile |

### Attendance timezone fix

Contained correctness fix (chosen over a 39-file `TIMESTAMPTZ` storage migration — too risky to push
blind on prod `main` with no local backend tests). Tenant zone is resolved at compute/serialize time via
`TenantTimeService.zoneFor(tenantId)`:

- `AttendanceRecord` + `AttendanceTimeEntry`: zone-aware `checkOut(...,ZoneId)` /
  `calculateWorkDuration(ZoneId,...)` overloads — DST-correct instant math when a zone is supplied,
  identical wall-clock behavior when `null` (every existing caller untouched). The time-entry path is the
  live one (a standard check-in opens a REGULAR entry; record duration = sum of entry durations).
- `AttendanceRecordService`: wires `zoneFor(tenantId)` into the primary checkout + the overnight-shift
  check; resolves the `NUAURA-ATTENDANCE-DST` TODO.
- `SelfServiceDashboardResponse.todayCheckInTime`: `LocalDateTime` → `OffsetDateTime` (offset-bearing ISO
  fixes the live "working" timer skew on refresh); `todayCheckOutTime` left wall-clock (display-only).
- Frontend `attendance` + `me/attendance` pages drop client-local `getLocalDateTimeString()` from
  check-in/out payloads → backend stamps tenant TZ (single source of truth), unifying all 3 entry points.

Deferred (separately-tested follow-up): the literal `TIMESTAMPTZ` column migration — not required for
correctness once zone is resolved at runtime.

## Security audit of `d29ec59a` (autonomously committed)

Independent adversarial review of the autopilot's "fix(security)" commit:

- **Payment HMAC — SOUND.** Razorpay HMAC-SHA256, Stripe `t.payload`+300s tolerance, `MessageDigest.isEqual`
  constant-time, secret stored encrypted, verified pre-mutation on the webhook path.
- **PII encryption — SOUND.** Real AES-256-GCM, 96-bit IV/call, env key, fail-closed if key absent.
- **IDOR (`ContractService`) — SOUND.** `findByIdAndTenantId` enforces tenant scope → cross-tenant 404.
- **Mass-assignment — fixed.** `OrganizationController` now DTO-based (5 records, none expose id/tenantId;
  service forces tenant server-side); `LmsController` safe (`QuizManagementService` does `setId(null)` +
  `setTenantId`). Verified.
- **Demo-seed V295 — BROKEN on Railway.** See the BLOCKER below.

Follow-ups committed in `e3882f55`: `V298` (PII backfill sentinel), `V299` (re-apply demo neutralization),
`scripts/hotfix-neutralize-demo-admin.sql`. **`V298`/`V299` are unreviewed migrations** — review before any
Flyway-enabled environment (CI/Testcontainers) applies them.

## 🔴 Go-live BLOCKER — demo credentials live

`DEMO_CREDENTIALS_ENABLED=true` (backend) + `NEXT_PUBLIC_DEMO_MODE=true` (frontend) on the live deploy expose
a **public 1-request unauthenticated → SUPER_ADMIN** login (`tenant.admin@nulogic.io` / `Welcome@123`). The
code gate is correct and fail-closed; the defect is deploy state.

**Worse than an env flip:** the `V295` neutralization migration **cannot run on Railway** — the `render`
profile sets `spring.flyway.enabled: false` (`application-render.yml:110`), so the V291-seeded admin row is
still active. Flipping the env var alone does NOT neutralize the existing row.

**Remediation (manual, requires Railway DB + env access):**
1. Run `scripts/hotfix-neutralize-demo-admin.sql` directly against the Railway Postgres (does not need Flyway).
2. Set `DEMO_CREDENTIALS_ENABLED=false` (backend) and `NEXT_PUBLIC_DEMO_MODE=false` (frontend); redeploy/rebuild.
3. Verify: demo panel absent on `/auth/login`; `Welcome@123` no longer authenticates.

Until done, readiness stays capped at 60. See also [[Security-Audit]] deploy-gate checklist and
[[Production-Support]].

## Process hazard

The session ran concurrently with a runaway **ruflo autopilot** that repeatedly committed to `main` and
respawned after being killed — it authored several of the SHAs above and many more after. Treat all SHAs/
counts here as point-in-time. Full detail + how to stop it: [[Ruflo-Autopilot-Hazard]].
