'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LeaveType, LeaveTypeRequest, AccrualType, GenderSpecific } from '@/lib/types/hrms/leave';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { ConfirmDialog } from '@/components/ui';
import {
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useActivateLeaveType,
  useDeactivateLeaveType,
} from '@/lib/hooks/queries/useLeaves';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const leaveTypeFormSchema = z.object({
  leaveCode: z.string().min(1, 'Leave code required'),
  leaveName: z.string().min(1, 'Leave name required'),
  description: z.string().optional().or(z.literal('')),
  isPaid: z.boolean().default(true),
  colorCode: z.string().default('#3B82F6'),
  annualQuota: z.number({ coerce: true }).min(0).default(0),
  maxConsecutiveDays: z.number({ coerce: true }).optional(),
  minDaysNotice: z.number({ coerce: true }).min(0).default(0),
  maxDaysPerRequest: z.number({ coerce: true }).optional(),
  isCarryForwardAllowed: z.boolean().default(false),
  maxCarryForwardDays: z.number({ coerce: true }).optional(),
  isEncashable: z.boolean().default(false),
  requiresDocument: z.boolean().default(false),
  applicableAfterDays: z.number({ coerce: true }).min(0).default(0),
  accrualType: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'NO_ACCRUAL']).optional(),
  accrualRate: z.number({ coerce: true }).optional(),
  genderSpecific: z.enum(['ALL', 'MALE', 'FEMALE']).default('ALL'),
});

type LeaveTypeFormData = z.infer<typeof leaveTypeFormSchema>;

