'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button, NativeSelect} from '@mantine/core';
import {CalendarOff} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ResponsiveTable, TablePagination, type Column, type RowActionItem} from '@/components/ui/ResponsiveTable';
import {ResponsiveTableRowActions} from '@/components/ui/ResponsiveTableRowActions';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {
  useActiveLeaveTypes,
  useCancelLeaveRequest,
  useEmployeeLeaveRequests,
  useLeaveRequestsByStatus
} from '@/lib/hooks/queries/useLeaves';
import {useAuth} from '@/lib/hooks/useAuth';
import {LeaveRequest, LeaveRequestStatus} from '@/lib/types/hrms/leave';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {formatDate} from '@/lib/utils/format/date';

const PAGE_SIZE = 10;
const BREADCRUMBS = [{label: 'Leave', href: '/leave'}, {label: 'My Leaves'}];
const STATUS_OPTIONS = [
  {value: '', label: 'All statuses'},
  {value: 'PENDING', label: 'Pending'},
  {value: 'APPROVED', label: 'Approved'},
  {value: 'REJECTED', label: 'Rejected'},
  {value: 'CANCELLED', label: 'Cancelled'},
];

export default function MyLeavesPage() {
  const toast = useToast();
  const router = useRouter();
  const {user} = useAuth();
  const [filterStatus, setFilterStatus] = useState<LeaveRequestStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const cancelLeaveRequest = useCancelLeaveRequest();

  const employeeRequests = useEmployeeLeaveRequests(user?.employeeId || '', currentPage, PAGE_SIZE, Boolean(user?.employeeId && !filterStatus));
  const statusRequests = useLeaveRequestsByStatus(filterStatus as LeaveRequestStatus, currentPage, PAGE_SIZE);
  const {data: leaveTypes = []} = useActiveLeaveTypes();

  const requestsQuery = filterStatus ? statusRequests : employeeRequests;

  const handleCancelClick = (id: string) => {
    setSelectedLeaveId(id);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    setShowReasonModal(true);
  };

  const handleReasonSubmit = async (reason?: string) => {
    const trimmed = (reason ?? cancelReason).trim();
    if (!trimmed || !selectedLeaveId || cancelLeaveRequest.isPending) return;

    try {
      await cancelLeaveRequest.mutateAsync({id: selectedLeaveId, reason: trimmed});
    } catch {
      // useCancelLeaveRequest shows the single error toast.
      return;
    }
    toast.success('Leave request cancelled successfully');
    setShowReasonModal(false);
    setCancelReason('');
    setSelectedLeaveId(null);
  };

  const getLeaveTypeName = (leaveTypeId: string) =>
    leaveTypes.find(t => t.id === leaveTypeId)?.leaveName || 'Unknown';

  const rowActions = (request: LeaveRequest): RowActionItem[] => {
    const items: RowActionItem[] = [];
    if (request.status === 'PENDING') {
      items.push({label: 'Cancel request', color: 'red', onClick: () => handleCancelClick(request.id)});
    }
    if (request.status === 'REJECTED' && request.rejectionReason) {
      items.push({label: 'View rejection reason', onClick: () => toast.error(`Rejection Reason: ${request.rejectionReason}`)});
    }
    return items;
  };

  const columns: Column<LeaveRequest>[] = [
    {key: 'requestNumber', header: 'Request #', accessor: (r) => <span className="font-medium">{r.requestNumber}</span>, mobilePriority: 'primary'},
    {key: 'leaveType', header: 'Leave type', accessor: (r) => getLeaveTypeName(r.leaveTypeId), mobilePriority: 'secondary'},
    {key: 'duration', header: 'Duration', accessor: (r) => `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`, mobilePriority: 'secondary'},
    {key: 'days', header: 'Days', numeric: true, accessor: (r) => `${r.totalDays}${r.isHalfDay ? ' (Half)' : ''}`, mobilePriority: 'secondary'},
    {
      key: 'reason', header: 'Reason', mobilePriority: 'hidden',
      accessor: (r) => <span className="block max-w-xs truncate" title={r.reason}>{r.reason}</span>,
    },
    {key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} domain={LEAVE_STATUS} compact/>, mobilePriority: 'secondary'},
    {key: 'appliedOn', header: 'Applied on', accessor: (r) => formatDate(r.appliedOn), mobilePriority: 'hidden'},
  ];

  return (
    <AppLayout activeMenuItem="leave">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Leaves"
          description="Track the status of your leave requests."
          breadcrumbs={BREADCRUMBS}
          actions={<Button onClick={() => router.push('/leave/apply')}>Apply for Leave</Button>}
        />

        <div className="flex flex-wrap items-end gap-2">
          <NativeSelect
            id="leave-filter-status"
            label="Status"
            aria-label="Filter by Status"
            className="w-full sm:w-48"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.currentTarget.value as LeaveRequestStatus | '');
              setCurrentPage(0);
            }}
            data={STATUS_OPTIONS}
          />
        </div>

        <QueryState
          query={requestsQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={5} columns={7}/>}
          errorTitle="Couldn't load your leave requests"
          isEmpty={(data) => data.content.length === 0}
          empty={filterStatus ? {
            icon: <CalendarOff className="h-6 w-6"/>,
            title: 'No matching leave requests',
            description: 'No requests have this status.',
            actionLabel: 'Clear filters',
            onAction: () => setFilterStatus(''),
          } : {
            icon: <CalendarOff className="h-6 w-6"/>,
            title: 'No leave requests found',
            description: 'Get started by applying for your first leave',
            actionLabel: 'Apply for Leave',
            onAction: () => router.push('/leave/apply'),
          }}
        >
          {(data) => (
            <div className="rounded-lg border border-border bg-card">
              <ResponsiveTable
                columns={columns}
                data={data.content}
                keyExtractor={(r) => r.id}
                stickyHeader
                renderRowActions={(r) => {
                  const items = rowActions(r);
                  return items.length > 0 ? <ResponsiveTableRowActions items={items}/> : null;
                }}
              />
              {data.totalPages > 1 && (
                <div className="px-4">
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={data.totalPages}
                    totalItems={data.totalElements ?? data.totalPages * PAGE_SIZE}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </QueryState>

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

        <ConfirmDialog
          isOpen={showReasonModal}
          onClose={() => {
            setShowReasonModal(false);
            setCancelReason('');
          }}
          onConfirm={handleReasonSubmit}
          title="Reason for Cancellation"
          message="Please provide a reason for cancelling this leave request."
          confirmText="Submit"
          cancelText="Cancel"
          type="warning"
          loading={cancelLeaveRequest.isPending}
          reason={{
            label: 'Cancellation reason',
            placeholder: 'Enter cancellation reason...',
            required: true,
          }}
        />
      </div>
    </AppLayout>
  );
}
