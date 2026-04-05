'use client';

import {useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,} from '@tanstack/react-query';
import {calendarService} from '@/lib/services/hrms/calendar.service';
import {
  CalendarEvent,
  CreateCalendarEventRequest,
  EventsSummary,
  EventStatus,
  EventType,
  Page,
  SyncResult,
} from '@/lib/types/hrms/calendar';

// Query key factory
export const calendarKeys = {
  all: ['calendar'] as const,
  events: () => [...calendarKeys.all, 'events'] as const,
  allEvents: () => [...calendarKeys.events(), 'all'] as const,
  allEventsPaginated: (page: number, size: number) =>
    [...calendarKeys.allEvents(), page, size] as const,
  myEvents: () => [...calendarKeys.events(), 'my'] as const,
  myEventsPaginated: (page: number, size: number) =>
    [...calendarKeys.myEvents(), page, size] as const,
  myEventsRange: (startTime: string, endTime: string) =>
    [...calendarKeys.myEvents(), 'range', startTime, endTime] as const,
  eventsRange: (startTime: string, endTime: string) =>
    [...calendarKeys.allEvents(), 'range', startTime, endTime] as const,
  eventsByType: (eventType: EventType) =>
    [...calendarKeys.events(), 'type', eventType] as const,
  eventDetail: (id: string) => [...calendarKeys.events(), id] as const,
  eventsOrganized: () => [...calendarKeys.events(), 'organized'] as const,
  eventsOrganizedPaginated: (page: number, size: number) =>
    [...calendarKeys.eventsOrganized(), page, size] as const,
  eventsAsAttendee: () => [...calendarKeys.events(), 'attending'] as const,
  summary: (startTime: string, endTime: string) =>
    [...calendarKeys.all, 'summary', startTime, endTime] as const,
  sync: () => [...calendarKeys.all, 'sync'] as const,
  syncPending: () => [...calendarKeys.sync(), 'pending'] as const,
};

// ============================================
// EVENT QUERIES
// ============================================

export const useCalendarEvent = (id: string): UseQueryResult<CalendarEvent, Error> =>
  useQuery({
    queryKey: calendarKeys.eventDetail(id),
    queryFn: () => calendarService.getEventById(id),
  });

export const useCalendarEvents = (
  page: number = 0,
  size: number = 20
): UseQueryResult<Page<CalendarEvent>, Error> =>
  useQuery({
    queryKey: calendarKeys.allEventsPaginated(page, size),
    queryFn: () => calendarService.getAllEvents(page, size),
  });

export const useMyCalendarEvents = (
  page: number = 0,
  size: number = 20
): UseQueryResult<Page<CalendarEvent>, Error> =>
  useQuery({
    queryKey: calendarKeys.myEventsPaginated(page, size),
    queryFn: () => calendarService.getMyEvents(page, size),
  });

export const useCalendarEventsByDateRange = (
  startTime: string,
  endTime: string
): UseQueryResult<CalendarEvent[], Error> =>
  useQuery({
    queryKey: calendarKeys.eventsRange(startTime, endTime),
    queryFn: () => calendarService.getEventsForRange(startTime, endTime),
  });

export const useMyCalendarEventsByDateRange = (
  startTime: string,
  endTime: string
): UseQueryResult<CalendarEvent[], Error> =>
  useQuery({
    queryKey: calendarKeys.myEventsRange(startTime, endTime),
    queryFn: () => calendarService.getMyEventsForRange(startTime, endTime),
  });

export const useCalendarEventsByType = (
  eventType: EventType
): UseQueryResult<CalendarEvent[], Error> =>
  useQuery({
    queryKey: calendarKeys.eventsByType(eventType),
    queryFn: () => calendarService.getEventsByType(eventType),
  });

export const useEventsOrganizedByMe = (
  page: number = 0,
  size: number = 20
): UseQueryResult<Page<CalendarEvent>, Error> =>
  useQuery({
    queryKey: calendarKeys.eventsOrganizedPaginated(page, size),
    queryFn: () => calendarService.getEventsOrganizedByMe(page, size),
  });

export const useEventsAsAttendee = (): UseQueryResult<CalendarEvent[], Error> =>
  useQuery({
    queryKey: calendarKeys.eventsAsAttendee(),
    queryFn: () => calendarService.getEventsAsAttendee(),
  });

export const useEventsSummary = (
  startTime: string,
  endTime: string
): UseQueryResult<EventsSummary, Error> =>
  useQuery({
    queryKey: calendarKeys.summary(startTime, endTime),
    queryFn: () => calendarService.getEventsSummary(startTime, endTime),
  });

// ============================================
// EVENT MUTATIONS
// ============================================

export const useCreateCalendarEvent = (): UseMutationResult<
  CalendarEvent,
  Error,
  CreateCalendarEventRequest
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => calendarService.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
      queryClient.invalidateQueries({queryKey: calendarKeys.myEvents()});
      queryClient.invalidateQueries({queryKey: calendarKeys.eventsOrganized()});
    },
  });
};

export const useUpdateCalendarEvent = (): UseMutationResult<
  CalendarEvent,
  Error,
  { id: string; data: CreateCalendarEventRequest }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}) => calendarService.updateEvent(id, data),
    onSuccess: (_, {id}) => {
      queryClient.invalidateQueries({queryKey: calendarKeys.eventDetail(id)});
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
      queryClient.invalidateQueries({queryKey: calendarKeys.myEvents()});
      queryClient.invalidateQueries({queryKey: calendarKeys.eventsOrganized()});
    },
  });
};

export const useDeleteCalendarEvent = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => calendarService.deleteEvent(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({queryKey: calendarKeys.eventDetail(id)});
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
      queryClient.invalidateQueries({queryKey: calendarKeys.myEvents()});
      queryClient.invalidateQueries({queryKey: calendarKeys.eventsOrganized()});
    },
  });
};

export const useUpdateEventStatus = (): UseMutationResult<
  CalendarEvent,
  Error,
  { id: string; status: EventStatus }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, status}) => calendarService.updateEventStatus(id, status),
    onSuccess: (_, {id}) => {
      queryClient.invalidateQueries({queryKey: calendarKeys.eventDetail(id)});
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
      queryClient.invalidateQueries({queryKey: calendarKeys.myEvents()});
    },
  });
};

// ============================================
// SYNC MUTATIONS
// ============================================

export const useSyncEventToGoogle = (): UseMutationResult<
  SyncResult,
  Error,
  string
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => calendarService.syncToGoogle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({queryKey: calendarKeys.eventDetail(id)});
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
    },
  });
};

export const useSyncEventToOutlook = (): UseMutationResult<
  SyncResult,
  Error,
  string
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => calendarService.syncToOutlook(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({queryKey: calendarKeys.eventDetail(id)});
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
    },
  });
};

export const useSyncAllPendingEvents = (): UseMutationResult<
  { totalPending: number; synced: number; failed: number },
  Error,
  void
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calendarService.syncAllPending(),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: calendarKeys.syncPending()});
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
    },
  });
};

export const useImportEventFromGoogle = (): UseMutationResult<
  SyncResult,
  Error,
  string
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (externalEventId) =>
      calendarService.importFromGoogle(externalEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
      queryClient.invalidateQueries({queryKey: calendarKeys.myEvents()});
    },
  });
};

export const useImportEventFromOutlook = (): UseMutationResult<
  SyncResult,
  Error,
  string
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (externalEventId) =>
      calendarService.importFromOutlook(externalEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: calendarKeys.events()});
      queryClient.invalidateQueries({queryKey: calendarKeys.myEvents()});
    },
  });
};
