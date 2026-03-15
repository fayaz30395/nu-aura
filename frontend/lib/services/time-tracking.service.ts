import { apiClient } from '../api/client';
import {
  TimeEntry,
  CreateTimeEntryRequest,
  TimeEntryStatus,
  TimeSummary,
  ProjectTimeSummary,
  Page,
} from '../types/time-tracking';

class TimeTrackingService {
  // CRUD Operations
  async createEntry(data: CreateTimeEntryRequest): Promise<TimeEntry> {
    const response = await apiClient.post<TimeEntry>('/time-tracking/entries', data);
    return response.data;
  }

  async updateEntry(id: string, data: CreateTimeEntryRequest): Promise<TimeEntry> {
    const response = await apiClient.put<TimeEntry>(`/time-tracking/entries/${id}`, data);
    return response.data;
  }

  async getEntryById(id: string): Promise<TimeEntry> {
    const response = await apiClient.get<TimeEntry>(`/time-tracking/entries/${id}`);
    return response.data;
  }

  async deleteEntry(id: string): Promise<void> {
    await apiClient.delete(`/time-tracking/entries/${id}`);
  }

  // My Entries
  async getMyEntries(page: number = 0, size: number = 20): Promise<Page<TimeEntry>> {
    const response = await apiClient.get<Page<TimeEntry>>('/time-tracking/entries/my', {
      params: { page, size },
    });
    return response.data;
  }

  async getMyEntriesForRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    const response = await apiClient.get<TimeEntry[]>('/time-tracking/entries/my/range', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  // All Entries (Admin)
  async getAllEntries(
    page: number = 0,
    size: number = 20,
    status?: TimeEntryStatus
  ): Promise<Page<TimeEntry>> {
    const params: Record<string, unknown> = { page, size };
    if (status) params.status = status;

    const response = await apiClient.get<Page<TimeEntry>>('/time-tracking/entries', { params });
    return response.data;
  }

  async getEntriesByProject(projectId: string): Promise<TimeEntry[]> {
    const response = await apiClient.get<TimeEntry[]>(
      `/time-tracking/entries/project/${projectId}`
    );
    return response.data;
  }

  // Status Operations
  async submitEntry(id: string): Promise<TimeEntry> {
    const response = await apiClient.post<TimeEntry>(`/time-tracking/entries/${id}/submit`);
    return response.data;
  }

  async submitMultiple(entryIds: string[]): Promise<TimeEntry[]> {
    const response = await apiClient.post<TimeEntry[]>(
      '/time-tracking/entries/submit-bulk',
      entryIds
    );
    return response.data;
  }

  async approveEntry(id: string): Promise<TimeEntry> {
    const response = await apiClient.post<TimeEntry>(`/time-tracking/entries/${id}/approve`);
    return response.data;
  }

  async approveMultiple(entryIds: string[]): Promise<TimeEntry[]> {
    const response = await apiClient.post<TimeEntry[]>(
      '/time-tracking/entries/approve-bulk',
      entryIds
    );
    return response.data;
  }

  async rejectEntry(id: string, reason: string): Promise<TimeEntry> {
    const response = await apiClient.post<TimeEntry>(`/time-tracking/entries/${id}/reject`, {
      reason,
    });
    return response.data;
  }

  async getPendingApprovals(page: number = 0, size: number = 20): Promise<Page<TimeEntry>> {
    const response = await apiClient.get<Page<TimeEntry>>('/time-tracking/entries/pending', {
      params: { page, size },
    });
    return response.data;
  }

  // Summary
  async getTimeSummary(startDate: string, endDate: string): Promise<TimeSummary> {
    const response = await apiClient.get<TimeSummary>('/time-tracking/summary', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getProjectTimeSummary(projectId: string): Promise<ProjectTimeSummary> {
    const response = await apiClient.get<ProjectTimeSummary>(
      `/time-tracking/summary/project/${projectId}`
    );
    return response.data;
  }

  // Helpers
  getStatusColor(status: TimeEntryStatus): string {
    const colors: Record<TimeEntryStatus, string> = {
      DRAFT: 'bg-[var(--bg-surface)] text-gray-700 dark:bg-surface-800 dark:text-gray-300',
      SUBMITTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return colors[status] || colors.DRAFT;
  }

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getEntryTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      REGULAR: 'Regular',
      OVERTIME: 'Overtime',
      HOLIDAY: 'Holiday',
      WEEKEND: 'Weekend',
    };
    return labels[type] || type;
  }

  getWeekDates(date: Date = new Date()): { weekStart: string; weekEnd: string } {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const last = first + 6;

    const weekStart = new Date(curr.setDate(first));
    const weekEnd = new Date(curr.setDate(last));

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
    };
  }
}

export const timeTrackingService = new TimeTrackingService();
