# Quarterly DR Drill Checklist

## Purpose

A DR procedure that has not been executed end-to-end is theoretical. This checklist
operationalizes the quarterly drill that validates `disaster-recovery.md` against
reality. Output of each drill is a 1-page report and a set of action items.

Drills do not exist to prove the platform is bulletproof. They exist to find the
ways it isn't, in a controlled window, before a real event finds them for us.

---

## 1. Cadence

| Item              | Value                                          |
|-------------------|------------------------------------------------|
| Frequency         | Quarterly — first Wednesday of each quarter    |
| Window            | 09:00 – 17:00 IST                              |
| Environment       | Staging (mirrors prod schema, anonymized data) |
| Owner             | SRE on-call lead for the quarter               |
| Approver          | VP Engineering                                 |
| Calendar quarters | Q1 = Jan, Q2 = Apr, Q3 = Jul, Q4 = Oct         |

If the first Wednesday falls on a public holiday, slip to the next Wednesday.
Never skip a quarter. A skipped quarter is logged as a P1 process gap.

---

## 2. Pre-Drill (T-14 days)

- [ ] **T-14d** — SRE lead opens Linear ticket `DR-DRILL-<YYYY>-Q<n>` and assigns
  participants (IC, SRE, Backend lead, DBA, Comms lead).
- [ ] **T-14d** — Notify stakeholders: engineering all-hands Slack, leadership,
  customer success (so they can answer "did anything happen?" externally).
- [ ] **T-14d** — Confirm staging environment is at parity with prod
  (Helm chart version, Postgres schema, Redis config, Kafka topics).
- [ ] **T-7d** — Snapshot the staging Postgres branch — this is the "prod" we will
  destroy and recover during the drill.
- [ ] **T-7d** — Schedule the maintenance window on staging status page.
- [ ] **T-3d** — Distribute the drill scenario (section 3) and individual role cards.
  Participants should NOT see the scenario before this; surprise is part of the
  test, but participants need basic prep time.
- [ ] **T-1d** — Verify `neonctl`, `kubectl`, `helm`, `gsutil` access for all
  drill participants. Renew expired creds.
- [ ] **T-1d** — Verify the comms templates in `disaster-recovery.md` section 6 are
  current.

---

## 3. Test Scenarios (Rotate Quarterly)

One scenario per quarter. Rotate through the full set so every procedure in
`disaster-recovery.md` section 4 is drill-validated at least once per year.

| Quarter             | Scenario                                                     | Procedure validated |
|---------------------|--------------------------------------------------------------|---------------------|
| Q1                  | Primary Postgres loss — Neon PITR restore                    | DR §4.1             |
| Q2                  | Redis cluster total loss + cache warm-up                     | DR §4.2             |
| Q3                  | Cross-subsystem: Kafka + Elasticsearch lost simultaneously   | DR §4.3 + §4.4      |
| Q4                  | Tenant accidental hard-delete                                | DR §4.7             |
| (Annual, off-cycle) | Ransomware tabletop — discussion only, no destructive action | DR §4.6             |
| (When implemented)  | Full region failover to `asia-southeast1`                    | DR §5               |

**Scenario rules:**

