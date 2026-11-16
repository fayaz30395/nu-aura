'use client';

import type {KeyboardEvent} from 'react';
import {Badge, Button} from '@mantine/core';
import {ArrowRight, ChevronDown} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Permissions} from '@/lib/hooks/usePermissions';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import type {EmploymentChangeRequest} from '@/lib/types/hrms/employment-change-request';
import {formatDate, formatDateTime} from '@/lib/utils/format/date';
import {cn} from '@/lib/utils';

// Change requests share the Pending/Approved/Rejected/Cancelled vocabulary with leave.
const CHANGE_REQUEST_STATUS = LEAVE_STATUS;

function formatEnumValue(value?: string) {
  if (!value) return 'N/A';
  return value.replace(/_/g, ' ');
}

function ChangeRow({label, currentValue, newValue}: {label: string; currentValue?: string; newValue?: string}) {
  if (!newValue && !currentValue) return null;
  if (newValue === currentValue) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0">
      <span className="w-40 text-xs font-medium text-text-2">{label}</span>
      <span className="text-sm text-text-2">{currentValue || 'N/A'}</span>
      <ArrowRight className="h-4 w-4 text-text-3" aria-hidden/>
      <span className="text-sm font-medium text-accent-700 dark:text-accent-400">{newValue || 'N/A'}</span>
    </div>
  );
}

function DetailItem({label, children, tone}: {label: string; children: React.ReactNode; tone?: 'danger'}) {
  return (
    <div>
      <dt className={cn('text-xs font-medium', tone === 'danger' ? 'text-danger-600 dark:text-danger-400' : 'text-text-2')}>
        {label}
      </dt>
      <dd className={cn('mt-1 text-sm', tone === 'danger' ? 'text-danger-700 dark:text-danger-300' : 'text-text-1')}>
        {children}
      </dd>
    </div>
  );
}

interface ChangeRequestCardProps {
  request: EmploymentChangeRequest;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionsDisabled: boolean;
  approvePending: boolean;
}

export function ChangeRequestCard({
  request,
  expanded,
  onToggle,
  onApprove,
  onReject,
  actionsDisabled,
  approvePending,
}: ChangeRequestCardProps) {
  const detailsId = `change-request-${request.id}`;
  const onHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    // `skeuo-card overflow-hidden` and the `cursor-pointer` header are selectors used by approvals e2e specs.
    <div className="skeuo-card overflow-hidden rounded-lg border border-border bg-card">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
        onKeyDown={onHeaderKeyDown}
        className="cursor-pointer p-4 transition-colors hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring-primary)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-400"
              aria-hidden
            >
              {request.employeeName?.charAt(0) || 'E'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-1">{request.employeeName || 'Unknown Employee'}</p>
              <p className="truncate text-xs text-text-2">
                {request.employeeCode} • Requested by {request.requesterName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="light" color="gray" radius="sm" tt="none">
              {request.changeType.replace(/_/g, ' ')}
            </Badge>
            <StatusBadge status={request.status} domain={CHANGE_REQUEST_STATUS}/>
            <ChevronDown
              className={cn('h-4 w-4 text-text-3 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div id={detailsId} className="border-t border-border p-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <h4 className="mb-4 text-sm font-semibold text-text-1">Proposed Changes</h4>
              <div className="rounded-lg bg-surface-aura-sunken p-4">
                <ChangeRow label="Designation" currentValue={request.currentDesignation} newValue={request.newDesignation}/>
                <ChangeRow label="Level" currentValue={formatEnumValue(request.currentLevel)} newValue={formatEnumValue(request.newLevel)}/>
                <ChangeRow label="Job Role" currentValue={formatEnumValue(request.currentJobRole)} newValue={formatEnumValue(request.newJobRole)}/>
                <ChangeRow label="Department" currentValue={request.currentDepartmentName} newValue={request.newDepartmentName}/>
                <ChangeRow label="Manager" currentValue={request.currentManagerName} newValue={request.newManagerName}/>
                <ChangeRow
                  label="Employment Type"
                  currentValue={formatEnumValue(request.currentEmploymentType)}
                  newValue={formatEnumValue(request.newEmploymentType)}
                />
                <ChangeRow
                  label="Status"
                  currentValue={formatEnumValue(request.currentEmployeeStatus)}
                  newValue={formatEnumValue(request.newEmployeeStatus)}
                />
                <ChangeRow
                  label="Confirmation Date"
                  currentValue={request.currentConfirmationDate}
                  newValue={request.newConfirmationDate}
                />
              </div>
            </section>

            <section>
              <h4 className="mb-4 text-sm font-semibold text-text-1">Request Details</h4>
              <dl className="flex flex-col gap-4">
                {request.reason && <DetailItem label="Reason">{request.reason}</DetailItem>}
                {request.effectiveDate && <DetailItem label="Effective Date">{formatDate(request.effectiveDate)}</DetailItem>}
                <DetailItem label="Requested On">{formatDateTime(request.createdAt)}</DetailItem>
                {request.rejectionReason && (
                  <DetailItem label="Rejection Reason" tone="danger">{request.rejectionReason}</DetailItem>
                )}
                {request.approverName && (
                  <DetailItem label={`${request.status === 'APPROVED' ? 'Approved' : 'Processed'} By`}>
                    {request.approverName}
                  </DetailItem>
                )}
              </dl>
            </section>
          </div>

          {request.status === 'PENDING' && (
            <PermissionGate permission={Permissions.EMPLOYMENT_CHANGE_APPROVE}>
              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button variant="default" color="red" onClick={onReject} disabled={actionsDisabled}>
                  Reject
                </Button>
                <Button color="green" onClick={onApprove} disabled={actionsDisabled}>
                  {approvePending ? 'Processing...' : 'Approve Changes'}
                </Button>
              </div>
            </PermissionGate>
          )}
        </div>
      )}
    </div>
  );
}
