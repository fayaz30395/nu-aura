---
name: nu-api-endpoint
description: Use when asked to add a new API endpoint, add an action to an existing controller, or wire a new backend operation to the frontend. Triggers on phrases like "add endpoint for X", "new API for X", "add action to Y controller", "wire up X API".
---

# API Endpoint Builder for NU-AURA

## When to Use

- User says "add endpoint for X", "new API for X", "add action to Y controller"
- An existing controller needs a new method (e.g., add bulk import, add export, add custom action)
- A new backend operation needs full wiring: controller method + service method + frontend service + hook

## Input Required

Ask the user for:
1. **Controller name** — which existing controller to add to (e.g., `DepartmentController`)
2. **HTTP method** — `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
3. **Path** — relative to the controller's base path (e.g., `/{id}/transfer`, `/bulk-import`, `/export`)
4. **Permission string** — the `Permission.*` constant to use (e.g., `Permission.DEPARTMENT_MANAGE`)
5. **Description** — what the endpoint does (for Swagger docs)
6. **Request body** (if POST/PUT/PATCH) — field names and types, or an existing DTO to reuse
7. **Response** — what it returns (entity response, void, list, Page, custom DTO)

## Steps

### Step 1: Locate the Existing Controller

Read the target controller file to understand:
- The base `@RequestMapping` path (e.g., `/api/v1/departments`)
- The injected service class
- Existing methods (to avoid path conflicts)
- The import list (to know what is already imported)

**File pattern:** `backend/src/main/java/com/hrms/api/{module}/{ControllerName}.java`

### Step 2: Add the Controller Method

Add the new method to the controller following the exact NU-AURA pattern.

**For a GET endpoint (query/fetch):**

```java
@GetMapping("/{path}")
@RequiresPermission(Permission.{PERMISSION})
@Operation(summary = "{Summary}", description = "{Description}")
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "{Success description}"),
        @ApiResponse(responseCode = "404", description = "{Entity} not found")
})
public ResponseEntity<{ResponseType}> {methodName}(
        @Parameter(description = "{Param description}") @PathVariable UUID id) {
    {ResponseType} response = service.{serviceMethod}(id);
    return ResponseEntity.ok(response);
}
```

**For a POST endpoint (create/action):**

```java
@PostMapping("/{path}")
@RequiresPermission(Permission.{PERMISSION})
@Operation(summary = "{Summary}", description = "{Description}")
@ApiResponses({
        @ApiResponse(responseCode = "201", description = "{Success description}"),
        @ApiResponse(responseCode = "400", description = "Invalid request data")
})
public ResponseEntity<{ResponseType}> {methodName}(
        @Valid @RequestBody {RequestDTO} request) {
    {ResponseType} response = service.{serviceMethod}(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

**For a PATCH endpoint (partial update/state change):**

```java
@PatchMapping("/{id}/{action}")
@RequiresPermission(Permission.{PERMISSION})
@Operation(summary = "{Summary}", description = "{Description}")
@ApiResponses({
        @ApiResponse(responseCode = "200", description = "{Success description}"),
        @ApiResponse(responseCode = "404", description = "{Entity} not found")
})
public ResponseEntity<{ResponseType}> {methodName}(
        @Parameter(description = "{Entity} UUID") @PathVariable UUID id) {
    {ResponseType} response = service.{serviceMethod}(id);
    return ResponseEntity.ok(response);
}
```

**For a DELETE endpoint:**

```java
@DeleteMapping("/{id}")
@RequiresPermission(Permission.{PERMISSION})
@Operation(summary = "{Summary}", description = "{Description}")
@ApiResponses({
        @ApiResponse(responseCode = "204", description = "{Success description}"),
        @ApiResponse(responseCode = "404", description = "{Entity} not found")
})
public ResponseEntity<Void> {methodName}(
        @Parameter(description = "{Entity} UUID") @PathVariable UUID id) {
    service.{serviceMethod}(id);
    return ResponseEntity.noContent().build();
}
```

**Mandatory annotations on every endpoint:**
- `@RequiresPermission(Permission.{X})` — no exceptions, ever
- `@Operation(summary = "...", description = "...")` — for Swagger
- `@ApiResponses({...})` — document all possible HTTP status codes
- `@Valid` on every `@RequestBody` parameter
- `@Parameter(description = "...")` on every `@PathVariable` and `@RequestParam`

### Step 3: Create Request/Response DTOs (if needed)

Only create new DTOs if the existing ones do not cover the use case.

**Request DTO** — `backend/src/main/java/com/hrms/api/{module}/dto/{ActionName}Request.java`:

```java
package com.hrms.api.{module}.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class {ActionName}Request {

    @NotBlank(message = "{Field} is required")
    @Size(max = 200, message = "{Field} must not exceed 200 characters")
    private String fieldName;

    // Use the right validation annotations:
    // @NotBlank    — required string (rejects null, empty, whitespace)
    // @NotNull     — required non-string (UUID, Long, Boolean, enum)
    // @Size        — string/collection length bounds
    // @Pattern     — regex validation (e.g., phone numbers, codes)
    // @Email       — email format
    // @Min / @Max  — numeric range
    // @Positive    — must be > 0
    // @PastOrPresent / @FutureOrPresent — date constraints
}
```

**Response DTO** — only if the return shape differs from the entity's standard response DTO. If it is the same entity, reuse the existing `{EntityName}Response`.

### Step 4: Add the Service Method

**File:** `backend/src/main/java/com/hrms/application/{module}/service/{ServiceName}.java`

Add the method to the existing service class:

**For a write operation:**

```java
@Transactional
@CacheEvict(value = CacheConfig.{CACHE_NAME}, allEntries = true)
public {ResponseType} {methodName}({params}) {
    UUID tenantId = TenantContext.requireCurrentTenant();

    // 1. Load entity (tenant-scoped)
    {EntityName} entity = repository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("{EntityName} not found"));

    // 2. Business validation
    // Throw BusinessException for rule violations
    // Throw DuplicateResourceException for uniqueness conflicts

    // 3. Apply changes
    entity.setField(request.getField());
    entity = repository.save(entity);

    // 4. Audit log (for sensitive operations)
    auditLogService.logAction(
            "{ENTITY_UPPER}",
            entity.getId(),
            AuditAction.UPDATE,
            entity.getName(),
            null,
            "{Description of action}: " + entity.getName()
    );

    return {EntityName}Response.from{EntityName}(entity);
}
```

**For a read operation:**

```java
@Transactional(readOnly = true)
public {ResponseType} {methodName}({params}) {
    UUID tenantId = TenantContext.requireCurrentTenant();

    // Query with tenant scoping
    return repository.{queryMethod}(tenantId, ...)
            .map({EntityName}Response::from{EntityName})
            // or .orElseThrow(() -> new ResourceNotFoundException(...))
            ;
}
```

**Key rules for every service method:**
- `UUID tenantId = TenantContext.requireCurrentTenant()` — FIRST line in every method
- `@Transactional` for writes, `@Transactional(readOnly = true)` for reads
- `@CacheEvict` on writes that change cached data
- `@Cacheable` on reads that return stable data (with tenant-scoped key)
- All repository calls must include `tenantId` — never query without tenant scoping
- Use `ResourceNotFoundException` for 404, `BusinessException` for rule violations, `DuplicateResourceException` for conflicts
- Audit log sensitive operations (create, delete, status changes, permission changes)

### Step 5: Add Repository Method (if needed)

If the service method requires a query that does not exist on the repository, add it.

**File:** `backend/src/main/java/com/hrms/infrastructure/{module}/repository/{EntityName}Repository.java`

```java
// Spring Data derived query (simple cases)
List<{EntityName}> findAllByTenantIdAndStatus(UUID tenantId, String status);

// JPQL for complex queries
@Query("SELECT e FROM {EntityName} e WHERE e.tenantId = :tenantId AND e.status = :status AND e.isActive = true")
Page<{EntityName}> findActiveByStatus(@Param("tenantId") UUID tenantId,
                                      @Param("status") String status,
                                      Pageable pageable);

// Count for validation before operations
long countByTenantIdAndParentId(UUID tenantId, UUID parentId);

// Exists for duplicate checks
boolean existsByNameAndTenantId(String name, UUID tenantId);
```

**Key rules:**
- Every query MUST include `tenantId` in the WHERE clause
- Use `@Query` with JPQL for anything beyond simple derived queries
- Never use native SQL unless there is a compelling performance reason

### Step 6: Add Permission Constant (if new)

If the endpoint requires a permission that does not exist in `Permission.java`, add it.

**File:** `backend/src/main/java/com/hrms/common/security/Permission.java`

```java
public static final String {PREFIX}_{ACTION} = "{PREFIX}:{ACTION}";
```

Follow the naming convention: `MODULE_ACTION` for the constant name, `MODULE:ACTION` for the string value.

### Step 7: Wire the Frontend Service

**File:** `frontend/lib/services/{module}/{entity-kebab}.service.ts`

Add the new method to the existing service object:

```typescript
// {Description}
{methodName}: async ({params}): Promise<{ReturnType}> => {
  const response = await apiClient.{httpMethod}<{ReturnType}>(
    `/{base-path}/{path}`,
    // For POST/PUT/PATCH: pass data as second argument
    // For GET with params: { params: { key: value } }
  );
  return response.data;
},
```

**HTTP method mapping:**
- `GET` -> `apiClient.get<T>(url, { params })`
- `POST` -> `apiClient.post<T>(url, data)`
- `PUT` -> `apiClient.put<T>(url, data)`
- `PATCH` -> `apiClient.patch<T>(url, data)`
- `DELETE` -> `apiClient.delete(url)`

### Step 8: Wire the Frontend React Query Hook

**File:** `frontend/lib/hooks/queries/use{EntityName}s.ts`

**For a new query (GET):**

```typescript
// {Description}
export function use{HookName}({params}) {
  return useQuery({
    queryKey: {entityName}Keys.{keyName}({keyParams}),
    queryFn: () => {entityName}Service.{methodName}({params}),
    enabled: {condition},  // e.g., !!id
    staleTime: {time},     // 30 * 60 * 1000 for config, 5 * 60 * 1000 for transactional
  });
}
```

Also add the query key to the key factory:

```typescript
export const {entityName}Keys = {
  // ... existing keys
  {keyName}: ({keyParams}) => [...{entityName}Keys.all, '{keyName}', { {keyParams} }] as const,
};
```

**For a new mutation (POST/PUT/PATCH/DELETE):**

```typescript
// {Description}
export function use{HookName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({params}: {ParamType}) =>
      {entityName}Service.{methodName}({params}),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.active() });
    },
  });
}
```

**Key rules:**
- Query keys must be added to the factory to enable targeted invalidation
- Mutations must invalidate all queries that could be affected by the change
- Use `enabled` to prevent queries from firing with incomplete parameters
- `staleTime` should match the data volatility (config = 30min, operational = 5min)

### Step 9: Add Frontend Types (if new DTO)

If you created a new request or response DTO in Step 3, add the matching TypeScript interface.

**File:** `frontend/lib/types/{module}/{entity-kebab}.ts`

```typescript
export interface {ActionName}Request {
  fieldName: string;
  // Match the backend DTO fields with TypeScript types:
  // String -> string
  // UUID -> string
  // Long/Integer -> number
  // Boolean -> boolean
  // LocalDateTime -> string
  // Enum -> union type: 'VALUE_A' | 'VALUE_B'
  // List<T> -> T[]
}
```

## Validation Checklist

Before considering the endpoint complete, verify:

```
Backend Checks:
  [x] @RequiresPermission on the controller method
  [x] @Operation + @ApiResponses for Swagger documentation
  [x] @Valid on @RequestBody parameters
  [x] @Transactional on service method (readOnly for GETs)
  [x] TenantContext.requireCurrentTenant() in service method
  [x] All repository queries scoped by tenantId
  [x] Proper exception types (ResourceNotFound, Business, Duplicate)
  [x] @CacheEvict on write operations (if entity is cached)
  [x] Audit log for sensitive operations
  [x] Validation annotations on request DTO fields

Frontend Checks:
  [x] Service method added using existing apiClient (no new Axios instance)
  [x] React Query hook added with proper query key
  [x] Mutations invalidate related queries
  [x] TypeScript interface matches backend DTO (no 'any' types)
  [x] Error type handled: (error as { response?: { data?: { message?: string } } })

Integration Checks:
  [x] Controller path does not conflict with existing endpoints
  [x] Permission constant exists in Permission.java
  [x] Frontend service URL matches backend @RequestMapping + @GetMapping/@PostMapping path
  [x] Request/response field names match between Java DTO and TypeScript interface (camelCase both sides)
```

## Output Checklist

```
Modified Files:
  [x] backend/.../api/{module}/{Controller}.java          — New endpoint method
  [x] backend/.../application/{module}/service/{Service}.java — New service method
  [x] frontend/lib/services/{module}/{entity}.service.ts   — New API call
  [x] frontend/lib/hooks/queries/use{Entity}s.ts           — New hook

Created Files (if needed):
  [ ] backend/.../api/{module}/dto/{Action}Request.java    — New request DTO
  [ ] backend/.../api/{module}/dto/{Action}Response.java   — New response DTO
  [ ] backend/.../infrastructure/{module}/repository/...   — New repository method

Manual Wiring Required:
  [ ] Add permission constant to Permission.java (if new)
  [ ] Seed permission in database for relevant roles (Flyway migration)
  [ ] Call the new hook from the frontend page component
  [ ] Add UI trigger (button, menu item) that invokes the mutation/query
  [ ] Run: cd backend && mvn compile
  [ ] Run: cd frontend && npm run build
```
