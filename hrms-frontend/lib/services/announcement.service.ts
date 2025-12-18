import { apiClient } from '@/lib/api/client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
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
    GENERAL: 'bg-blue-100 text-blue-800',
    POLICY_UPDATE: 'bg-purple-100 text-purple-800',
    EVENT: 'bg-green-100 text-green-800',
    HOLIDAY: 'bg-yellow-100 text-yellow-800',
    ACHIEVEMENT: 'bg-pink-100 text-pink-800',
    URGENT: 'bg-red-100 text-red-800',
    BENEFIT: 'bg-indigo-100 text-indigo-800',
    TRAINING: 'bg-cyan-100 text-cyan-800',
    SOCIAL: 'bg-orange-100 text-orange-800',
    IT_MAINTENANCE: 'bg-gray-100 text-gray-800',
    HEALTH_SAFETY: 'bg-emerald-100 text-emerald-800',
    OTHER: 'bg-slate-100 text-slate-800',
  };
  return colors[category] || colors.OTHER;
}

export function getPriorityColor(priority: AnnouncementPriority): string {
  const colors: Record<AnnouncementPriority, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
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
