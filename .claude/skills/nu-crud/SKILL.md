---
name: nu-crud
description: Use when asked to create CRUD for a new entity, add a new module, or scaffold a full-stack feature with backend + frontend + database migration. Triggers on phrases like "create CRUD for X", "new entity for X", "add module for X", "scaffold X".
---

# Full-Stack CRUD Generator for NU-AURA

## When to Use

- User says "create CRUD for X", "new entity for X", "add module for X", "scaffold X feature"
- A new domain entity needs full backend + frontend + migration wiring
- An existing module needs a new sub-entity with full CRUD

## Input Required

Ask the user for:
1. **Entity name** (PascalCase, e.g., `AssetCategory`)
2. **Module** — which sub-app/package (`employee`, `recruitment`, `performance`, `knowledge`, `training`, etc.)
3. **Field definitions** — name, Java type, nullable?, validation constraints
4. **Permission prefix** — e.g., `ASSET_CATEGORY` (will generate `ASSET_CATEGORY:READ`, `ASSET_CATEGORY:MANAGE`)
5. **Cache TTL tier** — `short` (5-15min), `medium` (4hr), `long` (24hr) — default `medium`
6. **Parent entity** (optional) — if this entity belongs to another (e.g., AssetCategory belongs to AssetModule)

## Steps

### Step 1: Add Permission Constants

**File:** `backend/src/main/java/com/hrms/common/security/Permission.java`

Add new constants following the existing pattern:

```java
// {Module Name}
public static final String {PREFIX}_READ = "{PREFIX}:READ";
public static final String {PREFIX}_CREATE = "{PREFIX}:CREATE";
public static final String {PREFIX}_UPDATE = "{PREFIX}:UPDATE";
public static final String {PREFIX}_DELETE = "{PREFIX}:DELETE";
public static final String {PREFIX}_MANAGE = "{PREFIX}:MANAGE";
```

### Step 2: Create the Entity

**File:** `backend/src/main/java/com/hrms/domain/{module}/{EntityName}.java`

Follow this exact pattern (from `Department.java`):

```java
package com.hrms.domain.{module};

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "{table_name}", indexes = {
    @Index(name = "idx_{short}_tenant", columnList = "tenantId"),
    // Add indexes for FK columns and frequently queried fields
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class {EntityName} extends TenantAware {

    // Fields here. Rules:
    // - String fields: @Column(nullable = false/true, length = N)
    // - UUID FK fields: @Column, no @ManyToOne (use ID-based references)
    // - Enums: @Enumerated(EnumType.STRING) @Column(length = 50)
    // - Boolean defaults: @Builder.Default private Boolean isActive = true;
    // - Text: @Column(columnDefinition = "TEXT")
}
```

**Key rules:**
- Table name: `snake_case`, plural (e.g., `asset_categories`)
- Extends `TenantAware` (which extends `BaseEntity` — gives you `id`, `createdAt`, `updatedAt`, `createdBy`, `lastModifiedBy`, `version`, `isDeleted`, `deletedAt`, `tenantId`)
- Always add `@Where(clause = "is_deleted = false")` for soft deletes
- Index all FK columns and the `tenantId` column
- Use `@SuperBuilder` (not `@Builder`) because of inheritance

### Step 3: Create the Repository

**File:** `backend/src/main/java/com/hrms/infrastructure/{module}/repository/{EntityName}Repository.java`

```java
package com.hrms.infrastructure.{module}.repository;

import com.hrms.domain.{module}.{EntityName};
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface {EntityName}Repository extends JpaRepository<{EntityName}, UUID> {

    Optional<{EntityName}> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<{EntityName}> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<{EntityName}> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    @Query("SELECT e FROM {EntityName} e WHERE e.tenantId = :tenantId AND " +
           "(LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<{EntityName}> search(@Param("tenantId") UUID tenantId,
                              @Param("search") String search,
                              Pageable pageable);

    // Add existsBy methods for unique constraint checks
    // Add countBy methods for validation before delete
}
```

