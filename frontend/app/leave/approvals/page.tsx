'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useLeaveRequestsByStatus, useActiveLeaveTypes, useApproveLeaveRequest, useRejectLeaveRequest } from '@/lib/hooks/queries/useLeaves';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useEmployees } from '@/lib/hooks/queries/useEmployees';

export default function LeaveApprovalsPage() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { data: pendingData } = useLeaveRequestsByStatus('PENDING', 0, 50);
  const { data: leaveTypes = [] } = useActiveLeaveTypes();
  const { data: employeeData } = useEmployees(0, 500);
  const approveLeaveRequest = useApproveLeaveRequest();
  const rejectLeaveRequest = useRejectLeaveRequest();
  const [error, setError] = useState<string | null>(null);
  const [_processing, _setProcessing] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requests = useMemo(() => pendingData?.content ?? [], [pendingData]);
  // Stable reference: prevents employeeMap useMemo from re-running on every render.
  const employees = useMemo(() => employeeData?.content ?? [], [employeeData]);

  // Build employee name map
  const employeeMap = useMemo(() => {
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp.fullName || emp.id;
      return acc;
    }, {} as Record<string, string>);
  }, [employees]);

  const handleApproveClick = (id: string) => {
    setSelectedRequestId(id);
    setShowApproveConfirm(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedRequestId) return;
    setShowApproveConfirm(false);

    try {
      setIsProcessing(true);
      await approveLeaveRequest.mutateAsync({ id: selectedRequestId, approverId: user?.employeeId || '' });
      toast.success('Leave request approved successfully');
      setSelectedRequestId(null);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve leave request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = (id: string) => {
    setSelectedRequestId(id);
    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = () => {
    setShowRejectConfirm(false);
    setShowRejectReasonModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim() || !selectedRequestId) return;

    try {
      setIsProcessing(true);
      await rejectLeaveRequest.mutateAsync({ id: selectedRequestId, approverId: user?.employeeId || '', reason: rejectReason });
      toast.success('Leave request rejected');
      setShowRejectReasonModal(false);
      setRejectReason('');
      setSelectedRequestId(null);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setIsProcessing(false);
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

        <h1 className="text-3xl font-bold mb-8 text-[var(--text-primary)]">Leave Approvals</h1>

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--bg-card)] rounded-lg shadow-md p-6">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Pending Requests</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{requests.length}</div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg shadow-md p-6">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Approved (This Month)</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-500">0</div>
            <p className="text-xs text-[var(--text-muted)] mt-2">Updated when filters applied</p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg shadow-md p-6">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Rejected (This Month)</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-500">0</div>
            <p className="text-xs text-[var(--text-muted)] mt-2">Updated when filters applied</p>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-[var(--bg-card)] rounded-lg shadow-md overflow-hidden">
          {!pendingData ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary-200 dark:border-primary-900/30 border-t-primary-500 rounded-full animate-spin" aria-label="Loading leave requests" />
                <span className="text-[var(--text-secondary)]">Loading leave requests...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">All caught up!</h3>
              <p className="text-sm text-[var(--text-secondary)]">No pending leave requests to review</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-secondary)]/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Request #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Applied On</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {request.requestNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                        {employeeMap[request.employeeId] || request.employeeId.substring(0, 8) + '...'}
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
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] max-w-xs">
                        <div className="truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {new Date(request.appliedOn).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveClick(request.id)}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                          >
                            {isProcessing && selectedRequestId === request.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectClick(request.id)}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approve Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showApproveConfirm}
          onClose={() => setShowApproveConfirm(false)}
          onConfirm={handleApproveConfirm}
          title="Approve Leave Request?"
          message="Are you sure you want to approve this leave request?"
          confirmText="Approve"
          cancelText="Cancel"
          type="info"
          loading={isProcessing}
        />

        {/* Reject Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRejectConfirm}
          onClose={() => setShowRejectConfirm(false)}
          onConfirm={handleRejectConfirm}
          title="Reject Leave Request?"
          message="Are you sure you want to reject this leave request? You will need to provide a reason."
          confirmText="Continue"
          cancelText="Cancel"
          type="danger"
        />

        {/* Reject Reason Modal */}
        <Modal
          isOpen={showRejectReasonModal}
          onClose={() => {
            setShowRejectReasonModal(false);
            setRejectReason('');
          }}
          size="sm"
        >
          <ModalHeader onClose={() => setShowRejectReasonModal(false)}>
            Reason for Rejection
          </ModalHeader>
          <ModalBody>
            <Input
              label="Please provide a reason for rejecting this leave request"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              disabled={isProcessing}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectReasonModal(false);
                setRejectReason('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || isProcessing}
            >
              {isProcessing ? 'Rejecting...' : 'Reject'}
            </Button>
          </ModalFooter>
        </Modal>
      </motion.div>
    </AppLayout>
  );
}
