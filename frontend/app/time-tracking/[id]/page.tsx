'use client';

import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { timeTrackingService } from '@/lib/services/time-tracking.service';
import { TimeEntry, TimeEntryStatus } from '@/lib/types/time-tracking';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useTimeEntry,
  useSubmitTimeEntry,
  useDeleteTimeEntry,
} from '@/lib/hooks/queries/useTimeTracking';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  FileText,
  Calendar,
  DollarSign,
  Send,
} from 'lucide-react';

export default function TimeEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, hasHydrated } = useAuth();
  const entryId = params.id as string;

  const { data: entry, isLoading, error } = useTimeEntry(entryId);
  const submitMutation = useSubmitTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  const handleSubmit = async () => {
    if (!entry) return;

    try {
      await submitMutation.mutateAsync(entry.id);
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  const handleDelete = async () => {
    if (!entry || entry.status !== 'DRAFT') return;

    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await deleteMutation.mutateAsync(entry.id);
      router.push('/time-tracking');
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

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

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-surface-600 dark:text-surface-400">Loading time entry...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !entry) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-surface-600 dark:text-surface-400">
              {error instanceof Error ? error.message : 'Time entry not found'}
            </p>
            <button
              onClick={() => router.push('/time-tracking')}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Back to Time Tracking
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = getStatusConfig(entry.status);
  const StatusIcon = statusConfig.icon;

  return (
    <AppLayout activeMenuItem="time-tracking">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                Time Entry
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className="h-4 w-4" />
                {entry.status}
              </span>
            </div>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <Timer className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-sm text-surface-500 dark:text-surface-400">Hours Worked</span>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              {timeTrackingService.formatHours(entry.hoursWorked)}
            </p>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-surface-500 dark:text-surface-400">Billable Hours</span>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              {entry.isBillable
                ? timeTrackingService.formatHours(entry.billableHours)
                : 'N/A'}
            </p>
          </div>

          {entry.billingAmount && (
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm text-surface-500 dark:text-surface-400">
                  Billing Amount
                </span>
              </div>
              <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                {timeTrackingService.formatCurrency(entry.billingAmount)}
              </p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
            Entry Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">Entry Type</p>
              <p className="text-lg font-medium text-surface-900 dark:text-surface-100">
                {timeTrackingService.getEntryTypeLabel(entry.entryType)}
              </p>
            </div>

            {entry.startTime && entry.endTime && (
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">Time Range</p>
                <p className="text-lg font-medium text-surface-900 dark:text-surface-100">
                  {entry.startTime} - {entry.endTime}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">
                Client / Project
              </p>
              <p className="text-lg font-medium text-surface-900 dark:text-surface-100">
                {entry.projectName || entry.clientName || 'General'}
              </p>
            </div>

            {entry.hourlyRate && (
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">Hourly Rate</p>
                <p className="text-lg font-medium text-surface-900 dark:text-surface-100">
                  {timeTrackingService.formatCurrency(entry.hourlyRate)}/hr
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-3">
              Description
            </h3>
            <p className="text-surface-700 dark:text-surface-300">{entry.description}</p>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-3">
              Notes
            </h3>
            <p className="text-surface-600 dark:text-surface-400">{entry.notes}</p>
          </div>
        )}

        {/* Approval Info */}
        {entry.approvedDate && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Approval Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">
                  {entry.status === 'APPROVED' ? 'Approved By' : 'Reviewed By'}
                </p>
                <p className="text-lg font-medium text-surface-900 dark:text-surface-100">
                  {entry.approverName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">
                  {entry.status === 'APPROVED' ? 'Approved Date' : 'Review Date'}
                </p>
                <p className="text-lg font-medium text-surface-900 dark:text-surface-100">
                  {new Date(entry.approvedDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {entry.status === 'REJECTED' && entry.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
                Rejection Reason
              </h3>
            </div>
            <p className="text-red-600 dark:text-red-300">{entry.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/time-tracking')}
            className="px-6 py-3 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-xl font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            Back to Time Tracking
          </button>

          {entry.status === 'DRAFT' && (
            <>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit for Approval
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
