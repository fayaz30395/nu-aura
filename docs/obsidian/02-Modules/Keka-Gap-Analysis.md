---
title: Keka Gap Analysis
tags: [module, keka-parity, gap-analysis, planning]
summary: Consolidated Keka-vs-NU-AURA gap list recovered from the 2026-10-10 nine-agent run, with P0/P1/P2 priorities, dependencies, risks and acceptance criteria. Priorities and the P0 re-verification were added after recovery.
---

# Keka Gap Analysis

> Recovered and consolidated on 2026-10-10. Companion to [[Nu-HRMS]], [[Nu-Hire]], [[Nu-Grow]] and
> [[Nu-Fluence]]. Paths are relative to the repo root unless noted.

## Provenance (read this first)

The original synthesis was never written down: the session that produced it
(`c4e635e9-b37c-4d60-ba0c-135e24e672de`) ended while it was still waiting on agents. This note was
rebuilt from the agents' own transcripts, which are stored under
`~/.claude/projects/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/c4e635e9-…/subagents/`.

| Source | Status | Used for |
|---|---|---|
| `agap-corehr`, `agap-onboard`, `agap-payroll`, `agap-perf`, `agap-psa`, `agap-time` | Finished; tables recovered | Repo-side gap tables (below) |
| `keka-engage` | Finished; search snippets only (help.keka.com returns 403 to fetch) | Keka capability reference |
| `keka-platform` | Result sent to the lead; recovered from the message | Keka platform/API/security reference |
| `keka-analytics` | **Interrupted mid-fetch. No findings produced.** | Nothing. Reports, pricing and review research is still missing. |

Confidence: the agents rated most rows "med". Where this note says **verified**, the claim was
re-checked against the code on 2026-10-10 by a second pass. Everything else is the agent's claim,
unverified. The **P0/P1/P2 priorities are an editorial judgement added after recovery**. They are
not part of the original agent output.

## Corrections to earlier documents

- `docs/pendings.md` says `BULK_PROCESSING_AVAILABLE = false` at `payroll.service.ts:456`. The flag is
  `true` at `frontend/lib/services/hrms/payroll.service.ts:476` (**verified**). That pendings entry is stale.
- `docs/pendings.md` lists 360-feedback peer nomination as done (`US-2FYDT4BEB1G7`). `agap-perf` found
  no employee-side nominate endpoint (`Feedback360Service.java:168` is approve-only). These conflict;
  re-check before building anything on either claim.

## Priority summary

| ID | Gap | Area | Verified |
|---|---|---|---|
| P0-1 | Payslips visible to employees before the payroll run is approved | Payroll | Yes |
| P0-2 | Bank advice / payment file export | Payroll | Yes |
| P0-3 | Arrears and supplementary pay | Payroll | Yes |
| P0-4 | Loan EMI not recovered through payroll | Payroll | Yes |
| P0-5 | Project timesheet period lock and submission reminders | PSA | Yes |

P0 means money, privacy or billing integrity on a flow people already use. P1 means a documented
Keka capability with a clear user-facing gap. P2 means large, speculative, or not evidenced as Keka parity.

## P0 detail

### P0-1 Payslip release gating (build target for the first P0 task)

- **Evidence:** `Payslip` has no status or release field (`domain/payroll/Payslip.java`). Payslips are
  built inside run processing (`PayrollRunService.java:467`). Employee read endpoints
  (`PayrollController.java:300-332`, PDF at `:359-386`) require only `PAYROLL_VIEW_SELF` and never check
  the parent run's `PayrollStatus` (`DRAFT`, `PROCESSING`, `PROCESSED`, `APPROVED`, `LOCKED`).
- **Risk:** an employee can read figures from a run that is still being corrected or has not been approved.
- **Dependencies:** `PayrollRun.PayrollStatus`; `PayslipService`; `PayslipPdfService`; the employee
  self-service payslip pages. An explicit "published" flag would need a Flyway migration. Do not pick a
  version number without running `git log --all --diff-filter=A -- '*V3*'` first, because several
  release branches hold migrations that `main` does not.
- **Acceptance criteria:** (1) a self-view caller gets only payslips whose run is `APPROVED` or `LOCKED`;
  (2) the same rule applies to the PDF endpoints; (3) callers with `PAYROLL_VIEW_ALL` are unaffected;
  (4) a payslip from an unapproved run returns not-found, not forbidden, so its existence is not leaked.

### P0-2 Bank advice / payment file

