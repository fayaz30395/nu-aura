// Meeting Types

export type MeetingStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export type MeetingType =
  | 'REGULAR'
  | 'PERFORMANCE'
  | 'GOAL_REVIEW'
  | 'CAREER'
  | 'FEEDBACK'
  | 'ONBOARDING'
  | 'PROBATION'
  | 'EXIT';

export type RecurrencePattern = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export type MeetingAgendaAddedBy = 'MANAGER' | 'EMPLOYEE';

export type MeetingAgendaPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type MeetingAgendaCategory =
  | 'WORK_UPDATES'
  | 'BLOCKERS'
  | 'FEEDBACK'
  | 'CAREER_GROWTH'
  | 'GOALS'
  | 'WELLBEING'
  | 'RECOGNITION'
  | 'OTHER';

export type MeetingActionAssigneeRole = 'MANAGER' | 'EMPLOYEE';

export type MeetingActionStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CARRIED_OVER';

export type MeetingActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface MeetingAgendaItemRequest {
  title: string;
  description?: string;
  itemOrder?: number;
  priority?: MeetingAgendaPriority;
  category?: MeetingAgendaCategory;
  durationMinutes?: number;
}

export interface OneOnOneMeetingRequest {
  employeeId: string;
  title: string;
  description?: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm[:ss]
  endTime?: string; // HH:mm[:ss]
  durationMinutes?: number;
  meetingType?: MeetingType;
  location?: string;
  meetingLink?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string; // YYYY-MM-DD
  reminderMinutesBefore?: number;
  agendaItems?: MeetingAgendaItemRequest[];
}

export interface MeetingAgendaItemResponse {
  id: string;
  title: string;
  description?: string;
  itemOrder?: number;
  addedBy?: MeetingAgendaAddedBy;
  isDiscussed?: boolean;
  discussionNotes?: string;
  priority?: MeetingAgendaPriority;
  category?: MeetingAgendaCategory;
}

export interface MeetingActionItemResponse {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assigneeName?: string;
  assigneeRole: MeetingActionAssigneeRole;
  dueDate?: string; // YYYY-MM-DD
  status: MeetingActionStatus;
  priority: MeetingActionPriority;
  isOverdue?: boolean;
}

export interface OneOnOneMeetingResponse {
  id: string;
  managerId: string;
  managerName?: string;
  employeeId: string;
  employeeName?: string;
  title: string;
  description?: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm[:ss]
  endTime?: string; // HH:mm[:ss]
  durationMinutes?: number;
  status?: MeetingStatus;
  meetingType?: MeetingType;
  location?: string;
  meetingLink?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  sharedNotes?: string;
  meetingSummary?: string;
  employeeRating?: number;
  employeeFeedback?: string;
  createdAt?: string; // ISO 8601 DateTime
  agendaItems?: MeetingAgendaItemResponse[];
  actionItems?: MeetingActionItemResponse[];
}

export interface OneOnOneMeetingEntity {
  id: string;
  tenantId?: string;
  managerId: string;
  employeeId: string;
  title: string;
  description?: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm[:ss]
  endTime?: string; // HH:mm[:ss]
  durationMinutes?: number;
  status?: MeetingStatus;
  meetingType?: MeetingType;
  location?: string;
  meetingLink?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string; // YYYY-MM-DD
  parentMeetingId?: string;
  managerNotes?: string;
  sharedNotes?: string;
  employeeNotes?: string;
  meetingSummary?: string;
  reminderSent?: boolean;
  reminderMinutesBefore?: number;
  actualStartTime?: string; // ISO 8601 DateTime
  actualEndTime?: string; // ISO 8601 DateTime
  cancelledAt?: string; // ISO 8601 DateTime
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduledFrom?: string;
  employeeRating?: number;
  employeeFeedback?: string;
  createdAt?: string; // ISO 8601 DateTime
  updatedAt?: string; // ISO 8601 DateTime
  createdBy?: string;
  lastModifiedBy?: string;
  version?: number;
}

export interface MeetingNotesRequest {
  sharedNotes?: string;
  privateNotes?: string;
}

export interface MeetingFeedbackRequest {
  rating?: number;
  feedback?: string;
}

export interface MeetingRescheduleRequest {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm[:ss]
}

export interface MeetingCancelRequest {
  reason: string;
}

export interface MeetingCompleteRequest {
  summary?: string;
}

export interface MeetingAgendaDiscussRequest {
  notes?: string;
}

export interface MeetingActionItemRequest {
  title: string;
  description?: string;
  assigneeId: string;
  assigneeRole: MeetingActionAssigneeRole;
  dueDate?: string; // YYYY-MM-DD
  priority?: MeetingActionPriority;
}

export interface MeetingActionItemStatusRequest {
  status: MeetingActionStatus;
  notes?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
