'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { customFieldsApi } from '@/lib/api/custom-fields';
import {
  CustomFieldDefinition,
  CustomFieldDefinitionRequest,
  EntityType,
  FieldType,
  FieldVisibility,
  FIELD_TYPE_INFO,
  ENTITY_TYPE_INFO,
  VISIBILITY_INFO,
} from '@/lib/types/custom-fields';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const ENTITY_TYPES: EntityType[] = ['EMPLOYEE', 'DEPARTMENT', 'PROJECT', 'LEAVE_REQUEST', 'EXPENSE', 'ASSET', 'JOB_OPENING', 'CANDIDATE'];
const FIELD_TYPES: FieldType[] = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'DATETIME', 'DROPDOWN', 'MULTI_SELECT', 'CHECKBOX', 'EMAIL', 'PHONE', 'URL', 'FILE', 'CURRENCY', 'PERCENTAGE'];
const VISIBILITIES: FieldVisibility[] = ['ALL', 'SELF', 'MANAGER', 'HR', 'ADMIN_HR', 'ADMIN_ONLY'];

const initialFormData: CustomFieldDefinitionRequest = {
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
  options: [],
  viewVisibility: 'ALL',
  editVisibility: 'ADMIN_HR',
};

export default function CustomFieldsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<CustomFieldDefinition | null>(null);
  const [formData, setFormData] = useState<CustomFieldDefinitionRequest>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<EntityType | 'ALL'>('ALL');
  const [optionsText, setOptionsText] = useState('');
  const [error, setError] = useState<string | null>(null);

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

    loadDefinitions();
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const loadDefinitions = async () => {
    try {
      setLoading(true);
      const response = await customFieldsApi.getAllDefinitions(0, 100);
      setDefinitions(response.content);
    } catch (err) {
      console.error('Failed to load custom field definitions:', err);
      setError('Failed to load custom fields. Please check if you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const request = {
        ...formData,
        options: optionsText ? optionsText.split('\n').map(o => o.trim()).filter(o => o) : undefined,
      };
      await customFieldsApi.createDefinition(request);
      setShowCreateModal(false);
      setFormData(initialFormData);
      setOptionsText('');
      loadDefinitions();
    } catch (err: unknown) {
      console.error('Failed to create custom field:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create custom field');
    }
  };

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDefinition) return;
    try {
      setError(null);
      const request = {
        ...formData,
        options: optionsText ? optionsText.split('\n').map(o => o.trim()).filter(o => o) : undefined,
      };
      await customFieldsApi.updateDefinition(selectedDefinition.id, request);
      setShowEditModal(false);
      setSelectedDefinition(null);
      setFormData(initialFormData);
      setOptionsText('');
      loadDefinitions();
    } catch (err: unknown) {
      console.error('Failed to update custom field:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update custom field');
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom field? All associated values will be deleted.')) return;
    try {
      await customFieldsApi.deleteDefinition(id);
      loadDefinitions();
    } catch (err) {
      console.error('Failed to delete custom field:', err);
      setError('Failed to delete custom field');
    }
  };

  const handleToggleActive = async (definition: CustomFieldDefinition) => {
    try {
      if (definition.isActive) {
        await customFieldsApi.deactivateDefinition(definition.id);
      } else {
        await customFieldsApi.activateDefinition(definition.id);
      }
      loadDefinitions();
    } catch (err) {
      console.error('Failed to toggle field status:', err);
    }
  };

  const openEditModal = (definition: CustomFieldDefinition) => {
    setSelectedDefinition(definition);
    setFormData({
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
      options: definition.options || [],
      viewVisibility: definition.viewVisibility,
      editVisibility: definition.editVisibility,
    });
    setOptionsText(definition.options?.join('\n') || '');
    setShowEditModal(true);
  };

  const filteredDefinitions = definitions.filter((def) => {
    const matchesSearch =
      def.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.fieldCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntityType = filterEntityType === 'ALL' || def.entityType === filterEntityType;
    return matchesSearch && matchesEntityType;
  });

  const showOptionsField = formData.fieldType === 'DROPDOWN' || formData.fieldType === 'MULTI_SELECT';

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
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Custom Fields</h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Define custom fields to extend entity data with your own attributes
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-900 dark:text-red-200">
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
              className="px-4 py-2 border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value as EntityType | 'ALL')}
              className="px-4 py-2 border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              setFormData(initialFormData);
              setOptionsText('');
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            Create Custom Field
          </button>
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-surface-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entity Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Field Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDefinitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No custom fields found. Create your first custom field to get started.
                  </td>
                </tr>
              ) : (
                filteredDefinitions.map((definition) => (
                  <tr key={definition.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {definition.fieldName}
                        {definition.isRequired && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {definition.fieldCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {ENTITY_TYPE_INFO[definition.entityType].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {FIELD_TYPE_INFO[definition.fieldType].label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {definition.fieldGroup || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(definition)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          definition.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-surface-700 dark:text-gray-300'
                        }`}
                      >
                        {definition.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(definition)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteField(definition.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-surface-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-100">
                {showCreateModal ? 'Create Custom Field' : 'Edit Custom Field'}
              </h2>
              <form onSubmit={showCreateModal ? handleCreateField : handleUpdateField}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Field Code *
                    </label>
                    <input
                      type="text"
                      value={formData.fieldCode}
                      onChange={(e) =>
                        setFormData({ ...formData, fieldCode: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
                      }
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., blood_group"
                      required
                      disabled={showEditModal}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fieldName}
                      onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Blood Group"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Optional description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Entity Type *
                    </label>
                    <select
                      value={formData.entityType}
                      onChange={(e) => setFormData({ ...formData, entityType: e.target.value as EntityType })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={showEditModal}
                    >
                      {ENTITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {ENTITY_TYPE_INFO[type].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Field Type *
                    </label>
                    <select
                      value={formData.fieldType}
                      onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as FieldType })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={showEditModal}
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {FIELD_TYPE_INFO[type].label} - {FIELD_TYPE_INFO[type].description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Field Group
                    </label>
                    <input
                      type="text"
                      value={formData.fieldGroup}
                      onChange={(e) => setFormData({ ...formData, fieldGroup: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Personal, Emergency Contact"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {showOptionsField && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Options (one per line)
                    </label>
                    <textarea
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={formData.placeholder}
                      onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Placeholder text..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Default Value
                    </label>
                    <input
                      type="text"
                      value={formData.defaultValue}
                      onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      View Visibility
                    </label>
                    <select
                      value={formData.viewVisibility}
                      onChange={(e) => setFormData({ ...formData, viewVisibility: e.target.value as FieldVisibility })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {VISIBILITY_INFO[v].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Edit Visibility
                    </label>
                    <select
                      value={formData.editVisibility}
                      onChange={(e) => setFormData({ ...formData, editVisibility: e.target.value as FieldVisibility })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {VISIBILITY_INFO[v].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mb-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                      className="rounded text-primary-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Required</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSearchable}
                      onChange={(e) => setFormData({ ...formData, isSearchable: e.target.checked })}
                      className="rounded text-primary-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Searchable</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showInList}
                      onChange={(e) => setFormData({ ...formData, showInList: e.target.checked })}
                      className="rounded text-primary-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Show in List View</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setSelectedDefinition(null);
                      setFormData(initialFormData);
                      setOptionsText('');
                    }}
                    className="px-4 py-2 text-surface-700 dark:text-surface-300 bg-surface-200 dark:bg-surface-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    {showCreateModal ? 'Create Field' : 'Update Field'}
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
