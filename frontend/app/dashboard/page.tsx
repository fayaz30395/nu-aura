'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Users,
  CheckCircle,
  Calendar,
  Clock,
  Briefcase,
  LogIn,
  LogOut,
  AlertCircle,
  ChevronRight,
  CalendarDays,
  UserCheck,
  UserX,
  Coffee,
  Gift,
  FileText,
  CreditCard,
  Bell,
  Mail,
  HardDrive,
  Video,
  ExternalLink,
  RefreshCw,
  Loader2,
  X,
  MapPin,
  Users as UsersIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PremiumMetricCard } from '@/components/ui/PremiumMetricCard';
import { NuAuraLoader } from '@/components/ui/Loading';
import { getGoogleToken } from '@/lib/utils/googleToken';
import { useDashboardAnalytics } from '@/lib/hooks/queries/useAnalytics';
import {
  useAttendanceByDateRange,
  useMyTimeEntries,
  useCheckIn,
  useCheckOut,
} from '@/lib/hooks/queries/useAttendance';
import { useOnboardingProcessesByStatus } from '@/lib/hooks/queries/useOnboarding';
import { getLocalDateString, getLocalDateTimeString } from '@/lib/utils/dateUtils';
import { sanitizeEmailHtml } from '@/lib/utils/sanitize';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('DashboardPage');

interface EmailHeader {
  name: string;
  value: string;
}

interface GoogleNotification {
  id: string;
  type: 'email' | 'drive' | 'calendar';
  title: string;
  subtitle: string;
  timestamp: Date;
  link?: string;
  isUnread?: boolean;
  hasVideo?: boolean;
  // Full event data for calendar events
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
  // Full email data
  emailData?: {
    id: string;
    threadId: string;
    from: string;
    subject: string;
    snippet?: string;
  };
  // Full drive file data
  driveFile?: {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const { hasPermission, isReady: permissionsReady } = usePermissions();
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Google Notifications State
  const [notifications, setNotifications] = useState<GoogleNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);

