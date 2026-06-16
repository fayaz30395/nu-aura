---
title: NU-AURA — Knowledge Vault Home
tags: [home, moc, index]
updated: 2026-06-16
---

# NU-AURA Knowledge Vault

> Map of Content (MOC) for the NU-AURA platform — a multi-tenant, bundle-app HR/People platform with four sub-applications on a shared Spring Boot + Next.js core. Every note below is evidence-based (verified against code on 2026-06-16); links use Obsidian wikilinks and resolve by note name across folders.

## What this is

NU-AURA bundles **four sub-apps** on **one shared platform**:

| Sub-app | Domain | Note |
|---------|--------|------|
| NU-HRMS | Core HR (employees, attendance, leave, payroll/expense, assets, org, contracts, letters, loans) | [[Nu-HRMS]] |
| NU-Hire | Recruitment, agencies, scorecards, onboarding, career page, e-sign | [[Nu-Hire]] |
| NU-Grow | Reviews, OKRs, 360 feedback, LMS, training, surveys, wellness | [[Nu-Grow]] |
| NU-Fluence | Wiki, blogs, templates, search, AI chat, social wall | [[Nu-Fluence]] |
| Shared platform | Auth, RBAC, notifications, integrations, feature flags, multi-tenancy, storage | [[Shared-Platform]] |

## Platform at a glance (verified 2026-06-16)

- **Backend:** Java 21, Spring Boot 3.5.14, DDD layering (`api → application → domain → infrastructure + common`) — **184** controllers, **257** services, **288** repositories, **17** scheduled jobs, **7** Kafka consumers. See [[System-Overview]], [[APIs]], [[Services]].
- **Frontend:** Next.js 16 App Router, React 19, TypeScript strict, Mantine 9, Tailwind, TanStack Query v5 — **283** pages, **170** components, **93** generated query-hook surfaces. See [[Routes]], [[Pages]], [[Components]].
- **Data:** PostgreSQL (Neon dev / PG 16 prod), **~331** tables, Flyway **V0–V294** (286 files), multi-tenant via Row-Level Security. See [[Schema]], [[ERD]].
- **Platform substrate:** Redis 7 (cache tiers, rate limiting, locks, idempotency, WS relay), Kafka, Elasticsearch 8.11, Google Drive storage, Google OAuth.
- **Access control:** **26 roles** (19 explicit + 7 implicit), enforced by a custom `@RequiresPermission` (190 sites) interceptor/aspect. See [[Roles]], [[Permissions]], [[RBAC-Matrix]].

## Navigate by role

- **New developer** → start at [[System-Overview]] → [[Routes]] / [[APIs]] → [[QA-Strategy]] → run it with the [Setup guide](../setup/README.md).
- **Architect** → [[System-Overview]] → [[C4-Context]] → [[C4-Container]] → [[C4-Component]] → [[Architecture-Decisions]] → [[ADR-001]]…[[ADR-005]].
- **Frontend** → [[Routes]] · [[Pages]] · [[Components]].
- **Backend** → [[APIs]] · [[Services]] · [[Middleware]].
- **Security / audit** → [[Security-Audit]] · [[RBAC-Matrix]] · [[Roles]] · [[Permissions]] · [[Data-Flows]].
- **DBA** → [[Schema]] · [[ERD]] · [migrations index](../reference/migrations.md).
- **DevOps / SRE** → [[Deployment]] · [[CI-CD]] · [[Production-Support]] · [[Incident-Response]].
- **QA** → [[QA-Strategy]] · [[Test-Coverage]].
- **AI agents** → [[System-Flows]] · [[Module-Relationships]] · [[Data-Flows]] and the repo-root `AGENTS.md`.

## Vault structure

```dataview-or-static
00-Home                     ← you are here
01-Architecture/   System-Overview · Architecture-Decisions · C4-Context · C4-Container · C4-Component
02-Modules/        Nu-HRMS · Nu-Hire · Nu-Grow · Nu-Fluence · Shared-Platform
03-Frontend/       Routes · Pages · Components
04-Backend/        APIs · Services · Middleware
05-RBAC/           Roles · Permissions · RBAC-Matrix
06-Database/        Schema · ERD
07-DevOps/         Deployment · CI-CD
08-Security/       Security-Audit
09-Testing/        QA-Strategy · Test-Coverage
10-Runbooks/       Production-Support · Incident-Response
11-Decisions/      ADR-001 … ADR-005
12-Knowledge-Graph/ Module-Relationships · Data-Flows · System-Flows
```

## Architecture decisions

- [[ADR-001]] — DDD-layered Spring Boot monolith
- [[ADR-002]] — Multi-tenancy via PostgreSQL Row-Level Security
- [[ADR-003]] — Redis as the coordination substrate
- [[ADR-004]] — Contract-first API (OpenAPI → Orval typed clients)
- [[ADR-005]] — JWT-in-httpOnly-cookie auth (roles only; permissions from DB+Redis)

## Cross-cutting flows

- [[Data-Flows]] — request lifecycle, login/refresh, Kafka eventing, cache-aside, Drive upload
- [[System-Flows]] — hire→onboard→lifecycle, leave→approval→payroll, review cycle, notification fan-out
- [[Module-Relationships]] — how the sub-apps and platform services depend on each other

## Source-of-truth docs (outside the vault)

This vault is the *navigable* layer. The flat reference docs remain authoritative for exhaustive detail:
- Doc index: [docs/README.md](../README.md) · Obsidian-flavored map: [docs/Home.md](../Home.md)
- API reference (endpoint-level): [docs/reference/api.md](../reference/api.md)
- Database reference: [docs/reference/database.md](../reference/database.md) · Migration index: [docs/reference/migrations.md](../reference/migrations.md)
- Patterns: [docs/patterns/README.md](../patterns/README.md) · Setup: [docs/setup/README.md](../setup/README.md)
- Coverage of this vault: [[Documentation-Coverage-Report]]

## Conventions

- **Evidence-based.** Claims cite real file paths; where a fact is sampled, inferred, or templated, the note says so explicitly.
- **Counts** are point-in-time (2026-06-16) and will drift — re-measure before quoting in a release.
- **Wikilinks** resolve by basename; the same `[[Note]]` works from any folder.