- **Evidence:** no NEFT, bank advice or payment-file code anywhere in the backend (**verified** by search).
- **Dependencies:** run must be `APPROVED`/`LOCKED`; per-employee bank details; a decision on the target
  bank file format. The format is a product decision.
- **Acceptance criteria:** export for one run lists every employee with a net amount, account and IFSC,
  totals reconcile to the run, and employees with missing bank details are listed rather than skipped.

### P0-3 Arrears and supplementary pay

- **Evidence:** no arrears or supplementary code (**verified**). `PayrollAdjustment.AdjustmentType` has
  `OVERTIME_EARNING`, `EXPENSE_REIMBURSEMENT`, `LOP_DEDUCTION`, `MILEAGE_REIMBURSEMENT`,
  `PERFORMANCE_INCREMENT`, `BONUS` only.
- **Dependencies:** the adjustment mechanism in `PayrollRunService.applyPendingAdjustments` (`:515`) is the
  natural extension point. Statutory effects (PF/TDS on arrears) need a rule decision.
- **Acceptance criteria:** an arrears amount entered for a past period is folded into the next run once,
  marked consumed, and shown as its own payslip line.

### P0-4 Loan EMI recovery through payroll

- **Evidence:** `LoanService` calculates EMI and carries `isSalaryDeduction`, but repayment is recorded
  manually (`recordRepayment`, `LoanService.java:205`). There is no loan reference under
  `application/payroll` or `domain/payroll` (**verified**).
- **Dependencies:** adjustment mechanism as in P0-3; an `AdjustmentType` for loan deduction; loan status
  rules for active and closed loans.
- **Acceptance criteria:** an active loan with `isSalaryDeduction` deducts its EMI in each run and
  reduces the outstanding balance exactly once per run, including on reprocess.

### P0-5 Timesheet lock and reminders

- **Evidence:** submitting an entry locks edits (`ProjectTimesheetController.java:79`), but there is no
  period lock and no reminder scheduler (**verified**). Invoices are generated from approved entries
  (`ProjectInvoiceGenerationService.java:41-86`).
- **Risk:** billing basis can drift after approval; late submissions are never chased.
- **Acceptance criteria:** a locked period rejects create, edit and delete; a scheduler notifies
  employees with missing or unsubmitted timesheets before the cutoff.

## P1 gaps (unverified agent findings unless marked)

**Hire / Onboarding** (`agap-onboard`)
- Preboarding tasks target department and role/level only; no location or worker type
  (`OnboardingChecklistTemplate.java:49-54`).
- No stage-offset triggers such as "5 days after offer release".
- No preboarding task reminders to candidates (`HireReminderScheduler` does not cover them).
- No dedicated internal-notes model; only free-text `notes` fields.
- Upcoming-joiner dashboard is API-only (`PreboardingController.java:72-80`); no frontend page found.
- Calendar sync is Google only; no Outlook.

**Time and leave** (`agap-time`)
- Overtime bulk import missing (only attendance has Excel import, `AttendanceController.java:488-518`).
- Custom overtime event types missing (multipliers exist in `OvertimePolicy`).
- Comp-off credits on approval or auto-approve, not instantly.
- Leave and attendance configuration cannot be scoped by RBAC (`DataScope` is generic).
- No break-punch regularisation; bulk regularisation over a date range unconfirmed.

**Performance** (`agap-perf`)
- No AI goal generation (Keka documents it). No aggregate multi-cycle review.
- No parallel or sequential reviewer stages; no goal templates or bulk assignment.
- No auto-population of review ratings from goal progress.
- Succession-plan endpoints exist with no frontend page (built but unwired).
- OKR parent-child hierarchy has backend support, no hierarchy UI found.

**PSA** (`agap-psa`)
- No resource request entity or skill-based matching (`requiredSkills` only on `Position`).
- No project profitability (`costRate` stored, no margin calculation).
- No milestone-based billing; no shadow resources; no max-billable-hours cap.
- No rate-card entity (`billingRate` is per member/entry). No zero-billing-rate gap report.

**Core HR and platform** (`agap-corehr`)
- Org chart caps at 1000 employees (`frontend/app/admin/org-hierarchy/page.tsx:57`); route is not `/org-chart`.
- Keka import returns 501 unless `app.features.keka-import-api` is enabled
  (`KekaImportService.java:118-123`).
- Audit log has no export endpoint (Keka exports to Excel).
- Report builder: save and schedule exist; export path unverified.
- Polls exist only as wall votes; pulse surveys exist.
- Public API exposes offers and careers only; API keys and webhooks exist.

