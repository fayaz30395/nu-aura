# RV-2G0609KSC9RE: Dashboard wall-posts 403 review

> **Story:** US-2G00S1PDXKT1
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Root-caused: RoleHierarchy.get*Permissions() only ever granted DASHBOARD_VIEW/WALL_VIEW/POST/COMMENT/REACT to EMPLOYEE (and transitively HR_MANAGER/HR_ADMIN/TENANT_ADMIN) - every specialized admin (RECRUITMENT_ADMIN/PROJECT_ADMIN/ASSET_MANAGER/EXPENSE_MANAGER/PAYROLL_ADMIN/HELPDESK_ADMIN/TRAVEL_ADMIN/COMPLIANCE_OFFICER/LMS_ADMIN/CONTRACTOR) and people-manager role (DEPARTMENT_MANAGER/TEAM_LEAD/HR_EXECUTIVE) lacked it, both in code and in the matching V305 DB backfill - confirming the RECRUITMENT_ADMIN hypothesis and explaining the multi-role 403 reports. Added the 5 permissions to all 13 role methods and a V325 migration to backfill role_permissions for existing tenants (idempotent, ON CONFLICT DO NOTHING, mirrors V305's cross-tenant pattern). RoleHierarchyTest passes (uses .contains not exact-match assertions, so additive-only change is safe); compiles clean.