**Key rules:**
- Every query method must include `tenantId` parameter — never query without tenant scoping
- Return `Optional` for single-entity lookups
- `Page` for paginated lists, `List` for dropdown/select data

### Step 4: Create Request DTO

**File:** `backend/src/main/java/com/hrms/api/{module}/dto/{EntityName}Request.java`

```java
package com.hrms.api.{module}.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class {EntityName}Request {

    @NotBlank(message = "{Field} is required")
    @Size(max = 200, message = "{Field} must not exceed 200 characters")
    private String name;

    // Add fields with validation annotations:
    // @NotBlank, @NotNull, @Size, @Pattern, @Email, @Min, @Max, @Positive
    // Optional fields: no @NotBlank, just the type
}
```

### Step 5: Create Response DTO

**File:** `backend/src/main/java/com/hrms/api/{module}/dto/{EntityName}Response.java`

```java
package com.hrms.api.{module}.dto;

import com.hrms.domain.{module}.{EntityName};
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class {EntityName}Response implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private UUID id;
    // Mirror all entity fields that the frontend needs
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static {EntityName}Response from{EntityName}({EntityName} entity) {
        return {EntityName}Response.builder()
                .id(entity.getId())
                // Map all fields
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
```

**Key rules:**
- Must implement `Serializable` (Redis caching)
- Include a static factory method `from{EntityName}` for entity-to-DTO conversion
- Use `@Builder(toBuilder = true)` to allow enrichment after initial build

### Step 6: Create the Service

**File:** `backend/src/main/java/com/hrms/application/{module}/service/{EntityName}Service.java`

```java
package com.hrms.application.{module}.service;

import com.hrms.api.{module}.dto.{EntityName}Request;
import com.hrms.api.{module}.dto.{EntityName}Response;
import com.hrms.common.config.CacheConfig;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.{module}.{EntityName};
import com.hrms.infrastructure.{module}.repository.{EntityName}Repository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class {EntityName}Service {

    private final {EntityName}Repository repository;
    private final AuditLogService auditLogService;

    public {EntityName}Service({EntityName}Repository repository,
                               AuditLogService auditLogService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    @CacheEvict(value = CacheConfig.{CACHE_NAME}, allEntries = true)
    public {EntityName}Response create({EntityName}Request request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Add duplicate checks here if needed
        // if (repository.existsByNameAndTenantId(request.getName(), tenantId)) {
        //     throw new DuplicateResourceException("{EntityName} already exists");
        // }

        {EntityName} entity = {EntityName}.builder()
                .name(request.getName())
                // Map all fields from request
                .isActive(true)
                .build();

        entity.setTenantId(tenantId);
        entity = repository.save(entity);

        auditLogService.logAction(
                "{ENTITY_UPPER}",
                entity.getId(),
                AuditAction.CREATE,
                entity.getName(),
                null,
                "{EntityName} created: " + entity.getName()
        );

        return {EntityName}Response.from{EntityName}(entity);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.{CACHE_NAME}, allEntries = true)
    public {EntityName}Response update(UUID id, {EntityName}Request request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        {EntityName} entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("{EntityName} not found"));

        // Update fields
        if (request.getName() != null) entity.setName(request.getName());
        // ... map remaining fields

        entity = repository.save(entity);
        return {EntityName}Response.from{EntityName}(entity);
    }

    @Transactional(readOnly = true)
    public {EntityName}Response getById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        {EntityName} entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("{EntityName} not found"));
        return {EntityName}Response.from{EntityName}(entity);
    }

    @Transactional(readOnly = true)
    public Page<{EntityName}Response> getAll(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return repository.findAllByTenantId(tenantId, pageable)
                .map({EntityName}Response::from{EntityName});
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.{CACHE_NAME},
               key = "'active:' + T(com.hrms.common.security.TenantContext).requireCurrentTenant()")
    public List<{EntityName}Response> getActive() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return repository.findAllByTenantIdAndIsActive(tenantId, true)
                .stream()
                .map({EntityName}Response::from{EntityName})
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = CacheConfig.{CACHE_NAME}, allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        {EntityName} entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("{EntityName} not found"));

        entity.softDelete();
        repository.save(entity);

        auditLogService.logAction(
                "{ENTITY_UPPER}",
                entity.getId(),
                AuditAction.DELETE,
                entity.getName(),
                null,
                "{EntityName} soft-deleted: " + entity.getName()
        );
    }
}
```

