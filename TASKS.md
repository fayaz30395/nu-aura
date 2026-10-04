# NU-AURA → 100% — Controller TASKS (final state)

**Goal:** deployment-ready + live beta URL. **Status: CODE-GO, RELEASE-HUMAN-GATED.**
**Last updated:** 2026-10-04 · **HEAD:** `2e1dc11a`

## Done (all committed)

- [x] T-001 | P0 | FE prod build clean (290 pages, tsc exit 0)
- [x] T-002 | P0 | public frontend live (`hrms-frontend-vert.vercel.app`)
- [x] T-003 | P0 | backend `mvn verify` green (4724 tests)
- [x] T-004 | P0 | migrations V0→V341 apply clean on PG16
- [x] T-005 | P0 | RBAC code + 295-test battery green
- [x] T-006 | P1 | reusable release workflow + 18 runbooks
- [x] T-007 | P1 | bulk payroll built (was last feature stub) — `b03d716b`
- [x] T-008 | P1 | +42 backend unit tests — `2e1dc11a`
- [x] T-009 | P1 | e2e skip triage (65 classified) + esign mock-route fix

## Blocked — HUMAN (the only remaining items)

- [ ] H-1 | P0 | rotate 7 exposed secrets; dual-key migration for `APP_SECURITY_ENCRYPTION_KEY` (BLOCKER-002)
- [ ] H-2 | P1 | host backend + supply deploy creds + `NEXT_PUBLIC_API_URL` (BLOCKER-003)
- [ ] H-3 | P1 | `railway login` → verify prod V316 checksum (BLOCKER-007)
- [ ] H-4 | CRIT | neutralize demo logins in prod (SEC-3b)

## Optional roadmap (decisions, not blockers)

- [ ] LinkedIn posts: wire or remove surface
- [ ] Resource pools: build `resource_pools` table + flip flag, or remove
- [ ] Project Gantt/calendar: roadmap build or remove

## Downstream (auto-unblocks after H-2)

- [ ] live RBAC 26/26 probe · NOBYPASSRLS proof · full browser E2E · un-skip 63 parked e2e tests