export default function LeaveTypesManagementPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leaveTypeToDelete, setLeaveTypeToDelete] = useState<LeaveType | null>(null);

  // React Query hooks
  const { data: page, isLoading, error: queryError } = useLeaveTypes(0, 100);
  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();
  const deleteMutation = useDeleteLeaveType();
  const activateMutation = useActivateLeaveType();
  const deactivateMutation = useDeactivateLeaveType();

  const leaveTypes = page?.content || [];
  const loading = isLoading;

  // Form hook
  const form = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeFormSchema),
    defaultValues: {
      leaveCode: '',
      leaveName: '',
      description: '',
      isPaid: true,
      colorCode: '#3B82F6',
      annualQuota: 0,
      maxConsecutiveDays: undefined,
      minDaysNotice: 0,
      maxDaysPerRequest: undefined,
      isCarryForwardAllowed: false,
      maxCarryForwardDays: undefined,
      isEncashable: false,
      requiresDocument: false,
      applicableAfterDays: 0,
      accrualType: undefined,
      accrualRate: undefined,
      genderSpecific: 'ALL',
    },
  });

  // R2-008 FIX: return null immediately after router.push() so the component
  // stops rendering and doesn't briefly expose privileged UI before navigation.
  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...ADMIN_ACCESS_ROLES)) {
    router.push('/home');
    return null;
  }

  if (hasHydrated && isReady && !isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (data: LeaveTypeFormData) => {
    setUiError(null);

    const submitData: LeaveTypeRequest = {
      leaveCode: data.leaveCode,
      leaveName: data.leaveName,
      description: data.description || undefined,
      isPaid: data.isPaid,
      colorCode: data.colorCode || undefined,
      annualQuota: data.annualQuota || undefined,
      maxConsecutiveDays: data.maxConsecutiveDays || undefined,
      minDaysNotice: data.minDaysNotice || 0,
      maxDaysPerRequest: data.maxDaysPerRequest || undefined,
      isCarryForwardAllowed: data.isCarryForwardAllowed,
      maxCarryForwardDays: data.maxCarryForwardDays || undefined,
      isEncashable: data.isEncashable,
      requiresDocument: data.requiresDocument,
      applicableAfterDays: data.applicableAfterDays || 0,
      accrualType: data.accrualType || undefined,
      accrualRate: data.accrualRate || undefined,
      genderSpecific: data.genderSpecific || undefined,
    };

    if (editingLeaveType) {
      updateMutation.mutate(
        { id: editingLeaveType.id, data: submitData },
        {
          onSuccess: () => {
            resetForm();
            setShowModal(false);
            setEditingLeaveType(null);
          },
          onError: (err: unknown) => {
            setUiError(
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to update leave type'
            );
          },
        }
      );
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => {
          resetForm();
          setShowModal(false);
          setEditingLeaveType(null);
        },
        onError: (err: unknown) => {
          setUiError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create leave type'
          );
        },
      });
    }
  };

  const resetForm = () => {
    form.reset({
      leaveCode: '',
      leaveName: '',
      description: '',
      isPaid: true,
      colorCode: '#3B82F6',
      annualQuota: 0,
      maxConsecutiveDays: undefined,
      minDaysNotice: 0,
      maxDaysPerRequest: undefined,
      isCarryForwardAllowed: false,
      maxCarryForwardDays: undefined,
      isEncashable: false,
      requiresDocument: false,
      applicableAfterDays: 0,
      accrualType: undefined,
      accrualRate: undefined,
      genderSpecific: 'ALL',
    });
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    form.reset({
      leaveCode: leaveType.leaveCode,
      leaveName: leaveType.leaveName,
      description: leaveType.description || '',
      isPaid: leaveType.isPaid,
      colorCode: leaveType.colorCode || '#3B82F6',
      annualQuota: leaveType.annualQuota || 0,
      maxConsecutiveDays: leaveType.maxConsecutiveDays,
      minDaysNotice: leaveType.minDaysNotice || 0,
      maxDaysPerRequest: leaveType.maxDaysPerRequest,
      isCarryForwardAllowed: leaveType.isCarryForwardAllowed,
      maxCarryForwardDays: leaveType.maxCarryForwardDays,
      isEncashable: leaveType.isEncashable,
      requiresDocument: leaveType.requiresDocument,
      applicableAfterDays: leaveType.applicableAfterDays || 0,
      accrualType: leaveType.accrualType,
      accrualRate: leaveType.accrualRate,
      genderSpecific: leaveType.genderSpecific || 'ALL',
    });
    setShowModal(true);
  };

  const handleDelete = (leaveType: LeaveType) => {
    setLeaveTypeToDelete(leaveType);
    setShowDeleteConfirm(true);
  };

  const performDelete = () => {
    if (!leaveTypeToDelete) return;

    setUiError(null);
    deleteMutation.mutate(leaveTypeToDelete.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setLeaveTypeToDelete(null);
      },
      onError: (err: unknown) => {
        setUiError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to delete leave type'
        );
      },
    });
  };

  const handleToggleActive = (leaveType: LeaveType) => {
    setUiError(null);
    if (leaveType.isActive) {
      deactivateMutation.mutate(leaveType.id, {
        onError: (err: unknown) => {
          setUiError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update leave type status'
          );
        },
      });
    } else {
      activateMutation.mutate(leaveType.id, {
        onError: (err: unknown) => {
          setUiError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update leave type status'
          );
        },
      });
    }
  };

  const accrualTypes: AccrualType[] = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'NO_ACCRUAL'];
  const genderOptions: GenderSpecific[] = ['ALL', 'MALE', 'FEMALE'];

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">Leave Types Management</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)] skeuo-deboss">
              Configure and manage leave types for your organization
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingLeaveType(null);
              setShowModal(true);
            }}
            className="btn-primary !h-auto"
          >
            + Add Leave Type
          </button>
        </div>

        {/* Error Message */}
        {(uiError || queryError) && (
          <div className="mb-4 bg-danger-50 border border-danger-200 text-danger-700 px-4 py-4 rounded relative">
            <span className="block sm:inline">{uiError || (queryError as Error)?.message || 'An error occurred'}</span>
            <button
              onClick={() => setUiError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-4"
            >
              <span className="text-danger-500 text-xl">&times;</span>
            </button>
          </div>
        )}

        {/* Leave Types Table */}
        <div className="skeuo-card overflow-hidden">
          <table className="table-aura">
            <thead className="skeuo-table-header">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Code & Name
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Annual Quota
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-main)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    Loading leave types...
                  </td>
                </tr>
              ) : leaveTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center">
                      <svg className="h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-[var(--text-secondary)]">No leave types configured</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">Click &quot;Add Leave Type&quot; to create your first leave type</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leaveTypes.map((leaveType) => (
                  <tr key={leaveType.id} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-8 w-8 rounded-full mr-3"
                          style={{ backgroundColor: leaveType.colorCode || '#3B82F6' }}
                        />
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{leaveType.leaveName}</div>
                          <div className="text-sm text-[var(--text-muted)]">{leaveType.leaveCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${leaveType.isPaid ? 'bg-success-100 text-success-800' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                        {leaveType.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {leaveType.annualQuota ? `${leaveType.annualQuota} days` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {leaveType.isCarryForwardAllowed && (
                          <span className="px-2 py-1 text-xs bg-accent-100 text-accent-800 rounded">Carry Forward</span>
                        )}
                        {leaveType.isEncashable && (
                          <span className="px-2 py-1 text-xs bg-accent-300 text-accent-900 rounded">Encashable</span>
                        )}
                        {leaveType.requiresDocument && (
                          <span className="px-2 py-1 text-xs bg-warning-100 text-warning-800 rounded">Requires Doc</span>
                        )}
                        {leaveType.genderSpecific && leaveType.genderSpecific !== 'ALL' && (
                          <span className="px-2 py-1 text-xs bg-accent-300 text-accent-900 rounded">{leaveType.genderSpecific}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${leaveType.isActive ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}`}>
                        {leaveType.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(leaveType)}
                        className="text-accent-700 hover:text-accent-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(leaveType)}
                        className="text-warning-600 hover:text-warning-900 mr-3"
                      >
                        {leaveType.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(leaveType)}
                        className="text-danger-600 hover:text-danger-900"
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
            setLeaveTypeToDelete(null);
          }}
          onConfirm={performDelete}
          title="Delete Leave Type"
          message={`Are you sure you want to delete "${leaveTypeToDelete?.leaveName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Add/Edit Leave Type Modal */}
        {showModal && (
          <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50">
            <div className="skeuo-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {editingLeaveType ? 'Edit Leave Type' : 'Add New Leave Type'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingLeaveType(null);
                      resetForm();
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Leave Code *
                        </label>
                        <input
                          type="text"
                          {...form.register('leaveCode')}
                          className="input-aura"
                          placeholder="AL, SL, CL"
                        />
                        {form.formState.errors.leaveCode && (
                          <p className="mt-1 text-xs text-danger-500">{form.formState.errors.leaveCode.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Leave Name *
                        </label>
                        <input
                          type="text"
                          {...form.register('leaveName')}
                          className="input-aura"
                          placeholder="Annual Leave, Sick Leave"
                        />
                        {form.formState.errors.leaveName && (
                          <p className="mt-1 text-xs text-danger-500">{form.formState.errors.leaveName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Description
                      </label>
                      <textarea
                        {...form.register('description')}
                        rows={2}
                        className="input-aura"
                        placeholder="Brief description of this leave type..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Color Code
                        </label>
                        <input
                          type="color"
                          {...form.register('colorCode')}
                          className="w-full h-10 px-1 py-1 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md"
                        />
                      </div>
                      <div className="flex items-center pt-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            {...form.register('isPaid')}
                            className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                          />
                          <span className="ml-2 text-sm text-[var(--text-secondary)]">Paid Leave</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Gender Specific
                        </label>
                        <select
                          {...form.register('genderSpecific')}
                          className="input-aura"
                        >
                          {genderOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Quota & Limits */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Quota & Limits</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Annual Quota (days)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          {...form.register('annualQuota')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Max Consecutive Days
                        </label>
                        <input
                          type="number"
                          min="1"
                          {...form.register('maxConsecutiveDays')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Max Days Per Request
                        </label>
                        <input
                          type="number"
                          min="1"
                          {...form.register('maxDaysPerRequest')}
                          className="input-aura"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Min Days Notice
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...form.register('minDaysNotice')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Applicable After (days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...form.register('applicableAfterDays')}
                          className="input-aura"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Accrual Settings */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Accrual Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Accrual Type
                        </label>
                        <select
                          {...form.register('accrualType')}
                          className="input-aura"
                        >
                          <option value="">No Accrual</option>
                          {accrualTypes.map(type => (
                            <option key={type} value={type}>{type.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Accrual Rate (days/period)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          {...form.register('accrualRate')}
                          className="input-aura"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Carry Forward & Encashment */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Carry Forward & Encashment</h3>
                    <div className="space-y-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('isCarryForwardAllowed')}
                          className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                        />
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">Allow Carry Forward</span>
                      </label>

                      {form.watch('isCarryForwardAllowed') && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Max Carry Forward Days
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            {...form.register('maxCarryForwardDays')}
                            className="input-aura"
                          />
                        </div>
                      )}

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('isEncashable')}
                          className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                        />
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">Encashable</span>
                      </label>

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('requiresDocument')}
                          className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                        />
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">Requires Supporting Document</span>
                      </label>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingLeaveType(null);
                        resetForm();
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending}
                      className="btn-primary !h-auto disabled:opacity-50"
                    >
                      {form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingLeaveType ? 'Update' : 'Create')} Leave Type
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
