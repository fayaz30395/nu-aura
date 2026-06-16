---
title: NU-AURA RBAC Matrix
tags: [rbac, security, matrix, authorization, capabilities]
---

# RBAC Matrix

> Part of the **05-RBAC** section. See also [[Roles]] · [[Permissions]] · [[00-Home]]

## Purpose

Map **roles → capabilities** across the four sub-apps, and **sensitive resources → allowed
roles**. Every cell below is derived from the default-grant functions in
`backend/src/main/java/com/nulogic/common/security/RoleHierarchy.java` (the code I read), not
from inference, unless explicitly marked *(inferred)*. New tenants are seeded from these grants;
a tenant admin can later diverge a role's `role_permissions` rows ([[Permissions]]).

## Context

- **Source of truth:** `RoleHierarchy.getDefaultPermissions()` (`:68`) and its per-role helpers.
- **Bypass:** `SUPER_ADMIN` (rank 100) bypasses **all** gates — every cell is implicitly ✔ for it.
- **Superset chains (verified in code):** `TENANT_ADMIN ⊇ HR_ADMIN ⊇ HR_MANAGER`
  (`:126`, `:267`). So any ✔ for `HR_MANAGER` is also ✔ for `HR_ADMIN` and `TENANT_ADMIN`.
- Legend: ✔ granted · ✘ not granted · — not applicable to that role.

## Verification honesty

| Confidence | What | Why |
|------------|------|-----|
| **Verified** | Per-role permission sets, ranks, superset chains, field perms, the 3-layer enforcement | Read directly from `RoleHierarchy.java`, `SecurityContext.java`, `SecurityService.java`, `PermissionHandlerInterceptor.java`, `PermissionAspect.java`, `usePermissions.ts` |
| **Inferred** | Mapping of a permission to a *sub-app* (e.g. `OKR:*`→[[Nu-Grow]]) and a few specialized-admin edges | Sub-app ownership inferred from module naming + module docs, not a code-level app tag on each permission |
| **Not exhaustive** | Every one of ~350 permission keys | Matrix covers representative capabilities per app, not the full catalogue (see [[Permissions]]) |

## Role × Capability Matrix (by sub-app)

Columns abbreviated: **SA**=SUPER_ADMIN, **TA**=TENANT_ADMIN, **HA**=HR_ADMIN, **HM**=HR_MANAGER,
**HE**=HR_EXECUTIVE, **PA**=PAYROLL_ADMIN, **DM**=DEPARTMENT_MANAGER, **TL**=TEAM_LEAD,
**EMP**=EMPLOYEE, **CON**=CONTRACTOR, **INT**=INTERN. Specialized admins (RECRUITMENT_ADMIN,
EXPENSE_MANAGER, etc.) appear in the Resource matrix and notes below.

### [[Nu-HRMS]] — Core HR

