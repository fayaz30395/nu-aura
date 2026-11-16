'use client';

import {Button} from '@mantine/core';
import {Pencil, Users} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Badge} from '@/components/ui/Badge';
import {type Column, ResponsiveTable} from '@/components/ui/ResponsiveTable';
import {Permissions} from '@/lib/hooks/usePermissions';
import {formatDate} from '@/lib/utils/format/date';
import type {Feedback360Request} from '@/lib/services/grow/feedback360.service';
import {getRequestStatusIcon} from './feedbackStatus';

const COLUMNS: Column<Feedback360Request>[] = [
  {
    key: 'subject',
    header: 'Subject',
    mobilePriority: 'primary',
    accessor: (request) => (
      <span className="text-sm font-medium text-text-1">Employee #{request.subjectEmployeeId.slice(0, 8)}</span>
    ),
  },
  {
    key: 'reviewerType',
    header: 'Review Type',
    accessor: (request) => (
      <Badge variant="info" icon={<Users className="h-3.5 w-3.5" aria-hidden/>}>
        {request.reviewerType}
      </Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: (request) => (
      <span className="flex items-center gap-2 text-sm text-text-2">
        {getRequestStatusIcon(request.status)}
        {request.status}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    mobilePriority: 'secondary',
    accessor: (request) => <span className="text-sm text-text-2">{formatDate(request.createdAt)}</span>,
  },
];

interface PendingReviewsTableProps {
  requests: Feedback360Request[];
  onProvideFeedback: (request: Feedback360Request) => void;
}

export function PendingReviewsTable({requests, onProvideFeedback}: PendingReviewsTableProps) {
  return (
    <ResponsiveTable
      columns={COLUMNS}
      data={requests}
      keyExtractor={(request) => request.id}
      stickyHeader
      renderRowActions={(request) => (
        <PermissionGate permission={Permissions.FEEDBACK_360_SUBMIT}>
          <Button size="sm" leftSection={<Pencil className="h-4 w-4" aria-hidden/>} onClick={() => onProvideFeedback(request)}>
            Provide Feedback
          </Button>
        </PermissionGate>
      )}
    />
  );
}
