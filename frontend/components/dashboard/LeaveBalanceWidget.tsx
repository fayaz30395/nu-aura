'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowRight, Calendar} from 'lucide-react';
import {Reveal} from '@/components/motion';

// wave-3 N: Safari <=16.1 lacks color-mix() support. Default to the
// modern value on first paint (matches SSR), swap to rgba() after mount
// on browsers that don't support it.
function supportsColorMix(): boolean {
  if (typeof window === 'undefined' || typeof CSS === 'undefined' || !CSS.supports) return true;
  return CSS.supports('background', 'color-mix(in srgb, red, blue)');
}

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
  {leaveTypeId: '1', leaveName: 'ANNUAL LEAVE', available: 24, total: 30, used: 6},
  {leaveTypeId: '2', leaveName: 'CASUAL LEAVE', available: 8, total: 12, used: 4},
  {leaveTypeId: '3', leaveName: 'SICK LEAVE', available: 10, total: 10, used: 0},
];

function CircularProgress({used, total}: { used: number; total: number }) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const remaining = total - used;

  // Color based on usage percentage
  const getStrokeColor = () => {
    if (percentage > 80) return 'var(--err-fg)';
    if (percentage > 60) return 'var(--warn-fg)';
    return 'var(--accent)';
  };

  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
        {/* Background track */}
        <circle
          cx="64" cy="64" r={radius}
          fill="none" strokeWidth="8"
          className="stroke-[var(--border)]"
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
          style={{filter: `drop-shadow(0 0 4px ${getStrokeColor()}40)`}}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-[var(--text-1)] num leading-none">{remaining}</div>
        <div className="text-aura-micro text-[var(--text-3)] mt-1">Days Left</div>
      </div>
    </div>
  );
}

export function LeaveBalanceWidget({leaveBalances = null}: LeaveBalanceWidgetProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  // wave-3 N: fallback to rgba() on Safari <=16.1 (no color-mix support).
  const [useFallback, setUseFallback] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
    if (!supportsColorMix()) setUseFallback(true);
  }, []);
  if (!isHydrated) return null;

  // --accent-primary #2563EB ≈ rgb(37, 99, 235); 22% mix ≈ rgba(37, 99, 235, 0.22)
  const buttonShadow = useFallback
    ? '0 2px 8px rgba(37, 99, 235, 0.22)' // fallback for Safari <=16.1
    : '0 2px 8px color-mix(in srgb, var(--accent-primary) 22%, transparent)';

  const balances = leaveBalances && leaveBalances.length > 0 ? leaveBalances : DEMO_BALANCES;
  const current = balances[selectedIndex];

  return (
    <Reveal>
      <div className="rounded-aura-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sh-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--text-3)]"/>
            <h3 className="text-sm font-semibold text-[var(--text-1)]">Leave Balance</h3>
          </div>
          <Link
            href="/leave"
            className="inline-flex items-center gap-0.5 text-caption text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="View all leave"
          >
            View All <ArrowRight className="h-3 w-3"/>
          </Link>
        </div>

        {/* Circular Progress */}
        <div className="flex justify-center mb-4">
          <CircularProgress used={current.used} total={current.total}/>
        </div>

        {/* Leave Type Label */}
        <div className="text-center mb-4">
          <p className="text-aura-micro text-[var(--text-3)]">
            {current.leaveName}
          </p>
          <p className="mt-0.5 text-caption text-[var(--text-2)]">
            <span className="num">{current.used}</span> used · <span className="num">{current.total}</span> total
          </p>
        </div>

        {/* Dots navigation */}
        {balances.length > 1 && (
          <div className="flex justify-center gap-1.5 mb-4">
            {balances.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                  idx === selectedIndex ? 'w-4 bg-[var(--text-2)]' : 'w-1.5 bg-[var(--border-soft)]'
                }`}
                aria-label={`Leave type ${idx + 1} of ${balances.length}`}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t border-[var(--border-soft)]">
          <Link
            href="/leave/apply"
            className="block w-full rounded-aura-control py-2.5 text-center text-xs font-semibold text-white transition-all duration-200 bg-[var(--accent)] hover:shadow-sh-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            style={{
              boxShadow: buttonShadow,
            }}
          >
            Request Leave
          </Link>
          <Link
            href="/leave/my-leaves"
            className="block w-full rounded-aura-control border border-[var(--border)] py-2.5 text-center text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-aura-strong)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            View All Balances
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
