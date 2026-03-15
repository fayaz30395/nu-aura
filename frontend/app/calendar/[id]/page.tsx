'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { calendarService } from '@/lib/services/calendar.service';
import { EventStatus } from '@/lib/types/calendar';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useCalendarEvent,
  useDeleteCalendarEvent,
  useSyncEventToGoogle,
} from '@/lib/hooks/queries/useCalendar';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Video,
  Users,
  Bell,
  Globe,
  RefreshCw,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, hasHydrated } = useAuth();
  const eventId = params.id as string;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // React Query hooks
  const { data: event, isLoading, error } = useCalendarEvent(eventId);
  const deleteEventMutation = useDeleteCalendarEvent();
  const syncToGoogleMutation = useSyncEventToGoogle();

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    router.push('/login');
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

  const getStatusConfig = (status: EventStatus) => {
    const configs: Record<EventStatus, { bg: string; text: string; icon: typeof Clock }> = {
      SCHEDULED: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: Clock,
      },
      CONFIRMED: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: CheckCircle,
      },
      TENTATIVE: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: AlertCircle,
      },
      CANCELLED: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: XCircle,
      },
      COMPLETED: {
        bg: 'bg-gray-100 dark:bg-surface-800',
        text: 'text-gray-700 dark:text-gray-400',
        icon: CheckCircle,
      },
    };
    return configs[status] || configs.SCHEDULED;
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="calendar">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-surface-600 dark:text-surface-400">Loading event...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !event) {
    return (
      <AppLayout activeMenuItem="calendar">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-surface-600 dark:text-surface-400">
              {error instanceof Error ? error.message : 'Event not found'}
            </p>
            <button
              onClick={() => router.push('/calendar')}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Back to Calendar
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = getStatusConfig(event.status);
  const StatusIcon = statusConfig.icon;

  return (
    <AppLayout activeMenuItem="calendar">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${calendarService.getEventColor(
                  event.eventType
                )}`}
              />
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                {event.title}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className="h-4 w-4" />
                {event.status}
              </span>
            </div>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              {calendarService.getEventTypeLabel(event.eventType)}
            </p>
          </div>
        </div>

        {/* Time Card */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Event Time</h2>
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
            <p className="mt-3 text-sm opacity-80">All day event</p>
          )}
        </div>

        {/* Details */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-6">
          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                <MapPin className="h-5 w-5 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">Location</p>
                <p className="text-surface-900 dark:text-surface-100 font-medium">
                  {event.location}
                </p>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.meetingLink && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Video className="h-5 w-5 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">Meeting Link</p>
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1"
                >
                  Join Meeting
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Organizer */}
          {event.organizerName && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Users className="h-5 w-5 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">Organizer</p>
                <p className="text-surface-900 dark:text-surface-100 font-medium">
                  {event.organizerName}
                </p>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendeeNames && event.attendeeNames.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Users className="h-5 w-5 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">Attendees</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {event.attendeeNames.map((name, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm text-surface-700 dark:text-surface-300"
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
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Bell className="h-5 w-5 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">Reminder</p>
                <p className="text-surface-900 dark:text-surface-100 font-medium">
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
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Globe className="h-5 w-5 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400">Visibility</p>
                <p className="text-surface-900 dark:text-surface-100 font-medium">
                  {event.visibility}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-3">
              Description
            </h3>
            <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-3">
              Notes
            </h3>
            <p className="text-surface-600 dark:text-surface-400">{event.notes}</p>
          </div>
        )}

        {/* Sync Status */}
        {event.syncProvider && event.syncProvider !== 'NONE' && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                  Calendar Sync
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  {event.syncProvider} Calendar •{' '}
                  {event.syncStatus === 'SYNCED'
                    ? `Last synced ${calendarService.formatDateTime(event.lastSyncedAt!)}`
                    : event.syncStatus}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  event.syncStatus === 'SYNCED'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : event.syncStatus === 'SYNC_ERROR'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                }`}
              >
                {event.syncStatus}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/calendar')}
            className="px-6 py-3 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-xl font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            Back to Calendar
          </button>

          {event.status !== 'CANCELLED' && (
            <>
              <button
                onClick={handleSyncToGoogle}
                disabled={syncToGoogleMutation.isPending}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
              >
                {syncToGoogleMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
                Sync to Google
              </button>

              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
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
