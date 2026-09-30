# Nu-Aura — Deployment Checklist

Owners: RELEASE / HUMAN. A checked box is not proof; each item needs evidence.

## PRE-DEPLOYMENT

- [ ] Release candidate frozen (deterministic commit; working tree clean)
      Owner: ORCHESTRATOR · Status: FAIL (BLOCKER-005)
- [ ] Workflow integrity gate PASS (`node scripts/nu-aura-workflow-validate.mjs`)
      Owner: ORCHESTRATOR · Status: PASS
- [ ] Frontend: `npm run api:generate` → `npx tsc --noEmit` clean
      Owner: DEV · Status: NOT_RUN
- [ ] Frontend: `npm run lint` clean; `npm test -- --run` green; `npm run build` exit 0
      Owner: DEV · Status: NOT_RUN
- [ ] Backend: `./mvnw -q -DskipTests compile` exit 0
      Owner: DEV · Status: NOT_RUN
- [ ] Backend: `./mvnw test` green (unit + integration)
      Owner: QA · Status: NOT_RUN
- [ ] Migrations: V0→latest clean apply on Testcontainers PG16
      Owner: DATABASE · Status: NOT_RUN (BLOCKER-006)
- [ ] RBAC: forbidden cross-scope access 403 (26/26); legitimate access unaffected
      Owner: SECURITY/QA · Status: NOT_RUN (BLOCKER-001)
- [ ] Secrets: no secret introduced in RC; scan clean
      Owner: SECURITY · Status: NOT_RUN
- [ ] Credentials rotated (7 items; see security-review.md)
      Owner: HUMAN · Status: HUMAN_REQUIRED
- [ ] Prod DB `V316` checksum drift verified
      Owner: HUMAN · Status: BLOCKED (Railway auth)
- [ ] Backup taken (DB snapshot + release artifact)
      Owner: RELEASE · Status: NOT_RUN
- [ ] Env vars present in target (Vercel + backend host)
      Owner: RELEASE · Status: NOT_RUN

## DEPLOYMENT

- [ ] Deployment authorized
      Owner: HUMAN · Status: HUMAN_REQUIRED
- [ ] Frontend deployed (Vercel) and immutable build URL captured
- [ ] Backend deployed and started; Flyway applied cleanly (no failed migrations)

## POST-DEPLOYMENT

- [ ] Backend `/actuator/health` UP
- [ ] Auth: login + `/auth/me` 200
- [ ] Critical RBAC probe: 26/26 forbidden denials
- [ ] Smoke: employees, leave-requests, payroll list read
- [ ] Error rate / logs reviewed
- [ ] Session expiry + logout behavior verified

## ROLLBACK

- [ ] Application rollback target identified (previous good build)
- [ ] DB rollback limitations reviewed (`docs/release/rollback-plan.md`)
- [ ] Feature-flag rollback available where applicable
