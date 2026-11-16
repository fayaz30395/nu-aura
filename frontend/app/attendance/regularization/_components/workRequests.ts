export type WorkRequestType = 'WORK_FROM_HOME' | 'ON_DUTY' | 'REMOTE_CLOCK_IN';
export type WorkRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface WorkRequest {
  id: string;
  employeeId: string;
  requestType: WorkRequestType;
  startDate: string;
  endDate: string;
  reason: string;
  status: WorkRequestStatus;
  reviewNote?: string;
  createdAt: string;
}

export interface WorkRequestForm {
  startDate: string;
  endDate: string;
  reason: string;
}

// Mirrors AttendanceWorkRequestService limits
export const MAX_RANGE_DAYS = 31;
export const MAX_BACKDATE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtcDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Returns the first field error as a message, or null when the form is valid. */
export function validateWorkRequest(
  type: WorkRequestType,
  form: WorkRequestForm,
  today: string,
): string | null {
  if (!form.startDate || !form.endDate) return 'Select a start and end date';
  const start = toUtcDay(form.startDate);
  const end = toUtcDay(form.endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Select a valid date';
  if (end < start) return 'End date cannot be before start date';
  if (type === 'REMOTE_CLOCK_IN' && start !== end) return 'A remote clock-in request covers a single day';
  if ((end - start) / DAY_MS + 1 > MAX_RANGE_DAYS) return `A request cannot span more than ${MAX_RANGE_DAYS} days`;
  if (start < toUtcDay(today) - MAX_BACKDATE_DAYS * DAY_MS) {
    return `Requests cannot start more than ${MAX_BACKDATE_DAYS} days in the past`;
  }
  const reason = form.reason.trim();
  if (reason.length < 5) return 'Reason must be at least 5 characters';
  if (reason.length > 500) return 'Reason must not exceed 500 characters';
  return null;
}
