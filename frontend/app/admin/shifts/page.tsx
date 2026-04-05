'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {CreateShiftRequest, Shift} from '@/lib/types/hrms/shifts';
import {Clock, Edit, Plus, ToggleLeft, ToggleRight, Trash2} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {ConfirmDialog} from '@/components/ui';
import {useCreateNewShift, useRemoveShift, useShiftsList, useUpdateShiftDetails,} from '@/lib/hooks/queries/useShifts';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('ShiftsPage');

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const shiftFormSchema = z.object({
  shiftCode: z.string().min(1, 'Shift code required'),
  shiftName: z.string().min(1, 'Shift name required'),
  description: z.string().optional().or(z.literal('')),
  startTime: z.string().min(1, 'Start time required'),
  endTime: z.string().min(1, 'End time required'),
  gracePeriodInMinutes: z.number({coerce: true}).min(0).default(15),
  lateMarkAfterMinutes: z.number({coerce: true}).min(0).default(30),
  halfDayAfterMinutes: z.number({coerce: true}).min(0).default(240),
  fullDayHours: z.number({coerce: true}).min(0).default(8),
  breakDurationMinutes: z.number({coerce: true}).min(0).default(60),
  isNightShift: z.boolean().default(false),
  workingDays: z.string().default('MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY'),
  isActive: z.boolean().default(true),
  shiftType: z.string().default('REGULAR'),
  colorCode: z.string().default('#3B82F6'),
  allowsOvertime: z.boolean().default(true),
  overtimeMultiplier: z.number({coerce: true}).min(1).default(1.5),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

export default function ShiftsManagementPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  // Query hook
  const shiftsQuery = useShiftsList(0, 100);

  // Mutation hooks
  const createShiftMutation = useCreateNewShift();
  const updateShiftMutation = useUpdateShiftDetails(editingShift?.id || '');
  const deleteShiftMutation = useRemoveShift();

  // Form hook
  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      shiftCode: '',
      shiftName: '',
      description: '',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodInMinutes: 15,
      lateMarkAfterMinutes: 30,
      halfDayAfterMinutes: 240,
      fullDayHours: 8,
      breakDurationMinutes: 60,
      isNightShift: false,
      workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
      isActive: true,
      shiftType: 'REGULAR',
      colorCode: '#3B82F6',
      allowsOvertime: true,
      overtimeMultiplier: 1.5,
    },
  });

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

  const shifts: Shift[] = (shiftsQuery.data?.content ?? []) as Shift[];
  const isLoading = shiftsQuery.isLoading;

  const handleSubmit = async (data: ShiftFormData) => {
    try {
      setError(null);

      const submitData: CreateShiftRequest = {
        shiftCode: data.shiftCode,
        shiftName: data.shiftName,
        description: data.description || '',
        startTime: data.startTime + ':00',
        endTime: data.endTime + ':00',
        gracePeriodInMinutes: data.gracePeriodInMinutes,
        lateMarkAfterMinutes: data.lateMarkAfterMinutes,
        halfDayAfterMinutes: data.halfDayAfterMinutes,
        fullDayHours: data.fullDayHours,
        breakDurationMinutes: data.breakDurationMinutes,
        isNightShift: data.isNightShift,
        workingDays: data.workingDays,
        isActive: data.isActive,
        shiftType: data.shiftType,
        colorCode: data.colorCode,
        allowsOvertime: data.allowsOvertime,
        overtimeMultiplier: data.overtimeMultiplier,
      };

      if (editingShift) {
        await updateShiftMutation.mutateAsync(submitData);
      } else {
        await createShiftMutation.mutateAsync(submitData);
      }

      resetForm();
      setShowModal(false);
      setEditingShift(null);
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || `Failed to ${editingShift ? 'update' : 'create'} shift`;
      setError(message);
      log.error('Error saving shift:', err);
    }
  };

  const resetForm = () => {
    form.reset({
      shiftCode: '',
      shiftName: '',
      description: '',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodInMinutes: 15,
      lateMarkAfterMinutes: 30,
      halfDayAfterMinutes: 240,
      fullDayHours: 8,
      breakDurationMinutes: 60,
      isNightShift: false,
      workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
      isActive: true,
      shiftType: 'REGULAR',
      colorCode: '#3B82F6',
      allowsOvertime: true,
      overtimeMultiplier: 1.5,
    });
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    form.reset({
      shiftCode: shift.shiftCode,
      shiftName: shift.shiftName,
      description: shift.description || '',
      startTime: formatTime(shift.startTime),
      endTime: formatTime(shift.endTime),
      gracePeriodInMinutes: shift.gracePeriodInMinutes || 0,
      lateMarkAfterMinutes: shift.lateMarkAfterMinutes || 0,
      halfDayAfterMinutes: shift.halfDayAfterMinutes || 0,
      fullDayHours: shift.fullDayHours || 8,
      breakDurationMinutes: shift.breakDurationMinutes || 0,
      isNightShift: shift.isNightShift || false,
      workingDays: shift.workingDays || '',
      isActive: shift.isActive,
      shiftType: shift.shiftType || 'REGULAR',
      colorCode: shift.colorCode || '#3B82F6',
      allowsOvertime: shift.allowsOvertime || false,
      overtimeMultiplier: shift.overtimeMultiplier || 1.5,
    });
    setShowModal(true);
  };

  const handleDelete = (shift: Shift) => {
    setShiftToDelete(shift);
    setShowDeleteConfirm(true);
  };

  const performDelete = async () => {
    if (!shiftToDelete) return;

    try {
      setError(null);
      await deleteShiftMutation.mutateAsync(shiftToDelete.id);
      setShowDeleteConfirm(false);
      setShiftToDelete(null);
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to delete shift';
      setError(message);
      log.error('Error deleting shift:', err);
    }
  };

  const handleToggleActive = async (shift: Shift) => {
    try {
      setError(null);
      await updateShiftMutation.mutateAsync({isActive: !shift.isActive});
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to update shift status';
      setError(message);
      log.error('Error toggling shift status:', err);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">
              <Clock className="h-8 w-8 text-accent-700"/>
              Shift Management
            </h1>
            <p className="mt-1 text-body-secondary skeuo-deboss">
              Configure and manage work shifts for your organization
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingShift(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5"/>
            Add Shift
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-4 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400 px-4 py-4 rounded-lg relative animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-4"
            >
              <span className="text-danger-500 text-xl">&times;</span>
            </button>
          </div>
        )}

        {/* Shifts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700"></div>
            </div>
          ) : shifts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-12 text-[var(--text-muted)]">
              <Clock className="h-16 w-16 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-4"/>
              <p className="text-lg font-medium">No shifts configured</p>
              <p className="text-sm mt-1">Click &quot;Add Shift&quot; to create your first shift</p>
            </div>
          ) : (
            shifts.map((shift) => (
              <div
                key={shift.id}
                className="skeuo-card overflow-hidden"
                style={{borderTop: `4px solid ${shift.colorCode || '#3B82F6'}`}}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">{shift.shiftName}</h3>
                      <p className="text-body-muted">{shift.shiftCode}</p>
                    </div>
                    <span
                      className={`px-4 py-1 text-xs font-semibold rounded-full ${
                        shift.isActive
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-400'
                          : 'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-400'
                      }`}
                    >
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </span>
                  </div>

                  {shift.description && (
                    <p className="text-body-secondary mb-4">{shift.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 text-[var(--text-secondary)] mr-2"/>
                      <span className="text-[var(--text-secondary)]">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </span>
                    </div>
                    {(shift.breakDurationMinutes ?? 0) > 0 && (
                      <div className="text-body-secondary">
                        Break: {shift.breakDurationMinutes} min
                      </div>
                    )}
                    <div className="text-body-secondary">
                      Working Hours: {shift.netWorkingHours || shift.fullDayHours}h
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {shift.isNightShift && (
                      <span
                        className="px-2 py-1 text-xs bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-400 rounded">
                          Night Shift
                        </span>
                    )}
                    {shift.allowsOvertime && (
                      <span
                        className="px-2 py-1 text-xs bg-accent-300 dark:bg-accent-900/30 text-accent-900 dark:text-accent-600 rounded">
                          OT: {shift.overtimeMultiplier}x
                        </span>
                    )}
                    {(shift.gracePeriodInMinutes ?? 0) > 0 && (
                      <span
                        className="px-2 py-1 text-xs bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-400 rounded">
                          Grace: {shift.gracePeriodInMinutes}m
                        </span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-main)]">
                    <button
                      onClick={() => handleEdit(shift)}
                      className="p-2 text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-950/30 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4"/>
                    </button>
                    <button
                      onClick={() => handleToggleActive(shift)}
                      className="p-2 text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/30 rounded-lg transition-colors"
                      title={shift.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {shift.isActive ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>}
                    </button>
                    <button
                      onClick={() => handleDelete(shift)}
                      className="p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setShiftToDelete(null);
          }}
          onConfirm={performDelete}
          title="Delete Shift"
          message={`Are you sure you want to delete the shift "${shiftToDelete?.shiftName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Add/Edit Shift Modal */}
        {showModal && (
          <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50">
            <div
              className="skeuo-card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {editingShift ? 'Edit Shift' : 'Add New Shift'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingShift(null);
                      resetForm();
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="border-b border-[var(--border-main)] pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Shift Code *
                        </label>
                        <input
                          type="text"
                          {...form.register('shiftCode')}
                          className="input-aura"
                          placeholder="DS, NS, GS"
                        />
                        {form.formState.errors.shiftCode && (
                          <p className="mt-1 text-xs text-danger-500">{form.formState.errors.shiftCode.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Shift Name *
                        </label>
                        <input
                          type="text"
                          {...form.register('shiftName')}
                          className="input-aura"
                          placeholder="Day Shift, Night Shift"
                        />
                        {form.formState.errors.shiftName && (
                          <p className="mt-1 text-xs text-danger-500">{form.formState.errors.shiftName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Shift Type
                        </label>
                        <select
                          {...form.register('shiftType')}
                          className="input-aura"
                        >
                          <option value="REGULAR">Regular</option>
                          <option value="ROTATIONAL">Rotational</option>
                          <option value="FLEXIBLE">Flexible</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Color Code
                        </label>
                        <input
                          type="color"
                          {...form.register('colorCode')}
                          className="input-aura h-10"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Description
                      </label>
                      <textarea
                        {...form.register('description')}
                        rows={2}
                        className="w-full px-4 py-2 border border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 bg-[var(--bg-card)] text-[var(--text-primary)]"
                        placeholder="Brief description of this shift..."
                      />
                    </div>
                  </div>

                  {/* Shift Timing */}
                  <div className="border-b border-[var(--border-main)] pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Shift Timing</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          {...form.register('startTime')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          {...form.register('endTime')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Break (minutes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...form.register('breakDurationMinutes')}
                          className="input-aura"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Full Day Hours
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          {...form.register('fullDayHours')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Working Days
                        </label>
                        <input
                          type="text"
                          {...form.register('workingDays')}
                          className="input-aura"
                          placeholder="MONDAY,TUESDAY,WEDNESDAY"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Attendance Rules */}
                  <div className="border-b border-[var(--border-main)] pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Attendance Rules</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Grace Period (min)
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...form.register('gracePeriodInMinutes')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Late Mark After (min)
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...form.register('lateMarkAfterMinutes')}
                          className="input-aura"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Half Day After (min)
                        </label>
                        <input
                          type="number"
                          min="0"
                          {...form.register('halfDayAfterMinutes')}
                          className="input-aura"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shift Properties */}
                  <div className="border-b border-[var(--border-main)] pb-4">
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Shift Properties</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            {...form.register('isNightShift')}
                            className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                          />
                          <span className="ml-2 text-body-secondary">Night Shift</span>
                        </label>

                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            {...form.register('allowsOvertime')}
                            className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                          />
                          <span className="ml-2 text-body-secondary">Allows Overtime</span>
                        </label>

                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            {...form.register('isActive')}
                            className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                          />
                          <span className="ml-2 text-body-secondary">Active</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Overtime Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          {...form.register('overtimeMultiplier')}
                          className="input-aura"
                          disabled={!form.watch('allowsOvertime')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingShift(null);
                        resetForm();
                      }}
                      className="btn-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={form.formState.isSubmitting || createShiftMutation.isPending || updateShiftMutation.isPending}
                      className="btn-primary disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      {(form.formState.isSubmitting || createShiftMutation.isPending || updateShiftMutation.isPending) ? 'Saving...' : editingShift ? 'Update' : 'Create'} Shift
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
