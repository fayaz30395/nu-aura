# RBAC P0 Matrix (Keka-style)

Last Updated: 2026-01-13 (draft)

## Purpose
This is the P0 RBAC matrix template for the 10-day release. It reflects
Keka-style access behavior and is meant to be filled and enforced in code + UI.

## Scope Definitions
| Scope | Meaning | Notes |
| --- | --- | --- |
| ALL (GLOBAL) | All data in tenant | Highest scope |
| LOCATION | Data for assigned location(s) | Org context required |
| DEPARTMENT | Data for assigned department | Org context required |
| TEAM | Direct + indirect reports | Requires org hierarchy traversal |
| SELF | Only own records | Uses current user/employee id |
| CUSTOM | Explicit list of target entities | Union across roles |

Effective permission rules:
- Multiple roles per user are supported.
- For a permission, the most permissive scope wins.
- If only CUSTOM scopes exist, union all custom targets.

## Roles in P0 Scope
Explicit roles:
- SUPER_ADMIN
- TENANT_ADMIN
- HR_MANAGER
- HR_EXECUTIVE
- RECRUITMENT_ADMIN
- DEPARTMENT_MANAGER
- TEAM_LEAD
- EMPLOYEE

Implicit roles:
- REPORTING_MANAGER
- SKIP_LEVEL_MANAGER
- INTERVIEWER

## P0 Modules and Permissions

### Recruitment ATS
| Permission Code | Description | Default Roles | Default Scope | Notes |
| --- | --- | --- | --- | --- |
| RECRUITMENT:VIEW | View requisitions and pipeline | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT | Existing |
| RECRUITMENT:CREATE | Create requisitions | HR_MANAGER, RECRUITMENT_ADMIN | ALL | Existing |
| RECRUITMENT:MANAGE | Edit/close requisitions | HR_MANAGER, RECRUITMENT_ADMIN | ALL | Existing |
| CANDIDATE:VIEW | View candidate profile | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE, INTERVIEWER | ALL/DEPARTMENT/CUSTOM | Existing |
| CANDIDATE:CREATE | Add candidate/applicant | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT | New |
| CANDIDATE:UPDATE | Update candidate profile | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT/CUSTOM | New |
| CANDIDATE:DELETE | Remove candidate | HR_MANAGER, RECRUITMENT_ADMIN | ALL | New |
| CANDIDATE:EVALUATE | Submit interview feedback | INTERVIEWER, HR_MANAGER, RECRUITMENT_ADMIN | CUSTOM/TEAM | Existing |
| RECRUITMENT:PIPELINE_MOVE | Change pipeline stage | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT/CUSTOM | New |
| RECRUITMENT:INTERVIEW_SCHEDULE | Schedule interviews | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT | New |

Custom scope targets:
- Candidate IDs, requisition IDs, and assigned recruiter/hiring manager lists.

### Offers + E-Signature
| Permission Code | Description | Default Roles | Default Scope | Notes |
| --- | --- | --- | --- | --- |
| LETTER:TEMPLATE_VIEW | View offer templates | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT | Existing |
| LETTER:TEMPLATE_CREATE | Create templates | HR_MANAGER, RECRUITMENT_ADMIN | ALL | Existing |
| LETTER:TEMPLATE_MANAGE | Edit/delete templates | HR_MANAGER, RECRUITMENT_ADMIN | ALL | Existing |
| LETTER:GENERATE | Generate offer letters | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT | Existing |
| LETTER:APPROVE | Approve offer letter | REPORTING_MANAGER, HR_MANAGER | TEAM/ALL | Existing |
| LETTER:ISSUE | Issue/send offer | HR_MANAGER, RECRUITMENT_ADMIN | ALL | Existing |
| ESIGNATURE:VIEW | View signature requests | HR_MANAGER, RECRUITMENT_ADMIN, HR_EXECUTIVE | ALL/DEPARTMENT | Existing |
| ESIGNATURE:REQUEST | Create signature request | HR_MANAGER, RECRUITMENT_ADMIN | ALL/DEPARTMENT | Existing |
| ESIGNATURE:SIGN | Sign as candidate/employee | EMPLOYEE | SELF | Existing |
| ESIGNATURE:MANAGE | Manage signature routing | HR_MANAGER, RECRUITMENT_ADMIN | ALL | Existing |

Note:
- Current controllers use DOCUMENT_* permissions; align to LETTER_* and ESIGNATURE_*.
- L1 approval applies to LETTER:APPROVE; L1 is hiring manager (reporting manager of the position owner).

### RBAC Admin (UI parity)
| Permission Code | Description | Default Roles | Default Scope | Notes |
| --- | --- | --- | --- | --- |
| ROLE:MANAGE | Manage roles | SUPER_ADMIN, TENANT_ADMIN | ALL | Existing |
| PERMISSION:MANAGE | Manage permissions | SUPER_ADMIN, TENANT_ADMIN | ALL | Existing |
| USER:VIEW | View users | TENANT_ADMIN, HR_MANAGER | ALL/DEPARTMENT | Existing |
| USER:MANAGE | Assign roles to users | TENANT_ADMIN, HR_MANAGER | ALL/DEPARTMENT | Existing |

UI requirements:
- Role permission assignment must include scope picker and custom target selection.
- User detail view must show effective permissions and scopes (merged from roles).

## L1 Approval Mapping (P0)
| Workflow | Permission | Approver | Scope |
| --- | --- | --- | --- |
| Offer approval | LETTER:APPROVE | Reporting manager (hiring manager) | TEAM |

If L1 manager is missing, fallback to HR_MANAGER or TENANT_ADMIN.

## Open Items
- Confirm if CUSTOM scope should allow arbitrary employee lists vs per-module entities.
- Confirm whether HR_EXECUTIVE can move candidates across pipeline stages.

