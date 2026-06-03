# NU-AURA → 100% + Live Beta URL — Controller TASKS

**Goal:** Make NU-AURA deployment-ready and produce a usable beta URL, with UI validation,
run as one reusable workflow, fully documented for handover.

**Owner:** Deployment-readiness controller (Claude, Opus 4.8). Autonomous run — no approval gates.
**Started:** 2026-06-04

## Environment reality (discovered at session start)

| Capability | State | Consequence |
|---|---|---|
| Vercel CLI auth | ✅ `fayaz30395-1043`, project `hrms-frontend` linked | Frontend URL achievable |
| Live frontend | ⚠️ `hrms-frontend-…vercel.app` Ready but **HTTP 401** (deploy protection) | Must disable protection for beta |
| Live backend | ❌ `nu-aura-backend.onrender.com` → 404 (not deployed) | No public backend without creds |
| GitHub MCP | ❌ no `GITHUB_TOKEN` (can't connect) | Use SSH git instead |
| SSH git push | ✅ as `fayazsephora` | Push/CI works |
| Render CLI | ❌ global `render` is a different tool; no Render.com auth | Backend deploy needs dashboard |
| Docker | ⏳ starting | Local full-stack + P0 migration proof |
| build-kit 01–17 | ✅ present | Audit baseline exists |
| Today's audit | ✅ `docs/audit/release-2026-06-04/` (FE gates PASS) | P0 = migration-chain proof |

## Tasks

- [x] T-001 | P0 | DONE | frontend prod build clean — 228 pages (Next 16.2.7/webpack). Closes audit open item.
- [x] T-002 | P0 | DONE | public URL: https://hrms-frontend-vert.vercel.app (ssoProtection disabled → HTTP 200).
- [~] T-003 | P0 | PARTIAL | frontend live; local backend full-stack blocked (Testcontainers vs Docker 29 API). Documented.
- [~] T-004 | P0 | BLOCKED(env) | migration proof needs Testcontainers; bundled docker-java API 1.32 < engine min 1.44. Fix path in report.
- [x] T-005 | P0 | DONE | UI validation: /→/auth/login guard, login renders, no crash, screenshot live-login.png.
- [x] T-006 | P1 | DONE | scripts/release-e2e-workflow.sh (STAGE=frontend|backend|deploy|smoke|all).
- [x] T-007 | P1 | DONE | prior audit: SuperAdmin bypass intact, OWASP headers, no secrets in repo/build; 3241/3958 BE tests pass.
- [x] T-008 | P0 | DONE | DEPLOY_READINESS_REPORT.md + docs/HANDOVER-DEPLOY.md written; MEMORY updated.
- [x] T-009 | P1 | DONE | render.yaml validated; one-step Render backend + Vercel env wiring documented in HANDOVER.

## Follow-ups surfaced
- F-1 | P1 | 1 genuine unit failure: LeaveBalanceControllerTest.shouldGetLeaveBalancesForEmployeeByYear (1/3958).
- F-2 | P0-for-full-stack | host the backend (Render blueprint) → set Vercel NEXT_PUBLIC_API_URL → redeploy. See HANDOVER.
- F-3 | P2 | bump Testcontainers/docker-java so the suite runs on Docker Engine 29.x (or run on older engine).

## Status log
- 2026-06-04: Pre-flight; FE prod build green; fresh Vercel prod deploy + protection disabled → public URL live;
  UI validated; reusable workflow + reports + handover written; backend verify run (3958 tests, 716 env-errors
  from Docker-API mismatch, 1 real failure); migration live-proof blocked by Docker-engine-too-new (documented).
