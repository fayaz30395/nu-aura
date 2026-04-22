'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {AlertCircle, CheckCircle, RefreshCw} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {
  useActiveLeaveTypes,
  useApproveLeaveRequest,
  useLeaveRequestsByStatus,
  useRejectLeaveRequest
} from '@/lib/hooks/queries/useLeaves';
import {useAuth} from '@/lib/hooks/useAuth';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {useEmployees} from '@/lib/hooks/queries/useEmployees';

export default function LeaveApprovalsPage() {
  const toast = useToast();
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();

  // BUG-L6-006: Page-level permission gate for leave approvals
  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!hasPermission(Permissions.LEAVE_APPROVE)) {
      router.replace('/me/dashboard');
    }
  }, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);
  const {
    data: pendingData,
    isError: isPendingError,
    fetchStatus: pendingFetchStatus
  } = useLeaveRequestsByStatus('PENDING', 0, 50);
  const {data: leaveTypes = []} = useActiveLeaveTypes();
  const {data: employeeData} = useEmployees(0, 500);
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
      await approveLeaveRequest.mutateAsync({id: selectedRequestId, approverId: user?.employeeId || ''});
      toast.success('Leave request approved successfully');
      setSelectedRequestId(null);
    } catch (error: unknown) {
      toast.error((error as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to approve leave request');
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
      await rejectLeaveRequest.mutateAsync({id: selectedRequestId, reason: rejectReason});
      toast.success('Leave request rejected');
      setShowRejectReasonModal(false);
      setRejectReason('');
      setSelectedRequestId(null);
    } catch (error: unknown) {
      toast.error((error as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    return leaveTypes.find(t => t.id === leaveTypeId)?.leaveName || 'Unknown';
  };

  // Permission guard
  if (!hasHydrated || !permissionsReady || !hasPermission(Permissions.LEAVE_APPROVE)) {
    return null;
  }

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
            className='text-accent hover:text-accent flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
          >
            ← Back
          </button>
        </div>

        <h1 className="text-xl font-bold skeuo-emboss">Leave Approvals</h1>

        {/* Error State */}
        {error && (
          <div
            className='mb-6 bg-status-danger-bg border border-status-danger-border rounded-lg p-4 flex items-start gap-4'>
            <AlertCircle className='w-5 h-5 text-status-danger-text mt-0.5 flex-shrink-0'/>
            <div className="flex-1">
              <p className='text-sm text-status-danger-text'>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className='text-status-danger-text hover:text-status-danger-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              <RefreshCw
                className="w-4 h-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="skeuo-card rounded-xl p-6">
            <div className="skeuo-deboss text-body-secondary mb-1">Pending Requests</div>
            <div
              className='skeuo-emboss text-3xl font-bold text-status-warning-text'>{requests.length}</div>
          </div>
          <div className="skeuo-card rounded-xl p-6">
            <div className="skeuo-deboss text-body-secondary mb-1">Approved (This Month)</div>
            <div className='skeuo-emboss text-3xl font-bold text-status-success-text'>0</div>
            <p className="text-caption mt-2">Updated when filters applied</p>
          </div>
          <div className="skeuo-card rounded-xl p-6">
            <div className="skeuo-deboss text-body-secondary mb-1">Rejected (This Month)</div>
            <div className='skeuo-emboss text-3xl font-bold text-status-danger-text'>0</div>
            <p className="text-caption mt-2">Updated when filters applied</p>
          </div>
        </div>

        {/* Requests Table */}
        <div className="card-aura overflow-hidden">
          {isPendingError ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className='w-8 h-8 text-status-danger-text'/>
                <span className="text-[var(--text-secondary)]">Failed to load leave requests. The server may be unreachable.</span>
                <button
                  onClick={() => window.location.reload()}
                  className="skeuo-button px-4 py-2 text-sm cursor-pointer active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : !pendingData && pendingFetchStatus === 'fetching' ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div
                  className='w-8 h-8 border-4 border-[var(--accent-primary)] border-t-accent-500 rounded-full animate-spin'
                  aria-label="Loading leave requests"/>
                <span className="text-[var(--text-secondary)]">Loading leave requests...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="flex justify-center mb-4">
                <div
                  className='w-16 h-16 rounded-full bg-status-success-bg flex items-center justify-center'>
                  <CheckCircle className='w-8 h-8 text-status-success-text'/>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">All caught up!</h3>
              <p className="text-body-secondary">No pending leave requests to review</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-aura">
                <thead className="skeuo-table-header">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Request #
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Employee
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Leave
                    Type
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Duration
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Days</th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Reason</th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Applied
                    On
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Actions
                  </th>
                </tr>
                </thead>
                <tbody className='divide-y divide-surface-200'>
                {requests.map((request) => (
                  <tr key={request.id}
                      className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                      {request.requestNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                      {employeeMap[request.employeeId] || request.employeeId.substring(0, 8) + '...'}
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
                    <td className="px-6 py-4 text-body-secondary max-w-xs">
                      <div className="truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-secondary">
                      {new Date(request.appliedOn).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <PermissionGate permission={Permissions.LEAVE_APPROVE}>
                          <button
                            onClick={() => handleApproveClick(request.id)}
                            disabled={isProcessing}
                            className='btn-primary px-4 py-1 bg-status-success-bg text-inverse rounded hover:bg-status-success-bg disabled:opacity-50 text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                          >
                            {isProcessing && selectedRequestId === request.id ? 'Processing...' : 'Approve'}
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.LEAVE_APPROVE}>
                          <button
                            onClick={() => handleRejectClick(request.id)}
                            disabled={isProcessing}
                            className='btn-secondary px-4 py-1 bg-status-danger-bg text-inverse rounded hover:bg-status-danger-bg disabled:opacity-50 text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                          >
                            Reject
                          </button>
                        </PermissionGate>
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
