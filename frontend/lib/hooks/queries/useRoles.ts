'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { rolesApi, permissionsApi } from '@/lib/api/roles';
import { usersApi } from '@/lib/api/users';
import {
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionsRequest,
  AssignPermissionsWithScopeRequest,
  UpdatePermissionScopeRequest,
  Permission as _Permission,
} from '@/lib/types/roles';

// Query key factory
const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...roleKeys.lists(), filters || {}] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
  permissions: () => ['permissions'] as const,
  users: () => ['admin-users'] as const,
};

// ========== Queries ==========

/**
 * Fetch all roles
 */
export function useRoles() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: () => rolesApi.getAllRoles(),
  });
}

/**
 * Fetch a single role by ID
 */
export function useRole(roleId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: roleKeys.detail(roleId),
    queryFn: () => rolesApi.getRoleById(roleId),
    enabled: enabled && !!roleId,
  });
}

/**
 * Fetch all permissions
 */
export function usePermissions() {
  return useQuery({
    queryKey: roleKeys.permissions(),
    queryFn: () => permissionsApi.getAllPermissions(),
  });
}

/**
 * Fetch permissions by resource
 */
export function usePermissionsByResource(resource: string) {
  return useQuery({
    queryKey: [...roleKeys.permissions(), 'resource', resource] as const,
    queryFn: () => permissionsApi.getPermissionsByResource(resource),
    enabled: !!resource,
  });
}

/**
 * Fetch effective (flattened) permissions for a role (includes inherited from parent)
 */
export function useEffectivePermissions(roleId: string) {
  return useQuery({
    queryKey: [...roleKeys.detail(roleId), 'effective-permissions'] as const,
    queryFn: async () => {
      const response = await rolesApi.getEffectivePermissions(roleId);
      return response;
    },
    enabled: !!roleId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch all admin users
 */
export function useRoleAdminUsers() {
  return useQuery({
    queryKey: roleKeys.users(),
    queryFn: () => usersApi.getAllUsers(),
  });
}

// ========== Mutations ==========

/**
 * Create a new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => rolesApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      notifications.show({
        title: 'Success',
        message: 'Role created successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to create role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create role',
        color: 'red',
      });
    },
  });
}

/**
 * Update an existing role
 */
export function useUpdateRole(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRoleRequest) => rolesApi.updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      notifications.show({
        title: 'Success',
        message: 'Role updated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to update role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update role',
        color: 'red',
      });
    },
  });
}

/**
 * Delete a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => rolesApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      notifications.show({
        title: 'Success',
        message: 'Role deleted successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to delete role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete role. It might be assigned to users.',
        color: 'red',
      });
    },
  });
}

/**
 * Assign permissions to a role (legacy, without scopes)
 */
export function useAssignPermissions(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPermissionsRequest) =>
      rolesApi.assignPermissions(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      notifications.show({
        title: 'Success',
        message: 'Permissions assigned successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to assign permissions:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to assign permissions',
        color: 'red',
      });
    },
  });
}

/**
 * Add permissions to a role
 */
export function useAddPermissions(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPermissionsRequest) =>
      rolesApi.addPermissions(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      notifications.show({
        title: 'Success',
        message: 'Permissions added successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to add permissions:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to add permissions',
        color: 'red',
      });
    },
  });
}

/**
 * Remove permissions from a role
 */
export function useRemovePermissions(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPermissionsRequest) =>
      rolesApi.removePermissions(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      notifications.show({
        title: 'Success',
        message: 'Permissions removed successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to remove permissions:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to remove permissions',
        color: 'red',
      });
    },
  });
}

/**
 * Assign permissions with scope to a role (Keka-style RBAC)
 */
export function useAssignPermissionsWithScope(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPermissionsWithScopeRequest) =>
      rolesApi.assignPermissionsWithScope(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      notifications.show({
        title: 'Success',
        message: 'Permissions with scope assigned successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to assign permissions with scope:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to assign permissions with scope',
        color: 'red',
      });
    },
  });
}

/**
 * Update permission scope for a role
 */
export function useUpdatePermissionScope(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ permissionCode, data }: { permissionCode: string; data: UpdatePermissionScopeRequest }) =>
      rolesApi.updatePermissionScope(roleId, permissionCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      notifications.show({
        title: 'Success',
        message: 'Permission scope updated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to update permission scope:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update permission scope',
        color: 'red',
      });
    },
  });
}

/**
 * Assign roles to a user
 */
export function useAssignRolesToUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleCodes: string[]) =>
      usersApi.assignRoles(userId, roleCodes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.users() });
      notifications.show({
        title: 'Success',
        message: 'User roles updated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to assign roles:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to assign roles',
        color: 'red',
      });
    },
  });
}
