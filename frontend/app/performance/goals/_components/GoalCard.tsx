'use client';

import {Badge, Progress} from '@mantine/core';
import {Card} from '@/components/ui/Card';
import {ResponsiveTableRowActions, type RowActionItem} from '@/components/ui/ResponsiveTableRowActions';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {formatDate} from '@/lib/utils/format/date';
import type {Goal} from '@/lib/types/grow/performance';
import {calculateGoalProgress, GOAL_STATUS_META} from './goalConfig';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalCard({goal, onEdit, onDelete}: GoalCardProps) {
  const {hasPermission} = usePermissions();
  const progress = calculateGoalProgress(goal.currentValue, goal.targetValue);

  const actions: RowActionItem[] = [];
  if (hasPermission(Permissions.GOAL_UPDATE)) actions.push({label: 'Edit', onClick: () => onEdit(goal)});
  if (hasPermission(Permissions.GOAL_DELETE)) actions.push({label: 'Delete', color: 'red', onClick: () => onDelete(goal)});

  return (
    <Card as="article" className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="truncate text-base font-semibold text-text-1">{goal.title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="light" color="gray" radius="sm" size="sm">{goal.goalType}</Badge>
            <StatusBadge status={goal.status} domain={GOAL_STATUS_META} compact/>
          </div>
        </div>
        {actions.length > 0 && <ResponsiveTableRowActions items={actions}/>}
      </header>

      {goal.description && <p className="line-clamp-2 text-sm text-text-2">{goal.description}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-2">Progress</span>
          <span className="font-semibold tabular-nums text-text-1">{progress}%</span>
        </div>
        <Progress value={progress} size="sm" radius="xl" classNames={{root: 'rounded-full'}}
                  aria-label={`Progress for ${goal.title}`}/>
        <div className="flex justify-between text-xs tabular-nums text-text-2">
          <span>{goal.currentValue} {goal.unit}</span>
          <span>{goal.targetValue} {goal.unit}</span>
        </div>
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-text-2">Start</dt>
          <dd className="text-sm font-medium text-text-1">{goal.startDate ? formatDate(goal.startDate) : 'N/A'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-text-2">End</dt>
          <dd className="text-sm font-medium text-text-1">{goal.endDate ? formatDate(goal.endDate) : 'N/A'}</dd>
        </div>
      </dl>
    </Card>
  );
}
