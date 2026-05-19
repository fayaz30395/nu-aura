import {apiClient} from './client';
import {
  createNotification as createNotificationGenerated,
  deleteNotification as deleteNotificationGenerated,
  getMyNotifications as getMyNotificationsGenerated,
  getNotificationById as getNotificationByIdGenerated,
  getRecentNotifications as getRecentNotificationsGenerated,
  getUnreadCount as getUnreadCountGenerated,
  getUnreadNotifications as getUnreadNotificationsGenerated,
  markAllAsRead as markAllAsReadGenerated,
} from '@/lib/generated/api/notification-controller/notification-controller';
import {markAsRead as markAsReadGenerated} from '@/lib/generated/api/multi-channel-notifications/multi-channel-notifications';
import {
  CreateNotificationRequest,
  Notification,
  NotificationPreferences,
  PagedNotificationResponse,
} from '../types/core/notifications';

/**
 * T3-12 migration (wave 2): thin facade over the orval-generated notification
 * clients. Public `notificationsApi` surface preserved so callers
 * (`useNotifications.ts` hooks, `NotificationBell.tsx`, notification-flow
 * integration test) need no edits.
 *
 * Endpoint sourcing:
 *  - `notification-controller`: list / unread / count / recent / get-by-id /
 *    create / mark-all-read / delete.
 *  - `multi-channel-notifications`: per-id `markAsRead` (PUT
 *    `/notifications/{id}/read` lives on MultiChannelNotificationController).
 *  - `getPreferences` / `updatePreferences` remain on `apiClient` against
 *    `/notifications/preferences`. The generated `notification-preferences-
 *    controller` targets a different backend route (`/notification-prefer-
 *    ences`) with a different response shape; resolving that contract
 *    mismatch is out of scope for this wave.
 */
export const notificationsApi = {
  // Get paginated notifications
  getMyNotifications: async (page: number = 0, size: number = 20): Promise<PagedNotificationResponse> => {
    const response = await getMyNotificationsGenerated({page, size});
    return response as unknown as PagedNotificationResponse;
  },

  // Get unread notifications
  getUnreadNotifications: async (): Promise<Notification[]> => {
    const response = await getUnreadNotificationsGenerated();
    return response as unknown as Notification[];
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await getUnreadCountGenerated();
    return response as unknown as number;
  },

  // Get recent notifications
  getRecentNotifications: async (hours: number = 24): Promise<Notification[]> => {
    const response = await getRecentNotificationsGenerated({hours});
    return response as unknown as Notification[];
  },

  // Get notification by ID
  getNotificationById: async (id: string): Promise<Notification> => {
    const response = await getNotificationByIdGenerated(id);
    return response as unknown as Notification;
  },

  // Create notification
  createNotification: async (request: CreateNotificationRequest): Promise<Notification> => {
    const response = await createNotificationGenerated(
      request as unknown as Parameters<typeof createNotificationGenerated>[0]
    );
    return response as unknown as Notification;
  },

  // Mark as read
  markAsRead: async (id: string): Promise<void> => {
    await markAsReadGenerated(id);
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await markAllAsReadGenerated();
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await deleteNotificationGenerated(id);
  },

  // Get preferences — see note above; intentionally not migrated this wave.
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  },

  // Update preferences — see note above; intentionally not migrated this wave.
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await apiClient.put<NotificationPreferences>('/notifications/preferences', preferences);
    return response.data;
  },
};
