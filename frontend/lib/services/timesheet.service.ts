import { apiClient } from '@/lib/api/client';
import {
  Timesheet,
  TimeEntry,
  CreateTimesheetRequest,
  CreateTimeEntryRequest,
} from '@/lib/types/timesheet';

const BASE_URL = '/psa/timesheets';

export const timesheetService = {
  async getEmployeeTimesheets(employeeId: string): Promise<Timesheet[]> {
    const response = await apiClient.get<Timesheet[]>(`${BASE_URL}/employee/${employeeId}`);
    return response.data;
  },

  async getTimesheet(id: string): Promise<Timesheet> {
    const response = await apiClient.get<Timesheet>(`${BASE_URL}/${id}`);
    return response.data;
  },

  async createTimesheet(request: CreateTimesheetRequest): Promise<Timesheet> {
    const response = await apiClient.post<Timesheet>(BASE_URL, request);
    return response.data;
  },

  async submitTimesheet(id: string): Promise<Timesheet> {
    const response = await apiClient.post<Timesheet>(`${BASE_URL}/${id}/submit`);
    return response.data;
  },

  async approveTimesheet(id: string, approverId: string): Promise<Timesheet> {
    const response = await apiClient.post<Timesheet>(`${BASE_URL}/${id}/approve`, { approverId });
    return response.data;
  },

  async rejectTimesheet(id: string, reason: string): Promise<Timesheet> {
    const response = await apiClient.post<Timesheet>(`${BASE_URL}/${id}/reject`, { reason });
    return response.data;
  },

  async getTimesheetEntries(timesheetId: string): Promise<TimeEntry[]> {
    const response = await apiClient.get<TimeEntry[]>(`${BASE_URL}/${timesheetId}/entries`);
    return response.data;
  },

  async addTimeEntry(timesheetId: string, entry: CreateTimeEntryRequest): Promise<TimeEntry> {
    const response = await apiClient.post<TimeEntry>(`${BASE_URL}/${timesheetId}/entries`, entry);
    return response.data;
  },

  getWeekDates(date: Date = new Date()): { weekStart: string; weekEnd: string } {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay(); // Sunday
    const last = first + 6; // Saturday

    const weekStart = new Date(curr.setDate(first));
    const weekEnd = new Date(curr.setDate(last));

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
    };
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      DRAFT: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] dark:bg-surface-800 dark:text-[var(--text-secondary)]',
      SUBMITTED: 'bg-info-50 text-info-700 dark:bg-info-900/30 dark:text-info-300',
      UNDER_REVIEW: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
      APPROVED: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300',
      REJECTED: 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
    };
    return colors[status] || colors.DRAFT;
  },
};
