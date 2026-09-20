# RV-2FYF2MRZ8W15: Added promotion-eligibility gate to EmployeeService.updateEmployeeAdminFields: blocks a level/designation promotion (excluding clear level downgrades) when the employee has an active probation (ProbationPeriodRepository.existsByEmployeeIdAndTenantIdAndStatusIn, ACTIVE/EXTENDED/ON_HOLD) or an active PIP (new PIPRepository.existsByTenantIdAndEmployeeIdAndStatusIn, ACTIVE/EXTENDED) — throws BusinessException, fail-loud per codebase convention. Transfers (dept-only) intentionally left ungated per ambiguous audit source, noted inline. mvn compile clean; EmployeeServiceTest green (17/17, 4 new promotion-gate tests).

> **Story:** US-2FYEK23MNGGZ
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
