'use client';

import {Tooltip} from '@mantine/core';
import {Ring} from '@/components/charts/aura';
import type {LeaveBalanceLite, LeaveTypeLite} from './types';

const RING_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

// Annual balances reset on Jan 1 of the following year.
const RESET_LABEL = `Jan ${new Date().getFullYear() + 1}`;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "My balance" panel: up to four rings built from the employee's yearly balances. */
export function LeaveBalanceCard({balances, leaveTypes}: {balances: LeaveBalanceLite[]; leaveTypes: LeaveTypeLite[]}) {
  const items = balances.slice(0, 4);
  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="leave-balance-title">
      <div className="mb-4">
        <h2 id="leave-balance-title" className="text-base font-semibold text-text-1">My balance</h2>
        <p className="mt-1 text-xs text-text-3">Resets {RESET_LABEL}</p>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-3">No balances for this year yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((b, i) => {
            const total = (b.openingBalance ?? 0) + (b.accrued ?? 0);
            const remaining = b.available ?? Math.max(0, total - (b.used ?? 0));
            const pct = total > 0 ? (remaining / total) * 100 : 0;
            const name = leaveTypes.find((t) => t.id === b.leaveTypeId)?.leaveName ?? 'Leave';
            return (
              <div key={b.id} className="flex items-center gap-2">
                <Tooltip
                  label={`${name}: ${fmt(remaining)} remaining of ${total.toFixed(0)} total · ${(b.used ?? 0).toFixed(0)} used`}
                  withArrow
                  position="top"
                  withinPortal
                >
                  <div>
                    <Ring
                      value={pct}
                      size={52}
                      thickness={6}
                      color={RING_COLORS[i % RING_COLORS.length]}
                      label={fmt(remaining)}
                      ariaLabel={`${name}: ${remaining} of ${total} remaining`}
                    />
                  </div>
                </Tooltip>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-text-1">{name}</div>
                  <div className="text-2xs tabular-nums text-text-3">
                    {(b.used ?? 0).toFixed(0)} used · {total.toFixed(0)} total
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
