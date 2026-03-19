# NU-AURA Platform — Code Review Report (Smells, Violations, Refactoring)

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Code Smells

### SMELL-1: God Services (High Priority)
**Location**: Multiple service classes

Several services handle too many responsibilities:

| Service | Est. Methods | Concern |
|---------|-------------|---------|
| EmployeeService | 30+ | CRUD + hierarchy + search + import + lifecycle |
| PayrollService | 25+ | Calculation + generation + approval + statutory + export |
| RecruitmentService | 20+ | Postings + applicants + pipeline + offers + job boards |
| PerformanceRevolutionService | 20+ | Reviews + cycles + calibration + PIP + competencies |

**Recommendation**: Extract sub-services (e.g., `EmployeeSearchService`, `EmployeeImportService`, `PayrollCalculationService`, `PayrollExportService`). Keep the main service as a facade.

### SMELL-2: DTO Explosion
**Location**: `com.hrms.api.*.dto`

Each controller package has 3-5 DTO classes. With 71 modules, that's ~330 DTOs. Many share similar structures (pagination, audit fields, tenant info).

**Recommendation**:
- Create shared base DTOs: `PagedResponse<T>`, `AuditableResponse`, `TenantAwareRequest`
- Use records instead of Lombok @Data classes for immutable DTOs (Java 17 supports records)
- Consider using OpenAPI spec generation to auto-generate DTOs

### SMELL-3: Inconsistent Pagination Response
**Location**: Multiple controllers

Some controllers return `Page<T>` (Spring Data), others return custom `PagedResponse<T>`, and some return raw `List<T>` without pagination.

**Recommendation**: Standardize on Spring Data `Page<T>` wrapped in a consistent response format. Add `max-page-size` validation (already configured as 100, but not enforced in all controllers).

### SMELL-4: Duplicate Validation Logic
**Location**: Backend DTOs + Frontend Zod schemas

Validation rules exist in both backend (`@NotNull`, `@Size`, `@Email`) and frontend (Zod schemas). These can diverge silently.

**Recommendation**: Accept this as necessary (defense in depth) but document shared validations in a central place. Consider generating Zod schemas from OpenAPI spec.

### SMELL-5: Long Controller Methods
**Location**: Some controllers have methods that do more than delegate to service.

**Example**: Controllers that handle file uploads, validation, response transformation, and error handling all in one method.

**Recommendation**: Controllers should only: validate input → call service → return response. Move all business logic to services.

---

## Violations

### VIOL-1: Missing @Transactional on Read Operations
**Severity**: Medium | **Location**: Various services

Some `findById`, `findAll` methods lack `@Transactional(readOnly = true)`. This means:
- No connection reuse within the method
- No consistent snapshot isolation
- JPA lazy loading may fail outside transaction

**Fix**: Add `@Transactional(readOnly = true)` to all read-only service methods.

### VIOL-2: N+1 Query Risk
**Severity**: Medium | **Location**: Entity relationships

JPA entities with `@OneToMany(fetch = FetchType.LAZY)` can trigger N+1 queries when iterating over collections in loops. While V9 migration added performance indexes, some query patterns may still trigger N+1.

**Detection**: Enable Hibernate statistics in dev profile and check query counts.

**Fix**: Use `@EntityGraph` or `JOIN FETCH` in repository queries where collections are needed.

### VIOL-3: Potential SQL Injection in Custom Queries
**Severity**: Low (mitigated) | **Location**: `@Query` annotations

All `@Query` annotations appear to use parameterized queries (`:param` style). However, any string concatenation in custom query building (Specifications, Criteria API) should be verified.

**Recommendation**: Audit all `Specification` implementations to ensure no string concatenation of user input.

### VIOL-4: Hardcoded Secrets in Test Configuration
**Severity**: Low | **Location**: Test config files

Test configurations may contain hardcoded JWT secrets or database URLs. These should be isolated to test profiles.

**Recommendation**: Verify all test configs use `@TestPropertySource` with test-specific values.

### VIOL-5: Missing Authorization on Some Endpoints
**Severity**: Medium | **Location**: Various controllers

Authorization coverage is 98% (1,264/1,292). The 28 unprotected endpoints are intentionally public (login, register, careers, etc.). However, verify that ALL non-public endpoints have `@PreAuthorize` or method security.

**Recommendation**: Run ArchUnit test to enforce that all `@RestController` methods in non-public packages have `@PreAuthorize`.

---

## Refactoring Opportunities

### REFACTOR-1: Extract Common Repository Methods
**Current**: Many repositories duplicate methods like `findAllByTenantIdAndIsDeletedFalse(UUID, Pageable)`.

**Recommendation**: Create a `TenantAwareRepository<T>` base interface:
```java
public interface TenantAwareRepository<T> extends JpaRepository<T, UUID> {
    Page<T> findAllByTenantIdAndIsDeletedFalse(UUID tenantId, Pageable pageable);
    Optional<T> findByIdAndTenantIdAndIsDeletedFalse(UUID id, UUID tenantId);
    long countByTenantIdAndIsDeletedFalse(UUID tenantId);
}
```

