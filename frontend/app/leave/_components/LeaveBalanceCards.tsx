'use client';

import {Baby, Briefcase, Calendar, Heart, Umbrella} from 'lucide-react';
import type {LeaveBalance, LeaveType} from '@/lib/types/hrms/leave';

const GRADIENTS = [
  'from-accent-500 to-accent-700',
  'from-success-500 to-success-600',
  'from-warning-500 to-warning-600',
  'from-accent-600 to-accent-700',
  'from-accent-400 to-accent-600',
  'from-accent-500 to-accent-600',
];

function getLeaveTypeIcon(leaveTypeName: string) {
  const name = leaveTypeName?.toLowerCase() || '';
  if (name.includes('sick') || name.includes('medical')) return Heart;
  if (name.includes('casual') || name.includes('vacation')) return Umbrella;
  if (name.includes('maternity') || name.includes('paternity') || name.includes('parental')) return Baby;
  if (name.includes('earned') || name.includes('privilege')) return Briefcase;
  return Calendar;
}

export interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
}

export function LeaveBalanceCards({balances, leaveTypes}: LeaveBalanceCardsProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 skeuo-emboss">
        Leave Balance ({new Date().getFullYear()})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((balance, index) => {
          const leaveType = leaveTypes.find((t) => t.id === balance.leaveTypeId);
          const Icon = getLeaveTypeIcon(leaveType?.leaveName || '');
          const gradient = GRADIENTS[index % GRADIENTS.length];
          const total = balance.openingBalance + balance.accrued;
          const usedPercentage = total > 0 ? (balance.used / total) * 100 : 0;

          return (
            <div
              key={balance.id}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 hover:shadow-[var(--shadow-dropdown)] transition-all duration-200 skeuo-card"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient}`}>
                  <Icon className='h-5 w-5 text-inverse'/>
                </div>
                <span
                  className="text-xs font-medium px-2 py-1 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg">
                  {leaveType?.leaveCode || 'N/A'}
                </span>
              </div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                {leaveType?.leaveName || 'Leave'}
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-xl font-bold skeuo-emboss">
                  {balance.available.toFixed(1)}
                </span>
                <span className="text-body-muted">
                  / {total.toFixed(1)} days
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-300`}
                  style={{width: `${Math.min(usedPercentage, 100)}%`}}
                />
              </div>
              <div className="flex justify-between text-caption">
                <span>Used: {balance.used.toFixed(1)}</span>
                <span>Pending: {balance.pending.toFixed(1)}</span>
              </div>
            </div>
          );
        })}

        {balances.length === 0 && (
          <div className="col-span-full text-center py-8 text-[var(--text-muted)]">
            No leave balances found
          </div>
        )}
      </div>
    </div>
  );
}
