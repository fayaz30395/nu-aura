'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  CustomFieldDefinition,
  CustomFieldDefinitionRequest,
  ENTITY_TYPE_INFO,
  EntityType,
  FIELD_TYPE_INFO,
  FieldType,
  FieldVisibility,
  VISIBILITY_INFO,
} from '@/lib/types/core/custom-fields';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {ConfirmDialog} from '@/components/ui';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {
  useActivateCustomFieldDefinition,
  useCreateCustomFieldDefinition,
  useCustomFieldDefinitions,
  useDeactivateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
} from '@/lib/hooks/queries/useCustomFields';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('CustomFieldsPage');

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const ENTITY_TYPES: EntityType[] = ['EMPLOYEE', 'DEPARTMENT', 'PROJECT', 'LEAVE_REQUEST', 'EXPENSE', 'ASSET', 'JOB_OPENING', 'CANDIDATE'];
const FIELD_TYPES: FieldType[] = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'DATETIME', 'DROPDOWN', 'MULTI_SELECT', 'CHECKBOX', 'EMAIL', 'PHONE', 'URL', 'FILE', 'CURRENCY', 'PERCENTAGE'];
const VISIBILITIES: FieldVisibility[] = ['ALL', 'SELF', 'MANAGER', 'HR', 'ADMIN_HR', 'ADMIN_ONLY'];

const customFieldSchema = z.object({
  fieldCode: z.string().min(1, 'Field code required'),
  fieldName: z.string().min(1, 'Display name required'),
  description: z.string().optional().or(z.literal('')),
  entityType: z.string().min(1, 'Entity type required'),
  fieldType: z.string().min(1, 'Field type required'),
  fieldGroup: z.string().optional().or(z.literal('')),
  displayOrder: z.number({coerce: true}).int().min(0).default(0),
  isRequired: z.boolean().default(false),
  isSearchable: z.boolean().default(false),
  showInList: z.boolean().default(false),
  defaultValue: z.string().optional().or(z.literal('')),
  placeholder: z.string().optional().or(z.literal('')),
  viewVisibility: z.string().default('ALL'),
  editVisibility: z.string().default('ADMIN_HR'),
  optionsText: z.string().optional().or(z.literal('')),
});

type CustomFieldFormData = z.infer<typeof customFieldSchema> & { optionsText: string };

