---
title: User Manual
tags: [user-manual, product, support, onboarding]
updated: 2026-06-25
summary: "Role-oriented user manual for NU-AURA pilot users, admins, and support teams."
---

# User Manual

## Audience

This manual is for pilot users and support teams using NU-AURA through the web app. Available
menus depend on the user's role and permissions. If a feature is not visible, first check the
user's role, permission grants, tenant status, and feature flags.

## Getting Started

1. Open the NU-AURA frontend URL for the target environment.
2. Sign in with password, Google OAuth, MFA, or SAML if configured for the tenant.
3. After sign-in, land in My Space or the last allowed route.
4. Use the app switcher to move between NU-HRMS, NU-Hire, NU-Grow, and NU-Fluence.
5. Use the sidebar to navigate within the active app.

## Core Navigation

| Area | What users see |
|---|---|
| My Space | Dashboard, profile, payslips, attendance, leave, documents, skills, assets |
| App switcher | Four app tiles when permissions allow: HRMS, Hire, Grow, Fluence |
| Sidebar | App-specific menu sections and child pages |
| Notifications | In-app and toast notifications for assigned workflows |
| Search / knowledge | Fluence search, wiki, blogs, templates, and wall where enabled |

## Common Employee Tasks

### View My Dashboard

1. Go to `My Space -> My Dashboard`.
2. Review attendance status, leave balance, holidays, and personal widgets.
3. Use the shortcuts to open attendance, leave, payslips, documents, or assets.

### Check Attendance

1. Open `My Space -> My Attendance` or the attendance widget.
2. Use check-in/check-out where enabled.
3. If a punch is missing, use regularization.
4. Track approval status from the attendance or approvals area.

### Apply For Leave

1. Open `My Space -> My Leaves` or `Leave Management -> Apply Leave`.
2. Select leave type and dates.
3. Submit the request.
4. Track request status under My Leaves.

### View Payslips And Documents

1. Open `My Payslips` for payroll documents.
2. Open `My Documents` for employee documents.
3. Contact HR if a document is missing or access is denied.

## Manager Tasks

| Task | Where to go | Notes |
|---|---|---|
| Approve leave | `Approvals` or `Leave Management -> Leave Approvals` | Requires leave approval permission |
| Review team attendance | `Attendance -> Team Attendance` | Requires attendance view permission |
| Review performance | `NU-Grow -> Performance Hub` | Requires review permissions |
| Manage OKRs | `NU-Grow -> OKR` | Requires OKR permissions |
| Run 1-on-1s | `NU-Grow -> 1-on-1 Meetings` | Requires meeting permissions |

## HRMS Tasks

| Area | Typical workflow |
|---|---|
| Employees | Create/update employee records, documents, skills, reporting structure |
| Organization | Manage departments, designations, positions, org hierarchy |
| Leave | Configure leave types, review approvals, manage carry-forward/encashment |
| Attendance | Review team attendance, regularization, biometric devices, shifts |
| Payroll | Process runs, approve/lock runs, publish payslips |
| Expenses | Review claims, policy validation, reimbursement/payment |
| Helpdesk | Track employee tickets and SLA |

## NU-Hire Tasks

| Area | Typical workflow |
|---|---|
| Jobs | Create job openings and manage publishing/status |
| Candidates | Review candidates, move pipeline stages, track details |
| Interviews | Schedule interviews and collect feedback |
| Scorecards | Create and submit structured candidate evaluations |
| Public careers | Candidates browse `/careers` and submit applications without login |
| Preboarding/onboarding | Use token portals and internal tasks to convert candidate to employee |
| Offers/e-sign | Send offer documents and collect signatures through token or authenticated flows |

## NU-Grow Tasks

| Area | Typical workflow |
|---|---|
| Performance | Manage cycles, reviews, calibration, 9-box, PIP |
| OKRs | Create objectives, key results, progress updates, check-ins |
| 360 feedback | Create cycles, request feedback, submit responses, review summaries |
| Learning | Browse courses, take modules/quizzes, view certificates |
| Training | Manage training programs and enrollment |
| Recognition | Give recognition and view points/leaderboards |
| Surveys | Respond to surveys and review analytics where permitted |
| Wellness | Join wellness programs/challenges and review wellness points |

## NU-Fluence Tasks

| Area | Typical workflow |
|---|---|
| Wall | Post updates, praise employees, react, comment, pin where permitted |
| Wiki | Create spaces/pages, edit content, publish, view versions |
| Blogs | Create and publish long-form articles |
| Templates | Use reusable structures for pages and documents |
| Drive | Upload and browse attachments/files |
| Search | Search knowledge content by tenant-scoped access |
| AI Chat | Ask knowledge questions when the AI/chat integration is configured |

## Admin Tasks

| Area | Typical workflow |
|---|---|
| Users | Create users, assign roles, inspect account state |
| Roles and permissions | Manage role grants and permission families |
| Feature flags | Enable or disable feature categories by tenant |
| Integrations | Configure Slack, DocuSign, Google, webhooks, and connectors |
| Audit | Review system audit logs and admin events |
| Settings | Configure security, SSO, notifications, and tenant-level preferences |

## Troubleshooting

| Symptom | Likely cause | First check |
|---|---|---|
| Page missing from sidebar | Permission, app access, or feature flag | User role and `permissionPrefixes` mapping |
| Page returns forbidden | Backend `@RequiresPermission` denied | Matching permission in [[Permissions]] |
| User sees no tenant data | Tenant inactive, missing tenant context, or RLS fail-closed | Tenant status and auth token tenant claim |
| Public token link fails | Token expired or wrong public endpoint | Token issue date and route path |
| Upload fails | Drive/storage config or file validation | Storage provider config and upload logs |
| Notifications missing | Preferences, channel config, or outbox/consumer issue | Notification preferences and outbox status |

## Support Escalation Checklist

- Capture user email, tenant, role(s), route, action, time, and request ID if available.
- Check whether the route is public, authenticated, admin-only, or token-scoped.
- Verify the role/permission family before escalating to engineering.
- For suspected tenant leakage, treat as SEV-1 and follow [[Incident-Response]].
- For production login or demo credential issues, follow [[Security-Audit]] deploy-gate guidance.

## Related

- [[Application-Map]]
- [[Product-Requirements-Document]]
- [[RBAC-Matrix]]
- [[Routes]]
- [[Feature-Traceability]]
- [[Incident-Response]]
