import {apiClient} from './client';
import {
  CreateNotificationRequest,
  Notification,
  NotificationPreferences,
  PagedNotificationResponse,
} from '../types/core/notifications';

export const notificationsApi = {
  // Get paginated notifications
  getMyNotifications: async (page: number = 0, size: number = 20): Promise<PagedNotificationResponse> => {
    const response = await apiClient.get<PagedNotificationResponse>(
      `/notifications?page=${page}&size=${size}`
    );
    return response.data;
  },

  // Get unread notifications
  getUnreadNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/notifications/unread');
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<number>('/notifications/unread/count');
    return response.data;
  },

  // Get recent notifications
  getRecentNotifications: async (hours: number = 24): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>(`/notifications/recent?hours=${hours}`);
    return response.data;
  },

  // Get notification by ID
  getNotificationById: async (id: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/notifications/${id}`);
    return response.data;
  },

  // Create notification
  createNotification: async (request: CreateNotificationRequest): Promise<Notification> => {
    const response = await apiClient.post<Notification>('/notifications', request);
    return response.data;
  },

  // Mark as read
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  // Get preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  },

  // Update preferences
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await apiClient.put<NotificationPreferences>('/notifications/preferences', preferences);
    return response.data;
  },
};