export default function CustomFieldsPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();

  // Query hook
  const definitionsQuery = useCustomFieldDefinitions(0, 100);

  // Local UI state — declared before mutation hooks so selectedDefinition.id
  // is accessible when the update mutation hook is initialised below.
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedDefinition, setSelectedDefinition] = React.useState<CustomFieldDefinition | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterEntityType, setFilterEntityType] = React.useState<EntityType | 'ALL'>('ALL');
  const [error, setError] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [fieldToDelete, setFieldToDelete] = React.useState<CustomFieldDefinition | null>(null);

  // Mutation hooks
  const createMutation = useCreateCustomFieldDefinition();
  // Bind update mutation to the currently-selected definition's ID so the hook
  // is always called unconditionally at the component level (Rules of Hooks).
  const updateMutation = useUpdateCustomFieldDefinition(selectedDefinition?.id ?? '');
  const deleteMutation = useDeleteCustomFieldDefinition();
  const activateMutation = useActivateCustomFieldDefinition();
  const deactivateMutation = useDeactivateCustomFieldDefinition();

  // Form state
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: {errors, isSubmitting},
  } = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      fieldCode: '',
      fieldName: '',
      description: '',
      entityType: 'EMPLOYEE',
      fieldType: 'TEXT',
      fieldGroup: '',
      displayOrder: 0,
      isRequired: false,
      isSearchable: false,
      showInList: false,
      defaultValue: '',
      placeholder: '',
      viewVisibility: 'ALL',
      editVisibility: 'ADMIN_HR',
      optionsText: '',
    },
  });

  const fieldType = watch('fieldType');
  const _optionsText = watch('optionsText');

  useEffect(() => {
    if (!hasHydrated || !isReady) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) {
      router.push('/me/dashboard');
      return;
    }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const definitions = definitionsQuery.data?.content || [];
  const isLoading = definitionsQuery.isLoading;

  const onSubmit = async (data: CustomFieldFormData) => {
    try {
      setError(null);
      const request: CustomFieldDefinitionRequest = {
        fieldCode: data.fieldCode,
        fieldName: data.fieldName,
        description: data.description || '',
        entityType: data.entityType as EntityType,
        fieldType: data.fieldType as FieldType,
        fieldGroup: data.fieldGroup || '',
        displayOrder: data.displayOrder,
        isRequired: data.isRequired,
        isSearchable: data.isSearchable,
        showInList: data.showInList,
        defaultValue: data.defaultValue || '',
        placeholder: data.placeholder || '',
        options: data.optionsText ? data.optionsText.split('\n').map(o => o.trim()).filter(o => o) : [],
        viewVisibility: data.viewVisibility as FieldVisibility,
        editVisibility: data.editVisibility as FieldVisibility,
      };

      if (selectedDefinition) {
        // updateMutation is already bound to selectedDefinition.id at the component level
        // (see useUpdateCustomFieldDefinition(selectedDefinition?.id ?? '') above)
        await updateMutation.mutateAsync(request);
      } else {
        await createMutation.mutateAsync(request);
      }

      reset();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedDefinition(null);
    } catch (err: unknown) {
      log.error('Failed to save custom field:', err);
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to save custom field';
      setError(message);
    }
  };

  const handleDeleteField = (field: CustomFieldDefinition) => {
    setFieldToDelete(field);
    setShowDeleteConfirm(true);
  };

  const performDelete = async () => {
    if (!fieldToDelete) return;
    try {
      await deleteMutation.mutateAsync(fieldToDelete.id);
      setShowDeleteConfirm(false);
      setFieldToDelete(null);
    } catch (err) {
      log.error('Failed to delete custom field:', err);
      setError('Failed to delete custom field');
    }
  };

  const handleToggleActive = async (definition: CustomFieldDefinition) => {
    try {
      if (definition.isActive) {
        await deactivateMutation.mutateAsync(definition.id);
      } else {
        await activateMutation.mutateAsync(definition.id);
      }
    } catch (err) {
      log.error('Failed to toggle field status:', err);
    }
  };

  const openEditModal = (definition: CustomFieldDefinition) => {
    setSelectedDefinition(definition);
    reset({
      fieldCode: definition.fieldCode,
      fieldName: definition.fieldName,
      description: definition.description || '',
      entityType: definition.entityType,
      fieldType: definition.fieldType,
      fieldGroup: definition.fieldGroup || '',
      displayOrder: definition.displayOrder,
      isRequired: definition.isRequired,
      isSearchable: definition.isSearchable,
      showInList: definition.showInList,
      defaultValue: definition.defaultValue || '',
      placeholder: definition.placeholder || '',
      viewVisibility: definition.viewVisibility,
      editVisibility: definition.editVisibility,
      optionsText: definition.options?.join('\n') || '',
    });
    setShowEditModal(true);
  };

  const filteredDefinitions = definitions.filter((def) => {
    const matchesSearch =
      def.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.fieldCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntityType = filterEntityType === 'ALL' || def.entityType === filterEntityType;
    return matchesSearch && matchesEntityType;
  });

  const showOptionsField = fieldType === 'DROPDOWN' || fieldType === 'MULTI_SELECT';

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <SkeletonTable rows={6} columns={5} />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold skeuo-emboss">Custom Fields</h1>
          <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
            Define custom fields to extend entity data with your own attributes
          </p>
        </div>

        {error && (
          <div
            className="mb-4 p-4 bg-danger-100 dark:bg-danger-900/20 border border-danger-400 dark:border-danger-600 text-danger-700 dark:text-danger-400 rounded-lg">
            {error}
            <button onClick={() => setError(null)}
                    className="ml-2 text-danger-900 dark:text-danger-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    aria-label="Close error message">
              &times;
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-aura"
            />
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value as EntityType | 'ALL')}
              className="input-aura"
            >
              <option value="ALL">All Entity Types</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ENTITY_TYPE_INFO[type].label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              reset();
              setSelectedDefinition(null);
              setShowCreateModal(true);
            }}
            className="btn-primary !h-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Create Custom Field
          </button>
        </div>

        <div className="skeuo-card overflow-hidden">
          <table className="table-aura">
            <thead className="skeuo-table-header">
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Field
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Entity Type
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Field Type
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Group
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
            {filteredDefinitions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">
                  No custom fields found. Create your first custom field to get started.
                </td>
              </tr>
            ) : (
              filteredDefinitions.map((definition) => (
                <tr key={definition.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {definition.fieldName}
                      {definition.isRequired && (
                        <span className="ml-1 text-danger-500">*</span>
                      )}
                    </div>
                    <div className="text-caption">
                      {definition.fieldCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300">
                        {ENTITY_TYPE_INFO[definition.entityType].label}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                    {FIELD_TYPE_INFO[definition.fieldType].label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                    {definition.fieldGroup || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(definition)}
                      className={`px-2 py-1 text-xs font-semibold rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                        definition.isActive
                          ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                      aria-label={`Toggle ${definition.fieldName} status`}
                    >
                      {definition.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(definition)}
                      className="text-accent-600 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300 mr-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteField(definition)}
                      className="text-danger-600 hover:text-danger-900 dark:text-danger-400 dark:hover:text-danger-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setFieldToDelete(null);
          }}
          onConfirm={performDelete}
          title="Delete Custom Field"
          message={`Are you sure you want to delete "${fieldToDelete?.fieldName}"? All associated values will be deleted.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center z-50 p-4">
            <div className="skeuo-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
                {showCreateModal ? 'Create Custom Field' : 'Edit Custom Field'}
              </h2>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Field Code *
                    </label>
                    <input
                      type="text"
                      {...register('fieldCode')}
                      className="input-aura"
                      placeholder="e.g., blood_group"
                      disabled={showEditModal}
                    />
                    {errors.fieldCode && <p className="text-danger-500 text-sm mt-1">{errors.fieldCode.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      {...register('fieldName')}
                      className="input-aura"
                      placeholder="e.g., Blood Group"
                    />
                    {errors.fieldName && <p className="text-danger-500 text-sm mt-1">{errors.fieldName.message}</p>}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    className="input-aura"
                    rows={2}
                    placeholder="Optional description..."
                  />
                  {errors.description && <p className="text-danger-500 text-sm mt-1">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Entity Type *
                    </label>
                    <Controller
                      name="entityType"
                      control={control}
                      render={({field}) => (
                        <select
                          {...field}
                          className="input-aura"
                          disabled={showEditModal}
                        >
                          {ENTITY_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {ENTITY_TYPE_INFO[type].label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.entityType && <p className="text-danger-500 text-sm mt-1">{errors.entityType.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Field Type *
                    </label>
                    <Controller
                      name="fieldType"
                      control={control}
                      render={({field}) => (
                        <select
                          {...field}
                          className="input-aura"
                          disabled={showEditModal}
                        >
                          {FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {FIELD_TYPE_INFO[type].label} - {FIELD_TYPE_INFO[type].description}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.fieldType && <p className="text-danger-500 text-sm mt-1">{errors.fieldType.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Field Group
                    </label>
                    <input
                      type="text"
                      {...register('fieldGroup')}
                      className="input-aura"
                      placeholder="e.g., Personal, Emergency Contact"
                    />
                    {errors.fieldGroup && <p className="text-danger-500 text-sm mt-1">{errors.fieldGroup.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      {...register('displayOrder')}
                      className="input-aura"
                    />
                    {errors.displayOrder &&
                      <p className="text-danger-500 text-sm mt-1">{errors.displayOrder.message}</p>}
                  </div>
                </div>

                {showOptionsField && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Options (one per line)
                    </label>
                    <textarea
                      {...register('optionsText')}
                      className="input-aura"
                      rows={4}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                    {errors.optionsText && <p className="text-danger-500 text-sm mt-1">{errors.optionsText.message}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      {...register('placeholder')}
                      className="input-aura"
                      placeholder="Placeholder text..."
                    />
                    {errors.placeholder && <p className="text-danger-500 text-sm mt-1">{errors.placeholder.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Default Value
                    </label>
                    <input
                      type="text"
                      {...register('defaultValue')}
                      className="input-aura"
                    />
                    {errors.defaultValue &&
                      <p className="text-danger-500 text-sm mt-1">{errors.defaultValue.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      View Visibility
                    </label>
                    <Controller
                      name="viewVisibility"
                      control={control}
                      render={({field}) => (
                        <select
                          {...field}
                          className="input-aura"
                        >
                          {VISIBILITIES.map((v) => (
                            <option key={v} value={v}>
                              {VISIBILITY_INFO[v].label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.viewVisibility &&
                      <p className="text-danger-500 text-sm mt-1">{errors.viewVisibility.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Edit Visibility
                    </label>
                    <Controller
                      name="editVisibility"
                      control={control}
                      render={({field}) => (
                        <select
                          {...field}
                          className="input-aura"
                        >
                          {VISIBILITIES.map((v) => (
                            <option key={v} value={v}>
                              {VISIBILITY_INFO[v].label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.editVisibility &&
                      <p className="text-danger-500 text-sm mt-1">{errors.editVisibility.message}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mb-6">
                  <Controller
                    name="isRequired"
                    control={control}
                    render={({field: {value, onChange}}) => (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => onChange(e.target.checked)}
                          className="rounded text-accent-700 focus:ring-accent-500"
                        />
                        <span className="text-body-secondary">Required</span>
                      </label>
                    )}
                  />
                  <Controller
                    name="isSearchable"
                    control={control}
                    render={({field: {value, onChange}}) => (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => onChange(e.target.checked)}
                          className="rounded text-accent-700 focus:ring-accent-500"
                        />
                        <span className="text-body-secondary">Searchable</span>
                      </label>
                    )}
                  />
                  <Controller
                    name="showInList"
                    control={control}
                    render={({field: {value, onChange}}) => (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => onChange(e.target.checked)}
                          className="rounded text-accent-700 focus:ring-accent-500"
                        />
                        <span className="text-body-secondary">Show in List View</span>
                      </label>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setSelectedDefinition(null);
                    }}
                    className="btn-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || createMutation.isPending}
                    className="btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    {isSubmitting || createMutation.isPending ? 'Saving...' : (showCreateModal ? 'Create Field' : 'Update Field')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
