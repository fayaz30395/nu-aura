'use client';

import { useState, useEffect } from 'react';
import { rolesApi, permissionsApi } from '@/lib/api/roles';
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

// Permission with scope tracking for the modal
interface PermissionWithScope {
  code: string;
  selected: boolean;
  scope: RoleScope;
  customTargets: CustomTarget[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<CreateRoleRequest>({
    code: '',
    name: '',
    description: '',
    permissionCodes: [],
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  // New: Track permissions with their scopes
  const [permissionScopes, setPermissionScopes] = useState<Map<string, { scope: RoleScope; customTargets: CustomTarget[] }>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        rolesApi.getAllRoles(),
        permissionsApi.getAllPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
      console.log('Loaded roles:', rolesData.length, 'Loaded permissions:', permissionsData.length);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load roles and permissions. Please check if you are logged in and the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rolesApi.createRole(formData);
      setShowCreateModal(false);
      setFormData({ code: '', name: '', description: '', permissionCodes: [] });
      loadData();
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    try {
      const updateData: UpdateRoleRequest = {
        name: formData.name,
        description: formData.description,
      };
      await rolesApi.updateRole(selectedRole.id, updateData);
      setShowEditModal(false);
      setSelectedRole(null);
      setFormData({ code: '', name: '', description: '', permissionCodes: [] });
      loadData();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await rolesApi.deleteRole(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete role:', error);
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

      await rolesApi.assignPermissionsWithScope(selectedRole.id, {
        permissions: permissionsWithScopes,
        replaceAll: true,
      });
      setShowPermissionsModal(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      setPermissionScopes(new Map());
      loadData();
    } catch (error) {
      console.error('Failed to assign permissions:', error);
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description || '',
      permissionCodes: role.permissions.map((p) => p.code),
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

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center p-8">
          <div className="text-surface-600 dark:text-surface-400">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>

      <div className="mb-6 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 dark:bg-blue-500 dark:hover:bg-primary-500"
        >
          Create Role
        </button>
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-surface-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-surface-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRoles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900 dark:text-surface-100">
                  {role.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900 dark:text-surface-100">
                  {role.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {role.description || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {role.permissions.length} permissions
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {role.isSystemRole ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      System
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Custom
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openPermissionsModal(role)}
                    className="text-primary-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                  >
                    Permissions
                  </button>
                  {!role.isSystemRole && (
                    <>
                      <button
                        onClick={() => openEditModal(role)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
          <div className="bg-white dark:bg-surface-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-100">Create New Role</h2>
            <form onSubmit={handleCreateRole}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Code Input */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-gray-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="e.g., MANAGER"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Unique identifier for this role (uppercase)
                  </p>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-gray-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="e.g., Manager"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Display name for this role
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-gray-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  rows={3}
                  placeholder="Optional description of this role..."
                />
              </div>

              {/* Permissions Dropdown - Continue from here */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Permissions
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    onFocus={() => setShowPermissionDropdown(true)}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-gray-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Search and select permissions..."
                  />
                  {showPermissionDropdown && permissions.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPermissionDropdown(false)} />
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {permissions
                          .filter(permission =>
                            permission.code.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                            permission.description?.toLowerCase().includes(permissionSearch.toLowerCase())
                          )
                          .map((permission) => {
                            const isSelected = formData.permissionCodes?.includes(permission.code) || false;
                            return (
                              <div
                                key={permission.code}
                                onClick={() => {
                                  const currentPermissions = formData.permissionCodes || [];
                                  const newPermissions = isSelected
                                    ? currentPermissions.filter((code) => code !== permission.code)
                                    : [...currentPermissions, permission.code];
                                  setFormData({ ...formData, permissionCodes: newPermissions });
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-surface-900 dark:text-surface-100">
                                      {permission.code}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {permission.description || 'No description'}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
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
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            No permissions found
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {showPermissionDropdown && permissions.length === 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg shadow-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        No permissions available. Please check if you are logged in.
                      </p>
                    </div>
                  )}
                </div>
                {(formData.permissionCodes?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.permissionCodes?.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              permissionCodes: formData.permissionCodes?.filter((c) => c !== code) || [],
                            });
                          }}
                          className="ml-1 hover:text-primary-600 dark:hover:text-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ code: '', name: '', description: '', permissionCodes: [] });
                  }}
                  className="px-4 py-2 text-surface-700 dark:text-surface-300 bg-surface-200 dark:bg-surface-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-100">Edit Role</h2>
            <form onSubmit={handleUpdateRole}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-surface-900 dark:text-surface-100"
                  disabled
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-gray-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-gray-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRole(null);
                    setFormData({ code: '', name: '', description: '', permissionCodes: [] });
                  }}
                  className="px-4 py-2 text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 dark:bg-blue-500 dark:hover:bg-primary-500"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal with Scope Selection */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg p-6 w-full max-w-5xl max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-surface-900 dark:text-surface-100">
              Manage Permissions - {selectedRole.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select permissions and configure their scope. Scope determines what data the permission grants access to.
            </p>
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-3">{resource}</h3>
                  <div className="space-y-3">
                    {perms.map((permission) => {
                      const isSelected = selectedPermissions.includes(permission.code);
                      const scopeData = permissionScopes.get(permission.code);
                      const currentScope = scopeData?.scope || 'ALL';

                      return (
                        <div
                          key={permission.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <label className="flex items-start space-x-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermission(permission.code)}
                                disabled={selectedRole.isSystemRole}
                                className="mt-1 rounded text-primary-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                              />
                              <div>
                                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                                  {permission.name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  ({permission.code})
                                </span>
                                {permission.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </label>

                            {/* Scope selector - only show when permission is selected */}
                            {isSelected && !selectedRole.isSystemRole && (
                              <div className="flex-shrink-0">
                                <select
                                  value={currentScope}
                                  onChange={(e) => updatePermissionScope(permission.code, e.target.value as RoleScope)}
                                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-surface-900 dark:text-surface-100"
                                >
                                  <option value="ALL">All (Org-wide)</option>
                                  <option value="LOCATION">Location</option>
                                  <option value="DEPARTMENT">Department</option>
                                  <option value="TEAM">Team</option>
                                  <option value="SELF">Self Only</option>
                                  <option value="CUSTOM">Custom</option>
                                </select>
                              </div>
                            )}

                            {/* Show current scope badge for system roles */}
                            {isSelected && selectedRole.isSystemRole && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {SCOPE_LABELS[currentScope]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-surface-700 dark:text-surface-300">
                <strong>{selectedPermissions.length}</strong> permission(s) selected
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedRole(null);
                  setSelectedPermissions([]);
                  setPermissionScopes(new Map());
                }}
                className="px-4 py-2 text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              {!selectedRole.isSystemRole && (
                <button
                  onClick={handleAssignPermissions}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 dark:bg-blue-500 dark:hover:bg-primary-500"
                >
                  Save Permissions
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
