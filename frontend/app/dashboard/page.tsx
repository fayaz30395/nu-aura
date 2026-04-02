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
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PremiumMetricCard } from '@/components/ui/PremiumMetricCard';
import { DashboardGrid } from '@/components/ui/DashboardGrid';
import type { DashboardWidget } from '@/components/ui/DashboardGrid';
import { NuAuraLoader, Skeleton, SkeletonStatCard, SkeletonChart } from '@/components/ui/Loading';
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
import { formatCurrency } from '@/lib/utils';
import { safeWindowOpen } from '@/lib/utils/url';

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
  const [clockError, setClockError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

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
    // Initialize on client only to prevent SSR hydration mismatch
    setCurrentTime(new Date());
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
  const { data: analyticsData, isLoading: isAnalyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useDashboardAnalytics();
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
          const emailDetails = await Promise.all(
            emailData.messages.slice(0, 3).map(async (msg: { id: string; threadId: string }) => {
              const detailResponse = await fetch(
                `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (!detailResponse.ok) return null;
              const detail = await detailResponse.json();
              const fromHeader = detail.payload?.headers?.find((h: EmailHeader) => h.name === 'From');
              const subjectHeader = detail.payload?.headers?.find((h: EmailHeader) => h.name === 'Subject');
              return {
                id: `email-${msg.id}`,
                type: 'email' as const,
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
              };
            })
          );
          for (const notif of emailDetails) {
            if (notif) allNotifications.push(notif);
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
    }
  };

  const handleCheckOut = async () => {
    if (!user?.employeeId) return;
    try {
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
    }
  };



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
        return <Mail className="h-4 w-4" />;
      case 'drive':
        return <HardDrive className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationTone = (type: 'email' | 'drive' | 'calendar') => {
    switch (type) {
      case 'email':
        return 'status-danger';
      case 'drive':
        return 'status-warning';
      case 'calendar':
        return 'status-info';
      default:
        return 'status-neutral';
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
    return (
      <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="card-aura p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-8 w-64 rounded" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Skeleton className="h-16 w-32 rounded-lg" />
                <Skeleton className="h-16 w-32 rounded-lg hidden sm:block" />
              </div>
            </div>
          </div>

          {/* Attendance card skeleton */}
          <div className="card-aura p-6 pl-7 sm:p-8 sm:pl-9">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-14 w-14 rounded-xl flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-40 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              </div>
              <div className="flex gap-4 flex-wrap sm:flex-nowrap">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>

          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart height="h-80" />
            <SkeletonChart height="h-80" />
          </div>

          {/* Additional sections skeleton */}
          <div className="space-y-6">
            <SkeletonChart height="h-64" />
          </div>
        </div>
      </AppLayout>
    );
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
              <p className="text-[var(--text-secondary)] mb-4">
                {error ? `${error}. This may be a temporary service issue.` : 'Unable to load analytics data'}
              </p>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => refetchAnalytics()} className="flex-1">Retry</Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">Refresh Page</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const viewBadgeClass = analytics.viewType === 'ADMIN'
    ? 'status-info'
    : analytics.viewType === 'MANAGER'
      ? 'status-warning'
      : 'status-success';

  // Build dashboard widgets
  const dashboardWidgets: DashboardWidget[] = [];

  // Widget 1: Stats Grid
  dashboardWidgets.push({
    id: 'stats-grid',
    title: 'Key Metrics',
    defaultVisible: true,
    component: (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        <PremiumMetricCard
          title="Present Today"
          value={analytics.attendance.present.toString()}
          change={`${analytics.attendance.attendancePercentage}% attendance`}
          isPositive={true}
          icon={<UserCheck className="h-6 w-6" />}
          delay={0.1}
        />
        <PremiumMetricCard
          title="On Leave"
          value={analytics.attendance.onLeave.toString()}
          change="Approved today"
          isPositive={false}
          icon={<Calendar className="h-6 w-6" />}
          delay={0.2}
        />
        <PremiumMetricCard
          title="Pending Approvals"
          value={analytics.leave.pending.toString()}
          change="Awaiting action"
          isPositive={false}
          icon={<Bell className="h-6 w-6" />}
          delay={0.3}
        />
      </div>
    ),
  });

  // Widget 2: Quick Actions
  dashboardWidgets.push({
    id: 'quick-actions',
    title: 'Quick Actions',
    defaultVisible: true,
    component: (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Apply Leave', icon: Calendar, tone: 'status-info', href: '/leave/apply' },
          { label: 'View Payslip', icon: FileText, tone: 'status-success', href: '/payroll' },
          { label: 'Expenses', icon: CreditCard, tone: 'status-warning', href: '/expenses' },
          { label: 'Directory', icon: Users, tone: 'status-neutral', href: '/employees' },
        ].map((action, idx) => (
          <button
            key={idx}
            onClick={() => router.push(action.href)}
            className="group flex flex-col items-center gap-4 p-4 sm:p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:shadow-card-hover transition-all min-h-[96px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${action.tone}`}>
              <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    ),
  });

  // Widget 3: Attendance Overview
  dashboardWidgets.push({
    id: 'attendance-overview',
    title: 'Attendance Overview',
    defaultVisible: true,
    component: (
      <div>
        <div className="row-between mb-4">
          <div />
          <Button variant="ghost" size="sm" onClick={() => router.push('/attendance')} rightIcon={<ChevronRight className="h-4 w-4" />} className="text-xs sm:text-sm">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'On Time', value: analytics.attendance.onTime, icon: UserCheck, tone: 'status-success' },
            { label: 'Late', value: analytics.attendance.late, icon: Clock, tone: 'status-warning' },
            { label: 'On Leave', value: analytics.attendance.onLeave, icon: Coffee, tone: 'status-info' },
            { label: 'Absent', value: analytics.attendance.absent, icon: UserX, tone: 'status-danger' },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 sm:p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-stat-medium">{item.value}</p>
              <p className="text-caption mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  });

  // Widget 4: Department Distribution (conditional)
  if (analytics.headcount.departmentDistribution && analytics.headcount.departmentDistribution.length > 0) {
    dashboardWidgets.push({
      id: 'department-distribution',
      title: analytics.viewType === 'ADMIN' ? 'Department Headcount' : 'Team Distribution',
      defaultVisible: true,
      component: (
        <div className="space-y-4">
          {analytics.headcount.departmentDistribution.slice(0, 5).map((dept, idx) => {
            const percentage = analytics.headcount.total > 0 ? Math.round((dept.count / analytics.headcount.total) * 100) : 0;
            const colors = [
              'var(--accent-primary)',
              'var(--chart-secondary)',
              'var(--chart-success)',
              'var(--chart-warning)',
              'var(--chart-danger)',
            ];
            return (
              <div key={idx}>
                <div className="row-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{dept.department}</span>
                  <span className="text-body-secondary">{dept.count} ({percentage}%)</span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-card-hover)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: colors[idx % colors.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ),
    });
  }

  // Widget 5: Payroll Summary (admin only)
  if (analytics.viewType === 'ADMIN' && analytics.payroll) {
    dashboardWidgets.push({
      id: 'payroll-summary',
      title: 'Payroll Summary',
      defaultVisible: true,
      component: (
        <div>
          <div className="text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-primary-subtle)] border border-[var(--border-subtle)]">
              <Briefcase className="h-6 w-6 text-[var(--accent-primary)]" />
            </div>
            <p className="text-stat-large mt-4">{formatCurrency(analytics.payroll.currentMonth.total)}</p>
            <p className="text-body-secondary mt-1">Current Month</p>
          </div>
          <div className="border-t border-[var(--border-main)] pt-4 mt-4">
            <div className="row-between mb-4">
              <span className="text-body-secondary">Processed</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{analytics.payroll.currentMonth.processed}</span>
            </div>
            <div className="row-between">
              <span className="text-body-secondary">Pending</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{analytics.headcount.total - analytics.payroll.currentMonth.processed}</span>
            </div>
          </div>
        </div>
      ),
    });
  }

  // Widget 6: Upcoming Events
  dashboardWidgets.push({
    id: 'upcoming-events',
    title: 'Upcoming',
    defaultVisible: true,
    component: (
      <div className="space-y-4">
        {analytics.upcomingEvents?.birthdays?.slice(0, 3).map((event, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center status-warning flex-shrink-0">
              <Gift className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{event.employeeName}</p>
              <p className="text-xs text-[var(--text-secondary)]">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        ))}
        {analytics.upcomingEvents?.holidays?.slice(0, 2).map((event, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center status-info flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{event.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        ))}
        {(!analytics.upcomingEvents?.birthdays?.length && !analytics.upcomingEvents?.holidays?.length) && (
          <p className="text-body-muted text-center py-4">No upcoming events</p>
        )}
      </div>
    ),
  });

  // Widget 7: Google Notifications
  dashboardWidgets.push({
    id: 'notifications',
    title: 'Notifications',
    defaultVisible: true,
    component: (
      <div>
        {!hasGoogleToken ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-4">
              <Bell className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-body-secondary mb-4">Connect Google to see notifications</p>
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
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-[var(--status-success-text)] mx-auto mb-2" />
            <p className="text-body-secondary">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="flex items-start gap-4 p-4 rounded-xl cursor-pointer border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:shadow-card-hover transition-all"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotificationTone(notification.type)}`}>
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
                      <Video className="h-3 w-3 text-[var(--status-info-text)] flex-shrink-0" />
                    )}
                  </div>
                </div>
                <span className="text-caption flex-shrink-0">
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
      </div>
    ),
  });

  // Widget 8: New Joiners (conditional)
  if (analytics.viewType !== 'EMPLOYEE') {
    dashboardWidgets.push({
      id: 'new-joiners',
      title: analytics.viewType === 'ADMIN' ? 'New Joiners' : 'New Team Members',
      defaultVisible: true,
      component: (
        <div>
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-lg bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-[var(--accent-primary)]" />
            </div>
            <p className="text-stat-large mt-4">{analytics.headcount.newJoinees}</p>
            <p className="text-body-secondary mt-1">This Month</p>
          </div>
          {analytics.viewType === 'ADMIN' && (
            <div className="space-y-2 mt-4">
              <Button variant="outline" className="w-full" onClick={() => router.push('/employees?filter=new')}>
                View All Joiners
              </Button>
              <Button variant="ghost" className="w-full text-[var(--accent-primary)] hover:bg-[var(--accent-primary-subtle)]" onClick={() => router.push('/onboarding')}>
                <span className="flex items-center gap-2">
                  Manage Onboarding
                  {activeOnboardingCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]">
                      {activeOnboardingCount} Active
                    </span>
                  )}
                </span>
              </Button>
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
      <div className="space-y-8">
        {/* Header with greeting and time */}
        <Card className="overflow-hidden skeuo-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-4">
                  <h1 className="text-page-title skeuo-emboss">
                    Welcome back, {user?.firstName || user?.fullName?.split(' ')[0] || 'User'}!
                  </h1>
                  <span className={`badge-status ${viewBadgeClass}`}>{analytics.viewLabel}</span>
                </div>
                <p className="text-body-secondary">
                  {currentTime?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) ?? ''}
                  {analytics.viewType !== 'EMPLOYEE' && (
                    <span className="ml-2 text-caption">• {analytics.teamSize} {analytics.viewType === 'ADMIN' ? 'employees' : 'team members'}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-4 min-w-[140px]">
                  <p className="text-stat-medium" suppressHydrationWarning>
                    {currentTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}
                  </p>
                  <p className="text-caption">Current time</p>
                </div>
                {analytics.viewType !== 'EMPLOYEE' && (
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-4 min-w-[140px]">
                    <p className="text-caption">Team size</p>
                    <p className="text-stat-medium">{analytics.teamSize}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Widget */}
        <Card className="relative overflow-hidden skeuo-card">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-[var(--accent-primary)]" />
          <CardContent className="p-6 pl-7 sm:p-8 sm:pl-9">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[var(--accent-primary-subtle)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-semibold text-[var(--text-primary)]">Today&apos;s Attendance</h3>
                  {timeEntries.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-4 mt-1">
                      {/* Show first check-in time */}
                      <div className="flex items-center gap-1.5 text-sm">
                        <LogIn className="h-4 w-4 text-[var(--status-success-text)]" />
                        <span className="text-[var(--text-secondary)]">First In:</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {new Date(timeEntries[0].checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* Show last check-out time if available */}
                      {timeEntries.filter(e => e.checkOutTime).length > 0 && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <LogOut className="h-4 w-4 text-[var(--status-info-text)]" />
                          <span className="text-[var(--text-secondary)]">Last Out:</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {new Date(timeEntries.filter(e => e.checkOutTime).slice(-1)[0].checkOutTime!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {/* Show session count if more than 1 */}
                      {timeEntries.length > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] text-[var(--text-secondary)]">
                          {timeEntries.length} sessions
                        </span>
                      )}
                      {/* Show current status */}
                      {hasOpenSession && (
                        <span className="badge-status status-success">
                          Working
                        </span>
                      )}
                    </div>
                  ) : todayAttendance ? (
                    <div className="flex items-center gap-4 mt-1">
                      {todayAttendance.checkInTime && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <LogIn className="h-4 w-4 text-[var(--status-success-text)]" />
                          <span className="text-[var(--text-secondary)]">In:</span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {new Date(todayAttendance.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {todayAttendance.checkOutTime && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <LogOut className="h-4 w-4 text-[var(--status-info-text)]" />
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
                  <Button variant="success" onClick={handleCheckIn} isLoading={checkInMutation.isPending} leftIcon={<LogIn className="h-4 w-4" />}>
                    Check In
                  </Button>
                )}
                {canCheckOut && (
                  <Button variant="danger" onClick={handleCheckOut} isLoading={checkOutMutation.isPending} leftIcon={<LogOut className="h-4 w-4" />}>
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

        {/* Dashboard Widgets - Drag and Drop Layout */}
        <DashboardGrid
          widgets={dashboardWidgets}
          dashboardId="main-dashboard"
          columns={2}
        />
      </div>

      {/* Calendar Event Modal */}
      {selectedEvent && selectedEvent.calendarEvent && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-lg shadow-dropdown max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="row-between p-4 border-b border-[var(--border-main)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Event Details
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Close event details"
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
                  <p className="text-body-secondary mt-1">
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
                <div className="flex items-center gap-4 text-[var(--accent-primary)]">
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
                      <p key={idx} className="text-body-secondary">
                        {attendee.displayName || attendee.email}
                        {attendee.responseStatus && (
                          <span className={`ml-2 text-xs ${
                            attendee.responseStatus === 'accepted' ? 'text-[var(--status-success-text)]' :
                            attendee.responseStatus === 'declined' ? 'text-[var(--status-danger-text)]' :
                            'text-[var(--status-warning-text)]'
                          }`}>
                            ({attendee.responseStatus})
                          </span>
                        )}
                      </p>
                    ))}
                    {selectedEvent.calendarEvent.attendees.length > 5 && (
                      <p className="text-body-muted">
                        +{selectedEvent.calendarEvent.attendees.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedEvent.calendarEvent.description && (
                <div className="pt-4 border-t border-[var(--border-main)]">
                  <p className="text-body-secondary whitespace-pre-wrap">
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
                  onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.hangoutLink, '_blank')}
                >
                  Join Meeting
                </Button>
              )}
              <Button
                variant="outline"
                className={selectedEvent.calendarEvent.hangoutLink ? '' : 'flex-1'}
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.htmlLink, '_blank')}
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
          <div className="bg-[var(--bg-card)] rounded-lg shadow-dropdown max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="row-between p-4 border-b border-[var(--border-main)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] truncate pr-4">
                {selectedEmail.title}
              </h3>
              <button
                onClick={() => {
                  setSelectedEmail(null);
                  setEmailContent('');
                }}
                className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Close email details"
              >
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center status-danger">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {selectedEmail.emailData?.from?.split('<')[0]?.trim() || 'Unknown Sender'}
                  </p>
                  <p className="text-body-secondary">
                    {formatRelativeTime(selectedEmail.timestamp)}
                  </p>
                </div>
              </div>

              <div className="border-t border-[var(--border-main)] pt-4">
                {emailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
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
          <div className="bg-[var(--bg-card)] rounded-lg shadow-dropdown max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="row-between p-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 status-warning">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                    {selectedFile.driveFile.name}
                  </h3>
                  <p className="text-body-secondary">{selectedFile.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Close file preview"
              >
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="relative h-[60vh] bg-[var(--bg-elevated)]">
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
                  onClick={() => safeWindowOpen(selectedFile.driveFile!.webViewLink, '_blank')}
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
