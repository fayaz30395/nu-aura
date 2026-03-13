'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Menu,
  HelpCircle,
  Search,
  Mail,
  HardDrive,
  Calendar,
  Video,
  ExternalLink,
  RefreshCw,
  Loader2,
  Clock,
  MapPin,
  Users as UsersIcon,
  CheckCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { cn } from '@/lib/utils';
import AppSwitcher from '../platform/AppSwitcher';
import { useDarkMode } from './DarkModeProvider';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import {
  useNotificationInbox,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/lib/hooks/queries/useNotifications';
import type { Notification as PersistedNotification } from '@/lib/types/notifications';
import { Check, X, Info, FileText, DollarSign, ClipboardCheck, Megaphone, Gift, Award, Shield } from 'lucide-react';
import { getGoogleToken } from '@/lib/utils/googleToken';
import { Button } from '@/components/ui/Button';
import { getNotificationRoute } from '@/lib/utils/notificationRoutes';
import { sanitizeEmailHtml } from '@/lib/utils/sanitize';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('Header');

interface GoogleNotification {
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

export interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  userName?: string;
  userAvatar?: string;
  userRole?: string;
  notificationCount?: number;
  onLogout?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  showMenuButton = true,
  userName = 'John Doe',
  userAvatar,
  userRole = 'Employee',
  notificationCount = 0,
  onLogout,
  onProfile,
  onSettings,
  className,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unreadCount: wsUnreadCount, notifications: wsNotifications, markAsRead: wsMarkAsRead, markAllAsRead: wsMarkAllAsRead } = useWebSocket();
  const { isDark, toggleDarkMode } = useDarkMode();

  // REST API — persisted notifications (hybrid with WebSocket)
  const { data: persistedNotifications = [], isLoading: notificationsLoading } = useNotificationInbox(10);
  const { data: persistedUnreadCount = 0 } = useUnreadNotificationCount();
  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Google Notifications State
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Google notifications
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
      // Load unread emails from Gmail
      const emailResponse = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.messages) {
          for (const msg of emailData.messages.slice(0, 3)) {
            const detailResponse = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (detailResponse.ok) {
              const detail = await detailResponse.json();
              const fromHeader = detail.payload?.headers?.find((h: any) => h.name === 'From');
              const subjectHeader = detail.payload?.headers?.find((h: any) => h.name === 'Subject');
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
      // Load shared files from Drive
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=sharedWithMe=true and modifiedTime>'${sevenDaysAgo.toISOString()}'` +
        `&fields=files(id,name,mimeType,modifiedTime,sharingUser,webViewLink)` +
        `&orderBy=modifiedTime desc&pageSize=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (driveResponse.ok) {
        const driveData = await driveResponse.json();
        if (driveData.files) {
          for (const file of driveData.files.slice(0, 3)) {
            allNotifications.push({
              id: `drive-${file.id}`,
              type: 'drive',
              title: file.name,
              subtitle: file.sharingUser?.displayName
                ? `Shared by ${file.sharingUser.displayName}`
                : 'Shared with you',
              timestamp: new Date(file.modifiedTime),
              link: file.webViewLink,
              driveFile: {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                webViewLink: file.webViewLink,
              },
            });
          }
        }
      }
    } catch (err) {
      logger.error('Error loading drive files:', err);
    }

    try {
      // Load upcoming calendar events
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${tomorrow.toISOString()}` +
        `&singleEvents=true&orderBy=startTime&maxResults=5`,
        { headers: { Authorization: `Bearer ${token}` } }
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
                ? new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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

    // Sort by timestamp
    allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setGoogleNotifications(allNotifications.slice(0, 8));
    setGoogleNotificationsLoading(false);
  }, []);

  useEffect(() => {
    loadGoogleNotifications();
  }, [loadGoogleNotifications]);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type: 'email' | 'drive' | 'calendar') => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4 text-red-500" />;
      case 'drive':
        return <HardDrive className="h-4 w-4 text-yellow-500" />;
      case 'calendar':
        return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: 'email' | 'drive' | 'calendar') => {
    switch (type) {
      case 'email':
        return 'bg-red-50 dark:bg-red-950/30';
      case 'drive':
        return 'bg-yellow-50 dark:bg-yellow-950/30';
      case 'calendar':
        return 'bg-blue-50 dark:bg-blue-950/30';
    }
  };

  /** Returns an icon component based on the notification type string. */
  const getSystemNotificationIcon = (type: string) => {
    switch (type) {
      case 'LEAVE_APPROVED':
      case 'LEAVE_REJECTED':
      case 'LEAVE_PENDING':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'EXPENSE_APPROVED':
      case 'EXPENSE_REJECTED':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'ATTENDANCE_MARKED':
      case 'ATTENDANCE_ALERT':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'PAYROLL_GENERATED':
        return <DollarSign className="h-4 w-4 text-emerald-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="h-4 w-4 text-purple-500" />;
      case 'BIRTHDAY':
      case 'ANNIVERSARY':
        return <Gift className="h-4 w-4 text-pink-500" />;
      case 'PERFORMANCE_REVIEW_DUE':
        return <Award className="h-4 w-4 text-amber-500" />;
      case 'ROLE_UPDATED':
        return <Shield className="h-4 w-4 text-indigo-500" />;
      case 'SYSTEM_ALERT':
        return <Info className="h-4 w-4 text-red-500" />;
      default:
        // approval-related or general
        return <ClipboardCheck className="h-4 w-4 text-primary-500" />;
    }
  };

  const loadEmailContent = async (messageId: string) => {
    const token = getGoogleToken();
    if (!token) return;

    setEmailLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
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
    setIsNotificationsOpen(false);
    if (notification.type === 'email') {
      setSelectedEmail(notification);
      if (notification.emailData?.id) {
        loadEmailContent(notification.emailData.id);
      }
    } else if (notification.type === 'drive') {
      setSelectedFile(notification);
    } else if (notification.type === 'calendar') {
      setSelectedEvent(notification);
    }
  };

  const getPreviewUrl = (file: { id: string; mimeType: string }): string | null => {
    const mimeType = file.mimeType;
    if (mimeType === 'application/vnd.google-apps.document') {
      return `https://docs.google.com/document/d/${file.id}/preview`;
    }
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return `https://docs.google.com/spreadsheets/d/${file.id}/preview`;
    }
    if (mimeType === 'application/vnd.google-apps.presentation') {
      return `https://docs.google.com/presentation/d/${file.id}/preview`;
    }
    if (mimeType === 'application/pdf') {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }
    if (mimeType?.startsWith('image/')) {
      return `https://drive.google.com/uc?id=${file.id}`;
    }
    if (mimeType?.startsWith('video/')) {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }
    return `https://drive.google.com/file/d/${file.id}/preview`;
  };

  // Use the larger of WebSocket in-memory count vs REST API persisted count
  // to avoid undercounting while the REST poll catches up
  const systemUnreadCount = Math.max(wsUnreadCount, persistedUnreadCount);
  const totalUnreadCount = systemUnreadCount + googleNotifications.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-dropdown')) {
        setIsDropdownOpen(false);
      }
      if (!target.closest('.notification-dropdown') && !target.closest('.notification-btn')) {
        setIsNotificationsOpen(false);
      }
    };

    if (isDropdownOpen || isNotificationsOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationsOpen]);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-surface-200/80',
        'dark:bg-surface-950/80 dark:border-surface-800/80',
        'transition-all duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2.5 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-all md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* App Switcher */}
          <div className="hidden md:block">
            <AppSwitcher />
          </div>

          {/* Global Search - Desktop */}
          <div className="hidden lg:flex">
            <GlobalSearch />
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="lg:hidden p-2.5 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Help */}
          <button
            className="hidden sm:flex p-2.5 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100 transition-all"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100 transition-all"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="notification-btn relative p-2.5 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100 transition-all"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {totalUnreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-[10px] font-bold text-white">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationsOpen && (
              <div className="notification-dropdown absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 shadow-xl shadow-surface-900/5 dark:shadow-surface-950/50 animate-fade-in-down overflow-hidden z-50">
                {/* Tabs */}
                <div className="flex border-b border-surface-100 dark:border-surface-800">
                  <button
                    onClick={() => setNotificationTab('google')}
                    className={cn(
                      "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                      notificationTab === 'google'
                        ? "text-primary-600 border-b-2 border-primary-600 dark:text-primary-400"
                        : "text-surface-500 hover:text-surface-700 dark:text-surface-300 dark:hover:text-surface-200"
                    )}
                  >
                    Google
                    {googleNotifications.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-full">
                        {googleNotifications.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setNotificationTab('system')}
                    className={cn(
                      "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                      notificationTab === 'system'
                        ? "text-primary-600 border-b-2 border-primary-600 dark:text-primary-400"
                        : "text-surface-500 hover:text-surface-700 dark:text-surface-300 dark:hover:text-surface-200"
                    )}
                  >
                    System
                    {systemUnreadCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-full">
                        {systemUnreadCount}
                      </span>
                    )}
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {notificationTab === 'google' ? (
                    // Google Notifications
                    <>
                      {!hasGoogleToken ? (
                        <div className="p-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-6 w-6 text-surface-400" />
                          </div>
                          <p className="text-sm text-surface-500 mb-3">Connect Google to see emails, drive files & events</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              router.push('/nu-mail');
                            }}
                          >
                            Connect Google
                          </Button>
                        </div>
                      ) : googleNotificationsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                        </div>
                      ) : googleNotifications.length === 0 ? (
                        <div className="p-8 text-center text-surface-500 dark:text-surface-300">
                          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
                          <p>All caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-surface-100 dark:divide-surface-800">
                          {googleNotifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => handleGoogleNotificationClick(notification)}
                              className={cn(
                                "flex gap-3 p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer",
                                getNotificationBg(notification.type)
                              )}
                            >
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-surface-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                                  {notification.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-surface-500 dark:text-surface-300 truncate">
                                    {notification.subtitle}
                                  </p>
                                  {notification.hasVideo && (
                                    <Video className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] text-surface-400 flex-shrink-0">
                                {notification.type === 'calendar' ? notification.subtitle : formatRelativeTime(notification.timestamp)}
                              </span>
                            </div>
                          ))}
                          {/* Quick Links */}
                          <div className="flex gap-2 p-3 bg-surface-50 dark:bg-surface-800/50">
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                router.push('/nu-mail');
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                            >
                              <Mail className="h-3 w-3" /> Mail
                            </button>
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                router.push('/nu-drive');
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                            >
                              <HardDrive className="h-3 w-3" /> Drive
                            </button>
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                router.push('/nu-calendar');
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                            >
                              <Calendar className="h-3 w-3" /> Calendar
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // System Notifications — hybrid: REST API (persisted) + WebSocket (real-time)
                    <>
                      <div className="flex items-center justify-between p-3 border-b border-surface-100 dark:border-surface-800">
                        <span className="text-xs text-surface-500">System Alerts</span>
                        {systemUnreadCount > 0 && (
                          <button
                            onClick={() => {
                              markAllReadMutation.mutate();
                              wsMarkAllAsRead();
                            }}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                        </div>
                      ) : persistedNotifications.length === 0 && wsNotifications.length === 0 ? (
                        <div className="p-8 text-center text-surface-500 dark:text-surface-300">
                          <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p>No system notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-surface-100 dark:divide-surface-800">
                          {/* Show WebSocket real-time notifications first (newest, not yet persisted) */}
                          {wsNotifications.filter(n => !n.read).map((notification, index) => (
                            <div
                              key={`ws-${index}`}
                              onClick={() => {
                                wsMarkAsRead(index);
                                setIsNotificationsOpen(false);
                                const route = getNotificationRoute(notification);
                                router.push(route);
                              }}
                              className="flex gap-3 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer bg-primary-50/50 dark:bg-primary-900/10"
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                {getSystemNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-surface-900 dark:text-surface-50 truncate">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-surface-600 dark:text-surface-300 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-surface-500 mt-1">
                                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                          {/* Show persisted notifications from REST API */}
                          {persistedNotifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => {
                                if (!notification.isRead) {
                                  markReadMutation.mutate(notification.id);
                                }
                                setIsNotificationsOpen(false);
                                if (notification.actionUrl) {
                                  router.push(notification.actionUrl);
                                }
                              }}
                              className={cn(
                                "flex gap-3 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer",
                                !notification.isRead && "bg-primary-50/50 dark:bg-primary-900/10"
                              )}
                            >
                              <div className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                !notification.isRead
                                  ? "bg-primary-100 dark:bg-primary-900/30"
                                  : "bg-surface-100 dark:bg-surface-800"
                              )}>
                                {getSystemNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm font-medium text-surface-900 dark:text-surface-50 truncate",
                                  !notification.isRead && "font-semibold"
                                )}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-surface-600 dark:text-surface-300 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-surface-500 mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-surface-200 dark:bg-surface-700 mx-2" />

          {/* User Dropdown */}
          <div className="relative user-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 transition-all',
                'hover:bg-surface-100 dark:hover:bg-surface-800',
                isDropdownOpen && 'bg-surface-100 dark:bg-surface-800'
              )}
            >
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-xl object-cover ring-2 ring-surface-200 dark:ring-surface-700"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-primary-200 dark:ring-primary-800">
                  {initials}
                </div>
              )}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                  {userName}
                </span>
                <span className="text-xs text-surface-500 dark:text-surface-300">
                  {userRole}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'hidden sm:block h-4 w-4 text-surface-400 transition-transform duration-200',
                  isDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 shadow-xl shadow-surface-900/5 dark:shadow-surface-950/50 animate-fade-in-down overflow-hidden">
                {/* User Info Header */}
                <div className="p-4 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                    {userName}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-300 mt-0.5">
                    {userRole}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onProfile?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800">
                      <User className="h-4 w-4 text-surface-500 dark:text-surface-300" />
                    </div>
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSettings?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800">
                      <Settings className="h-4 w-4 text-surface-500 dark:text-surface-300" />
                    </div>
                    <span>Settings</span>
                  </button>
                </div>

                <div className="border-t border-surface-100 dark:border-surface-800 p-2">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileSearchOpen(false)}
          />
          <div className="absolute top-0 left-0 right-0 bg-white dark:bg-surface-900 p-4 shadow-xl animate-fade-in-down">
            <GlobalSearch
              onSelect={() => setIsMobileSearchOpen(false)}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Calendar Event Modal */}
      {selectedEvent && selectedEvent.calendarEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-fade-in-down">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">
                    {selectedEvent.calendarEvent.summary}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Time */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-surface-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {selectedEvent.calendarEvent.start.dateTime
                      ? new Date(selectedEvent.calendarEvent.start.dateTime).toLocaleString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : new Date(selectedEvent.calendarEvent.start.date!).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                  </p>
                  {selectedEvent.calendarEvent.end.dateTime && (
                    <p className="text-xs text-surface-500 mt-0.5">
                      to {new Date(selectedEvent.calendarEvent.end.dateTime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              {selectedEvent.calendarEvent.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-surface-400 mt-0.5" />
                  <p className="text-sm text-surface-600 dark:text-surface-300">
                    {selectedEvent.calendarEvent.location}
                  </p>
                </div>
              )}

              {/* Video Link */}
              {selectedEvent.calendarEvent.hangoutLink && (
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-blue-500 mt-0.5" />
                  <a
                    href={selectedEvent.calendarEvent.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    Join Google Meet
                  </a>
                </div>
              )}

              {/* Description */}
              {selectedEvent.calendarEvent.description && (
                <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                  <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap">
                    {selectedEvent.calendarEvent.description}
                  </p>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.calendarEvent.attendees && selectedEvent.calendarEvent.attendees.length > 0 && (
                <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                  <div className="flex items-center gap-2 mb-2">
                    <UsersIcon className="h-4 w-4 text-surface-400" />
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      Attendees ({selectedEvent.calendarEvent.attendees.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedEvent.calendarEvent.attendees.slice(0, 5).map((attendee, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-surface-600 dark:text-surface-300">
                          {attendee.displayName || attendee.email}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px]",
                          attendee.responseStatus === 'accepted' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          attendee.responseStatus === 'declined' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          attendee.responseStatus === 'tentative' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                          attendee.responseStatus === 'needsAction' && "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300"
                        )}>
                          {attendee.responseStatus === 'needsAction' ? 'Pending' : attendee.responseStatus}
                        </span>
                      </div>
                    ))}
                    {selectedEvent.calendarEvent.attendees.length > 5 && (
                      <p className="text-xs text-surface-500">
                        +{selectedEvent.calendarEvent.attendees.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700 flex gap-3">
              {selectedEvent.calendarEvent.hangoutLink && (
                <Button
                  onClick={() => window.open(selectedEvent.calendarEvent!.hangoutLink, '_blank')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => window.open(selectedEvent.calendarEvent!.htmlLink, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Calendar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {selectedEmail && selectedEmail.emailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setSelectedEmail(null);
              setEmailContent('');
            }}
          />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-fade-in-down">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white line-clamp-1">
                      {selectedEmail.emailData.subject}
                    </h3>
                    <p className="text-sm text-white/80 mt-0.5">
                      From: {selectedEmail.emailData.from}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmail(null);
                    setEmailContent('');
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {emailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : emailContent.includes('<') ? (
                <div
                  className="prose dark:prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(emailContent) }}
                />
              ) : (
                <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap">
                  {emailContent || selectedEmail.emailData.snippet}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700 flex gap-3">
              <Button
                onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.emailData!.threadId}`, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Gmail
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/nu-mail')}
              >
                Go to Nu-Mail
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drive File Preview Modal */}
      {selectedFile && selectedFile.driveFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedFile(null)}
          />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-fade-in-down">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white line-clamp-1">
                    {selectedFile.driveFile.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-surface-100 dark:bg-surface-800">
              {selectedFile.driveFile.mimeType?.startsWith('image/') ? (
                <div className="flex items-center justify-center p-4 max-h-[60vh] overflow-hidden">
                  <img
                    src={`https://drive.google.com/uc?id=${selectedFile.driveFile.id}`}
                    alt={selectedFile.driveFile.name}
                    className="max-w-full max-h-[55vh] object-contain rounded-lg"
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

            {/* Actions */}
            <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700 flex gap-3">
              <Button
                onClick={() => window.open(selectedFile.driveFile!.webViewLink, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Drive
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/nu-drive')}
              >
                Go to Nu-Drive
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export { Header };