**Key rules:**
- Constructor injection (no `@Autowired`)
- `TenantContext.requireCurrentTenant()` in EVERY method — never skip tenant scoping
- `@Transactional` on write methods, `@Transactional(readOnly = true)` on reads
- `@CacheEvict(allEntries = true)` on all write methods
- `@Cacheable` on `getActive()` or frequently called read-only lists
- `softDelete()` — never `repository.delete(entity)`
- Audit log on create, update (if sensitive), and delete

**IMPORTANT:** You must also register the cache name in `CacheConfig.java`:
- **File:** `backend/src/main/java/com/hrms/common/config/CacheConfig.java`
- Add a constant: `public static final String {CACHE_NAME} = "{cache_name}";`
- Add it to the cache manager builder with the appropriate TTL tier

### Step 7: Create the Controller

**File:** `backend/src/main/java/com/hrms/api/{module}/{EntityName}Controller.java`

```java
package com.hrms.api.{module};

import com.hrms.api.{module}.dto.{EntityName}Request;
import com.hrms.api.{module}.dto.{EntityName}Response;
import com.hrms.application.{module}.service.{EntityName}Service;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/{route-path}")
@Tag(name = "{Entity Display Name}", description = "{Description} management endpoints")
public class {EntityName}Controller {

    private final {EntityName}Service service;

    public {EntityName}Controller({EntityName}Service service) {
        this.service = service;
    }

    @PostMapping
    @RequiresPermission(Permission.{PREFIX}_MANAGE)
    @Operation(summary = "Create {entity}", description = "Create a new {entity}")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "{Entity} created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "409", description = "Duplicate {entity}")
    })
    public ResponseEntity<{EntityName}Response> create(
            @Valid @RequestBody {EntityName}Request request) {
        {EntityName}Response response = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.{PREFIX}_MANAGE)
    @Operation(summary = "Update {entity}", description = "Update an existing {entity}")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "{Entity} updated successfully"),
            @ApiResponse(responseCode = "404", description = "{Entity} not found")
    })
    public ResponseEntity<{EntityName}Response> update(
            @Parameter(description = "{Entity} UUID") @PathVariable UUID id,
            @Valid @RequestBody {EntityName}Request request) {
        {EntityName}Response response = service.update(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.{PREFIX}_READ)
    @Operation(summary = "Get {entity} by ID", description = "Retrieve a single {entity}")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "{Entity} found"),
            @ApiResponse(responseCode = "404", description = "{Entity} not found")
    })
    public ResponseEntity<{EntityName}Response> getById(
            @Parameter(description = "{Entity} UUID") @PathVariable UUID id) {
        {EntityName}Response response = service.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission(Permission.{PREFIX}_READ)
    @Operation(summary = "Get all {entities}", description = "Retrieve paginated list")
    @ApiResponse(responseCode = "200", description = "{Entities} retrieved successfully")
    public ResponseEntity<Page<{EntityName}Response>> getAll(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<{EntityName}Response> response = service.getAll(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.{PREFIX}_READ)
    @Operation(summary = "Get active {entities}", description = "Retrieve all active {entities}")
    @ApiResponse(responseCode = "200", description = "Active {entities} retrieved successfully")
    public ResponseEntity<List<{EntityName}Response>> getActive() {
        List<{EntityName}Response> response = service.getActive();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.{PREFIX}_MANAGE)
    @Operation(summary = "Delete {entity}", description = "Soft-delete a {entity}")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "{Entity} deleted successfully"),
            @ApiResponse(responseCode = "404", description = "{Entity} not found")
    })
    public ResponseEntity<Void> delete(
            @Parameter(description = "{Entity} UUID") @PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Key rules:**
- `@RequiresPermission` on EVERY endpoint — no exceptions
- Constructor injection only
- `@Valid` on all `@RequestBody` parameters
- POST returns `HttpStatus.CREATED`, DELETE returns `noContent()`
- `@Tag`, `@Operation`, `@ApiResponse` for Swagger docs
- No `@CrossOrigin` — global CORS config handles it

### Step 8: Create Flyway Migration

**File:** `backend/src/main/resources/db/migration/V{next}__{description}.sql`

Check the current latest migration number first, then use the next sequential number.

```sql
-- V{N}__create_{table_name}.sql