| Capability (perm) | SA | TA | HA | HM | HE | PA | DM | TL | EMP | CON | INT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| View all employees (`EMPLOYEE:VIEW_ALL`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| View self only (`EMPLOYEE:VIEW_SELF`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | dept | team | ✔ | ✔ | ✔ |
| Create/update employee (`EMPLOYEE:CREATE/UPDATE`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Delete employee (`EMPLOYEE:DELETE`) | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Approve leave (`LEAVE:APPROVE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ | ✘ | ✘ | ✘ |
| Request leave (`LEAVE:REQUEST`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✔ |
| Mark attendance (`ATTENDANCE:MARK`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ | ✔ | ✔ |
| Process payroll (`PAYROLL:PROCESS`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Approve payroll (`PAYROLL:APPROVE`) | ✔ | ✔ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| View own payslip (`PAYROLL:VIEW_SELF`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ |
| Manage roles/users (`ROLE:MANAGE`,`USER:MANAGE`) | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Update settings (`SETTINGS:UPDATE`) | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| View audit log (`AUDIT:VIEW`) | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Approve expense (`EXPENSE:APPROVE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Create expense (`EXPENSE:CREATE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ | ✔ | ✘ |

> `DM`/`TL` "dept"/"team" cells: they instead hold `EMPLOYEE:VIEW_DEPARTMENT`/`VIEW_TEAM`
> (scoped views), not global view — `RoleHierarchy.java:428`, `:463`.

### [[Nu-Hire]] — Recruitment

| Capability | SA | TA | HA | HM | HE | RECRUITMENT_ADMIN | DM | EMP |
|---|---|---|---|---|---|---|---|---|
| Recruitment manage (`RECRUITMENT:MANAGE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ |
| View candidates (`CANDIDATE:VIEW`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ |
| Evaluate candidate (`CANDIDATE:EVALUATE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ |
| Onboarding manage (`ONBOARDING:MANAGE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ |
| Agencies manage (`AGENCY:MANAGE`) | ✔ | ✔ | ✔ | partial | ✘ | ✘ | ✘ | ✘ |
| Scorecards (`SCORECARD:CREATE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Referral create (`REFERRAL:CREATE`) | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ |

> `HM` agency "partial": holds `AGENCY:VIEW/CREATE/UPDATE` but not `AGENCY:DELETE/MANAGE`
> (`:388`); full agency CRUD is `TENANT_ADMIN` (`:200`). The dedicated `INTERVIEWER` implicit
> role grants `CANDIDATE:VIEW/EVALUATE` + `RECRUITMENT:VIEW` (`:833`).

### [[Nu-Grow]] — Performance, OKR, LMS, Wellness

| Capability | SA | TA | HA | HM | HE | DM | TL | LMS_ADMIN | EMP |
|---|---|---|---|---|---|---|---|---|---|
| Review create (`REVIEW:CREATE`) | ✔ | ✔ | ✘ | ✘ | ✘ | ✔ | ✔ | ✘ | ✘ |
| Review approve (`REVIEW:APPROVE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| OKR create/update (`OKR:CREATE`) | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |
| OKR approve (`OKR:APPROVE`) | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| 360 feedback manage (`FEEDBACK_360:MANAGE`) | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Survey manage (`SURVEY:MANAGE`) | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Survey submit (`SURVEY:SUBMIT`) | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |
| Wellness manage (`WELLNESS:MANAGE`) | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| LMS course manage (`LMS:COURSE_MANAGE`) | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ |
| LMS enroll (`LMS:ENROLL`) | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ | ✔ |
| PIP create (`PIP:CREATE`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |

> `REVIEW:CREATE`/`UPDATE`/`SUBMIT`/`DELETE` are `TENANT_ADMIN`-exclusive among the HR admins —
> `HR_ADMIN`/`HR_MANAGER` only get `REVIEW:VIEW`+`REVIEW:APPROVE` (`:164`, `:313`). `EMPLOYEE` can
> author OKRs and submit surveys/feedback but cannot approve.

### [[Nu-Fluence]] — Knowledge, Wiki, Blog, Wall, E-Sign

| Capability | SA | TA | HA | HM | EMP |
|---|---|---|---|---|---|
| Wiki create/publish/approve (`KNOWLEDGE:WIKI_*`) | ✔ | ✔ | ✘ | ✘ | ✘ |
| Blog create/publish (`KNOWLEDGE:BLOG_*`) | ✔ | ✔ | ✘ | ✘ | ✘ |
| Template manage (`KNOWLEDGE:TEMPLATE_*`) | ✔ | ✔ | ✘ | ✘ | ✘ |
| Knowledge settings (`KNOWLEDGE:SETTINGS_MANAGE`) | ✔ | ✔ | ✘ | ✘ | ✘ |
| E-signature manage (`ESIGNATURE:MANAGE`) | ✔ | ✔ | ✘ | ✘ | ✘ |
| Wall post/comment/react (`WALL:POST/COMMENT/REACT`) | ✔ | ✔ | ✔ | ✔ | ✔ |
| Wall manage/pin (`WALL:MANAGE`,`WALL:PIN`) | ✔ | ✔ | ✔ | ✔ | ✘ |

> Fluence knowledge management is concentrated in `TENANT_ADMIN` (`:174–194`) — `HR_ADMIN`/
> `HR_MANAGER` do not get wiki/blog/template grants by default. Every employee can use the Wall.

## Resource Matrix (sensitive resources × allowed roles)

Built from the explicit grants. "Allowed" = roles whose default set includes the gating
permission(s); `SUPER_ADMIN` always allowed via bypass.

| Sensitive resource | Gating permission | Roles allowed by default |
|--------------------|-------------------|--------------------------|
| **Salary (view)** | `FIELD:EMPLOYEE:SALARY:VIEW` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN (`:391`,`:598`) |
| **Salary (edit)** | `FIELD:EMPLOYEE:SALARY:EDIT` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, PAYROLL_ADMIN (`:285`,`:599`) — **not** HR_MANAGER |
| **Bank details (view)** | `FIELD:EMPLOYEE:BANK:VIEW` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN (`:392`,`:600`) |
| **Bank details (edit)** | `FIELD:EMPLOYEE:BANK:EDIT` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, PAYROLL_ADMIN (`:286`,`:601`) |
| **Tax ID** | `FIELD:EMPLOYEE:TAX_ID:VIEW` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN (`:393`,`:602`) |
| **ID documents** | `FIELD:EMPLOYEE:ID_DOCS:VIEW` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN (`:287`) |
| **Payroll approval** | `PAYROLL:APPROVE` | SUPER_ADMIN, TENANT_ADMIN, PAYROLL_ADMIN (`:129`,`:571`) |
| **Payments (initiate/refund)** | `PAYMENT:INITIATE`/`REFUND` | SUPER_ADMIN, TENANT_ADMIN (`:258`) — gated again by feature flag at service layer |
| **Compensation manage** | `COMPENSATION:MANAGE` | SUPER_ADMIN, TENANT_ADMIN, PAYROLL_ADMIN (`:239`,`:579`) |
| **Employee delete** | `EMPLOYEE:DELETE` | SUPER_ADMIN, TENANT_ADMIN (`:129`) |
| **Role / user management** | `ROLE:MANAGE`,`USER:MANAGE` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN (`:271`) |
| **Tenant config / platform** | `TENANT:MANAGE`,`PLATFORM:MANAGE` | SUPER_ADMIN only (`:106`) |
| **System admin (global bypass)** | `SYSTEM:ADMIN` | SUPER_ADMIN only (`:105`) |
| **Audit log** | `AUDIT:VIEW` | SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, COMPLIANCE_OFFICER (`:274`,`:729`) |
| **Data migration import/export** | `MIGRATION:IMPORT/EXPORT` | SUPER_ADMIN (`:113`) |

> **Two-tier financial control is real:** salary/bank **view** reaches HR_MANAGER, but **edit**
> stops at HR_ADMIN/PAYROLL_ADMIN. HR_EXECUTIVE has *no* financial access at all (`:422`).

## Dependencies

`RoleHierarchy` (grants) · `FieldPermission` (field gates) · `SecurityContext.hasPermission`
(hierarchy widening) · `role_permissions` rows ([[Schema]]) · enforcement via
`@RequiresPermission` ([[Permissions]]) · feature flags (`FeatureFlagAspect`) on payment paths.

## Related Links

[[Roles]] · [[Permissions]] · [[Data-Flows]] · [[System-Flows]] · [[Schema]] · [[Security-Audit]] ·
[[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]] · [[Shared-Platform]] · [[APIs]] ·
[[Routes]] · [[Pages]] · [[Middleware]] · [[00-Home]]

## Risks

- **Matrix reflects DEFAULT grants, not live state.** A tenant admin editing `role_permissions`
  can diverge any cell. To audit a live tenant, read its rows — do not assume these defaults.
- **Sub-app ownership of a permission is inferred** from module naming; some modules
  (e.g. `WALL:*`) span HRMS dashboard and Fluence. Field/financial/admin rows are code-verified
  and trustworthy.
- **Hierarchy widening can surprise auditors.** `MODULE:MANAGE` silently implies every action in
  that module, and `VIEW_ALL` implies all narrower views (`SecurityContext.java:324`). A role
  holding `EXPENSE:MANAGE` passes `EXPENSE:APPROVE` checks even if `EXPENSE:APPROVE` isn't listed.
- **Frontend-only roles** (`MANAGER`, `FINANCE_ADMIN`, `RECRUITER`, `TRAINER`) appear in
  `usePermissions.ts` but are not backend roles — gating on them never matches server-side
  (see [[Roles]] Risks).

## Operational Notes

- Capability questions should be answered against `RoleHierarchy.java` first, then the tenant's
  `role_permissions` if it may have diverged.
- The `skills:nu-permission` skill scaffolds new permission keys consistently across BE+FE.
- For "who can see salary/bank for employee X" the answer is permission **AND** [[Roles]] scope
  (`RoleScope`) **AND** tenant RLS ([[Data-Flows]] §4) — three independent gates.
