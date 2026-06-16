---
title: NU-Hire
tags: [module, nu-hire]
---

# NU-Hire

> Recruitment & joining sub-app of [[System-Overview|NU-AURA]]. Covers the full talent
> funnel from a public job posting to a new joiner converted into an [[Nu-HRMS|HRMS]]
> employee. Siblings: [[Nu-Grow]], [[Nu-Fluence]]. Cross-cutting services in
> [[Shared-Platform]]. Grounding doc: `docs/apps/nu-hire.md`.

## Purpose

NU-Hire is the applicant-tracking + onboarding sub-application: requisitions, candidate
pipeline (ATS), interviews & scorecards, public careers, agencies & job boards, AI
recruitment assist, preboarding, onboarding checklists, and e-signature. The frontend hub is
declared "NU-Hire" in the sidebar (`frontend/components/layout/menuSections.tsx:495-652`).

## Business Capability

- **Requisitions & pipeline** — open roles, candidate stages, kanban, per-job boards.
- **Structured hiring** — interview scheduling, scorecard templates & evaluations.
- **External sourcing** — public career page (multipart resume apply), partner agencies,
  job-board syndication.
- **AI augmentation** — resume parse, match score, JD generation, candidate ranking,
  interview-question generation, feedback synthesis.
- **Joining** — preboarding candidate portal, template-driven onboarding tasks, probation,
  background verification, **employee conversion into [[Nu-HRMS]]**.
- **E-signature** — offer/contract signing (internal approvers + external token flow).
- **Referrals** — employee referral submissions and bonus lifecycle.

## Entry Points

### Key frontend routes (`frontend/app/...`)

| Route | Purpose | Auth |
|-------|---------|------|
| `/recruitment` | Dashboard (stats, candidates-needing-attention) | role + `RECRUITMENT_VIEW` |
| `/recruitment/jobs`, `/recruitment/candidates`, `/recruitment/candidates/[id]` | Requisitions, candidate list/detail | authenticated |
| `/recruitment/candidates/[id]/offer` | Offer-letter creation | authenticated |
| `/recruitment/pipeline`, `/recruitment/kanban`, `/recruitment/[jobId]/kanban` | Pipeline / boards | authenticated |
| `/recruitment/interviews`, `/recruitment/scorecards` | Interviews, scorecard CRUD | authenticated |
| `/recruitment/agencies`, `/recruitment/agencies/[id]`, `/recruitment/job-boards` | Agencies, syndication | authenticated |
| `/careers`, `/careers` apply | Public job board + application | **public** (`publicApiClient`) |
| `/sign/[token]` | External e-signature signing | **public** (token-scoped) |
| `/onboarding`, `/onboarding/new`, `/onboarding/[id]`, `/onboarding/templates` | Onboarding processes & templates | authenticated |
| `/offboarding` (+ `/[id]`, `/fnf`, `/exit`) | Exit, full-and-final | authenticated |
| `/referrals`, `/offer-portal` | Referrals, offer portal | `REFERRAL_VIEW` / `RECRUITMENT_VIEW` |

Dashboard roles: `SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, RECRUITMENT_ADMIN`
(`recruitment/page.tsx:40`). Scorecards uses **Orval-generated** hooks
(`lib/generated/api/scorecard-controller/`); other surfaces use `lib/hooks/queries/useRecruitment.ts`.
See [[Pages]], [[Routes]], [[Components]].

### Backend controllers / packages (`backend/src/main/java/com/nulogic/api/...`)

