'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout';
import { employmentChangeRequestService } from '@/lib/services/employment-change-request.service';
import {
  ChangeRequestStatus,
  ChangeType,
} from '@/lib/types/employment-change-request';
import { useToast } from '@/components/notifications/ToastProvider';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
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
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
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
      PROMOTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      DEMOTION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      TRANSFER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      ROLE_CHANGE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      MANAGER_CHANGE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      STATUS_CHANGE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      CONFIRMATION: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
      MULTIPLE: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
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
      <div className="flex items-center gap-2 py-2 border-b border-[var(--border-subtle)] last:border-0">
        <span className="text-sm font-medium text-[var(--text-secondary)] w-40">{label}:</span>
        <span className="text-sm text-[var(--text-muted)]">{currentValue || 'N/A'}</span>
        <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="text-sm font-medium text-sky-700 dark:text-sky-400">{newValue || 'N/A'}</span>
      </div>
    );
  };

  return (
    <AppLayout activeMenuItem="employees">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sky-700 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">
            Employment Change Requests
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-sky-700 text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-sky-700 text-white'
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
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              {filter === 'pending' ? 'Pending Requests' : 'Total Requests'}
            </div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-sky-700 dark:text-sky-400">
                          {request.employeeName?.charAt(0) || 'E'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {request.employeeName || 'Unknown Employee'}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
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
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
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
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
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
                              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                Rejection Reason:
                              </span>
                              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
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
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            {approveMutation.isPending ? 'Processing...' : 'Approve Changes'}
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.EMPLOYMENT_CHANGE_APPROVE}>
                          <button
                            onClick={() => setShowRejectModal(request.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
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
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Reject Change Request
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
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
