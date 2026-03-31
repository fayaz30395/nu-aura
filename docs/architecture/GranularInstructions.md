# NU-AURA Platform — Granular Coding Instructions

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## File-Level Guidelines

### Backend: Creating a New Module

When adding a new backend module (e.g., `benefits`):

```
1. Controller:  backend/src/main/java/com/hrms/api/benefits/controller/BenefitController.java
2. DTOs:        backend/src/main/java/com/hrms/api/benefits/dto/BenefitRequest.java
                backend/src/main/java/com/hrms/api/benefits/dto/BenefitResponse.java
3. Service:     backend/src/main/java/com/hrms/application/benefits/service/BenefitService.java
4. Entity:      backend/src/main/java/com/hrms/domain/benefits/Benefit.java
5. Repository:  backend/src/main/java/com/hrms/infrastructure/benefits/repository/BenefitRepository.java
6. Migration:   backend/src/main/resources/db/migration/V48__add_benefits_table.sql
7. Test:        backend/src/test/java/com/hrms/api/benefits/controller/BenefitControllerTest.java
```

### Backend: Entity Template

```java
@Entity
@Table(name = "benefits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Where(clause = "is_deleted = false")
@EntityListeners(AuditingEntityListener.class)
public class Benefit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tenantId;

    // Domain fields here

    @Column(nullable = false)
    private boolean isDeleted = false;

    private Instant deletedAt;

    @CreatedBy
    private String createdBy;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedBy
    private String updatedBy;

    @LastModifiedDate
    private Instant updatedAt;
}
```

### Backend: Controller Template

```java
@RestController
@RequestMapping("/api/v1/benefits")
@RequiredArgsConstructor
@Slf4j
public class BenefitController {

    private final BenefitService benefitService;

    @GetMapping
    @PreAuthorize("hasPermission(null, 'benefit.read')")
    public ResponseEntity<Page<BenefitResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(benefitService.list(page, size));
    }

    @PostMapping
    @PreAuthorize("hasPermission(null, 'benefit.create')")
    public ResponseEntity<BenefitResponse> create(@Valid @RequestBody BenefitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(benefitService.create(request));
    }
}
```

