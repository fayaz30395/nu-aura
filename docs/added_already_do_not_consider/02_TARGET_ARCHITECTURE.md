# Target Architecture

## 1. Modular Monolith Standard
- Domain-driven separation of boundaries, keeping the app unified but strictly package-by-feature.
- Dependencies flow inwards: Core/Common -> Module Domain -> Application layer.
- Ensure cross-module calls utilize explicit Internal APIs (Services/Interfaces) without direct Repository injections.

## 2. PostgreSQL Redesign Strategy
- **SaaS Readiness:** Strict row-level isolation using `tenant_id` (UUID).
- **Audit Trails:** Comprehensive `created_at`, `updated_at`, `created_by`, `updated_by`, and `version` columns.
- **Soft Deletes:** `is_deleted` BOOLEAN flag on all entities (enables point-in-time recovery and compliance without breaking relationships).
- **Enforcement:** Implementation uses Hibernate `@SQLRestriction("is_deleted = false")` globally on all soft-deleted entities, and `@TenantId` (Hibernate 6) for transparent row filtering.

## 3. RBAC Design
- Move entirely to a dynamic data-driven authorization approach.
- Tables: `roles`, `permissions`, `role_permissions`.
- Method-level Spring Security (`@PreAuthorize("hasPermission('module', 'action')")`).

## Status:
Target Architecture defined. Proceeding to implement PostgreSQL redesign.
