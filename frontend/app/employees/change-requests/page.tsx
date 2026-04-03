'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout';
import { employmentChangeRequestService } from '@/lib/services/hrms/employment-change-request.service';
import {
  ChangeRequestStatus,
  ChangeType,
} from '@/lib/types/hrms/employment-change-request';
import { useToast } from '@/components/notifications/ToastProvider';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function EmploymentChangeRequestsPage() {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission, isReady: permissionsReady } = usePermissions();

  // DEF-44: Redirect unauthorized users — prevents change request data exposure
  useEffect(() => {
    if (!permissionsReady) return;
    if (!hasPermission(Permissions.EMPLOYMENT_CHANGE_VIEW_ALL)) {
      router.replace('/employees');
    }
  }, [permissionsReady, hasPermission, router]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);

  // React Query hooks
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['change-requests', filter],
    queryFn: () =>
      filter === 'pending'
        ? employmentChangeRequestService.getPendingChangeRequests(0, 50)
        : employmentChangeRequestService.getAllChangeRequests(0, 50),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => employmentChangeRequestService.approveChangeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
    },
    onError: () => toast.error('Failed to approve change request'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      employmentChangeRequestService.rejectChangeRequest(id, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
    },
  });

  const requests = requestsData?.content || [];
  const loading = isLoading;

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success('Change request approved successfully. Employee details have been updated.');
      setApproveConfirm(null);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve change request');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await rejectMutation.mutateAsync({ id, reason: rejectionReason });
      toast.success('Change request rejected');
      setShowRejectModal(null);
      setRejectionReason('');
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reject change request');
    }
  };

  const getStatusBadge = (status: ChangeRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-muted)]">
            <AlertCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
    }
  };

  const getChangeTypeBadge = (type: ChangeType) => {
    const colors: Record<ChangeType, string> = {
      PROMOTION: 'bg-accent-300 text-accent-900 dark:bg-accent-900/30 dark:text-accent-600',
      DEMOTION: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
      TRANSFER: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400',
      ROLE_CHANGE: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400',
      MANAGER_CHANGE: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400',
      STATUS_CHANGE: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
      CONFIRMATION: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400',
      MULTIPLE: 'bg-accent-300 text-accent-900 dark:bg-accent-900/30 dark:text-accent-600',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
        {type.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatEnumValue = (value?: string) => {
    if (!value) return 'N/A';
    return value.replace(/_/g, ' ');
  };

  const renderChangeDetail = (label: string, currentValue?: string, newValue?: string) => {
    if (!newValue && !currentValue) return null;
    if (newValue === currentValue) return null;

    return (
      <div className="flex items-center gap-2 py-2 divider-b last:border-0">
        <span className="text-sm font-medium text-[var(--text-secondary)] w-40">{label}:</span>
        <span className="text-body-muted">{currentValue || 'N/A'}</span>
        <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-accent-700 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">{newValue || 'N/A'}</span>
      </div>
    );
  };

  // Show skeleton while permissions load (prevents blank page on direct URL navigation)
  if (!permissionsReady) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="p-6 max-w-7xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeuo-card p-4 animate-pulse">
              <div className="h-4 bg-[var(--skeleton-base)] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[var(--skeleton-base)] rounded w-1/2" />
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  // DEF-44: Don't render page content until permission is confirmed
  if (!hasPermission(Permissions.EMPLOYMENT_CHANGE_VIEW_ALL)) {
    return null; // useEffect above handles the redirect to /employees
  }

  return (
    <AppLayout activeMenuItem="employees">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            ← Back
          </button>
        </div>

        <div className="row-between mb-8">
          <h1 className="text-2xl font-bold skeuo-emboss">
            Employment Change Requests
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-accent-700 text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-accent-700 text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              All Requests
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="skeuo-card p-6">
            <div className="text-body-secondary mb-1">
              {filter === 'pending' ? 'Pending Requests' : 'Total Requests'}
            </div>
            <div className="text-3xl font-bold text-warning-600 dark:text-warning-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
              {requests.length}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="skeuo-card p-12 text-center">
              <User className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
              <p className="text-[var(--text-secondary)]">
                {filter === 'pending' ? 'No pending change requests' : 'No change requests found'}
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="skeuo-card overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                  onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                >
                  <div className="row-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-accent-700 dark:text-accent-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                          {request.employeeName?.charAt(0) || 'E'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {request.employeeName || 'Unknown Employee'}
                        </div>
                        <div className="text-body-muted">
                          {request.employeeCode} • Requested by {request.requesterName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getChangeTypeBadge(request.changeType)}
                      {getStatusBadge(request.status)}
                      {expandedId === request.id ? (
                        <ChevronUp className="h-5 w-5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === request.id && (
                  <div className="border-t border-[var(--border-main)] p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Changes */}
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                          Proposed Changes
                        </h4>
                        <div className="bg-[var(--bg-surface)] rounded-lg p-4">
                          {renderChangeDetail(
                            'Designation',
                            request.currentDesignation,
                            request.newDesignation
                          )}
                          {renderChangeDetail(
                            'Level',
                            formatEnumValue(request.currentLevel),
                            formatEnumValue(request.newLevel)
                          )}
                          {renderChangeDetail(
                            'Job Role',
                            formatEnumValue(request.currentJobRole),
                            formatEnumValue(request.newJobRole)
                          )}
                          {renderChangeDetail(
                            'Department',
                            request.currentDepartmentName,
                            request.newDepartmentName
                          )}
                          {renderChangeDetail(
                            'Manager',
                            request.currentManagerName,
                            request.newManagerName
                          )}
                          {renderChangeDetail(
                            'Employment Type',
                            formatEnumValue(request.currentEmploymentType),
                            formatEnumValue(request.newEmploymentType)
                          )}
                          {renderChangeDetail(
                            'Status',
                            formatEnumValue(request.currentEmployeeStatus),
                            formatEnumValue(request.newEmployeeStatus)
                          )}
                          {renderChangeDetail(
                            'Confirmation Date',
                            request.currentConfirmationDate,
                            request.newConfirmationDate
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                          Request Details
                        </h4>
                        <div className="space-y-4">
                          {request.reason && (
                            <div>
                              <span className="text-sm font-medium text-[var(--text-secondary)]">
                                Reason:
                              </span>
                              <p className="text-sm text-[var(--text-primary)] mt-1">
                                {request.reason}
                              </p>
                            </div>
                          )}
                          {request.effectiveDate && (
                            <div>
                              <span className="text-sm font-medium text-[var(--text-secondary)]">
                                Effective Date:
                              </span>
                              <p className="text-sm text-[var(--text-primary)] mt-1">
                                {new Date(request.effectiveDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                              Requested On:
                            </span>
                            <p className="text-sm text-[var(--text-primary)] mt-1">
                              {new Date(request.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {request.rejectionReason && (
                            <div>
                              <span className="text-sm font-medium text-danger-600 dark:text-danger-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                                Rejection Reason:
                              </span>
                              <p className="text-sm text-danger-700 dark:text-danger-300 mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                                {request.rejectionReason}
                              </p>
                            </div>
                          )}
                          {request.approverName && (
                            <div>
                              <span className="text-sm font-medium text-[var(--text-secondary)]">
                                {request.status === 'APPROVED' ? 'Approved' : 'Processed'} By:
                              </span>
                              <p className="text-sm text-[var(--text-primary)] mt-1">
                                {request.approverName}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {request.status === 'PENDING' && (
                      <div className="flex gap-4 mt-6 pt-4 border-t border-[var(--border-main)]">
                        <PermissionGate permission={Permissions.EMPLOYMENT_CHANGE_APPROVE}>
                          <button
                            onClick={() => setApproveConfirm(request.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="flex-1 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            {approveMutation.isPending ? 'Processing...' : 'Approve Changes'}
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.EMPLOYMENT_CHANGE_APPROVE}>
                          <button
                            onClick={() => setShowRejectModal(request.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </PermissionGate>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-aura !rounded-none">
          <div className="skeuo-card max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Reject Change Request
            </h3>
            <p className="text-body-secondary mb-4">
              Please provide a reason for rejecting this change request.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="input-aura"
            />
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 font-medium"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Change Request Confirmation */}
      <ConfirmDialog
        isOpen={!!approveConfirm}
        onClose={() => setApproveConfirm(null)}
        onConfirm={async () => {
          if (approveConfirm) {
            await handleApprove(approveConfirm);
          }
        }}
        title="Approve Change Request"
        message="Are you sure you want to approve this change request? The employee details will be updated accordingly."
        confirmText="Approve"
        type="info"
        loading={approveMutation.isPending}
      />
    </AppLayout>
  );
}