### Backend: Service Template

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class BenefitService {

    private final BenefitRepository benefitRepository;
    private final TenantContext tenantContext;

    @Transactional(readOnly = true)
    public Page<BenefitResponse> list(int page, int size) {
        UUID tenantId = tenantContext.getCurrentTenantId();
        return benefitRepository
                .findAllByTenantIdAndIsDeletedFalse(tenantId, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    @Transactional
    public BenefitResponse create(BenefitRequest request) {
        UUID tenantId = tenantContext.getCurrentTenantId();
        Benefit benefit = Benefit.builder()
                .tenantId(tenantId)
                // map fields
                .build();
        return toResponse(benefitRepository.save(benefit));
    }
}
```

### Backend: Flyway Migration Template

```sql
-- V48__description.sql
-- Description of what this migration does

CREATE TABLE IF NOT EXISTS benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    -- domain columns
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Always add tenant_id index
CREATE INDEX IF NOT EXISTS idx_benefits_tenant_id ON benefits(tenant_id);

-- RLS policy
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY benefits_tenant_isolation ON benefits
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

---

### Frontend: Creating a New Page

When adding a new page (e.g., `/benefits`):

```
1. Page:        frontend/app/benefits/page.tsx
2. Service:     frontend/lib/services/benefit.service.ts
3. Hook:        frontend/lib/hooks/queries/useBenefits.ts
4. Types:       frontend/lib/types/benefit.ts
5. Validation:  frontend/lib/validations/benefit.ts (if forms)
6. E2E Test:    frontend/e2e/benefits.spec.ts
```

### Frontend: Page Template

```typescript
'use client';

import { useState } from 'react';
import { Title, Button, Group } from '@mantine/core';
import { Plus } from 'lucide-react';
import { useBenefits } from '@/lib/hooks/queries/useBenefits';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BenefitsPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useBenefits(page, 20);

  if (isLoading) return <Skeleton count={5} />;
  if (error) return <EmptyState icon={AlertCircle} title="Failed to load benefits" />;

  return (
    <div className="space-y-6">
      <Group justify="space-between">
        <Title order={2}>Benefits</Title>
        <PermissionGate permission="benefit.create">
          <Button leftSection={<Plus size={16} />}>Add Benefit</Button>
        </PermissionGate>
      </Group>
      <ResponsiveTable data={data?.content ?? []} columns={columns} />
    </div>
  );
}
```

### Frontend: Service Template

```typescript
// frontend/lib/services/benefit.service.ts
import apiClient from '@/lib/api/client';
import type { Benefit, CreateBenefitRequest, Page } from '@/lib/types/benefit';

export const benefitService = {
  list: (page: number, size: number) =>
    apiClient.get<Page<Benefit>>(`/api/v1/benefits?page=${page}&size=${size}`),

  getById: (id: string) =>
    apiClient.get<Benefit>(`/api/v1/benefits/${id}`),

  create: (data: CreateBenefitRequest) =>
    apiClient.post<Benefit>('/api/v1/benefits', data),

  update: (id: string, data: Partial<CreateBenefitRequest>) =>
    apiClient.put<Benefit>(`/api/v1/benefits/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/api/v1/benefits/${id}`),
};
```

### Frontend: React Query Hook Template

```typescript
// frontend/lib/hooks/queries/useBenefits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitService } from '@/lib/services/benefit.service';

export const benefitKeys = {
  all: ['benefits'] as const,
  lists: () => [...benefitKeys.all, 'list'] as const,
  list: (page: number, size: number) => [...benefitKeys.lists(), { page, size }] as const,
  details: () => [...benefitKeys.all, 'detail'] as const,
  detail: (id: string) => [...benefitKeys.details(), id] as const,
};

export function useBenefits(page: number, size: number) {
  return useQuery({
    queryKey: benefitKeys.list(page, size),
    queryFn: () => benefitService.list(page, size).then(r => r.data),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useBenefit(id: string) {
  return useQuery({
    queryKey: benefitKeys.detail(id),
    queryFn: () => benefitService.getById(id).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateBenefit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: benefitService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.lists() });
    },
  });
}
```

### Frontend: Type Template

```typescript
// frontend/lib/types/benefit.ts
export interface Benefit {
  id: string;
  tenantId: string;
  name: string;
  // domain fields
  createdAt: string;
  updatedAt: string;
}

export interface CreateBenefitRequest {
  name: string;
  // required fields
}

export interface Page<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}
```

### Frontend: Zod Validation Template

```typescript
// frontend/lib/validations/benefit.ts
import { z } from 'zod';

export const createBenefitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  // domain fields with appropriate constraints
});

export type CreateBenefitFormData = z.infer<typeof createBenefitSchema>;
```

---

## Critical Patterns to Follow

### DO

1. **Always read existing code before modifying** — understand patterns in place
2. **Use the existing Axios client** at `frontend/lib/api/client.ts`
3. **Add `tenant_id` to every new entity** and create RLS policy in migration
4. **Use `@PreAuthorize("hasPermission(null, 'module.action')")`** on all controller methods
5. **Use `@Transactional` on service methods** that modify data
6. **Add `is_deleted` + `deleted_at`** to every new entity (soft delete)
7. **Use UUID v4** for all primary keys (`GenerationType.UUID`)
8. **Add indexes** on `tenant_id` and frequently queried columns in migrations
9. **Use React Query hierarchical keys** for cache management
10. **Use `PermissionGate`** or `usePermissions()` for UI permission checks
11. **Use `ResponsiveTable`** for all data tables
12. **Follow the error → loading → data pattern** in all pages

### DON'T

1. **Don't create a new Axios instance** — ever
2. **Don't use `any` in TypeScript** — define interfaces
3. **Don't use raw `useEffect` + `fetch`** — use React Query
4. **Don't use uncontrolled inputs** — use React Hook Form + Zod
5. **Don't use `db/changelog/`** — that's legacy Liquibase
6. **Don't hard-delete data** — use soft delete
7. **Don't skip tenant_id** on any new table
8. **Don't add npm packages** without checking `package.json`
9. **Don't use NextAuth** — custom JWT implementation
10. **Don't create documentation files** unless explicitly asked

---

## Route Registration

When adding a new page route, update:

1. **`frontend/lib/config/apps.ts`** — Add route to appropriate app's `routePrefixes`
2. **`frontend/middleware.ts`** — Add to authenticated routes array (if protected)
3. **Sidebar config** — Add navigation item to appropriate section
4. **Permission seed** — Add `module.action` permission in migration if needed

---

## Test Checklist

### Backend (Required)
- [ ] Controller test with MockMvc
- [ ] Service test with mocked repository
- [ ] Tenant isolation verification
- [ ] Permission check test (@PreAuthorize)

### Frontend (Recommended)
- [ ] E2E test for critical user flow
- [ ] Permission gating test
- [ ] Form validation test
- [ ] Error state handling test
