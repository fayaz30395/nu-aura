'use client';

import {useState} from 'react';
import {Modal} from '@mantine/core';
import {ClipboardCheck} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {QueryState} from '@/components/ui/QueryState';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useToast} from '@/components/ui/Toast';
import {useApproveRegularization, usePendingRegularizations} from '@/lib/hooks/queries/useAttendance';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {logger} from '@/lib/utils/logger';
import {formatDateShort} from '@/lib/utils/format/date';
import {RegularizationRequest} from './types';
import {RequestTimeline} from './RequestTimeline';
import {formatRelativeTime} from './utils';

const COLUMNS: Column<RegularizationRequest>[] = [
  {
    key: 'employee',
    header: 'Employee',
    mobilePriority: 'primary',
    accessor: (r) => <span className="font-medium text-text-1">{r.employeeId}</span>,
  },
  {key: 'date', header: 'Date', mobileLabel: 'Date', accessor: (r) => formatDateShort(r.attendanceDate)},
  {
    key: 'reason',
    header: 'Reason',
    mobilePriority: 'hidden',
    accessor: (r) => <span className="block max-w-xs truncate text-text-2" title={r.reason}>{r.reason}</span>,
  },
  {
    key: 'requested',
    header: 'Requested on',
    mobilePriority: 'hidden',
    accessor: (r) => <span className="text-text-2">{formatRelativeTime(r.requestedOn)}</span>,
  },
];

function toTeamRequests(records: AttendanceRecord[]): RegularizationRequest[] {
  return records
    .filter((record) => record.regularizationRequested && !record.regularizationApproved)
    .map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      attendanceDate: record.attendanceDate,
      originalCheckIn: record.checkInTime,
      originalCheckOut: record.checkOutTime,
      reason: record.regularizationReason || '',
      status: 'PENDING' as const,
      requestedOn: record.updatedAt,
      approvedBy: record.approvedBy,
      approvedOn: record.approvedAt,
      remarks: record.remarks,
    })) as RegularizationRequest[];
}

interface TeamRequestsViewProps {
  onReject: (id: string) => void;
}

export function TeamRequestsView({onReject}: TeamRequestsViewProps) {
  const approveMutation = useApproveRegularization();
  const {success, error} = useToast();
  const [detail, setDetail] = useState<RegularizationRequest | null>(null);
  const pendingQuery = usePendingRegularizations(0, 50);

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      success('Regularization request approved successfully!');
    } catch (err: unknown) {
      const errorMsg = (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
      error(errorMsg || 'Failed to approve regularization request. Please try again.');
      logger.error('Failed to approve request:', err);
    }
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="team-regularization-requests">
      <h2 id="team-regularization-requests" className="text-base font-semibold text-text-1">
        Pending regularization requests from team
      </h2>
      <QueryState
        query={pendingQuery}
        skeleton={<ListPageSkeleton rows={5} columns={4} showHeader={false} showFilters={false}/>}
        errorTitle="Couldn't load team requests"
      >
        {(data) => (
          <ResponsiveTable
            columns={COLUMNS}
            data={toTeamRequests(data?.content ?? [])}
            keyExtractor={(r) => r.id}
            stickyHeader
            emptyState={
              <EmptyState
                icon={<ClipboardCheck className="h-6 w-6"/>}
                title="No pending requests"
                description="All regularization requests from your team have been processed"
              />
            }
            rowActionsMenu={(r) => [
              {label: 'Approve', onClick: () => handleApprove(r.id), disabled: approveMutation.isPending},
              {label: 'Reject', onClick: () => onReject(r.id), color: 'red'},
              {label: 'View details', onClick: () => setDetail(r)},
            ]}
          />
        )}
      </QueryState>
      <Modal opened={!!detail} onClose={() => setDetail(null)} title="Request details" size="lg" centered>
        {detail && <RequestTimeline request={detail}/>}
      </Modal>
    </section>
  );
}
