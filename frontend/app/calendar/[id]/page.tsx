'use client';

import {useEffect, useState} from 'react';
import {notFound, useParams, useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EVENT_STATUS} from '@/lib/status/vocabulary';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {calendarService} from '@/lib/services/hrms/calendar.service';
import {useAuth} from '@/lib/hooks/useAuth';
import {useCalendarEvent, useDeleteCalendarEvent, useSyncEventToGoogle,} from '@/lib/hooks/queries/useCalendar';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  Trash2,
  Users,
  Video,
} from 'lucide-react';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const {isAuthenticated, hasHydrated} = useAuth();
  const eventId = params.id as string;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // React Query hooks
  const {data: event, isLoading, error} = useCalendarEvent(eventId);
  const deleteEventMutation = useDeleteCalendarEvent();
  const syncToGoogleMutation = useSyncEventToGoogle();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSyncToGoogle = () => {
    if (!event) return;
    syncToGoogleMutation.mutate(event.id);
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!event) return;

    deleteEventMutation.mutate(event.id, {
      onSuccess: () => {
        router.push('/calendar');
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="calendar">
        <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2
              className="h-8 w-8 animate-spin text-accent-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
            <p className="text-[var(--text-secondary)]">Loading event...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && !error && !event) {
    notFound();
  }

  if (error || !event) {
    return (
      <AppLayout activeMenuItem="calendar">
        <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle
              className="h-12 w-12 text-danger-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
            <p className="text-[var(--text-secondary)]">
              {error instanceof Error ? error.message : 'Event not found'}
            </p>
            <button
              onClick={() => router.push('/calendar')}
              className="px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-700 transition-colors"
            >
              Back to Calendar
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="calendar">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${calendarService.getEventColor(
                  event.eventType
                )}`}
              />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {event.title}
              </h1>
              <StatusBadge status={event.status} domain={EVENT_STATUS}/>
            </div>
            <p className="text-[var(--text-muted)] mt-1">
              {calendarService.getEventTypeLabel(event.eventType)}
            </p>
          </div>
        </div>

        {/* Time Card */}
        <div className="bg-accent-100 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-800 rounded-lg p-6 text-accent-900 dark:text-accent-100">
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="h-6 w-6"/>
            <h2 className="text-xl font-semibold">Event Time</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-80 mb-1">Start</p>
              <p className="text-xl font-medium">
                {event.allDay
                  ? calendarService.formatDate(event.startTime)
                  : calendarService.formatDateTime(event.startTime)}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">End</p>
              <p className="text-xl font-medium">
                {event.allDay
                  ? calendarService.formatDate(event.endTime)
                  : calendarService.formatDateTime(event.endTime)}
              </p>
            </div>
          </div>
          {event.allDay && (
            <p className="mt-4 text-sm opacity-80">All day event</p>
          )}
        </div>

        {/* Details */}
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 space-y-6">
          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                <MapPin className="h-5 w-5 text-[var(--text-secondary)]"/>
              </div>
              <div>
                <p className="text-body-muted">Location</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {event.location}
                </p>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.meetingLink && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                <Video className="h-5 w-5 text-[var(--text-secondary)]"/>
              </div>
              <div>
                <p className="text-body-muted">Meeting Link</p>
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-700 dark:text-accent-400 font-medium hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Join Meeting
                  <ExternalLink className="h-4 w-4"/>
                </a>
              </div>
            </div>
          )}

          {/* Organizer */}
          {event.organizerName && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                <Users className="h-5 w-5 text-[var(--text-secondary)]"/>
              </div>
              <div>
                <p className="text-body-muted">Organizer</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {event.organizerName}
                </p>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendeeNames && event.attendeeNames.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                <Users className="h-5 w-5 text-[var(--text-secondary)]"/>
              </div>
              <div>
                <p className="text-body-muted">Attendees</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {event.attendeeNames.map((name, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-[var(--bg-secondary)] rounded-lg text-body-secondary"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reminder */}
          {event.reminderMinutes !== undefined && event.reminderMinutes !== null && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                <Bell className="h-5 w-5 text-[var(--text-secondary)]"/>
              </div>
              <div>
                <p className="text-body-muted">Reminder</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {event.reminderMinutes === 0
                    ? 'At time of event'
                    : event.reminderMinutes < 60
                      ? `${event.reminderMinutes} minutes before`
                      : event.reminderMinutes === 60
                        ? '1 hour before'
                        : `${event.reminderMinutes / 60} hours before`}
                </p>
              </div>
            </div>
          )}

          {/* Visibility */}
          {event.visibility && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                <Globe className="h-5 w-5 text-[var(--text-secondary)]"/>
              </div>
              <div>
                <p className="text-body-muted">Visibility</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {event.visibility}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Description
            </h3>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Notes
            </h3>
            <p className="text-[var(--text-secondary)]">{event.notes}</p>
          </div>
        )}

        {/* Sync Status */}
        {event.syncProvider && event.syncProvider !== 'NONE' && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <div className="row-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                  Calendar Sync
                </h3>
                <p className="text-body-muted mt-1">
                  {event.syncProvider} Calendar •{' '}
                  {event.syncStatus === 'SYNCED'
                    ? `Last synced ${calendarService.formatDateTime(event.lastSyncedAt!)}`
                    : event.syncStatus}
                </p>
              </div>
              <span
                className={`px-4 py-1 rounded-lg text-sm font-medium ${
                  event.syncStatus === 'SYNCED'
                    ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
                    : event.syncStatus === 'SYNC_ERROR'
                      ? 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300'
                      : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300'
                }`}
              >
                {event.syncStatus}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/calendar')}
            className="px-6 py-4 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Back to Calendar
          </button>

          {event.status !== 'CANCELLED' && (
            <>
              <PermissionGate permission={Permissions.CALENDAR_MANAGE}>
                <button
                  onClick={handleSyncToGoogle}
                  disabled={syncToGoogleMutation.isPending}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 rounded-xl font-medium hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  {syncToGoogleMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin"/>
                  ) : (
                    <RefreshCw className="h-5 w-5"/>
                  )}
                  Sync to Google
                </button>
              </PermissionGate>

              <PermissionGate permission={Permissions.CALENDAR_DELETE}>
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 rounded-xl font-medium hover:bg-danger-200 dark:hover:bg-danger-900/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <Trash2 className="h-5 w-5"/>
                  Delete
                </button>
              </PermissionGate>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteEventMutation.isPending}
      />
    </AppLayout>
  );
}
