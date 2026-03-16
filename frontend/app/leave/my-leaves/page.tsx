'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, CalendarOff } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useLeaveRequestsByStatus, useEmployeeLeaveRequests, useActiveLeaveTypes, useCancelLeaveRequest } from '@/lib/hooks/queries/useLeaves';
import { useAuth } from '@/lib/hooks/useAuth';
import { LeaveRequestStatus, LeaveRequest } from '@/lib/types/leave';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function MyLeavesPage() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<LeaveRequestStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelLeaveRequest = useCancelLeaveRequest();

  const employeeRequests = useEmployeeLeaveRequests(user?.employeeId || '', currentPage, 10, Boolean(user?.employeeId && !filterStatus));
  const statusRequests = useLeaveRequestsByStatus(filterStatus as LeaveRequestStatus, currentPage, 10);
  const { data: leaveTypes = [] } = useActiveLeaveTypes();

  const requestsData = filterStatus ? statusRequests.data : employeeRequests.data;
  const requests = requestsData?.content ?? [];
  const totalPages = requestsData?.totalPages ?? 0;
  const _loading = !requestsData;

  const handleCancelClick = (id: string) => {
    setSelectedLeaveId(id);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    setShowReasonModal(true);
  };

  const handleReasonSubmit = async () => {
    if (!cancelReason.trim() || !selectedLeaveId) return;

    try {
      setIsProcessing(true);
      await cancelLeaveRequest.mutateAsync({ id: selectedLeaveId, reason: cancelReason });
      toast.success('Leave request cancelled successfully');
      setShowReasonModal(false);
      setCancelReason('');
      setSelectedLeaveId(null);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel leave request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-[var(--bg-surface)] text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    return leaveTypes.find(t => t.id === leaveTypeId)?.leaveName || 'Unknown';
  };

  return (
    <AppLayout activeMenuItem="leave">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">My Leaves</h1>
          <button
            onClick={() => router.push('/leave/apply')}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-semibold"
          >
            Apply for Leave
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[var(--bg-card)] rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as LeaveRequestStatus | ''); setCurrentPage(0); }}
              className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-primary-500 bg-[var(--bg-card)] text-[var(--text-primary)]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Leave Requests Table */}
        <div className="bg-[var(--bg-card)] rounded-lg shadow-md overflow-hidden">
          {!requestsData ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary-200 dark:border-primary-900/30 border-t-primary-500 rounded-full animate-spin" aria-label="Loading leave requests" />
                <span className="text-[var(--text-secondary)]">Loading leave requests...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)] flex items-center justify-center">
                  <CalendarOff className="w-8 h-8 text-gray-400 dark:text-[var(--text-secondary)]" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No leave requests found</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6">Get started by applying for your first leave</p>
              <button
                onClick={() => router.push('/leave/apply')}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
              >
                Apply for Leave
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-secondary)]/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Request #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Leave Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Applied On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {requests.map((request: LeaveRequest) => (
                      <tr key={request.id} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                          {request.requestNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                          {getLeaveTypeName(request.leaveTypeId)}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {request.totalDays} {request.isHalfDay && '(Half)'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] max-w-xs truncate" title={request.reason}>
                          {request.reason}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {new Date(request.appliedOn).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {request.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancelClick(request.id)}
                              className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium"
                            >
                              Cancel
                            </button>
                          )}
                          {request.status === 'REJECTED' && request.rejectionReason && (
                            <button
                              onClick={() => toast.error(`Rejection Reason: ${request.rejectionReason}`)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                            >
                              View Reason
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-[var(--bg-secondary)]/50 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg disabled:opacity-50 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 text-[var(--text-primary)]"
                  >
                    Previous
                  </button>
                  <div className="text-sm text-[var(--text-secondary)]">
                    <span>Showing {currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, requests.length + currentPage * 10)} of ~{totalPages * 10} results</span>
                    <br />
                    <span>Page {currentPage + 1} of {totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg disabled:opacity-50 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 text-[var(--text-primary)]"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Cancel Leave Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelConfirm}
          title="Cancel Leave Request?"
          message="Are you sure you want to cancel this leave request? This action cannot be undone."
          confirmText="Cancel Request"
          cancelText="Keep Request"
          type="warning"
        />

        {/* Cancel Reason Modal */}
        <Modal
          isOpen={showReasonModal}
          onClose={() => {
            setShowReasonModal(false);
            setCancelReason('');
          }}
          size="sm"
        >
          <ModalHeader onClose={() => setShowReasonModal(false)}>
            Reason for Cancellation
          </ModalHeader>
          <ModalBody>
            <Input
              label="Please provide a reason for cancelling this leave request"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              disabled={isProcessing}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReasonModal(false);
                setCancelReason('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReasonSubmit}
              disabled={!cancelReason.trim() || isProcessing}
            >
              {isProcessing ? 'Cancelling...' : 'Submit'}
            </Button>
          </ModalFooter>
        </Modal>
      </motion.div>
    </AppLayout>);
}
