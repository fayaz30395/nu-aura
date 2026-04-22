'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  Award,
  Bell,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Gift,
  HardDrive,
  Info,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Shield,
  Users as UsersIcon,
  Video,
  X,
} from 'lucide-react';
import Image from 'next/image';
import {cn} from '@/lib/utils';
import {formatDistanceToNow} from 'date-fns';
import {useWebSocket} from '@/lib/contexts/WebSocketContext';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotificationInbox,
  useUnreadNotificationCount,
} from '@/lib/hooks/queries/useNotifications';
import {getGoogleToken} from '@/lib/utils/googleToken';
import {Button} from '@/components/ui/Button';
import {getNotificationRoute} from '@/lib/utils/notificationRoutes';
import {sanitizeEmailHtml} from '@/lib/utils/sanitize';
import {createLogger} from '@/lib/utils/logger';
import {safeWindowOpen} from '@/lib/utils/url';

const logger = createLogger('NotificationDropdown');

// ─── Types ────────────────────────────────────────────────────────────
export interface GoogleNotification {
  id: string;
  type: 'email' | 'drive' | 'calendar';
  title: string;
  subtitle: string;
  timestamp: Date;
  link?: string;
  isUnread?: boolean;
  hasVideo?: boolean;
  calendarEvent?: {
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    hangoutLink?: string;
    htmlLink?: string;
    attendees?: { email: string; displayName?: string; responseStatus?: string }[];
    organizer?: { email: string; displayName?: string };
  };
  emailData?: {
    id: string;
    threadId: string;
    from: string;
    subject: string;
    snippet?: string;
  };
  driveFile?: {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  };
}

// ─── Props ────────────────────────────────────────────────────────────
export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

function getNotificationIcon(type: 'email' | 'drive' | 'calendar'): React.ReactNode {
  switch (type) {
    case 'email':
      return <Mail className='h-4 w-4 text-status-danger-text'/>;
    case 'drive':
      return <HardDrive className='h-4 w-4 text-status-warning-text'/>;
    case 'calendar':
      return <Calendar className='h-4 w-4 text-accent'/>;
  }
}

function getNotificationBg(type: 'email' | 'drive' | 'calendar'): string {
  switch (type) {
    case 'email':
      return "bg-status-danger-bg";
    case 'drive':
      return "bg-status-warning-bg";
    case 'calendar':
      return "bg-accent-subtle";
  }
}

function getSystemNotificationIcon(type: string): React.ReactNode {
  switch (type) {
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
    case 'LEAVE_PENDING':
      return <FileText className='h-4 w-4 text-accent'/>;
    case 'EXPENSE_APPROVED':
    case 'EXPENSE_REJECTED':
      return <DollarSign className='h-4 w-4 text-status-success-text'/>;
    case 'ATTENDANCE_MARKED':
    case 'ATTENDANCE_ALERT':
      return <Clock className='h-4 w-4 text-status-warning-text'/>;
    case 'PAYROLL_GENERATED':
      return <DollarSign className='h-4 w-4 text-status-success-text'/>;
    case 'ANNOUNCEMENT':
      return <Megaphone className='h-4 w-4 text-accent'/>;
    case 'BIRTHDAY':
    case 'ANNIVERSARY':
      return <Gift className='h-4 w-4 text-accent'/>;
    case 'PERFORMANCE_REVIEW_DUE':
      return <Award className='h-4 w-4 text-status-warning-text'/>;
    case 'ROLE_UPDATED':
      return <Shield className='h-4 w-4 text-accent'/>;
    case 'SYSTEM_ALERT':
      return <Info className='h-4 w-4 text-status-danger-text'/>;
    default:
      return <ClipboardCheck className='h-4 w-4 text-accent'/>;
  }
}

function getPreviewUrl(file: { id: string; mimeType: string }): string {
  const mimeType = file.mimeType;
  if (mimeType === 'application/vnd.google-apps.document') return `https://docs.google.com/document/d/${file.id}/preview`;
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return `https://docs.google.com/spreadsheets/d/${file.id}/preview`;
  if (mimeType === 'application/vnd.google-apps.presentation') return `https://docs.google.com/presentation/d/${file.id}/preview`;
  if (mimeType === 'application/pdf') return `https://drive.google.com/file/d/${file.id}/preview`;
  if (mimeType?.startsWith('image/')) return `https://drive.google.com/uc?id=${file.id}`;
  if (mimeType?.startsWith('video/')) return `https://drive.google.com/file/d/${file.id}/preview`;
  return `https://drive.google.com/file/d/${file.id}/preview`;
}

