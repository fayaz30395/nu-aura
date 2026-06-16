# NU-AURA Documentation

Index of the NU-AURA documentation set. NU-AURA is a multi-tenant bundle-app HR platform
with four sub-applications (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence), built on a Spring Boot
(Java 21) backend and a Next.js 14 (App Router) frontend.

> Using Obsidian? Start from [Home.md](./Home.md) for the wikilink-based map of content.

## Architecture

How the system is shaped.

| Document | What it covers |
|----------|----------------|
| [Architecture Overview](./architecture/README.md) | Big-picture system overview and how the pieces fit together |
| [Backend Architecture](./architecture/backend.md) | Backend layering (api / application / domain / infrastructure), DDD |
| [Frontend Architecture](./architecture/frontend.md) | Frontend structure (App Router, state management, data fetching) |
| [Data Flow](./architecture/data-flow.md) | How a request flows end-to-end across the stack |

## Reference

Concrete catalogs.

| Document | What it covers |
|----------|----------------|
| [API Reference](./reference/api.md) | Catalog of REST endpoints and controllers |
| [Database Reference](./reference/database.md) | Tables, entities, and the schema map |
| [Migrations Reference](./reference/migrations.md) | Flyway migration history and conventions |

## Patterns

Reusable approaches.

| Document | What it covers |
|----------|----------------|
| [Code Patterns](./patterns/README.md) | Existing code patterns (Redis, RLS, Kafka, caching, etc.) |

## Setup

Getting running.

| Document | What it covers |
|----------|----------------|
| [Setup Guide](./setup/README.md) | Local environment setup, ports, and run instructions |

## Apps

The four sub-applications.

| Document | What it covers |
|----------|----------------|
| [NU-HRMS](./apps/nu-hrms.md) | Core HR — employees, payroll, attendance, leave |
| [NU-Hire](./apps/nu-hire.md) | Recruitment — agencies, scorecards, onboarding, e-sign |
| [NU-Grow](./apps/nu-grow.md) | Performance & learning — reviews, OKRs, LMS, surveys |
| [NU-Fluence](./apps/nu-fluence.md) | Knowledge — wiki, blogs, templates, search, wall |

## Routing rule

Before designing anything, check **Architecture** for prior structure. Before implementing
anything, check **Patterns** for an existing approach. Before touching the schema, read the
**Reference** maps (`database`, `migrations`). Before running locally, read **Setup**.
