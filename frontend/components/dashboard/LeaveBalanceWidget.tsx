'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const remaining = total - used;

  // Color based on usage percentage
  const getStrokeColor = () => {
    if (percentage > 80) return 'var(--chart-danger)';
    if (percentage > 60) return 'var(--chart-warning)';
    return 'var(--accent-primary)';
  };

  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
        {/* Background track */}
        <circle
          cx="64" cy="64" r={radius}
          fill="none" strokeWidth="8"
          className="stroke-[var(--border-main)]"
          opacity="0.5"
        />
        {/* Progress arc with gradient color */}
        <circle
          cx="64" cy="64" r={radius}
          fill="none" strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={getStrokeColor()}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${getStrokeColor()}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-[var(--text-primary)] tabular-nums leading-none">{remaining}</div>
        <div className="text-2xs text-[var(--text-muted)] uppercase tracking-[0.1em] mt-1 font-medium">Days Left</div>
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
    <div className="skeuo-card rounded-lg border border-[var(--border-main)] p-6">
      <div className="row-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)]">Leave Balance</h3>
        </div>
        <Link
          href="/leave"
          className="inline-flex items-center gap-0.5 text-caption hover:text-[var(--text-secondary)] transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Circular Progress */}
      <div className="flex justify-center mb-4">
        <CircularProgress used={current.used} total={current.total} />
      </div>

      {/* Leave Type Label */}
      <div className="text-center mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {current.leaveName}
        </p>
        <p className="mt-0.5 text-caption">
          {current.used} used · {current.total} total
        </p>
      </div>

      {/* Dots navigation */}
      {balances.length > 1 && (
        <div className="flex justify-center gap-1.5 mb-4">
          {balances.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                idx === selectedIndex ? 'w-4 bg-[var(--text-muted)]' : 'w-1.5 bg-[var(--border-main)]'
              }`}
              aria-label={`Leave type ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
        <Link
          href="/leave/apply"
          className="block w-full rounded-xl py-2.5 text-center text-xs font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-dropdown)] active:scale-[0.98]"
          style={{
            background: 'var(--nu-gradient-dark)',
            boxShadow: '0 2px 8px color-mix(in srgb, var(--nu-lapis-blue) 25%, transparent)',
          }}
        >
          Request Leave
        </Link>
        <Link
          href="/leave/my-leaves"
          className="block w-full rounded-xl border border-[var(--border-main)] py-2.5 text-center text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all duration-200"
        >
          View All Balances
        </Link>
      </div>
    </div>
  );
}
