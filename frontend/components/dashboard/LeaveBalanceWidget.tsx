'use client';

import { useEffect, useState } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';

interface LeaveBalance {
  leaveTypeId: string;
  leaveName: string;
  available: number;
  total: number;
  used: number;
}

interface LeaveBalanceWidgetProps {
  leaveBalances?: LeaveBalance[] | null;
  isLoading?: boolean;
}

const DEMO_BALANCES: LeaveBalance[] = [
  { leaveTypeId: '1', leaveName: 'ANNUAL LEAVE', available: 24, total: 30, used: 6 },
  { leaveTypeId: '2', leaveName: 'CASUAL LEAVE', available: 8, total: 12, used: 4 },
  { leaveTypeId: '3', leaveName: 'SICK LEAVE', available: 10, total: 10, used: 0 },
];

function CircularProgress({ used, total }: { used: number; total: number }) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full" viewBox="0 0 128 128">
        <circle
          cx="64" cy="64" r={radius}
          fill="none" strokeWidth="6"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        <circle
          cx="64" cy="64" r={radius}
          fill="none" strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="stroke-slate-600 dark:stroke-slate-400 transition-all duration-500"
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold text-[var(--text-primary)]">{total - used}</div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Days Left</div>
      </div>
    </div>
  );
}

export function LeaveBalanceWidget({ leaveBalances = null }: LeaveBalanceWidgetProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);
  if (!isHydrated) return null;

  const balances = leaveBalances && leaveBalances.length > 0 ? leaveBalances : DEMO_BALANCES;
  const current = balances[selectedIndex];

  return (
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Leave Balance</h3>
        </div>
        <a
          href="/leaves"
          className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)] hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {/* Circular Progress */}
      <div className="flex justify-center mb-3">
        <CircularProgress used={current.used} total={current.total} />
      </div>

      {/* Leave Type Label */}
      <div className="text-center mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {current.leaveName}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {current.used} used · {current.total} total
        </p>
      </div>

      {/* Dots navigation */}
      {balances.length > 1 && (
        <div className="flex justify-center gap-1.5 mb-3">
          {balances.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === selectedIndex ? 'w-4 bg-gray-500 dark:bg-gray-400' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-1.5 pt-3 border-t border-[var(--border-subtle)]">
        <a
          href="/leaves/request"
          className="block w-full rounded-lg bg-primary-600 py-2 text-center text-xs font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Request Leave
        </a>
        <a
          href="/leaves/balance"
          className="block w-full rounded-lg border border-[var(--border-main)] py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors dark:hover:bg-gray-900"
        >
          View All Balances
        </a>
      </div>
    </div>
  );
}
