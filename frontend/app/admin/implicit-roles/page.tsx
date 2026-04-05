'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  CONDITION_LABELS,
  ImplicitRoleCondition,
  ImplicitRoleRule,
  ImplicitRoleRuleRequest
} from '@/lib/types/core/implicitRoles';
import {RoleScope, SCOPE_LABELS} from '@/lib/types/core/roles';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {AdminPageContent} from '@/components/layout';
import {ConfirmDialog} from '@/components/ui';
import {
  useAffectedUsers,
  useBulkActivateRules,
  useBulkDeactivateRules,
  useCreateImplicitRoleRule,
  useDeleteImplicitRoleRule,
  useImplicitRoleRules,
  useRecomputeAll,
  useUpdateImplicitRoleRule,
} from '@/lib/hooks/queries/useImplicitRoles';
import {useRoles} from '@/lib/hooks/queries/useRoles';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('ImplicitRolesPage');

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const conditionOptions: ImplicitRoleCondition[] = [
  'IS_REPORTING_MANAGER',
  'IS_DEPARTMENT_HEAD',
  'IS_SKIP_LEVEL_MANAGER',
  'HAS_DIRECT_REPORTS',
];

const scopeOptions: RoleScope[] = ['ALL', 'LOCATION', 'DEPARTMENT', 'TEAM', 'SELF', 'CUSTOM'];

const createRuleFormSchema = z.object({
  ruleName: z.string().min(1, 'Rule name is required').max(100),
  description: z.string().optional().or(z.literal('')),
  conditionType: z.enum([
    'IS_REPORTING_MANAGER',
    'IS_DEPARTMENT_HEAD',
    'IS_SKIP_LEVEL_MANAGER',
    'HAS_DIRECT_REPORTS',
  ] as const),
  targetRoleId: z.string().min(1, 'Target role is required'),
  scope: z.enum(['ALL', 'LOCATION', 'DEPARTMENT', 'TEAM', 'SELF', 'CUSTOM'] as const).optional(),
  priority: z.number().min(0).max(1000).optional(),
});

type CreateRuleFormData = z.infer<typeof createRuleFormSchema>;

