'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  CreateCalendarEventRequest,
  EventType,
  EventVisibility,
} from '@/lib/types/calendar';
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

export default function NewEventPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const createEventMutation = useCreateCalendarEvent();

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const [formData, setFormData] = useState<CreateCalendarEventRequest>({
    title: '',
    startTime: now.toISOString().slice(0, 16),
    endTime: oneHourLater.toISOString().slice(0, 16),
    allDay: false,
    eventType: 'MEETING',
    visibility: 'PUBLIC',
    isRecurring: false,
  });

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const eventTypes: { value: EventType; label: string }[] = [
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

  const visibilities: { value: EventVisibility; label: string }[] = [
    { value: 'PUBLIC', label: 'Public' },
    { value: 'PRIVATE', label: 'Private' },
    { value: 'CONFIDENTIAL', label: 'Confidential' },
  ];

  const reminderOptions = [
    { value: 0, label: 'At time of event' },
    { value: 5, label: '5 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length < 2) {
      errors.title = 'Please enter a valid title';
    }

    if (!formData.startTime) {
      errors.startTime = 'Please select a start time';
    }

    if (!formData.endTime) {
      errors.endTime = 'Please select an end time';
    }

    if (formData.startTime && formData.endTime) {
      if (new Date(formData.endTime) <= new Date(formData.startTime)) {
        errors.endTime = 'End time must be after start time';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    createEventMutation.mutate(formData, {
      onSuccess: () => {
        router.push('/calendar');
      },
      onError: () => {
        setError('Failed to create event');
      },
    });
  };

  return (
    <AppLayout activeMenuItem="calendar">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              New Event
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Schedule a new calendar event
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter event title"
              className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border ${
                validationErrors.title
                  ? 'border-red-500'
                  : 'border-[var(--border-main)]'
              } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {validationErrors.title && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.title}</p>
            )}
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                className="w-5 h-5 rounded border-[var(--border-main)] text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                All Day Event
              </span>
            </label>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Start {formData.allDay ? 'Date' : 'Date & Time'} *
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type={formData.allDay ? 'date' : 'datetime-local'}
                  value={formData.allDay ? formData.startTime.slice(0, 10) : formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={`w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border ${
                    validationErrors.startTime
                      ? 'border-red-500'
                      : 'border-[var(--border-main)]'
                  } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
              {validationErrors.startTime && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.startTime}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                End {formData.allDay ? 'Date' : 'Date & Time'} *
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type={formData.allDay ? 'date' : 'datetime-local'}
                  value={formData.allDay ? formData.endTime.slice(0, 10) : formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={`w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border ${
                    validationErrors.endTime
                      ? 'border-red-500'
                      : 'border-[var(--border-main)]'
                  } rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
              {validationErrors.endTime && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.endTime}</p>
              )}
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Event Type
            </label>
            <select
              value={formData.eventType}
              onChange={(e) =>
                setFormData({ ...formData, eventType: e.target.value as EventType })
              }
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {eventTypes.map((type) => (
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
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                value={formData.meetingLink || ''}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Reminder
            </label>
            <div className="relative">
              <Bell className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <select
                value={formData.reminderMinutes ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminderMinutes: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No reminder</option>
                {reminderOptions.map((opt) => (
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
                value={formData.visibility}
                onChange={(e) =>
                  setFormData({ ...formData, visibility: e.target.value as EventVisibility })
                }
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {visibilities.map((vis) => (
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
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Private notes..."
              rows={2}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createEventMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 disabled:opacity-50"
          >
            {createEventMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
