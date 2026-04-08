'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {AlertCircle, CalendarOff, RefreshCw} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {
  useActiveLeaveTypes,
  useCancelLeaveRequest,
  useEmployeeLeaveRequests,
  useLeaveRequestsByStatus
} from '@/lib/hooks/queries/useLeaves';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {LeaveRequest, LeaveRequestStatus} from '@/lib/types/hrms/leave';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';

export default function MyLeavesPage() {
  const toast = useToast();
  const router = useRouter();
  const {user} = useAuth();
  const {hasPermission, isReady: permReady} = usePermissions();

  // A3: Permission gate — redirect if user lacks LEAVE:VIEW_SELF
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.LEAVE_VIEW_SELF)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);
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
  const {data: leaveTypes = []} = useActiveLeaveTypes();

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
      await cancelLeaveRequest.mutateAsync({id: selectedLeaveId, reason: cancelReason});
      toast.success('Leave request cancelled successfully');
      setShowReasonModal(false);
      setCancelReason('');
      setSelectedLeaveId(null);
    } catch (error: unknown) {
      toast.error((error as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to cancel leave request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success-100 text-success-800';
      case 'PENDING':
        return 'bg-warning-100 text-warning-800';
      case 'REJECTED':
        return 'bg-danger-100 text-danger-800';
      case 'CANCELLED':
        return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      default:
        return 'bg-accent-100 text-accent-800';
    }
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    return leaveTypes.find(t => t.id === leaveTypeId)?.leaveName || 'Unknown';
  };

  return (
    <AppLayout activeMenuItem="leave">
      <motion.div
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            ← Back
          </button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold skeuo-emboss">My Leaves</h1>
          <button
            onClick={() => router.push('/leave/apply')}
            className="btn-primary !h-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Apply for Leave
          </button>
        </div>

        {/* Filters */}
        <div className="skeuo-card p-6 mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as LeaveRequestStatus | '');
                setCurrentPage(0);
              }}
              className="input-aura"
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
          <div
            className="mb-6 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg p-4 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0"/>
            <div className="flex-1">
              <p className="text-sm text-danger-800 dark:text-danger-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <RefreshCw
                className="w-4 h-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
            </button>
          </div>
        )}

        {/* Leave Requests Table */}
        <div className="skeuo-card overflow-hidden">
          {!requestsData ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-8 h-8 border-4 border-accent-200 dark:border-accent-900/30 border-t-accent-500 rounded-full animate-spin"
                  aria-label="Loading leave requests"/>
                <span className="text-[var(--text-secondary)]">Loading leave requests...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="flex justify-center mb-4">
                <div
                  className="w-16 h-16 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)] flex items-center justify-center">
                  <CalendarOff className="w-8 h-8 text-[var(--text-muted)]"/>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No leave requests found</h3>
              <p className="text-body-secondary mb-6">Get started by applying for your first leave</p>
              <button
                onClick={() => router.push('/leave/apply')}
                className="btn-primary !h-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Apply for Leave
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-aura">
                  <thead className="skeuo-table-header">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Request
                      #
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Leave
                      Type
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Duration
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Days</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Reason
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Applied
                      On
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  {requests.map((request: LeaveRequest) => (
                    <tr key={request.id}
                        className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {request.requestNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                        {getLeaveTypeName(request.leaveTypeId)}
                      </td>
                      <td className="px-6 py-4 text-body-secondary">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-body-secondary">
                        {request.totalDays} {request.isHalfDay && '(Half)'}
                      </td>
                      <td className="px-6 py-4 text-body-secondary max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </td>
                      <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-body-secondary">
                        {new Date(request.appliedOn).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {request.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelClick(request.id)}
                            className="text-danger-600 dark:text-danger-500 hover:text-danger-700 dark:hover:text-danger-400 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          >
                            Cancel
                          </button>
                        )}
                        {request.status === 'REJECTED' && request.rejectionReason && (
                          <button
                            onClick={() => toast.error(`Rejection Reason: ${request.rejectionReason}`)}
                            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
                    className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg disabled:opacity-50 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Previous
                  </button>
                  <div className="text-body-secondary">
                    <span>Showing {currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, requests.length + currentPage * 10)} of ~{totalPages * 10} results</span>
                    <br/>
                    <span>Page {currentPage + 1} of {totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg disabled:opacity-50 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
