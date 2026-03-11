# Target Architecture & Architecture Design Document

## 1. Core Architectural Principles
- **Pattern**: Modular Monolith (Package-by-Feature), specifically structured under `com.hrms`.
- **Layering**: Controller -> Service -> Domain -> Repository. Strict boundaries enforced via ArchUnit.
- **Microservices**: Only allowed if strictly justified (e.g., highly scalable PDF generation or ML model inference). The core remains monolithic.
- **Tenancy**: Single-database, Row-Level Security / Discriminator Column (`tenant_id`) approach. JPA abstracts this via `TenantIdentifierResolver`.

## 2. PostgreSQL Design & Indexing Strategy
- **Base Entity**: Uses UUIDs for PKs. Every entity includes `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `version` (optimistic locking), and `is_deleted` (soft delete).
- **Indexing**: 
  - Composite indexes combining `(tenant_id, is_deleted)`.
  - Partial indexes (e.g., `WHERE is_deleted = false`) on frequently searched columns like `email` or `status`.
- **Migrations**: **Flyway** is the designated schema migration tool, ensuring reproducible, versioned schema states across environments.

## 3. High-Security & Enterprise RBAC
- **Authentication**: JWT-based (Access + Refresh tokens). Refresh token rotation enforced. Session lockout after failed attempts.
- **Authorization**: Granular, data-driven Matrix RBAC. 
  - Required DB tables: `role`, `permission`, `role_permission`, `user_role`.
  - Enforced via `@PreAuthorize("hasAuthority('domain.action')")`.
- **Logging**: Mandatory audit logging for mutations, stored and observable via structured JSON logging.

## 4. API & Rate Limiting Strategy
- **API Versioning**: Enforced via headers (`Accept: application/vnd.hrms.v1+json`) or URI (`/api/v1/`).
- **Rate Limiting**: Configured bucket capacities for `/api/auth/` (strict), `/api/` (general), and export/reporting (highly restricted).

## 5. Extensible Modules (e.g., Payroll)
- **Payroll**: Structured with interfaces for custom tax components and compliance hooks without touching core execution logic.

## 6. Observability
- **Metrics**: Exposed via `/actuator/prometheus`.
- **Distributed Tracing**: Standard HTTP correlation IDs injected into Logback MDC context.

## 7. Frontend UI/UX
- Feature-based structure (`src/features/...`).
- Usage of Skeleton Loaders, Empty States, and dynamic rendering limits to ensure "Enterprise Polish".
