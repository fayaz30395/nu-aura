'use client';

import {useEffect, useRef} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout/AppLayout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {EntryType} from '@/lib/types/hrms/time-tracking';
import {useSubmitTimeEntry, useTimeEntry, useUpdateTimeEntry,} from '@/lib/hooks/queries/useTimeTracking';
import {createLogger} from '@/lib/utils/logger';
import {AlertCircle, ArrowLeft, Calendar, Clock, DollarSign, FileText, Loader2,} from 'lucide-react';

const log = createLogger('EditTimeEntryPage');

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const timeEntrySchema = z.object({
  entryDate: z.string().min(1, 'Please select a date'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  hoursWorked: z
    .number({coerce: true, invalid_type_error: 'Please enter valid hours worked'})
    .positive('Please enter valid hours worked')
    .max(24, 'Hours worked cannot exceed 24 hours'),
  billableHours: z.number({coerce: true}).min(0).optional(),
  isBillable: z.boolean().default(true),
  hourlyRate: z.number({coerce: true}).min(0).optional(),
  entryType: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'WEEKEND']),
  clientName: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

// ─── Constants ─────────────────────────────────────────────────────────────────

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  {value: 'REGULAR', label: 'Regular'},
  {value: 'OVERTIME', label: 'Overtime'},
  {value: 'HOLIDAY', label: 'Holiday'},
  {value: 'WEEKEND', label: 'Weekend'},
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EditTimeEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(
    Permissions.TIMESHEET_CREATE,
    Permissions.TIME_TRACKING_CREATE,
    Permissions.TIME_TRACKING_MANAGE
  );

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const {data: entry, isLoading: isLoadingEntry} = useTimeEntry(entryId);
  const updateMutation = useUpdateTimeEntry();
  const submitMutation = useSubmitTimeEntry();
  const submitModeRef = useRef<'draft' | 'submit'>('draft');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: {errors, isSubmitting},
  } = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      entryDate: '',
      hoursWorked: 8,
      billableHours: 8,
      isBillable: true,
      entryType: 'REGULAR',
      description: '',
    },
  });

  // Populate form when entry loads
  useEffect(() => {
    if (entry) {
      reset({
        entryDate: entry.entryDate,
        startTime: entry.startTime ?? undefined,
        endTime: entry.endTime ?? undefined,
        hoursWorked: entry.hoursWorked,
        billableHours: entry.billableHours ?? undefined,
        isBillable: entry.isBillable ?? true,
        hourlyRate: entry.hourlyRate ?? undefined,
        entryType: (entry.entryType as EntryType) ?? 'REGULAR',
        clientName: entry.clientName ?? undefined,
        description: entry.description ?? '',
        notes: entry.notes ?? '',
      });
    }
  }, [entry, reset]);

  // Redirect if entry is not DRAFT
  useEffect(() => {
    if (entry && entry.status !== 'DRAFT') {
      router.replace(`/time-tracking/${entryId}`);
    }
  }, [entry, entryId, router]);

  const watchedHoursWorked = watch('hoursWorked');
  const watchedIsBillable = watch('isBillable');

  // Sync billableHours with hoursWorked when isBillable is on
  useEffect(() => {
    if (watchedIsBillable) {
      setValue('billableHours', watchedHoursWorked);
    }
  }, [watchedHoursWorked, watchedIsBillable, setValue]);

  if (!permissionsReady || !hasAccess) return null;

  if (isLoadingEntry) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className='h-8 w-8 animate-spin text-accent'/>
            <p className="text-[var(--text-secondary)]">Loading time entry...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!entry) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className='h-12 w-12 text-status-danger-text'/>
            <p className="text-[var(--text-secondary)]">Time entry not found</p>
            <button
              onClick={() => router.push('/time-tracking')}
              aria-label="Back to Time Tracking"
              className='px-4 py-2 bg-accent text-inverse rounded-xl hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              Back to Time Tracking
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const onSubmit = async (data: TimeEntryFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: entryId,
        data: {
          entryDate: data.entryDate,
          startTime: data.startTime || undefined,
          endTime: data.endTime || undefined,
          hoursWorked: data.hoursWorked,
          billableHours: data.billableHours,
          isBillable: data.isBillable,
          hourlyRate: data.hourlyRate,
          entryType: data.entryType as EntryType,
          clientName: data.clientName || undefined,
          description: data.description || undefined,
          notes: data.notes || undefined,
        },
      });

      if (submitModeRef.current === 'submit') {
        await submitMutation.mutateAsync(entryId);
      }

      router.push(`/time-tracking/${entryId}`);
    } catch (err) {
      log.error('Error updating time entry:', err);
    }
  };

  const isLoading = isSubmitting || updateMutation.isPending || submitMutation.isPending;

  return (
    <AppLayout activeMenuItem="time-tracking">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Edit Time Entry
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Update your work hours
            </p>
          </div>
        </div>

        {(updateMutation.isError || submitMutation.isError) && (
          <div
            className='p-4 bg-status-danger-bg border border-status-danger-border rounded-xl flex items-center gap-4'>
            <AlertCircle className='h-5 w-5 text-status-danger-text'/>
            <p className='text-sm text-status-danger-text'>Failed to update time entry. Please try
              again.</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 space-y-6"
        >
          {/* Entry Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
              <input
                type="date"
                {...register('entryDate')}
                className={`w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border ${
                  errors.entryDate ? 'border-danger-500' : 'border-[var(--border-main)]'
                } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500`}
              />
            </div>
            {errors.entryDate && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.entryDate.message}</p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
                <input
                  type="time"
                  {...register('startTime')}
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
                <input
                  type="time"
                  {...register('endTime')}
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
          </div>

          {/* Hours Worked */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Hours Worked *
            </label>
            <input
              type="number"
              step="0.5"
              {...register('hoursWorked', {valueAsNumber: true})}
              placeholder="8"
              className={`w-full px-4 py-4 bg-[var(--bg-secondary)] border ${
                errors.hoursWorked ? 'border-danger-500' : 'border-[var(--border-main)]'
              } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500`}
            />
            {errors.hoursWorked && (
              <p className='mt-1 text-sm text-status-danger-text'>{errors.hoursWorked.message}</p>
            )}
          </div>

          {/* Entry Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Entry Type
            </label>
            <select
              {...register('entryType')}
              className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {ENTRY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Billable */}
          <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
            <label className="flex items-center gap-4 cursor-pointer">
              <input
                type="checkbox"
                {...register('isBillable')}
                className='w-5 h-5 rounded border-[var(--border-main)] text-accent focus:ring-accent-500'
              />
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Billable Hours
              </span>
            </label>

            {watchedIsBillable && (
              <div className="flex-1 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[var(--text-muted)]"/>
                <input
                  type="number"
                  step="0.5"
                  {...register('billableHours', {valueAsNumber: true})}
                  placeholder="Billable hours"
                  className="flex-1 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            )}
          </div>

          {/* Hourly Rate */}
          {watchedIsBillable && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Hourly Rate (optional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
                <input
                  type="number"
                  step="0.01"
                  {...register('hourlyRate', {valueAsNumber: true})}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
          )}

          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Client / Project
            </label>
            <input
              type="text"
              {...register('clientName')}
              placeholder="Enter client or project name"
              className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)]"/>
              <textarea
                {...register('description')}
                placeholder="What did you work on?"
                rows={4}
                className="w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Notes
            </label>
            <textarea
              {...register('notes')}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-4 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              onClick={() => {
                submitModeRef.current = 'draft';
              }}
              className="flex-1 px-6 py-4 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              type="submit"
              disabled={isLoading}
              onClick={() => {
                submitModeRef.current = 'submit';
              }}
              className='flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-700 hover:to-accent-700 text-inverse rounded-xl font-medium shadow-[var(--shadow-dropdown)] shadow-accent-500/25 transition-all duration-200 disabled:opacity-50'
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin"/>
                  Saving...
                </>
              ) : (
                'Save & Submit for Approval'
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
