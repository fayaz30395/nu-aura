'use client';

import {ActionIcon, Badge, Button} from '@mantine/core';
import {FileText, Plus, Receipt, Trash2} from 'lucide-react';
import {apiConfig} from '@/lib/config';
import {QueryState} from '@/components/ui/QueryState';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {formatCurrency} from '@/lib/utils';
import {formatDate} from '@/lib/utils/format/date';
import type {ExpenseItemEntity} from '@/lib/types/hrms/expense';
import type {QueryStateResult} from '@/components/ui/QueryState';

export interface ClaimItemsSectionProps {
  claimId: string;
  itemsQuery: QueryStateResult<ExpenseItemEntity[]>;
  canEdit: boolean;
  onScanReceipt: () => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
}

function ItemsSkeleton() {
  return (
    <SkeletonRegion label="Loading expense items">
      <div className="flex flex-col">
        {Array.from({length: 3}).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
            <div className="flex flex-1 flex-col gap-2">
              <Bone height={14} width="40%" radius="sm"/>
              <Bone height={12} width="25%" radius="sm"/>
            </div>
            <Bone height={14} width={80} radius="sm"/>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function ClaimItemsSection({
  claimId,
  itemsQuery,
  canEdit,
  onScanReceipt,
  onAddItem,
  onDeleteItem,
}: ClaimItemsSectionProps) {
  const count = itemsQuery.data?.length;

  return (
    <section aria-labelledby="claim-items-heading" className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 id="claim-items-heading" className="text-base font-semibold text-text-1">
          Expense items{count !== undefined && <span className="tabular-nums text-text-3"> ({count})</span>}
        </h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" leftSection={<Receipt className="h-4 w-4" aria-hidden/>} onClick={onScanReceipt}>
              Scan Receipt
            </Button>
            <Button size="sm" leftSection={<Plus className="h-4 w-4" aria-hidden/>} onClick={onAddItem}>
              Add Item
            </Button>
          </div>
        )}
      </div>
      <QueryState
        query={itemsQuery}
        skeleton={<ItemsSkeleton/>}
        errorTitle="Couldn't load expense items"
        isEmpty={(items) => items.length === 0}
        empty={{
          icon: <Receipt className="h-full w-full"/>,
          title: 'No items added',
          description: canEdit ? 'Add line items or scan a receipt to build this claim.' : 'No expense line items have been added.',
          size: 'compact',
          ...(canEdit && {actionLabel: 'Add Item', onAction: onAddItem}),
        }}
      >
        {(items) => (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-1">{item.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-3">
                    {item.categoryName && <span>{item.categoryName}</span>}
                    <span>{formatDate(item.expenseDate)}</span>
                    {item.merchantName && <span>{item.merchantName}</span>}
                    {item.isBillable && <Badge size="xs" variant="light">Billable</Badge>}
                  </div>
                </div>
                {item.receiptFileName && (
                  /* BUG-E1: served via the claim-scoped endpoint; /files needs DOCUMENT:VIEW, which employees lack. */
                  <a
                    href={`${apiConfig.baseUrl}/expenses/claims/${claimId}/items/${item.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-accent-700 underline hover:text-accent-800 dark:text-accent-300"
                  >
                    <FileText className="h-3 w-3" aria-hidden/>
                    {item.receiptFileName}
                  </a>
                )}
                <p className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-text-1">
                  {formatCurrency(item.amount, item.currency)}
                </p>
                {canEdit && (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size={32}
                    aria-label={`Delete item ${item.description}`}
                    onClick={() => onDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden/>
                  </ActionIcon>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}
