'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { Notification, NotificationType } from '@/lib/types/notifications';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

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
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const recent = await notificationsApi.getRecentNotifications(72);
      setNotifications(recent);
    } catch (error) {
      console.error('Failed to load notifications:', error);
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
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
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
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} className="text-sm text-blue-600 hover:text-blue-800">
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
                    className={`p-4 border-b dark:border-gray-700 transition-colors ${
                      !notification.isRead
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    } ${hasRoute ? 'cursor-pointer' : ''}`}
                    onClick={() => hasRoute && handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {notification.title}
                          </p>
                          {hasRoute && (
                            <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
