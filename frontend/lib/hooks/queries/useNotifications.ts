'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {notificationsApi} from '@/lib/api/notifications';
import type {Notification, NotificationPreferences, PagedNotificationResponse} from '@/lib/types/core/notifications';

/**
 * Returns a refetchInterval function with exponential backoff on errors.
 * Normal: polls at `baseMs`. After each consecutive failure, doubles the interval
 * up to `maxMs`. Stops polling entirely after `maxFailures` consecutive failures.
 */
function pollingWithBackoff(baseMs: number, maxMs: number = 120_000, maxFailures: number = 10) {
  return (query: { state: { error: unknown; dataUpdateCount: number; errorUpdateCount: number } }) => {
    const failures = query.state.errorUpdateCount;
    if (failures >= maxFailures) return false; // stop polling
    if (!query.state.error) return baseMs;     // healthy — normal interval
    return Math.min(baseMs * Math.pow(2, failures), maxMs); // backoff
  };
}

// Query keys for cache management
export const notificationKeys = {
  all: ['notifications'] as const,
  inbox: (limit: number, status?: string) =>
    [...notificationKeys.all, 'inbox', {limit, status}] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
  recent: (hours: number) => [...notificationKeys.all, 'recent', hours] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

/**
 * Hook to fetch unread notifications for the notification bell inbox.
 * Polls every 30 seconds for new notifications.
 */
export function useNotificationInbox(_limit: number = 10, enabled: boolean = true) {
  return useQuery<Notification[]>({
    queryKey: notificationKeys.unread(),
    queryFn: () => notificationsApi.getUnreadNotifications(),
    enabled,
    staleTime: 15 * 1000, // 15 seconds — notifications should feel fresh
    refetchInterval: pollingWithBackoff(30_000), // 30s base, backoff on failures
  });
}

/**
 * Hook to fetch the unread notification count for the badge.
 * Polls every 30 seconds.
 */
export function useUnreadNotificationCount(enabled: boolean = true) {
  return useQuery<number>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: pollingWithBackoff(30_000), // 30s base, backoff on failures
  });
}

/**
 * Hook to fetch paginated notifications (for a full notifications page).
 */
export function useNotifications(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery<PagedNotificationResponse>({
    queryKey: notificationKeys.inbox(size, 'ALL'),
    queryFn: () => notificationsApi.getMyNotifications(page, size),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation to mark a single notification as read.
 * Invalidates inbox and count queries on success.
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: notificationKeys.unread()});
      queryClient.invalidateQueries({queryKey: notificationKeys.unreadCount()});
    },
  });
}

/**
 * Mutation to mark all notifications as read.
 * Invalidates inbox and count queries on success.
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: notificationKeys.unread()});
      queryClient.invalidateQueries({queryKey: notificationKeys.unreadCount()});
    },
  });
}

/**
 * Hook to fetch notification preferences.
 */
export function useNotificationPreferences(enabled: boolean = true) {
  return useQuery<NotificationPreferences>({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationsApi.getPreferences(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation to update notification preferences.
 * Invalidates preferences query on success.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) =>
      notificationsApi.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: notificationKeys.preferences()});
    },
  });
}