// ─── NotificationDropdown ─────────────────────────────────────────────
/**
 * Notification inbox dropdown used inside Header.
 * Renders two tabs: Google (email, drive, calendar) and System (REST + WebSocket).
 * Google API calls are deferred until the panel is first opened.
 */
export function NotificationDropdown({isOpen, onClose}: NotificationDropdownProps) {
  const router = useRouter();
  const {
    unreadCount: wsUnreadCount,
    notifications: wsNotifications,
    markAsRead: wsMarkAsRead,
    markAllAsRead: wsMarkAllAsRead
  } = useWebSocket();

  const {data: persistedNotifications = [], isLoading: notificationsLoading} = useNotificationInbox(10);
  const {data: persistedUnreadCount = 0} = useUnreadNotificationCount();
  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  const [googleNotifications, setGoogleNotifications] = useState<GoogleNotification[]>([]);
  const [googleNotificationsLoading, setGoogleNotificationsLoading] = useState(false);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'system' | 'google'>('google');

  // Modal states for inline actions
  const [selectedEvent, setSelectedEvent] = useState<GoogleNotification | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GoogleNotification | null>(null);
  const [selectedFile, setSelectedFile] = useState<GoogleNotification | null>(null);
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailLoading, setEmailLoading] = useState(false);

  const loadGoogleNotifications = useCallback(async () => {
    const token = getGoogleToken();
    if (!token) {
      setHasGoogleToken(false);
      return;
    }

    setHasGoogleToken(true);
    setGoogleNotificationsLoading(true);

    const allNotifications: GoogleNotification[] = [];

    try {
      const emailResponse = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread',
        {headers: {Authorization: `Bearer ${token}`}}
      );
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.messages) {
          for (const msg of emailData.messages.slice(0, 3)) {
            const detailResponse = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
              {headers: {Authorization: `Bearer ${token}`}}
            );
            if (detailResponse.ok) {
              const detail = await detailResponse.json();

              interface EmailHeader {
                name: string;
                value: string;
              }

              const fromHeader = detail.payload?.headers?.find((h: EmailHeader) => h.name === 'From');
              const subjectHeader = detail.payload?.headers?.find((h: EmailHeader) => h.name === 'Subject');
              allNotifications.push({
                id: `email-${msg.id}`,
                type: 'email',
                title: subjectHeader?.value || 'No Subject',
                subtitle: fromHeader?.value?.split('<')[0]?.trim() || 'Unknown Sender',
                timestamp: new Date(parseInt(detail.internalDate)),
                isUnread: true,
                emailData: {
                  id: msg.id,
                  threadId: msg.threadId,
                  from: fromHeader?.value || '',
                  subject: subjectHeader?.value || 'No Subject',
                  snippet: detail.snippet,
                },
              });
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error loading emails:', err);
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=sharedWithMe=true and modifiedTime>'${sevenDaysAgo.toISOString()}'` +
        `&fields=files(id,name,mimeType,modifiedTime,sharingUser,webViewLink)` +
        `&orderBy=modifiedTime desc&pageSize=5`,
        {headers: {Authorization: `Bearer ${token}`}}
      );
      if (driveResponse.ok) {
        const driveData = await driveResponse.json();
        if (driveData.files) {
          for (const file of driveData.files.slice(0, 3)) {
            allNotifications.push({
              id: `drive-${file.id}`,
              type: 'drive',
              title: file.name,
              subtitle: file.sharingUser?.displayName ? `Shared by ${file.sharingUser.displayName}` : 'Shared with you',
              timestamp: new Date(file.modifiedTime),
              link: file.webViewLink,
              driveFile: {id: file.id, name: file.name, mimeType: file.mimeType, webViewLink: file.webViewLink},
            });
          }
        }
      }
    } catch (err) {
      logger.error('Error loading drive files:', err);
    }

    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${tomorrow.toISOString()}` +
        `&singleEvents=true&orderBy=startTime&maxResults=5`,
        {headers: {Authorization: `Bearer ${token}`}}
      );
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        if (calendarData.items) {
          for (const event of calendarData.items.slice(0, 3)) {
            const startTime = event.start?.dateTime || event.start?.date;
            allNotifications.push({
              id: `calendar-${event.id}`,
              type: 'calendar',
              title: event.summary || 'Untitled Event',
              subtitle: startTime
                ? new Date(startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})
                : 'All day',
              timestamp: startTime ? new Date(startTime) : new Date(),
              link: event.htmlLink,
              hasVideo: !!event.hangoutLink,
              calendarEvent: {
                id: event.id,
                summary: event.summary || 'Untitled Event',
                description: event.description,
                start: event.start,
                end: event.end,
                location: event.location,
                hangoutLink: event.hangoutLink,
                htmlLink: event.htmlLink,
                attendees: event.attendees,
                organizer: event.organizer,
              },
            });
          }
        }
      }
    } catch (err) {
      logger.error('Error loading calendar events:', err);
    }

    allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setGoogleNotifications(allNotifications.slice(0, 8));
    setGoogleNotificationsLoading(false);
  }, []);

  // Defer Google API calls — only load when notification panel is first opened
  const googleNotificationsLoadedRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !googleNotificationsLoadedRef.current) {
      googleNotificationsLoadedRef.current = true;
      loadGoogleNotifications();
    }
  }, [isOpen, loadGoogleNotifications]);

  const loadEmailContent = async (messageId: string) => {
    const token = getGoogleToken();
    if (!token) return;
    setEmailLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        {headers: {Authorization: `Bearer ${token}`}}
      );
      if (response.ok) {
        const data = await response.json();
        let content = '';
        const parts = data.payload?.parts || [data.payload];
        for (const part of parts) {
          if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
            const body = part.body?.data;
            if (body) {
              content = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
              break;
            }
          }
        }
        setEmailContent(content || data.snippet || 'No content available');
      }
    } catch (err) {
      logger.error('Error loading email content:', err);
      setEmailContent('Failed to load email content');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleNotificationClick = (notification: GoogleNotification) => {
    onClose();
    if (notification.type === 'email') {
      setSelectedEmail(notification);
      if (notification.emailData?.id) loadEmailContent(notification.emailData.id);
    } else if (notification.type === 'drive') {
      setSelectedFile(notification);
    } else if (notification.type === 'calendar') {
      setSelectedEvent(notification);
    }
  };

  const systemUnreadCount = Math.max(wsUnreadCount, persistedUnreadCount);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="notification-dropdown absolute right-0 mt-2 w-80 sm:w-96 rounded-xl glass-midnight animate-fade-in-down overflow-hidden z-50">
        {/* Tabs */}
        <div className="flex border-b border-[var(--dropdown-divider)]">
          <button
            onClick={() => setNotificationTab('google')}
            className={cn(
              "flex-1 px-4 py-4 text-sm font-medium transition-all duration-200",
              notificationTab === 'google'
                ? 'text-accent border-b-2 border-[var(--accent-primary)]'
                : "text-[var(--dropdown-text-secondary)] hover:text-[var(--dropdown-text)]"
            )}
          >
            Google
            {googleNotifications.length > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 text-xs bg-[var(--accent-500)]/15 text-accent rounded-full">
                {googleNotifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setNotificationTab('system')}
            className={cn(
              "flex-1 px-4 py-4 text-sm font-medium transition-all duration-200",
              notificationTab === 'system'
                ? 'text-accent border-b-2 border-[var(--accent-primary)]'
                : "text-[var(--dropdown-text-secondary)] hover:text-[var(--dropdown-text)]"
            )}
          >
            System
            {systemUnreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-[var(--accent-500)]/20 text-accent rounded-full">
                {systemUnreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {notificationTab === 'google' ? (
            <>
              {!hasGoogleToken ? (
                <div className="p-6 text-center">
                  <div
                    className='w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4'>
                    <Bell className='h-6 w-6 text-muted'/>
                  </div>
                  <p className='text-sm text-muted mb-4'>Connect Google to see emails, drive files & events</p>
                  <Button variant="outline" size="sm" onClick={() => {
                    onClose();
                    router.push('/nu-mail');
                  }}>
                    Connect Google
                  </Button>
                </div>
              ) : googleNotificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className='h-6 w-6 animate-spin text-accent'/>
                </div>
              ) : googleNotifications.length === 0 ? (
                <div className='p-8 text-center text-muted'>
                  <CheckCircle className='h-10 w-10 mx-auto mb-4 text-status-success-text'/>
                  <p>All caught up!</p>
                </div>
              ) : (
                <div className='divide-y divide-surface-100'>
                  {googleNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleGoogleNotificationClick(notification)}
                      className={cn(
                        'flex gap-4 p-4 hover:bg-base transition-colors cursor-pointer',
                        getNotificationBg(notification.type)
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg bg-[var(--bg-input)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-card)]">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className='text-sm font-medium text-primary truncate'>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className='text-xs text-muted truncate'>
                            {notification.subtitle}
                          </p>
                          {notification.hasVideo && (
                            <Video className='h-3 w-3 text-accent flex-shrink-0'/>
                          )}
                        </div>
                      </div>
                      <span className='text-xs text-muted flex-shrink-0'>
                        {notification.type === 'calendar' ? notification.subtitle : formatRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                  ))}
                  {/* Quick Links */}
                  <div className='flex gap-2 p-4 bg-base'>
                    <button
                      onClick={() => {
                        onClose();
                        router.push('/nu-mail');
                      }}
                      className='flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-secondary hover:bg-surface rounded-lg transition-colors'
                    >
                      <Mail className="h-3 w-3"/> Mail
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        router.push('/nu-drive');
                      }}
                      className='flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-secondary hover:bg-surface rounded-lg transition-colors'
                    >
                      <HardDrive className="h-3 w-3"/> Drive
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        router.push('/nu-calendar');
                      }}
                      className='flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-secondary hover:bg-surface rounded-lg transition-colors'
                    >
                      <Calendar className="h-3 w-3"/> Calendar
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // System Notifications
            (<>
              <div className='row-between p-4 border-b border-subtle'>
                <span className='text-xs text-muted'>System Alerts</span>
                {systemUnreadCount > 0 && (
                  <button
                    onClick={() => {
                      markAllReadMutation.mutate();
                      wsMarkAllAsRead();
                    }}
                    className='text-xs font-medium text-accent hover:text-accent'
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className='h-6 w-6 animate-spin text-accent'/>
                </div>
              ) : persistedNotifications.length === 0 && wsNotifications.length === 0 ? (
                <div className='p-8 text-center text-muted'>
                  <Bell className="h-10 w-10 mx-auto mb-4 opacity-20"/>
                  <p>No system notifications</p>
                </div>
              ) : (
                <div className='divide-y divide-surface-100'>
                  {wsNotifications.filter(n => !n.read).map((notification, index) => (
                    <div
                      key={`ws-${index}`}
                      onClick={() => {
                        wsMarkAsRead(index);
                        onClose();
                        router.push(getNotificationRoute(notification));
                      }}
                      className="flex gap-2 p-4 hover:bg-base transition-colors cursor-pointer bg-[var(--accent-50)]/50"
                    >
                      <div
                        className='flex-shrink-0 w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center'>
                        {getSystemNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className='text-sm font-semibold text-primary truncate'>{notification.title}</p>
                        <p
                          className='text-sm text-secondary mt-0.5 line-clamp-2'>{notification.message}</p>
                        <p className='text-xs text-muted mt-1'>
                          {formatDistanceToNow(notification.timestamp, {addSuffix: true})}
                        </p>
                      </div>
                    </div>
                  ))}
                  {persistedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.isRead) markReadMutation.mutate(notification.id);
                        onClose();
                        if (notification.actionUrl) router.push(notification.actionUrl);
                      }}
                      className={cn(
                        'flex gap-2 p-4 hover:bg-base transition-colors cursor-pointer',
                        !notification.isRead && "bg-[var(--accent-50)]/50"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                        !notification.isRead ? 'bg-accent-subtle' : 'bg-surface'
                      )}>
                        {getSystemNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium text-primary truncate',
                          !notification.isRead && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p
                          className='text-sm text-secondary mt-0.5 line-clamp-2'>{notification.message}</p>
                        <p className='text-xs text-muted mt-1'>
                          {formatDistanceToNow(new Date(notification.createdAt), {addSuffix: true})}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* View All footer */}
              <div className='border-t border-subtle p-2'>
                <button
                  onClick={() => {
                    onClose();
                    router.push('/notifications');
                  }}
                  className='w-full text-center text-xs font-medium text-accent hover:text-accent py-2 rounded hover:bg-base transition-colors cursor-pointer'
                >
                  View all notifications
                </button>
              </div>
            </>)
          )}
        </div>
      </div>
      {/* Calendar Event Modal */}
      {selectedEvent && selectedEvent.calendarEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--bg-overlay)] cursor-pointer"
               onClick={() => setSelectedEvent(null)}/>
          <div
            className="relative bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-elevated)] max-w-lg w-full max-h-[80vh] overflow-hidden animate-fade-in-down">
            <div className="bg-gradient-to-r from-accent-500 to-accent-600 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className='h-6 w-6 text-inverse'/>
                  <h3 className='text-xl font-semibold text-inverse'>{selectedEvent.calendarEvent.summary}</h3>
                </div>
                <button onClick={() => setSelectedEvent(null)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X className='h-5 w-5 text-inverse'/>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="flex items-start gap-2">
                <Clock className='h-5 w-5 text-muted mt-0.5'/>
                <div>
                  <p className='text-sm font-medium text-primary'>
                    {selectedEvent.calendarEvent.start.dateTime
                      ? new Date(selectedEvent.calendarEvent.start.dateTime).toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })
                      : new Date(selectedEvent.calendarEvent.start.date!).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                  </p>
                  {selectedEvent.calendarEvent.end.dateTime && (
                    <p className='text-xs text-muted mt-0.5'>
                      to {new Date(selectedEvent.calendarEvent.end.dateTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                    </p>
                  )}
                </div>
              </div>
              {selectedEvent.calendarEvent.location && (
                <div className="flex items-start gap-2">
                  <MapPin className='h-5 w-5 text-muted mt-0.5'/>
                  <p
                    className='text-sm text-secondary'>{selectedEvent.calendarEvent.location}</p>
                </div>
              )}
              {selectedEvent.calendarEvent.hangoutLink && (
                <div className="flex items-start gap-2">
                  <Video className='h-5 w-5 text-accent mt-0.5'/>
                  <a href={selectedEvent.calendarEvent.hangoutLink} target="_blank" rel="noopener noreferrer"
                     className='text-sm text-accent hover:text-accent hover:underline'>
                    Join Google Meet
                  </a>
                </div>
              )}
              {selectedEvent.calendarEvent.description && (
                <div className='pt-4 border-t border-subtle'>
                  <p
                    className='text-sm text-secondary whitespace-pre-wrap'>{selectedEvent.calendarEvent.description}</p>
                </div>
              )}
              {selectedEvent.calendarEvent.attendees && selectedEvent.calendarEvent.attendees.length > 0 && (
                <div className='pt-4 border-t border-subtle'>
                  <div className="flex items-center gap-2 mb-2">
                    <UsersIcon className='h-4 w-4 text-muted'/>
                    <span className='text-sm font-medium text-secondary'>
                      Attendees ({selectedEvent.calendarEvent.attendees.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedEvent.calendarEvent.attendees.slice(0, 5).map((attendee, idx) => (
                      <div key={idx} className="row-between text-xs">
                        <span
                          className='text-secondary'>{attendee.displayName || attendee.email}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs",
                          attendee.responseStatus === 'accepted' && 'bg-status-success-bg text-status-success-text',
                          attendee.responseStatus === 'declined' && 'bg-status-danger-bg text-status-danger-text',
                          attendee.responseStatus === 'tentative' && 'bg-status-warning-bg text-status-warning-text',
                          attendee.responseStatus === 'needsAction' && 'bg-surface text-secondary'
                        )}>
                          {attendee.responseStatus === 'needsAction' ? 'Pending' : attendee.responseStatus}
                        </span>
                      </div>
                    ))}
                    {selectedEvent.calendarEvent.attendees.length > 5 && (
                      <p
                        className='text-xs text-muted'>+{selectedEvent.calendarEvent.attendees.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div
              className='px-6 py-4 bg-base border-t border-subtle flex gap-4'>
              {selectedEvent.calendarEvent.hangoutLink && (
                <Button onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.hangoutLink, '_blank')}
                        className='flex-1 bg-accent hover:bg-accent text-inverse'>
                  <Video className="h-4 w-4 mr-2"/> Join Meeting
                </Button>
              )}
              <Button variant="outline" onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.htmlLink, '_blank')}
                      className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2"/> Open in Calendar
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Email Preview Modal */}
      {selectedEmail && selectedEmail.emailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--bg-overlay)] cursor-pointer" onClick={() => {
            setSelectedEmail(null);
            setEmailContent('');
          }}/>
          <div
            className="relative bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-elevated)] max-w-2xl w-full max-h-[80vh] overflow-hidden animate-fade-in-down">
            <div className="bg-gradient-to-r from-danger-500 to-danger-600 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Mail className='h-6 w-6 text-inverse'/>
                  <div>
                    <h3
                      className='text-xl font-semibold text-inverse line-clamp-1'>{selectedEmail.emailData.subject}</h3>
                    <p className="text-sm text-white/80 mt-0.5">From: {selectedEmail.emailData.from}</p>
                  </div>
                </div>
                <button onClick={() => {
                  setSelectedEmail(null);
                  setEmailContent('');
                }} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X className='h-5 w-5 text-inverse'/>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {emailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className='h-8 w-8 animate-spin text-accent'/>
                </div>
              ) : emailContent.includes('<') ? (
                <div className="prose dark:prose-invert prose-sm max-w-none"
                     dangerouslySetInnerHTML={{__html: sanitizeEmailHtml(emailContent)}}/>
              ) : (
                <p className='text-sm text-secondary whitespace-pre-wrap'>
                  {emailContent || selectedEmail.emailData.snippet}
                </p>
              )}
            </div>
            <div
              className='px-6 py-4 bg-base border-t border-subtle flex gap-4'>
              <Button
                onClick={() => safeWindowOpen(`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.emailData!.threadId}`, '_blank')}
                className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2"/> Open in Gmail
              </Button>
              <Button variant="outline" onClick={() => router.push('/nu-mail')}>Go to Nu-Mail</Button>
            </div>
          </div>
        </div>
      )}
      {/* Drive File Preview Modal */}
      {selectedFile && selectedFile.driveFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--bg-overlay)] cursor-pointer"
               onClick={() => setSelectedFile(null)}/>
          <div
            className="relative bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-elevated)] max-w-4xl w-full max-h-[85vh] overflow-hidden animate-fade-in-down">
            <div className="bg-gradient-to-r from-warning-500 to-warning-600 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className='h-6 w-6 text-inverse'/>
                  <h3 className='text-xl font-semibold text-inverse line-clamp-1'>{selectedFile.driveFile.name}</h3>
                </div>
                <button onClick={() => setSelectedFile(null)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X className='h-5 w-5 text-inverse'/>
                </button>
              </div>
            </div>
            <div className='bg-surface'>
              {selectedFile.driveFile.mimeType?.startsWith('image/') ? (
                <div className="flex items-center justify-center p-4 max-h-[60vh] overflow-hidden">
                  <Image
                    src={`https://drive.google.com/uc?id=${selectedFile.driveFile.id}`}
                    alt={selectedFile.driveFile.name}
                    width={800}
                    height={600}
                    className="max-w-full max-h-[55vh] object-contain rounded-lg"
                    style={{width: '100%', height: 'auto'}}
                    unoptimized
                  />
                </div>
              ) : (
                <iframe
                  src={getPreviewUrl(selectedFile.driveFile)!}
                  className="w-full h-[60vh] border-0"
                  title={selectedFile.driveFile.name}
                />
              )}
            </div>
            <div
              className='px-6 py-4 bg-base border-t border-subtle flex gap-4'>
              <Button onClick={() => safeWindowOpen(selectedFile.driveFile!.webViewLink, '_blank')} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2"/> Open in Drive
              </Button>
              <Button variant="outline" onClick={() => router.push('/nu-drive')}>Go to Nu-Drive</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Exported badge counts helper used by Header ──────────────────────
export function useNotificationCounts() {
  const {unreadCount: wsUnreadCount} = useWebSocket();
  const {data: persistedUnreadCount = 0} = useUnreadNotificationCount();
  const systemUnreadCount = Math.max(wsUnreadCount, persistedUnreadCount);
  return {systemUnreadCount};
}
