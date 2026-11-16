'use client';

import {
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Coffee,
  CreditCard,
  FileText,
  Gift,
  HardDrive,
  Mail,
  UserCheck,
  Users,
  UserX,
  Video,
} from 'lucide-react';
import {Progress} from '@mantine/core';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import type {DashboardWidget} from '@/components/ui/DashboardGrid';
import type {DashboardAnalytics} from '@/lib/types/core/analytics';
import {formatCurrency} from '@/lib/utils';
import {formatDateShort} from '@/lib/utils/format/date';
import type {GoogleNotification} from '../_types';
import {formatRelativeTime} from '../_utils';

type NotificationType = GoogleNotification['type'];

const NOTIFICATION_ICON: Record<NotificationType, typeof Mail> = {
  email: Mail,
  drive: HardDrive,
  calendar: Calendar,
};

const NOTIFICATION_TONE: Record<NotificationType, string> = {
  email: 'bg-status-err-bg text-status-err-fg',
  drive: 'bg-status-warn-bg text-status-warn-fg',
  calendar: 'bg-status-info-bg text-status-info-fg',
};

const LIST_CLASS = 'divide-y divide-border border-y border-border';
const ROW_CLASS = 'grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4';

function MetricLabel({icon: Icon, children}: {icon: typeof Mail; children: React.ReactNode}) {
  return (
    <div className="flex items-center gap-2 text-text-3">
      <Icon className="h-4 w-4" aria-hidden="true"/>
      <span className="text-2xs font-medium uppercase tracking-wider">{children}</span>
    </div>
  );
}

function BigNumber({children, className = 'text-text-1'}: {children: React.ReactNode; className?: string}) {
  return <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${className}`}>{children}</p>;
}

interface NotificationsState {
  notifications: GoogleNotification[];
  notificationsLoading: boolean;
  hasGoogleToken: boolean;
  handleNotificationClick: (notification: GoogleNotification) => void;
}

interface BuildDashboardWidgetsArgs {
  analytics: DashboardAnalytics;
  activeOnboardingCount: number;
  google: NotificationsState;
  navigate: (href: string) => void;
}

function NotificationsWidget({google, navigate}: {google: NotificationsState; navigate: (href: string) => void}) {
  const {notifications, notificationsLoading, hasGoogleToken, handleNotificationClick} = google;

  if (!hasGoogleToken) {
    return (
      <EmptyState
        size="compact"
        icon={<Bell className="h-8 w-8"/>}
        title="Connect Google"
        description="Connect Google to see emails, calendar invites, and shared files in one place."
        actionLabel="Connect Google"
        onAction={() => navigate('/nu-mail')}
      />
    );
  }
  if (notificationsLoading) {
    return (
      <SkeletonRegion label="Loading notifications">
        <div className="flex flex-col gap-4 py-2">
          {Array.from({length: 3}).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Bone height={32} width={32} circle/>
              <div className="flex flex-1 flex-col gap-2">
                <Bone height={12} width="60%" radius="sm"/>
                <Bone height={12} width="35%" radius="sm"/>
              </div>
            </div>
          ))}
        </div>
      </SkeletonRegion>
    );
  }
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle className="h-8 w-8"/>}
        title="All caught up"
        description="No new notifications right now. New activity will appear here."
      />
    );
  }
  return (
    <>
      <ul className={LIST_CLASS}>
        {notifications.map((notification) => {
          const Icon = NOTIFICATION_ICON[notification.type] ?? Bell;
          return (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => handleNotificationClick(notification)}
                aria-label={`Open ${notification.type} notification: ${notification.title}`}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md px-2 py-4 text-left transition-colors hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${NOTIFICATION_TONE[notification.type] ?? 'bg-surface-100 text-text-2'}`}>
                  <Icon className="h-4 w-4"/>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-1">{notification.title}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <p className="truncate text-xs text-text-2">{notification.subtitle}</p>
                    {notification.hasVideo && (
                      <Video className="h-3 w-3 shrink-0 text-accent" aria-label="Has video call"/>
                    )}
                  </div>
                </div>
                <span className="text-2xs tabular-nums text-text-3">
                  {notification.type === 'calendar' ? notification.subtitle : formatRelativeTime(notification.timestamp)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2 pt-4">
        <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => navigate('/nu-mail')}
                leftIcon={<Mail className="h-3 w-3"/>}>
          Mail
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => navigate('/nu-drive')}
                leftIcon={<HardDrive className="h-3 w-3"/>}>
          Drive
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => navigate('/nu-calendar')}
                leftIcon={<Calendar className="h-3 w-3"/>}>
          Calendar
        </Button>
      </div>
    </>
  );
}

