'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleScope,
  CustomTarget,
  PermissionScopeRequest,
  SCOPE_LABELS,
} from '@/lib/types/roles';
import { ScopeSelector } from '@/components/admin/ScopeSelector';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { AdminPageContent } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui';
import {
  useRoles,
  usePermissions as useQueryPermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignPermissionsWithScope,
  useEffectivePermissions,
} from '@/lib/hooks/queries/useRoles';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('RolesPage');

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const createRoleFormSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional().or(z.literal('')),
});

const updateRoleFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional().or(z.literal('')),
  parentRoleId: z.string().nullable().optional(),
});

type CreateRoleFormData = z.infer<typeof createRoleFormSchema>;
type UpdateRoleFormData = z.infer<typeof updateRoleFormSchema>;

interface ParentRoleOption {
  value: string;
  label: string;
}

export default function RolesPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  // Query hooks
  const rolesQuery = useRoles();
  const permissionsQuery = useQueryPermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  // Track permissions with their scopes
  const [permissionScopes, setPermissionScopes] = useState<Map<string, { scope: RoleScope; customTargets: CustomTarget[] }>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [selectedParentRoleId, setSelectedParentRoleId] = useState<string | null>(null);

  // Create form (for new role)
  const createForm = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleFormSchema),
    defaultValues: { code: '', name: '', description: '' },
  });

  // Edit form (for updating role)
  const editForm = useForm<UpdateRoleFormData>({
    resolver: zodResolver(updateRoleFormSchema),
    defaultValues: { name: '', description: '' },
  });

  // Mutation hooks
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole(selectedRole?.id || '');
  const deleteRoleMutation = useDeleteRole();
  const assignPermissionsMutation = useAssignPermissionsWithScope(selectedRole?.id || '');

  // Query hook for inherited permissions
  const inheritedPermissionsQuery = useEffectivePermissions(selectedParentRoleId || '');

  useEffect(() => {
    if (!hasHydrated || !isReady) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) {
      router.push('/home');
      return;
    }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const roles = rolesQuery.data || [];
  const permissions = permissionsQuery.data || [];
  const isLoading = rolesQuery.isLoading || permissionsQuery.isLoading;

  const handleCreateRole = async (data: CreateRoleFormData) => {
    try {
      const submitData: CreateRoleRequest = {
        code: data.code,
        name: data.name,
        description: data.description || '',
        permissionCodes: [],
      };
      await createRoleMutation.mutateAsync(submitData);
      setShowCreateModal(false);
      createForm.reset();
    } catch (error) {
      log.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async (data: UpdateRoleFormData) => {
    if (!selectedRole) return;
    try {
      const updateData: UpdateRoleRequest = {
        name: data.name,
        description: data.description || '',
        parentRoleId: data.parentRoleId || undefined,
      };
      await updateRoleMutation.mutateAsync(updateData);
      setShowEditModal(false);
      setSelectedRole(null);
      setSelectedParentRoleId(null);
      editForm.reset();
    } catch (error) {
      log.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  const performDelete = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRoleMutation.mutateAsync(roleToDelete.id);
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
    } catch (error) {
      log.error('Failed to delete role:', error);
    }
  };

  const handleAssignPermissions = async () => {
    if (!selectedRole) return;
    try {
      // Build permissions with scopes
      const permissionsWithScopes: PermissionScopeRequest[] = selectedPermissions.map((code) => {
        const scopeData = permissionScopes.get(code) || { scope: 'ALL' as RoleScope, customTargets: [] };
        return {
          permissionCode: code,
          scope: scopeData.scope,
          customTargets: scopeData.scope === 'CUSTOM' ? scopeData.customTargets : undefined,
        };
      });

      await assignPermissionsMutation.mutateAsync({
        permissions: permissionsWithScopes,
        replaceAll: true,
      });
      setShowPermissionsModal(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      setPermissionScopes(new Map());
    } catch (error) {
      log.error('Failed to assign permissions:', error);
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setSelectedParentRoleId(role.parentRoleId || null);
    editForm.reset({
      name: role.name,
      description: role.description || '',
      parentRoleId: role.parentRoleId || null,
    });
    setShowEditModal(true);
  };

  const openPermissionsModal = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions.map((p) => p.code));

    // Initialize permission scopes from role's current permissions
    const scopeMap = new Map<string, { scope: RoleScope; customTargets: CustomTarget[] }>();
    role.permissions.forEach((p) => {
      scopeMap.set(p.code, {
        scope: p.scope || 'ALL',
        customTargets: p.customTargets || [],
      });
    });
    setPermissionScopes(scopeMap);

    setShowPermissionsModal(true);
  };

  const togglePermission = (code: string) => {
    const isSelected = selectedPermissions.includes(code);
    if (isSelected) {
      setSelectedPermissions((prev) => prev.filter((c) => c !== code));
      // Remove scope when permission is deselected
      setPermissionScopes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(code);
        return newMap;
      });
    } else {
      setSelectedPermissions((prev) => [...prev, code]);
      // Set default scope when permission is selected
      setPermissionScopes((prev) => {
        const newMap = new Map(prev);
        newMap.set(code, { scope: 'ALL', customTargets: [] });
        return newMap;
      });
    }
  };

  const updatePermissionScope = (code: string, scope: RoleScope) => {
    setPermissionScopes((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(code) || { scope: 'ALL', customTargets: [] };
      newMap.set(code, { ...current, scope });
      return newMap;
    });
  };

  const updatePermissionCustomTargets = (code: string, customTargets: CustomTarget[]) => {
    setPermissionScopes((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(code) || { scope: 'CUSTOM', customTargets: [] };
      newMap.set(code, { ...current, customTargets });
      return newMap;
    });
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const resourceKey = permission.resource ?? 'UNASSIGNED';
    if (!acc[resourceKey]) {
      acc[resourceKey] = [];
    }
    acc[resourceKey].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get available parent roles (exclude current role and descendants to prevent cycles)
  const getAvailableParentRoles = (): ParentRoleOption[] => {
    if (!selectedRole) return [];

    // Build a set of role IDs that are descendants of the current role
    const descendants = new Set<string>();
    const addDescendants = (roleId: string) => {
      descendants.add(roleId);
      roles
        .filter((r) => r.parentRoleId === roleId)
        .forEach((r) => addDescendants(r.id));
    };
    addDescendants(selectedRole.id);

    return roles
      .filter((role) =>
        role.id !== selectedRole.id &&
        !descendants.has(role.id) &&
        !role.isSystemRole
      )
      .map((role) => ({
        value: role.id,
        label: `${role.name} (${role.code})`,
      }));
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center p-8">
          <div className="text-[var(--text-secondary)]">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <AdminPageContent>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setRoleToDelete(null);
        }}
        onConfirm={performDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${roleToDelete?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">Role Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage user roles and permissions</p>
        </div>

      <div className="mb-6 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-aura px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700"
        >
          Create Role
        </button>
      </div>

      <div className="skeuo-card rounded-xl overflow-x-auto">
        <table className="table-aura">
          <thead className="skeuo-table-header">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--bg-input)] divide-y divide-[var(--border-main)]">
            {filteredRoles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-[var(--text-muted)] text-sm">No roles found</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">Try adjusting your search or create a new role.</p>
                </td>
              </tr>
            )}
            {filteredRoles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                  {role.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {role.name}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                  {role.description || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                  {role.permissions.length} permissions
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {role.isSystemRole ? (
                    <span className="badge-status status-neutral">
                      System
                    </span>
                  ) : (
                    <span className="badge-status status-success">
                      Custom
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openPermissionsModal(role)}
                    className="text-accent-700 hover:text-accent-700 mr-3"
                  >
                    Permissions
                  </button>
                  {!role.isSystemRole && (
                    <>
                      <button
                        onClick={() => openEditModal(role)}
                        className="text-[var(--text-link)] hover:text-[var(--text-link-hover)] mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="text-danger-600 hover:text-danger-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Create New Role</h2>
            <form onSubmit={createForm.handleSubmit(handleCreateRole)}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Code Input */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    {...createForm.register('code')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-accent-400"
                    placeholder="e.g., MANAGER"
                  />
                  {createForm.formState.errors.code && (
                    <p className="mt-1 text-xs text-danger-500">{createForm.formState.errors.code.message}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Unique identifier for this role (uppercase)
                  </p>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    {...createForm.register('name')}
                    className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-accent-400"
                    placeholder="e.g., Manager"
                  />
                  {createForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-danger-500">{createForm.formState.errors.name.message}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Display name for this role
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  {...createForm.register('description')}
                  className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-accent-400"
                  rows={3}
                  placeholder="Optional description of this role..."
                />
                {createForm.formState.errors.description && (
                  <p className="mt-1 text-xs text-danger-500">{createForm.formState.errors.description.message}</p>
                )}
              </div>

              {/* Permissions Dropdown - Note: permissions are NOT part of the form, handled separately */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Permissions
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    onFocus={() => setShowPermissionDropdown(true)}
                    className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-accent-400"
                    placeholder="Search and select permissions..."
                  />
                  {showPermissionDropdown && permissions.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPermissionDropdown(false)} />
                      <div className="absolute z-20 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {permissions
                          .filter(permission =>
                            permission.code.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                            permission.description?.toLowerCase().includes(permissionSearch.toLowerCase())
                          )
                          .map((permission) => {
                            // Permissions are managed separately from form
                            const isSelected = false;
                            return (
                              <div
                                key={permission.code}
                                onClick={() => {
                                  // Permissions are managed separately via the Permissions modal
                                  // Not part of the create form
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-[var(--bg-surface)] ${
                                  isSelected ? 'bg-accent-50' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-[var(--text-primary)]">
                                      {permission.code}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">
                                      {permission.description || 'No description'}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <svg className="w-5 h-5 text-accent-700" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        {permissions.filter(permission =>
                          permission.code.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                          permission.description?.toLowerCase().includes(permissionSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                            No permissions found
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {showPermissionDropdown && permissions.length === 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-lg p-4">
                      <p className="text-sm text-[var(--text-muted)] text-center">
                        No permissions available. Please check if you are logged in.
                      </p>
                    </div>
                  )}
                </div>
                {/* Permissions will be shown only in the permissions modal after creation */}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    createForm.reset();
                  }}
                  className="px-4 py-2 text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createForm.formState.isSubmitting || createRoleMutation.isPending}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                >
                  {createForm.formState.isSubmitting || createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Edit Role</h2>
            <form onSubmit={editForm.handleSubmit(handleUpdateRole)}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Code
                </label>
                <input
                  type="text"
                  value={selectedRole.code}
                  className="w-full px-3 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  disabled
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  {...editForm.register('name')}
                  className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-accent-400"
                />
                {editForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-danger-500">{editForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  {...editForm.register('description')}
                  className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-accent-400"
                  rows={3}
                />
                {editForm.formState.errors.description && (
                  <p className="mt-1 text-xs text-danger-500">{editForm.formState.errors.description.message}</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Parent Role
                </label>
                <select
                  {...editForm.register('parentRoleId')}
                  value={selectedParentRoleId || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setSelectedParentRoleId(value);
                    editForm.setValue('parentRoleId', value);
                  }}
                  className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-accent-400"
                >
                  <option value="">None</option>
                  {getAvailableParentRoles().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Select a parent role to inherit its permissions
                </p>
              </div>
              {/* Inherited Permissions Section */}
              {selectedParentRoleId && inheritedPermissionsQuery.data && inheritedPermissionsQuery.data.length > 0 && (
                <div className="mb-4 p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-main)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Inherited Permissions from {selectedRole.parentRoleName || 'Parent Role'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {inheritedPermissionsQuery.data.map((permission) => (
                      <span
                        key={permission.code}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-muted)] opacity-75"
                      >
                        {permission.code}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    These permissions are inherited from the parent role and cannot be modified here.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRole(null);
                    setSelectedParentRoleId(null);
                    editForm.reset();
                  }}
                  className="px-4 py-2 text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editForm.formState.isSubmitting || updateRoleMutation.isPending}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                >
                  {editForm.formState.isSubmitting || updateRoleMutation.isPending ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal with Scope Selection */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 w-full max-w-5xl max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
              Manage Permissions - {selectedRole.name}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Select permissions and configure their scope. Scope determines what data the permission grants access to.
            </p>
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className="border border-[var(--border-main)] rounded-lg p-4 bg-[var(--bg-surface)]">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3">{resource}</h3>
                  <div className="space-y-4">
                    {perms.map((permission) => {
                      const isSelected = selectedPermissions.includes(permission.code);
                      const scopeData = permissionScopes.get(permission.code);
                      const currentScope = scopeData?.scope || 'ALL';

                      return (
                        <div
                          key={permission.id}
                          className={`p-4 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-accent-300 bg-accent-50'
                              : 'border-[var(--border-main)] hover:border-[var(--border-focus)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <label className="flex items-start space-x-4 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermission(permission.code)}
                                disabled={selectedRole.isSystemRole}
                                className="mt-1 rounded text-accent-700 focus:ring-accent-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                  {permission.name}
                                </span>
                                <span className="text-xs text-[var(--text-muted)] ml-2">
                                  ({permission.code})
                                </span>
                                {permission.description && (
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </label>

                            {/* Show current scope badge for system roles */}
                            {isSelected && selectedRole.isSystemRole && (
                              <span className="text-xs px-2 py-1 rounded bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                                {SCOPE_LABELS[currentScope]}
                              </span>
                            )}
                          </div>

                          {/* Scope selector with custom target picker - only show when permission is selected */}
                          {isSelected && !selectedRole.isSystemRole && (
                            <div className="mt-3 pl-6">
                              <ScopeSelector
                                value={currentScope}
                                onChange={(scope) => updatePermissionScope(permission.code, scope)}
                                customTargets={scopeData?.customTargets || []}
                                onCustomTargetsChange={(targets) => updatePermissionCustomTargets(permission.code, targets)}
                                showDescription={false}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 p-4 bg-[var(--bg-surface)] rounded-lg space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>{selectedPermissions.length}</strong> permission(s) selected
              </p>
              {/* Show warning for CUSTOM scopes without targets */}
              {(() => {
                const customScopesWithoutTargets = selectedPermissions.filter(code => {
                  const scopeData = permissionScopes.get(code);
                  return scopeData?.scope === 'CUSTOM' && (!scopeData.customTargets || scopeData.customTargets.length === 0);
                });
                if (customScopesWithoutTargets.length > 0) {
                  return (
                    <p className="text-xs text-warning-600 dark:text-warning-400">
                      <strong>{customScopesWithoutTargets.length}</strong> permission(s) have CUSTOM scope but no targets selected
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedRole(null);
                  setSelectedPermissions([]);
                  setPermissionScopes(new Map());
                }}
                className="px-4 py-2 text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg hover:opacity-80"
              >
                Cancel
              </button>
              {!selectedRole.isSystemRole && (() => {
                const hasInvalidCustomScopes = selectedPermissions.some(code => {
                  const scopeData = permissionScopes.get(code);
                  return scopeData?.scope === 'CUSTOM' && (!scopeData.customTargets || scopeData.customTargets.length === 0);
                });
                return (
                  <button
                    onClick={handleAssignPermissions}
                    disabled={hasInvalidCustomScopes}
                    title={hasInvalidCustomScopes ? 'Please add targets for all CUSTOM scope permissions' : undefined}
                    className={`px-4 py-2 rounded-lg ${
                      hasInvalidCustomScopes
                        ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed'
                        : 'bg-accent-500 text-white hover:bg-accent-700'
                    }`}
                  >
                    Save Permissions
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminPageContent>
  );
}
