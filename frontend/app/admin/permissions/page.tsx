'use client';

import { useState, useEffect } from 'react';
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
  User as UserIcon,
} from 'lucide-react';
import { rolesApi, permissionsApi } from '@/lib/api/roles';
import { usersApi, User } from '@/lib/api/users';
import { Role, Permission, RoleWithDetails } from '@/lib/types/roles';

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [roles, setRoles] = useState<RoleWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection states
  const [selectedRole, setSelectedRole] = useState<RoleWithDetails | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Modal states
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData, usersData] = await Promise.all([
        rolesApi.getAllRoles(),
        permissionsApi.getAllPermissions(),
        usersApi.getAllUsers(),
      ]);

      const rolesWithDetails: RoleWithDetails[] = rolesData.map(r => ({
        ...r,
        expanded: false,
        permissionCount: r.permissions.length
      }));

      setRoles(rolesWithDetails);
      setPermissions(permissionsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoleExpanded = (roleId: string) => {
    setRoles(roles.map(r =>
      r.id === roleId ? { ...r, expanded: !r.expanded } : r
    ));
  };

  const openEditRoleModal = (role: RoleWithDetails) => {
    setSelectedRole(role);
    setIsEditRoleModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) return;
    try {
      await rolesApi.deleteRole(roleId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. It might be assigned to users.');
    }
  };

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group permissions by resource for the modal
  const permissionsByResource = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Permission Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
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
              : 'border-transparent text-gray-500 hover:text-gray-700'
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
              : 'border-transparent text-gray-500 hover:text-gray-700'
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'roles' ? 'Search roles...' : 'Search users...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        {loading ? (
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
                  <div className="text-center py-12 text-gray-500">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No roles found</p>
                  </div>
                ) : (
                  filteredRoles.map((role) => (
                    <motion.div
                      key={role.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden"
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRole(role.id, role.name);
                                }}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {role.expanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
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
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                                Assigned Permissions
                              </h4>
                              {role.permissions.length === 0 ? (
                                <p className="text-sm text-gray-500">No permissions assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {role.permissions.map((perm) => (
                                    <span
                                      key={perm.code}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-surface-700 dark:text-surface-300"
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
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
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
                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
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
                                  <span className="text-gray-400 italic">No roles</span>
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
                await rolesApi.updateRole(selectedRole.id, {
                  name: roleData.name,
                  description: roleData.description,
                });
                await rolesApi.assignPermissions(selectedRole.id, {
                  permissionCodes: permissionCodes
                });
                await loadData();
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
                await rolesApi.createRole({
                  code: data.code,
                  name: data.name,
                  description: data.description,
                  permissionCodes: data.permissionCodes
                });
                await loadData();
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
                await usersApi.assignRoles(selectedUser.id, roleCodes);
                await loadData();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-surface-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Edit Role: {role.code}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedPermissions.size} permissions selected
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Role Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
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
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${selectedPermissions.has(perm.code) ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedPermissions.has(perm.code) ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
                      {selectedPermissions.has(perm.code) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate" title={perm.name}>{perm.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={perm.action}>{perm.action}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-surface-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Create New Role</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create a custom role with specific permissions</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Role Code *</label>
              <input type="text" value={roleCode} onChange={(e) => setRoleCode(e.target.value)} placeholder="e.g., FINANCE_MANAGER" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Display Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Finance Manager" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this role's purpose..." rows={2} className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Permissions ({selectedPermissions.size} selected)</h3>
            {Object.entries(permissionsByResource).map(([resource, perms]) => (
              <div key={resource} className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{resource}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {perms.map((perm) => (
                    <button
                      key={perm.code}
                      onClick={() => togglePermission(perm.code)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${selectedPermissions.has(perm.code) ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedPermissions.has(perm.code) ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
                        {selectedPermissions.has(perm.code) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white truncate" title={perm.name}>{perm.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={perm.action}>{perm.action}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-surface-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Edit User Roles
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Assign roles to {user.fullName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
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
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selectedRoleCodes.has(role.code)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                  {selectedRoleCodes.has(role.code) && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {role.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {role.description || role.code}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