**Payroll** (`agap-payroll`)
- Payslip PDF exists but has no release step (see P0-1).
- Salary hold and loan detail on payslips depend on P0-4.
- F&F ad-hoc deductions for loans and unpaid expenses: linkage not verified.

## P2 gaps

- Multi-entity, multi-country and multi-currency: no legal-entity model (`agap-corehr`). Keka supports
  multi-entity for India and US.
- SCIM provisioning missing. `keka-platform` found **no evidence that Keka itself offers SCIM**, so this
  is not demonstrated Keka parity.
- PWA: no manifest or service worker in `frontend/public`.
- Pay equity and CTC simulator missing.
- Two parallel recruitment models (`Candidate` and `Applicant`) already tracked in `docs/pendings.md`.

## Present or low-risk (no action needed on current evidence)

Salary structure and component formulas, payroll lock and bulk processing, PF/ESI/PT/LWF/TDS, Form 16
and 24Q, full and final settlement, tax declarations, expense advances, compensation cycles, shift
rotation, custom leave reports, geofenced attendance, 9-box and calibration, continuous feedback and
1:1s, PIP, workflow and delegation, asset management, letters, notification bell, helpdesk SLA,
resource pools, allocation validation, invoicing from approved timesheets, offer e-sign, resume parsing,
scorecards, exit workflow, referrals, background verification.

## Keka capability reference (vendor-stated, from search snippets)

- **Engage:** polls (expiry, anonymous), pulse surveys, kudos, recognition wall.
- **Helpdesk:** per-category SLA and escalation, auto-routing, canned responses, mobile tickets.
- **Mobile:** geofenced punches, selfie attendance, field tracking, leave approvals, payslips.
- **AI:** goal generation documented; resume screening and analytics are marketing claims only.
- **Platform:** public API (Core HR, Leave, Attendance, Payroll, PSA, Expense, PMS, Hire, Assets,
  Helpdesk), OAuth 2.0, webhooks, Slack, Teams, Entra SSO, Tally and Zoho Books payroll exports,
  tenant-selected data regions on Azure.
- **Unverified:** module tiers, rate limits, webhook payloads, SOC 2 formal status (the DPA says
  "assessed"), org-wide 2FA enforcement.

## Keka tiers and analytics claims (public pages, read 2026-10-10)

Source: `keka.com/pricing` and `keka.com/hr-analytics-software`, read passively. These are vendor
marketing claims, not tested behavior. No prices are published (free trial or "Talk to us").

- **HRMS and Payroll.** *Foundation:* payroll incl. loans, expenses, gratuity, tax; Basic reports; leave,
  attendance, basic onboarding. *Strength:* adds People Analytics, Advanced reports, Keka Sign, pulse
  and surveys. *Growth:* adds Custom Reports Builder, Headcount Planning, OKRs, performance reviews,
  calibration, PIP, helpdesk, workflow automation, pre-boarding. Multiple Legal Entities is an add-on.
- **PSA.** *Basic:* timesheets, projects, 30+ reports. *Pro:* resource management, billing and invoicing,
  cost and margin charts. *Advanced:* project health, smart allocation, revenue and resource forecasting.
- **Hire.** *Pro:* requisitions, parsing, scorecards, offer letters, standard dashboards. *Advanced:* CV-JD
  match score, custom reports, integrations.
- **Analytics page.** Claims month-on-month workforce growth data and retention and attrition analysis.
  It makes **no** attrition prediction or forecasting claim, and states no report count, custom builder
  or scheduler.

What this changes in the list above:
- Loans are a Foundation payroll feature, which supports P0-4.
- Cost and margin charts sit in the mid PSA tier, which supports profitability as P1.
- Multi-entity is a paid add-on, which supports keeping it P2.
- Attrition prediction is not a Keka claim, so it is not a parity gap.
- Bank advice and arrears are not listed on the pricing page. Their P0 status rests on payroll
  practice, not on a Keka page, so treat P0-2 and P0-3 as a product call.

## Open items

- `keka-analytics` research is now partly covered by the section above. Reviews (Capterra, G2) are
  still not read.
- Verify the `agap-*` "med" confidence rows before scoping any P1 task.
- Decide the bank file format (P0-2) and arrears statutory treatment (P0-3).

## Related

- [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]]
- [[Feature-Traceability]]
- Earlier audit context: `docs/pendings.md`
