'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { timeTrackingService } from '@/lib/services/time-tracking.service';
import { TimeEntry, TimeEntryStatus } from '@/lib/types/time-tracking';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useMyTimeTrackingEntries,
  useTimeSummary,
  useSubmitMultipleTimeEntries,
} from '@/lib/hooks/queries/useTimeTracking';
import {
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Timer,
  FileText,
  Loader2,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Send,
} from 'lucide-react';

export default function TimeTrackingPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  const { weekStart, weekEnd } = useMemo(() => timeTrackingService.getWeekDates(), []);
  const { data: entriesData, isLoading, error } = useMyTimeTrackingEntries(0, 20);
  const { data: summaryData } = useTimeSummary(weekStart, weekEnd);
  const submitMultipleMutation = useSubmitMultipleTimeEntries();

  const entries = entriesData?.content || [];

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

  const getStatusConfig = (status: TimeEntryStatus) => {
    const configs: Record<TimeEntryStatus, { bg: string; text: string; icon: typeof Clock }> = {
      DRAFT: {
        bg: 'bg-surface-100 dark:bg-surface-800',
        text: 'text-surface-600 dark:text-surface-400',
        icon: FileText,
      },
      SUBMITTED: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Clock,
      },
      APPROVED: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        icon: CheckCircle,
      },
      REJECTED: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
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
      console.error('Error submitting entries:', error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-surface-600 dark:text-surface-400">Loading time entries...</p>
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
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-surface-600 dark:text-surface-400">{error instanceof Error ? error.message : 'Failed to load time entries'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Time Tracking
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Log and manage your time entries
            </p>
          </div>
          <button
            onClick={() => router.push('/time-tracking/new')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30"
          >
            <Plus className="h-5 w-5" />
            Log Time
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
                <Timer className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              This Week
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {timeTrackingService.formatHours(summary.totalHours)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              Billable Hours
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {timeTrackingService.formatHours(summary.billableHours)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              Pending Approval
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {timeTrackingService.formatHours(summary.pendingHours)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-surface-500 to-surface-600">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
              Draft Entries
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                {summary.draftCount}
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Submit */}
        {draftEntries.length > 0 && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                You have {draftEntries.length} draft entries ready to submit
              </span>
            </div>
            <button
              onClick={handleSubmitSelected}
              disabled={selectedEntries.length === 0 || submitMultipleMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {submitMultipleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Selected ({selectedEntries.length})
            </button>
          </div>
        )}

        {/* Entries List */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-800">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              Recent Time Entries
            </h2>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Timer className="h-12 w-12 text-surface-300 dark:text-surface-600 mb-4" />
              <p className="text-surface-500 dark:text-surface-400">No time entries found</p>
              <button
                onClick={() => router.push('/time-tracking/new')}
                className="mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
              >
                Log your first time entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
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
                        className="rounded border-surface-300"
                      />
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {entries.map((entry) => {
                    const statusConfig = getStatusConfig(entry.status);
                    const StatusIcon = statusConfig.icon;
                    const isDraft = entry.status === 'DRAFT';

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          {isDraft && (
                            <input
                              type="checkbox"
                              checked={selectedEntries.includes(entry.id)}
                              onChange={() => handleSelectEntry(entry.id)}
                              className="rounded border-surface-300"
                            />
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-700 dark:text-surface-300">
                            {entry.projectName || entry.clientName || 'General'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {timeTrackingService.formatHours(entry.hoursWorked)}
                          </span>
                          {entry.isBillable && (
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                              (Billable)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {timeTrackingService.getEntryTypeLabel(entry.entryType)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => router.push(`/time-tracking/${entry.id}`)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
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
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/time-tracking/new')}
            className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Log Time
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Create a new time entry
            </p>
          </button>

          <button
            onClick={() => router.push('/time-tracking?view=week')}
            className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:scale-110 transition-transform">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Weekly View
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              See your weekly timesheet
            </p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
