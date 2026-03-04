# Enterprise HRMS -- Audit-Grade Production Requirements

## Project Context

Stack: - Backend: Spring Boot - Frontend: React - Database: PostgreSQL
Stage: Development (Pre-Production)

This system must be production-ready, audit-grade, enterprise-hardened,
and multi-tenant ready (currently single-tenant: nu-tenant).

Backward compatibility is NOT required. Design for long-term scalability
and compliance.

------------------------------------------------------------------------

## 1. Architectural Principles

-   Modular Monolith (Package-by-Feature)
-   Strict Layering: Controller → Service → Domain → Repository
-   DTO and Entity separation
-   Global Exception Handling
-   Centralized Validation
-   Flyway Migrations
-   OpenAPI Documentation
-   Soft Deletes where appropriate
-   Optimistic Locking
-   Pagination enforced
-   Redis Caching Layer
-   Async Processing for heavy jobs
-   Standard API response wrapper

Microservices are NOT allowed unless strictly justified.

------------------------------------------------------------------------

## 2. PostgreSQL Requirements

All business tables MUST include:

-   id (UUID)
-   tenant_id
-   created_at
-   updated_at
-   created_by
-   updated_by
-   version
-   is_deleted (if soft delete applies)

Indexing Strategy: - Composite indexes where needed - Partial indexes
for non-deleted rows - High-read entity optimization - Proper foreign
key constraints

Performance: - No N+1 queries - Query projections for heavy reads -
Enforced pagination - HikariCP tuning - Appropriate isolation levels

------------------------------------------------------------------------

## 3. Multi-Tenancy (Future Ready)

Even though currently single-tenant: - tenant_id must exist in all
business tables - TenantContext abstraction required - Repository-level
tenant filtering - Design must support clean migration to multi-tenant
SaaS

Do NOT overengineer for current stage.

------------------------------------------------------------------------

## 4. Enterprise RBAC (Mandatory, Audit-Grade)

RBAC must be fully data-driven.

Required Tables: - role - permission - role_permission - user_role -
permission_category (optional)

Permissions must be atomic: - employee.read - employee.write -
leave.approve - payroll.generate - payroll.approve - role.manage -
settings.update

Backend: - Spring Security method-level enforcement - Custom
PermissionEvaluator - Redis-cached permission sets - No hardcoded admin
bypass - Audit trail for: - Login - Role changes - Permission changes -
Payroll approval - Leave approval - Employee updates

Frontend: - Permission-aware routing - Hide UI actions without
permission - Backend remains source of truth

------------------------------------------------------------------------

## 5. Security (High-Security Mode)

Authentication: - JWT Access Token - Refresh Token with rotation -
Expiry handling - BCrypt password hashing - Account lockout policy

Protection: - CSRF (if cookie-based) - Strict CORS - Rate limiting (auth
endpoints mandatory) - Input validation everywhere - Sanitized error
responses - Field-level encryption for PII (where appropriate)

Audit logging mandatory for all critical mutations.

------------------------------------------------------------------------

## 6. Performance Requirements

Backend: - Fetch joins / entity graphs to avoid N+1 - Redis caching
for: - Permission sets - Organization settings - Async processing for: -
Payroll - Reports - Notifications - Max page size enforcement

Frontend: - Code splitting - Lazy routes - Virtualized tables -
Debounced search - Memoization for expensive components

------------------------------------------------------------------------

## 7. Payroll Extensibility (India-Ready)

Payroll must be extensible.

Design must include: - salary_component table - tax_component
abstraction - payroll_rule interface - Rule execution engine hook -
Configurable payroll cycles - Pluggable compliance layer

Compliance rules must be extendable without rewriting payroll core.

------------------------------------------------------------------------

## 8. UI/UX -- Enterprise Polish Mode

Frontend must implement:

-   Feature-based folder structure
-   Central API abstraction layer
-   Protected routes
-   Role-based navigation
-   Global error boundary
-   Toast notification system
-   Reusable form abstraction
-   Reusable table abstraction
-   Design tokens (colors, spacing, typography)

UI must include: - Modern KPI dashboard - Clean sidebar navigation -
Collapsible layout - Skeleton loaders - Empty states - Consistent
spacing - Executive-grade visual polish - Mobile responsiveness

------------------------------------------------------------------------

## 9. Observability & DevOps

Must include: - Structured JSON logging - Correlation IDs - Health
endpoint - Metrics endpoint - Backend Dockerfile - Frontend Dockerfile -
docker-compose - Environment separation - Production profile config -
CI/CD sample workflow - Backup strategy outline - API versioning
strategy

------------------------------------------------------------------------

## 10. Missing Core HR & Enterprise Capabilities

*Added Post-Review:* To achieve full enterprise parity, the system architecture and requirements must also accommodate:

-   **Core HR Modules:** Full lifecycle spanning Attendance (Geofencing/IP restricted), Leave (Multi-level approvals), Recruitment/ATS (Pipeline, E-Signature tracking), Performance (OKRs/360-degree reviews), and Project Resource Allocation (Timesheets/Utilization).
-   **Integrations:** Google Workspace OAuth 2.0 integration, MinIO/S3-compatible Object Storage for Document Management, and external payment gateway readiness.
-   **Security & Compliance:** GDPR-ready data privacy features (Data Residency, Right to be Forgotten), comprehensive OWASP top-10 hardening, and automated SLA breach escalations.
-   **Document & Asset Management:** E-signature generation, compliance tracking, and asset lifecycle tracking.

------------------------------------------------------------------------

## 11. Advanced Enterprise & Compliance Standards

To ensure audit-readiness and enterprise scale, the system must also conform to:

-   **Compliance Standards:** SOC2 Type II, ISO 27001, and GDPR compliance (Data Residency, Right to be Forgotten, PII Field-Level Encryption).
-   **Quality Gates & Testing:** Minimum 80% Unit Test coverage enforced via SonarQube; Automated E2E testing (Cypress/Playwright) for critical paths; SAST/DAST scanning in CI pipelines.
-   **API & Connectivity Strategy:** Strict API versioning strategy (e.g., v1/v2 via headers/URI), Rate Limiting per Tenant via API Gateway, Webhooks for third-party integrations, and WebSockets/SSE for real-time notifications.
-   **Business Continuity & DR:** Defined RPO/RTO metrics, automated multi-region backups, and immutable infrastructure configuration.
-   **Event-Driven Async Processing:** Use of message queues (e.g., RabbitMQ, Kafka, or Redis Pub/Sub) for decoupled asynchronous tasks like email dispatch, statement generation, and payroll processing.

------------------------------------------------------------------------

## 12. Execution Order

1.  Rapid Audit
2.  Target Architecture
3.  PostgreSQL Schema Redesign
4.  RBAC Implementation
5.  Security Hardening
6.  Performance Optimization
7.  Backend Refactor
8.  Frontend Redesign
9.  DevOps Hardening
10. Continue module-by-module implementation

Act as a CTO preparing for audit and investor review. Minimize
explanation. Focus on production-quality code and structure.
