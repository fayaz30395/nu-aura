'use client';

import {Banknote, Calendar} from 'lucide-react';
import {Progress} from '@mantine/core';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {cn} from '@/lib/utils';
import {categoricalSoftBgClass, categoricalTextClass} from '@/lib/utils/categoricalPalette';
import type {LeaveBalance, LeaveType} from '@/lib/types/hrms/leave';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  leaveType?: LeaveType;
  onEncash: (balance: LeaveBalance) => void;
}

function BalanceRow({label, value, valueClass}: { label: string; value: number; valueClass: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-2">{label}</span>
      <span className={cn('font-semibold tabular-nums', valueClass)}>{value}</span>
    </div>
  );
}

export function LeaveBalanceCard({balance, leaveType, onEncash}: LeaveBalanceCardProps) {
  const isEncashable = leaveType?.isEncashable && balance.available > 0;
  const usage = Math.min((balance.used / (balance.used + balance.available)) * 100, 100);
  const leaveName = leaveType?.leaveName || 'Unknown';

  return (
    <Card padding="sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', categoricalSoftBgClass(leaveType?.colorCode))}>
          <Calendar className={cn('h-5 w-5', categoricalTextClass(leaveType?.colorCode))} aria-hidden="true"/>
        </div>
        {isEncashable && (
          <Button
            variant="soft"
            size="sm"
            leftIcon={<Banknote className="h-3 w-3" aria-hidden="true"/>}
            onClick={() => onEncash(balance)}
            aria-label={`Encash available ${leaveName} leaves`}
          >
            Encash
          </Button>
        )}
      </div>
      <h3 className="mb-2 text-base font-semibold text-text-1">{leaveName}</h3>
      <div className="flex flex-col gap-2">
        <BalanceRow label="Available" value={balance.available} valueClass="text-status-ok-fg"/>
        <BalanceRow label="Used" value={balance.used} valueClass="text-text-1"/>
        <BalanceRow label="Pending" value={balance.pending} valueClass="text-status-warn-fg"/>
        {balance.encashed > 0 && <BalanceRow label="Encashed" value={balance.encashed} valueClass="text-status-ok-fg"/>}
      </div>
      <Progress
        className="mt-4"
        size="sm"
        radius="xl"
        color="var(--accent-primary)"
        value={Number.isFinite(usage) ? Math.max(usage, 0) : 0}
        aria-label={`${leaveName} usage`}
      />
    </Card>
  );
}
