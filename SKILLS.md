# NU-AURA Platform Skills & Patterns

> Reusable skills, patterns, and best practices for NU-AURA development

## Table of Contents
1. [Frontend Skills](#frontend-skills)
2. [Backend Skills](#backend-skills)
3. [Database Skills](#database-skills)
4. [Testing Skills](#testing-skills)
5. [DevOps Skills](#devops-skills)
6. [Architecture Patterns](#architecture-patterns)

---

## Frontend Skills

### 1. Create React Query API Hook

**Skill**: `create-react-query-hook`

Creates a fully typed React Query hook with mutations and cache invalidation.

```typescript
// Pattern: lib/hooks/queries/use{Module}.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleService } from '@/lib/services/module.service';
import { Module, CreateModuleRequest, UpdateModuleRequest } from '@/lib/types/module';

// Query - List all
export function useModules(filters?: ModuleFilters) {
  return useQuery({
    queryKey: ['modules', filters],
    queryFn: () => moduleService.getAll(filters),
  });
}

// Query - Get by ID
export function useModule(id: string) {
  return useQuery({
    queryKey: ['modules', id],
    queryFn: () => moduleService.getById(id),
    enabled: !!id,
  });
}

// Mutation - Create
export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModuleRequest) => moduleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}

// Mutation - Update
export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModuleRequest }) =>
      moduleService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['modules', id] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}

// Mutation - Delete
export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => moduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}
```

---

### 2. Create API Service Layer

**Skill**: `create-api-service`

Creates a typed service layer for API communication using the existing Axios client.

```typescript
// Pattern: lib/services/module.service.ts

import { apiClient } from './api-client';
import { Module, CreateModuleRequest, UpdateModuleRequest, ModuleFilters } from '../types/module';

export const moduleService = {
  /**
   * Get all modules with optional filtering
   */
  async getAll(filters?: ModuleFilters): Promise<Module[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const { data } = await apiClient.get<Module[]>(`/api/v1/modules?${params}`);
    return data;
  },

  /**
   * Get module by ID
   */
  async getById(id: string): Promise<Module> {
    const { data } = await apiClient.get<Module>(`/api/v1/modules/${id}`);
    return data;
  },

  /**
   * Create new module
   */
  async create(request: CreateModuleRequest): Promise<Module> {
    const { data } = await apiClient.post<Module>('/api/v1/modules', request);
    return data;
  },

  /**
   * Update existing module
   */
  async update(id: string, request: UpdateModuleRequest): Promise<Module> {
    const { data } = await apiClient.put<Module>(`/api/v1/modules/${id}`, request);
    return data;
  },

  /**
   * Delete module
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/modules/${id}`);
  },

  /**
   * Get paginated modules
   */
  async getPaginated(page: number, size: number, filters?: ModuleFilters) {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (filters?.status) params.append('status', filters.status);

    const { data } = await apiClient.get(`/api/v1/modules?${params}`);
    return data;
  },
};
```

---

### 3. Create TypeScript Types

**Skill**: `create-typescript-types`

Define comprehensive TypeScript types for domain models.

```typescript
// Pattern: lib/types/module.ts

export interface Module {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: ModuleStatus;
  category: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
  version: number;
}

export enum ModuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export interface CreateModuleRequest {
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateModuleRequest {
  name?: string;
  description?: string;
  status?: ModuleStatus;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ModuleFilters {
  status?: ModuleStatus;
  category?: string;
  search?: string;
  tags?: string[];
}

export interface PaginatedModules {
  content: Module[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

---

### 4. Create Form with Validation

**Skill**: `create-form-validation`

React Hook Form + Zod validation pattern.

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define Zod schema
const moduleFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

type ModuleFormData = z.infer<typeof moduleFormSchema>;

function ModuleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      tags: [],
    },
  });

  const createMutation = useCreateModule();

  const onSubmit = async (data: ModuleFormData) => {
    try {
      await createMutation.mutateAsync(data);
      reset();
      toast.success('Module created successfully');
    } catch (error) {
      toast.error('Failed to create module');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input {...register('name')} className="input" />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea {...register('description')} className="textarea" />
        {errors.description && <span className="error">{errors.description.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Module'}
      </button>
    </form>
  );
}
```

---

### 5. Optimistic UI Update

**Skill**: `optimistic-ui-update`

Handle optimistic updates with rollback on error.

```typescript
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
      isLiked ? wallService.removeReaction(postId) : wallService.addReaction(postId, 'LIKE'),

    // Optimistic update
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['posts', postId] });

      const previousPost = queryClient.getQueryData(['posts', postId]);

      queryClient.setQueryData(['posts', postId], (old: any) => ({
        ...old,
        hasReacted: !isLiked,
        likeCount: isLiked ? old.likeCount - 1 : old.likeCount + 1,
      }));

      return { previousPost };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(['posts', variables.postId], context.previousPost);
      }
    },

    // Refetch after success
    onSettled: (data, error, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
    },
  });
}
```

---

## Backend Skills

### 6. Create Spring Boot REST Controller

**Skill**: `create-spring-controller`

RESTful controller with proper annotations, validation, and security.

```java
package com.hrms.api.module.controller;