CREATE TABLE {table_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    -- Entity-specific columns
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    -- Soft delete columns (from BaseEntity)
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    -- Audit columns (from BaseEntity)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    -- Foreign keys
    CONSTRAINT fk_{short}_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Indexes (MANDATORY: tenant_id + all FK columns + frequent query paths)
CREATE INDEX idx_{short}_tenant ON {table_name}(tenant_id);
CREATE INDEX idx_{short}_active ON {table_name}(tenant_id, is_active) WHERE is_deleted = false;
-- Add unique constraints if needed:
-- CREATE UNIQUE INDEX idx_{short}_name_tenant ON {table_name}(name, tenant_id) WHERE is_deleted = false;
```

### Step 9: Create Frontend Types

**File:** `frontend/lib/types/{module}/{entity-kebab}.ts`

```typescript
export interface {EntityName} {
  id: string;
  name: string;
  // All response fields from the backend DTO
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface {EntityName}Request {
  name: string;
  // All writable fields matching the backend Request DTO
}

// Re-export Page type if not already available
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
```

### Step 10: Create Frontend Service

**File:** `frontend/lib/services/{module}/{entity-kebab}.service.ts`

```typescript
import { apiClient } from '../../api/client';
import { {EntityName}, {EntityName}Request, Page } from '../../types/{module}/{entity-kebab}';

export const {entityName}Service = {
  getAll: async (page = 0, size = 20): Promise<Page<{EntityName}>> => {
    const response = await apiClient.get<Page<{EntityName}>>('/{route-path}', {
      params: { page, size },
    });
    return response.data;
  },

  getActive: async (): Promise<{EntityName}[]> => {
    const response = await apiClient.get<{EntityName}[]>('/{route-path}/active');
    return response.data;
  },

  getById: async (id: string): Promise<{EntityName}> => {
    const response = await apiClient.get<{EntityName}>(`/{route-path}/${id}`);
    return response.data;
  },

  create: async (data: {EntityName}Request): Promise<{EntityName}> => {
    const response = await apiClient.post<{EntityName}>('/{route-path}', data);
    return response.data;
  },

  update: async (id: string, data: {EntityName}Request): Promise<{EntityName}> => {
    const response = await apiClient.put<{EntityName}>(`/{route-path}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/{route-path}/${id}`);
  },
};
```

**Key rules:**
- Import `apiClient` from `../../api/client` — NEVER create a new Axios instance
- Return `response.data` (Axios wraps responses)
- Use `Page<T>` for paginated endpoints

### Step 11: Create Frontend React Query Hook

**File:** `frontend/lib/hooks/queries/use{EntityName}s.ts`

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {entityName}Service } from '@/lib/services/{module}/{entity-kebab}.service';
import { {EntityName}, {EntityName}Request } from '@/lib/types/{module}/{entity-kebab}';

// Query keys for cache management
export const {entityName}Keys = {
  all: ['{entityNames}'] as const,
  lists: () => [...{entityName}Keys.all, 'list'] as const,
  list: (page: number, size: number) =>
    [...{entityName}Keys.lists(), { page, size }] as const,
  active: () => [...{entityName}Keys.all, 'active'] as const,
  details: () => [...{entityName}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{entityName}Keys.details(), id] as const,
};

// Get all (paginated)
export function useAll{EntityName}s(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: {entityName}Keys.list(page, size),
    queryFn: () => {entityName}Service.getAll(page, size),
    staleTime: 30 * 60 * 1000,
  });
}

// Get active only (for dropdowns/selects)
export function useActive{EntityName}s() {
  return useQuery({
    queryKey: {entityName}Keys.active(),
    queryFn: () => {entityName}Service.getActive(),
    staleTime: 30 * 60 * 1000,
  });
}

// Get single by ID
export function use{EntityName}(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: {entityName}Keys.detail(id),
    queryFn: () => {entityName}Service.getById(id),
    enabled: enabled && !!id,
    staleTime: 30 * 60 * 1000,
  });
}

// Create mutation
export function useCreate{EntityName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {EntityName}Request) => {entityName}Service.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.active() });
    },
  });
}

// Update mutation
export function useUpdate{EntityName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {EntityName}Request }) =>
      {entityName}Service.update(id, data),
    onSettled: (_, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.active() });
    },
  });
}

// Delete mutation
export function useDelete{EntityName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {entityName}Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: {entityName}Keys.active() });
    },
  });
}
```

**Key rules:**
- `'use client'` directive at top
- Query keys follow the factory pattern: `all > lists > list(params) > details > detail(id)`
- `staleTime` based on how frequently the data changes (30min for config data, 5min for transactional)
- Mutations invalidate all related query keys on success/settled
- `enabled` guard on detail queries to prevent fetching with empty ID

### Step 12: Create Frontend Page Skeleton

**File:** `frontend/app/{route-path}/page.tsx`

Generate a list page following the exact pattern from `office-locations/page.tsx`:
- `'use client'` directive
- Role-based access guard using `usePermissions()` + `useAuth()`
- Zod schema for the form
- React Query hooks for data + mutations
- Mantine-compatible UI with CSS variables (no `bg-white`, no `shadow-sm`)
- Create/Edit modal or inline form
- Delete confirmation dialog using `<ConfirmDialog>`
- Table with actions column
- Empty state message
- Loading state

See the `/nu-page` skill for full page generation details.

## Output Checklist

After generation, print this checklist:

```
Generated Files:
  [x] backend/.../domain/{module}/{EntityName}.java              — Entity
  [x] backend/.../infrastructure/{module}/repository/{EntityName}Repository.java — Repository
  [x] backend/.../api/{module}/dto/{EntityName}Request.java      — Request DTO
  [x] backend/.../api/{module}/dto/{EntityName}Response.java     — Response DTO
  [x] backend/.../application/{module}/service/{EntityName}Service.java — Service
  [x] backend/.../api/{module}/{EntityName}Controller.java       — Controller
  [x] backend/src/main/resources/db/migration/V{N}__create_{table}.sql — Migration
  [x] frontend/lib/types/{module}/{entity}.ts                    — Types
  [x] frontend/lib/services/{module}/{entity}.service.ts         — API Service
  [x] frontend/lib/hooks/queries/use{Entity}s.ts                 — React Query Hooks
  [x] frontend/app/{route}/page.tsx                              — List Page

Manual Wiring Required:
  [ ] Add cache name constant to CacheConfig.java
  [ ] Add permission constants to Permission.java (if not already done)
  [ ] Seed permissions in Flyway migration for all roles
  [ ] Add route to frontend/lib/config/apps.ts if new route prefix
  [ ] Add sidebar menu item in frontend/components/layout/menuSections.tsx
  [ ] Run: cd backend && mvn flyway:migrate
  [ ] Run: cd backend && mvn compile (verify no compilation errors)
  [ ] Run: cd frontend && npm run build (verify no TypeScript errors)
```
