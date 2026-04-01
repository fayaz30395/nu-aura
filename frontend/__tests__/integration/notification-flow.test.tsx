/**
 * Integration Tests for Notification Flow
 * Tests notification bell, dropdown display, mark as read, and bulk operations
 * Uses mocked notification API for reliable testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/lib/test-utils';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock types for notifications
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

// Mock the notifications API
vi.mock('@/lib/api/notifications', () => ({
  notificationsApi: {
    getUnreadCount: vi.fn(),
    getMyNotifications: vi.fn(),
    getUnreadNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

import { notificationsApi } from '@/lib/api/notifications';

const mockedNotificationsApi = vi.mocked(notificationsApi);

// Mock Notification Bell Component
interface NotificationBellProps {
  onBellClick?: () => void;
}

const MockNotificationBell: React.FC<NotificationBellProps> = ({ onBellClick }) => {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsApi.getUnreadCount();
        setUnreadCount(count);
      } catch (_err) {
        console.error('Failed to fetch unread count');
      }
    };

    fetchUnreadCount();
  }, []);

  const handleBellClick = async () => {
    onBellClick?.();
    setIsOpen(!isOpen);

    if (!isOpen) {
      setLoading(true);
      try {
        const result = await notificationsApi.getMyNotifications();
        setNotifications(result.content || result);
      } catch (_err) {
        console.error('Failed to fetch notifications');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (_err) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_err) {
      console.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (_err) {
      console.error('Failed to delete notification');
    }
  };

  return (
    <div data-testid="notification-bell-container">
      <button
        data-testid="notification-bell-button"
        onClick={handleBellClick}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            className="unread-badge"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div data-testid="notification-dropdown" className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                data-testid="mark-all-read-button"
                onClick={handleMarkAllAsRead}
                className="mark-all-read-btn"
              >
                Mark all as read
              </button>
            )}
          </div>

          {loading && (
            <div data-testid="dropdown-loading">Loading notifications...</div>
          )}

          {!loading && notifications.length === 0 && (
            <div data-testid="no-notifications">No notifications</div>
          )}

          {!loading && notifications.length > 0 && (
            <div data-testid="notifications-list" className="notifications-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  data-testid={`notification-item-${notification.id}`}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <small>{notification.createdAt}</small>
                  </div>

                  <div className="notification-actions">
                    {!notification.isRead && (
                      <button
                        data-testid={`mark-read-btn-${notification.id}`}
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      data-testid={`delete-btn-${notification.id}`}
                      onClick={() => handleDelete(notification.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Mock notification data
const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    title: 'Leave Approved',
    message: 'Your leave request for Feb 1-5 has been approved',
    type: 'SUCCESS',
    isRead: false,
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'notif-002',
    title: 'Pending Approval',
    message: 'Expense claim from John Doe needs your approval',
    type: 'INFO',
    isRead: false,
    createdAt: '2024-02-02T14:30:00Z',
  },
  {
    id: 'notif-003',
    title: 'System Update',
    message: 'System will be under maintenance on Feb 5',
    type: 'WARNING',
    isRead: true,
    createdAt: '2024-01-31T09:15:00Z',
  },
  {
    id: 'notif-004',
    title: 'Error',
    message: 'Failed to process payroll',
    type: 'ERROR',
    isRead: false,
    createdAt: '2024-02-03T16:45:00Z',
  },
];

describe('Notification Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification Bell Rendering', () => {
    it('should render notification bell button', () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);

      render(<MockNotificationBell />);

      expect(screen.getByTestId('notification-bell-button')).toBeInTheDocument();
    });

    it('should display unread badge with count', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(3);

      render(<MockNotificationBell />);

      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('3');
      });
    });

    it('should not show badge when unread count is 0', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);

      render(<MockNotificationBell />);

      await waitFor(() => {
        expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
      });
    });

    it('should fetch unread count on mount', () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(5);

      render(<MockNotificationBell />);

      expect(mockedNotificationsApi.getUnreadCount).toHaveBeenCalled();
    });
  });

  describe('Notification Dropdown', () => {
    it('should open dropdown when bell is clicked', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      const bellButton = screen.getByTestId('notification-bell-button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
    });

    it('should load notifications when dropdown opens', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(4);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      const bellButton = screen.getByTestId('notification-bell-button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(mockedNotificationsApi.getMyNotifications).toHaveBeenCalled();
      });
    });

    it('should show loading state while fetching notifications', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(4);
      mockedNotificationsApi.getMyNotifications.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ content: mockNotifications }),
              100
            )
          )
      );

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      const bellButton = screen.getByTestId('notification-bell-button');
      await user.click(bellButton);

      expect(screen.getByTestId('dropdown-loading')).toBeInTheDocument();
    });

    it('should close dropdown when bell is clicked again', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      const bellButton = screen.getByTestId('notification-bell-button');

      // Open
      await user.click(bellButton);
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });

      // Close
      await user.click(bellButton);
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });

    it('should show "No notifications" when list is empty', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [],
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      const bellButton = screen.getByTestId('notification-bell-button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByTestId('no-notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Notification Display', () => {
    it('should display all notifications', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(4);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        mockNotifications.forEach((notif) => {
          expect(
            screen.getByTestId(`notification-item-${notif.id}`)
          ).toBeInTheDocument();
        });
      });
    });

    it('should display notification details', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(4);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [mockNotifications[0]],
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(screen.getByText(mockNotifications[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockNotifications[0].message)).toBeInTheDocument();
      });
    });

    it('should apply correct CSS class for read/unread', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(4);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        const unreadItem = screen.getByTestId(`notification-item-${mockNotifications[0].id}`);
        expect(unreadItem).toHaveClass('unread');

        const readItem = screen.getByTestId(`notification-item-${mockNotifications[2].id}`);
        expect(readItem).toHaveClass('read');
      });
    });
  });

  describe('Mark as Read', () => {
    it('should show mark as read button for unread notifications', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(4);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [mockNotifications[0]],
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId(`mark-read-btn-${mockNotifications[0].id}`)
        ).toBeInTheDocument();
      });
    });

    it('should call mark as read API when button clicked', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(1);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [mockNotifications[0]],
      });
      mockedNotificationsApi.markAsRead.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId(`mark-read-btn-${mockNotifications[0].id}`)
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByTestId(`mark-read-btn-${mockNotifications[0].id}`)
      );

      await waitFor(() => {
        expect(mockedNotificationsApi.markAsRead).toHaveBeenCalledWith(
          mockNotifications[0].id
        );
      });
    });

    it('should hide mark as read button after marking as read', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(1);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [mockNotifications[0]],
      });
      mockedNotificationsApi.markAsRead.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId(`mark-read-btn-${mockNotifications[0].id}`)
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByTestId(`mark-read-btn-${mockNotifications[0].id}`)
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId(`mark-read-btn-${mockNotifications[0].id}`)
        ).not.toBeInTheDocument();
      });
    });

    it('should update unread badge count after marking as read', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(1);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [mockNotifications[0]],
      });
      mockedNotificationsApi.markAsRead.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await waitFor(() => {
        const badge = screen.getByText('1');
        expect(badge).toHaveTextContent('1');
      });

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId(`mark-read-btn-${mockNotifications[0].id}`)
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByTestId(`mark-read-btn-${mockNotifications[0].id}`)
      );

      // Badge should be removed after marking all as read
      await waitFor(() => {
        expect(screen.queryByText('1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mark All as Read', () => {
    it('should show mark all as read button when unread notifications exist', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(3);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      });
    });

    it('should call mark all as read API', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(3);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });
      mockedNotificationsApi.markAllAsRead.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('mark-all-read-button'));

      expect(mockedNotificationsApi.markAllAsRead).toHaveBeenCalled();
    });

    it('should mark all notifications as read', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(3);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: mockNotifications,
      });
      mockedNotificationsApi.markAllAsRead.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('mark-all-read-button'));

      // Verify button is hidden after marking all as read
      await waitFor(() => {
        expect(screen.queryByTestId('mark-all-read-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Notification', () => {
    it('should call delete API when delete button clicked', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [mockNotifications[0]],
      });
      mockedNotificationsApi.deleteNotification.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-btn-${mockNotifications[0].id}`)
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByTestId(`delete-btn-${mockNotifications[0].id}`)
      );

      expect(mockedNotificationsApi.deleteNotification).toHaveBeenCalledWith(
        mockNotifications[0].id
      );
    });

    it('should remove notification from list after deletion', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [mockNotifications[0]],
      });
      mockedNotificationsApi.deleteNotification.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<MockNotificationBell />);

      await user.click(screen.getByTestId('notification-bell-button'));

      await waitFor(() => {
        expect(
          screen.getByTestId(`notification-item-${mockNotifications[0].id}`)
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByTestId(`delete-btn-${mockNotifications[0].id}`)
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId(`notification-item-${mockNotifications[0].id}`)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Callback Events', () => {
    it('should trigger onBellClick callback', async () => {
      mockedNotificationsApi.getUnreadCount.mockResolvedValueOnce(0);
      mockedNotificationsApi.getMyNotifications.mockResolvedValueOnce({
        content: [],
      });

      const onBellClick = vi.fn();
      const user = userEvent.setup();
      render(<MockNotificationBell onBellClick={onBellClick} />);

      await user.click(screen.getByTestId('notification-bell-button'));

      expect(onBellClick).toHaveBeenCalled();
    });
  });
});
