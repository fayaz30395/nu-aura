'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveRequest, LeaveRequestStatus, LeaveType } from '@/lib/types/leave';

export default function AdminLeaveRequestsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<LeaveRequestStatus | 'ALL'>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      loadData();
    }
  }, [hasHydrated, isAuthenticated, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [types, requests] = await Promise.all([
        leaveService.getActiveLeaveTypes(),
        selectedStatus === 'ALL'
          ? leaveService.getAllLeaveRequests(0, 100)
          : leaveService.getLeaveRequestsByStatus(selectedStatus as LeaveRequestStatus, 0, 100)
      ]);

      setLeaveTypes(types);
      setLeaveRequests(Array.isArray(requests) ? requests : requests.content);
    } catch (err: any) {
      console.error('Error loading leave requests:', err);
      setError(err.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || !user?.employeeId) return;

    try {
      setSubmitting(true);
      await leaveService.approveLeaveRequest(
        selectedRequest.id,
        user.employeeId,
        approvalComments
      );
      setShowApproveModal(false);
      setApprovalComments('');
      setSelectedRequest(null);
      await loadData();
    } catch (err: any) {
      console.error('Error approving leave:', err);
      alert(err.response?.data?.message || 'Failed to approve leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user?.employeeId || !rejectionReason.trim()) {
      alert('Rejection reason is required');
      return;
    }

    try {
      setSubmitting(true);
      await leaveService.rejectLeaveRequest(
        selectedRequest.id,
        user.employeeId,
        rejectionReason
      );
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      await loadData();
    } catch (err: any) {
      console.error('Error rejecting leave:', err);
      alert(err.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    const type = leaveTypes.find(t => t.id === leaveTypeId);
    return type?.leaveName || 'Unknown';
  };

  const getStatusColor = (status: LeaveRequestStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading leave requests...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Leave Request Management</h1>
          <p className="mt-2 text-surface-600 dark:text-surface-400">Review and process employee leave requests</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mb-6 flex space-x-2 border-b border-surface-200 dark:border-surface-700">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-6 py-3 font-medium transition-colors ${
                selectedStatus === status
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Leave Requests Table */}
        <div className="bg-white dark:bg-surface-900 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
            <thead className="bg-surface-50 dark:bg-surface-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                  Request #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-200 dark:divide-surface-700">
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-surface-600 dark:text-surface-400">
                    No leave requests found for {selectedStatus.toLowerCase()} status
                  </td>
                </tr>
              ) : (
                leaveRequests.map(request => (
                  <tr key={request.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900 dark:text-surface-100">
                      {request.requestNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600 dark:text-surface-400">
                      {request.employeeId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900 dark:text-surface-100">
                      {getLeaveTypeName(request.leaveTypeId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600 dark:text-surface-400">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600 dark:text-surface-400">
                      {request.totalDays} {request.isHalfDay && '(Half Day)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600 dark:text-surface-400">
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
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {request.status !== 'PENDING' && (
                        <span className="text-surface-600 dark:text-surface-400">No actions</span>
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
          <div className="bg-white dark:bg-surface-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-surface-900 dark:text-surface-100">Approve Leave Request</h3>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
              Are you sure you want to approve this leave request for {selectedRequest.totalDays} days?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-surface-800 dark:text-white"
                placeholder="Add any comments..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                  setApprovalComments('');
                }}
                className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-surface-900 dark:text-surface-100">Reject Leave Request</h3>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
              Please provide a reason for rejecting this leave request.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-surface-800 dark:text-white"
                placeholder="Explain why this request is being rejected..."
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={submitting || !rejectionReason.trim()}
              >
                {submitting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
