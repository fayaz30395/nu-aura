'use client';

import {cn} from '@/lib/utils';

interface LeaveBalanceSummaryProps {
  balance: {available: number; used: number; pending: number};
  requestedDays: number;
}

const RADIUS = 18;
const CIRC = 2 * Math.PI * RADIUS;

/** Donut + legend summarising the selected leave type's balance against the current request. */
export function LeaveBalanceSummary({balance, requestedDays}: LeaveBalanceSummaryProps) {
  const total = balance.available + balance.used + balance.pending;
  const avail = total > 0 ? (balance.available / total) * CIRC : 0;
  const pend = total > 0 ? (balance.pending / total) * CIRC : 0;
  const used = total > 0 ? (balance.used / total) * CIRC : 0;
  const exceeds = requestedDays > balance.available;

  const segment = (length: number, offset: number, stroke: string) =>
    length > 0 && (
      <circle
        cx="22" cy="22" r={RADIUS} fill="none" stroke={stroke} strokeWidth="6"
        strokeDasharray={`${length} ${CIRC - length}`}
        strokeDashoffset={offset}
        strokeLinecap="butt"
      />
    );

  return (
    <div className="flex items-center gap-4 rounded-md border border-border-subtle bg-surface-aura-sunken p-2">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={RADIUS} fill="none" stroke="var(--border-main)" strokeWidth="6"/>
        {segment(used, CIRC * 0.25, 'var(--err-fg)')}
        {segment(pend, CIRC * 0.25 - used, 'var(--warn-fg)')}
        {segment(avail, CIRC * 0.25 - used - pend, 'var(--ok-fg)')}
      </svg>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span data-testid="leave-available" className="flex items-center gap-1 font-semibold text-status-ok-fg">
            <span className="inline-block h-2 w-2 rounded-full bg-status-ok-fg"/>
            {balance.available}d available
          </span>
          {balance.pending > 0 && (
            <span className="flex items-center gap-1 text-status-warn-fg">
              <span className="inline-block h-2 w-2 rounded-full bg-status-warn-fg"/>
              {balance.pending}d pending
            </span>
          )}
          {balance.used > 0 && (
            <span className="flex items-center gap-1 text-text-3">
              <span className="inline-block h-2 w-2 rounded-full bg-status-err-fg"/>
              {balance.used}d used
            </span>
          )}
        </div>
        {requestedDays > 0 && (
          <p className={cn('mt-1 text-xs font-medium', exceeds ? 'text-status-err-fg' : 'text-text-2')}>
            {exceeds
              ? `Requesting ${requestedDays}d exceeds ${balance.available}d available`
              : `${balance.available - requestedDays}d remaining after this request`}
          </p>
        )}
      </div>
    </div>
  );
}
