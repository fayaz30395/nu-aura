---
name: nu-page
description: Use when asked to create a new frontend page, add UI for a feature, or scaffold a Next.js page for NU-AURA. Triggers on phrases like "create page for X", "add UI for X", "new frontend page", "scaffold page for X".
---

# Frontend Page Scaffold for NU-AURA

## When to Use

- User says "create page for X", "add UI for X", "new frontend page", "scaffold list page"
- A new route needs a full page with data fetching, forms, table, and CRUD actions
- An existing module needs a new sub-page (detail view, form page, dashboard)

## Input Required

Ask the user for:
1. **Page name** (e.g., "Asset Categories", "Training Courses")
2. **Route path** (e.g., `/admin/asset-categories`, `/training/courses`)
3. **Page type**: `list` (table + CRUD), `detail` (single entity view), `form` (standalone form), `dashboard` (cards + charts)
4. **Entity name** (PascalCase, e.g., `AssetCategory`) — for type imports
5. **Module** — which service module it belongs to (`hrms`, `hire`, `performance`, `training`, etc.)
6. **Fields to display** — column names for the table or fields for the form
7. **Access roles** — which roles can see this page (default: `SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER`)

## Pre-Flight Checks

Before generating, verify these files exist (generate if missing):
- `frontend/lib/types/{module}/{entity-kebab}.ts` — TypeScript interfaces
- `frontend/lib/services/{module}/{entity-kebab}.service.ts` — API service
- `frontend/lib/hooks/queries/use{EntityName}s.ts` — React Query hooks

If they do not exist, generate them first using the patterns from the `/nu-crud` skill.

## Steps

### Step 1: Create the Page File

**File:** `frontend/app/{route-path}/page.tsx`

#### List Page Template (most common)

```tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { {EntityName}, {EntityName}Request } from '@/lib/types/{module}/{entity-kebab}';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui';
import {
  useAll{EntityName}s,
  useActive{EntityName}s,
  useCreate{EntityName},
  useUpdate{EntityName},
  useDelete{EntityName},
} from '@/lib/hooks/queries/use{EntityName}s';

// ------------------------------------------------------------------
// Access control — list roles that may view this page
// ------------------------------------------------------------------
const PAGE_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

// ------------------------------------------------------------------
// Zod schema — mirrors backend validation exactly
// ------------------------------------------------------------------
const {entityName}Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  // Add all form fields with proper Zod validators:
  // z.string().min(1, 'Required')       — required text
  // z.string().optional().or(z.literal(''))  — optional text
  // z.number({ coerce: true }).positive()    — required number
  // z.boolean().default(false)               — checkbox
  // z.enum(['A', 'B'])                       — select dropdown
});

type {EntityName}FormData = z.infer<typeof {entityName}Schema>;

// ------------------------------------------------------------------
// Page Component
// ------------------------------------------------------------------
export default function {EntityName}sPage() {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  // --- Form state (React Hook Form + Zod) ---
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{EntityName}FormData>({
    resolver: zodResolver({entityName}Schema),
    defaultValues: {
      name: '',
      // Set all default values
    },
  });

  // --- Local UI state ---
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{EntityName} | null>(null);

  // --- React Query hooks ---
  const { data: items = [], isLoading } = useActive{EntityName}s();
  // For paginated: const { data, isLoading } = useAll{EntityName}s(page, size);
  const createMutation = useCreate{EntityName}();
  const updateMutation = useUpdate{EntityName}();
  const deleteMutation = useDelete{EntityName}();

  // --- Access guard ---
  // Return null immediately after router.push() so the component stops rendering
  // and does not briefly expose privileged UI before navigation completes.
  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...PAGE_ACCESS_ROLES)) {
    router.push('/home');
    return null;
  }
  if (hasHydrated && isReady && !isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  // --- Form submit handler ---
  const onSubmit = async (data: {EntityName}FormData) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: data as {EntityName}Request },
        {
          onSuccess: () => {
            setShowForm(false);
            setEditingId(null);
            reset();
            toast.success('{Entity display name} updated successfully');
          },
          onError: (error: unknown) => {
            toast.error(
              (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to update {entity display name}'
            );
          },
        }
      );
    } else {
      createMutation.mutate(data as {EntityName}Request, {
        onSuccess: () => {
          setShowForm(false);
          setEditingId(null);
          reset();
          toast.success('{Entity display name} created successfully');
        },
        onError: (error: unknown) => {
          toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create {entity display name}'
          );
        },
      });
    }
  };

  // --- Edit handler ---
  const handleEdit = (item: {EntityName}) => {
    reset({
      name: item.name,
      // Map all editable fields from the entity to form defaults
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  // --- Delete handler ---
  const handleDelete = (item: {EntityName}) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const performDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate(itemToDelete.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setItemToDelete(null);
        toast.success('{Entity display name} deleted successfully');
      },
      onError: (error: unknown) => {
        toast.error(
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to delete {entity display name}'
        );
      },
    });
  };

  // --- Render ---
  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Delete confirmation */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setItemToDelete(null);
          }}
          onConfirm={performDelete}
          title="Delete {Entity Display Name}"
          message={`Are you sure you want to delete "${itemToDelete?.name}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Page header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold skeuo-emboss">{Page Title}</h1>
          <button
            onClick={() => {
              reset();
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Add {Entity Display Name}
          </button>
        </div>

        {/* Inline create/edit form */}
        {showForm && (
          <div className="bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-elevated)] p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit {Entity Display Name}' : 'Add New {Entity Display Name}'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* --- Form fields --- */}
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full p-2 border rounded-lg bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-primary)]"
                />
                {errors.name && <p className="text-danger-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              {/* Add more fields following same pattern */}

              {/* --- Form actions --- */}
              <div className="col-span-2 flex gap-4 mt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  {isSubmitting || createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : (editingId ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); reset(); }}
                  className="px-6 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:opacity-80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Data table */}
        {isLoading ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">Loading...</div>
        ) : (
          <div className="bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-elevated)] overflow-hidden">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
              <thead className="bg-[var(--bg-secondary)]/50">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Name</th>
                  {/* Add columns */}
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-card)] divide-y divide-surface-200 dark:divide-surface-700">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{item.name}</td>
                    {/* Add data cells */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.isActive
                          ? 'bg-success-100 text-success-800'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-accent-700 dark:text-accent-400 hover:text-accent-800 mr-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-danger-600 hover:text-danger-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={99} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                      No {entity display name plural} found. Create your first one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
```

### Step 2: Generate Supporting Files (if missing)

If the types, service, or hook files do not already exist, generate them:

**Types** (`frontend/lib/types/{module}/{entity-kebab}.ts`):
```typescript
export interface {EntityName} {
  id: string;
  name: string;
  // Fields matching the backend Response DTO
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface {EntityName}Request {
  name: string;
  // Fields matching the backend Request DTO
}
```

**Service** (`frontend/lib/services/{module}/{entity-kebab}.service.ts`):
```typescript
import { apiClient } from '../../api/client';
import { {EntityName}, {EntityName}Request } from '../../types/{module}/{entity-kebab}';

export const {entityName}Service = {
  getAll: async (page = 0, size = 20) => {
    const response = await apiClient.get('/{route-path}', { params: { page, size } });
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

**Hook** (`frontend/lib/hooks/queries/use{EntityName}s.ts`):
Follow the exact pattern from `useDepartments.ts` — query key factory, staleTime, mutations with invalidation.

### Step 3: Wire the Route (if new)

If this is a new top-level route prefix, add it to:
- `frontend/lib/config/apps.ts` — map the route prefix to the correct sub-app
- `frontend/components/layout/menuSections.tsx` — add the sidebar menu item with icon and permission

## Design System Compliance Checklist

Every generated page MUST pass these checks:

```
Design System Compliance:
  [x] 'use client' directive at line 1
  [x] No bg-white — use bg-[var(--bg-card)] or bg-[var(--bg-main)]
  [x] No shadow-sm/md/lg — use shadow-[var(--shadow-card)] or shadow-[var(--shadow-elevated)]
  [x] No hardcoded colors (gray-*, slate-*, blue-*, etc.) — use accent-*, success-*, danger-*, warning-*, info-*, surface-*
  [x] Text uses var(--text-primary), var(--text-secondary), var(--text-heading)
  [x] Borders use var(--border-main) or var(--border-subtle)
  [x] Background uses var(--bg-card), var(--bg-main), var(--bg-secondary)
  [x] 8px spacing grid (p-1/2/4/6/8, gap-1/2/4/6/8) — no p-3, p-5, gap-3, gap-5
  [x] Border radius: rounded-md (small), rounded-lg (standard), rounded-xl (cards)
  [x] All buttons have cursor-pointer
  [x] All buttons have focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]
  [x] All icon-only buttons have aria-label
  [x] Skeuomorphic heading: skeuo-emboss class on page title
  [x] Primary buttons: bg-accent-500 hover:bg-accent-700
  [x] Form inputs: border-[var(--border-main)] bg-[var(--bg-card)]
  [x] Error messages: text-danger-500
  [x] Status badges: success-100/success-800 for active, bg-[var(--bg-secondary)] for inactive

Functional Checks:
  [x] Role-based access guard at top of component
  [x] React Hook Form + Zod schema for all forms
  [x] React Query hooks for data fetching (no raw useEffect + fetch)
  [x] Loading state rendered
  [x] Empty state rendered with helpful message
  [x] Error handling with toast notifications
  [x] ConfirmDialog for destructive actions
  [x] Form resets on close/submit
  [x] Disabled submit button during mutation pending state
```

## Output Checklist

```
Generated Files:
  [x] frontend/app/{route}/page.tsx                    — Page component
  [x] frontend/lib/types/{module}/{entity}.ts          — TypeScript interfaces (if new)
  [x] frontend/lib/services/{module}/{entity}.service.ts — API service (if new)
  [x] frontend/lib/hooks/queries/use{Entity}s.ts       — React Query hooks (if new)

Manual Wiring Required:
  [ ] Add route to frontend/lib/config/apps.ts (if new route prefix)
  [ ] Add sidebar item in frontend/components/layout/menuSections.tsx
  [ ] Verify backend endpoints exist and match the service URLs
  [ ] Run: cd frontend && npm run build (verify no TypeScript errors)
```
