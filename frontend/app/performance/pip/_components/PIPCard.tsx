'use client';

import {Button, Progress} from '@mantine/core';
import {Calendar, Eye, Users} from 'lucide-react';
import {Card} from '@/components/ui/Card';
import {StatusBadge} from '@/components/ui/StatusBadge';
import type {PIPResponse} from '@/lib/types/grow/performance';
import {calculateDaysRemaining, calculateProgress, formatPipDate, PIP_STATUS} from './pipConfig';

interface PIPCardProps {
  pip: PIPResponse;
  onView: () => void;
}

export function PIPCard({pip, onView}: PIPCardProps) {
  const daysRemaining = calculateDaysRemaining(pip.endDate);
  const progress = calculateProgress(pip.startDate, pip.endDate);

  return (
    <Card as="article" className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-base font-semibold text-text-1">{pip.employeeName}</h3>
          <p className="text-sm text-text-2">{pip.reason || 'General'}</p>
        </div>
        <StatusBadge status={pip.status} domain={PIP_STATUS} compact/>
      </header>

      <div className="flex flex-col gap-2 text-sm text-text-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden/>
          <span>{formatPipDate(pip.startDate)} → {formatPipDate(pip.endDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" aria-hidden/>
          <span>Manager: {pip.managerName}</span>
        </div>
      </div>

      {pip.status === 'ACTIVE' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-text-2">Progress</span>
            <span className="text-xs tabular-nums text-text-2">{progress}%</span>
          </div>
          <Progress value={progress} size="sm" radius="xl" aria-label={`PIP progress for ${pip.employeeName}`}/>
          <p className="text-xs text-text-2">{daysRemaining} days remaining</p>
        </div>
      )}

      <Button className="mt-auto" variant="light" fullWidth onClick={onView}
              leftSection={<Eye className="h-4 w-4" aria-hidden/>}>
        View Details
      </Button>
    </Card>
  );
}
