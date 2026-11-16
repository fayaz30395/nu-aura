'use client';

import Link from 'next/link';
import {Badge, Button} from '@mantine/core';
import {Grid3x3, Play, Scale} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {ResponsiveTableRowActions, type RowActionItem} from '@/components/ui/ResponsiveTableRowActions';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {CYCLE_STATUS} from '@/lib/status/vocabulary';
import {formatDate} from '@/lib/utils/format/date';
import {cn} from '@/lib/utils';
import type {ReviewCycle} from '@/lib/types/grow/performance';
import {CYCLE_TYPE_LABEL} from './cycleOptions';

const DAY_MS = 1000 * 60 * 60 * 24;

function deadlineState(deadline?: string): 'passed' | 'soon' | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY_MS);
  if (days < 0) return 'passed';
  if (days <= 7) return 'soon';
  return null;
}

function Deadline({label, date}: {label: string; date?: string}) {
  const state = deadlineState(date);
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-text-2">{label}</dt>
      <dd className={cn('text-sm font-medium text-text-1', state === 'passed' && 'text-danger-600', state === 'soon' && 'text-warning-700')}>
        {date ? formatDate(date) : 'N/A'}
        {state === 'passed' && ' (Passed)'}
        {state === 'soon' && ' (Soon)'}
      </dd>
    </div>
  );
}

interface CycleCardProps {
  cycle: ReviewCycle;
  onActivate: (cycle: ReviewCycle) => void;
  onEdit: (cycle: ReviewCycle) => void;
  onDelete: (cycle: ReviewCycle) => void;
}

export function CycleCard({cycle, onActivate, onEdit, onDelete}: CycleCardProps) {
  const {hasPermission} = usePermissions();
  const name = cycle.name ?? cycle.cycleName;
  const reviewDeadline = cycle.reviewDeadline ?? cycle.managerReviewDeadline;

  const actions: RowActionItem[] = [];
  if (hasPermission(Permissions.REVIEW_UPDATE)) actions.push({label: 'Edit', onClick: () => onEdit(cycle)});
  if (hasPermission(Permissions.REVIEW_DELETE)) actions.push({label: 'Delete', color: 'red', onClick: () => onDelete(cycle)});

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="truncate text-base font-semibold text-text-1">{name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="light" color="gray" radius="sm" size="sm">
              {CYCLE_TYPE_LABEL[cycle.cycleType] ?? cycle.cycleType}
            </Badge>
            <StatusBadge status={cycle.status} domain={CYCLE_STATUS} compact/>
          </div>
        </div>
        {actions.length > 0 && <ResponsiveTableRowActions items={actions}/>}
      </header>

      {cycle.description && <p className="line-clamp-2 text-sm text-text-2">{cycle.description}</p>}

      <dl className="grid grid-cols-2 gap-4">
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-xs text-text-2">Period</dt>
          <dd className="text-sm font-medium text-text-1">
            {cycle.startDate ? formatDate(cycle.startDate) : 'N/A'} – {cycle.endDate ? formatDate(cycle.endDate) : 'N/A'}
          </dd>
        </div>
        <Deadline label="Review Deadline" date={reviewDeadline}/>
        {cycle.selfReviewDeadline && <Deadline label="Self Review Deadline" date={cycle.selfReviewDeadline}/>}
      </dl>

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button component={Link} href={`/performance/cycles/${cycle.id}/calibration`} variant="subtle" size="sm"
                leftSection={<Scale className="h-4 w-4" aria-hidden/>}>
          Calibration
        </Button>
        <Button component={Link} href={`/performance/cycles/${cycle.id}/nine-box`} variant="subtle" size="sm"
                leftSection={<Grid3x3 className="h-4 w-4" aria-hidden/>}>
          9-Box
        </Button>
        {cycle.status === 'PLANNING' && (
          <PermissionGate permission={Permissions.REVIEW_UPDATE}>
            <Button className="ml-auto" variant="light" size="sm" onClick={() => onActivate(cycle)}
                    leftSection={<Play className="h-4 w-4" aria-hidden/>}>
              Activate
            </Button>
          </PermissionGate>
        )}
      </footer>
    </article>
  );
}