- Run on staging only. Production is never the drill target.
- One scenario per drill. Mixing scenarios obscures what failed and why.
- The IC may inject one realistic complication mid-drill (e.g., "your DBA is
  unreachable" → pair must continue without them). Document the injection.
- Ransomware drills are tabletop only — we do not execute destructive containment
  actions in staging without explicit security-team approval.

---

## 4. Drill Day Execution

### Morning (09:00 – 12:00) — destructive action + recovery

- [ ] **09:00** — IC briefs the room. Read scenario aloud. Start the RTO clock.
- [ ] **09:15** — IC declares DR (mock). First status-page post within 15 min using
  the template from `disaster-recovery.md` §6.
- [ ] **09:30** — Execute the destructive action per the scenario (e.g., `DROP
      DATABASE staging_db` on the snapshotted branch, kill all Redis pods, etc.).
- [ ] **09:30 – 12:00** — Execute the recovery procedure from
  `disaster-recovery.md` section 4. Follow the runbook **exactly as written**.
  If the runbook is wrong or unclear, do not improvise — note the gap, then
  improvise. Both the gap and the fix go into the post-drill report.

### Afternoon (12:00 – 17:00) — validation + report

- [ ] **12:00 – 13:00** — Lunch break. Recovery should be complete or near-complete.
  If not, this itself is a finding.
- [ ] **13:00 – 15:00** — Run Tier-1 smoke tests against recovered staging:
  - [ ] Login flow (JWT issuance, refresh, blacklist behavior)
  - [ ] Tenant CRUD via API
  - [ ] Employee directory list + search (Postgres fallback OK if ES not yet ready)
  - [ ] Permissions check via `RolePermissionService`
  - [ ] At least one write that triggers a Kafka event end-to-end
  - [ ] Frontend home page loads, sidebar renders, no 5xx in browser console
- [ ] **15:00 – 16:00** — Validate success criteria (section 5).
- [ ] **16:00 – 17:00** — Write the 1-page report (template in section 6). File
  action items in Linear. Mark Linear drill ticket complete.

---

## 5. Success Criteria

A drill is **PASS** if all of:

- [ ] **RTO met** — recovered to Tier-1 health within 4 hours of declaration.
- [ ] **RPO met** — data loss measured against the destructive timestamp is
  ≤ 1 hour. Verified by row-count comparison on a representative table
  (`audit_log`, `tenant`, `user`).
- [ ] **All Tier-1 services pass smoke tests** within the drill window (see section
  4 afternoon checklist).
- [ ] **Comms cadence honored** — first status-page post within 15 min; hourly
  updates thereafter.
- [ ] **No undocumented improvisation** required. If the IC had to invent a step
  not in the runbook, the drill is conditional pass with a P0 action item to
  update the runbook.

A drill is **FAIL** if any of:

- RTO exceeded.
- RPO exceeded.
- A Tier-1 service did not return.
- Data corruption discovered post-recovery (rows lost beyond RPO budget, or
  silent integrity failure).

A fail is not a punishment — it is the most valuable outcome a drill can produce
short of a real incident. Document it without flinching.

---

## 6. Post-Drill Report Template

The output of every drill is exactly one page. Anything longer dilutes the action
items. File at `docs/postmortems/dr-drill-<YYYY>-Q<n>.md`.

```markdown
# DR Drill <YYYY>-Q<n> — <Scenario name>

**Date:** <YYYY-MM-DD>  **Window:** 09:00 – 17:00 IST  **IC:** <name>

## Scenario
<one paragraph — what we simulated and why>

## Result
- RTO: <actual> / 4h target — <met / missed by Xm>
- RPO: <actual> / 1h target — <met / missed by Xm>
- Tier-1 smoke tests: <X/Y passing>
- Overall: <PASS / CONDITIONAL PASS / FAIL>

## Timeline
| Time | Event |
|------|-------|
| 09:00 | Drill start |
| 09:15 | DR declared, status page posted |
| 09:30 | Destructive action: <what> |
| HH:MM | <key recovery milestone> |
| HH:MM | Tier-1 health restored |
| HH:MM | Smoke tests passed |

## What went well
- <2–4 bullets>

## What did not
- <2–4 bullets — be specific>

## Action items
| # | Item | Owner | Due | Priority |
|---|------|-------|-----|----------|
| 1 | <e.g., update DR §4.2 — Redis warm-up step missing for tenant config cache> | <name> | <date> | P0 |
| 2 | ... | ... | ... | ... |

## Runbook updates required
- <list of files in docs/runbooks/ that need edits — link the PRs once raised>
```

### Action item routing

- Every action item becomes a Linear ticket in the `Platform / SRE` project, tagged
  `dr-drill-<YYYY>-Q<n>`.
- P0 items: due before the next drill (i.e., within 90 days).
- P1 items: due within 6 months.
- P2 items: tracked but no hard date.
- Open P0 items from prior drills are reviewed at the start of the next drill.
  A drill cannot pass with unresolved P0 items from a previous drill.

---

## 7. Roles and Responsibilities

| Role                | Responsibility during drill                                              |
|---------------------|--------------------------------------------------------------------------|
| Incident Commander  | Declares mock DR, calls timeboxes, makes go/no-go calls, owns the report |
| SRE on-call lead    | Owns the drill ticket, environment setup, execution coordination         |
| Backend lead        | Executes backend-side recovery steps, smoke-test owner                   |
| DBA                 | Executes Postgres PITR commands, validates data integrity post-restore   |
| Comms lead          | Status-page posts on cadence, mock customer email if scenario requires   |
| Observer (rotating) | Junior engineer shadows IC — no execution role, learns the flow          |

The observer role is intentional. It is how we grow the next IC. Every drill must
have one.

---

## 8. Annual Review

Once per year (Q4 drill report), the SRE lead consolidates the four quarterly
reports into a 1-page annual DR posture summary for leadership:

- Coverage: which procedures in `disaster-recovery.md` were drill-validated this year.
- Trend: RTO/RPO actuals across the four quarters.
- Outstanding gaps: P0/P1 action items still open from any drill in the last 12 months.
- Recommended platform investments for the next year (e.g., cross-region failover
  build-out, automated PITR tooling).

This summary is the artifact that justifies — or doesn't — continued investment in
DR engineering. It belongs in the same conversation as the security audit and the
performance review.
