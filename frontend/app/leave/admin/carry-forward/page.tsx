'use client';

import {useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {Box, Button, NativeSelect} from '@mantine/core';
import {ArrowRight} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {PageHeader} from '@/components/ui/PageHeader';
import {FormPageSkeleton} from '@/components/ui/skeletons';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {PageDeniedFallback, PermissionGate} from '@/components/auth/PermissionGate';
import {useToast} from '@/components/notifications/ToastProvider';
import {leaveService} from '@/lib/services/hrms/leave.service';

const BREADCRUMBS = [
  {label: 'Leave Management', href: '/leave'},
  {label: 'Admin'},
  {label: 'Carry Forward'},
];

export default function LeaveCarryForwardPage() {
  const toast = useToast();
  const {isReady: permReady} = usePermissions();
  const currentYear = new Date().getFullYear();
  const [fromYear, setFromYear] = useState(currentYear - 1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ fromYear: number; toYear: number; balancesCarried: number } | null>(null);

  const carryForwardMutation = useMutation({
    mutationFn: () => leaveService.carryForwardBalances(fromYear),
    onSuccess: (data) => {
      setResult({fromYear: data.fromYear, toYear: data.toYear, balancesCarried: data.balancesCarried});
      toast.success(`Carry-forward complete: ${data.balancesCarried} balances moved from ${data.fromYear} to ${data.toYear}`);
    },
    meta: {skipGlobalError: true},
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Carry-forward failed'
      );
    },
  });

  if (!permReady) {
    return (
      <AppLayout activeMenuItem="leave-carry-forward">
        <FormPageSkeleton fields={2}/>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leave-carry-forward">
      <PermissionGate
        permission={Permissions.LEAVE_VIEW_ALL}
        fallback={<PageDeniedFallback message="You do not have permission to perform leave carry-forward."/>}
      >
        <Box maw={720} className="flex flex-col gap-6">
          <PageHeader
            title="Leave Carry-Forward"
            description="Move unused leave balances from one year to the next."
            breadcrumbs={BREADCRUMBS}
          />

          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6">
            <NativeSelect
              id="carry-forward-from-year"
              label="Carry forward from year"
              value={String(fromYear)}
              onChange={(e) => setFromYear(Number(e.currentTarget.value))}
              data={[currentYear - 2, currentYear - 1, currentYear].map((y) => String(y))}
              className="sm:max-w-48"
            />

            <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-aura-sunken p-2">
              <span className="text-sm font-semibold tabular-nums text-text-1">{fromYear}</span>
              <ArrowRight className="h-4 w-4 text-text-3" aria-hidden="true"/>
              <span className="text-sm font-semibold tabular-nums text-text-1">{fromYear + 1}</span>
              <span className="ml-auto text-xs text-text-3">Eligible balances will be transferred</span>
            </div>

            <Callout tone="warning" title="Applies to all employees">
              Unused leave balances are carried forward according to each leave type&apos;s carry-forward rules.
              Only leave types with carry-forward enabled are affected.
            </Callout>

            <div className="flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                loading={carryForwardMutation.isPending}
                disabled={carryForwardMutation.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {`Carry Forward ${fromYear} → ${fromYear + 1}`}
              </Button>
            </div>
          </div>

          {result && (
            <Callout tone="success" title="Carry-forward complete">
              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-text-2">From year</dt>
                <dd className="text-right font-medium tabular-nums">{result.fromYear}</dd>
                <dt className="text-text-2">To year</dt>
                <dd className="text-right font-medium tabular-nums">{result.toYear}</dd>
                <dt className="text-text-2">Balances carried</dt>
                <dd className="text-right font-medium tabular-nums">{result.balancesCarried}</dd>
              </dl>
            </Callout>
          )}
        </Box>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            carryForwardMutation.mutate();
          }}
          title={`Carry forward ${fromYear} balances?`}
          message={`Unused balances from ${fromYear} will move to ${fromYear + 1} for every employee. This cannot be undone from this page.`}
          confirmText="Carry forward"
          cancelText="Cancel"
          type="warning"
          loading={carryForwardMutation.isPending}
        />
      </PermissionGate>
    </AppLayout>
  );
}
