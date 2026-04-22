'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {timeTrackingService} from '@/lib/services/hrms/time-tracking.service';
import {TimeEntryStatus} from '@/lib/types/hrms/time-tracking';
import {useDeleteTimeEntry, useSubmitTimeEntry, useTimeEntry,} from '@/lib/hooks/queries/useTimeTracking';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Pencil,
  Send,
  Timer,
  XCircle,
} from 'lucide-react';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('TimeTrackingPage');

export default function TimeEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.TIMESHEET_VIEW, Permissions.TIME_TRACKING_VIEW, Permissions.TIME_TRACKING_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const {data: entry, isLoading, error} = useTimeEntry(entryId);
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

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="time-tracking">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className='h-8 w-8 animate-spin text-accent'/>
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
            <AlertCircle className='h-12 w-12 text-status-danger-text'/>
            <p className="text-[var(--text-secondary)]">
              {error instanceof Error ? error.message : 'Time entry not found'}
            </p>
            <button
              onClick={() => router.push('/time-tracking')}
              className='px-4 py-2 bg-accent text-inverse rounded-xl hover:bg-accent transition-colors'
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
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Time Entry
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-1 text-sm font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className="h-4 w-4"/>
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
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className='p-2 rounded-lg bg-accent-subtle'>
                <Timer className='h-5 w-5 text-accent'/>
              </div>
              <span className="text-body-muted">Hours Worked</span>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              {timeTrackingService.formatHours(entry.hoursWorked)}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className='p-2 rounded-lg bg-status-success-bg'>
                <DollarSign className='h-5 w-5 text-status-success-text'/>
              </div>
              <span className="text-body-muted">Billable Hours</span>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              {entry.isBillable
                ? timeTrackingService.formatHours(entry.billableHours)
                : 'N/A'}
            </p>
          </div>

          {entry.billingAmount && (
            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className='p-2 rounded-lg bg-status-success-bg'>
                  <DollarSign className='h-5 w-5 text-status-success-text'/>
                </div>
                <span className="text-body-muted">
                  Billing Amount
                </span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                {timeTrackingService.formatCurrency(entry.billingAmount)}
              </p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Entry Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-body-muted mb-1">Entry Type</p>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {timeTrackingService.getEntryTypeLabel(entry.entryType)}
              </p>
            </div>

            {entry.startTime && entry.endTime && (
              <div>
                <p className="text-body-muted mb-1">Time Range</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {entry.startTime} - {entry.endTime}
                </p>
              </div>
            )}

            <div>
              <p className="text-body-muted mb-1">
                Client / Project
              </p>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {entry.projectName || entry.clientName || 'General'}
              </p>
            </div>

            {entry.hourlyRate && (
              <div>
                <p className="text-body-muted mb-1">Hourly Rate</p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {timeTrackingService.formatCurrency(entry.hourlyRate)}/hr
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Description
            </h3>
            <p className="text-[var(--text-secondary)]">{entry.description}</p>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Notes
            </h3>
            <p className="text-[var(--text-secondary)]">{entry.notes}</p>
          </div>
        )}

        {/* Approval Info */}
        {entry.approvedDate && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Approval Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-body-muted mb-1">
                  {entry.status === 'APPROVED' ? 'Approved By' : 'Reviewed By'}
                </p>
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  {entry.approverName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-body-muted mb-1">
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
          <div
            className='bg-status-danger-bg border border-status-danger-border rounded-lg p-6'>
            <div className="flex items-center gap-4 mb-4">
              <XCircle className='h-5 w-5 text-status-danger-text'/>
              <h3 className='text-xl font-semibold text-status-danger-text'>
                Rejection Reason
              </h3>
            </div>
            <p className='text-status-danger-text'>{entry.rejectionReason}</p>
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
                className='px-6 py-4 bg-status-danger-bg text-status-danger-text rounded-xl font-medium hover:bg-status-danger-bg transition-colors disabled:opacity-50'
              >
                Delete
              </button>
              <button
                onClick={() => router.push(`/time-tracking/${entry.id}/edit`)}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Pencil className="h-4 w-4"/>
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className='flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-700 hover:to-accent-700 text-inverse rounded-xl font-medium shadow-[var(--shadow-dropdown)] shadow-accent-500/25 transition-all duration-200 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin"/>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5"/>
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
