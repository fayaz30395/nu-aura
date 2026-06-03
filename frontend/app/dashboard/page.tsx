'use client';

import React, {useEffect, useState} from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Coffee,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Fingerprint,
  Gift,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Palmtree,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
  Users as UsersIcon,
  UserX,
  Video,
} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {AppLayout} from '@/components/layout';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Stat} from '@/components/ui/Stat';
import {Segmented} from '@/components/ui/Segmented';
import {AreaChart, Donut, Sparkline} from '@/components/charts/aura';
import type {DashboardWidget} from '@/components/ui/DashboardGrid';
// Code-split @hello-pangea/dnd (~30-40 KB gz) — only loaded on dashboard
const DashboardGrid = dynamic(
  () => import('@/components/ui/DashboardGrid').then(m => m.DashboardGrid),
  {ssr: false, loading: () => <SkeletonChart/>}
);
import {Skeleton} from '@/components/ui/Skeleton';
import {SkeletonChart} from '@/components/ui/Loading';
import {EmptyState} from '@/components/ui/EmptyState';
import {getGoogleToken} from '@/lib/utils/googleToken';
import {useDashboardAnalytics} from '@/lib/hooks/queries/useAnalytics';
import {useAttendanceByDateRange, useCheckIn, useCheckOut, useMyTimeEntries,} from '@/lib/hooks/queries/useAttendance';
import {useOnboardingProcessesByStatus} from '@/lib/hooks/queries/useOnboarding';
import {getLocalDateString, getLocalDateTimeString} from '@/lib/utils/dateUtils';
import {sanitizeEmailHtml} from '@/lib/utils/sanitize';
import {createLogger} from '@/lib/utils/logger';
import {formatCurrency} from '@/lib/utils';
import {safeWindowOpen} from '@/lib/utils/url';
import {formatDateShort} from '@/lib/utils/format/date';
import {format} from 'date-fns';
import {MOTION_EASE} from '@/lib/animation';

const log = createLogger('DashboardPage');

