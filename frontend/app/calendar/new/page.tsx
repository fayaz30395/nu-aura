'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { EventType, EventVisibility } from '@/lib/types/calendar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateCalendarEvent } from '@/lib/hooks/queries/useCalendar';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Bell,
  Globe,
} from 'lucide-react';

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const calendarEventSchema = z
  .object({
    title: z
      .string()
      .min(2, 'Please enter a valid title (at least 2 characters)'),
    startTime: z.string().min(1, 'Please select a start time'),
    endTime: z.string().min(1, 'Please select an end time'),
    allDay: z.boolean().default(false),
    eventType: z.enum([
      'MEETING', 'APPOINTMENT', 'TASK', 'REMINDER',
      'OUT_OF_OFFICE', 'TRAINING', 'INTERVIEW', 'REVIEW', 'OTHER',
    ]),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'CONFIDENTIAL']),
    location: z.string().optional(),
    meetingLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
    reminderMinutes: z.number({ coerce: true }).min(0).optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    isRecurring: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime) {
      if (new Date(data.endTime) <= new Date(data.startTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time',
          path: ['endTime'],
        });
      }
    }
  });

type CalendarEventFormData = z.infer<typeof calendarEventSchema>;

// ─── Constants ─────────────────────────────────────────────────────────────────

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'MEETING', label: 'Meeting' },
  { value: 'APPOINTMENT', label: 'Appointment' },
  { value: 'TASK', label: 'Task' },
  { value: 'REMINDER', label: 'Reminder' },
  { value: 'OUT_OF_OFFICE', label: 'Out of Office' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'OTHER', label: 'Other' },
];

const VISIBILITIES: { value: EventVisibility; label: string }[] = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NewEventPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const createEventMutation = useCreateCalendarEvent();

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CalendarEventFormData>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: {
      title: '',
      startTime: now.toISOString().slice(0, 16),
      endTime: oneHourLater.toISOString().slice(0, 16),
      allDay: false,
      eventType: 'MEETING',
      visibility: 'PUBLIC',
      isRecurring: false,
    },
  });

  const watchedAllDay = watch('allDay');

  // Normalize datetime values when allDay changes
  useEffect(() => {
    const startTime = getValues('startTime');
    const endTime = getValues('endTime');
    if (watchedAllDay) {
      setValue('startTime', startTime.slice(0, 10));
      setValue('endTime', endTime.slice(0, 10));
    } else {
      if (startTime.length === 10) setValue('startTime', startTime + 'T09:00');
      if (endTime.length === 10) setValue('endTime', endTime + 'T10:00');
    }
  }, [watchedAllDay, setValue, getValues]);

  if (!hasHydrated) return null;

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const onSubmit = (data: CalendarEventFormData) => {
    createEventMutation.mutate(
      {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay,
        eventType: data.eventType as EventType,
        visibility: data.visibility as EventVisibility,
        location: data.location || undefined,
        meetingLink: data.meetingLink || undefined,
        reminderMinutes: data.reminderMinutes,
        description: data.description || undefined,
        notes: data.notes || undefined,
        isRecurring: data.isRecurring,
      },
      {
        onSuccess: () => router.push('/calendar'),
      }
    );
  };

  const isLoading = isSubmitting || createEventMutation.isPending;

  return (
    <AppLayout activeMenuItem="calendar">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">New Event</h1>
            <p className="text-[var(--text-muted)] mt-1">Schedule a new calendar event</p>
          </div>
        </div>

        {createEventMutation.isError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">Failed to create event. Please try again.</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 space-y-6"
        >
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Event Title *
            </label>
            <input
              type="text"
              {...register('title')}
              placeholder="Enter event title"
              className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border ${
                errors.title ? 'border-red-500' : 'border-[var(--border-main)]'
              } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-4 cursor-pointer">
              <input
                type="checkbox"
                {...register('allDay')}
                className="w-5 h-5 rounded border-[var(--border-main)] text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-[var(--text-secondary)]">All Day Event</span>
            </label>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Start {watchedAllDay ? 'Date' : 'Date & Time'} *
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type={watchedAllDay ? 'date' : 'datetime-local'}
                  {...register('startTime')}
                  className={`w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border ${
                    errors.startTime ? 'border-red-500' : 'border-[var(--border-main)]'
                  } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-500">{errors.startTime.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                End {watchedAllDay ? 'Date' : 'Date & Time'} *
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type={watchedAllDay ? 'date' : 'datetime-local'}
                  {...register('endTime')}
                  className={`w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border ${
                    errors.endTime ? 'border-red-500' : 'border-[var(--border-main)]'
                  } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-500">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Event Type
            </label>
            <select
              {...register('eventType')}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <input
                type="text"
                {...register('location')}
                placeholder="Add location"
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Meeting Link */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Meeting Link
            </label>
            <div className="relative">
              <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <input
                type="url"
                {...register('meetingLink')}
                placeholder="https://meet.google.com/..."
                className={`w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border ${
                  errors.meetingLink ? 'border-red-500' : 'border-[var(--border-main)]'
                } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>
            {errors.meetingLink && (
              <p className="mt-1 text-sm text-red-500">{errors.meetingLink.message}</p>
            )}
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Reminder
            </label>
            <div className="relative">
              <Bell className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <select
                {...register('reminderMinutes', { valueAsNumber: true })}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No reminder</option>
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Visibility
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <select
                {...register('visibility')}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {VISIBILITIES.map((vis) => (
                  <option key={vis.value} value={vis.value}>
                    {vis.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)]" />
              <textarea
                {...register('description')}
                placeholder="Add event description..."
                rows={4}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
              placeholder="Private notes..."
              rows={2}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Cancel
            </button>
            <PermissionGate permission={Permissions.CALENDAR_CREATE}>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 disabled:opacity-50"
              >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
              </button>
            </PermissionGate>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
