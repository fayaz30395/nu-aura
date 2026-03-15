'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Key,
} from 'lucide-react';
import { Permission, RoleWithDetails } from '@/lib/types/roles';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { ConfirmDialog } from '@/components/ui';
import {
  useRoles,
  usePermissions as useQueryPermissions,
  useRoleAdminUsers as useAdminUsers,
  useUpdateRole,
  useCreateRole,
  useDeleteRole,
  useAssignPermissions,
  useAssignRolesToUser,
} from '@/lib/hooks/queries/useRoles';
import type { User } from '@/lib/api/users';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function PermissionsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [searchQuery, setSearchQuery] = useState('');

  // Query hooks
  const rolesQuery = useRoles();
  const permissionsQuery = useQueryPermissions();
  const usersQuery = useAdminUsers();

  // Selection states
  const [selectedRole, setSelectedRole] = useState<RoleWithDetails | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Modal states
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);

  // Mutation hooks
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole(selectedRole?.id || '');
  const deleteRoleMutation = useDeleteRole();
  const assignPermissionsMutation = useAssignPermissions(selectedRole?.id || '');
  const assignRoleMutation = useAssignRolesToUser(selectedUser?.id || '');

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

  // Transform roles data with details
  const roles: RoleWithDetails[] = (rolesQuery.data || []).map(r => ({
    ...r,
    expanded: false,
    permissionCount: r.permissions.length
  }));
  const permissions = permissionsQuery.data || [];
  const users = usersQuery.data || [];
  const isLoading = rolesQuery.isLoading || permissionsQuery.isLoading || usersQuery.isLoading;

  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const toggleRoleExpanded = (roleId: string) => {
    const newSet = new Set(expandedRoles);
    if (newSet.has(roleId)) {
      newSet.delete(roleId);
    } else {
      newSet.add(roleId);
    }
    setExpandedRoles(newSet);
  };

  const openEditRoleModal = (role: RoleWithDetails) => {
    setSelectedRole(role);
    setIsEditRoleModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    setRoleToDelete({ id: roleId, name: roleName });
    setShowDeleteConfirm(true);
  };

  const performDelete = () => {
    if (!roleToDelete) return;
    deleteRoleMutation.mutate(roleToDelete.id);
    setShowDeleteConfirm(false);
    setRoleToDelete(null);
  };

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  ).map(r => ({
    ...r,
    expanded: expandedRoles.has(r.id)
  }));

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group permissions by resource for the modal
  const permissionsByResource = permissions.reduce((acc, permission) => {
    const resourceKey = permission.resource ?? 'UNASSIGNED';
    if (!acc[resourceKey]) {
      acc[resourceKey] = [];
    }
    acc[resourceKey].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <>
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

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Permission Management
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage roles and user access for NU-HRMS
            </p>
          </div>
          {activeTab === 'roles' && (
            <button
              onClick={() => setIsCreateRoleModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Role
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'roles'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Roles ({roles.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'users'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users ({users.length})
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder={activeTab === 'roles' ? 'Search roles...' : 'Search users...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-card)] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'roles' ? (
              <motion.div
                key="roles"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {filteredRoles.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)]">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)]" />
                    <p>No roles found</p>
                  </div>
                ) : (
                  filteredRoles.map((role) => (
                    <motion.div
                      key={role.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-[var(--bg-card)] rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden"
                    >
                      {/* Role Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50"
                        onClick={() => toggleRoleExpanded(role.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.isSystemRole
                            ? 'bg-purple-100 dark:bg-purple-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                            <ShieldCheck className={`w-5 h-5 ${role.isSystemRole
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-primary-600 dark:text-blue-400'
                              }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-surface-900 dark:text-white">
                                {role.name}
                              </h3>
                              {role.isSystemRole && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                  System
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">
                              {role.description || role.code} • {role.permissions.length} permissions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!role.isSystemRole && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditRoleModal(role);
                                }}
                                className="p-2 text-[var(--text-muted)] hover:text-primary-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRole(role.id, role.name);
                                }}
                                className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {role.expanded ? (
                            <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Permissions */}
                      <AnimatePresence>
                        {role.expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-surface-200 dark:border-surface-700"
                          >
                            <div className="p-4 bg-[var(--bg-surface)] dark:bg-surface-800/50">
                              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                                Assigned Permissions
                              </h4>
                              {role.permissions.length === 0 ? (
                                <p className="text-sm text-[var(--text-muted)]">No permissions assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {role.permissions.map((perm) => (
                                    <span
                                      key={perm.code}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] border border-[var(--border-main)] dark:border-surface-600 rounded text-xs font-mono text-surface-700 dark:text-surface-300"
                                      title={perm.description}
                                    >
                                      <Key className="w-3 h-3" />
                                      {perm.code.replace('HRMS:', '')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)]">
                    <Users className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)]" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-card)] rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
                        <tr>
                          <th className="px-6 py-3 font-medium">User</th>
                          <th className="px-6 py-3 font-medium">Email</th>
                          <th className="px-6 py-3 font-medium">Assigned Roles</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium">
                                  {user.firstName[0]}
                                </div>
                                <span className="font-medium text-surface-900 dark:text-white">
                                  {user.fullName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[var(--text-muted)]">
                              {user.email}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {user.roles.length > 0 ? (
                                  user.roles.map(role => (
                                    <span key={role.code} className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                                      {role.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[var(--text-muted)] italic">No roles</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => openEditUserModal(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                                Edit Roles
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Edit Role Modal */}
      <AnimatePresence>
        {isEditRoleModalOpen && selectedRole && (
          <EditRoleModal
            role={selectedRole}
            permissionsByResource={permissionsByResource}
            onClose={() => {
              setIsEditRoleModalOpen(false);
              setSelectedRole(null);
            }}
            onSave={async (roleData, permissionCodes) => {
              try {
                await updateRoleMutation.mutateAsync({
                  name: roleData.name,
                  description: roleData.description,
                });
                await assignPermissionsMutation.mutateAsync({
                  permissionCodes: permissionCodes
                });
                setIsEditRoleModalOpen(false);
                setSelectedRole(null);
              } catch (error) {
                console.error('Failed to update role:', error);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Create Role Modal */}
      <AnimatePresence>
        {isCreateRoleModalOpen && (
          <CreateRoleModal
            permissionsByResource={permissionsByResource}
            onClose={() => setIsCreateRoleModalOpen(false)}
            onSave={async (data) => {
              try {
                await createRoleMutation.mutateAsync({
                  code: data.code,
                  name: data.name,
                  description: data.description,
                  permissionCodes: data.permissionCodes
                });
                setIsCreateRoleModalOpen(false);
              } catch (error) {
                console.error('Failed to create role:', error);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditUserModalOpen && selectedUser && (
          <EditUserModal
            user={selectedUser}
            allRoles={roles}
            onClose={() => {
              setIsEditUserModalOpen(false);
              setSelectedUser(null);
            }}
            onSave={async (roleCodes) => {
              try {
                await assignRoleMutation.mutateAsync(roleCodes);
                setIsEditUserModalOpen(false);
                setSelectedUser(null);
              } catch (error) {
                console.error('Failed to update user roles:', error);
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Edit Role Modal Component
function EditRoleModal({
  role,
  permissionsByResource,
  onClose,
  onSave
}: {
  role: RoleWithDetails;
  permissionsByResource: Record<string, Permission[]>;
  onClose: () => void;
  onSave: (roleData: { name: string, description: string }, permissionCodes: string[]) => void;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role.permissions.map(p => p.code))
  );
  const [saving, setSaving] = useState(false);

  const togglePermission = (code: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedPermissions(newSet);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(
      { name, description },
      Array.from(selectedPermissions)
    );
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-card)] rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Edit Role: {role.code}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {selectedPermissions.size} permissions selected
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-gray-300 rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Role Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-surface)] focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-surface)] focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="border-t border-surface-200 dark:border-surface-700 my-4"></div>
          {Object.entries(permissionsByResource).map(([resource, perms]) => (
            <div key={resource} className="mb-6">
              <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3 uppercase tracking-wider">{resource}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {perms.map((perm) => (
                  <button
                    key={perm.code}
                    onClick={() => togglePermission(perm.code)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${selectedPermissions.has(perm.code) ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' : 'bg-[var(--bg-surface)] border-[var(--border-main)] dark:border-surface-600 hover:border-blue-300'}`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedPermissions.has(perm.code) ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-surface-600'}`}>
                      {selectedPermissions.has(perm.code) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate" title={perm.name}>{perm.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate" title={perm.action}>{perm.action}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-[var(--bg-surface)] dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Create Role Modal Component
function CreateRoleModal({
  permissionsByResource,
  onClose,
  onSave
}: {
  permissionsByResource: Record<string, Permission[]>;
  onClose: () => void;
  onSave: (data: { code: string; name: string; description?: string; permissionCodes?: string[] }) => void;
}) {
  const [roleCode, setRoleCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const togglePermission = (code: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedPermissions(newSet);
  };

  const handleSave = async () => {
    if (!roleCode.trim() || !name.trim()) return;
    setSaving(true);
    await onSave({
      code: roleCode.toUpperCase().replace(/\s+/g, '_'),
      name,
      description: description || undefined,
      permissionCodes: selectedPermissions.size > 0 ? Array.from(selectedPermissions) : undefined
    });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-card)] rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Create New Role</h2>
            <p className="text-sm text-[var(--text-muted)]">Create a custom role with specific permissions</p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-gray-300 rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Role Code *</label>
              <input type="text" value={roleCode} onChange={(e) => setRoleCode(e.target.value)} placeholder="e.g., FINANCE_MANAGER" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-surface)] focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Display Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Finance Manager" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-surface)] focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this role's purpose..." rows={2} className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-surface)] focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Permissions ({selectedPermissions.size} selected)</h3>
            {Object.entries(permissionsByResource).map(([resource, perms]) => (
              <div key={resource} className="mb-4">
                <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wider">{resource}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {perms.map((perm) => (
                    <button
                      key={perm.code}
                      onClick={() => togglePermission(perm.code)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${selectedPermissions.has(perm.code) ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' : 'bg-[var(--bg-surface)] border-[var(--border-main)] dark:border-surface-600 hover:border-blue-300'}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedPermissions.has(perm.code) ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-surface-600'}`}>
                        {selectedPermissions.has(perm.code) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white truncate" title={perm.name}>{perm.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate" title={perm.action}>{perm.action}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-[var(--bg-surface)] dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !roleCode.trim() || !name.trim()} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            Create Role
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  allRoles,
  onClose,
  onSave
}: {
  user: User;
  allRoles: RoleWithDetails[];
  onClose: () => void;
  onSave: (roleCodes: string[]) => void;
}) {
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<Set<string>>(
    new Set(user.roles.map(r => r.code))
  );
  const [saving, setSaving] = useState(false);

  const toggleRole = (code: string) => {
    const newSet = new Set(selectedRoleCodes);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedRoleCodes(newSet);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(Array.from(selectedRoleCodes));
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-card)] rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Edit User Roles
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Assign roles to {user.fullName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-gray-300 rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {allRoles.map((role) => (
              <button
                key={role.code}
                onClick={() => toggleRole(role.code)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${selectedRoleCodes.has(role.code)
                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                    : 'bg-[var(--bg-surface)] border-[var(--border-main)] dark:border-surface-600 hover:border-blue-300'
                  }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedRoleCodes.has(role.code)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-surface-600'
                  }`}>
                  {selectedRoleCodes.has(role.code) && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {role.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {role.description || role.code}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-[var(--bg-surface)] dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