export default function ImplicitRolesPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();

  // Queries
  const rulesQuery = useImplicitRoleRules();
  const rolesQuery = useRoles();

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAffectedUsersModal, setShowAffectedUsersModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ImplicitRoleRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Mutations (will be updated with selectedRule.id once we have a selection)
  const createMutation = useCreateImplicitRoleRule();
  const updateMutation = useUpdateImplicitRoleRule(selectedRule?.id || '');
  const deleteMutation = useDeleteImplicitRoleRule();
  const recomputeMutation = useRecomputeAll();
  const bulkActivateMutation = useBulkActivateRules();
  const bulkDeactivateMutation = useBulkDeactivateRules();

  // Forms
  const createForm = useForm<CreateRuleFormData>({
    resolver: zodResolver(createRuleFormSchema),
    defaultValues: {
      ruleName: '',
      description: '',
      conditionType: 'IS_REPORTING_MANAGER',
      targetRoleId: '',
      scope: 'ALL',
      priority: 0,
    },
  });

  const editForm = useForm<CreateRuleFormData>({
    resolver: zodResolver(createRuleFormSchema),
    defaultValues: {
      ruleName: '',
      description: '',
      conditionType: 'IS_REPORTING_MANAGER',
      targetRoleId: '',
      scope: 'ALL',
      priority: 0,
    },
  });

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

  const rules = rulesQuery.data?.content || [];
  const roles = rolesQuery.data || [];
  const isLoading = rulesQuery.isLoading || rolesQuery.isLoading;

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch = rule.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' ||
      (activeFilter === 'active' && rule.isActive) ||
      (activeFilter === 'inactive' && !rule.isActive);
    return matchesSearch && matchesFilter;
  });

  const handleCreateRule = async (data: CreateRuleFormData) => {
    try {
      const submitData: ImplicitRoleRuleRequest = {
        ruleName: data.ruleName,
        description: data.description || '',
        conditionType: data.conditionType,
        targetRoleId: data.targetRoleId,
        scope: (data.scope || 'ALL') as RoleScope,
        priority: data.priority || 0,
      };
      await createMutation.mutateAsync(submitData);
      setShowCreateModal(false);
      createForm.reset();
    } catch (error) {
      log.error('Failed to create rule:', error);
    }
  };

  const handleUpdateRule = async (data: CreateRuleFormData) => {
    if (!selectedRule) return;
    try {
      const submitData: ImplicitRoleRuleRequest = {
        ruleName: data.ruleName,
        description: data.description || '',
        conditionType: data.conditionType,
        targetRoleId: data.targetRoleId,
        scope: (data.scope || 'ALL') as RoleScope,
        priority: data.priority || 0,
      };
      await updateMutation.mutateAsync(submitData);
      setShowEditModal(false);
      setSelectedRule(null);
      editForm.reset();
    } catch (error) {
      log.error('Failed to update rule:', error);
    }
  };

  const handleDeleteRule = (rule: ImplicitRoleRule) => {
    setSelectedRule(rule);
    setShowDeleteConfirm(true);
  };

  const performDelete = async () => {
    if (!selectedRule) return;
    try {
      await deleteMutation.mutateAsync(selectedRule.id);
      setShowDeleteConfirm(false);
      setSelectedRule(null);
    } catch (error) {
      log.error('Failed to delete rule:', error);
    }
  };

  const openEditModal = (rule: ImplicitRoleRule) => {
    setSelectedRule(rule);
    editForm.reset({
      ruleName: rule.ruleName,
      description: rule.description,
      conditionType: rule.conditionType,
      targetRoleId: rule.targetRoleId,
      scope: rule.scope,
      priority: rule.priority,
    });
    setShowEditModal(true);
  };

  const openAffectedUsersModal = (rule: ImplicitRoleRule) => {
    setSelectedRule(rule);
    setShowAffectedUsersModal(true);
  };

  const toggleRuleSelection = (ruleId: string) => {
    setSelectedRules((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]
    );
  };

  const handleBulkActivate = async () => {
    if (selectedRules.length === 0) return;
    try {
      await bulkActivateMutation.mutateAsync({ruleIds: selectedRules});
      setSelectedRules([]);
    } catch (error) {
      log.error('Failed to activate rules:', error);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedRules.length === 0) return;
    try {
      await bulkDeactivateMutation.mutateAsync({ruleIds: selectedRules});
      setSelectedRules([]);
    } catch (error) {
      log.error('Failed to deactivate rules:', error);
    }
  };

  const handleRecomputeAll = async () => {
    try {
      await recomputeMutation.mutateAsync(undefined);
    } catch (error) {
      log.error('Failed to recompute:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <AdminPageContent className="p-4 md:p-6 lg:p-8">
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedRule(null);
        }}
        onConfirm={performDelete}
        title="Delete Rule"
        message={`Are you sure you want to delete the rule "${selectedRule?.ruleName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold skeuo-emboss">Implicit Roles</h1>
          <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
            Manage rules that automatically assign roles to users based on their organizational context
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-aura w-full"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="input-aura"
          >
            <option value="all">All Rules</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary !h-auto whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Create Rule
          </button>
          <button
            onClick={handleRecomputeAll}
            disabled={recomputeMutation.isPending}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Recompute All
          </button>
        </div>

        {selectedRules.length > 0 && (
          <div
            className="mb-4 p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg flex justify-between items-center">
            <span className="text-sm text-accent-900 dark:text-accent-100">
              {selectedRules.length} rule(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkActivate}
                disabled={bulkActivateMutation.isPending}
                className="px-4 py-1 text-sm bg-success-500 text-white rounded hover:bg-success-600 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                disabled={bulkDeactivateMutation.isPending}
                className="px-4 py-1 text-sm bg-warning-500 text-white rounded hover:bg-warning-600 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Deactivate
              </button>
              <button
                onClick={() => setSelectedRules([])}
                className="px-4 py-1 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-surface)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="skeuo-card overflow-x-auto">
          <table className="table-aura">
            <thead className="skeuo-table-header">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedRules.length === filteredRules.length && filteredRules.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRules(filteredRules.map((r) => r.id));
                    } else {
                      setSelectedRules([]);
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Rule Name
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Condition
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Target Role
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Scope
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Affected Users
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
            </thead>
            <tbody className="bg-[var(--bg-input)] divide-y divide-[var(--border-main)]">
            {filteredRules.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <p className="text-[var(--text-muted)] text-sm">No rules found</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">
                    Try adjusting your search or create a new rule.
                  </p>
                </td>
              </tr>
            )}
            {filteredRules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={() => toggleRuleSelection(rule.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                  {rule.ruleName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                  {CONDITION_LABELS[rule.conditionType]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                  {rule.targetRoleName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                  {SCOPE_LABELS[rule.scope]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                  {rule.priority}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                  <button
                    onClick={() => openAffectedUsersModal(rule)}
                    className="text-accent-700 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300 underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    {rule.affectedUserCount} users
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.isActive
                          ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => openEditModal(rule)}
                    className="text-accent-600 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule)}
                    className="text-danger-600 hover:text-danger-900 dark:text-danger-400 dark:hover:text-danger-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center z-50 p-4">
          <div className="skeuo-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Create New Implicit Role Rule</h2>
            <form onSubmit={createForm.handleSubmit(handleCreateRule)}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    {...createForm.register('ruleName')}
                    className="input-aura"
                    placeholder="e.g., Manager Auto-Role"
                  />
                  {createForm.formState.errors.ruleName && (
                    <p className="mt-1 text-xs text-danger-500">{createForm.formState.errors.ruleName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Condition Type *
                  </label>
                  <select
                    {...createForm.register('conditionType')}
                    className="input-aura"
                  >
                    {conditionOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {CONDITION_LABELS[opt]}
                      </option>
                    ))}
                  </select>
                  {createForm.formState.errors.conditionType && (
                    <p className="mt-1 text-xs text-danger-500">
                      {createForm.formState.errors.conditionType.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Target Role *
                  </label>
                  <select
                    {...createForm.register('targetRoleId')}
                    className="input-aura"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {createForm.formState.errors.targetRoleId && (
                    <p className="mt-1 text-xs text-danger-500">
                      {createForm.formState.errors.targetRoleId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Scope
                  </label>
                  <select
                    {...createForm.register('scope')}
                    className="input-aura"
                  >
                    {scopeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {SCOPE_LABELS[opt]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Priority (0-1000)
                </label>
                <input
                  type="number"
                  {...createForm.register('priority', {valueAsNumber: true})}
                  className="input-aura"
                  placeholder="0"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  {...createForm.register('description')}
                  className="input-aura"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    createForm.reset();
                  }}
                  className="btn-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {showEditModal && selectedRule && (
        <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center z-50 p-4">
          <div className="skeuo-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Edit Implicit Role Rule</h2>
            <form onSubmit={editForm.handleSubmit(handleUpdateRule)}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    {...editForm.register('ruleName')}
                    className="input-aura"
                  />
                  {editForm.formState.errors.ruleName && (
                    <p className="mt-1 text-xs text-danger-500">{editForm.formState.errors.ruleName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Condition Type *
                  </label>
                  <select
                    {...editForm.register('conditionType')}
                    className="input-aura"
                  >
                    {conditionOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {CONDITION_LABELS[opt]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Target Role *
                  </label>
                  <select
                    {...editForm.register('targetRoleId')}
                    className="input-aura"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Scope
                  </label>
                  <select
                    {...editForm.register('scope')}
                    className="input-aura"
                  >
                    {scopeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {SCOPE_LABELS[opt]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Priority (0-1000)
                </label>
                <input
                  type="number"
                  {...editForm.register('priority', {valueAsNumber: true})}
                  className="input-aura"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  {...editForm.register('description')}
                  className="input-aura"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRule(null);
                    editForm.reset();
                  }}
                  className="btn-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Update Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Affected Users Modal */}
      {showAffectedUsersModal && selectedRule && (
        <AffectedUsersModal rule={selectedRule} onClose={() => setShowAffectedUsersModal(false)}/>
      )}
    </AdminPageContent>
  );
}

interface AffectedUsersModalProps {
  rule: ImplicitRoleRule;
  onClose: () => void;
}

function AffectedUsersModal({rule, onClose}: AffectedUsersModalProps) {
  const usersQuery = useAffectedUsers(rule.id);

  return (
    <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center z-50 p-4">
      <div className="skeuo-card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Users Affected by &quot;{rule.ruleName}&quot;
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {usersQuery.isLoading && <p className="text-[var(--text-muted)]">Loading...</p>}

        {usersQuery.data && (
          <div className="skeuo-card overflow-x-auto">
            <table className="table-aura">
              <thead className="skeuo-table-header">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                  User Name
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                  Assigned Role
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                  Scope
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                  Computed At
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                  Status
                </th>
              </tr>
              </thead>
              <tbody className="bg-[var(--bg-input)] divide-y divide-[var(--border-main)]">
              {usersQuery.data.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                    No users affected by this rule
                  </td>
                </tr>
              )}
              {usersQuery.data.content.map((userRole) => (
                <tr key={userRole.id}>
                  <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{userRole.userName}</td>
                  <td className="px-6 py-4 text-body-muted">{userRole.roleName}</td>
                  <td className="px-6 py-4 text-body-muted">{userRole.scope}</td>
                  <td className="px-6 py-4 text-body-muted">
                    {new Date(userRole.computedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          userRole.isActive
                            ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {userRole.isActive ? 'Active' : 'Inactive'}
                      </span>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}

        {usersQuery.error && (
          <p className="text-danger-500 text-sm mt-4">Failed to load affected users</p>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="btn-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