  // Modal states for inline actions
  const [selectedEvent, setSelectedEvent] = useState<GoogleNotification | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GoogleNotification | null>(null);
  const [selectedFile, setSelectedFile] = useState<GoogleNotification | null>(null);
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    // Guard: only users with DASHBOARD_VIEW permission can access this HR overview.
    // Regular employees should use /me/dashboard instead.
    if (!hasPermission(Permissions.DASHBOARD_VIEW)) {
      router.replace('/me/dashboard');
      return;
    }
    loadGoogleNotifications();
  }, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);

  // React Query hooks for loading data
  const today = getLocalDateString();
  const { data: analyticsData, isLoading: isAnalyticsLoading, error: analyticsError } = useDashboardAnalytics();
  const { data: attendanceRangeData = [] } = useAttendanceByDateRange(today, today, !!user?.employeeId);
  const { data: timeEntriesData = [] } = useMyTimeEntries(today, !!user?.employeeId);
  const { data: onboardingData = [] } = useOnboardingProcessesByStatus(
    'IN_PROGRESS'
  );

  const todayAttendance = attendanceRangeData.length > 0 ? attendanceRangeData[0] : null;
  const timeEntries = timeEntriesData;
  const activeOnboardingCount = onboardingData.length;
  const analytics = analyticsData;
  const isLoading = isAnalyticsLoading;
  const error = analyticsError instanceof Error ? analyticsError.message : null;

  const loadGoogleNotifications = async () => {
    const token = getGoogleToken();
    if (!token) {
      setHasGoogleToken(false);
      return;
    }

    setHasGoogleToken(true);
    setNotificationsLoading(true);

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
      log.error('Error loading emails:', err);
    }

    try {
      // Load shared files from Drive (files shared with me, modified in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=sharedWithMe=true and modifiedTime>'${sevenDaysAgo.toISOString()}'` +
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
      log.error('Error loading drive files:', err);
    }

    try {
      // Load upcoming calendar events (next 24 hours)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&timeMax=${tomorrow.toISOString()}` +
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
      log.error('Error loading calendar events:', err);
    }

    // Sort by timestamp (most recent first)
    allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setNotifications(allNotifications.slice(0, 8));
    setNotificationsLoading(false);
  };


  const hasCheckedIn = Boolean(todayAttendance?.checkInTime);
  const hasCheckedOut = Boolean(todayAttendance?.checkOutTime);
  const hasOpenSession =
    timeEntries.some(entry => (entry.open ?? !entry.checkOutTime)) ||
    (timeEntries.length === 0 && hasCheckedIn && !hasCheckedOut);
  const canCheckIn = !hasOpenSession;
  const canCheckOut = hasOpenSession;
  const attendanceComplete = !hasOpenSession && (hasCheckedIn || hasCheckedOut || timeEntries.length > 0);

  // React Query mutations for check-in/out
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const handleCheckIn = async () => {
    if (!user?.employeeId) return;
    try {
      setIsClockingIn(true);
      setClockError(null);
      // Use utility functions for consistent timezone handling
      const localDate = getLocalDateString();
      const localTime = getLocalDateTimeString();
      await checkInMutation.mutateAsync({
        employeeId: user.employeeId,
        checkInTime: localTime,
        attendanceDate: localDate,
      });
    } catch (err: unknown) {
      setClockError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to check in');
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.employeeId) return;
    try {
      setIsClockingIn(true);
      setClockError(null);
      // Use utility functions for consistent timezone handling
      const localDate = getLocalDateString();
      const localTime = getLocalDateTimeString();
      await checkOutMutation.mutateAsync({
        employeeId: user.employeeId,
        checkOutTime: localTime,
        attendanceDate: localDate,
      });
    } catch (err: unknown) {
      setClockError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to check out');
    } finally {
      setIsClockingIn(false);
    }
  };


  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);

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
        // Try to get HTML or plain text content
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
      log.error('Error loading email content:', err);
      setEmailContent('Failed to load email content');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleNotificationClick = (notification: GoogleNotification) => {
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

  // Show loading state while hydrating or loading analytics
  if (!hasHydrated || isLoading) {
    return <NuAuraLoader message="Loading dashboard..." />;
  }

  if (error || !analytics) {
    return (
      <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-4 text-danger-600 dark:text-danger-400">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Error Loading Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] mb-4">{error || 'Unable to load analytics data'}</p>
              <Button variant="primary" onClick={() => window.location.reload()} className="w-full">Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header with greeting and time */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Welcome back, {user?.firstName || user?.fullName?.split(' ')[0] || 'User'}!
              </h1>
              {/* View Type Badge */}
              <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${analytics.viewType === 'ADMIN'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                  : analytics.viewType === 'MANAGER'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                {analytics.viewLabel}
              </span>
            </div>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              {analytics.viewType !== 'EMPLOYEE' && (
                <span className="ml-2 text-[var(--text-muted)]">• {analytics.teamSize} {analytics.viewType === 'ADMIN' ? 'employees' : 'team members'}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left sm:text-right">
              <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Current Time</p>
            </div>
          </div>
        </div>

        {/* Attendance Widget - Keka Style */}
        <Card className="border-l-4 border-l-primary-500">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Today&apos;s Attendance</h3>
                  {timeEntries.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-4 mt-1">
                      {/* Show first check-in time */}
                      <div className="flex items-center gap-1.5 text-sm">
                        <LogIn className="h-4 w-4 text-green-600" />
                        <span className="text-[var(--text-secondary)]">First In:</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {new Date(timeEntries[0].checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* Show last check-out time if available */}
                      {timeEntries.filter(e => e.checkOutTime).length > 0 && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <LogOut className="h-4 w-4 text-blue-600" />
                          <span className="text-[var(--text-secondary)]">Last Out:</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {new Date(timeEntries.filter(e => e.checkOutTime).slice(-1)[0].checkOutTime!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {/* Show session count if more than 1 */}
                      {timeEntries.length > 1 && (
                        <span className="text-xs px-2 py-0.5 bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)]">
                          {timeEntries.length} sessions
                        </span>
                      )}
                      {/* Show current status */}
                      {hasOpenSession && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700 dark:text-green-400 animate-pulse">
                          Working
                        </span>
                      )}
                    </div>
                  ) : todayAttendance ? (
                    <div className="flex items-center gap-4 mt-1">
                      {todayAttendance.checkInTime && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <LogIn className="h-4 w-4 text-green-600" />
                          <span className="text-[var(--text-secondary)]">In:</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {new Date(todayAttendance.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {todayAttendance.checkOutTime && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <LogOut className="h-4 w-4 text-blue-600" />
                          <span className="text-[var(--text-secondary)]">Out:</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {new Date(todayAttendance.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[var(--text-secondary)] text-sm mt-1">You haven&apos;t checked in yet</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {clockError && <span className="text-sm text-danger-600 dark:text-danger-400">{clockError}</span>}
                {canCheckIn && (
                  <Button variant="success" onClick={handleCheckIn} isLoading={isClockingIn} leftIcon={<LogIn className="h-4 w-4" />}>
                    Check In
                  </Button>
                )}
                {canCheckOut && (
                  <Button variant="destructive" onClick={handleCheckOut} isLoading={isClockingIn} leftIcon={<LogOut className="h-4 w-4" />}>
                    Check Out
                  </Button>
                )}
                {attendanceComplete && (
                  <Button variant="outline" disabled>
                    Checked Out
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - AURA Midnight Premium */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees / Team Members */}
          <PremiumMetricCard
            title={analytics.viewType === 'ADMIN' ? 'Total Employees' : analytics.viewType === 'MANAGER' ? 'Team Members' : 'Your Status'}
            value={analytics.headcount.total.toString()}
            change={analytics.viewType === 'ADMIN' && analytics.headcount.growthPercentage !== 0
              ? `${Math.abs(analytics.headcount.growthPercentage)}%`
              : analytics.viewType === 'MANAGER' ? 'Direct & Indirect' : 'Active'}
            isPositive={analytics.headcount.growthPercentage >= 0}
            icon={<Users className="h-6 w-6" />}
            delay={0}
          />

          {/* Present Today */}
          <PremiumMetricCard
            title="Present Today"
            value={analytics.attendance.present.toString()}
            change={`${analytics.attendance.attendancePercentage}% attendance`}
            isPositive={true}
            icon={<UserCheck className="h-6 w-6" />}
            delay={0.1}
          />

          {/* On Leave */}
          <PremiumMetricCard
            title="On Leave"
            value={analytics.attendance.onLeave.toString()}
            change="Approved today"
            isPositive={false}
            icon={<Calendar className="h-6 w-6" />}
            delay={0.2}
          />

          {/* Pending Approvals */}
          <PremiumMetricCard
            title="Pending Approvals"
            value={analytics.leave.pending.toString()}
            change="Awaiting action"
            isPositive={false}
            icon={<Bell className="h-6 w-6" />}
            delay={0.3}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wider */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions - Keka Style */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Apply Leave', icon: Calendar, color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400', href: '/leave/apply' },
                    { label: 'View Payslip', icon: FileText, color: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400', href: '/payroll' },
                    { label: 'Expenses', icon: CreditCard, color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400', href: '/expenses' },
                    { label: 'Directory', icon: Users, color: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400', href: '/employees' },
                  ].map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => router.push(action.href)}
                      className="flex flex-col items-center gap-2 sm:gap-4 p-4 sm:p-4 rounded-xl border border-[var(--border-main)] hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm transition-all min-h-[88px]"
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${action.color} flex items-center justify-center`}>
                        <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] text-center">{action.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Overview */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Attendance Overview</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/attendance')} rightIcon={<ChevronRight className="h-4 w-4" />} className="text-xs sm:text-sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 sm:p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
                    <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 mx-auto" />
                    <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-2">{analytics.attendance.onTime}</p>
                    <p className="text-xs sm:text-xs text-[var(--text-secondary)] mt-1">On Time</p>
                  </div>
                  <div className="text-center p-4 sm:p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400 mx-auto" />
                    <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-2">{analytics.attendance.late}</p>
                    <p className="text-xs sm:text-xs text-[var(--text-secondary)] mt-1">Late</p>
                  </div>
                  <div className="text-center p-4 sm:p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                    <Coffee className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400 mx-auto" />
                    <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-2">{analytics.attendance.onLeave}</p>
                    <p className="text-xs sm:text-xs text-[var(--text-secondary)] mt-1">On Leave</p>
                  </div>
                  <div className="text-center p-4 sm:p-4 bg-danger-50 dark:bg-danger-950/20 rounded-xl">
                    <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-danger-600 dark:text-danger-400 mx-auto" />
                    <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-2">{analytics.attendance.absent}</p>
                    <p className="text-xs sm:text-xs text-[var(--text-secondary)] mt-1">Absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Distribution - Only for Admin and Manager with team data */}
            {analytics.headcount.departmentDistribution && analytics.headcount.departmentDistribution.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
                    {analytics.viewType === 'ADMIN' ? 'Department Headcount' : 'Team Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.headcount.departmentDistribution.slice(0, 5).map((dept, idx) => {
                      const percentage = analytics.headcount.total > 0 ? Math.round((dept.count / analytics.headcount.total) * 100) : 0;
                      const colors = ['bg-primary-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-blue-500'];
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">{dept.department}</span>
                            <span className="text-sm text-[var(--text-secondary)]">{dept.count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Payroll Summary - Only visible to Admin */}
            {analytics.viewType === 'ADMIN' && analytics.payroll && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">Payroll Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <Briefcase className="h-10 w-10 text-primary-600 dark:text-primary-400 mx-auto" />
                    <p className="text-3xl font-bold text-[var(--text-primary)] mt-3">{formatCurrency(analytics.payroll.currentMonth.total)}</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Current Month</p>
                  </div>
                  <div className="border-t border-[var(--border-main)] pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-[var(--text-secondary)]">Processed</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{analytics.payroll.currentMonth.processed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Pending</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{analytics.headcount.total - analytics.payroll.currentMonth.processed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">Upcoming</CardTitle>
                  <CalendarDays className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.upcomingEvents?.birthdays?.slice(0, 3).map((event, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-pink-50 dark:bg-pink-950/30 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">{event.employeeName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                  {analytics.upcomingEvents?.holidays?.slice(0, 2).map((event, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">{event.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                  {(!analytics.upcomingEvents?.birthdays?.length && !analytics.upcomingEvents?.holidays?.length) && (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">No upcoming events</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Google Notifications Widget */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
                    Notifications
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {hasGoogleToken && (
                      <button
                        onClick={loadGoogleNotifications}
                        disabled={notificationsLoading}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <RefreshCw className={`h-4 w-4 text-[var(--text-muted)] ${notificationsLoading ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <Bell className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!hasGoogleToken ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-3">
                      <Bell className="h-6 w-6 text-[var(--text-muted)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">Connect Google to see notifications</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/nu-mail')}
                    >
                      Connect Google
                    </Button>
                  </div>
                ) : notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:shadow-sm transition-all ${getNotificationBg(notification.type)}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-input)] flex items-center justify-center flex-shrink-0 shadow-sm">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {notification.subtitle}
                            </p>
                            {notification.hasVideo && (
                              <Video className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                          {notification.type === 'calendar'
                            ? notification.subtitle
                            : formatRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => router.push('/nu-mail')}
                        leftIcon={<Mail className="h-3 w-3" />}
                      >
                        Mail
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => router.push('/nu-drive')}
                        leftIcon={<HardDrive className="h-3 w-3" />}
                      >
                        Drive
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => router.push('/nu-calendar')}
                        leftIcon={<Calendar className="h-3 w-3" />}
                      >
                        Calendar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New Joiners - Only for Admin and Manager */}
            {analytics.viewType !== 'EMPLOYEE' && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
                    {analytics.viewType === 'ADMIN' ? 'New Joiners' : 'New Team Members'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto">
                      <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-4xl font-bold text-[var(--text-primary)] mt-4">{analytics.headcount.newJoinees}</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">This Month</p>
                  </div>
                  {analytics.viewType === 'ADMIN' && (
                    <div className="space-y-2 mt-4">
                      <Button variant="outline" className="w-full" onClick={() => router.push('/employees?filter=new')}>
                        View All Joiners
                      </Button>
                      <Button variant="ghost" className="w-full text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20" onClick={() => router.push('/onboarding')}>
                        <span className="flex items-center gap-2">
                          Manage Onboarding
                          {activeOnboardingCount > 0 && (
                            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full dark:bg-primary-900 dark:text-primary-300">
                              {activeOnboardingCount} Active
                            </span>
                          )}
                        </span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </motion.div>

      {/* Calendar Event Modal */}
      {selectedEvent && selectedEvent.calendarEvent && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Event Details
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div>
                <h4 className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedEvent.calendarEvent.summary}
                </h4>
                {selectedEvent.calendarEvent.organizer && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Organized by {selectedEvent.calendarEvent.organizer.displayName || selectedEvent.calendarEvent.organizer.email}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                <Clock className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {selectedEvent.calendarEvent.start.dateTime
                      ? new Date(selectedEvent.calendarEvent.start.dateTime).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })
                      : new Date(selectedEvent.calendarEvent.start.date!).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                  </p>
                  {selectedEvent.calendarEvent.start.dateTime && (
                    <p className="text-sm">
                      {new Date(selectedEvent.calendarEvent.start.dateTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {selectedEvent.calendarEvent.end?.dateTime && (
                        <>
                          {' - '}
                          {new Date(selectedEvent.calendarEvent.end.dateTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {selectedEvent.calendarEvent.location && (
                <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                  <MapPin className="h-5 w-5 flex-shrink-0" />
                  <p>{selectedEvent.calendarEvent.location}</p>
                </div>
              )}

              {selectedEvent.calendarEvent.hangoutLink && (
                <div className="flex items-center gap-4 text-blue-600 dark:text-blue-400">
                  <Video className="h-5 w-5 flex-shrink-0" />
                  <a
                    href={selectedEvent.calendarEvent.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Google Meet video call
                  </a>
                </div>
              )}

              {selectedEvent.calendarEvent.attendees && selectedEvent.calendarEvent.attendees.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <UsersIcon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{selectedEvent.calendarEvent.attendees.length} Attendees</span>
                  </div>
                  <div className="ml-7 space-y-1">
                    {selectedEvent.calendarEvent.attendees.slice(0, 5).map((attendee, idx) => (
                      <p key={idx} className="text-sm text-[var(--text-secondary)]">
                        {attendee.displayName || attendee.email}
                        {attendee.responseStatus && (
                          <span className={`ml-2 text-xs ${
                            attendee.responseStatus === 'accepted' ? 'text-green-600' :
                            attendee.responseStatus === 'declined' ? 'text-danger-600 dark:text-danger-400' :
                            'text-yellow-600'
                          }`}>
                            ({attendee.responseStatus})
                          </span>
                        )}
                      </p>
                    ))}
                    {selectedEvent.calendarEvent.attendees.length > 5 && (
                      <p className="text-sm text-[var(--text-muted)]">
                        +{selectedEvent.calendarEvent.attendees.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedEvent.calendarEvent.description && (
                <div className="pt-4 border-t border-[var(--border-main)]">
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                    {selectedEvent.calendarEvent.description}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--border-main)] flex gap-4">
              {selectedEvent.calendarEvent.hangoutLink && (
                <Button
                  variant="primary"
                  className="flex-1"
                  leftIcon={<Video className="h-4 w-4" />}
                  onClick={() => window.open(selectedEvent.calendarEvent!.hangoutLink, '_blank')}
                >
                  Join Meeting
                </Button>
              )}
              <Button
                variant="outline"
                className={selectedEvent.calendarEvent.hangoutLink ? '' : 'flex-1'}
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => window.open(selectedEvent.calendarEvent!.htmlLink, '_blank')}
              >
                Open in Calendar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate pr-4">
                {selectedEmail.title}
              </h3>
              <button
                onClick={() => {
                  setSelectedEmail(null);
                  setEmailContent('');
                }}
                className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-danger-600 dark:text-danger-400" />
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {selectedEmail.emailData?.from?.split('<')[0]?.trim() || 'Unknown Sender'}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {formatRelativeTime(selectedEmail.timestamp)}
                  </p>
                </div>
              </div>

              <div className="border-t border-[var(--border-main)] pt-4">
                {emailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                  </div>
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(emailContent) }}
                  />
                )}
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border-main)] flex gap-4">
              <Button
                variant="primary"
                className="flex-1"
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => router.push('/nu-mail')}
              >
                Open in NU-Mail
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drive File Preview Modal */}
      {selectedFile && selectedFile.driveFile && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                    {selectedFile.driveFile.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">{selectedFile.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="relative h-[60vh] bg-[var(--bg-secondary)]">
              {selectedFile.driveFile.mimeType?.startsWith('image/') ? (
                <Image
                  src={`https://drive.google.com/uc?id=${selectedFile.driveFile.id}`}
                  alt={selectedFile.driveFile.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-contain"
                />
              ) : (
                <iframe
                  src={getPreviewUrl(selectedFile.driveFile) || ''}
                  className="w-full h-full border-0"
                  title={selectedFile.driveFile.name}
                />
              )}
            </div>
            <div className="p-4 border-t border-[var(--border-main)] flex gap-4">
              <Button
                variant="primary"
                className="flex-1"
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => router.push('/nu-drive')}
              >
                Open in NU-Drive
              </Button>
              {selectedFile.driveFile.webViewLink && (
                <Button
                  variant="outline"
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => window.open(selectedFile.driveFile!.webViewLink, '_blank')}
                >
                  Open in Drive
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
