'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { Notification, NotificationType } from '@/lib/types/core/notifications';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import { logger } from '@/lib/utils/logger';

// Map notification types to their navigation routes
const getNotificationRoute = (notification: Notification): string | null => {
  const { type, relatedEntityId, actionUrl } = notification;

  // If actionUrl is provided, use it
  if (actionUrl) {
    return actionUrl;
  }

  // Map types to routes based on relatedEntityType or type
  switch (type) {
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
    case 'LEAVE_PENDING':
      return relatedEntityId ? `/leave/requests/${relatedEntityId}` : '/leave/requests';
    case 'ATTENDANCE_MARKED':
    case 'ATTENDANCE_ALERT':
      return '/attendance/my-attendance';
    case 'PAYROLL_GENERATED':
      return relatedEntityId ? `/payroll/${relatedEntityId}` : '/payroll';
    case 'DOCUMENT_UPLOADED':
    case 'DOCUMENT_REQUIRED':
      return relatedEntityId ? `/documents/${relatedEntityId}` : '/documents';
    case 'ANNOUNCEMENT':
      return relatedEntityId ? `/announcements/${relatedEntityId}` : '/announcements';
    case 'PERFORMANCE_REVIEW_DUE':
      return relatedEntityId ? `/performance/reviews/${relatedEntityId}` : '/performance/reviews';
    case 'EXPENSE_APPROVED':
    case 'EXPENSE_REJECTED':
      return relatedEntityId ? `/expenses/${relatedEntityId}` : '/expenses';
    case 'SHIFT_ASSIGNED':
    case 'SHIFT_CHANGED':
      return '/attendance/shifts';
    case 'ROLE_UPDATED':
      return '/me/profile';
    case 'BIRTHDAY':
    case 'ANNIVERSARY':
      return '/dashboard';
    default:
      return null;
  }
};

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications: wsNotifications } = useWebSocket();

  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Sync new WebSocket notifications into local state
  useEffect(() => {
    if (wsNotifications.length > 0) {
      const latest = wsNotifications[0];
      // Avoid duplication if already in list (though unlikely with timestamps)
      setNotifications(prev => {
        const exists = prev.some(n => 
          n.title === latest.title && 
          Math.abs(new Date(n.createdAt).getTime() - (latest.timestamp || 0)) < 1000
        );
        if (exists) return prev;

        // Map WS notification to API Notification type
        const mapped: Notification = {
          id: `ws-${Date.now()}`,
          title: latest.title,
          message: latest.message,
          isRead: false,
          type: (latest.type as NotificationType) || 'GENERAL',
          createdAt: new Date(latest.timestamp || Date.now()).toISOString(),
          updatedAt: new Date(latest.timestamp || Date.now()).toISOString(),
          relatedEntityId: (latest.metadata?.relatedEntityId as string | undefined) || ((latest.payload as Record<string, unknown> | undefined)?.id as string | undefined),
          actionUrl: latest.actionUrl,
          userId: (latest.metadata?.userId as string | undefined) || '',
          priority: latest.priority || 'NORMAL'
        };
        
        setUnreadCount(c => c + 1);
        return [mapped, ...prev];
      });
    }
  }, [wsNotifications]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      logger.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const recent = await notificationsApi.getRecentNotifications(72);
      setNotifications(recent);
    } catch (error) {
      logger.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      loadUnreadCount();
    } catch (error) {
      logger.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    // Get the route and navigate
    const route = getNotificationRoute(notification);
    if (route) {
      setIsOpen(false);
      router.push(route);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]  transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white bg-danger-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-[var(--bg-input)] rounded-lg shadow-2xl border border-[var(--border-main)] dark:border-surface-700 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="row-between p-4 border-b">
            <h3 className="text-xl font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} className="text-sm text-accent-600 hover:text-accent-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded">
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">No notifications</div>
            ) : (
              notifications.map((notification) => {
                const hasRoute = !!getNotificationRoute(notification);
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b dark:border-surface-700 transition-colors ${
                      !notification.isRead
                        ? 'bg-accent-50 dark:bg-accent-900/20'
                        : 'hover:bg-[var(--bg-surface)] '
                    } ${hasRoute ? 'cursor-pointer' : ''}`}
                    onClick={() => hasRoute && handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {notification.title}
                          </p>
                          {hasRoute && (
                            <ExternalLink className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-body-secondary mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-caption mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-accent-600 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 text-danger-600 hover:text-danger-800 dark:text-danger-400 dark:hover:text-danger-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
