---
title: Keka Parity Roadmap
tags: [module, keka-parity, roadmap, planning]
summary: Sequenced delivery plan for the Keka gaps in Keka-Gap-Analysis, grouped into waves by dependency, with module owner, entry criteria and exit checks. Target shape is in Target-State-Architecture.html.
---

# Keka Parity Roadmap

> Plan only. Source of gaps: [[Keka-Gap-Analysis]]. Target shape: `01-Architecture/Target-State-Architecture.html`.
> Every item lands as a module inside the existing monolith (one API, one RLS database, one outbox). No new services.

## Rules for every wave

1. Re-verify the gap against `main` before coding. Agent "med" rows and `docs/pendings.md` have drifted before.
2. Migration version: run `git log --all --diff-filter=A -- '*V3*'` first. Release branches hold versions `main` lacks.
3. One reviewed change per gap. No bundled `openapi-snapshot.json` refresh.
4. Exit = tests green on a real DB (Testcontainers) plus the acceptance criteria in [[Keka-Gap-Analysis]].

## Wave 0: finish what is open

| Item | State | Blocker |
|---|---|---|
| P0-1 payslip release gating | Pushed (`2e4f630c`) | None |
| Payslip notification fix (`PAYSLIP_AVAILABLE` dedupe, `employee.getUser()` addressing) | Design only | Operator production pre-flight report. No migration or query approved. |
| Stale `Payslip` type in admin payslips page and `PayslipCard` | Open follow-up | None |

Exit: release gate moves off NOT_PASS.

## Wave 1: payroll money chain (serial)

Order matters. Each step reuses `PayrollRunService.applyPendingAdjustments` (`:515`).

| Step | Gap | Needs | Decision required |
|---|---|---|---|
| 1a | P0-3 arrears and supplementary pay | New `AdjustmentType`, consumed flag, own payslip line | PF/TDS treatment of arrears |
| 1b | P0-4 loan EMI through payroll | 1a adjustment type, loan status rules, idempotent balance reduction on reprocess | None |
| 1c | P0-2 bank advice file | Run `APPROVED`/`LOCKED`, bank details, missing-details report | **Bank file format** (product call) |

Exit: reprocessing a run never double-deducts or double-pays. Totals reconcile to the run.

## Wave 2: PSA integrity (parallel with Wave 1)

| Gap | Entry | Exit |
|---|---|---|
| P0-5 timesheet period lock | Lock model on period | Locked period rejects create, edit, delete |
| P0-5 submission reminders | Scheduler under ShedLock, notification type | Missing or unsubmitted timesheets notified before cutoff |

Then P1 PSA: rate-card entity, then profitability (margin from `costRate`), then milestone billing.

## Wave 3: P1 by user impact

| Order | Module | Items |
|---|---|---|
| 3a | NU-HRMS time and leave | Overtime bulk import, instant comp-off credit, break-punch regularisation |
| 3b | NU-Hire onboarding | Location and worker-type targeting, stage-offset triggers, candidate task reminders, upcoming-joiner page |
| 3c | NU-Grow | Goal templates and bulk assignment, reviewer stages, ratings from goal progress, wire succession-plan and OKR hierarchy pages |
| 3d | Platform | Audit log Excel export, org chart over 1000 employees, report export path, enable Keka import behind its flag |
| 3e | PSA | Resource requests with skill matching, max-billable cap, zero-rate gap report |

Check first: 360 peer nomination. `docs/pendings.md` says done, `agap-perf` found no employee endpoint.

## Wave 4: P2, only on a customer ask

Legal-entity model (multi-entity, paid add-on in Keka), PWA manifest, CTC simulator and pay equity, Candidate/Applicant model merge. SCIM stays out: no evidence Keka offers it. Attrition prediction stays out: Keka does not claim it.

## Open inputs needed

- Bank file format for 1c.
- Arrears statutory rule for 1a.
- Capterra and G2 review pass, still unread.
- `keka-analytics` research is only partly covered.

## Related

[[Keka-Gap-Analysis]] · [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]] · [[Payslip-Notification-Timing-Plan]]
