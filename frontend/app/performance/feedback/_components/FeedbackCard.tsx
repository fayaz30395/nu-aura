'use client';

import {Badge, Button} from '@mantine/core';
import {Pencil, Trash2} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Card} from '@/components/ui/Card';
import {Permissions} from '@/lib/hooks/usePermissions';
import {formatDateTime} from '@/lib/utils/format/date';
import type {Feedback} from '@/lib/types/grow/performance';
import {FEEDBACK_TYPE_COLOR} from './feedbackOptions';

interface FeedbackCardProps {
  feedback: Feedback;
  /** Given feedback can be edited and deleted by its author. */
  editable: boolean;
  onEdit: (feedback: Feedback) => void;
  onDelete: (feedback: Feedback) => void;
}

export function FeedbackCard({feedback, editable, onEdit, onDelete}: FeedbackCardProps) {
  return (
    <Card as="article" className="flex flex-col gap-4 rounded-lg p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="light" radius="sm" size="sm" color={FEEDBACK_TYPE_COLOR[feedback.feedbackType] ?? 'gray'}>
            {feedback.feedbackType}
          </Badge>
          {feedback.category && (
            <Badge variant="light" radius="sm" size="sm" color="gray">{feedback.category}</Badge>
          )}
          {feedback.isAnonymous && (
            <Badge variant="outline" radius="sm" size="sm" color="gray">Anonymous</Badge>
          )}
          {feedback.isPublic && (
            <Badge variant="outline" radius="sm" size="sm" color="blue">Public</Badge>
          )}
        </div>
        <time className="text-xs text-text-2" dateTime={feedback.createdAt}>
          {feedback.createdAt ? formatDateTime(feedback.createdAt) : 'N/A'}
        </time>
      </header>

      <p className="whitespace-pre-wrap text-sm text-text-1">{feedback.feedbackText}</p>

      {editable && (
        <footer className="flex flex-wrap gap-2 border-t border-border pt-4">
          <PermissionGate permission={Permissions.REVIEW_UPDATE}>
            <Button variant="default" size="sm" leftSection={<Pencil className="h-4 w-4" aria-hidden/>}
                    onClick={() => onEdit(feedback)}>
              Edit
            </Button>
          </PermissionGate>
          <PermissionGate permission={Permissions.REVIEW_DELETE}>
            <Button variant="subtle" color="red" size="sm" leftSection={<Trash2 className="h-4 w-4" aria-hidden/>}
                    onClick={() => onDelete(feedback)}>
              Delete
            </Button>
          </PermissionGate>
        </footer>
      )}
    </Card>
  );
}
