import { apiClient } from '../api/client';
import {
  CalendarEvent,
  CreateCalendarEventRequest,
  EventStatus,
  EventType,
  EventsSummary,
  SyncResult,
  Page,
} from '../types/calendar';

class CalendarService {
  // CRUD Operations
  async createEvent(data: CreateCalendarEventRequest): Promise<CalendarEvent> {
    const response = await apiClient.post<CalendarEvent>('/calendar/events', data);
    return response.data;
  }

  async updateEvent(id: string, data: CreateCalendarEventRequest): Promise<CalendarEvent> {
    const response = await apiClient.put<CalendarEvent>(`/calendar/events/${id}`, data);
    return response.data;
  }

  async getEventById(id: string): Promise<CalendarEvent> {
    const response = await apiClient.get<CalendarEvent>(`/calendar/events/${id}`);
    return response.data;
  }

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/calendar/events/${id}`);
  }

  async updateEventStatus(id: string, status: EventStatus): Promise<CalendarEvent> {
    const response = await apiClient.patch<CalendarEvent>(`/calendar/events/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  }

  // My Events
  async getMyEvents(page: number = 0, size: number = 20): Promise<Page<CalendarEvent>> {
    const response = await apiClient.get<Page<CalendarEvent>>('/calendar/events/my', {
      params: { page, size },
    });
    return response.data;
  }

  async getMyEventsForRange(startTime: string, endTime: string): Promise<CalendarEvent[]> {
    const response = await apiClient.get<CalendarEvent[]>('/calendar/events/my/range', {
      params: { startTime, endTime },
    });
    return response.data;
  }

  // All Events (Admin)
  async getAllEvents(page: number = 0, size: number = 20): Promise<Page<CalendarEvent>> {
    const response = await apiClient.get<Page<CalendarEvent>>('/calendar/events', {
      params: { page, size },
    });
    return response.data;
  }

  async getEventsForRange(startTime: string, endTime: string): Promise<CalendarEvent[]> {
    const response = await apiClient.get<CalendarEvent[]>('/calendar/events/range', {
      params: { startTime, endTime },
    });
    return response.data;
  }

  async getEventsByType(eventType: EventType): Promise<CalendarEvent[]> {
    const response = await apiClient.get<CalendarEvent[]>(`/calendar/events/type/${eventType}`);
    return response.data;
  }

  async getEventsOrganizedByMe(page: number = 0, size: number = 20): Promise<Page<CalendarEvent>> {
    const response = await apiClient.get<Page<CalendarEvent>>('/calendar/events/organized', {
      params: { page, size },
    });
    return response.data;
  }

  async getEventsAsAttendee(): Promise<CalendarEvent[]> {
    const response = await apiClient.get<CalendarEvent[]>('/calendar/events/attending');
    return response.data;
  }

  // Sync Operations
  async syncToGoogle(id: string): Promise<SyncResult> {
    const response = await apiClient.post<SyncResult>(`/calendar/events/${id}/sync/google`);
    return response.data;
  }

  async syncToOutlook(id: string): Promise<SyncResult> {
    const response = await apiClient.post<SyncResult>(`/calendar/events/${id}/sync/outlook`);
    return response.data;
  }

  async syncAllPending(): Promise<{ totalPending: number; synced: number; failed: number }> {
    const response = await apiClient.post<{ totalPending: number; synced: number; failed: number }>(
      '/calendar/sync/pending'
    );
    return response.data;
  }

  async importFromGoogle(externalEventId: string): Promise<SyncResult> {
    const response = await apiClient.post<SyncResult>('/calendar/import/google', null, {
      params: { externalEventId },
    });
    return response.data;
  }

  async importFromOutlook(externalEventId: string): Promise<SyncResult> {
    const response = await apiClient.post<SyncResult>('/calendar/import/outlook', null, {
      params: { externalEventId },
    });
    return response.data;
  }

  // Summary
  async getEventsSummary(startTime: string, endTime: string): Promise<EventsSummary> {
    const response = await apiClient.get<EventsSummary>('/calendar/summary', {
      params: { startTime, endTime },
    });
    return response.data;
  }

  // Helpers
  getEventTypeLabel(type: EventType): string {
    const labels: Record<EventType, string> = {
      MEETING: 'Meeting',
      APPOINTMENT: 'Appointment',
      TASK: 'Task',
      REMINDER: 'Reminder',
      OUT_OF_OFFICE: 'Out of Office',
      HOLIDAY: 'Holiday',
      TRAINING: 'Training',
      INTERVIEW: 'Interview',
      REVIEW: 'Review',
      OTHER: 'Other',
    };
    return labels[type] || type;
  }

  getStatusColor(status: EventStatus): string {
    const colors: Record<EventStatus, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      TENTATIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      COMPLETED: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
    };
    return colors[status] || colors.SCHEDULED;
  }

  getEventColor(eventType: EventType): string {
    const colors: Record<EventType, string> = {
      MEETING: 'bg-blue-500',
      APPOINTMENT: 'bg-purple-500',
      TASK: 'bg-orange-500',
      REMINDER: 'bg-yellow-500',
      OUT_OF_OFFICE: 'bg-[var(--text-muted)]',
      HOLIDAY: 'bg-green-500',
      TRAINING: 'bg-indigo-500',
      INTERVIEW: 'bg-pink-500',
      REVIEW: 'bg-primary-500',
      OTHER: 'bg-[var(--text-muted)]',
    };
    return colors[eventType] || colors.OTHER;
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatTime(dateTime: string): string {
    return new Date(dateTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(dateTime: string): string {
    return new Date(dateTime).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getWeekRange(date: Date = new Date()): { start: string; end: string } {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const last = first + 6;

    const weekStart = new Date(curr.setDate(first));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(curr.setDate(last));
    weekEnd.setHours(23, 59, 59, 999);

    return {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
    };
  }

  getMonthRange(date: Date = new Date()): { start: string; end: string } {
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return {
      start: monthStart.toISOString(),
      end: monthEnd.toISOString(),
    };
  }
}

export const calendarService = new CalendarService();
