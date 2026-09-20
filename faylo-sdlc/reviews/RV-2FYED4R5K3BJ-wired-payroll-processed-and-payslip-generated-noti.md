# RV-2FYED4R5K3BJ: Wired PAYROLL_PROCESSED and PAYSLIP_GENERATED notifications by calling the existing (previously-unused) WebSocketNotificationService.notifyPayrollProcessed/notifyPayslipAvailable helpers from PayrollRunService: per-employee payslip-available notify inside generatePayslipsForRun right after payslip save (skipped for idempotent re-runs of already-existing payslips), and payroll-processed notify to the triggering admin after both completeProcessing and processPayrollRun commit. Best-effort try/catch matches LeaveRequestService/ExpenseClaimService convention. mvn compile passes.

> **Story:** US-2FYE7QCNND5M
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
