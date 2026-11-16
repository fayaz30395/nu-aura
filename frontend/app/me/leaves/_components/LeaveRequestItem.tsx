'use client';

import {Ban, Calendar, Clock, Edit3, User} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import {formatDate} from '@/lib/utils/format/date';
import type {LeaveRequest} from '@/lib/types/hrms/leave';

interface LeaveRequestItemProps {
  request: LeaveRequest;
  leaveTypeName: string;
  onEdit: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
}

export function LeaveRequestItem({request, leaveTypeName, onEdit, onCancel}: LeaveRequestItemProps) {
  return (
    <div role="listitem" className="rounded-lg border border-border p-4 transition-colors hover:bg-card-hover">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-4">
            <h3 className="text-base font-semibold text-text-1">{leaveTypeName}</h3>
            <StatusBadge status={request.status} domain={LEAVE_STATUS}/>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-2 tabular-nums">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-text-3" aria-hidden="true"/>
              {formatDate(request.startDate)} - {formatDate(request.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-text-3" aria-hidden="true"/>
              {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
              {request.isHalfDay && ' (Half Day)'}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-2">
            <span className="font-medium">Reason:</span> {request.reason}
          </p>
          {request.status === 'PENDING' && request.pendingApproverName && (
            <p className="mt-4 flex items-center gap-2 text-sm text-text-2">
              <User className="h-4 w-4 text-accent" aria-hidden="true"/>
              <span>
                Pending approval from:{' '}
                <span className="font-medium text-accent">{request.pendingApproverName}</span>
              </span>
            </p>
          )}
          {(request.status === 'APPROVED' || request.status === 'REJECTED') && request.approverName && (
            <p className="mt-4 flex items-center gap-2 text-sm text-text-2">
              <User className="h-4 w-4 text-text-3" aria-hidden="true"/>
              <span>
                {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} by:{' '}
                <span className="font-medium text-text-1">{request.approverName}</span>
              </span>
            </p>
          )}
          {request.rejectionReason && (
            <p className="mt-2 text-sm text-status-err-fg">
              <span className="font-medium">Rejection Reason:</span> {request.rejectionReason}
            </p>
          )}
          {request.cancellationReason && (
            <p className="mt-2 text-sm text-text-2">
              <span className="font-medium">Cancellation Reason:</span> {request.cancellationReason}
            </p>
          )}
        </div>
        {request.status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              size="sm"
              leftIcon={<Edit3 className="h-3 w-3" aria-hidden="true"/>}
              onClick={() => onEdit(request)}
            >
              Edit
            </Button>
            <Button
              variant="soft-danger"
              size="sm"
              leftIcon={<Ban className="h-3 w-3" aria-hidden="true"/>}
              onClick={() => onCancel(request)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end border-t border-border pt-4 text-right text-xs text-text-3 tabular-nums">
        <div>
          <p>Applied on {formatDate(request.appliedOn)}</p>
          {request.approvedOn && (
            <p className="mt-1">
              {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} on {formatDate(request.approvedOn)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
