'use client';

import type {ReactNode} from 'react';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {ResponsiveTableRowActions, type RowActionItem} from '@/components/ui/ResponsiveTableRowActions';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {SHIFT_SWAP_STATUS, SWAP_TYPE_LABELS, ShiftSwapAction, ShiftSwapRequest, ShiftSwapTab} from './types';

const COLUMNS: Column<ShiftSwapRequest>[] = [
  {
    key: 'type',
    header: 'Type',
    mobilePriority: 'primary',
    accessor: (r) => <span className="font-medium text-text-1">{SWAP_TYPE_LABELS[r.swapType] ?? r.swapType}</span>,
  },
  {key: 'shiftDate', header: 'Shift date', mobileLabel: 'Shift date', accessor: (r) => r.requesterShiftDate},
  {key: 'targetDate', header: 'Target date', mobileLabel: 'Target date', accessor: (r) => r.targetShiftDate ?? '—'},
  {
    key: 'reason',
    header: 'Reason',
    mobilePriority: 'hidden',
    accessor: (r) => <span className="block max-w-xs truncate text-text-2">{r.reason ?? '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    mobileLabel: 'Status',
    accessor: (r) => {
      const meta = SHIFT_SWAP_STATUS[r.status];
      return meta ? <StatusBadge status={r.status} meta={meta}/> : <span className="text-text-3">{r.status ?? '—'}</span>;
    },
  },
];

function actionsFor(tab: ShiftSwapTab, req: ShiftSwapRequest): ShiftSwapAction[] {
  if (tab === 'incoming' && req.status === 'PENDING') return ['accept', 'decline'];
  if (tab === 'approval' && req.status === 'PENDING_APPROVAL') return ['approve', 'reject'];
  if (tab === 'my' && (req.status === 'PENDING' || req.status === 'TARGET_ACCEPTED')) return ['cancel'];
  return [];
}

const ACTION_ITEM_LABELS: Record<ShiftSwapAction, string> = {
  accept: 'Accept',
  decline: 'Decline',
  approve: 'Approve',
  reject: 'Reject',
  cancel: 'Cancel request',
};

const DESTRUCTIVE: ShiftSwapAction[] = ['decline', 'reject', 'cancel'];

interface Props {
  tab: ShiftSwapTab;
  rows: ShiftSwapRequest[];
  actionPending: boolean;
  onAction: (req: ShiftSwapRequest, action: ShiftSwapAction) => void;
  emptyState: ReactNode;
}

export function ShiftSwapTable({tab, rows, actionPending, onAction, emptyState}: Props) {
  return (
    <ResponsiveTable
      columns={COLUMNS}
      data={rows}
      keyExtractor={(r) => r.id}
      stickyHeader
      emptyState={emptyState}
      renderRowActions={(req) => {
        const actions = actionsFor(tab, req);
        if (actions.length === 0) return null;
        const items: RowActionItem[] = actions.map((action) => ({
          label: ACTION_ITEM_LABELS[action],
          onClick: () => onAction(req, action),
          color: DESTRUCTIVE.includes(action) ? 'red' : undefined,
          disabled: actionPending,
        }));
        return <ResponsiveTableRowActions items={items}/>;
      }}
    />
  );
}
