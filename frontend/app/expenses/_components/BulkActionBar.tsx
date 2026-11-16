'use client';

import {Button} from '@mantine/core';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

export interface BulkActionBarProps {
  count: number;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export function BulkActionBar({count, processing, onApprove, onReject, onCancel}: BulkActionBarProps) {
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-2"
    >
      <span className="text-sm font-medium tabular-nums text-text-1">
        {count} claim{count !== 1 ? 's' : ''} selected
      </span>
      <div className="flex flex-wrap gap-2">
        <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
          <Button size="sm" color="green" onClick={onApprove} loading={processing}>
            Approve {count}
          </Button>
          <Button size="sm" variant="light" color="red" onClick={onReject} disabled={processing}>
            Reject {count}
          </Button>
        </PermissionGate>
        <Button size="sm" variant="default" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
