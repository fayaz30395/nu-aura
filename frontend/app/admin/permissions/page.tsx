'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion} from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Key,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Permission, RoleWithDetails} from '@/lib/types/core/roles';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {ConfirmDialog} from '@/components/ui';
import {EmptyState} from '@/components/ui/EmptyState';
import {Button} from '@/components/ui/Button';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {
  useAssignPermissions,
  useAssignRolesToUser,
  useCreateRole,
  useDeleteRole,
  usePermissions as useQueryPermissions,
  useRoleAdminUsers as useAdminUsers,
  useRoles,
  useUpdateRole,
} from '@/lib/hooks/queries/useRoles';
import type {User} from '@/lib/api/users';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('PermissionsPage');

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const editRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});
type EditRoleData = z.infer<typeof editRoleSchema>;

const createRoleSchema = z.object({
  roleCode: z
    .string()
    .min(1, 'Role code is required')
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, digits, or underscores'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});
type CreateRoleData = z.infer<typeof createRoleSchema>;

const assignRolesSchema = z.object({
  roleCodes: z.array(z.string()),
});
type AssignRolesData = z.infer<typeof assignRolesSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
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
      router.replace('/auth/login');
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
  const usersRaw = usersQuery.data;
  const users: User[] = Array.isArray(usersRaw)
    ? usersRaw
    : Array.isArray((usersRaw as { content?: User[] })?.content)
      ? (usersRaw as { content: User[] }).content
      : [];
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
    setRoleToDelete({id: roleId, name: roleName});
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
    (u.fullName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6 space-y-6">
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setRoleToDelete(null);
        }}
        onConfirm={performDelete}
        title="Delete Role?"
        message={`This action cannot be undone. Role "${roleToDelete?.name}" will be permanently deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Permission Management
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage roles and user access for NU-HRMS
            </p>
          </div>
          {activeTab === 'roles' && (
            <Button
              onClick={() => setIsCreateRoleModalOpen(true)}
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-5 h-5"/>}
            >
              Create Role
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[var(--border-main)]">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'roles'
              ? 'border-accent-500 text-accent-700'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5"/>
              Roles ({roles.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'users'
              ? 'border-accent-500 text-accent-700'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5"/>
              Users ({users.length})
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"/>
          <input
            type="text"
            placeholder={activeTab === 'roles' ? 'Search roles...' : 'Search users...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-aura pl-10"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"/>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'roles' ? (
              <motion.div
                key="roles"
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -10}}
                className="space-y-4"
              >
                {filteredRoles.length === 0 ? (
                  <EmptyState
                    icon={<ShieldCheck className="h-8 w-8"/>}
                    title="No roles found"
                    description="Try a different search term or create a new role."
                  />
                ) : (
                  filteredRoles.map((role) => (
                    <motion.div
                      key={role.id}
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] overflow-hidden"
                    >
                      {/* Role Header */}
                      <div
                        className="row-between p-4 cursor-pointer hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-inset"
                        onClick={() => toggleRoleExpanded(role.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRoleExpanded(role.id); } }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Toggle ${role.name} role details`}
                        aria-expanded={expandedRoles.has(role.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.isSystemRole
                            ? 'bg-accent-300 dark:bg-accent-900/30'
                            : 'bg-accent-100 dark:bg-accent-900/30'
                          }`}>
                            <ShieldCheck className={`w-5 h-5 ${role.isSystemRole
                              ? 'text-accent-800 dark:text-accent-600'
                              : 'text-accent-700 dark:text-accent-400'
                            }`}/>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="font-semibold text-[var(--text-primary)]">
                                {role.name}
                              </h2>
                              {role.isSystemRole && (
                                <span
                                  className="px-2 py-0.5 text-xs bg-accent-300 text-accent-900 dark:bg-accent-900/30 dark:text-accent-600 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                                  System
                                </span>
                              )}
                            </div>
                            <p className="text-body-muted">
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
                                className="p-2 text-[var(--text-muted)] hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                              >
                                <Pencil className="w-4 h-4"/>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRole(role.id, role.name);
                                }}
                                className="p-2 text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                              >
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </>
                          )}
                          {role.expanded ? (
                            <ChevronDown className="w-5 h-5 text-[var(--text-muted)]"/>
                          ) : (
                            <ChevronRight className="w-5 h-5 text-[var(--text-muted)]"/>
                          )}
                        </div>
                      </div>

                      {/* Expanded Permissions */}
                      <AnimatePresence>
                        {role.expanded && (
                          <motion.div
                            initial={{height: 0, opacity: 0}}
                            animate={{height: 'auto', opacity: 1}}
                            exit={{height: 0, opacity: 0}}
                            transition={{duration: 0.2}}
                            className="border-t border-[var(--border-main)]"
                          >
                            <div className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)]/50">
                              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
                                Assigned Permissions
                              </h3>
                              {role.permissions.length === 0 ? (
                                <p className="text-body-muted">No permissions assigned</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {role.permissions.map((perm) => (
                                    <span
                                      key={perm.code}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded text-xs font-mono text-[var(--text-secondary)]"
                                      title={perm.description}
                                    >
                                      <Key className="w-3 h-3"/>
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
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -10}}
                className="space-y-4"
              >
                {filteredUsers.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-8 w-8"/>}
                    title="No users found"
                    description="Try a different search term to find users."
                  />
                ) : (
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-6 py-2 font-medium">User</th>
                        <th className="px-6 py-2 font-medium">Email</th>
                        <th className="px-6 py-2 font-medium">Assigned Roles</th>
                        <th className="px-6 py-2 font-medium text-right">Actions</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}
                            className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div
                                className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-accent-700 dark:text-accent-400 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                                {user.firstName[0]}
                              </div>
                              <span className="font-medium text-[var(--text-primary)]">
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
                                  <span key={role.code}
                                        className="inline-flex items-center px-2 py-1 rounded bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400 text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
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
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-accent-700 hover:text-accent-700 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                            >
                              <Pencil className="w-4 h-4"/>
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
                log.error('Failed to update role:', error);
              }
            }}
            isSaving={updateRoleMutation.isPending || assignPermissionsMutation.isPending}
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
                log.error('Failed to create role:', error);
              }
            }}
            isSaving={createRoleMutation.isPending}
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
                log.error('Failed to update user roles:', error);
              }
            }}
            isSaving={assignRoleMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── EditRoleModal ─────────────────────────────────────────────────────────────

function EditRoleModal({
                         role,
                         permissionsByResource,
                         onClose,
                         onSave,
                         isSaving,
                       }: {
  role: RoleWithDetails;
  permissionsByResource: Record<string, Permission[]>;
  onClose: () => void;
  onSave: (roleData: { name: string; description?: string }, permissionCodes: string[]) => void;
  isSaving: boolean;
}) {
  const form = useForm<EditRoleData>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      name: role.name,
      description: role.description ?? '',
      permissions: role.permissions.map(p => p.code),
    },
  });

  // Reset form whenever the modal opens with a new role
  useEffect(() => {
    form.reset({
      name: role.name,
      description: role.description ?? '',
      permissions: role.permissions.map(p => p.code),
    });
  }, [role, form]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (data: EditRoleData) => {
    onSave(
      {name: data.name, description: data.description},
      data.permissions,
    );
  };

  const selectedPermissions = form.watch('permissions');
  const selectedCount = selectedPermissions.length;

  return (
    <Modal isOpen={true} onClose={handleClose} size="xl">
      <ModalHeader onClose={handleClose}>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Edit Role: {role.code}
          </h2>
          <p className="text-body-muted">
            {selectedCount} permissions selected
          </p>
        </div>
      </ModalHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden flex-1">
        <ModalBody className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Role Name *</label>
                <input
                  type="text"
                  {...form.register('name')}
                  className="input-aura"
                />
                {form.formState.errors.name && (
                  <p
                    className="mt-1 text-xs text-danger-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                <textarea
                  {...form.register('description')}
                  rows={2}
                  className="input-aura"
                />
              </div>
            </div>
            <div className="border-t border-[var(--border-main)] my-4"></div>
            <Controller
              name="permissions"
              control={form.control}
              render={({field}) => (
                <>
                  {Object.entries(permissionsByResource).map(([resource, perms]) => (
                    <div key={resource} className="mb-6">
                      <h3
                        className="text-sm font-medium text-[var(--text-secondary)] mb-4 uppercase tracking-wider">{resource}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {perms.map((perm) => {
                          const isChecked = field.value.includes(perm.code);
                          const toggle = () => {
                            const next = isChecked
                              ? field.value.filter(c => c !== perm.code)
                              : [...field.value, perm.code];
                            field.onChange(next);
                          };
                          return (
                            <button
                              key={perm.code}
                              type="button"
                              onClick={toggle}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${isChecked ? 'bg-accent-50 border-accent-300 dark:bg-accent-900/30 dark:border-accent-700' : 'bg-[var(--bg-surface)] border-[var(--border-main)] dark:border-[var(--border-main)] hover:border-accent-300'}`}
                            >
                              <div
                                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isChecked ? 'bg-accent-500 text-white' : 'bg-[var(--bg-surface)]'}`}>
                                {isChecked && <Check className="w-3 h-3"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate"
                                   title={perm.name}>{perm.name}</p>
                                <p className="text-caption truncate" title={perm.action}>{perm.action}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
          />
        </ModalBody>
        <ModalFooter className="gap-4">
          <Button type="button" onClick={handleClose} variant="ghost" size="md">Cancel</Button>
          <Button type="submit" disabled={isSaving} variant="primary" size="md" isLoading={isSaving}
                  loadingText="Saving...">
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── CreateRoleModal ───────────────────────────────────────────────────────────

function CreateRoleModal({
                           permissionsByResource,
                           onClose,
                           onSave,
                           isSaving,
                         }: {
  permissionsByResource: Record<string, Permission[]>;
  onClose: () => void;
  onSave: (data: { code: string; name: string; description?: string; permissionCodes?: string[] }) => void;
  isSaving: boolean;
}) {
  const form = useForm<CreateRoleData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      roleCode: '',
      name: '',
      description: '',
      permissions: [],
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (data: CreateRoleData) => {
    onSave({
      code: data.roleCode.toUpperCase().replace(/\s+/g, '_'),
      name: data.name,
      description: data.description || undefined,
      permissionCodes: data.permissions.length > 0 ? data.permissions : undefined,
    });
  };

  const selectedPermissions = form.watch('permissions');

  return (
    <Modal isOpen={true} onClose={handleClose} size="xl">
      <ModalHeader onClose={handleClose}>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create New Role</h2>
          <p className="text-body-muted">Create a custom role with specific permissions</p>
        </div>
      </ModalHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden flex-1">
        <ModalBody className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Role Code *</label>
                <input
                  type="text"
                  {...form.register('roleCode')}
                  placeholder="e.g., FINANCE_MANAGER"
                  className="input-aura"
                />
                {form.formState.errors.roleCode && (
                  <p
                    className="mt-1 text-xs text-danger-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{form.formState.errors.roleCode.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Display Name *</label>
                <input
                  type="text"
                  {...form.register('name')}
                  placeholder="e.g., Finance Manager"
                  className="input-aura"
                />
                {form.formState.errors.name && (
                  <p
                    className="mt-1 text-xs text-danger-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
              <textarea
                {...form.register('description')}
                placeholder="Describe this role's purpose..."
                rows={2}
                className="input-aura"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
                Permissions ({selectedPermissions.length} selected)
              </h3>
              <Controller
                name="permissions"
                control={form.control}
                render={({field}) => (
                  <>
                    {Object.entries(permissionsByResource).map(([resource, perms]) => (
                      <div key={resource} className="mb-4">
                        <h4
                          className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wider">{resource}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {perms.map((perm) => {
                            const isChecked = field.value.includes(perm.code);
                            const toggle = () => {
                              const next = isChecked
                                ? field.value.filter(c => c !== perm.code)
                                : [...field.value, perm.code];
                              field.onChange(next);
                            };
                            return (
                              <button
                                key={perm.code}
                                type="button"
                                onClick={toggle}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${isChecked ? 'bg-accent-50 border-accent-300 dark:bg-accent-900/30 dark:border-accent-700' : 'bg-[var(--bg-surface)] border-[var(--border-main)] dark:border-[var(--border-main)] hover:border-accent-300'}`}
                              >
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isChecked ? 'bg-accent-500 text-white' : 'bg-[var(--bg-surface)]'}`}>
                                  {isChecked && <Check className="w-3 h-3"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate"
                                     title={perm.name}>{perm.name}</p>
                                  <p className="text-caption truncate" title={perm.action}>{perm.action}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
        </ModalBody>
        <ModalFooter className="gap-4">
          <Button type="button" onClick={handleClose} variant="ghost" size="md">Cancel</Button>
          <Button type="submit" disabled={isSaving} variant="primary" size="md" isLoading={isSaving}
                  loadingText="Creating...">
            Create Role
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── EditUserModal ─────────────────────────────────────────────────────────────

function EditUserModal({
                         user,
                         allRoles,
                         onClose,
                         onSave,
                         isSaving,
                       }: {
  user: User;
  allRoles: RoleWithDetails[];
  onClose: () => void;
  onSave: (roleCodes: string[]) => void;
  isSaving: boolean;
}) {
  const form = useForm<AssignRolesData>({
    resolver: zodResolver(assignRolesSchema),
    defaultValues: {
      roleCodes: user.roles.map(r => r.code),
    },
  });

  // Reset when a different user is opened
  useEffect(() => {
    form.reset({roleCodes: user.roles.map(r => r.code)});
  }, [user, form]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (data: AssignRolesData) => {
    onSave(data.roleCodes);
  };

  return (
    <Modal isOpen={true} onClose={handleClose} size="md">
      <ModalHeader onClose={handleClose}>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Edit User Roles
          </h2>
          <p className="text-body-muted">
            Assign roles to {user.fullName}
          </p>
        </div>
      </ModalHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden flex-1">
        <ModalBody className="space-y-4">
            <Controller
              name="roleCodes"
              control={form.control}
              render={({field}) => (
                <div className="grid grid-cols-1 gap-2">
                  {allRoles.map((role) => {
                    const isChecked = field.value.includes(role.code);
                    const toggle = () => {
                      const next = isChecked
                        ? field.value.filter(c => c !== role.code)
                        : [...field.value, role.code];
                      field.onChange(next);
                    };
                    return (
                      <button
                        key={role.code}
                        type="button"
                        onClick={toggle}
                        className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${isChecked
                          ? 'bg-accent-50 border-accent-300 dark:bg-accent-900/30 dark:border-accent-700'
                          : 'bg-[var(--bg-surface)] border-[var(--border-main)] dark:border-[var(--border-main)] hover:border-accent-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isChecked
                          ? 'bg-accent-500 text-white'
                          : 'bg-[var(--bg-surface)]'
                        }`}>
                          {isChecked && <Check className="w-3 h-3"/>}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {role.name}
                          </p>
                          <p className="text-caption">
                            {role.description || role.code}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            />
        </ModalBody>
        <ModalFooter className="gap-4">
          <Button type="button" onClick={handleClose} variant="ghost" size="md">Cancel</Button>
          <Button type="submit" disabled={isSaving} variant="primary" size="md" isLoading={isSaving}
                  loadingText="Saving...">
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