/** Widgets for the draggable DashboardGrid; conditional widgets follow the analytics view type. */
export function buildDashboardWidgets({
  analytics,
  activeOnboardingCount,
  google,
  navigate,
}: BuildDashboardWidgetsArgs): DashboardWidget[] {
  const widgets: DashboardWidget[] = [];
  const {attendance, headcount, payroll, viewType} = analytics;

  widgets.push({
    id: 'attendance-overview',
    title: 'Attendance breakdown',
    defaultVisible: true,
    component: (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-3">Today</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/attendance')}
                  rightIcon={<ChevronRight className="h-4 w-4"/>} className="text-xs">
            View all
          </Button>
        </div>
        <div className="grid grid-cols-2 divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            {label: 'On time', value: attendance.onTime, icon: UserCheck, tone: 'neutral' as const},
            {label: 'Late', value: attendance.late, icon: Clock, tone: attendance.late > 0 ? 'warning' as const : 'neutral' as const},
            {label: 'On leave', value: attendance.onLeave, icon: Coffee, tone: 'neutral' as const},
            {label: 'Absent', value: attendance.absent, icon: UserX, tone: attendance.absent > 0 ? 'danger' as const : 'neutral' as const},
          ].map((item) => (
            <div key={item.label} className="px-4 py-6 first:pl-0 last:pr-0">
              <MetricLabel icon={item.icon}>{item.label}</MetricLabel>
              <BigNumber
                className={item.tone === 'danger' ? 'text-status-err-fg' : item.tone === 'warning' ? 'text-status-warn-fg' : 'text-text-1'}
              >
                {item.value}
              </BigNumber>
            </div>
          ))}
        </div>
      </div>
    ),
  });

  widgets.push({
    id: 'quick-actions',
    title: 'Jump in',
    defaultVisible: true,
    component: (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {label: 'Apply leave', icon: Calendar, href: '/leave/apply'},
          {label: 'View payslip', icon: FileText, href: '/payroll'},
          {label: 'Expenses', icon: CreditCard, href: '/expenses'},
          {label: 'Directory', icon: Users, href: '/employees'},
        ].map((action) => (
          <button
            key={action.href}
            type="button"
            onClick={() => navigate(action.href)}
            aria-label={`Navigate to ${action.label}`}
            className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-border-strong hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-100 text-text-2 dark:bg-surface-800">
              <action.icon className="h-4 w-4" aria-hidden="true"/>
            </div>
            <span className="min-w-0 flex-1 text-sm font-medium text-text-1">{action.label}</span>
            <ArrowRight className="h-4 w-4 text-text-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true"/>
          </button>
        ))}
      </div>
    ),
  });

  // The larger of the API total or the distribution sum guards against dept counts > headcount.total.
  const distribSum = headcount.departmentDistribution.reduce((acc, d) => acc + (d.count || 0), 0);
  const distribDenominator = Math.max(headcount.total, distribSum);

  if (headcount.departmentDistribution && headcount.departmentDistribution.length > 0) {
    widgets.push({
      id: 'department-distribution',
      title: viewType === 'ADMIN' ? 'Department headcount' : 'Team distribution',
      defaultVisible: true,
      component: (
        <ul className={LIST_CLASS}>
          {headcount.departmentDistribution.slice(0, 5).map((dept, idx) => {
            const percentage = distribDenominator > 0
              ? Math.min(100, Math.round((dept.count / distribDenominator) * 100))
              : 0;
            return (
              <li key={idx} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-1">{dept.department}</p>
                  <Progress
                    className="mt-2 max-w-xs"
                    size="xs"
                    color="var(--accent-primary)"
                    value={percentage}
                    aria-label={`${dept.department}: ${percentage}%`}
                  />
                </div>
                <p className="text-sm tabular-nums text-text-2">
                  {dept.count} <span className="text-text-3">· {percentage}%</span>
                </p>
              </li>
            );
          })}
        </ul>
      ),
    });
  }

  if (viewType === 'ADMIN' && payroll) {
    widgets.push({
      id: 'payroll-summary',
      title: 'Payroll summary',
      defaultVisible: true,
      component: (
        <div className="flex flex-col gap-4">
          <div>
            <MetricLabel icon={Briefcase}>Current month</MetricLabel>
            <BigNumber>{formatCurrency(payroll.currentMonth.total)}</BigNumber>
          </div>
          <ul className={LIST_CLASS}>
            <li className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
              <span className="text-sm text-text-2">Processed</span>
              <span className="text-sm font-medium tabular-nums text-text-1">{payroll.currentMonth.processed}</span>
            </li>
            <li className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
              <span className="text-sm text-text-2">Pending</span>
              <span className="text-sm font-medium tabular-nums text-text-1">
                {headcount.total - payroll.currentMonth.processed}
              </span>
            </li>
          </ul>
        </div>
      ),
    });
  }

  const birthdays = (analytics.upcomingEvents?.birthdays ?? []).slice(0, 3);
  const holidays = (analytics.upcomingEvents?.holidays ?? []).slice(0, 2);
  widgets.push({
    id: 'upcoming-events',
    title: 'Upcoming',
    defaultVisible: true,
    component: birthdays.length === 0 && holidays.length === 0 ? (
      <EmptyState
        icon={<Calendar className="h-8 w-8"/>}
        title="No upcoming events"
        description="Birthdays and holidays will appear here as they approach."
      />
    ) : (
      <ul className={LIST_CLASS}>
        {birthdays.map((event, idx) => (
          <li key={`b-${idx}`} className={ROW_CLASS}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-warn-bg text-status-warn-fg">
              <Gift className="h-4 w-4" aria-hidden="true"/>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-1">{event.employeeName}</p>
              <p className="truncate text-xs text-text-2">Birthday</p>
            </div>
            <p className="text-xs tabular-nums text-text-3">{formatDateShort(event.date)}</p>
          </li>
        ))}
        {holidays.map((event, idx) => (
          <li key={`h-${idx}`} className={ROW_CLASS}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-info-bg text-status-info-fg">
              <Calendar className="h-4 w-4" aria-hidden="true"/>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-1">{event.name}</p>
              <p className="truncate text-xs text-text-2">Holiday</p>
            </div>
            <p className="text-xs tabular-nums text-text-3">{formatDateShort(event.date)}</p>
          </li>
        ))}
      </ul>
    ),
  });

  widgets.push({
    id: 'notifications',
    title: 'Notifications',
    defaultVisible: true,
    component: <NotificationsWidget google={google} navigate={navigate}/>,
  });

  if (viewType !== 'EMPLOYEE') {
    widgets.push({
      id: 'new-joiners',
      title: viewType === 'ADMIN' ? 'New joiners' : 'New team members',
      defaultVisible: true,
      component: (
        <div className="flex flex-col gap-4">
          <div>
            <MetricLabel icon={Users}>This month</MetricLabel>
            <BigNumber>{headcount.newJoinees}</BigNumber>
          </div>
          {viewType === 'ADMIN' && (
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={() => navigate('/employees?filter=new')}>
                View all joiners
              </Button>
              <Button variant="ghost" className="w-full justify-between" onClick={() => navigate('/onboarding')}>
                <span>Manage onboarding</span>
                {activeOnboardingCount > 0 && (
                  <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full bg-status-info-bg px-2 text-2xs font-semibold tabular-nums text-status-info-fg">
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

  return widgets;
}
