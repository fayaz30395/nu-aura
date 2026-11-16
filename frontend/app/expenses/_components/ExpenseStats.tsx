'use client';

import {CheckCircle, Clock, ShieldAlert, Wallet} from 'lucide-react';
import {Stat} from '@/components/ui/Stat';
import {formatCurrency} from '@/lib/utils';

export interface ExpenseStatsProps {
  pendingCount: number;
  pendingAmount: number;
  approvedThisMonthAmount: number;
  awaitingReimbursementAmount: number;
  overPolicyCount: number;
}

export function ExpenseStats({
  pendingCount,
  pendingAmount,
  approvedThisMonthAmount,
  awaitingReimbursementAmount,
  overPolicyCount,
}: ExpenseStatsProps) {
  return (
    <section aria-label="Expense summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <Stat
          size="compact"
          label="Pending claims"
          icon={<Clock className="h-4 w-4" aria-hidden/>}
          value={pendingCount}
          caption={<span className="tabular-nums">{formatCurrency(pendingAmount)}</span>}
          tone={pendingCount > 0 ? 'warning' : 'default'}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <Stat
          size="compact"
          label="Approved this month"
          icon={<CheckCircle className="h-4 w-4" aria-hidden/>}
          value={<span className="tabular-nums">{formatCurrency(approvedThisMonthAmount)}</span>}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <Stat
          size="compact"
          label="Awaiting reimbursement"
          icon={<Wallet className="h-4 w-4" aria-hidden/>}
          value={<span className="tabular-nums">{formatCurrency(awaitingReimbursementAmount)}</span>}
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <Stat
          size="compact"
          label="Over policy"
          icon={<ShieldAlert className="h-4 w-4" aria-hidden/>}
          value={overPolicyCount}
          tone={overPolicyCount > 0 ? 'danger' : 'default'}
        />
      </div>
    </section>
  );
}
