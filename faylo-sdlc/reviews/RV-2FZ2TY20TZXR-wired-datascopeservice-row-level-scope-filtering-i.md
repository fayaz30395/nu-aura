# RV-2FZ2TY20TZXR: Wired DataScopeService row-level scope filtering into the main list/query method of all 5 target domains — no domain needed deferral, each had a clean employeeId-bearing entity: Payroll (PayslipService.getAllPayslips, gated PAYROLL_VIEW_ALL), Compensation (CompensationService.getAllRevisions on SalaryRevision, gated COMPENSATION_VIEW), Performance (PerformanceReviewService.getAllReviews, gated REVIEW_VIEW), Benefits (BenefitEnhancedService.getPendingEnrollments on BenefitEnrollment, gated BENEFIT_VIEW), Compliance (ComplianceService.getPolicyAcknowledgments on PolicyAcknowledgment, gated COMPLIANCE_VIEW). Pattern matches ExpenseClaimService exactly: tenantSpec.and(scopeSpec) via dataScopeService.getScopeSpecification(permission), each repo given JpaSpecificationExecutor. Batch/cycle-level aggregate entities in the same domains (PayrollRun, CompensationReviewCycle) were intentionally left untouched — no employee/department/location field, scoping them would force a bad join; the per-employee entity within the same domain was the correct target instead. SECURITY BEHAVIOR CHANGE flagged inline at each site: any role with a non-ALL scope (TEAM/DEPARTMENT/LOCATION/SELF/CUSTOM) on these permissions will now see a filtered subset instead of the whole tenant — this is the fix, not a regression. mvn compile clean; fixed 2 existing tests (PayslipServiceTest, PerformanceReviewServiceTest) whose stubs targeted the now-removed unscoped repository calls, plus one Mockito ambiguous-overload fix in SoftDeleteServiceTest caused by adding JpaSpecificationExecutor to PayslipRepository. Full run: 75/75 tests green across all 5 touched test classes.

> **Story:** US-2FZ1RXB6QNFD
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
