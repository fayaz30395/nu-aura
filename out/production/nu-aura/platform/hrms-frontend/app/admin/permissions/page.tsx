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
} from 'lucide-react';
import platformService, {
  AppRole,
  AppPermission,
  UserAppAccess
} from '@/lib/services/platform.service';

interface RoleWithDetails extends AppRole {
  expanded?: boolean;
}

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [roles, setRoles] = useState<RoleWithDetails[]>([]);
  const [users, setUsers] = useState<UserAppAccess[]>([]);
  const [permissions, setPermissions] = useState<Record<string, AppPermission[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleWithDetails | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData, usersData] = await Promise.all([
        platformService.getApplicationRoles('HRMS'),
        platformService.getPermissionsByCategory('HRMS'),
        platformService.getApplicationUsers('HRMS').catch(() => [])
      ]);
      setRoles(rolesData.map(r => ({ ...r, expanded: false })));
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

  const openEditModal = (role: RoleWithDetails) => {
    setSelectedRole(role);
    setIsEditModalOpen(true);
  };

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Manage roles and user permissions for NU-HRMS
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Role
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'roles'
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
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'users'
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
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50/50"
                        onClick={() => toggleRoleExpanded(role.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            role.isSystemRole
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            <ShieldCheck className={`w-5 h-5 ${
                              role.isSystemRole
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
                              {role.isDefaultRole && (
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {role.description || role.code} • Level {role.level} • {role.permissionCount} permissions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!role.isSystemRole && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(role);
                              }}
                              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
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
                              {role.permissionCodes.length === 0 ? (
                                <p className="text-sm text-gray-500">No permissions assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {role.permissionCodes.map((perm) => (
                                    <span
                                      key={perm}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-surface-700 dark:text-surface-300"
                                    >
                                      <Key className="w-3 h-3" />
                                      {perm.replace('HRMS:', '')}
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
                    <table className="w-full">
                      <thead className="bg-surface-50 dark:bg-surface-800/50/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Roles
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Granted At
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary-600 dark:text-blue-400">
                                    {user.userName.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-surface-900 dark:text-white">
                                    {user.userName}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {user.userEmail}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {user.roleCodes.map((role) => (
                                  <span
                                    key={role}
                                    className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full"
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {new Date(user.grantedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button className="p-2 text-gray-500 hover:text-primary-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
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
        {isEditModalOpen && selectedRole && (
          <EditRoleModal
            role={selectedRole}
            permissions={permissions}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedRole(null);
            }}
            onSave={async (permissionCodes) => {
              try {
                await platformService.updateRolePermissions(selectedRole.id, permissionCodes);
                await loadData();
                setIsEditModalOpen(false);
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
        {isCreateModalOpen && (
          <CreateRoleModal
            permissions={permissions}
            onClose={() => setIsCreateModalOpen(false)}
            onSave={async (data) => {
              try {
                await platformService.createRole(data);
                await loadData();
                setIsCreateModalOpen(false);
              } catch (error) {
                console.error('Failed to create role:', error);
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
  permissions,
  onClose,
  onSave
}: {
  role: RoleWithDetails;
  permissions: Record<string, AppPermission[]>;
  onClose: () => void;
  onSave: (permissionCodes: string[]) => void;
}) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role.permissionCodes)
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
    setSaving(true);
    await onSave(Array.from(selectedPermissions));
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
        className="bg-white dark:bg-surface-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Edit Role: {role.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedPermissions.size} permissions selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {Object.entries(permissions).map(([category, perms]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3 uppercase tracking-wider">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {perms.map((perm) => (
                  <button
                    key={perm.code}
                    onClick={() => togglePermission(perm.code)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                      selectedPermissions.has(perm.code)
                        ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      selectedPermissions.has(perm.code)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}>
                      {selectedPermissions.has(perm.code) && (
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                        {perm.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {perm.module}:{perm.action}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
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
  permissions,
  onClose,
  onSave
}: {
  permissions: Record<string, AppPermission[]>;
  onClose: () => void;
  onSave: (data: { appCode: string; roleCode: string; name: string; description?: string; level: number; permissionCodes?: string[] }) => void;
}) {
  const [roleCode, setRoleCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(50);
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
      appCode: 'HRMS',
      roleCode: roleCode.toUpperCase().replace(/\s+/g, '_'),
      name,
      description: description || undefined,
      level,
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
        className="bg-white dark:bg-surface-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Create New Role
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a custom role with specific permissions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Role Code *
              </label>
              <input
                type="text"
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
                placeholder="e.g., FINANCE_MANAGER"
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Finance Manager"
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this role's purpose..."
              rows={2}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Level (1-100)
            </label>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
              Permissions ({selectedPermissions.size} selected)
            </h3>
            {Object.entries(permissions).map(([category, perms]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  {category}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {perms.map((perm) => (
                    <button
                      key={perm.code}
                      onClick={() => togglePermission(perm.code)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                        selectedPermissions.has(perm.code)
                          ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        selectedPermissions.has(perm.code)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}>
                        {selectedPermissions.has(perm.code) && (
                          <Check className="w-3 h-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                          {perm.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {perm.module}:{perm.action}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !roleCode.trim() || !name.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            Create Role
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
