# NU-AURA Documentation

Index of the NU-AURA documentation set. NU-AURA is a multi-tenant bundle-app HR platform
with four sub-applications (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence), built on a Spring Boot
(Java 21) backend and a Next.js 16 (App Router) frontend.

All documentation now lives in the **Obsidian knowledge vault** at
[`docs/obsidian/`](./obsidian/). The former flat docs (`architecture/`, `reference/`,
`apps/`, `patterns/`, `setup/`) have been merged into the numbered sections below and
retired. The links here are plain relative links that render on GitHub; if you use Obsidian,
start from [`obsidian/00-Home.md`](./obsidian/00-Home.md) for the wikilink-based map of content.

## 01 — Architecture

How the system is shaped.

| Document | What it covers |
|----------|----------------|
| [System Overview](./obsidian/01-Architecture/System-Overview.md) | Big-picture platform shape, DDD layers, employee vertical slice |
| [Architecture Decisions](./obsidian/01-Architecture/Architecture-Decisions.md) | Decision summary and rationale |
| [C4 — Context](./obsidian/01-Architecture/C4-Context.md) | System context (people + external systems) |
| [C4 — Container](./obsidian/01-Architecture/C4-Container.md) | Containers (frontend, backend, data stores, brokers) |
| [C4 — Component](./obsidian/01-Architecture/C4-Component.md) | Component view inside the backend |
| [Code Patterns](./obsidian/01-Architecture/Code-Patterns.md) | Reusable backend patterns (Redis, RLS, Kafka, caching, locks) |

## 02 — Modules

The four sub-applications plus the shared platform.

| Document | What it covers |
|----------|----------------|
| [NU-HRMS](./obsidian/02-Modules/Nu-HRMS.md) | Core HR — employees, payroll, attendance, leave |
| [NU-Hire](./obsidian/02-Modules/Nu-Hire.md) | Recruitment — agencies, scorecards, onboarding, e-sign |
| [NU-Grow](./obsidian/02-Modules/Nu-Grow.md) | Performance & learning — reviews, OKRs, LMS, surveys |
| [NU-Fluence](./obsidian/02-Modules/Nu-Fluence.md) | Knowledge — wiki, blogs, templates, search, wall |
| [Shared Platform](./obsidian/02-Modules/Shared-Platform.md) | Auth, RBAC, notifications, integrations, multi-tenancy, storage |

## 03 — Frontend

| Document | What it covers |
|----------|----------------|
| [Routes](./obsidian/03-Frontend/Routes.md) | App Router route map and segments |
| [Pages](./obsidian/03-Frontend/Pages.md) | Page inventory and patterns |
| [Components](./obsidian/03-Frontend/Components.md) | Component catalog |

## 04 — Backend

| Document | What it covers |
|----------|----------------|
| [APIs](./obsidian/04-Backend/APIs.md) | REST endpoint / controller catalog |
| [Services](./obsidian/04-Backend/Services.md) | Application services and scheduled jobs |
| [Middleware](./obsidian/04-Backend/Middleware.md) | Security filter chain, interceptors, aspects |

## 05 — RBAC

| Document | What it covers |
|----------|----------------|
| [Roles](./obsidian/05-RBAC/Roles.md) | Role hierarchy (26 roles) |
| [Permissions](./obsidian/05-RBAC/Permissions.md) | `@RequiresPermission` enforcement model |
| [RBAC Matrix](./obsidian/05-RBAC/RBAC-Matrix.md) | Role-to-permission default grants |

## 06 — Database

| Document | What it covers |
|----------|----------------|
| [Schema](./obsidian/06-Database/Schema.md) | Tables, entities, and the schema map |
| [ERD](./obsidian/06-Database/ERD.md) | Core entity-relationship diagrams |
| [Migrations](./obsidian/06-Database/Migrations.md) | Flyway migration history and conventions |

## 07 — DevOps

| Document | What it covers |
|----------|----------------|
| [Deployment](./obsidian/07-DevOps/Deployment.md) | Build, containers, and deploy targets |
| [CI/CD](./obsidian/07-DevOps/CI-CD.md) | Pipeline workflows |
| [Local Setup](./obsidian/07-DevOps/Local-Setup.md) | Local environment setup, ports, and run instructions |

## 08 — Security

| Document | What it covers |
|----------|----------------|
| [Security Audit](./obsidian/08-Security/Security-Audit.md) | Controls, headers, and known findings |

## 09 — Testing

| Document | What it covers |
|----------|----------------|
| [QA Strategy](./obsidian/09-Testing/QA-Strategy.md) | Test strategy and pyramid |
| [Test Coverage](./obsidian/09-Testing/Test-Coverage.md) | Coverage metrics and gaps |

## 10 — Runbooks

| Document | What it covers |
|----------|----------------|
| [Production Support](./obsidian/10-Runbooks/Production-Support.md) | Operational support procedures |
| [Incident Response](./obsidian/10-Runbooks/Incident-Response.md) | Incident handling and escalation |

## 11 — Decisions (ADRs)

| Document | What it covers |
|----------|----------------|
| [ADR-001](./obsidian/11-Decisions/ADR-001.md) | DDD-layered Spring Boot monolith |
| [ADR-002](./obsidian/11-Decisions/ADR-002.md) | Multi-tenancy via PostgreSQL Row-Level Security |
| [ADR-003](./obsidian/11-Decisions/ADR-003.md) | Redis as the coordination substrate |
| [ADR-004](./obsidian/11-Decisions/ADR-004.md) | Contract-first API (OpenAPI → Orval typed clients) |
| [ADR-005](./obsidian/11-Decisions/ADR-005.md) | JWT-in-httpOnly-cookie auth |

## 12 — Knowledge Graph

| Document | What it covers |
|----------|----------------|
| [Module Relationships](./obsidian/12-Knowledge-Graph/Module-Relationships.md) | How sub-apps and platform services depend on each other |
| [Data Flows](./obsidian/12-Knowledge-Graph/Data-Flows.md) | Request lifecycle, login/refresh, Kafka, cache-aside, Drive upload |
| [System Flows](./obsidian/12-Knowledge-Graph/System-Flows.md) | Hire→onboard, leave→payroll, review cycle, notification fan-out |

## Meta

| Document | What it covers |
|----------|----------------|
| [Home (MOC)](./obsidian/00-Home.md) | Obsidian entry point and wikilink map of content |
| [Documentation Coverage Report](./obsidian/Documentation-Coverage-Report.md) | What the vault covers, metrics, discrepancies, and gaps |

## Routing rule

Before designing anything, check **01 — Architecture** for prior structure. Before
implementing anything, check **Code Patterns** for an existing approach. Before touching the
schema, read **06 — Database** (`Schema`, `Migrations`). Before running locally, read
**Local Setup**.
