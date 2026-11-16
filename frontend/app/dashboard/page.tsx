'use client';

import React, {useEffect, useState} from 'react';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {Download, RefreshCw, UserPlus} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Callout} from '@/components/ui/Callout';
import {DashboardSkeleton} from '@/components/ui/skeletons';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {useDashboardAnalytics} from '@/lib/hooks/queries/useAnalytics';
import {useOnboardingProcessesByStatus} from '@/lib/hooks/queries/useOnboarding';
import type {DashboardAnalytics} from '@/lib/types/core/analytics';
import {DashboardModals} from './_components/DashboardModals';
import {LiveGreeting} from './_components/LiveGreeting';
import {DashboardKpiRow} from './_components/DashboardKpiRow';
import {DashboardCharts, type HeadcountRange} from './_components/DashboardCharts';
import {TodayAttendanceStrip} from './_components/TodayAttendanceStrip';
import {buildDashboardWidgets} from './_components/dashboardWidgets';
import {useGoogleNotifications} from './_hooks/useGoogleNotifications';
import {useDashboardClock} from './_hooks/useDashboardClock';

// Code-split @hello-pangea/dnd (~30-40 KB gz) — only loaded on dashboard
const DashboardGrid = dynamic(
  () => import('@/components/ui/DashboardGrid').then(m => m.DashboardGrid),
  {
    ssr: false,
    loading: () => (
      <SkeletonRegion label="Loading widgets">
        <Bone height={320} radius="lg"/>
      </SkeletonRegion>
    ),
  }
);

const FALLBACK_ANALYTICS: DashboardAnalytics = {
  viewType: 'EMPLOYEE',
  viewLabel: 'Dashboard',
  teamSize: 0,
  attendance: {present: 0, absent: 0, onLeave: 0, onTime: 0, late: 0, attendancePercentage: 0, trend: []},
  leave: {pending: 0, approved: 0, rejected: 0, utilizationPercentage: 0, trend: [], distribution: []},
  payroll: null,
  headcount: {total: 0, newJoinees: 0, exits: 0, growthPercentage: 0, trend: [], departmentDistribution: []},
  upcomingEvents: {birthdays: [], anniversaries: [], holidays: []},
};

export default function DashboardPage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();
  // Presentation-only: slices the real `headcount.trend` series returned by analytics.
  const [headcountRange, setHeadcountRange] = useState<HeadcountRange>('12m');
  const google = useGoogleNotifications();
  const {loadGoogleNotifications} = google;
  const clock = useDashboardClock(user?.employeeId);

  useEffect(() => {
    document.title = 'Dashboard | NU-AURA';
  }, []);

  // DASHBOARD_VIEW (+ ANALYTICS_VIEW) is enforced for /dashboard by the AuthGuard route config.
  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    loadGoogleNotifications();
  }, [hasHydrated, permissionsReady, isAuthenticated, router, loadGoogleNotifications]);

  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    fetchStatus: analyticsFetchStatus,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useDashboardAnalytics();
  const {data: onboardingData = []} = useOnboardingProcessesByStatus('IN_PROGRESS');

  const isLoading = isAnalyticsLoading && analyticsFetchStatus === 'fetching';
  const error = analyticsError instanceof Error ? analyticsError.message : null;

  if (!hasHydrated || isLoading) {
    return (
      <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
        <DashboardSkeleton stats={4}/>
      </AppLayout>
    );
  }

  // Graceful degradation: if analytics fails, show the dashboard with fallback data.
  const analyticsUnavailable = Boolean(error) || !analyticsData;
  const analytics = analyticsData ?? FALLBACK_ANALYTICS;
  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'there';

  const rangeWindow = headcountRange === '3m' ? 3 : headcountRange === '6m' ? 6 : 12;
  const slicedTrend = (analytics.headcount.trend ?? []).slice(-rangeWindow);
  const headcountValues = slicedTrend.map((t) => t.value);
  const headcountLabels = slicedTrend.map((t) => t.label);

  const att = analytics.attendance;
  const donutTotal = (att.present + att.onLeave + att.absent) || 1;
  const presentPct = att.attendancePercentage || Math.round((att.present / donutTotal) * 100);

  const dashboardWidgets = buildDashboardWidgets({
    analytics,
    activeOnboardingCount: onboardingData.length,
    google,
    navigate: (href) => router.push(href),
  });

  return (
    <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
      <div className="flex flex-col gap-6">
        <LiveGreeting
          firstName={firstName}
          actions={
            <>
              <Button variant="ghost" leftIcon={<Download className="h-4 w-4"/>}>
                Export
              </Button>
              {hasPermission(Permissions.EMPLOYEE_CREATE) && (
                <Button variant="primary" leftIcon={<UserPlus className="h-4 w-4"/>}
                        onClick={() => router.push('/employees/new')}>
                  New Hire
                </Button>
              )}
            </>
          }
        />

        {analyticsUnavailable && (
          <div role="alert">
            <Callout
              tone="warning"
              action={
                <Button variant="outline" size="sm" onClick={() => refetchAnalytics()}
                        leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true"/>}>
                  Retry
                </Button>
              }
            >
              {error ? `Analytics temporarily unavailable: ${error}` : 'Analytics data could not be loaded.'}
              {' '}Some metrics may show default values.
            </Callout>
          </div>
        )}

        <DashboardKpiRow analytics={analytics} headcountValues={headcountValues} presentPct={presentPct}/>

        <DashboardCharts
          attendance={att}
          headcountRange={headcountRange}
          onHeadcountRangeChange={setHeadcountRange}
          rangeWindow={rangeWindow}
          headcountValues={headcountValues}
          headcountLabels={headcountLabels}
          presentPct={presentPct}
        />

        <TodayAttendanceStrip clock={clock}/>

        <DashboardGrid widgets={dashboardWidgets} dashboardId="main-dashboard" columns={2}/>
      </div>

      <DashboardModals
        selectedEvent={google.selectedEvent}
        selectedEmail={google.selectedEmail}
        selectedFile={google.selectedFile}
        emailContent={google.emailContent}
        emailLoading={google.emailLoading}
        onCloseEvent={google.closeEvent}
        onCloseEmail={google.closeEmail}
        onCloseFile={google.closeFile}
        onOpenMail={() => router.push('/nu-mail')}
        onOpenDrive={() => router.push('/nu-drive')}
      />
    </AppLayout>
  );
}
