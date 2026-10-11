import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Notification} from '@/lib/types/core/notifications';
import {NotificationDropdown} from './NotificationDropdown';

const markReadMutate = vi.fn();

const persisted: Notification[] = [
  {
    id: 'n-1',
    userId: 'u-1',
    type: 'ANNOUNCEMENT' as Notification['type'],
    title: 'Town hall moved',
    message: 'Now at 4pm',
    actionUrl: '/announcements',
    isRead: false,
    priority: 'NORMAL' as Notification['priority'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

vi.mock('@/lib/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    unreadCount: 0,
    notifications: [],
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/queries/useNotifications', () => ({
  useNotificationInbox: () => ({data: persisted, isLoading: false}),
  useUnreadNotificationCount: () => ({data: 1}),
  useMarkNotificationAsRead: () => ({mutate: markReadMutate}),
  useMarkAllNotificationsAsRead: () => ({mutate: vi.fn()}),
}));

vi.mock('@/lib/hooks/usePermissions', () => ({
  Permissions: {NOTIFICATION_VIEW: 'NOTIFICATION:VIEW'},
  usePermissions: () => ({hasPermission: () => true, isReady: true}),
}));

vi.mock('@/lib/utils/googleToken', () => ({
  getGoogleToken: () => null,
}));

describe('NotificationDropdown', () => {
  beforeEach(() => {
    markReadMutate.mockClear();
  });

  it('renders the source switcher as an accessible tablist', () => {
    render(<NotificationDropdown isOpen onClose={vi.fn()}/>);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /system/i})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', {name: /google/i})).toHaveAttribute('aria-selected', 'false');
  });

  it('makes notification rows keyboard operable buttons', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NotificationDropdown isOpen onClose={onClose}/>);

    const row = screen.getByRole('button', {name: /town hall moved/i});
    expect(row.closest('[role="listitem"]')).not.toBeNull();

    row.focus();
    expect(row).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(markReadMutate).toHaveBeenCalledWith('n-1');
    expect(onClose).toHaveBeenCalled();
  });
});