// Consolidated onto the shared motion foundation: every transition on this page
// uses the foundation easing token (MOTION_EASE.outExpo) so motion has a single
// source of truth across all surfaces — no per-page cubic-bezier drift.
const EASE = [...MOTION_EASE.outExpo] as [number, number, number, number];

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
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();
  const [clockError, setClockError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  // Aura headcount-trend range selector (3M / 6M / 12M). Presentation-only —
  // it just slices the real `headcount.trend` series returned by analytics.
  const [headcountRange, setHeadcountRange] = useState<'3m' | '6m' | '12m'>('12m');

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
    document.title = 'Dashboard | NU-AURA';
  }, []);

  useEffect(() => {
    // Initialize on client only to prevent SSR hydration mismatch
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
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
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    fetchStatus: analyticsFetchStatus,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useDashboardAnalytics();
  const {data: attendanceRangeData = []} = useAttendanceByDateRange(today, today, !!user?.employeeId);
  const {data: timeEntriesData = []} = useMyTimeEntries(today, !!user?.employeeId);
  const {data: onboardingData = []} = useOnboardingProcessesByStatus(
    'IN_PROGRESS'
  );

  const todayAttendance = attendanceRangeData.length > 0 ? attendanceRangeData[0] : null;
  const timeEntries = timeEntriesData;
  const activeOnboardingCount = onboardingData.length;
  const analytics = analyticsData;
  const isLoading = isAnalyticsLoading && analyticsFetchStatus === 'fetching';
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
        {headers: {Authorization: `Bearer ${token}`}}
      );

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.messages) {
          const emailDetails = await Promise.all(
            emailData.messages.slice(0, 3).map(async (msg: { id: string; threadId: string }) => {
              const detailResponse = await fetch(
                `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
                {headers: {Authorization: `Bearer ${token}`}}
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
      setClockError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to check in');
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
      setClockError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to check out');
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
    return formatDateShort(date);
  };

  const getNotificationIcon = (type: 'email' | 'drive' | 'calendar') => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4"/>;
      case 'drive':
        return <HardDrive className="h-4 w-4"/>;
      case 'calendar':
        return <Calendar className="h-4 w-4"/>;
      default:
        return <Bell className="h-4 w-4"/>;
    }
  };

  // Subtle tone-tinted avatars per channel — use semantic status tokens for light/dark sync
  const getNotificationToneClasses = (type: 'email' | 'drive' | 'calendar') => {
    switch (type) {
      case 'email':
        return 'bg-[var(--err-bg)] text-[var(--err-fg)]';
      case 'drive':
        return 'bg-[var(--warn-bg)] text-[var(--warn-fg)]';
      case 'calendar':
        return 'bg-[var(--info-bg)] text-[var(--info-fg)]';
      default:
        return 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
    }
  };

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
        <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
          {/* Header skeleton */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2 max-w-2xl">
              <Skeleton className="h-3 w-32 rounded-aura-xs"/>
              <Skeleton className="h-9 w-3/4 rounded-aura-sm"/>
              <Skeleton className="h-4 w-1/2 rounded-aura-xs"/>
            </div>
            <Skeleton className="h-10 w-32 rounded-aura-sm self-start sm:self-end"/>
          </div>

          {/* Stats skeleton — borderly, no cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
                <Skeleton className="h-3 w-24 rounded-aura-xs"/>
                <Skeleton className="mt-3 h-9 w-20 rounded-aura-xs"/>
              </div>
            ))}
          </div>

          <SkeletonChart height="h-80"/>
        </div>
      </AppLayout>
    );
  }

  // Graceful degradation: if analytics fails, show dashboard with fallback data
  const analyticsUnavailable = Boolean(error) || !analytics;
  const safeAnalytics = analytics ?? {
    viewType: 'EMPLOYEE' as const,
    viewLabel: 'Dashboard',
    teamSize: 0,
    attendance: {present: 0, absent: 0, onLeave: 0, onTime: 0, late: 0, attendancePercentage: 0, trend: []},
    leave: {pending: 0, approved: 0, rejected: 0, utilizationPercentage: 0, trend: [], distribution: []},
    payroll: null,
    headcount: {total: 0, newJoinees: 0, exits: 0, growthPercentage: 0, trend: [], departmentDistribution: []},
    upcomingEvents: {birthdays: [], anniversaries: [], holidays: []},
  };

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'there';

  // ── Aura greeting + KPI derivations (presentation-only over real analytics) ──
  const greetHour = currentTime?.getHours() ?? 9;
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingDate = currentTime ? format(currentTime, 'EEEE, MMMM d') : '';

  // Headcount AreaChart series — slice the real trend by the selected range.
  const headcountTrend = safeAnalytics.headcount.trend ?? [];
  const rangeWindow = headcountRange === '3m' ? 3 : headcountRange === '6m' ? 6 : 12;
  const slicedTrend = headcountTrend.slice(-rangeWindow);
  const headcountValues = slicedTrend.map((t) => t.value);
  const headcountLabels = slicedTrend.map((t) => t.label);

  // Sparkline series for each KPI tile (fall back to a flat two-point line so the
  // SVG primitive — which needs >= 2 points — always renders something sensible).
  const flatSpark = (n: number): number[] => [n, n];
  const headcountSpark = headcountValues.length >= 2 ? headcountValues : flatSpark(safeAnalytics.headcount.total);
  const attendanceSpark = (safeAnalytics.attendance.trend ?? []).map((t) => t.value);
  const presentSpark = attendanceSpark.length >= 2 ? attendanceSpark : flatSpark(safeAnalytics.attendance.present);
  const leaveSpark = (safeAnalytics.leave.trend ?? []).map((t) => t.value);
  const onLeaveSpark = leaveSpark.length >= 2 ? leaveSpark : flatSpark(safeAnalytics.attendance.onLeave);
  const payrollSpark = (safeAnalytics.payroll?.costTrend ?? []).map((t) => t.amount);
  const payrollSparkSeries = payrollSpark.length >= 2 ? payrollSpark : flatSpark(safeAnalytics.payroll?.currentMonth.total ?? 0);

  // KPI delta direction from real growth/percentage figures.
  const headcountDir: 'up' | 'down' | 'flat' = safeAnalytics.headcount.growthPercentage > 0 ? 'up' : safeAnalytics.headcount.growthPercentage < 0 ? 'down' : 'flat';

  // Attendance donut — real present / on-leave / absent split, with on-time vs
  // late surfaced as a secondary slice when present > 0.
  const att = safeAnalytics.attendance;
  const donutData = [
    {label: 'Present', value: att.present, color: 'var(--chart-1)'},
    {label: 'On leave', value: att.onLeave, color: 'var(--chart-4)'},
    {label: 'Absent', value: att.absent, color: 'var(--chart-5)'},
  ].filter((d) => d.value > 0);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0) || 1;
  const presentPct = att.attendancePercentage || Math.round((att.present / donutTotal) * 100);

  // Build dashboard widgets
  const dashboardWidgets: DashboardWidget[] = [];

  // Widget 1: Attendance Overview (was: stats grid)
  dashboardWidgets.push({
    id: 'attendance-overview',
    title: 'Attendance breakdown',
    defaultVisible: true,
    component: (
      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Today
          </p>
          <Button variant="ghost" size="sm" onClick={() => router.push('/attendance')}
                  rightIcon={<ChevronRight className="h-4 w-4"/>} className="text-xs sm:text-sm">
            View all
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
          {[
            {label: 'On time', value: safeAnalytics.attendance.onTime, icon: UserCheck, tone: 'neutral' as const},
            {label: 'Late', value: safeAnalytics.attendance.late, icon: Clock, tone: safeAnalytics.attendance.late > 0 ? 'warning' as const : 'neutral' as const},
            {label: 'On leave', value: safeAnalytics.attendance.onLeave, icon: Coffee, tone: 'neutral' as const},
            {label: 'Absent', value: safeAnalytics.attendance.absent, icon: UserX, tone: safeAnalytics.attendance.absent > 0 ? 'danger' as const : 'neutral' as const},
          ].map((item) => (
            <div key={item.label} className="px-5 py-6 sm:px-6 sm:py-7 first:pl-0 last:pr-0">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <item.icon className="h-3.5 w-3.5" aria-hidden="true"/>
                <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
              </div>
              <p
                className={`mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight num ${
                  item.tone === 'danger' ? 'text-[var(--err-fg)]'
                    : item.tone === 'warning' ? 'text-[var(--warn-fg)]'
                      : 'text-[var(--text-heading)]'
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  });

  // Widget 2: Quick Actions — flattened bento-style tiles
  dashboardWidgets.push({
    id: 'quick-actions',
    title: 'Jump in',
    defaultVisible: true,
    component: (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {label: 'Apply leave', icon: Calendar, href: '/leave/apply'},
          {label: 'View payslip', icon: FileText, href: '/payroll'},
          {label: 'Expenses', icon: CreditCard, href: '/expenses'},
          {label: 'Directory', icon: Users, href: '/employees'},
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className="group flex items-center gap-4 rounded-aura-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition-all hover:border-[var(--border-main)] hover:shadow-[var(--sh-md)] hover:-translate-y-px active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              <action.icon className="h-4 w-4" aria-hidden="true"/>
            </div>
            <span className="text-sm font-medium text-[var(--text-heading)] flex-1 min-w-0">
              {action.label}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
          </button>
        ))}
      </div>
    ),
  });

  // Widget 3: Department Distribution (conditional) — divide-y list, no nested cards
  if (safeAnalytics.headcount.departmentDistribution && safeAnalytics.headcount.departmentDistribution.length > 0) {
    dashboardWidgets.push({
      id: 'department-distribution',
      title: safeAnalytics.viewType === 'ADMIN' ? 'Department headcount' : 'Team distribution',
      defaultVisible: true,
      component: (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {safeAnalytics.headcount.departmentDistribution.slice(0, 5).map((dept, idx) => {
            const percentage = safeAnalytics.headcount.total > 0
              ? Math.round((dept.count / safeAnalytics.headcount.total) * 100)
              : 0;
            return (
              <li key={idx} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-heading)] truncate">{dept.department}</p>
                  <div className="mt-2 h-1 w-full max-w-[260px] rounded-full bg-[var(--bg-surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-500 dark:bg-accent-400 transition-all"
                      style={{width: `${percentage}%`}}
                    />
                  </div>
                </div>
                <p className="font-mono text-sm tabular-nums text-[var(--text-secondary)]">
                  {dept.count} <span className="text-[var(--text-muted)]">· {percentage}%</span>
                </p>
              </li>
            );
          })}
        </ul>
      ),
    });
  }

  // Widget 4: Payroll Summary (admin only) — flat numerals, no centered hero metric
  if (safeAnalytics.viewType === 'ADMIN' && safeAnalytics.payroll) {
    dashboardWidgets.push({
      id: 'payroll-summary',
      title: 'Payroll summary',
      defaultVisible: true,
      component: (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true"/>
              <span className="text-2xs font-medium uppercase tracking-wider">Current month</span>
            </div>
            <p className="mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight text-[var(--text-heading)]">
              {formatCurrency(safeAnalytics.payroll.currentMonth.total)}
            </p>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            <li className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
              <span className="text-sm text-[var(--text-secondary)]">Processed</span>
              <span className="font-mono text-sm font-medium tabular-nums text-[var(--text-heading)]">
                {safeAnalytics.payroll.currentMonth.processed}
              </span>
            </li>
            <li className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
              <span className="text-sm text-[var(--text-secondary)]">Pending</span>
              <span className="font-mono text-sm font-medium tabular-nums text-[var(--text-heading)]">
                {safeAnalytics.headcount.total - safeAnalytics.payroll.currentMonth.processed}
              </span>
            </li>
          </ul>
        </div>
      ),
    });
  }

  // Widget 5: Upcoming Events — divide-y list of strips
  dashboardWidgets.push({
    id: 'upcoming-events',
    title: 'Upcoming',
    defaultVisible: true,
    component: (() => {
      const birthdays = (safeAnalytics.upcomingEvents?.birthdays ?? []).slice(0, 3);
      const holidays = (safeAnalytics.upcomingEvents?.holidays ?? []).slice(0, 2);

      if (birthdays.length === 0 && holidays.length === 0) {
        return (
          <EmptyState
            icon={<Calendar className="h-8 w-8"/>}
            title="No upcoming events"
            description="Birthdays and holidays will appear here as they approach."
          />
        );
      }

      return (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {birthdays.map((event, idx) => (
            <li key={`b-${idx}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--warn-bg)] text-[var(--warn-fg)]">
                <Gift className="h-4 w-4" aria-hidden="true"/>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-heading)] truncate">{event.employeeName}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">Birthday</p>
              </div>
              <p className="font-mono text-xs tabular-nums text-[var(--text-muted)]">{formatDateShort(event.date)}</p>
            </li>
          ))}
          {holidays.map((event, idx) => (
            <li key={`h-${idx}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--info-bg)] text-[var(--info-fg)]">
                <Calendar className="h-4 w-4" aria-hidden="true"/>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-heading)] truncate">{event.name}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">Holiday</p>
              </div>
              <p className="font-mono text-xs tabular-nums text-[var(--text-muted)]">{formatDateShort(event.date)}</p>
            </li>
          ))}
        </ul>
      );
    })(),
  });

  // Widget 6: Google Notifications — divide-y row list, tone-tinted avatars
  dashboardWidgets.push({
    id: 'notifications',
    title: 'Notifications',
    defaultVisible: true,
    component: (
      <div>
        {!hasGoogleToken ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
              <Bell className="h-5 w-5"/>
            </div>
            <p className="text-body-secondary max-w-[40ch] mx-auto">
              Connect Google to see emails, calendar invites, and shared files in one place.
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push('/nu-mail')}>
              Connect Google
            </Button>
          </div>
        ) : notificationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]"/>
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-8 w-8"/>}
            title="All caught up"
            description="No new notifications right now. New activity will appear here."
          />
        ) : (
          <>
            <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    aria-label={`Open ${notification.type} notification: ${notification.title}`}
                    className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 px-2 text-left transition-colors hover:bg-[var(--bg-surface)]/40 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-aura-sm"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${getNotificationToneClasses(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-heading)] truncate">
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 min-w-0">
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {notification.subtitle}
                        </p>
                        {notification.hasVideo && (
                          <Video className="h-3 w-3 shrink-0 text-accent-600 dark:text-accent-400"
                                 aria-label="Has video call"/>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-2xs tabular-nums text-[var(--text-muted)]">
                      {notification.type === 'calendar'
                        ? notification.subtitle
                        : formatRelativeTime(notification.timestamp)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-4">
              <Button variant="ghost" size="sm" className="flex-1 text-xs"
                      onClick={() => router.push('/nu-mail')}
                      leftIcon={<Mail className="h-3 w-3"/>}>
                Mail
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs"
                      onClick={() => router.push('/nu-drive')}
                      leftIcon={<HardDrive className="h-3 w-3"/>}>
                Drive
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs"
                      onClick={() => router.push('/nu-calendar')}
                      leftIcon={<Calendar className="h-3 w-3"/>}>
                Calendar
              </Button>
            </div>
          </>
        )}
      </div>
    ),
  });

  // Widget 7: New Joiners (conditional)
  if (safeAnalytics.viewType !== 'EMPLOYEE') {
    dashboardWidgets.push({
      id: 'new-joiners',
      title: safeAnalytics.viewType === 'ADMIN' ? 'New joiners' : 'New team members',
      defaultVisible: true,
      component: (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Users className="h-3.5 w-3.5" aria-hidden="true"/>
              <span className="text-2xs font-medium uppercase tracking-wider">This month</span>
            </div>
            <p className="mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight text-[var(--text-heading)]">
              {safeAnalytics.headcount.newJoinees}
            </p>
          </div>
          {safeAnalytics.viewType === 'ADMIN' && (
            <div className="flex flex-col gap-2 pt-1">
              <Button variant="outline" className="w-full" onClick={() => router.push('/employees?filter=new')}>
                View all joiners
              </Button>
              <Button variant="ghost" className="w-full justify-between"
                      onClick={() => router.push('/onboarding')}>
                <span>Manage onboarding</span>
                {activeOnboardingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-full bg-[var(--info-bg)] text-[var(--info-fg)] font-mono tabular-nums">
                    {activeOnboardingCount}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        {/* Inline analytics error banner — flat strip, not a card */}
        {analyticsUnavailable && (
          <div role="alert" className="flex items-center gap-4 rounded-aura-lg border border-[var(--warn-bd)] bg-[var(--warn-bg)] px-5 py-4">
            <AlertCircle className="h-4 w-4 shrink-0 text-[var(--warn-fg)]" aria-hidden="true"/>
            <p className="text-sm text-[var(--text-primary)] flex-1">
              {error ? `Analytics temporarily unavailable: ${error}` : 'Analytics data could not be loaded.'}
              {' '}Some metrics may show default values.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchAnalytics()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true"/>
              Retry
            </Button>
          </div>
        )}

        {/* Aura greeting head — greeting + date + Export / New Hire actions */}
        <motion.header
          initial={{opacity: 0, y: 4}}
          animate="visible"
          variants={{visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-aura-title text-[var(--text-1)]">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-[var(--text-3)]">
              {greetingDate ? `${greetingDate} · ` : ''}Here&apos;s what&apos;s moving across your workspace today.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 self-start">
            <Button variant="ghost" leftIcon={<Download className="h-4 w-4"/>}>
              Export
            </Button>
            {hasPermission(Permissions.EMPLOYEE_CREATE) && (
              <Button variant="primary" leftIcon={<UserPlus className="h-4 w-4"/>}
                      onClick={() => router.push('/employees/new')}>
                New Hire
              </Button>
            )}
          </div>
        </motion.header>

        {/* Aura KPI row — icon tile + mono value + delta pill + sparkline */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {staggerChildren: 0.06, delayChildren: 0.08}
            },
            hidden: {}
          }}
          aria-label="Today at a glance"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            {
              key: 'headcount',
              label: 'Headcount',
              value: safeAnalytics.headcount.total.toLocaleString(),
              icon: <Users className="h-[18px] w-[18px]"/>,
              iconTone: 'accent' as const,
              delta: `${Math.abs(safeAnalytics.headcount.growthPercentage)}%`,
              deltaDir: headcountDir,
              spark: headcountSpark,
              sparkColor: 'var(--chart-1)',
              foot: safeAnalytics.headcount.newJoinees > 0 ? `+${safeAnalytics.headcount.newJoinees} this month` : 'Stable this month',
            },
            {
              key: 'present',
              label: 'Present today',
              value: safeAnalytics.attendance.present.toLocaleString(),
              icon: <Fingerprint className="h-[18px] w-[18px]"/>,
              iconTone: 'success' as const,
              delta: safeAnalytics.attendance.late > 0 ? `${safeAnalytics.attendance.late} late` : 'On time',
              deltaDir: 'flat' as const,
              spark: presentSpark,
              sparkColor: 'var(--chart-3)',
              foot: `${presentPct}% of workforce`,
            },
            {
              key: 'onleave',
              label: 'On leave',
              value: safeAnalytics.attendance.onLeave.toLocaleString(),
              icon: <Palmtree className="h-[18px] w-[18px]"/>,
              iconTone: 'warning' as const,
              delta: `${Math.abs(safeAnalytics.leave.utilizationPercentage)}%`,
              deltaDir: 'down' as const,
              spark: onLeaveSpark,
              sparkColor: 'var(--chart-4)',
              foot: `${safeAnalytics.leave.pending} pending request${safeAnalytics.leave.pending === 1 ? '' : 's'}`,
            },
            {
              key: 'payroll',
              label: 'Payroll',
              value: safeAnalytics.payroll ? formatCurrency(safeAnalytics.payroll.currentMonth.total) : '—',
              icon: <Banknote className="h-[18px] w-[18px]"/>,
              iconTone: 'info' as const,
              delta: safeAnalytics.payroll?.currentMonth.status === 'PROCESSED' ? 'Paid' : 'On track',
              deltaDir: 'up' as const,
              spark: payrollSparkSeries,
              sparkColor: 'var(--chart-5)',
              foot: safeAnalytics.payroll
                ? `${safeAnalytics.payroll.currentMonth.processed} of ${safeAnalytics.headcount.total} processed`
                : 'No payroll access',
            },
          ].map((kpi) => (
            <motion.div
              key={kpi.key}
              variants={{
                hidden: {opacity: 0, y: 6},
                visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}
              }}
            >
              <Card padding="md" className="h-full">
                <Stat
                  label={kpi.label}
                  value={kpi.value}
                  icon={kpi.icon}
                  iconTone={kpi.iconTone}
                  delta={kpi.delta}
                  deltaDir={kpi.deltaDir}
                  spark={<Sparkline data={kpi.spark} color={kpi.sparkColor} height={34} ariaLabel={`${kpi.label} trend over time`}/>}
                  foot={kpi.foot}
                />
              </Card>
            </motion.div>
          ))}
        </motion.section>

        {/* Headcount growth (area + range) + Attendance donut */}
        <motion.section
          initial={{opacity: 0, y: 6}}
          animate="visible"
          variants={{visible: {opacity: 1, y: 0, transition: {duration: 0.45, ease: EASE, delay: 0.16}}}}
          className="grid gap-4 xl:grid-cols-[2fr_1fr]"
        >
          <Card padding="md" className="min-w-0">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-[var(--text-1)]">Headcount growth</h2>
                <p className="text-xs text-[var(--text-3)]">
                  Net employees over the last {rangeWindow} months
                </p>
              </div>
              <Segmented
                aria-label="Headcount trend range"
                value={headcountRange}
                onChange={setHeadcountRange}
                options={[
                  {value: '3m', label: '3M'},
                  {value: '6m', label: '6M'},
                  {value: '12m', label: '12M'},
                ]}
              />
            </div>
            {headcountValues.length >= 2 ? (
              <AreaChart
                data={headcountValues}
                labels={headcountLabels}
                height={252}
                color="var(--chart-1)"
                ariaLabel={`Headcount growth trend: starting at ${headcountValues[0]}, ending at ${headcountValues[headcountValues.length - 1]}, over ${rangeWindow} months`}
              />
            ) : (
              <div className="flex h-[252px] items-center justify-center text-sm text-[var(--text-3)]">
                Not enough trend data to plot yet.
              </div>
            )}
          </Card>

          <Card padding="md" className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-1)]" role="heading" aria-level={2}>Attendance</h2>
                <p className="text-xs text-[var(--text-3)]">Today, live</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-aura-full bg-[var(--ok-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--ok-fg)]">
                <span className="h-2 w-2 rounded-full bg-[var(--ok-fg)]" aria-hidden="true"/>
                Live
              </span>
            </div>
            {donutData.length > 0 ? (
              <>
                <div className="grid place-items-center py-2">
                  <Donut
                    data={donutData}
                    size={160}
                    thickness={24}
                    center={{value: `${presentPct}%`, label: 'present'}}
                    ariaLabel={`Attendance distribution today: ${presentPct}% present (${att.present}), ${Math.round((att.onLeave / donutTotal) * 100)}% on leave (${att.onLeave}), ${Math.round((att.absent / donutTotal) * 100)}% absent (${att.absent})`}
                  />
                </div>
                <ul className="mt-2 flex flex-col gap-2.5">
                  {[
                    {label: 'Present', value: att.present, colorClass: 'bg-[var(--chart-1)]'},
                    {label: 'On leave', value: att.onLeave, colorClass: 'bg-[var(--chart-4)]'},
                    {label: 'Absent', value: att.absent, colorClass: 'bg-[var(--chart-5)]'},
                  ].map((row) => (
                    <li key={row.label} className="flex items-center gap-2.5 text-[13px]">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${row.colorClass}`} aria-hidden="true"/>
                      <span className="font-medium text-[var(--text-2)]">{row.label}</span>
                      <span className="num ml-auto font-semibold text-[var(--text-1)]">{row.value.toLocaleString()}</span>
                      <span className="num w-10 text-right text-[var(--text-3)]">
                        {Math.round((row.value / donutTotal) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex h-[160px] items-center justify-center text-sm text-[var(--text-3)]">
                No attendance recorded today.
              </div>
            )}
          </Card>
        </motion.section>

        {/* Attendance strip — flattened from a card with side-stripe to a quiet row */}
        <motion.section
          initial={{opacity: 0, y: 6}}
          animate="visible"
          variants={{visible: {opacity: 1, y: 0, transition: {duration: 0.45, ease: EASE, delay: 0.2}}}}
          aria-label="Today's attendance"
          className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center rounded-aura-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-5 sm:px-6"
        >
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-aura-lg bg-[var(--info-bg)] text-[var(--info-fg)]">
              <Clock className="h-5 w-5" aria-hidden="true"/>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-heading)]">
                Today&apos;s attendance
              </h2>
              {timeEntries.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <LogIn className="h-3.5 w-3.5 text-success-600 dark:text-success-400" aria-hidden="true"/>
                    <span className="text-[var(--text-secondary)]">First in</span>
                    <span className="font-mono font-medium tabular-nums text-[var(--text-heading)]">
                      {new Date(timeEntries[0].checkInTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </span>
                  {timeEntries.filter(e => e.checkOutTime).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <LogOut className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" aria-hidden="true"/>
                      <span className="text-[var(--text-secondary)]">Last out</span>
                      <span className="font-mono font-medium tabular-nums text-[var(--text-heading)]">
                        {new Date(timeEntries.filter(e => e.checkOutTime).slice(-1)[0].checkOutTime!).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </span>
                  )}
                  {timeEntries.length > 1 && (
                    <span className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      {timeEntries.length} sessions
                    </span>
                  )}
                  {hasOpenSession && (
                    <span className="inline-flex items-center px-2 h-5 text-2xs font-semibold uppercase tracking-wider rounded-full bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300">
                      Working
                    </span>
                  )}
                </div>
              ) : todayAttendance ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
                  {todayAttendance.checkInTime && (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <LogIn className="h-3.5 w-3.5 text-success-600 dark:text-success-400" aria-hidden="true"/>
                      <span className="text-[var(--text-secondary)]">In</span>
                      <span className="font-mono font-medium tabular-nums text-[var(--text-heading)]">
                        {new Date(todayAttendance.checkInTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </span>
                  )}
                  {todayAttendance.checkOutTime && (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <LogOut className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" aria-hidden="true"/>
                      <span className="text-[var(--text-secondary)]">Out</span>
                      <span className="font-mono font-medium tabular-nums text-[var(--text-heading)]">
                        {new Date(todayAttendance.checkOutTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-[var(--text-secondary)]">You haven&apos;t checked in yet.</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 justify-end">
            {clockError && <span className="text-sm text-danger-700 dark:text-danger-300">{clockError}</span>}
            {canCheckIn && (
              <Button variant="primary" onClick={handleCheckIn} isLoading={checkInMutation.isPending}
                      leftIcon={<LogIn className="h-4 w-4"/>}>
                Check in
              </Button>
            )}
            {canCheckOut && (
              <Button variant="danger" onClick={handleCheckOut} isLoading={checkOutMutation.isPending}
                      leftIcon={<LogOut className="h-4 w-4"/>}>
                Check out
              </Button>
            )}
            {attendanceComplete && (
              <Button variant="outline" disabled>
                Checked out
              </Button>
            )}
          </div>
        </motion.section>

        {/* Widget grid - draggable, preserved */}
        <DashboardGrid
          widgets={dashboardWidgets}
          dashboardId="main-dashboard"
          columns={2}
        />
      </div>

      {/* Calendar Event Modal */}
      {selectedEvent && selectedEvent.calendarEvent && (
        <Modal isOpen={!!(selectedEvent && selectedEvent.calendarEvent)} onClose={() => setSelectedEvent(null)} size="md">
          <ModalHeader onClose={() => setSelectedEvent(null)}>Event Details</ModalHeader>
          <ModalBody className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedEvent.calendarEvent.summary}
                </h3>
                {selectedEvent.calendarEvent.organizer && (
                  <p className="text-body-secondary mt-1">
                    Organized
                    by {selectedEvent.calendarEvent.organizer.displayName || selectedEvent.calendarEvent.organizer.email}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                <Clock className="h-5 w-5 flex-shrink-0"/>
                <div>
                  <p className="font-medium">
                    {selectedEvent.calendarEvent.start.dateTime
                      ? format(new Date(selectedEvent.calendarEvent.start.dateTime), 'EEEE, MMMM d')
                      : format(new Date(selectedEvent.calendarEvent.start.date!), 'EEEE, MMMM d')}
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
                  <MapPin className="h-5 w-5 flex-shrink-0"/>
                  <p>{selectedEvent.calendarEvent.location}</p>
                </div>
              )}

              {selectedEvent.calendarEvent.hangoutLink && (
                <div className="flex items-center gap-4 text-[var(--accent-primary)]">
                  <Video className="h-5 w-5 flex-shrink-0"/>
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
                    <UsersIcon className="h-5 w-5 flex-shrink-0"/>
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
          </ModalBody>
          <ModalFooter className="gap-4">
            {selectedEvent.calendarEvent.hangoutLink && (
              <Button
                variant="primary"
                className="flex-1"
                leftIcon={<Video className="h-4 w-4"/>}
                onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.hangoutLink, '_blank')}
              >
                Join Meeting
              </Button>
            )}
            <Button
              variant="outline"
              className={selectedEvent.calendarEvent.hangoutLink ? '' : 'flex-1'}
              leftIcon={<ExternalLink className="h-4 w-4"/>}
              onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.htmlLink, '_blank')}
            >
              Open in Calendar
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Email Preview Modal */}
      {selectedEmail && (
        <Modal
          isOpen={!!selectedEmail}
          onClose={() => {
            setSelectedEmail(null);
            setEmailContent('');
          }}
          size="lg"
        >
          <ModalHeader
            onClose={() => {
              setSelectedEmail(null);
              setEmailContent('');
            }}
          >
            {selectedEmail.title}
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-aura-lg flex items-center justify-center bg-[var(--err-bg)] text-[var(--err-fg)]">
                <Mail className="h-5 w-5"/>
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
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]"/>
                </div>
              ) : (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{__html: sanitizeEmailHtml(emailContent)}}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter className="gap-4">
            <Button
              variant="primary"
              className="flex-1"
              leftIcon={<ExternalLink className="h-4 w-4"/>}
              onClick={() => router.push('/nu-mail')}
            >
              Open in NU-Mail
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Drive File Preview Modal */}
      {selectedFile && selectedFile.driveFile && (
        <Modal isOpen={!!(selectedFile && selectedFile.driveFile)} onClose={() => setSelectedFile(null)} size="xl">
          <ModalHeader onClose={() => setSelectedFile(null)}>
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-aura-lg flex items-center justify-center flex-shrink-0 bg-[var(--warn-bg)] text-[var(--warn-fg)]">
                <HardDrive className="h-5 w-5"/>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                  {selectedFile.driveFile.name}
                </h2>
                <p className="text-body-secondary">{selectedFile.subtitle}</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="p-0">
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
          </ModalBody>
          <ModalFooter className="gap-4">
            <Button
              variant="primary"
              className="flex-1"
              leftIcon={<ExternalLink className="h-4 w-4"/>}
              onClick={() => router.push('/nu-drive')}
            >
              Open in NU-Drive
            </Button>
            {selectedFile.driveFile.webViewLink && (
              <Button
                variant="outline"
                leftIcon={<ExternalLink className="h-4 w-4"/>}
                onClick={() => safeWindowOpen(selectedFile.driveFile!.webViewLink, '_blank')}
              >
                Open in Drive
              </Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </AppLayout>
  );
}