### REFACTOR-2: Consolidate Frontend Error Handling
**Current**: Error handling varies by page (EmptyState, toast, silent fail, error boundary).

**Recommendation**: Create a `QueryErrorHandler` component:
```typescript
function QueryErrorHandler({ error, retry }: { error: Error; retry: () => void }) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return <AccessDenied />;
  }
  if (error instanceof AxiosError && error.response?.status === 404) {
    return <NotFound />;
  }
  return <ErrorState message={error.message} onRetry={retry} />;
}
```

### REFACTOR-3: Standardize Frontend List Pages
**Current**: Each list page re-implements the same pattern (search, filter, pagination, create button, table).

**Recommendation**: Create a `ListPageTemplate` component:
```typescript
<ListPageTemplate
  title="Employees"
  queryHook={useEmployees}
  columns={employeeColumns}
  createPermission="employee.create"
  createLabel="Add Employee"
  onCreateClick={() => ...}
  searchable
  filterable
/>
```

### REFACTOR-4: Replace Manual DTO Mapping with MapStruct
**Current**: Services manually map entities to DTOs in `toResponse()` methods.

**Recommendation**: MapStruct is already a dependency. Create mapper interfaces:
```java
@Mapper(componentModel = "spring")
public interface EmployeeMapper {
    EmployeeResponse toResponse(Employee entity);
    Employee toEntity(CreateEmployeeRequest dto);
}
```

### REFACTOR-5: Consolidate Date/Time Libraries
**Current**: Frontend uses both `date-fns` and `dayjs`. Pick one.

**Recommendation**: Standardize on `date-fns` (tree-shakeable, already in use). Remove `dayjs` dependency.

### REFACTOR-6: Extract Reusable Form Components
**Current**: Each form page creates its own form fields with React Hook Form register.

**Recommendation**: Create typed form field components:
```typescript
<FormTextInput control={form.control} name="firstName" label="First Name" />
<FormSelect control={form.control} name="department" label="Department" data={departments} />
<FormDatePicker control={form.control} name="joiningDate" label="Joining Date" />
```

---

## Performance Concerns

### PERF-1: Bundle Size
**Risk**: Frontend with 60+ dependencies may have large bundle. Mantine + Tailwind + TipTap + Recharts + Framer Motion.

**Check**: Run `ANALYZE=true npm run build` to inspect bundle composition.

**Mitigations already in place**:
- Next.js standalone output mode
- Dynamic imports for heavy components (TipTap editor, Recharts)
- Tree shaking enabled

### PERF-2: React Query Stale Time Tuning
**Risk**: Some hooks use 30s stale time (aggressive refetching), others use 10 minutes (risk of stale data).

**Recommendation**: Establish standard stale times:
- Static data (departments, roles, leave types): 10 minutes
- User-specific data (my profile, my leaves): 2 minutes
- Volatile data (attendance, approvals inbox): 30 seconds
- List data (employee directory): 2 minutes

### PERF-3: Large Payload on Initial Load
**Risk**: Dashboard page may trigger 5+ API calls on mount (welcome banner, leave balance, team presence, holidays, recent activity).

**Mitigations**:
- React Query enables parallel fetching
- Each query has independent loading state
- Consider a single `/api/v1/dashboard` aggregate endpoint

---

## Security Review Notes

### SEC-1: CSRF Token Refresh
The CSRF token is extracted from cookie. If the cookie expires or is cleared, subsequent POST/PUT/DELETE requests fail silently with 403.

**Fix**: Refresh CSRF token on login and periodically (every 30 minutes).

### SEC-2: JWT Claims Size
JWT includes `permissions[]` (300+ strings), `roles[]`, `accessible_apps[]`, and `permission_scopes`. This can make the token 4KB+, exceeding some proxy header limits.

**Fix**: Consider storing permissions in Redis (keyed by user+tenant) and keeping JWT lean (just userId, tenantId, role codes). Check permissions server-side from Redis.

### SEC-3: File Upload Validation
MinIO accepts any file type. Backend sets max size (10MB) but doesn't validate file content (MIME type vs extension mismatch, malicious file detection).

**Fix**: Add Apache Tika (already a dependency) content-type validation on upload. Restrict allowed MIME types per upload context (images for avatars, PDFs for documents).

---

## Testing Gaps

### TEST-GAP-1: Missing Integration Tests for Newer Modules
Modules added after the initial test suite may lack coverage:
- Wellness programs
- Recognition & rewards
- Knowledge/Fluence wiki
- Contract management
- E-signature

### TEST-GAP-2: No Load Testing
No JMeter, k6, or Gatling scripts exist. Performance under load is untested.

**Recommendation**: Add k6 scripts for critical paths:
- Login flow (auth endpoint rate limiting)
- Employee directory (pagination under load)
- Payroll processing (transaction-heavy)
- Concurrent approval workflows

### TEST-GAP-3: No Chaos Testing
No resilience testing for:
- Redis unavailable (rate limiting fallback)
- Kafka unavailable (event publishing fallback)
- Database slow queries (timeout behavior)
- MinIO unavailable (file upload/download fallback)

**Recommendation**: Add Resilience4j circuit breakers for external service calls, then test with Chaos Monkey or Toxiproxy.
