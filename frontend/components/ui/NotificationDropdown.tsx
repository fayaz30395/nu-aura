'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { UnifiedNotification } from '@/lib/hooks/useNotifications';

// ─── Props ──────────────────────────────────────────────────────────────
export interface SimpleNotificationDropdownProps {
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Callback to close the dropdown */
  onClose: () => void;
  /** List of notifications to display (max 10 recommended) */
  notifications: UnifiedNotification[];
  /** Total unread count for the badge */
  unreadCount: number;
  /** Called when a notification is clicked to mark it read */
  onMarkAsRead: (id: string) => void;
  /** Called to mark all notifications as read */
  onMarkAllAsRead: () => void;
  /** Whether notifications are loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * A simple, reusable notification dropdown panel.
 *
 * This is a lightweight alternative to the full-featured
 * `components/layout/NotificationDropdown` (which includes Google integration).
 * Use this when you only need system notifications.
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
 * <SimpleNotificationDropdown
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   notifications={notifications}
 *   unreadCount={unreadCount}
 *   onMarkAsRead={markAsRead}
 *   onMarkAllAsRead={markAllAsRead}
 *   isLoading={isLoading}
 * />
 * ```
 */
export const SimpleNotificationDropdown: React.FC<SimpleNotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  isLoading = false,
  className,
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleNotificationClick = (notification: UnifiedNotification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
  };

  const displayed = notifications.slice(0, 10);

  return (
    <div
      className={cn(
        'absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)]',
        'rounded-lg border shadow-[var(--shadow-dropdown)] z-50',
        'bg-[var(--bg-surface)] border-[var(--border-main)]',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="row-between px-4 py-3 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className={cn(
              'flex items-center gap-1 text-xs font-medium min-h-[44px] px-2 rounded-md',
              'text-accent-700 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/30',
              'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
              'transition-colors duration-150'
            )}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-700 border-t-transparent" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-8 w-8 text-[var(--text-muted)] mb-2" />
            <p className="text-body-muted">No notifications</p>
          </div>
        ) : (
          <ul role="list">
            {displayed.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full text-left px-4 py-4 flex items-start gap-4 min-h-[44px]',
                    'hover:bg-[var(--bg-secondary)] transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-700',
                    'border-b border-[var(--border-main)] last:border-b-0',
                    !notification.isRead && 'bg-accent-50/50 dark:bg-accent-950/10'
                  )}
                >
                  {/* Unread indicator dot */}
                  <div className="mt-1.5 shrink-0">
                    {!notification.isRead ? (
                      <span className="block h-2 w-2 rounded-full bg-accent-700" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm truncate',
                        notification.isRead
                          ? 'text-[var(--text-secondary)]'
                          : 'text-[var(--text-primary)] font-medium'
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-caption mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-2xs text-[var(--text-muted)] mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border-main)] px-4 py-2">
        <button
          type="button"
          onClick={() => {
            router.push('/notifications');
            onClose();
          }}
          className={cn(
            'w-full text-center text-sm font-medium py-2 rounded-md min-h-[44px]',
            'text-accent-700 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/30',
            'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
            'transition-colors duration-150'
          )}
        >
          View all
        </button>
      </div>
    </div>
  );
};

export default SimpleNotificationDropdown;
