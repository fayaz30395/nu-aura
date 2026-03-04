# Rapid Audit & Findings

## 1. Project Structure & Dependency Audit
- **Modules**: The project uses a Maven multi-module structure (`common`, `pm`, `backend`), adhering to the 'Modular Monolith' principle.
- **ORM / Persistence**: Uses Spring Data JPA. `BaseEntity` correctly implements required audit fields (`id`, `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `version`, `is_deleted`).
- **Migration Tool**: Currently using **Liquibase**. **Finding**: `requirements.md` mandates Flyway. Liquibase needs to be replaced with Flyway or requirements updated.
- **Security Check**: `SecurityConfig` is present, JWT token logic exists, but Rate Limiting (Bucket4j) config is just properties, needs actual filter implementation. Spring Security needs further hardening for strict RBAC methods (`@PreAuthorize`).
- **DevOps**: Dockerfile and docker-compose configurations are present but might need optimization for production caching and security (non-root users).
- **PostgreSQL**: Entities exist, but we need to ensure indexing for `tenant_id` and `is_deleted` everywhere to support multi-tenancy and soft deletes efficiently.

## 2. Gap Analysis vs Requirements
1. **Flyway Migration**: Not implemented (using Liquibase).
2. **RBAC**: Matrix RBAC property exists, but full `@PreAuthorize("hasAuthority('...')")` coverage and custom `PermissionEvaluator` need verification.
3. **Multi-tenancy**: `TenantIdentifierResolver` is configured in JPA, which is correct for schema/discriminator column based multi-tenancy.
4. **Performance**: Needs validation against N+1 queries. `spring.jpa.properties.hibernate.session.events.log.LOG_QUERIES_SLOWER_THAN_MS` is a good start.

## Next Steps in Execution Order
Moving to **Step 2: Target Architecture** & **Step 3: PostgreSQL Schema Redesign**.
