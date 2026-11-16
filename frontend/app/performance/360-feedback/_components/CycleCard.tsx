'use client';

import {ActionIcon, Badge, Button, Tooltip} from '@mantine/core';
import {Play, Square, Trash2, Users} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {formatDate} from '@/lib/utils/format/date';
import type {Feedback360Cycle} from '@/lib/services/grow/feedback360.service';
import {Badge as UiBadge} from '@/components/ui/Badge';
import {Card} from '@/components/ui/Card';
import {getStatusIcon, getStatusVariant} from './feedbackStatus';

interface CycleCardProps {
  cycle: Feedback360Cycle;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: (id: string) => void;
  onNominate: (cycle: Feedback360Cycle) => void;
}

const REVIEW_TYPE_FLAGS = [
  {key: 'includeSelfReview', label: 'Self'},
  {key: 'includeManagerReview', label: 'Manager'},
  {key: 'includePeerReview', label: 'Peer'},
  {key: 'includeUpwardReview', label: 'Upward'},
] as const;

export function CycleCard({cycle, onActivate, onDelete, onClose, onNominate}: CycleCardProps) {
  const canNominate = cycle.status === 'ACTIVE' || cycle.status === 'NOMINATION' || cycle.status === 'IN_PROGRESS';
  const canClose = cycle.status === 'ACTIVE' || cycle.status === 'IN_PROGRESS';

  return (
    <Card as="article" className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 truncate text-base font-semibold text-text-1">{cycle.name}</h2>
        <UiBadge variant={getStatusVariant(cycle.status)} icon={getStatusIcon(cycle.status)}>
          {cycle.status}
        </UiBadge>
      </header>

      {cycle.description && <p className="line-clamp-2 text-sm text-text-2">{cycle.description}</p>}

      <dl className="flex flex-col gap-2 text-xs text-text-2">
        <div className="flex justify-between gap-2">
          <dt>Period:</dt>
          <dd className="text-text-1">{formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Peer reviewers:</dt>
          <dd className="text-text-1 tabular-nums">{cycle.minPeersRequired} - {cycle.maxPeersAllowed}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {REVIEW_TYPE_FLAGS.filter(({key}) => cycle[key]).map(({key, label}) => (
          <Badge key={key} variant="light" color="gray" radius="sm" size="sm">{label}</Badge>
        ))}
        {cycle.isAnonymous && <Badge variant="light" color="aura" radius="sm" size="sm">Anonymous</Badge>}
      </div>

      <footer className="mt-auto flex items-center justify-end gap-2 border-t border-border pt-4">
        {cycle.status === 'DRAFT' && (
          <PermissionGate permission={Permissions.FEEDBACK_360_MANAGE}>
            <Tooltip label="Activate">
              <ActionIcon variant="subtle" color="green" aria-label="Activate cycle" onClick={() => onActivate(cycle.id)}>
                <Play className="h-4 w-4" aria-hidden/>
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete">
              <ActionIcon variant="subtle" color="red" aria-label="Delete cycle" onClick={() => onDelete(cycle.id)}>
                <Trash2 className="h-4 w-4" aria-hidden/>
              </ActionIcon>
            </Tooltip>
          </PermissionGate>
        )}
        {canNominate && (
          <PermissionGate permission={Permissions.FEEDBACK_360_CREATE}>
            <Button
              variant="light"
              size="sm"
              title="Nominate a reviewer"
              leftSection={<Users className="h-4 w-4" aria-hidden/>}
              onClick={() => onNominate(cycle)}
            >
              Nominate
            </Button>
          </PermissionGate>
        )}
        {canClose && (
          <PermissionGate permission={Permissions.FEEDBACK_360_MANAGE}>
            <Tooltip label="Close">
              <ActionIcon variant="subtle" color="gray" aria-label="Close cycle" onClick={() => onClose(cycle.id)}>
                <Square className="h-4 w-4" aria-hidden/>
              </ActionIcon>
            </Tooltip>
          </PermissionGate>
        )}
      </footer>
    </Card>
  );
}
