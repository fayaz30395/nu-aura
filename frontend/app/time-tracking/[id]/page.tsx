'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { timeTrackingService } from '@/lib/services/time-tracking.service';
import { TimeEntryStatus } from '@/lib/types/time-tracking';
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
  DollarSign,
  Send,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('TimeTrackingPage');

export default function TimeEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: entry, isLoading, error } = useTimeEntry(entryId);
  const submitMutation = useSubmitTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  const handleSubmit = async () => {
    if (!entry) return;

    try {
      await submitMutation.mutateAsync(entry.id);
    } catch (error) {
      log.error('Error submitting entry:', error);
    }
  };

  const handleDelete = async () => {
    if (!entry || entry.status !== 'DRAFT') return;

    try {
      await deleteMutation.mutateAsync(entry.id);
      router.push('/time-tracking');
    } catch (error) {
      log.error('Error deleting entry:', error);
    }
  };

  const getStatusConfig = (status: TimeEntryStatus) => {
    const configs: Record<TimeEntryStatus, { bg: string; text: string; icon: typeof Clock }> = {
      DRAFT: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
        icon: FileText,
      },
      SUBMITTED: {
        bg: 'bg-warning-100 dark:bg-warning-900/30',
        text: 'text-warning-700 dark:text-warning-400',
        icon: Clock,
      },
      APPROVED: {
        bg: 'bg-success-100 dark:bg-success-900/30',
        text: 'text-success-700 dark:text-success-400',
        icon: CheckCircle,
      },
      REJECTED: {
        bg: 'bg-danger-100 dark:bg-danger-900/30',
        text: 'text-danger-700 dark:text-danger-400',
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
            <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            <p className="text-[var(--text-secondary)]">Loading time entry...</p>
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
            <AlertCircle className="h-12 w-12 text-danger-500" />
            <p className="text-[var(--text-secondary)]">
              {error instanceof Error ? error.message : 'Time entry not found'}
            </p>
            <button
              onClick={() => router.push('/time-tracking')}
              className="px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-700 transition-colors"
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
            className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Time Entry
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-1 text-sm font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className="h-4 w-4" />
                {entry.status}
              </span>
            </div>
            <p className="text-[var(--text-muted)] mt-1">
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
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                <Timer className="h-5 w-5 text-accent-700 dark:text-accent-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Hours Worked</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              {timeTrackingService.formatHours(entry.hoursWorked)}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                <DollarSign className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Billable Hours</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              {entry.isBillable
                ? timeTrackingService.formatHours(entry.billableHours)
                : 'N/A'}
            </p>
          </div>

          {entry.billingAmount && (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                  <DollarSign className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <span className="text-sm text-[var(--text-muted)]">
                  Billing Amount
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                {timeTrackingService.formatCurrency(entry.billingAmount)}
              </p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Entry Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">Entry Type</p>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {timeTrackingService.getEntryTypeLabel(entry.entryType)}
              </p>
            </div>

            {entry.startTime && entry.endTime && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Time Range</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {entry.startTime} - {entry.endTime}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">
                Client / Project
              </p>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {entry.projectName || entry.clientName || 'General'}
              </p>
            </div>

            {entry.hourlyRate && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Hourly Rate</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {timeTrackingService.formatCurrency(entry.hourlyRate)}/hr
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
              Description
            </h3>
            <p className="text-[var(--text-secondary)]">{entry.description}</p>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
              Notes
            </h3>
            <p className="text-[var(--text-secondary)]">{entry.notes}</p>
          </div>
        )}

        {/* Approval Info */}
        {entry.approvedDate && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Approval Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">
                  {entry.status === 'APPROVED' ? 'Approved By' : 'Reviewed By'}
                </p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {entry.approverName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">
                  {entry.status === 'APPROVED' ? 'Approved Date' : 'Review Date'}
                </p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
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
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-3">
              <XCircle className="h-5 w-5 text-danger-500" />
              <h3 className="text-xl font-semibold text-danger-700 dark:text-danger-400">
                Rejection Reason
              </h3>
            </div>
            <p className="text-danger-600 dark:text-danger-300">{entry.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/time-tracking')}
            className="px-6 py-4 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Back to Time Tracking
          </button>

          {entry.status === 'DRAFT' && (
            <>
              <button
                onClick={() => setDeleteConfirm(true)}
                disabled={deleteMutation.isPending}
                className="px-6 py-4 bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 rounded-xl font-medium hover:bg-danger-200 dark:hover:bg-danger-900/50 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-700 hover:to-accent-700 text-white rounded-xl font-medium shadow-lg shadow-accent-500/25 transition-all duration-200 disabled:opacity-50"
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

      {/* Delete Time Entry Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Time Entry"
        message="Are you sure you want to delete this time entry? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </AppLayout>
  );
}
