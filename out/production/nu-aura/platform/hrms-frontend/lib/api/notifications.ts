import { apiClient } from './client';
import {
  Notification,
  CreateNotificationRequest,
  PagedNotificationResponse,
  NotificationPreferences,
} from '../types/notifications';

export const notificationsApi = {
  // Get paginated notifications
  getMyNotifications: async (page: number = 0, size: number = 20): Promise<PagedNotificationResponse> => {
    const response = await apiClient.get<PagedNotificationResponse>(
      `/api/v1/notifications?page=${page}&size=${size}`
    );
    return response.data;
  },

  // Get unread notifications
  getUnreadNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/api/v1/notifications/unread');
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<number>('/api/v1/notifications/unread/count');
    return response.data;
  },

  // Get recent notifications
  getRecentNotifications: async (hours: number = 24): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>(`/api/v1/notifications/recent?hours=${hours}`);
    return response.data;
  },

  // Get notification by ID
  getNotificationById: async (id: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/api/v1/notifications/${id}`);
    return response.data;
  },

  // Create notification
  createNotification: async (request: CreateNotificationRequest): Promise<Notification> => {
    const response = await apiClient.post<Notification>('/api/v1/notifications', request);
    return response.data;
  },

  // Mark as read
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/api/v1/notifications/${id}/read`);
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/api/v1/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/notifications/${id}`);
  },

  // Get preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/api/v1/notifications/preferences');
    return response.data;
  },

  // Update preferences
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await apiClient.put<NotificationPreferences>('/api/v1/notifications/preferences', preferences);
    return response.data;
  },
};
