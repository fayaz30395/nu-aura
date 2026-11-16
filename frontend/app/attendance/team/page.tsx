'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ActionIcon, Button, NativeSelect, TextInput} from '@mantine/core';
import {ChevronLeft, ChevronRight, Download, Grid3X3, List, Printer, RefreshCw, Search, Users} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageDeniedFallback} from '@/components/auth/PermissionGate';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {Segmented} from '@/components/ui/Segmented';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {getLocalDateString} from '@/lib/utils/dateUtils';
import {useAttendanceByDate} from '@/lib/hooks/queries/useAttendance';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {formatDate, formatLongDate, formatWeekday} from '@/lib/utils/format/date';
import {
  computeStatusStats,
  exportTeamCsv,
  filterAndSort,
  SortConfig,
  SortKey,
  STATUS_FILTER_OPTIONS,
} from './_components/teamAttendanceUtils';
import {TeamAttendanceGrid, TeamAttendanceTable} from './_components/TeamAttendanceViews';
import {TeamAttendanceStats, TeamStatusDistribution} from './_components/TeamAttendanceSummary';

const BREADCRUMBS = [{label: 'Attendance', href: '/attendance'}, {label: 'Team'}];

function shiftDate(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

export default function TeamAttendancePage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();
  const hasTeamAccess = hasPermission(Permissions.ATTENDANCE_VIEW_TEAM) || hasPermission(Permissions.ATTENDANCE_VIEW_ALL);

  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) router.replace('/auth/login');
  }, [hasHydrated, permissionsReady, isAuthenticated, router]);

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({key: null, direction: 'asc'});

  const attendanceQuery = useAttendanceByDate(selectedDate, 0, 100);
  const records = useMemo<AttendanceRecord[]>(() => attendanceQuery.data?.content ?? [], [attendanceQuery.data]);
  const visibleRecords = useMemo(
    () => filterAndSort(records, searchTerm, statusFilter, sortConfig),
    [records, searchTerm, statusFilter, sortConfig]
  );
  const filtersActive = searchTerm !== '' || statusFilter !== 'all';

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key: prev.key === key ? null : key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const header = (
    <PageHeader
      title="Team Attendance"
      description={`Monitor your team's attendance records for ${formatLongDate(selectedDate)}.`}
      breadcrumbs={BREADCRUMBS}
      actions={
        <>
          <Button variant="default" leftSection={<Printer size={16} aria-hidden="true"/>} onClick={() => window.print()}>
            Print
          </Button>
          <Button
            variant="default"
            leftSection={<Download size={16} aria-hidden="true"/>}
            onClick={() => exportTeamCsv(visibleRecords, selectedDate)}
            disabled={visibleRecords.length === 0}
          >
            Export CSV
          </Button>
        </>
      }
    />
  );

  if (!hasHydrated || !permissionsReady || !isAuthenticated) {
    return (
      <AppLayout activeMenuItem="attendance">
        <ListPageSkeleton/>
      </AppLayout>
    );
  }

  if (!hasTeamAccess) {
    return (
      <AppLayout activeMenuItem="attendance">
        <PageDeniedFallback/>
      </AppLayout>
    );
  }

  const emptyState = (
    <EmptyState
      icon={<Users className="h-full w-full"/>}
      title={filtersActive ? 'No records match your filters' : 'No attendance records'}
      description={filtersActive ? 'Try a different search or status.' : 'No attendance records found for this date.'}
      actionLabel={filtersActive ? 'Clear filters' : 'Go to today'}
      onAction={() => {
        if (filtersActive) {
          setSearchTerm('');
          setStatusFilter('all');
        } else {
          setSelectedDate(getLocalDateString());
        }
      }}
      size="compact"
    />
  );

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="flex flex-col gap-6">
        {header}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Previous day" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}>
              <ChevronLeft size={16}/>
            </ActionIcon>
            <div className="min-w-max text-center" aria-live="polite">
              <p className="text-sm font-semibold text-text-1">{formatDate(selectedDate)}</p>
              <p className="text-xs text-text-3">{formatWeekday(selectedDate)}</p>
            </div>
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Next day" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}>
              <ChevronRight size={16}/>
            </ActionIcon>
            <Button variant="default" size="xs" onClick={() => setSelectedDate(getLocalDateString())}>
              Today
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Segmented
              aria-label="View mode"
              value={viewMode}
              onChange={setViewMode}
              options={[
                {value: 'table', label: 'Table', icon: <List className="h-4 w-4" aria-hidden="true"/>},
                {value: 'grid', label: 'Grid', icon: <Grid3X3 className="h-4 w-4" aria-hidden="true"/>},
              ]}
            />
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Refresh"
              onClick={() => attendanceQuery.refetch()}
              loading={attendanceQuery.isFetching}
            >
              <RefreshCw size={16}/>
            </ActionIcon>
          </div>
        </div>

        <QueryState
          query={attendanceQuery}
          skeleton={<ListPageSkeleton rows={8} columns={7} showHeader={false} showFilters={false}/>}
          errorTitle="Couldn't load team attendance"
        >
          {() => {
            const stats = computeStatusStats(records);
            return (
              <div className="flex flex-col gap-6">
                <TeamAttendanceStats stats={stats}/>
                <TeamStatusDistribution stats={stats}/>

                {records.length > 0 && (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <TextInput
                      className="flex-1"
                      label="Search"
                      placeholder="Search by employee ID..."
                      aria-label="Search by employee ID"
                      leftSection={<Search size={16} aria-hidden="true"/>}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.currentTarget.value)}
                    />
                    <NativeSelect
                      label="Status"
                      aria-label="Filter by status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.currentTarget.value)}
                      data={STATUS_FILTER_OPTIONS}
                      className="sm:w-48"
                    />
                  </div>
                )}

                <section aria-labelledby="team-records-title" className="flex flex-col gap-4">
                  <h2 id="team-records-title" className="text-base font-semibold text-text-1">
                    Team attendance records{visibleRecords.length > 0 ? ` (${visibleRecords.length})` : ''}
                  </h2>
                  {viewMode === 'table' ? (
                    <TeamAttendanceTable records={visibleRecords} sort={sortConfig} onSort={handleSort} emptyState={emptyState}/>
                  ) : visibleRecords.length === 0 ? (
                    emptyState
                  ) : (
                    <TeamAttendanceGrid records={visibleRecords}/>
                  )}
                </section>
              </div>
            );
          }}
        </QueryState>
      </div>
    </AppLayout>
  );
}