import com.hrms.api.module.dto.*;
import com.hrms.application.module.service.ModuleService;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/modules")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Module", description = "Module management APIs")
public class ModuleController {

    private final ModuleService moduleService;

    @GetMapping
    @Operation(summary = "Get all modules", description = "Returns paginated list of modules")
    @RequiresPermission(MODULE_READ)
    public ResponseEntity<Page<ModuleResponse>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        log.debug("Getting all modules with status={}, search={}", status, search);
        return ResponseEntity.ok(moduleService.findAll(status, search, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get module by ID")
    @RequiresPermission(MODULE_READ)
    public ResponseEntity<ModuleResponse> getById(@PathVariable UUID id) {
        log.debug("Getting module by ID: {}", id);
        return ResponseEntity.ok(moduleService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new module")
    @RequiresPermission(MODULE_CREATE)
    public ResponseEntity<ModuleResponse> create(@Valid @RequestBody CreateModuleRequest request) {
        log.info("Creating new module: {}", request.getName());
        return ResponseEntity.ok(moduleService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update module")
    @RequiresPermission(MODULE_UPDATE)
    public ResponseEntity<ModuleResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateModuleRequest request) {
        log.info("Updating module: {}", id);
        return ResponseEntity.ok(moduleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete module")
    @RequiresPermission(MODULE_DELETE)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        log.info("Deleting module: {}", id);
        moduleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

### 7. Create Service Layer with Transactions

**Skill**: `create-spring-service`

Business logic service with transaction management and tenant isolation.

```java
package com.hrms.application.module.service;

import com.hrms.api.module.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.module.Module;
import com.hrms.domain.module.ModuleStatus;
import com.hrms.infrastructure.module.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ModuleService {

    private final ModuleRepository moduleRepository;

    @Transactional(readOnly = true)
    public Page<ModuleResponse> findAll(String status, String search, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Page<Module> modules;
        if (status != null && search != null) {
            modules = moduleRepository.findByTenantIdAndStatusAndNameContaining(
                    tenantId, ModuleStatus.valueOf(status), search, pageable);
        } else if (status != null) {
            modules = moduleRepository.findByTenantIdAndStatus(
                    tenantId, ModuleStatus.valueOf(status), pageable);
        } else if (search != null) {
            modules = moduleRepository.findByTenantIdAndNameContaining(
                    tenantId, search, pageable);
        } else {
            modules = moduleRepository.findByTenantId(tenantId, pageable);
        }

        return modules.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public ModuleResponse findById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Module module = moduleRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Module not found"));
        return mapToResponse(module);
    }

    public ModuleResponse create(CreateModuleRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();

        Module module = new Module();
        module.setTenantId(tenantId);
        module.setName(request.getName());
        module.setDescription(request.getDescription());
        module.setCategory(request.getCategory());
        module.setTags(request.getTags());
        module.setMetadata(request.getMetadata());
        module.setStatus(ModuleStatus.DRAFT);
        module.setCreatedBy(currentUserId);

        Module saved = moduleRepository.save(module);
        log.info("Created module: {} for tenant: {}", saved.getId(), tenantId);

        return mapToResponse(saved);
    }

    public ModuleResponse update(UUID id, UpdateModuleRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentEmployeeId();

        Module module = moduleRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Module not found"));

        if (request.getName() != null) {
            module.setName(request.getName());
        }
        if (request.getDescription() != null) {
            module.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            module.setStatus(request.getStatus());
        }
        if (request.getCategory() != null) {
            module.setCategory(request.getCategory());
        }
        if (request.getTags() != null) {
            module.setTags(request.getTags());
        }
        if (request.getMetadata() != null) {
            module.setMetadata(request.getMetadata());
        }

        module.setUpdatedBy(currentUserId);

        Module updated = moduleRepository.save(module);
        log.info("Updated module: {}", id);

        return mapToResponse(updated);
    }

    public void delete(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Module module = moduleRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Module not found"));

        module.setDeleted(true);
        moduleRepository.save(module);
        log.info("Soft-deleted module: {}", id);
    }

    private ModuleResponse mapToResponse(Module module) {
        ModuleResponse response = new ModuleResponse();
        response.setId(module.getId());
        response.setName(module.getName());
        response.setDescription(module.getDescription());
        response.setStatus(module.getStatus());
        response.setCategory(module.getCategory());
        response.setTags(module.getTags());
        response.setMetadata(module.getMetadata());
        response.setCreatedAt(module.getCreatedAt());
        response.setUpdatedAt(module.getUpdatedAt());
        return response;
    }
}
```

---

### 8. Create JPA Repository

**Skill**: `create-jpa-repository`

Custom repository with derived queries and specifications.

```java
package com.hrms.infrastructure.module.repository;

import com.hrms.domain.module.Module;
import com.hrms.domain.module.ModuleStatus;
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
public interface ModuleRepository extends JpaRepository<Module, UUID> {

    Page<Module> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Module> findByTenantIdAndStatus(UUID tenantId, ModuleStatus status, Pageable pageable);

    Page<Module> findByTenantIdAndNameContaining(UUID tenantId, String name, Pageable pageable);

    Page<Module> findByTenantIdAndStatusAndNameContaining(
            UUID tenantId, ModuleStatus status, String name, Pageable pageable);

    Optional<Module> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Module> findByTenantIdAndCategory(UUID tenantId, String category);

    @Query("SELECT m FROM Module m WHERE m.tenantId = :tenantId AND m.isDeleted = false")
    Page<Module> findActiveByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Module m WHERE m.tenantId = :tenantId AND m.status = :status")
    long countByTenantIdAndStatus(@Param("tenantId") UUID tenantId, @Param("status") ModuleStatus status);

    boolean existsByTenantIdAndName(UUID tenantId, String name);
}
```

---

## Database Skills

### 9. Create Flyway Migration

**Skill**: `create-flyway-migration`

Database schema changes with proper indexing and RLS.

```sql
-- V1_XX__Create_Modules_Table.sql

-- Create modules table
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    category VARCHAR(100) NOT NULL,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES employees(id),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES employees(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_modules_tenant ON modules(tenant_id);
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_modules_category ON modules(category);
CREATE INDEX idx_modules_created_at ON modules(created_at);
CREATE INDEX idx_modules_tags ON modules USING GIN(tags);
CREATE INDEX idx_modules_metadata ON modules USING GIN(metadata);
CREATE INDEX idx_modules_name_search ON modules USING GIN(to_tsvector('english', name));

-- Enable Row Level Security
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY modules_tenant_isolation ON modules
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_modules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER modules_updated_at_trigger
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_modules_timestamp();

-- Add comments for documentation
COMMENT ON TABLE modules IS 'Stores module definitions for the platform';
COMMENT ON COLUMN modules.tenant_id IS 'Tenant isolation - references tenants(id)';
COMMENT ON COLUMN modules.status IS 'Module lifecycle status: DRAFT, ACTIVE, INACTIVE, ARCHIVED';
COMMENT ON COLUMN modules.tags IS 'Array of tags for categorization and search';
COMMENT ON COLUMN modules.metadata IS 'Flexible JSON metadata for module-specific attributes';
COMMENT ON COLUMN modules.is_deleted IS 'Soft delete flag - true means logically deleted';

-- Insert default permissions
INSERT INTO permissions (code, name, description, resource, action) VALUES
    ('MODULE_READ', 'View Modules', 'Permission to view modules', 'MODULE', 'READ'),
    ('MODULE_CREATE', 'Create Modules', 'Permission to create modules', 'MODULE', 'CREATE'),
    ('MODULE_UPDATE', 'Update Modules', 'Permission to update modules', 'MODULE', 'UPDATE'),
    ('MODULE_DELETE', 'Delete Modules', 'Permission to delete modules', 'MODULE', 'DELETE')
ON CONFLICT (code) DO NOTHING;
```

---

## Testing Skills

### 10. Create Backend Unit Tests

**Skill**: `create-backend-tests`

JUnit 5 test pattern with mocking and assertions.

```java
package com.hrms.application.module.service;

import com.hrms.api.module.dto.CreateModuleRequest;
import com.hrms.api.module.dto.ModuleResponse;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.module.Module;
import com.hrms.domain.module.ModuleStatus;
import com.hrms.infrastructure.module.repository.ModuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModuleServiceTest {

    @Mock
    private ModuleRepository moduleRepository;

    @InjectMocks
    private ModuleService moduleService;

    private UUID tenantId;
    private UUID userId;
    private Module testModule;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();

        // Mock tenant context
        try (var tenantContextMock = mockStatic(TenantContext.class);
             var securityContextMock = mockStatic(SecurityContext.class)) {
            tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
            securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(userId);
        }

        // Setup test data
        testModule = new Module();
        testModule.setId(UUID.randomUUID());
        testModule.setTenantId(tenantId);
        testModule.setName("Test Module");
        testModule.setDescription("Test Description");
        testModule.setCategory("TEST");
        testModule.setStatus(ModuleStatus.ACTIVE);
    }

    @Test
    void findAll_shouldReturnPagedModules() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<Module> modulePage = new PageImpl<>(List.of(testModule));
        when(moduleRepository.findByTenantId(tenantId, pageable)).thenReturn(modulePage);

        // When
        Page<ModuleResponse> result = moduleService.findAll(null, null, pageable);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Test Module");
        verify(moduleRepository).findByTenantId(tenantId, pageable);
    }

    @Test
    void findById_shouldReturnModule_whenExists() {
        // Given
        UUID moduleId = testModule.getId();
        when(moduleRepository.findByIdAndTenantId(moduleId, tenantId))
                .thenReturn(Optional.of(testModule));

        // When
        ModuleResponse result = moduleService.findById(moduleId);

        // Then
        assertThat(result.getName()).isEqualTo("Test Module");
        verify(moduleRepository).findByIdAndTenantId(moduleId, tenantId);
    }

    @Test
    void findById_shouldThrowException_whenNotExists() {
        // Given
        UUID moduleId = UUID.randomUUID();
        when(moduleRepository.findByIdAndTenantId(moduleId, tenantId))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> moduleService.findById(moduleId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Module not found");
    }

    @Test
    void create_shouldSaveAndReturnModule() {
        // Given
        CreateModuleRequest request = new CreateModuleRequest();
        request.setName("New Module");
        request.setCategory("TEST");

        when(moduleRepository.save(any(Module.class))).thenReturn(testModule);

        // When
        ModuleResponse result = moduleService.create(request);

        // Then
        assertThat(result.getName()).isEqualTo("Test Module");
        verify(moduleRepository).save(any(Module.class));
    }

    @Test
    void delete_shouldSoftDeleteModule() {
        // Given
        UUID moduleId = testModule.getId();
        when(moduleRepository.findByIdAndTenantId(moduleId, tenantId))
                .thenReturn(Optional.of(testModule));
        when(moduleRepository.save(any(Module.class))).thenReturn(testModule);

        // When
        moduleService.delete(moduleId);

        // Then
        verify(moduleRepository).findByIdAndTenantId(moduleId, tenantId);
        verify(moduleRepository).save(argThat(module -> module.isDeleted()));
    }
}
```

---

### 11. Create Frontend Component Tests

**Skill**: `create-component-tests`

React Testing Library pattern.

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModuleList from './ModuleList';
import { moduleService } from '@/lib/services/module.service';

jest.mock('@/lib/services/module.service');

describe('ModuleList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('should render modules list', async () => {
    const mockModules = [
      { id: '1', name: 'Module 1', status: 'ACTIVE' },
      { id: '2', name: 'Module 2', status: 'DRAFT' },
    ];

    (moduleService.getAll as jest.Mock).mockResolvedValue(mockModules);

    renderWithProviders(<ModuleList />);

    await waitFor(() => {
      expect(screen.getByText('Module 1')).toBeInTheDocument();
      expect(screen.getByText('Module 2')).toBeInTheDocument();
    });
  });

  it('should handle delete action', async () => {
    const user = userEvent.setup();
    const mockModules = [{ id: '1', name: 'Module 1', status: 'ACTIVE' }];

    (moduleService.getAll as jest.Mock).mockResolvedValue(mockModules);
    (moduleService.delete as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<ModuleList />);

    await waitFor(() => {
      expect(screen.getByText('Module 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(moduleService.delete).toHaveBeenCalledWith('1');
    });
  });

  it('should display loading state', () => {
    (moduleService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ModuleList />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error state', async () => {
    (moduleService.getAll as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    renderWithProviders(<ModuleList />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
```

---

## Architecture Patterns

### 12. Parallel Feature Development

**Skill**: `parallel-development-pattern`

When implementing large features, split into independent vertical slices and work in parallel.

**Pattern**:
1. Identify independent modules (e.g., Auth, Employees, Attendance)
2. Create separate agents/tasks for each module
3. Each agent works in isolated directories to avoid conflicts
4. Merge incrementally after each slice completes

**Example Structure**:
```
Agent A: Authentication
  - app/auth/login/
  - lib/services/auth.service.ts
  - lib/hooks/queries/useAuth.ts

Agent B: Employees
  - app/employees/
  - lib/services/employee.service.ts
  - lib/hooks/queries/useEmployees.ts

Agent C: Attendance
  - app/attendance/
  - lib/services/attendance.service.ts
  - lib/hooks/queries/useAttendance.ts
```

---

### 13. Event-Driven Communication

**Skill**: `event-driven-pattern`

Use Kafka for async communication between modules.

```java
// Producer
@Service
@RequiredArgsConstructor
public class ModuleEventProducer {

    private final KafkaTemplate<String, ModuleEvent> kafkaTemplate;

    public void publishModuleCreated(Module module) {
        ModuleEvent event = new ModuleEvent(
                module.getId(),
                module.getTenantId(),
                EventType.MODULE_CREATED,
                LocalDateTime.now()
        );
        kafkaTemplate.send("module-events", module.getId().toString(), event);
    }
}

// Consumer
@Service
@Slf4j
public class ModuleEventConsumer {

    @KafkaListener(topics = "module-events", groupId = "module-group")
    public void handleModuleEvent(ModuleEvent event) {
        log.info("Received module event: {}", event.getType());

        switch (event.getType()) {
            case MODULE_CREATED -> handleModuleCreated(event);
            case MODULE_UPDATED -> handleModuleUpdated(event);
            case MODULE_DELETED -> handleModuleDeleted(event);
        }
    }

    private void handleModuleCreated(ModuleEvent event) {
        // Send notification, update analytics, etc.
    }
}
```

---

### 14. Caching Strategy

**Skill**: `redis-caching-pattern`

Use Redis for frequently accessed data.

```java
@Service
@RequiredArgsConstructor
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final RedisTemplate<String, ModuleResponse> redisTemplate;

    private static final String CACHE_PREFIX = "module:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);

    @Transactional(readOnly = true)
    public ModuleResponse findById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        String cacheKey = CACHE_PREFIX + tenantId + ":" + id;

        // Try cache first
        ModuleResponse cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        // Fetch from DB
        Module module = moduleRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Module not found"));

        ModuleResponse response = mapToResponse(module);

        // Store in cache
        redisTemplate.opsForValue().set(cacheKey, response, CACHE_TTL);

        return response;
    }

    public ModuleResponse update(UUID id, UpdateModuleRequest request) {
        // ... update logic

        // Invalidate cache
        UUID tenantId = TenantContext.requireCurrentTenant();
        String cacheKey = CACHE_PREFIX + tenantId + ":" + id;
        redisTemplate.delete(cacheKey);

        return response;
    }
}
```

---

## Quick Reference

### Common Command Patterns

```bash
# Generate new module scaffold
./scripts/generate-module.sh ModuleName

# Run all tests
npm test && mvn test

# Build and deploy
docker build -t nu-aura-frontend:latest ./frontend
docker build -t nu-aura-backend:latest ./backend
docker-compose up -d

# Database migration
cd backend && mvn flyway:migrate

# Generate TypeScript types from backend DTOs
npm run generate:types
```

---

*Last Updated: March 2026*
