import { apiClient } from '@/lib/api/client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
  targetDepartmentIds?: string[];
  targetEmployeeIds?: string[];
  publishedAt: string;
  expiresAt?: string;
  isPinned: boolean;
  publishedBy?: string;
  publishedByName?: string;
  attachmentUrl?: string;
  readCount: number;
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
  wallPostId?: string; // Reference to wall post for reactions/comments
  hasReacted?: boolean; // Whether current user has reacted
}

export type AnnouncementCategory =
  | 'GENERAL'
  | 'POLICY_UPDATE'
  | 'EVENT'
  | 'HOLIDAY'
  | 'ACHIEVEMENT'
  | 'URGENT'
  | 'BENEFIT'
  | 'TRAINING'
  | 'SOCIAL'
  | 'IT_MAINTENANCE'
  | 'HEALTH_SAFETY'
  | 'OTHER';

export type AnnouncementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';

export type TargetAudience =
  | 'ALL_EMPLOYEES'
  | 'SPECIFIC_DEPARTMENTS'
  | 'SPECIFIC_EMPLOYEES'
  | 'MANAGERS_ONLY'
  | 'NEW_JOINERS';

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  targetAudience: TargetAudience;
  targetDepartmentIds?: string[];
  targetEmployeeIds?: string[];
  publishedAt?: string;
  expiresAt?: string;
  isPinned?: boolean;
  sendEmail?: boolean;
  attachmentUrl?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class AnnouncementService {
  async getAllAnnouncements(page: number = 0, size: number = 10): Promise<Page<Announcement>> {
    const response = await apiClient.get<Page<Announcement>>('/announcements', {
      params: { page, size },
    });
    return response.data;
  }

  async getActiveAnnouncements(employeeId: string, page: number = 0, size: number = 10): Promise<Page<Announcement>> {
    const response = await apiClient.get<Page<Announcement>>('/announcements/active', {
      params: { employeeId, page, size },
    });
    return response.data;
  }

  async getPinnedAnnouncements(): Promise<Announcement[]> {
    const response = await apiClient.get<Announcement[]>('/announcements/pinned');
    return response.data;
  }

  async getAnnouncement(id: string, employeeId?: string): Promise<Announcement> {
    const response = await apiClient.get<Announcement>(`/announcements/${id}`, {
      params: employeeId ? { employeeId } : undefined,
    });
    return response.data;
  }

  async createAnnouncement(request: CreateAnnouncementRequest): Promise<Announcement> {
    const response = await apiClient.post<Announcement>('/announcements', request);
    return response.data;
  }

  async updateAnnouncement(id: string, request: CreateAnnouncementRequest): Promise<Announcement> {
    const response = await apiClient.put<Announcement>(`/announcements/${id}`, request);
    return response.data;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await apiClient.delete(`/announcements/${id}`);
  }

  async markAsRead(announcementId: string, employeeId: string): Promise<void> {
    await apiClient.post(`/announcements/${announcementId}/read`, null, {
      params: { employeeId },
    });
  }
}

export const announcementService = new AnnouncementService();

// Helper functions
export function getCategoryColor(category: AnnouncementCategory): string {
  const colors: Record<AnnouncementCategory, string> = {
    GENERAL: 'bg-accent-100 text-accent-800',
    POLICY_UPDATE: 'bg-accent-100 text-accent-800',
    EVENT: 'bg-success-100 text-success-800',
    HOLIDAY: 'bg-warning-100 text-warning-800',
    ACHIEVEMENT: 'bg-accent-100 text-accent-800',
    URGENT: 'bg-danger-100 text-danger-800',
    BENEFIT: 'bg-accent-100 text-accent-800',
    TRAINING: 'bg-accent-100 text-accent-800',
    SOCIAL: 'bg-warning-100 text-warning-800',
    IT_MAINTENANCE: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
    HEALTH_SAFETY: 'bg-success-100 text-success-800',
    OTHER: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  };
  return colors[category] || colors.OTHER;
}

export function getPriorityColor(priority: AnnouncementPriority): string {
  const colors: Record<AnnouncementPriority, string> = {
    LOW: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
    MEDIUM: 'bg-accent-100 text-accent-800',
    HIGH: 'bg-warning-100 text-warning-800',
    CRITICAL: 'bg-danger-100 text-danger-800',
  };
  return colors[priority] || colors.MEDIUM;
}

export function getCategoryLabel(category: AnnouncementCategory): string {
  const labels: Record<AnnouncementCategory, string> = {
    GENERAL: 'General',
    POLICY_UPDATE: 'Policy Update',
    EVENT: 'Event',
    HOLIDAY: 'Holiday',
    ACHIEVEMENT: 'Achievement',
    URGENT: 'Urgent',
    BENEFIT: 'Benefits',
    TRAINING: 'Training',
    SOCIAL: 'Social',
    IT_MAINTENANCE: 'IT Maintenance',
    HEALTH_SAFETY: 'Health & Safety',
    OTHER: 'Other',
  };
  return labels[category] || category;
}
