'use client';

import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import type {LeaveRequestLite, LeaveTypeLite} from './types';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'NA';
}

/** "Pending requests" panel listing the employee's recent requests still awaiting a decision. */
export function PendingRequestsCard({requests, leaveTypes}: {requests: LeaveRequestLite[]; leaveTypes: LeaveTypeLite[]}) {
  const pending = requests.filter((r) => r.status === 'PENDING');
  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="leave-pending-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="leave-pending-title" className="text-base font-semibold text-text-1">Pending requests</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warn-bg px-2 text-2xs font-semibold tabular-nums text-status-warn-fg">
          {pending.length}
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-3">No requests awaiting a decision.</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-border-subtle">
          {pending.map((r) => {
            const name = leaveTypes.find((t) => t.id === r.leaveTypeId)?.leaveName ?? 'Leave';
            return (
              <li key={r.id} className="flex items-center gap-2 py-2">
                <span
                  aria-hidden="true"
                  className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-2xs font-semibold text-accent"
                >
                  {initials(name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text-1">{name}</div>
                  <div className="truncate text-2xs text-text-3">
                    <span className="tabular-nums">{r.totalDays}</span> {r.totalDays === 1 ? 'day' : 'days'} · {r.requestNumber}
                  </div>
                </div>
                <StatusBadge status={r.status} domain={LEAVE_STATUS} compact/>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/leave/my-leaves"
        className="mt-2 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-accent hover:underline"
      >
        View all
        <ArrowRight className="h-4 w-4" aria-hidden="true"/>
      </Link>
    </section>
  );
}
