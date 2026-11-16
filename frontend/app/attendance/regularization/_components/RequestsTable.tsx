'use client';

import {useState} from 'react';
import {ActionIcon, Modal} from '@mantine/core';
import {ClipboardCheck, Eye} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import {formatDateShort} from '@/lib/utils/format/date';
import {RegularizationRequest} from './types';
import {RequestTimeline} from './RequestTimeline';
import {formatRelativeTime, formatTime} from './utils';

const COLUMNS: Column<RegularizationRequest>[] = [
  {
    key: 'date',
    header: 'Date',
    mobilePriority: 'primary',
    accessor: (r) => <span className="font-medium text-text-1">{formatDateShort(r.attendanceDate)}</span>,
  },
  {
    key: 'original',
    header: 'Original time',
    mobilePriority: 'hidden',
    accessor: (r) => (
      <div className="flex flex-col text-xs text-text-2">
        <span>In: {r.originalCheckIn ? formatTime(r.originalCheckIn) : 'Not marked'}</span>
        <span>Out: {r.originalCheckOut ? formatTime(r.originalCheckOut) : 'Not marked'}</span>
      </div>
    ),
  },
  {
    key: 'reason',
    header: 'Reason',
    mobileLabel: 'Reason',
    accessor: (r) => <span className="block max-w-xs truncate text-text-2" title={r.reason}>{r.reason}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    mobileLabel: 'Status',
    accessor: (r) => <StatusBadge status={r.status} domain={LEAVE_STATUS}/>,
  },
  {
    key: 'requested',
    header: 'Requested',
    mobilePriority: 'hidden',
    accessor: (r) => <span className="text-text-2">{formatRelativeTime(r.requestedOn)}</span>,
  },
];

interface RequestsTableProps {
  requests: RegularizationRequest[];
  statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  onNewRequest: () => void;
}

export function RequestsTable({requests, statusFilter, onNewRequest}: RequestsTableProps) {
  const [detail, setDetail] = useState<RegularizationRequest | null>(null);
  const filterLabel = statusFilter.toLowerCase();

  return (
    <section className="flex flex-col gap-4" aria-labelledby="your-regularization-requests">
      <h2 id="your-regularization-requests" className="text-base font-semibold text-text-1">
        Your regularization requests
      </h2>
      <ResponsiveTable
        columns={COLUMNS}
        data={requests}
        keyExtractor={(r) => r.id}
        stickyHeader
        emptyState={
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6"/>}
            title={statusFilter === 'ALL' ? 'No requests yet' : `No ${filterLabel} requests`}
            description={
              statusFilter === 'ALL'
                ? 'Submit a regularization request to correct your attendance records'
                : `You don't have any ${filterLabel} regularization requests`
            }
            actionLabel="Submit Request"
            onAction={onNewRequest}
          />
        }
        renderRowActions={(r) => (
          <ActionIcon variant="subtle" color="gray" size={32} aria-label="View request details" onClick={() => setDetail(r)}>
            <Eye size={16} aria-hidden/>
          </ActionIcon>
        )}
      />
      <Modal opened={!!detail} onClose={() => setDetail(null)} title="Request details" size="lg" centered>
        {detail && <RequestTimeline request={detail}/>}
      </Modal>
    </section>
  );
}
