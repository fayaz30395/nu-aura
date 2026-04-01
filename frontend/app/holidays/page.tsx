'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Holiday, HolidayRequest, HolidayType } from '@/lib/types/hrms/attendance';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { ConfirmDialog } from '@/components/ui';
import {
  useHolidaysByYear,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from '@/lib/hooks/queries/useAttendance';

const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

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

const HOLIDAY_TYPE_COLORS: Record<HolidayType, string> = {
  NATIONAL: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-300',
  REGIONAL: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300',
  OPTIONAL: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
  RESTRICTED: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
  FESTIVAL: 'bg-accent-300 text-accent-900 dark:bg-accent-900/30 dark:text-accent-500',
  COMPANY_EVENT: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
};

const HOLIDAY_TYPES: HolidayType[] = ['NATIONAL', 'REGIONAL', 'OPTIONAL', 'RESTRICTED', 'FESTIVAL', 'COMPANY_EVENT'];

export default function HolidaysPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const currentYear = new Date().getFullYear();

  const isAdmin = isReady && hasAnyRole(...ADMIN_ROLES);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [filterType, setFilterType] = useState<HolidayType | 'ALL'>('ALL');

  // React Query hooks
  const { data: holidays = [], isLoading, error: queryError } = useHolidaysByYear(selectedYear);
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  // Form
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

  // Auth guard — redirect unauthenticated users
  if (hasHydrated && isReady && !isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  // Filter holidays
  const filteredHolidays = filterType === 'ALL'
    ? holidays
    : holidays.filter((h) => h.holidayType === filterType);

  // Group by month
  const holidaysByMonth = filteredHolidays.reduce((acc, holiday) => {
    const month = new Date(holiday.holidayDate).toLocaleDateString('en-US', { month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  const months = Object.keys(holidaysByMonth).sort((a, b) => {
    const dateA = holidaysByMonth[a]?.[0]?.holidayDate;
    const dateB = holidaysByMonth[b]?.[0]?.holidayDate;
    if (!dateA || !dateB) return 0;
    return new Date(dateA).getMonth() - new Date(dateB).getMonth();
  });

  // Upcoming holidays (next 30 days)
  const today = new Date();
  const upcomingHolidays = holidays
    .filter((h) => {
      const hDate = new Date(h.holidayDate);
      const diffDays = Math.ceil((hDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    })
    .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime());

  // Form handlers (admin only)
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

  const handleSubmit = (data: HolidayFormData) => {
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

    const callbacks = {
      onSuccess: () => {
        resetForm();
        setShowModal(false);
        setEditingHoliday(null);
      },
      onError: (err: unknown) => {
        setUiError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save holiday'
        );
      },
    };

    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: submitData }, callbacks);
    } else {
      createMutation.mutate(submitData, callbacks);
    }
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

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  const isPast = (dateStr: string) => new Date(dateStr) < today;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-page-title text-[var(--text-primary)] skeuo-emboss">Holiday Calendar</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)] skeuo-deboss">
            {selectedYear} organizational holidays and events
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-2 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[4rem] text-center">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-2 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Admin: Add Holiday */}
          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                form.reset({ ...form.getValues(), holidayDate: `${selectedYear}-01-01` });
                setEditingHoliday(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-accent-500 text-white px-4 py-2 rounded-lg hover:bg-accent-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {(uiError || queryError) && (
        <div className="mb-4 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 px-4 py-4 rounded-lg relative">
          <span className="block sm:inline text-sm">
            {uiError || (queryError instanceof Error ? queryError.message : 'An error occurred')}
          </span>
          <button
            onClick={() => setUiError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-4 text-danger-500 dark:text-danger-400"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-aura p-4">
          <div className="text-caption text-[var(--text-secondary)]">Total Holidays</div>
          <div className="text-stat-medium text-[var(--text-primary)]">{holidays.length}</div>
        </div>
        <div className="card-aura p-4">
          <div className="text-caption text-[var(--text-secondary)]">National</div>
          <div className="text-stat-medium text-danger-600 dark:text-danger-400">
            {holidays.filter((h) => h.holidayType === 'NATIONAL').length}
          </div>
        </div>
        <div className="card-aura p-4">
          <div className="text-caption text-[var(--text-secondary)]">Optional</div>
          <div className="text-stat-medium text-warning-600 dark:text-warning-400">
            {holidays.filter((h) => h.isOptional).length}
          </div>
        </div>
        <div className="card-aura p-4">
          <div className="text-caption text-[var(--text-secondary)]">Upcoming (30d)</div>
          <div className="text-stat-medium text-accent-700 dark:text-accent-400">
            {upcomingHolidays.length}
          </div>
        </div>
      </div>

      {/* Upcoming Holidays Banner */}
      {upcomingHolidays.length > 0 && (
        <div className="card-aura p-4 mb-6 border-l-4 border-l-accent-500">
          <h3 className="text-card-title text-[var(--text-primary)] mb-2">Coming Up</h3>
          <div className="flex flex-wrap gap-4">
            {upcomingHolidays.slice(0, 3).map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent-500" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{h.holidayName}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(h.holidayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-xs font-medium text-accent-700 dark:text-accent-400">
                  {getDaysUntil(h.holidayDate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter by Type */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filterType === 'ALL'
              ? 'bg-accent-500 text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          All ({holidays.length})
        </button>
        {HOLIDAY_TYPES.map((type) => {
          const count = holidays.filter((h) => h.holidayType === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterType === type
                  ? 'bg-accent-500 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              {type.replace('_', ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Holidays List */}
      <div className="card-aura">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-[var(--text-muted)]">
            Loading holidays for {selectedYear}...
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarDays className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">
              {holidays.length === 0
                ? `No holidays configured for ${selectedYear}`
                : 'No holidays match the selected filter'}
            </p>
            {isAdmin && holidays.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Click &quot;Add Holiday&quot; to create your first holiday
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {months.map((month) => (
              <div key={month} className="p-6">
                <h3 className="text-section-title text-[var(--text-primary)] mb-4">{month}</h3>
                <div className="space-y-2">
                  {(holidaysByMonth[month] ?? []).map((holiday) => (
                    <div
                      key={holiday.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                        isPast(holiday.holidayDate)
                          ? 'bg-[var(--bg-secondary)]/30 opacity-60'
                          : 'bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Date box */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)]">
                          <div className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                            {new Date(holiday.holidayDate).getDate()}
                          </div>
                          <div className="text-2xs text-[var(--text-muted)] uppercase font-medium">
                            {new Date(holiday.holidayDate).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--text-primary)] truncate">
                            {holiday.holidayName}
                          </div>
                          {holiday.description && (
                            <div className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">
                              {holiday.description}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${HOLIDAY_TYPE_COLORS[holiday.holidayType]}`}>
                              {holiday.holidayType.replace('_', ' ')}
                            </span>
                            {holiday.isOptional && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
                                Optional
                              </span>
                            )}
                            {holiday.isRestricted && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
                                Restricted
                              </span>
                            )}
                            {holiday.applicableLocations && (
                              <span className="px-2 py-0.5 text-xs rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                {holiday.applicableLocations}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => handleEdit(holiday)}
                            className="p-2 rounded-md text-[var(--text-muted)] hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors"
                            title="Edit holiday"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(holiday)}
                            className="p-2 rounded-md text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                            title="Delete holiday"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
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

      {/* Add/Edit Holiday Modal (Admin only) */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingHoliday(null);
                    resetForm();
                  }}
                  className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>

              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Holiday Name *
                    </label>
                    <input
                      type="text"
                      {...form.register('holidayName')}
                      className="input-aura w-full"
                      placeholder="e.g. New Year's Day, Independence Day"
                    />
                    {form.formState.errors.holidayName && (
                      <p className="mt-1 text-xs text-danger-500">{form.formState.errors.holidayName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        {...form.register('holidayDate')}
                        className="input-aura w-full"
                      />
                      {form.formState.errors.holidayDate && (
                        <p className="mt-1 text-xs text-danger-500">{form.formState.errors.holidayDate.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Holiday Type *
                      </label>
                      <select {...form.register('holidayType')} className="input-aura w-full">
                        {HOLIDAY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Description
                    </label>
                    <textarea
                      {...form.register('description')}
                      rows={2}
                      className="input-aura w-full"
                      placeholder="Brief description of the holiday..."
                    />
                  </div>
                </div>

                {/* Settings */}
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Settings</h3>
                  <div className="space-y-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...form.register('isOptional')}
                        className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] rounded"
                      />
                      <span className="ml-2 text-sm text-[var(--text-secondary)]">Optional Holiday</span>
                      <span className="ml-2 text-xs text-[var(--text-muted)]">(Employees can choose to work)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...form.register('isRestricted')}
                        className="h-4 w-4 text-accent-700 focus:ring-accent-500 border-[var(--border-main)] rounded"
                      />
                      <span className="ml-2 text-sm text-[var(--text-secondary)]">Restricted Holiday</span>
                      <span className="ml-2 text-xs text-[var(--text-muted)]">(Limited to certain employees)</span>
                    </label>
                  </div>
                </div>

                {/* Applicability */}
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Applicability (Optional)</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Applicable Locations
                      </label>
                      <input
                        type="text"
                        {...form.register('applicableLocations')}
                        className="input-aura w-full"
                        placeholder="e.g., New York, California (comma-separated)"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty for all locations</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Applicable Departments
                      </label>
                      <input
                        type="text"
                        {...form.register('applicableDepartments')}
                        className="input-aura w-full"
                        placeholder="e.g., Engineering, Sales (comma-separated)"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty for all departments</p>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingHoliday(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingHoliday
                        ? 'Update Holiday'
                        : 'Create Holiday'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
