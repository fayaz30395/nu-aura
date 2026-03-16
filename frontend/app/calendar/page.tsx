'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { calendarService } from '@/lib/services/calendar.service';
import { EventStatus, CalendarEvent } from '@/lib/types/calendar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyCalendarEventsByDateRange } from '@/lib/hooks/queries/useCalendar';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Users,
  Video,
  MapPin,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');

  // Calculate date range
  const dateRange =
    view === 'week'
      ? calendarService.getWeekRange(currentDate)
      : calendarService.getMonthRange(currentDate);

  // React Query hook
  const { data: events = [], isLoading, error } = useMyCalendarEventsByDateRange(
    dateRange.start,
    dateRange.end
  );

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

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
        bg: 'bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)]',
        text: 'text-gray-700 dark:text-[var(--text-muted)]',
        icon: CheckCircle,
      },
    };
    return configs[status] || configs.SCHEDULED;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeLabel = () => {
    if (view === 'week') {
      const { start, end } = calendarService.getWeekRange(currentDate);
      return `${calendarService.formatDate(start)} - ${calendarService.formatDate(end)}`;
    }
    return currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const groupEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const date = new Date(event.startTime).toDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(event);
    });
    return grouped;
  };

  if (isLoading && events.length === 0) {
    return (
      <AppLayout activeMenuItem="calendar">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-[var(--text-secondary)]">Loading calendar...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeMenuItem="calendar">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-[var(--text-secondary)]">
              {error instanceof Error ? error.message : 'Failed to load calendar events'}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const groupedEvents = groupEventsByDate();
  const todayEvents = events.filter(
    (e) => new Date(e.startTime).toDateString() === new Date().toDateString()
  );
  const _upcomingEvents = events
    .filter((e) => new Date(e.startTime) > new Date())
    .slice(0, 5);

  return (
    <AppLayout activeMenuItem="calendar">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Calendar
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage your events and schedule
            </p>
          </div>
          <button
            onClick={() => router.push('/calendar/new')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30"
          >
            <Plus className="h-5 w-5" />
            New Event
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              Today
            </button>
            <span className="ml-2 text-lg font-semibold text-[var(--text-primary)]">
              {getDateRangeLabel()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={isLoading}
              className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 text-[var(--text-secondary)] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1">
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === 'week'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === 'month'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <CalendarDays className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Today&apos;s Events</h2>
              <span className="ml-auto px-2.5 py-0.5 bg-white/20 rounded-full text-sm">
                {todayEvents.length} events
              </span>
            </div>
            <div className="space-y-4">
              {todayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  onClick={() => router.push(`/calendar/${event.id}`)}
                  className="flex items-center gap-4 p-4 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <div className="text-center min-w-[50px]">
                    <p className="text-sm opacity-80">
                      {calendarService.formatTime(event.startTime)}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.title}</p>
                    {event.location && (
                      <p className="text-sm opacity-80 flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-60" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-main)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {view === 'week' ? 'This Week' : 'This Month'}
            </h2>
            <span className="text-sm text-[var(--text-muted)]">
              {events.length} events
            </span>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-4" />
              <p className="text-[var(--text-muted)]">No events scheduled</p>
              <button
                onClick={() => router.push('/calendar/new')}
                className="mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
              >
                Create your first event
              </button>
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                <div key={date}>
                  <div className="px-5 py-3 bg-[var(--bg-secondary)]/50">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                      {new Date(date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  {dateEvents.map((event) => {
                    const statusConfig = getStatusConfig(event.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={event.id}
                        onClick={() => router.push(`/calendar/${event.id}`)}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors cursor-pointer"
                      >
                        <div
                          className={`w-1 h-12 rounded-full ${calendarService.getEventColor(
                            event.eventType
                          )}`}
                        />
                        <div className="min-w-[80px] text-center">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {event.allDay
                              ? 'All Day'
                              : calendarService.formatTime(event.startTime)}
                          </p>
                          {!event.allDay && (
                            <p className="text-xs text-[var(--text-muted)]">
                              {calendarService.formatTime(event.endTime)}
                            </p>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[var(--text-primary)]">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-[var(--text-muted)]">
                              {calendarService.getEventTypeLabel(event.eventType)}
                            </span>
                            {event.location && (
                              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                            {event.meetingLink && (
                              <span className="text-xs text-primary-500 flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Online
                              </span>
                            )}
                            {event.attendeeIds && event.attendeeIds.length > 0 && (
                              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.attendeeIds.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {event.status}
                        </span>
                        <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/calendar/new')}
            className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Schedule Event
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Create a new calendar event
            </p>
          </button>

          <button
            onClick={() => router.push('/calendar?filter=meetings')}
            className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform">
                <Video className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              My Meetings
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              View all your meetings
            </p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
