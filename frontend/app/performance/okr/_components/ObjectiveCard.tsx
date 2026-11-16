'use client';

import {ActionIcon, Badge, Button} from '@mantine/core';
import {ChevronDown, ChevronRight, ListChecks, Pencil, Plus, Trash2} from 'lucide-react';
import {Badge as UiBadge} from '@/components/ui/Badge';
import {Card} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {formatDate} from '@/lib/utils/format/date';
import type {KeyResult, Objective} from '@/lib/services/grow/okr.service';
import {
  getProgressColor,
  getStatusVariant,
  humanize,
  KeyResultStatusIcon,
  LevelIcon,
  StatusIcon,
} from './okrConfig';
import {KeyResultProgressInput} from './KeyResultProgressInput';

interface ObjectiveCardProps {
  objective: Objective;
  expanded: boolean;
  editable: boolean;
  savingKeyResultId: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddKeyResult: () => void;
  onDeleteKeyResult: (id: string) => void;
  onCommitProgress: (keyResultId: string, value: number) => Promise<boolean>;
}

function ProgressBar({value, status, className}: { value: number; status: string; className: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-surface-aura-sunken ${className}`} aria-hidden>
      <div className={`h-full ${getProgressColor(status)}`} style={{width: `${value}%`}}/>
    </div>
  );
}

function KeyResultRow({kr, editable, saving, onDelete, onCommit}: {
  kr: KeyResult;
  editable: boolean;
  saving: boolean;
  onDelete: () => void;
  onCommit: (value: number) => Promise<boolean>;
}) {
  return (
    <li className="panel-inset flex items-start gap-2 p-4">
      <KeyResultStatusIcon status={kr.status}/>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-1">{kr.title}</p>
        {kr.description && <p className="text-caption mt-1">{kr.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className="min-w-40 flex-1">
            <div className="text-caption mb-1 flex justify-between">
              <span>{kr.currentValue} / {kr.targetValue} {kr.measurementUnit}</span>
              <span>{kr.progressPercentage}%</span>
            </div>
            <ProgressBar value={kr.progressPercentage} status={kr.status} className="h-1.5 w-full"/>
          </div>
          {editable && (
            <div className="flex items-center gap-1">
              <KeyResultProgressInput
                title={kr.title}
                value={kr.currentValue}
                min={kr.startValue}
                max={kr.targetValue}
                disabled={saving}
                onCommit={onCommit}
              />
              <PermissionGate permission={Permissions.OKR_DELETE}>
                <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Delete key result" onClick={onDelete}>
                  <Trash2 className="h-4 w-4"/>
                </ActionIcon>
              </PermissionGate>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function ObjectiveCard({
  objective,
  expanded,
  editable,
  savingKeyResultId,
  onToggle,
  onEdit,
  onDelete,
  onAddKeyResult,
  onDeleteKeyResult,
  onCommitProgress,
}: ObjectiveCardProps) {
  const keyResults = objective.keyResults ?? [];
  const panelId = `objective-${objective.id}-key-results`;

  return (
    <Card variant="bordered" className="overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse objective' : 'Expand objective'}
            aria-expanded={expanded}
            aria-controls={panelId}
          >
            {expanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
          </ActionIcon>
          <div className="mt-2 text-text-3"><LevelIcon level={objective.objectiveLevel}/></div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-text-1">{objective.title}</h2>
              {objective.isStretchGoal && <Badge size="sm" variant="light">Stretch</Badge>}
            </div>
            {objective.description && <p className="text-body-muted mb-2">{objective.description}</p>}
            <div className="text-caption flex flex-wrap items-center gap-4">
              <span>{humanize(objective.objectiveLevel)}</span>
              <span>{formatDate(objective.startDate)} - {formatDate(objective.endDate)}</span>
              <UiBadge variant={getStatusVariant(objective.status)} icon={<StatusIcon status={objective.status}/>}>
                {objective.status ? humanize(objective.status) : '-'}
              </UiBadge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-start">
          <div className="mr-2 text-right">
            <p className="text-xl font-semibold text-text-1">{objective.progressPercentage}%</p>
            <ProgressBar value={objective.progressPercentage} status={objective.status} className="h-2 w-24"/>
          </div>
          {editable && (
            <>
              <PermissionGate permission={Permissions.OKR_UPDATE}>
                <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Edit objective" onClick={onEdit}>
                  <Pencil className="h-4 w-4"/>
                </ActionIcon>
              </PermissionGate>
              <PermissionGate permission={Permissions.OKR_DELETE}>
                <ActionIcon variant="subtle" color="red" size="lg" aria-label="Delete objective" onClick={onDelete}>
                  <Trash2 className="h-4 w-4"/>
                </ActionIcon>
              </PermissionGate>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <section id={panelId} className="border-t border-border bg-surface-aura-sunken p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-1">Key Results ({keyResults.length})</h3>
            {editable && (
              <PermissionGate permission={Permissions.OKR_UPDATE}>
                <Button size="sm" variant="subtle" leftSection={<Plus className="h-4 w-4"/>} onClick={onAddKeyResult}>
                  Add Key Result
                </Button>
              </PermissionGate>
            )}
          </div>
          {keyResults.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {keyResults.map((kr) => (
                <KeyResultRow
                  key={kr.id}
                  kr={kr}
                  editable={editable}
                  saving={savingKeyResultId === kr.id}
                  onDelete={() => onDeleteKeyResult(kr.id)}
                  onCommit={(value) => onCommitProgress(kr.id, value)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<ListChecks className="h-8 w-8"/>}
              title="No key results yet"
              description="Break this objective into measurable key results to track progress."
              {...(editable ? {actionLabel: 'Add Key Result', onAction: onAddKeyResult} : {})}
            />
          )}
        </section>
      )}
    </Card>
  );
}
