'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { LeaveRequest, LeaveRequestStatus } from '@/lib/types/hrms/leave';
import { useToast } from '@/components/notifications/ToastProvider';
import {
  useActiveLeaveTypes,
  useLeaveRequests,
  useLeaveRequestsByStatus,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from '@/lib/hooks/queries/useLeaves';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function AdminLeaveRequestsPage() {
  const toast = useToast();
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  const [selectedStatus, setSelectedStatus] = useState<LeaveRequestStatus | 'ALL'>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // React Query hooks
  const { data: leaveTypes = [] } = useActiveLeaveTypes();
  const allRequests = useLeaveRequests(0, 100);
  const statusRequests = useLeaveRequestsByStatus(selectedStatus as LeaveRequestStatus, 0, 100);
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();

  const requestsQuery = selectedStatus === 'ALL' ? allRequests : statusRequests;
  const leaveRequests = requestsQuery.data?.content || [];
  const loading = requestsQuery.isLoading;
  const error = requestsQuery.error;

  // R2-008 FIX: return null immediately after router.push() so the component
  // stops rendering and doesn't briefly expose privileged UI before navigation.
  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...ADMIN_ACCESS_ROLES)) {
    router.push('/home');
    return null;
  }

  if (hasHydrated && isReady && !isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const handleApprove = () => {
    if (!selectedRequest || !user?.employeeId) return;

    approveMutation.mutate(
      {
        id: selectedRequest.id,
        approverId: user.employeeId,
        comments: approvalComments,
      },
      {
        onSuccess: () => {
          setShowApproveModal(false);
          setApprovalComments('');
          setSelectedRequest(null);
          toast.success('Leave request approved');
        },
        onError: (err: unknown) => {
          toast.error(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to approve leave request'
          );
        },
      }
    );
  };

  const handleReject = () => {
    if (!selectedRequest || !user?.employeeId || !rejectionReason.trim()) {
      toast.warning('Rejection reason is required');
      return;
    }

    rejectMutation.mutate(
      {
        id: selectedRequest.id,
        reason: rejectionReason,
      },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectionReason('');
          setSelectedRequest(null);
          toast.success('Leave request rejected');
        },
        onError: (err: unknown) => {
          toast.error(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to reject leave request'
          );
        },
      }
    );
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    const type = leaveTypes.find(t => t.id === leaveTypeId);
    return type?.leaveName || 'Unknown';
  };

  const getStatusColor = (status: LeaveRequestStatus) => {
    const colors = {
      PENDING: 'badge-status status-warning',
      APPROVED: 'badge-status status-success',
      REJECTED: 'badge-status status-danger',
      CANCELLED: 'badge-status status-neutral',
    };
    return colors[status] || 'badge-status status-neutral';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && leaveRequests.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
            <p className="mt-4 text-[var(--text-secondary)]">Loading leave requests...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold skeuo-emboss">Leave Request Management</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Review and process employee leave requests</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400 rounded">
            {error instanceof Error ? error.message : 'Failed to load leave requests'}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mb-6 flex space-x-2 border-b border-[var(--border-main)]">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-6 py-4 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                selectedStatus === status
                  ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Leave Requests Table */}
        <div className="card-aura overflow-hidden">
          <table className="table-aura">
            <thead className="skeuo-table-header">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Request #
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Applied On
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--bg-card)] divide-y divide-surface-200 dark:divide-surface-700">
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                    No leave requests found for {selectedStatus.toLowerCase()} status
                  </td>
                </tr>
              ) : (
                leaveRequests.map(request => (
                  <tr key={request.id} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                      {request.requestNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-secondary">
                      {request.employeeId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {getLeaveTypeName(request.leaveTypeId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-secondary">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-secondary">
                      {request.totalDays} {request.isHalfDay && '(Half Day)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-secondary">
                      {formatDate(request.appliedOn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {request.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApproveModal(true);
                            }}
                            className="text-success-600 dark:text-success-400 hover:text-success-900 dark:hover:text-success-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            className="text-danger-600 dark:text-danger-400 hover:text-danger-900 dark:hover:text-danger-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {request.status !== 'PENDING' && (
                        <span className="text-[var(--text-secondary)]">No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Approve Leave Request</h3>
            <p className="text-body-secondary mb-4">
              Are you sure you want to approve this leave request for {selectedRequest.totalDays} days?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
                className="input-aura w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Add any comments..."
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                  setApprovalComments('');
                }}
                className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                disabled={approveMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="btn-primary px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Reject Leave Request</h3>
            <p className="text-body-secondary mb-4">
              Please provide a reason for rejecting this leave request.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Rejection Reason <span className="text-danger-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="input-aura w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Explain why this request is being rejected..."
                required
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                disabled={rejectMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="btn-secondary px-4 py-2 bg-danger-600 text-white rounded-md hover:bg-danger-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
