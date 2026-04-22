'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useRouter} from 'next/navigation';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {useGoogleLogin} from '@react-oauth/google';
import {clearGoogleToken, getGoogleToken, GOOGLE_SSO_SCOPES, saveGoogleToken} from '@/lib/utils/googleToken';
import {createLogger} from '@/lib/utils/logger';
import {safeWindowOpen} from '@/lib/utils/url';

const log = createLogger('NuCalendarPage');

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  hangoutLink?: string;
  htmlLink?: string;
  colorId?: string;
  creator?: { email: string; displayName?: string };
  organizer?: { email: string; displayName?: string };
  status?: string;
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string; label?: string }[];
    conferenceSolution?: { name: string; iconUri?: string };
    conferenceId?: string;
    createRequest?: {
      requestId: string;
      conferenceSolutionKey?: { type: string };
    };
  };
}

interface CalendarList {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
}

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

function CalendarContent() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [, setCalendars] = useState<CalendarList[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Create event form state
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    attendees: '',
    addMeet: false,
  });
  const [creating, setCreating] = useState(false);

  const saveToken = (token: string, expiresIn: number = 3600) => {
    saveGoogleToken(token, expiresIn);
    setAccessToken(token);
  };

  const clearToken = () => {
    clearGoogleToken();
    setAccessToken(null);
    setEvents([]);
    setCalendars([]);
  };

  const getStoredToken = (): string | null => {
    return getGoogleToken();
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      saveToken(tokenResponse.access_token, tokenResponse.expires_in);
      setError(null);
      await loadCalendars(tokenResponse.access_token);
      await loadEvents(tokenResponse.access_token);
    },
    onError: (errorResponse) => {
      log.error('Google login error:', errorResponse);
      setError('Failed to connect to Google Calendar. Please try again.');
    },
    scope: GOOGLE_SSO_SCOPES,
  });

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const storedToken = getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken);
      loadCalendars(storedToken);
      loadEvents(storedToken);
    } else {
      setIsLoading(false);
    }
    // loadCalendars and loadEvents are intentionally omitted: they take a token
    // parameter (not React state), and including them without useCallback would
    // cause an infinite re-render loop on every token/state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated, router]);

  const loadCalendars = async (token: string) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {headers: {Authorization: `Bearer ${token}`}}
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearToken();
          setError('Calendar access not authorized. Please reconnect to grant calendar permissions.');
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch calendars');
      }

      const data = await response.json();
      setCalendars(data.items || []);
    } catch (err) {
      log.error('Error loading calendars:', err);
    }
  };

  const loadEvents = async (token: string, date?: Date) => {
    try {
      setIsLoading(true);
      const targetDate = date || currentDate;

      // Get events for the current month (plus buffer)
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      startOfMonth.setDate(startOfMonth.getDate() - 7);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      endOfMonth.setDate(endOfMonth.getDate() + 14);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}&` +
        `singleEvents=true&orderBy=startTime&maxResults=250`,
        {headers: {Authorization: `Bearer ${token}`}}
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearToken();
          setError('Calendar access not authorized. Please reconnect to grant calendar permissions.');
          setIsLoading(false);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        log.error('Calendar API error:', response.status, errorData);
        throw new Error(errorData.error?.message || 'Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.items || []);
      setError(null);
    } catch (err) {
      log.error('Error loading events:', err);
      setError('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  const createEvent = async () => {
    if (!accessToken || !newEvent.summary.trim()) return;

    try {
      setCreating(true);

      const startDateTime = `${newEvent.startDate}T${newEvent.startTime || '09:00'}:00`;
      const endDateTime = `${newEvent.endDate || newEvent.startDate}T${newEvent.endTime || '10:00'}:00`;

      const eventData: CalendarEvent = {
        id: '',
        summary: newEvent.summary,
        description: newEvent.description,
        location: newEvent.location,
        start: {dateTime: startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone},
        end: {dateTime: endDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone},
      };

      if (newEvent.attendees.trim()) {
        eventData.attendees = newEvent.attendees.split(',').map(email => ({email: email.trim()}));
      }

      if (newEvent.addMeet) {
        eventData.conferenceData = {
          createRequest: {requestId: `meet-${Date.now()}`, conferenceSolutionKey: {type: 'hangoutsMeet'}}
        };
      }

      const url = newEvent.addMeet
        ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1'
        : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) throw new Error('Failed to create event');

      setShowCreateModal(false);
      setNewEvent({
        summary: '',
        description: '',
        location: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        attendees: '',
        addMeet: false,
      });
      await loadEvents(accessToken);
    } catch (err) {
      log.error('Error creating event:', err);
      setError('Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!accessToken || !eventToDelete) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventToDelete}`,
        {
          method: 'DELETE',
          headers: {Authorization: `Bearer ${accessToken}`},
        }
      );

      if (!response.ok) throw new Error('Failed to delete event');

      setEvents(events.filter(e => e.id !== eventToDelete));
      setShowEventModal(false);
      setSelectedEvent(null);
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
    } catch (err) {
      log.error('Error deleting event:', err);
      setError('Failed to delete event');
    }
  };

  // Calendar navigation
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
    if (accessToken) loadEvents(accessToken, newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
    if (accessToken) loadEvents(accessToken, newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    if (accessToken) loadEvents(accessToken, today);
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = event.start.dateTime
        ? event.start.dateTime.split('T')[0]
        : event.start.date;
      return eventDate === dateStr;
    });
  };

  const formatTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
  };

  const formatEventDate = (event: CalendarEvent) => {
    const startDate = event.start.dateTime || event.start.date;
    if (!startDate) return '';

    const start = new Date(startDate);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    };

    let result = start.toLocaleDateString('en-US', options);

    if (event.start.dateTime) {
      result += ` at ${formatTime(event.start.dateTime)}`;
      if (event.end.dateTime) {
        result += ` - ${formatTime(event.end.dateTime)}`;
      }
    }

    return result;
  };

  const getEventColor = (event: CalendarEvent) => {
    const colors: { [key: string]: string } = {
      '1': 'bg-lavender-500',
      '2': 'bg-sage-500',
      '3': 'bg-grape-500',
      '4': 'bg-flamingo-500',
      '5': 'bg-banana-500',
      '6': 'bg-tangerine-500',
      '7': 'bg-peacock-500',
      '8': 'bg-graphite-500',
      '9': 'bg-blueberry-500',
      '10': 'bg-basil-500',
      '11': 'bg-tomato-500',
    };
    return colors[event.colorId || ''] || 'bg-accent-500';
  };

  const handleConnectClick = () => {
    googleLogin();
  };

  const openCreateModal = (date?: Date) => {
    const targetDate = date || new Date();
    setNewEvent({
      ...newEvent,
      startDate: targetDate.toISOString().split('T')[0],
      endDate: targetDate.toISOString().split('T')[0],
    });
    setShowCreateModal(true);
  };

  if (isLoading && !accessToken) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div
            className='w-12 h-12 border-4 border-[var(--accent-primary)] border-t-accent-500 rounded-full animate-spin'/>
          <p className="text-[var(--text-muted)] font-medium">Loading NU-Calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      activeMenuItem="nu-calendar"
      breadcrumbs={[{label: 'NU-Calendar', href: '/nu-calendar'}]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
              <CalendarIcon className='h-6 w-6 text-inverse'/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">NU-Calendar</h1>
              <p className="text-body-muted">Your Google Calendar events</p>
            </div>
          </div>
          {!accessToken ? (
            <Button
              variant="primary"
              onClick={handleConnectClick}
              leftIcon={<CalendarIcon className="h-4 w-4"/>}
            >
              Connect Google Calendar
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => openCreateModal()}
                leftIcon={<Plus className="h-4 w-4"/>}
              >
                New Event
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadEvents(accessToken)}
                leftIcon={<RefreshCw className="h-4 w-4"/>}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearToken}
                className='text-[var(--text-muted)] hover:text-status-danger-text'
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className='border-status-danger-border bg-status-danger-bg'>
            <CardContent className="py-4">
              <div className='flex items-center gap-4 text-status-danger-text'>
                <AlertCircle className="h-5 w-5"/>
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={handleConnectClick} className="ml-auto">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!accessToken ? (
          /* Connect Card */
          (<Card className="border-2 border-dashed border-[var(--border-main)] dark:border-[var(--border-main)]">
            <CardContent className="py-16">
              <div className="text-center">
                <div
                  className='w-20 h-20 rounded-full bg-accent-subtle flex items-center justify-center mx-auto mb-6'>
                  <CalendarIcon className='h-10 w-10 text-accent'/>
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Connect to Google Calendar
                </h2>
                <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
                  View and manage your Google Calendar events directly within NULogic.
                  Schedule meetings, track appointments, and stay organized.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConnectClick}
                  leftIcon={<CalendarIcon className="h-5 w-5"/>}
                >
                  Connect Google Calendar
                </Button>
              </div>
            </CardContent>
          </Card>)
        ) : (
          <>
            {/* Calendar Header */}
            <Card>
              <CardContent className="py-4">
                <div className="row-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={goToPrevious}
                        className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-5 w-5"/>
                      </button>
                      <button
                        onClick={goToNext}
                        className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-5 w-5"/>
                      </button>
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {currentDate.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
                    </h2>
                  </div>
                  <div className="flex items-center border border-[var(--border-main)] rounded-lg overflow-hidden">
                    {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                          viewMode === mode
                            ? 'bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-400'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Grid - Month View */}
            {viewMode === 'month' && (
              <Card>
                <CardContent className="p-0">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 border-b border-[var(--border-main)]">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div
                        key={day}
                        className="p-4 text-center text-sm font-medium text-[var(--text-muted)]"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, index) => {
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dayEvents = getEventsForDay(day);

                      return (
                        <div
                          key={index}
                          onClick={() => openCreateModal(day)}
                          className={`min-h-[120px] p-2 border-b border-r border-[var(--border-main)] cursor-pointer hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors ${
                            !isCurrentMonth ? 'bg-[var(--bg-secondary)]/50' : ''
                          }`}
                        >
                          <div
                            className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                              isToday
                                ? 'bg-accent-500 text-white'
                                : isCurrentMonth
                                  ? 'text-[var(--text-primary)]'
                                  : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                  setShowEventModal(true);
                                }}
                                className={`px-1.5 py-0.5 rounded text-xs text-inverse truncate cursor-pointer hover:opacity-80 ${getEventColor(event)}`}
                              >
                                {event.start.dateTime && (
                                  <span className="mr-1">{formatTime(event.start.dateTime)}</span>
                                )}
                                {event.summary}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-caption px-1.5">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Agenda View */}
            {viewMode === 'agenda' && (
              <Card>
                <CardContent className='divide-y divide-surface-100'>
                  {events.length === 0 ? (
                    <div className="py-12 text-center text-[var(--text-muted)]">
                      No events found for this period
                    </div>
                  ) : (
                    events.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventModal(true);
                        }}
                        className="p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-1 h-full min-h-[60px] rounded-full ${getEventColor(event)}`}/>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {event.summary}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-body-muted">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4"/>
                                {formatEventDate(event)}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4"/>
                                  {event.location}
                                </div>
                              )}
                            </div>
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-body-muted">
                                <Users className="h-4 w-4"/>
                                {event.attendees.length} attendee(s)
                              </div>
                            )}
                          </div>
                          {event.hangoutLink && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeWindowOpen(event.hangoutLink, '_blank');
                              }}
                              leftIcon={<Video className="h-4 w-4"/>}
                            >
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Week/Day View Placeholder */}
            {(viewMode === 'week' || viewMode === 'day') && (
              <Card>
                <CardContent className="py-16 text-center">
                  <CalendarIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4"/>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    {viewMode === 'week' ? 'Week View' : 'Day View'}
                  </h3>
                  <p className="text-[var(--text-muted)]">
                    Coming soon. Use Month or Agenda view for now.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">
                  Upcoming Events
                </h3>
                <div className="space-y-4">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventModal(true);
                      }}
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                    >
                      <div className={`w-2 h-10 rounded-full ${getEventColor(event)}`}/>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {event.summary}
                        </p>
                        <p className="text-body-muted truncate">
                          {formatEventDate(event)}
                        </p>
                      </div>
                      {event.hangoutLink && (
                        <Video className='h-4 w-4 text-accent'/>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="row-between p-4 border-b border-[var(--border-main)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Event Details</h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Close event modal"
              >
                <X className="h-5 w-5"/>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedEvent.summary}
                </h4>
              </div>

              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Clock className="h-4 w-4"/>
                <span>{formatEventDate(selectedEvent)}</span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <MapPin className="h-4 w-4"/>
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.hangoutLink && (
                <Button
                  variant="primary"
                  onClick={() => safeWindowOpen(selectedEvent.hangoutLink, '_blank')}
                  leftIcon={<Video className="h-4 w-4"/>}
                  className="w-full"
                >
                  Join Google Meet
                </Button>
              )}

              {selectedEvent.description && (
                <div>
                  <h5 className="text-sm font-medium text-[var(--text-muted)] mb-1">Description</h5>
                  <p className="text-[var(--text-secondary)] text-sm whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                    Attendees ({selectedEvent.attendees.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                          {(attendee.displayName || attendee.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[var(--text-primary)]">
                            {attendee.displayName || attendee.email}
                          </p>
                          {attendee.responseStatus && (
                            <p className={`text-xs ${
                              attendee.responseStatus === 'accepted' ? 'text-success-500' :
                                attendee.responseStatus === 'declined' ? 'text-danger-500' :
                                  'text-warning-500'
                            }`}>
                              {attendee.responseStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-[var(--border-main)]">
                {selectedEvent.htmlLink && (
                  <Button
                    variant="outline"
                    onClick={() => safeWindowOpen(selectedEvent.htmlLink, '_blank')}
                    leftIcon={<ExternalLink className="h-4 w-4"/>}
                    className="flex-1"
                  >
                    Open in Calendar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    deleteEvent(selectedEvent.id);
                  }}
                  className='text-status-danger-text hover:bg-status-danger-bg'
                  leftIcon={<Trash2 className="h-4 w-4"/>}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="row-between p-4 border-b border-[var(--border-main)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Create Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Close create modal"
              >
                <X className="h-5 w-5"/>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Title *
                </label>
                <Input
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent({...newEvent, summary: e.target.value})}
                  placeholder="Event title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Location
                </label>
                <Input
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="Add location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Add description"
                  rows={3}
                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Attendees (comma-separated emails)
                </label>
                <Input
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({...newEvent, attendees: e.target.value})}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addMeet"
                  checked={newEvent.addMeet}
                  onChange={(e) => setNewEvent({...newEvent, addMeet: e.target.checked})}
                  className="rounded border-[var(--border-main)]"
                />
                <label htmlFor="addMeet" className="text-body-secondary">
                  Add Google Meet video conferencing
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={createEvent}
                  disabled={creating || !newEvent.summary.trim() || !newEvent.startDate}
                  leftIcon={creating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                >
                  {creating ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={confirmDeleteEvent}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </AppLayout>
  );
}

export default function NuCalendarPage() {
  return <CalendarContent/>;
}
