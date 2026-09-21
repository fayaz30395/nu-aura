# RV-2G06SNQ2X10S: Frontend implementation review

> **Story:** US-2G00ZARVRQDP
> **Author:** faylo-frontend-engineer
> **Reviewer:** faylo-qa-automation-engineer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Root-caused in lib/utils/error-handler.ts's getErrorMessage(): added a 403-aware fallback ('You don't have permission to view this.') since plain 403s carry no JSON body and were falling through to the raw axios status message. Replaced hand-rolled 'error instanceof Error ? error.message : ...' with getErrorMessage() across Contracts, Travel, Time Tracking, Payroll, Projects (list/detail/gantt), and Analytics. Also fixed two contradictory error+empty-state renders (Contracts, Projects list) where a failed fetch showed both the error banner AND a 'No X found' empty state simultaneously. Projects list's hand-rolled parseApiError() now delegates message extraction to getErrorMessage() instead of duplicating the axios/Error branching, keeping its details[] field intact. RBAC itself confirmed correct (backend-3) - this was purely a message-surfacing bug. tsc + eslint clean across all files.
