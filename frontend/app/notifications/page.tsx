'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileText,
  Gift,
  Loader2,
  Megaphone,
  Shield,
  Award,
  Info,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {cn} from '@/lib/utils';
import {formatDistanceToNow} from 'date-fns';
import {getNotificationRoute} from '@/lib/utils/notificationRoutes';
import {useQueryClient} from '@tanstack/react-query';
import {
  notificationKeys,
  useFilteredNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useUnreadNotificationCount,
} from '@/lib/hooks/queries/useNotifications';
import type {Notification, NotificationType} from '@/lib/types/core/notifications';

// ─── Filter tab configuration ────────────────────────────────────────
interface FilterTab {
  key: string;
  label: string;
  types?: NotificationType[];
}

const filterTabs: FilterTab[] = [
  {key: 'all', label: 'All'},
  {key: 'unread', label: 'Unread'},
  {key: 'approvals', label: 'Approvals', types: ['TASK_ASSIGNED', 'APPROVAL_REQUIRED', 'APPROVAL_UPDATE', 'APPROVAL_ESCALATED', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED']},
  {key: 'leave', label: 'Leave & Attendance', types: ['LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_PENDING', 'ATTENDANCE_MARKED', 'ATTENDANCE_ALERT']},
  {key: 'payroll', label: 'Payroll', types: ['PAYROLL_GENERATED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED']},
  {key: 'system', label: 'System', types: ['ANNOUNCEMENT', 'SYSTEM_ALERT', 'SYSTEM', 'REMINDER', 'ROLE_UPDATED']},
];

// ─── Notification icon helper ────────────────────────────────────────
function getNotificationIcon(type: string): React.ReactNode {
  switch (type) {
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
    case 'LEAVE_PENDING':
      return <FileText className="h-4 w-4 text-accent-500"/>;
    case 'EXPENSE_APPROVED':
    case 'EXPENSE_REJECTED':
    case 'PAYROLL_GENERATED':
      return <DollarSign className="h-4 w-4 text-success-500"/>;
    case 'ATTENDANCE_MARKED':
    case 'ATTENDANCE_ALERT':
      return <Clock className="h-4 w-4 text-warning-500"/>;
    case 'ANNOUNCEMENT':
      return <Megaphone className="h-4 w-4 text-accent-700"/>;
    case 'BIRTHDAY':
    case 'ANNIVERSARY':
      return <Gift className="h-4 w-4 text-accent-700"/>;
    case 'PERFORMANCE_REVIEW_DUE':
      return <Award className="h-4 w-4 text-warning-500"/>;
    case 'ROLE_UPDATED':
      return <Shield className="h-4 w-4 text-accent-500"/>;
    case 'SYSTEM_ALERT':
    case 'SYSTEM':
      return <Info className="h-4 w-4 text-danger-500"/>;
    case 'TASK_ASSIGNED':
    case 'APPROVAL_REQUIRED':
    case 'APPROVAL_UPDATE':
    case 'APPROVAL_ESCALATED':
    case 'APPROVAL_APPROVED':
    case 'APPROVAL_REJECTED':
      return <ClipboardCheck className="h-4 w-4 text-accent-600"/>;
    default:
      return <Bell className="h-4 w-4 text-accent-500"/>;
  }
}

// ─── Priority border helper ──────────────────────────────────────────
function getPriorityStyles(priority?: string, isRead?: boolean): string {
  if (isRead) return '';
  switch (priority) {
    case 'URGENT':
      return 'border-l-2 border-l-danger-500';
    case 'HIGH':
      return 'border-l-2 border-l-warning-500';
    default:
      return 'border-l-2 border-l-accent-500';
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  // Invalidate notification cache on WebSocket events
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({queryKey: notificationKeys.unreadCount()});
      queryClient.invalidateQueries({queryKey: notificationKeys.unread()});
    };
    window.addEventListener('notification-received', handler);
    return () => window.removeEventListener('notification-received', handler);
  }, [queryClient]);

  const {data: unreadCount = 0} = useUnreadNotificationCount();

  // Build filter params based on active tab
  const activeFilter = filterTabs.find(t => t.key === activeTab);
  const isReadFilter = activeTab === 'unread' ? false : undefined;
  const typeFilter = activeFilter?.types;

  const {data, isLoading} = useFilteredNotifications(
    page,
    20,
    typeFilter,
    isReadFilter,
    true
  );

  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  const notifications = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const route = getNotificationRoute(notification);
    if (route) {
      router.push(route);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="row-between">
          <div>
            <h1 className="text-xl font-bold text-foreground skeuo-emboss">Notifications</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent-700 hover:text-accent-800 hover:bg-accent-50 rounded-lg transition-colors cursor-pointer"
            >
              <CheckCheck className="h-4 w-4"/>
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-main)]">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(0);
              }}
              className={cn(
                'px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
                activeTab === tab.key
                  ? 'text-accent-700 border-b-2 border-accent-700'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="skeuo-card rounded-lg overflow-hidden border border-[var(--border-main)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-accent-500"/>
              <span className="ml-2 text-sm text-[var(--text-muted)]">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="h-10 w-10 text-[var(--text-muted)] opacity-30 mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-main)]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex items-start gap-4 px-4 py-4 transition-colors cursor-pointer',
                    !notification.isRead
                      ? 'bg-accent-50/50 dark:bg-accent-900/10 hover:bg-accent-50 dark:hover:bg-accent-900/20'
                      : 'hover:bg-[var(--bg-surface)]',
                    getPriorityStyles(notification.priority, notification.isRead)
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                    !notification.isRead
                      ? 'bg-accent-100 dark:bg-accent-900/30'
                      : 'bg-[var(--bg-surface)]'
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'text-sm text-[var(--text-primary)] truncate',
                        !notification.isRead ? 'font-semibold' : 'font-medium'
                      )}>
                        {notification.title}
                      </p>
                      {notification.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-danger-100 text-danger-700 rounded">
                          Urgent
                        </span>
                      )}
                      {notification.priority === 'HIGH' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-warning-100 text-warning-700 rounded">
                          High
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {addSuffix: true})}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {!notification.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(notification.id)}
                        className="p-1.5 text-accent-600 hover:text-accent-800 hover:bg-accent-50 rounded transition-colors cursor-pointer"
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4"/>
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]"/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-[var(--border-main)]">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
