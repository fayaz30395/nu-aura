'use client';

import {
  useNotificationInbox,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from './queries/useNotifications';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import { useCallback, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

export interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface UseNotificationsReturn {
  /** Combined notifications from REST API and WebSocket, sorted newest first */
  notifications: UnifiedNotification[];
  /** Total unread count (max of WebSocket in-memory vs persisted) */
  unreadCount: number;
  /** Mark a single notification as read by id */
  markAsRead: (id: string) => void;
  /** Mark all notifications as read */
  markAllAsRead: () => void;
  /** Whether the initial load is in progress */
  isLoading: boolean;
}

/**
 * Unified notification hook that merges REST-persisted notifications with
 * real-time WebSocket push notifications.
 *
 * Polls the REST API every 30 seconds and receives instant pushes via STOMP/SockJS.
 *
 * @param limit - Maximum number of notifications to fetch (default 10)
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
 * ```
 */
export function useUnifiedNotifications(limit: number = 10): UseNotificationsReturn {
  // ── REST API queries ──────────────────────────────────────────────
  const { data: persistedNotifications = [], isLoading } = useNotificationInbox(limit);
  const { data: persistedUnreadCount = 0 } = useUnreadNotificationCount();

  // ── WebSocket real-time feed ──────────────────────────────────────
  const {
    notifications: wsNotifications,
    unreadCount: wsUnreadCount,
    markAsRead: wsMarkAsRead,
    markAllAsRead: wsMarkAllAsRead,
  } = useWebSocket();

  // ── Mutations ─────────────────────────────────────────────────────
  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  // ── Merge REST + WS notifications, deduplicate, sort ──────────────
  const notifications = useMemo<UnifiedNotification[]>(() => {
    // Convert persisted notifications to unified shape
    const fromRest: UnifiedNotification[] = persistedNotifications.map((n) => ({
      id: String(n.id),
      type: n.type ?? 'SYSTEM',
      title: n.title ?? '',
      message: n.message ?? '',
      isRead: n.isRead ?? false,
      createdAt: n.createdAt ?? new Date().toISOString(),
      actionUrl: n.actionUrl,
    }));

    // Convert WebSocket notifications to unified shape
    const fromWs: UnifiedNotification[] = wsNotifications.map((n, index) => ({
      id: `ws-${index}-${n.timestamp ?? Date.now()}`,
      type: n.type ?? 'SYSTEM',
      title: n.title ?? '',
      message: n.message ?? '',
      isRead: n.read ?? false,
      createdAt: n.timestamp
        ? new Date(n.timestamp).toISOString()
        : new Date().toISOString(),
      actionUrl: n.actionUrl,
    }));

    // Merge and sort newest first
    const merged = [...fromWs, ...fromRest];
    merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Limit to requested count
    return merged.slice(0, limit);
  }, [persistedNotifications, wsNotifications, limit]);

  // ── Unread count: take the larger of WS vs REST ───────────────────
  const unreadCount = Math.max(wsUnreadCount, persistedUnreadCount);

  // ── Actions ───────────────────────────────────────────────────────
  const markAsRead = useCallback(
    (id: string) => {
      if (id.startsWith('ws-')) {
        // WebSocket notification — find index
        const indexStr = id.split('-')[1];
        const index = parseInt(indexStr, 10);
        if (!isNaN(index)) {
          wsMarkAsRead(index);
        }
      } else {
        markReadMutation.mutate(id);
      }
    },
    [wsMarkAsRead, markReadMutation]
  );

  const markAllAsRead = useCallback(() => {
    wsMarkAllAsRead();
    markAllReadMutation.mutate();
  }, [wsMarkAllAsRead, markAllReadMutation]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
  };
}

export default useUnifiedNotifications;
