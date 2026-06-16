---
title: NU-AURA — Knowledge Vault Home
tags: [home, moc, index]
updated: 2026-06-16
---

# NU-AURA Knowledge Vault

> Map of Content (MOC) for the NU-AURA platform — a multi-tenant, bundle-app HR/People platform with four sub-applications on a shared Spring Boot + Next.js core. Every note below is evidence-based (verified against code on 2026-06-16); links use Obsidian wikilinks and resolve by note name across folders. This vault is now the **single canonical knowledge base** — the former flat docs (`architecture/`, `reference/`, `apps/`, `patterns/`, `setup/`) have been merged in and retired.

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

- **Backend:** Java 21, Spring Boot 3.5.14, DDD layering (`api → application → domain → infrastructure + common`) — **184** controllers, **257** services, **288** repositories, **25** scheduled jobs (24 ShedLock-guarded), **7** Kafka consumers. See [[System-Overview]], [[APIs]], [[Services]], [[Scheduled-Jobs]].
- **Frontend:** Next.js 16 App Router, React 19, TypeScript strict, Mantine 9, Tailwind, TanStack Query v5 — **283** pages, **170** components, **93** generated query-hook surfaces. See [[Routes]], [[Pages]], [[Components]].
- **Data:** PostgreSQL (Neon dev / PG 16 prod), **~331** tables, Flyway **V0–V294** (286 files), multi-tenant via Row-Level Security. See [[Schema]], [[ERD]], [[Migrations]].
- **Platform substrate:** Redis 7 (cache tiers, rate limiting, locks, idempotency, WS relay), Kafka, Elasticsearch 8.11, Google Drive storage, Google OAuth. See [[Code-Patterns]].
- **Access control:** **26 roles** (19 explicit + 7 implicit), enforced by a custom `@RequiresPermission` (190 sites) interceptor/aspect. See [[Roles]], [[Permissions]], [[RBAC-Matrix]].

## Navigate by role

- **New developer** → start at [[System-Overview]] → [[Routes]] / [[APIs]] → [[QA-Strategy]] → run it with [[Local-Setup]].
- **Architect** → [[System-Overview]] → [[C4-Context]] → [[C4-Container]] → [[C4-Component]] → [[Architecture-Decisions]] → [[ADR-001]]…[[ADR-005]].
- **Frontend** → [[Routes]] · [[Pages]] · [[Components]].
- **Backend** → [[APIs]] · [[Services]] · [[Middleware]] · [[Scheduled-Jobs]] · [[Code-Patterns]].
- **Security / audit** → [[Security-Audit]] · [[RBAC-Matrix]] · [[Roles]] · [[Permissions]] · [[Data-Flows]].
- **DBA** → [[Schema]] · [[ERD]] · [[Migrations]].
- **DevOps / SRE** → [[Deployment]] · [[CI-CD]] · [[Local-Setup]] · [[Production-Support]] · [[Incident-Response]].
- **QA** → [[QA-Strategy]] · [[Test-Coverage]].
- **AI agents** → [[System-Flows]] · [[Module-Relationships]] · [[Data-Flows]] and the repo-root `AGENTS.md`.

## Full map of content

Every note in the vault, grouped by numbered section.

### 01 — Architecture
- [[System-Overview]] — platform shape, DDD layers, employee vertical slice
- [[Architecture-Decisions]] — decision summary and rationale
- [[C4-Context]] — system context (people + external systems)
- [[C4-Container]] — containers (frontend, backend, data stores, brokers)
- [[C4-Component]] — component view inside the backend
- [[Code-Patterns]] — reusable cross-cutting backend patterns (Redis, RLS, Kafka, locks, rate limiting)

### 02 — Modules
- [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]] · [[Shared-Platform]]

### 03 — Frontend
- [[Routes]] · [[Pages]] · [[Components]]

### 04 — Backend
- [[APIs]] · [[Services]] · [[Middleware]] · [[Scheduled-Jobs]]

### 05 — RBAC
- [[Roles]] · [[Permissions]] · [[RBAC-Matrix]]

### 06 — Database
- [[Schema]] · [[ERD]] · [[Migrations]]

### 07 — DevOps
- [[Deployment]] · [[CI-CD]] · [[Local-Setup]]

### 08 — Security
- [[Security-Audit]]

### 09 — Testing
- [[QA-Strategy]] · [[Test-Coverage]]

### 10 — Runbooks
- [[Production-Support]] · [[Incident-Response]]

### 11 — Decisions (ADRs)
- [[ADR-001]] · [[ADR-002]] · [[ADR-003]] · [[ADR-004]] · [[ADR-005]]

### 12 — Knowledge Graph
- [[Module-Relationships]] · [[Data-Flows]] · [[System-Flows]]

### Meta
- [[Documentation-Coverage-Report]] — what the vault covers, metrics it was built from, discrepancies, and gaps

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

## Conventions

- **Evidence-based.** Claims cite real file paths; where a fact is sampled, inferred, or templated, the note says so explicitly.
- **Counts** are point-in-time (2026-06-16) and will drift — re-measure before quoting in a release.
- **Wikilinks** resolve by basename; the same `[[Note]]` works from any folder.
- **GitHub readers** without Obsidian should enter via [docs/README.md](../README.md), which links into this vault with relative paths.
