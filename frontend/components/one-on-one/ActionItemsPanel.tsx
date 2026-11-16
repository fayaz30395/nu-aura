'use client';

import {Check, ListChecks} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {
  useOverdueActionItems,
  usePendingActionItems,
  useUpdateActionItemStatus,
} from '@/lib/hooks/queries/useOneOnOne';
import type {MeetingActionItemResponse} from '@/lib/types/hrms/meeting';

/** Action items assigned to me across all meetings (open + overdue). Create items from a meeting's detail view. */
export function ActionItemsPanel() {
  const pendingQuery = usePendingActionItems();
  const overdueQuery = useOverdueActionItems();
  const updateStatus = useUpdateActionItemStatus();

  if (pendingQuery.isLoading || overdueQuery.isLoading) {
    return <div className="p-8 text-center text-[var(--text-muted)]">Loading action items...</div>;
  }

  const overdueIds = new Set((overdueQuery.data ?? []).map((i) => i.id));
  const items: MeetingActionItemResponse[] = [
    ...(overdueQuery.data ?? []),
    ...(pendingQuery.data ?? []).filter((i) => !overdueIds.has(i.id)),
  ];

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-8 w-8"/>}
        title="No open action items"
        description="Action items assigned to you in 1-on-1 meetings show up here."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border-main)]">
      {items.map((item) => {
        const isOverdue = overdueIds.has(item.id);
        return (
          <li key={item.id} className="flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
              <p className="text-caption">
                {item.status.replace('_', ' ')}
                {item.dueDate && ` · due ${item.dueDate}`}
                {isOverdue && <span className="ml-2 text-danger-600 font-medium">Overdue</span>}
              </p>
            </div>
            <button
              onClick={() => updateStatus.mutate({actionId: item.id, data: {status: 'COMPLETED'}})}
              disabled={updateStatus.isPending}
              aria-label={`Mark "${item.title}" complete`}
              className="text-xs px-2 py-1 rounded bg-success-600 text-white hover:bg-success-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-3 w-3"/>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
