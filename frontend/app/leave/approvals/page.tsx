'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@mantine/core';
import {CheckCircle} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {
  useActiveLeaveTypes,
  useApproveLeaveRequest,
  useLeaveRequestsByStatus,
  useRejectLeaveRequest
} from '@/lib/hooks/queries/useLeaves';
import {useAuth} from '@/lib/hooks/useAuth';
import {PageDeniedFallback, PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useEmployees} from '@/lib/hooks/queries/useEmployees';
import {Stat} from '@/components/ui/Stat';
import {formatDate} from '@/lib/utils/format/date';
import type {LeaveRequest} from '@/lib/types/hrms/leave';

const BREADCRUMBS = [{label: 'Leave', href: '/leave'}, {label: 'Approvals'}];

function LeaveApprovalsPageContent() {
  const toast = useToast();
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  // PermissionGate (default export) covers authorization; anonymous users still need the login redirect.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const pendingQuery = useLeaveRequestsByStatus('PENDING', 0, 50);
  const {data: leaveTypes = []} = useActiveLeaveTypes();
  const {data: employeeData} = useEmployees(0, 500);
  const approveLeaveRequest = useApproveLeaveRequest();
  const rejectLeaveRequest = useRejectLeaveRequest();

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const employees = useMemo(() => employeeData?.content ?? [], [employeeData]);
  const employeeMap = useMemo(() => {
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp.fullName || emp.id;
      return acc;
    }, {} as Record<string, string>);
  }, [employees]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <AppLayout activeMenuItem="leave">
        <ListPageSkeleton/>
      </AppLayout>
    );
  }

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
    } catch {
      // The global MutationCache handler shows the error toast.
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

  const handleRejectSubmit = async (reason?: string) => {
    const trimmed = (reason ?? rejectReason).trim();
    if (!trimmed || !selectedRequestId) return;

    try {
      setIsProcessing(true);
      await rejectLeaveRequest.mutateAsync({id: selectedRequestId, reason: trimmed});
      toast.success('Leave request rejected');
      setShowRejectReasonModal(false);
      setRejectReason('');
      setSelectedRequestId(null);
    } catch {
      // The global MutationCache handler shows the error toast.
    } finally {
      setIsProcessing(false);
    }
  };

  const getLeaveTypeName = (leaveTypeId: string) =>
    leaveTypes.find(t => t.id === leaveTypeId)?.leaveName || 'Unknown';

  const columns: Column<LeaveRequest>[] = [
    {key: 'requestNumber', header: 'Request #', accessor: (r) => <span className="font-medium">{r.requestNumber}</span>, mobilePriority: 'primary'},
    {
      key: 'employee', header: 'Employee', mobilePriority: 'secondary',
      accessor: (r) => employeeMap[r.employeeId] || r.employeeId.substring(0, 8) + '...',
    },
    {key: 'leaveType', header: 'Leave type', accessor: (r) => getLeaveTypeName(r.leaveTypeId), mobilePriority: 'secondary'},
    {key: 'duration', header: 'Duration', accessor: (r) => `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`, mobilePriority: 'secondary'},
    {key: 'days', header: 'Days', numeric: true, accessor: (r) => `${r.totalDays}${r.isHalfDay ? ' (Half)' : ''}`, mobilePriority: 'secondary'},
    {
      key: 'reason', header: 'Reason', mobilePriority: 'hidden',
      accessor: (r) => <span className="block max-w-xs truncate" title={r.reason}>{r.reason}</span>,
    },
    {key: 'appliedOn', header: 'Applied on', accessor: (r) => formatDate(r.appliedOn), mobilePriority: 'hidden'},
  ];

  return (
    <AppLayout activeMenuItem="leave">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Leave Approvals"
          description="Review pending leave requests from your team."
          breadcrumbs={BREADCRUMBS}
        />

        <QueryState
          query={pendingQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={5} columns={7}/>}
          errorTitle="Couldn't load leave requests"
          isEmpty={(data) => data.content.length === 0}
          empty={{
            icon: <CheckCircle className="h-6 w-6"/>,
            title: 'All caught up!',
            description: 'No pending leave requests to review',
          }}
        >
          {(data) => (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <Stat label="Pending Requests" value={data.content.length} tone="warning"/>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card">
                <ResponsiveTable
                  columns={columns}
                  data={data.content}
                  keyExtractor={(r) => r.id}
                  stickyHeader
                  renderRowActions={(request) => (
                    <div className="flex justify-end gap-2">
                      <PermissionGate permission={Permissions.LEAVE_APPROVE}>
                        <Button
                          size="xs"
                          color="green"
                          onClick={() => handleApproveClick(request.id)}
                          disabled={isProcessing}
                          loading={isProcessing && selectedRequestId === request.id && !showRejectReasonModal}
                          data-testid={`leave-approve-${request.id}`}
                          aria-label={`Approve leave request ${request.id}`}
                        >
                          Approve
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.LEAVE_REJECT}>
                        <Button
                          size="xs"
                          variant="light"
                          color="red"
                          onClick={() => handleRejectClick(request.id)}
                          disabled={isProcessing}
                          data-testid={`leave-reject-${request.id}`}
                          aria-label={`Reject leave request ${request.id}`}
                        >
                          Reject
                        </Button>
                      </PermissionGate>
                    </div>
                  )}
                />
              </div>
            </div>
          )}
        </QueryState>

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

        <ConfirmDialog
          isOpen={showRejectReasonModal}
          onClose={() => {
            setShowRejectReasonModal(false);
            setRejectReason('');
          }}
          onConfirm={handleRejectSubmit}
          title="Reason for Rejection"
          message="Please provide a reason for rejecting this leave request."
          confirmText="Reject"
          cancelText="Cancel"
          type="danger"
          loading={isProcessing}
          reason={{
            label: 'Rejection reason',
            placeholder: 'Enter rejection reason...',
            required: true,
          }}
        />
      </div>
    </AppLayout>
  );
}

export default function LeaveApprovalsPage() {
  return (
    <PermissionGate anyOf={[Permissions.LEAVE_APPROVE, Permissions.LEAVE_REJECT]} fallback={<PageDeniedFallback/>}>
      <LeaveApprovalsPageContent/>
    </PermissionGate>
  );
}
