'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Holiday, HolidayRequest, HolidayType } from '@/lib/types/attendance';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { ConfirmDialog } from '@/components/ui';
import { useHolidaysByYear, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '@/lib/hooks/queries/useAttendance';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const holidayFormSchema = z.object({
  holidayName: z.string().min(1, 'Holiday name required'),
  holidayDate: z.string().min(1, 'Date required'),
  holidayType: z.enum(['NATIONAL', 'REGIONAL', 'OPTIONAL', 'RESTRICTED', 'FESTIVAL', 'COMPANY_EVENT']),
  description: z.string().optional().or(z.literal('')),
  isOptional: z.boolean().default(false),
  isRestricted: z.boolean().default(false),
  applicableLocations: z.string().optional().or(z.literal('')),
  applicableDepartments: z.string().optional().or(z.literal('')),
});

type HolidayFormData = z.infer<typeof holidayFormSchema>;

export default function HolidayCalendarManagementPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  // React Query hooks
  const { data: holidays = [], isLoading, error: queryError } = useHolidaysByYear(selectedYear);
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  const loading = isLoading;

  // Form hook
  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      holidayName: '',
      holidayDate: '',
      holidayType: 'NATIONAL',
      description: '',
      isOptional: false,
      isRestricted: false,
      applicableLocations: '',
      applicableDepartments: '',
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

  const handleSubmit = async (data: HolidayFormData) => {
    setUiError(null);

    const submitData: HolidayRequest = {
      holidayName: data.holidayName,
      holidayDate: data.holidayDate,
      holidayType: data.holidayType,
      description: data.description || undefined,
      isOptional: data.isOptional || false,
      isRestricted: data.isRestricted || false,
      applicableLocations: data.applicableLocations || undefined,
      applicableDepartments: data.applicableDepartments || undefined,
    };

    if (editingHoliday) {
      updateMutation.mutate(
        { id: editingHoliday.id, data: submitData },
        {
          onSuccess: () => {
            resetForm();
            setShowModal(false);
            setEditingHoliday(null);
          },
          onError: (err: unknown) => {
            setUiError(
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to update holiday'
            );
          },
        }
      );
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => {
          resetForm();
          setShowModal(false);
          setEditingHoliday(null);
        },
        onError: (err: unknown) => {
          setUiError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create holiday'
          );
        },
      });
    }
  };

  const resetForm = () => {
    form.reset({
      holidayName: '',
      holidayDate: '',
      holidayType: 'NATIONAL',
      description: '',
      isOptional: false,
      isRestricted: false,
      applicableLocations: '',
      applicableDepartments: '',
    });
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    form.reset({
      holidayName: holiday.holidayName,
      holidayDate: holiday.holidayDate,
      holidayType: holiday.holidayType,
      description: holiday.description || '',
      isOptional: holiday.isOptional,
      isRestricted: holiday.isRestricted,
      applicableLocations: holiday.applicableLocations || '',
      applicableDepartments: holiday.applicableDepartments || '',
    });
    setShowModal(true);
  };

  const handleDelete = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setShowDeleteConfirm(true);
  };

  const performDelete = () => {
    if (!holidayToDelete) return;

    setUiError(null);
    deleteMutation.mutate(holidayToDelete.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setHolidayToDelete(null);
      },
      onError: (err: unknown) => {
        setUiError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to delete holiday'
        );
      },
    });
  };

  const holidayTypes: HolidayType[] = ['NATIONAL', 'REGIONAL', 'OPTIONAL', 'RESTRICTED', 'FESTIVAL', 'COMPANY_EVENT'];

  const getHolidayTypeColor = (type: HolidayType) => {
    const colors: Record<HolidayType, string> = {
      NATIONAL: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      REGIONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      OPTIONAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      RESTRICTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
      FESTIVAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      COMPANY_EVENT: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[type];
  };

  const getMonthName = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'long' });
  };

  // Group holidays by month
  const holidaysByMonth = holidays.reduce((acc, holiday) => {
    const month = getMonthName(holiday.holidayDate);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  const months = Object.keys(holidaysByMonth).sort((a, b) => {
    const monthADate = holidaysByMonth[a]?.[0]?.holidayDate;
    const monthBDate = holidaysByMonth[b]?.[0]?.holidayDate;
    if (!monthADate || !monthBDate) return 0;
    return new Date(monthADate).getMonth() - new Date(monthBDate).getMonth();
  });

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Holiday Calendar Management</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage organizational holidays and events
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                resetForm();
                form.reset({ ...form.getValues(), holidayDate: `${selectedYear}-01-01` });
                setEditingHoliday(null);
                setShowModal(true);
              }}
              className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors"
            >
              + Add Holiday
            </button>
          </div>
        </div>

        {/* Error Message */}
        {(uiError || queryError) && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
            <span className="block sm:inline">{uiError || (queryError as Error)?.message || 'An error occurred'}</span>
            <button
              onClick={() => setUiError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="text-red-500 dark:text-red-400 text-xl">&times;</span>
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow">
            <div className="text-sm text-[var(--text-secondary)]">Total Holidays</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{holidays.length}</div>
          </div>
          <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow">
            <div className="text-sm text-[var(--text-secondary)]">National</div>
            <div className="text-2xl font-bold text-red-600">
              {holidays.filter((h) => h.holidayType === 'NATIONAL').length}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow">
            <div className="text-sm text-[var(--text-secondary)]">Optional</div>
            <div className="text-2xl font-bold text-yellow-600">
              {holidays.filter((h) => h.isOptional).length}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow">
            <div className="text-sm text-[var(--text-secondary)]">Restricted</div>
            <div className="text-2xl font-bold text-orange-600">
              {holidays.filter((h) => h.isRestricted).length}
            </div>
          </div>
        </div>

        {/* Holidays List */}
        <div className="bg-[var(--bg-card)] rounded-lg shadow dark:shadow-surface-950/50">
          {loading ? (
            <div className="px-6 py-12 text-center text-[var(--text-muted)]">
              Loading holidays for {selectedYear}...
            </div>
          ) : holidays.length === 0 ? (
            <div className="px-6 py-12 text-center text-[var(--text-muted)]">
              <div className="flex flex-col items-center">
                <svg className="h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[var(--text-secondary)]">No holidays configured for {selectedYear}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Click &quot;Add Holiday&quot; to create your first holiday</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {months.map((month) => (
                <div key={month} className="p-6">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{month}</h3>
                  <div className="space-y-4">
                    {(holidaysByMonth[month] ?? []).map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/50 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="text-center min-w-16">
                              <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {new Date(holiday.holidayDate).getDate()}
                              </div>
                              <div className="text-xs text-[var(--text-muted)] uppercase">
                                {new Date(holiday.holidayDate).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-[var(--text-primary)]">{holiday.holidayName}</div>
                              {holiday.description && (
                                <div className="text-sm text-[var(--text-secondary)] mt-1">{holiday.description}</div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${getHolidayTypeColor(holiday.holidayType)}`}>
                                  {holiday.holidayType.replace('_', ' ')}
                                </span>
                                {holiday.isOptional && (
                                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 font-semibold rounded">
                                    Optional
                                  </span>
                                )}
                                {holiday.isRestricted && (
                                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 font-semibold rounded">
                                    Restricted
                                  </span>
                                )}
                                {holiday.applicableLocations && (
                                  <span className="px-2 py-1 text-xs bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded">
                                    {holiday.applicableLocations}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(holiday)}
                            className="text-primary-600 hover:text-blue-900 px-3 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(holiday)}
                            className="text-red-600 hover:text-red-900 px-3 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setHolidayToDelete(null);
          }}
          onConfirm={performDelete}
          title="Delete Holiday"
          message={`Are you sure you want to delete "${holidayToDelete?.holidayName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Add/Edit Holiday Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] dark:bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingHoliday(null);
                      resetForm();
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Holiday Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Holiday Name *
                        </label>
                        <input
                          type="text"
                          {...form.register('holidayName')}
                          className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="New Year's Day, Independence Day"
                        />
                        {form.formState.errors.holidayName && (
                          <p className="mt-1 text-xs text-red-500">{form.formState.errors.holidayName.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Date *
                          </label>
                          <input
                            type="date"
                            {...form.register('holidayDate')}
                            className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          {form.formState.errors.holidayDate && (
                            <p className="mt-1 text-xs text-red-500">{form.formState.errors.holidayDate.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Holiday Type *
                          </label>
                          <select
                            {...form.register('holidayType')}
                            className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {holidayTypes.map((type) => (
                              <option key={type} value={type}>
                                {type.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Description
                        </label>
                        <textarea
                          {...form.register('description')}
                          rows={2}
                          className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Brief description of the holiday..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Settings</h3>
                    <div className="space-y-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('isOptional')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                        />
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">Optional Holiday</span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">(Employees can choose to work)</span>
                      </label>

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...form.register('isRestricted')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-[var(--border-main)] dark:border-[var(--border-main)] rounded"
                        />
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">Restricted Holiday</span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">(Limited to certain employees)</span>
                      </label>
                    </div>
                  </div>

                  {/* Applicability */}
                  <div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Applicability (Optional)</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Applicable Locations
                        </label>
                        <input
                          type="text"
                          {...form.register('applicableLocations')}
                          className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., New York, California (comma-separated)"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty for all locations</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                          Applicable Departments
                        </label>
                        <input
                          type="text"
                          {...form.register('applicableDepartments')}
                          className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., Engineering, Sales (comma-separated)"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty for all departments</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingHoliday(null);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending}
                      className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
                    >
                      {form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingHoliday ? 'Update' : 'Create')} Holiday
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
