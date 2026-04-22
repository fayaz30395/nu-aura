'use client';

import {useEffect, useMemo, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {timeTrackingService} from '@/lib/services/hrms/time-tracking.service';
import {TimeEntryStatus} from '@/lib/types/hrms/time-tracking';
import {
  useMyTimeTrackingEntries,
  useSubmitMultipleTimeEntries,
  useTimeSummary,
} from '@/lib/hooks/queries/useTimeTracking';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {TablePagination,} from '@/components/ui';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  Send,
  Timer,
  XCircle,
} from 'lucide-react';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('TimeTrackingListPage');

export default function TimeTrackingPage() {
  const router = useRouter();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.TIMESHEET_VIEW, Permissions.TIME_TRACKING_VIEW, Permissions.TIME_TRACKING_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const queryClient = useQueryClient();
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const {weekStart, weekEnd} = useMemo(() => timeTrackingService.getWeekDates(), []);
  const {data: entriesData, isLoading, error} = useMyTimeTrackingEntries(currentPage, pageSize);
  const {data: summaryData} = useTimeSummary(weekStart, weekEnd);
  const submitMultipleMutation = useSubmitMultipleTimeEntries();

  // Stable reference: prevents summary useMemo from re-running on every render.
  const entries = useMemo(() => entriesData?.content ?? [], [entriesData]);
  const totalPages = entriesData?.totalPages ?? 0;
  const totalElements = entriesData?.totalElements ?? 0;

  const summary = useMemo(() => {
    const draftEntries = entries.filter((e) => e.status === 'DRAFT');
    const billableHours = entries
      .filter((e) => e.isBillable && e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.billableHours, 0);
    const pendingHours = entries
      .filter((e) => e.status === 'SUBMITTED')
      .reduce((sum, e) => sum + e.hoursWorked, 0);


    return {
      totalHours: summaryData?.totalHoursWorked || 0,
      billableHours,
      pendingHours,
      draftCount: draftEntries.length,
    };
  }, [entries, summaryData]);

  if (!permissionsReady || !hasAccess) return null;

  const getStatusConfig = (status: TimeEntryStatus) => {
    const configs: Record<TimeEntryStatus, { bg: string; text: string; icon: typeof Clock }> = {
      DRAFT: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
        icon: FileText,
      },
      SUBMITTED: {
        bg: "bg-status-warning-bg",
        text: "text-status-warning-text",
        icon: Clock,
      },
      APPROVED: {
        bg: "bg-status-success-bg",
        text: "text-status-success-text",
        icon: CheckCircle,
      },
      REJECTED: {
        bg: "bg-status-danger-bg",
        text: "text-status-danger-text",
        icon: XCircle,
      },
    };
    return configs[status] || configs.DRAFT;
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntries((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmitSelected = async () => {
    if (selectedEntries.length === 0) return;

    try {
      await submitMultipleMutation.mutateAsync(selectedEntries);
      setSelectedEntries([]);
    } catch (error) {
      log.error('Error submitting entries:', error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className='h-8 w-8 animate-spin text-accent'/>
            <p className="text-[var(--text-secondary)]">Loading time entries...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className='h-12 w-12 text-status-danger-text'/>
            <p
              className="text-[var(--text-secondary)]">{error instanceof Error ? error.message : 'Failed to load time entries'}</p>
            <button
              onClick={() => queryClient.invalidateQueries({queryKey: ['time-tracking']})}
              className='px-4 py-2 bg-accent text-inverse rounded-xl hover:bg-accent transition-colors'
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const draftEntries = entries.filter((e) => e.status === 'DRAFT');

  return (
    <AppLayout activeMenuItem="time-tracking">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Time Tracking
            </h1>
            <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">
              Log and manage your time entries
            </p>
          </div>
          <PermissionGate permission={Permissions.TIME_TRACKING_CREATE} fallback={<div/>}>
            <button
              onClick={() => router.push('/time-tracking/new')}
              className='flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-700 hover:to-accent-700 text-inverse rounded-xl font-medium shadow-[var(--shadow-dropdown)] shadow-accent-500/25 transition-all duration-200 hover:shadow-[var(--shadow-dropdown)] hover:shadow-accent-500/30'
            >
              <Plus className="h-5 w-5"/>
              Log Time
            </button>
          </PermissionGate>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700">
                <Timer className='h-5 w-5 text-inverse'/>
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              This Week
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {timeTrackingService.formatHours(summary.totalHours)}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-success-500 to-success-600">
                <DollarSign className='h-5 w-5 text-inverse'/>
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Billable Hours
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {timeTrackingService.formatHours(summary.billableHours)}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-warning-500 to-warning-600">
                <Clock className='h-5 w-5 text-inverse'/>
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Pending Approval
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {timeTrackingService.formatHours(summary.pendingHours)}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-surface-500 to-surface-600">
                <FileText className='h-5 w-5 text-inverse'/>
              </div>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              Draft Entries
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {summary.draftCount}
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Submit */}
        {draftEntries.length > 0 && (
          <PermissionGate permission={Permissions.TIME_TRACKING_UPDATE}>
            <div
              className='row-between bg-status-warning-bg border border-status-warning-border rounded-xl p-4'>
              <div className="flex items-center gap-4">
                <AlertCircle className='h-5 w-5 text-status-warning-text'/>
                <span className='text-sm text-status-warning-text'>
                  You have {draftEntries.length} draft entries ready to submit
                </span>
              </div>
              <button
                onClick={handleSubmitSelected}
                disabled={selectedEntries.length === 0 || submitMultipleMutation.isPending}
                className='flex items-center gap-2 px-4 py-2 bg-status-warning-bg text-inverse rounded-lg hover:bg-status-warning-bg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                {submitMultipleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                  <Send className="h-4 w-4"/>
                )}
                Submit Selected ({selectedEntries.length})
              </button>
            </div>
          </PermissionGate>
        )}

        {/* Entries List */}
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] overflow-hidden">
          <div className="row-between p-6 border-b border-[var(--border-main)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Recent Time Entries
            </h2>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Timer className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-4"/>
              <p className="text-[var(--text-muted)]">No time entries found</p>
              <button
                onClick={() => router.push('/time-tracking/new')}
                className='mt-4 text-accent hover:text-accent text-sm font-medium'
              >
                Log your first time entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                <tr className="bg-[var(--bg-secondary)]/50">
                  <th
                    className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={
                        selectedEntries.length === draftEntries.length && draftEntries.length > 0
                      }
                      onChange={() =>
                        setSelectedEntries(
                          selectedEntries.length === draftEntries.length
                            ? []
                            : draftEntries.map((e) => e.id)
                        )
                      }
                      className="rounded border-[var(--border-main)]"
                    />
                  </th>
                  <th
                    className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Date
                  </th>
                  <th
                    className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Project
                  </th>
                  <th
                    className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Hours
                  </th>
                  <th
                    className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Type
                  </th>
                  <th
                    className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
                </thead>
                <tbody className='divide-y divide-surface-100'>
                {entries.map((entry) => {
                  const statusConfig = getStatusConfig(entry.status);
                  const StatusIcon = statusConfig.icon;
                  const isDraft = entry.status === 'DRAFT';

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {isDraft && (
                          <input
                            type="checkbox"
                            checked={selectedEntries.includes(entry.id)}
                            onChange={() => handleSelectEntry(entry.id)}
                            className="rounded border-[var(--border-main)]"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                          <span className="text-body-secondary">
                            {entry.projectName || entry.clientName || 'General'}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {timeTrackingService.formatHours(entry.hoursWorked)}
                          </span>
                        {entry.isBillable && (
                          <span className='ml-2 text-xs text-status-success-text'>
                              (Billable)
                            </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                          <span className="text-body-secondary">
                            {timeTrackingService.getEntryTypeLabel(entry.entryType)}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5"/>
                            {entry.status}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/time-tracking/${entry.id}`)}
                          className='text-accent hover:text-accent text-sm font-medium'
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}

          {totalElements > 0 && (
            <div className="px-6 pb-4">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(0);
                }}
              />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PermissionGate permission={Permissions.TIME_TRACKING_CREATE} fallback={<div/>}>
            <button
              onClick={() => router.push('/time-tracking/new')}
              className='group bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 hover:shadow-[var(--shadow-dropdown)] hover:border-[var(--accent-primary)] transition-all duration-200 text-left'
            >
              <div className="row-between mb-4">
                <div
                  className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 group-hover:scale-110 transition-transform">
                  <Plus className='h-5 w-5 text-inverse'/>
                </div>
                <ChevronRight
                  className='h-5 w-5 text-[var(--text-muted)] group-hover:text-accent group-hover:translate-x-1 transition-all'/>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                Log Time
              </h3>
              <p className="text-body-muted">
                Create a new time entry
              </p>
            </button>
          </PermissionGate>

          <button
            onClick={() => router.push('/time-tracking?view=week')}
            className='group bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 hover:shadow-[var(--shadow-dropdown)] hover:border-status-success-border transition-all duration-200 text-left'
          >
            <div className="row-between mb-4">
              <div
                className="p-4 rounded-xl bg-gradient-to-br from-success-500 to-success-600 group-hover:scale-110 transition-transform">
                <CalendarDays className='h-5 w-5 text-inverse'/>
              </div>
              <ChevronRight
                className='h-5 w-5 text-[var(--text-muted)] group-hover:text-status-success-text group-hover:translate-x-1 transition-all'/>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
              Weekly View
            </h3>
            <p className="text-body-muted">
              See your weekly timesheet
            </p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
