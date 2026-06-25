---
title: Product Requirements Document
tags: [product, prd, requirements, stakeholders]
updated: 2026-06-25
summary: "Evidence-based PRD for NU-AURA as a bundle-app HR and people platform."
---

# Product Requirements Document

## Product Summary

NU-AURA is a multi-tenant people platform for employee lifecycle operations, hiring,
performance and learning, and internal knowledge collaboration. It is implemented as a single
Next.js frontend and a Spring Boot modular monolith with shared auth, RBAC, tenant isolation,
notifications, eventing, storage, and integrations.

## Problem Statement

Mid-sized and enterprise teams need one operational system for people data, HR workflows,
hiring, growth, and knowledge management. Fragmented tools create duplicate employee records,
weak auditability, inconsistent permissions, poor tenant isolation, and manual handoffs between
candidate, employee, manager, HR, payroll, and leadership workflows.

NU-AURA solves this by treating every authenticated user as an employee, then layering
additional role-based capabilities on top.

## Personas

| Persona | Needs | Primary areas |
|---|---|---|
| Employee | Self-service profile, attendance, leave, payslips, documents, learning, knowledge | My Space, NU-HRMS, NU-Grow, NU-Fluence |
| Manager | Team attendance, leave approvals, reviews, goals, 1-on-1s, reports | NU-HRMS, NU-Grow |
| HR / HR Ops | Employee lifecycle, org, policies, onboarding, helpdesk, letters | NU-HRMS, NU-Hire |
| Payroll / Finance | Payroll runs, statutory, expenses, benefits, loans, reimbursements | NU-HRMS |
| Recruiter | Jobs, candidates, pipeline, interviews, offers, agencies | NU-Hire |
| Tenant Admin | Users, roles, permissions, feature flags, integrations, tenant settings | Shared Platform |
| Candidate / External signer | Public job application, preboarding portal, offer/e-sign flows | NU-Hire |

## Goals

- Provide one employee record used across HRMS, Hire, Grow, and Fluence.
- Support self-service for every authenticated user through My Space.
- Enforce tenant isolation and RBAC across frontend, backend, cache, search, and database.
- Provide full traceability from route to controller, service, table, and permission.
- Support configurable workflows: approvals, feature flags, notifications, integrations.
- Make the product navigable for pilot users and auditable for engineering teams.

## Non-Goals

- Splitting the backend into microservices for the current release.
- Replacing PostgreSQL RLS with application-only tenant filtering.
- Storing JWTs in browser localStorage.
- Treating sub-apps as separately deployed products.
- Bypassing RBAC for convenience pages outside explicit public/token flows.

## Functional Requirements

### Shared Platform

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PRD-SP-01 | Authenticate users with password, Google OAuth, MFA, and optional SAML | Auth endpoints issue httpOnly cookies and protect authenticated routes |
| PRD-SP-02 | Enforce role and permission checks | Backend uses `@RequiresPermission`; frontend hides/gates navigation by permissions |
| PRD-SP-03 | Enforce tenant isolation | Tenant context is set per request and PostgreSQL RLS filters tenant rows |
| PRD-SP-04 | Provide admin controls | Admins can manage users, roles, permissions, feature flags, integrations, audit |
| PRD-SP-05 | Send notifications across channels | Notification service supports in-app, email, SMS, Slack, WebSocket paths |

### NU-HRMS

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PRD-HRMS-01 | Provide employee self-service | My Space exposes dashboard, profile, payslips, attendance, leave, documents, skills, assets |
| PRD-HRMS-02 | Manage employee lifecycle and org structure | HR can manage employees, departments, positions, org hierarchy, documents |
| PRD-HRMS-03 | Manage attendance, shifts, leave, overtime | Employees submit; managers approve; balances and records remain tenant-scoped |
| PRD-HRMS-04 | Manage payroll, statutory, compensation, benefits | Authorized users can process payroll and employees can view own payslips |
| PRD-HRMS-05 | Manage expenses, loans, travel, assets, letters, helpdesk | Requests, approvals, reimbursements, and service tickets are tracked |

### NU-Hire

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PRD-HIRE-01 | Manage jobs and candidate pipeline | Recruiters create jobs, review candidates, run kanban/pipeline workflows |
| PRD-HIRE-02 | Support public careers and applications | Public job listings and application forms work without product login |
| PRD-HIRE-03 | Support interviews and scorecards | Interviewers can evaluate candidates using scorecards |
| PRD-HIRE-04 | Support preboarding and onboarding | Token flows and authenticated task checklists move candidates toward employee conversion |
| PRD-HIRE-05 | Support offer/e-sign and exits | External signing and offboarding/FnF flows are token or permission gated |

### NU-Grow

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PRD-GROW-01 | Manage performance reviews and cycles | Review, calibration, 9-box, and PIP flows are available by permission |
| PRD-GROW-02 | Manage goals and OKRs | Users create objectives, key results, check-ins, and rollups |
| PRD-GROW-03 | Support learning and training | LMS courses, quizzes, certificates, and training programs are available |
| PRD-GROW-04 | Support engagement | Recognition, surveys, pulse surveys, wellness, and 1-on-1s are available |

### NU-Fluence

| ID | Requirement | Acceptance criteria |
|---|---|---|
| PRD-FLUENCE-01 | Provide wiki and blog knowledge surfaces | Users can create, publish, search, and browse knowledge content by permission |
| PRD-FLUENCE-02 | Provide templates and drive | Templates and attachments support repeated knowledge workflows |
| PRD-FLUENCE-03 | Provide wall and engagement | Users can post, react, comment, pin, and praise by permission |
| PRD-FLUENCE-04 | Provide search and AI chat | Search is tenant-scoped; AI chat references knowledge content when configured |

## Nonfunctional Requirements

| Category | Requirement |
|---|---|
| Security | No secrets in repo; JWT in httpOnly cookies; CSRF double-submit; RBAC and RLS enforced |
| Tenant isolation | Every tenant-aware table and query path must preserve tenant scope |
| Reliability | Scheduled jobs must be multi-pod safe or explicitly single-worker; outbox events must be durable |
| Performance | Hot reference data should use tenant-scoped Redis caches where existing patterns support it |
| Accessibility | Forms and labels must satisfy lint/a11y gates where enabled |
| Auditability | Regulated writes must emit audit/notification events where the local pattern requires it |
| Documentation | New features must update the relevant Obsidian note and feature traceability row |

## Product Acceptance Gates

- User can log in and land in My Space.
- App switcher exposes only accessible apps unless Super Admin.
- Each sub-app has at least one validated happy path and one permission-denied path.
- Public/token flows work without exposing authenticated product routes.
- Tenant isolation is verified through RLS tests or runtime proof before production claims.
- PRD scope maps to [[Feature-Traceability]] and [[Route-Map-Full]].

## Risks

- Current product breadth is large; pilot scope must be chosen deliberately.
- Route/page counts have drifted since the last exhaustive vault reconciliation.
- Some runbooks remain templated; operational procedures need real environment proof.
- Demo credential and deploy-config risks must be checked before production use.

## Related

- [[Application-Map]]
- [[Product-Architecture]]
- [[Work-Breakdown-Structure]]
- [[User-Manual]]
- [[Security-Audit]]
- [[Readiness-Session-2026-06-18]]
