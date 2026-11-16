'use client';

import Link from 'next/link';
import {Button} from '@mantine/core';
import {ResponsiveTable, type Column, type RowActionItem} from '@/components/ui/ResponsiveTable';
import {ResponsiveTableRowActions} from '@/components/ui/ResponsiveTableRowActions';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EXPENSE_STATUS} from '@/lib/status/vocabulary';
import {formatCurrency} from '@/lib/utils';
import {formatDate} from '@/lib/utils/format/date';
import {safeWindowOpen} from '@/lib/utils/url';
import type {ExpenseClaim} from '@/lib/types/hrms/expense';
import type {ClaimsTab} from './types';

export interface ClaimsTableProps {
  activeTab: ClaimsTab;
  claims: ExpenseClaim[];
  selectedClaims: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  canCreate: boolean;
  canApprove: boolean;
  onView: (claim: ExpenseClaim) => void;
  onSubmit: (id: string) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  /** Claim ids with an in-flight submit/approve request. */
  pendingIds: Set<string>;
}

export function ClaimsTable({
  activeTab,
  claims,
  selectedClaims,
  onSelectionChange,
  canCreate,
  canApprove,
  onView,
  onSubmit,
  onDelete,
  onApprove,
  onReject,
  pendingIds,
}: ClaimsTableProps) {
  const showEmployee = activeTab !== 'my-claims';
  const isApprovalView = activeTab === 'pending' && canApprove;
  const submittedIds = new Set(claims.filter((c) => c.status === 'SUBMITTED').map((c) => c.id));

  const columns: Column<ExpenseClaim>[] = [
    {
      key: 'claimNumber',
      header: 'Claim #',
      mobilePriority: 'primary',
      accessor: (c) => (
        <Link href={`/expenses/${c.id}`} className="font-medium text-accent-700 hover:underline dark:text-accent-300">
          {c.claimNumber}
        </Link>
      ),
    },
    ...(showEmployee
      ? [{
        key: 'employee',
        header: 'Employee',
        mobilePriority: 'secondary' as const,
        accessor: (c: ExpenseClaim) => (
          <span>
            {c.employeeName}
            {c.employeeCode && <span className="text-text-3"> ({c.employeeCode})</span>}
          </span>
        ),
      }]
      : []),
    {
      key: 'description',
      header: 'Description',
      mobilePriority: 'secondary',
      accessor: (c) => (
        <div className="flex max-w-xs flex-col gap-1">
          <span className="truncate" title={c.description}>{c.description}</span>
          {c.rejectionReason && (
            <span className="truncate text-xs text-danger-600 dark:text-danger-300" title={c.rejectionReason}>
              Rejected: {c.rejectionReason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      mobilePriority: 'hidden',
      accessor: (c) => c.categoryDisplayName || c.category?.replace(/_/g, ' '),
    },
    {key: 'claimDate', header: 'Date', mobilePriority: 'secondary', accessor: (c) => formatDate(c.claimDate)},
    {
      key: 'status',
      header: 'Status',
      mobilePriority: 'secondary',
      accessor: (c) => <StatusBadge status={c.status} domain={EXPENSE_STATUS}/>,
    },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      mobilePriority: 'primary',
      accessor: (c) => <span className="font-semibold text-text-1">{formatCurrency(c.amount, c.currency)}</span>,
    },
  ];

  const menuItems = (c: ExpenseClaim): RowActionItem[] => {
    const items: RowActionItem[] = [{label: 'View details', onClick: () => onView(c)}];
    if (c.receiptUrl) {
      items.push({label: 'View receipt', onClick: () => safeWindowOpen(c.receiptUrl, '_blank')});
    }
    if (c.status === 'DRAFT' && activeTab === 'my-claims' && canCreate) {
      items.push({label: 'Delete', color: 'red', onClick: () => onDelete(c.id)});
    }
    return items;
  };

  return (
    <ResponsiveTable
      columns={columns}
      data={claims}
      keyExtractor={(c) => c.id}
      stickyHeader
      selectable={isApprovalView && submittedIds.size > 0}
      selectedKeys={selectedClaims}
      onSelectionChange={(keys) => onSelectionChange(new Set([...keys].filter((k) => submittedIds.has(k))))}
      renderRowActions={(c) => {
        const busy = pendingIds.has(c.id);
        return (
          <div className="flex items-center justify-end gap-2">
            {c.status === 'DRAFT' && activeTab === 'my-claims' && canCreate && (
              <Button size="xs" onClick={() => onSubmit(c.id)} loading={busy}>
                Submit
              </Button>
            )}
            {c.status === 'SUBMITTED' && isApprovalView && (
              <>
                <Button size="xs" color="green" onClick={() => onApprove(c.id)} loading={busy}>
                  Approve
                </Button>
                <Button size="xs" variant="light" color="red" onClick={() => onReject(c.id)} disabled={busy}>
                  Reject
                </Button>
              </>
            )}
            <ResponsiveTableRowActions items={menuItems(c)}/>
          </div>
        );
      }}
    />
  );
}
