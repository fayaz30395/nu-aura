// Calendar Types

export type EventType =
  | 'MEETING'
  | 'APPOINTMENT'
  | 'TASK'
  | 'REMINDER'
  | 'OUT_OF_OFFICE'
  | 'HOLIDAY'
  | 'TRAINING'
  | 'INTERVIEW'
  | 'REVIEW'
  | 'OTHER';

export type EventStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'TENTATIVE'
  | 'CANCELLED'
  | 'COMPLETED';

export type RecurrencePattern =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'YEARLY';

export type SyncProvider = 'GOOGLE' | 'OUTLOOK' | 'APPLE' | 'NONE';

export type SyncStatus = 'NOT_SYNCED' | 'SYNCED' | 'PENDING' | 'SYNC_ERROR';

export type EventVisibility = 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL';

export interface CalendarEvent {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  meetingLink?: string;
  eventType: EventType;
  status: EventStatus;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  parentEventId?: string;
  syncProvider?: SyncProvider;
  externalEventId?: string;
  lastSyncedAt?: string;
  syncStatus?: SyncStatus;
  reminderMinutes?: number;
  reminderSent?: boolean;
  attendeeIds?: string[];
  attendeeNames?: string[];
  organizerId?: string;
  organizerName?: string;
  visibility?: EventVisibility;
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  meetingLink?: string;
  eventType?: EventType;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  syncProvider?: SyncProvider;
  reminderMinutes?: number;
  attendeeIds?: string[];
  visibility?: EventVisibility;
  color?: string;
  notes?: string;
}

export interface EventsSummary {
  startTime: string;
  endTime: string;
  totalEvents: number;
  eventsByType: Record<string, number>;
}

export interface SyncResult {
  success: boolean;
  mockMode: boolean;
  provider: string;
  eventId?: string;
  externalEventId?: string;
  syncedAt?: string;
  message?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