| Domain | Controllers (base path) |
|--------|-------------------------|
| `recruitment` | `RecruitmentController` (`/recruitment`), `ApplicantController` (`/recruitment/applicants`), `AgencyController` (`/recruitment/agencies`), `ScorecardController` (`/recruitment/scorecards`), `JobBoardController` (`/recruitment/job-boards`), `AIRecruitmentController` (`/recruitment/ai`) |
| `publicapi` | `PublicCareerController` (`/public/careers` — unauthenticated) |
| `preboarding` | `PreboardingController` (`/preboarding`; portal `/portal/{token}/*`, `/candidates/{id}/convert`) |
| `onboarding` | `OnboardingManagementController` (`/onboarding`; processes, templates, tasks) |
| `esignature` | `ESignatureController` (`/esignature`; requests, approvals, `/external/{token}/sign`) |
| `referral` | `ReferralController` (`/referrals`; bonus lifecycle, policies) |
| `probation` / `bgv` / `exit` | probation evaluations, background verification, offboarding |

Domain entities under `com/nulogic/domain/{recruitment,onboarding,preboarding,esignature,referral,probation,bgv}/`.
See [[APIs]], [[Services]].

## Dependencies

- **[[Nu-HRMS]]** — the preboarding `/convert` endpoint promotes a `PreboardingCandidate`
  into an HRMS employee; offer letters reuse HRMS `letterService` + letter templates.
- **Auth / RBAC** — recruitment permission cluster ([[Permissions]], [[Roles]],
  [[RBAC-Matrix]]); public careers + external sign bypass auth via dedicated public/token paths.
- **Multi-tenancy / RLS** — same `TenantContext` + RLS model as the platform ([[Middleware]]).
- **E-signature / DocuSign** — internal e-sign plus optional DocuSign integration ([[Shared-Platform]]).
- **File storage** — Google Drive for resumes, signed documents.
- **Kafka / Notifications** — interview invites, offer status, onboarding task reminders.

## Technical Flow — offer → sign → preboard → onboard → employee

```mermaid
flowchart LR
    A[Candidate SELECTED] -->|POST /recruitment/candidates/id/offer| B[OFFER_EXTENDED]
    B -->|POST /esignature/requests + /send| C[/sign/token external/]
    C -->|POST /esignature/external/token/sign| D[OFFER_ACCEPTED]
    D --> E[PreboardingCandidate]
    E -->|portal: info, bank, docs, sign-offer| F[/preboarding/portal/token/]
    F -->|POST /preboarding/candidates/id/convert| G[HRMS Employee]
    G --> H[OnboardingProcess + template tasks]
    H --> I[Probation / BGV]
```

## Ownership

Self-assessed — no formal owners in the repo. Functionally owned alongside HR/recruitment;
the conversion boundary is shared with [[Nu-HRMS]].

## Related Links

- [[System-Overview]] · [[C4-Container]] · [[Module-Relationships]] · [[Data-Flows]] · [[System-Flows]]
- Siblings: [[Nu-HRMS]] (conversion destination) · [[Nu-Grow]] · [[Nu-Fluence]]
- Platform: [[Shared-Platform]] · [[Middleware]] · [[Roles]] · [[Permissions]] · [[RBAC-Matrix]] · [[Schema]] · [[ERD]] · [[APIs]] · [[Services]] · [[Pages]] · [[Routes]] · [[Components]] · [[Security-Audit]]
- Grounding: `docs/apps/nu-hire.md`

## Risks

- **Public attack surface** — `/careers` apply and `/sign/[token]` are unauthenticated;
  multipart resume upload + token-scoped signing need strict validation and rate limiting.
- **Token e-sign integrity** — external signing tokens must be single-use, expiring, and
  tenant-bound; a leak signs on behalf of a candidate. See [[Security-Audit]].
- **AI recruitment** — resume parsing / ranking can encode bias and leak PII to the LLM;
  outputs are advisory, not authoritative.
- **Conversion correctness** — preboarding→employee `/convert` must be idempotent to avoid
  duplicate employee records in [[Nu-HRMS]].

## Operational Notes

- `RecruitmentManagementController.java.disabled` exists but is **not active** — do not wire to it.
- Careers/public traffic uses `publicApiClient`; ensure CSP/headers cover the public origin.
- Onboarding tasks are template-driven; batch task creation was an N+1 hotspot (remediated).
- Scorecards is the canonical example of an Orval-generated client in the frontend.
