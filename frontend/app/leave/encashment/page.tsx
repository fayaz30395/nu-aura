'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Box, Button, NativeSelect, NumberInput} from '@mantine/core';
import {Coins} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {FormPageSkeleton} from '@/components/ui/skeletons';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {PageDeniedFallback, PermissionGate} from '@/components/auth/PermissionGate';
import {useToast} from '@/components/notifications/ToastProvider';
import {useAuth} from '@/lib/hooks/useAuth';
import {leaveService} from '@/lib/services/hrms/leave.service';

const encashSchema = z.object({
  leaveBalanceId: z.string().min(1, 'Leave balance is required'),
  daysToEncash: z.number({invalid_type_error: 'Must be a number'}).min(0.5, 'Minimum 0.5 days').max(365),
});

type EncashFormData = z.infer<typeof encashSchema>;

const BREADCRUMBS = [{label: 'Leave', href: '/leave'}, {label: 'Encashment'}];

export default function LeaveEncashmentPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {isReady: permReady} = usePermissions();
  const {user} = useAuth();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: {errors},
  } = useForm<EncashFormData>({resolver: zodResolver(encashSchema)});

  const balancesQuery = useQuery({
    queryKey: ['leave-balances', user?.employeeId],
    queryFn: () => leaveService.getEmployeeBalances(user!.employeeId!),
    enabled: !!user?.employeeId,
  });

  const encashMutation = useMutation({
    mutationFn: (data: EncashFormData) =>
      leaveService.requestLeaveEncashment({
        leaveBalanceId: data.leaveBalanceId,
        daysToEncash: data.daysToEncash,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Leave encashment requested successfully');
      queryClient.invalidateQueries({queryKey: ['leave-balances']});
      reset();
    },
    meta: {skipGlobalError: true},
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit encashment request'
      );
    },
  });

  const header = (
    <PageHeader
      title="Leave Encashment"
      description="Convert unused leave days to cash compensation."
      breadcrumbs={BREADCRUMBS}
    />
  );

  if (!permReady) {
    return (
      <AppLayout activeMenuItem="leave">
        <FormPageSkeleton fields={2}/>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leave">
      <PermissionGate permission={Permissions.LEAVE_VIEW_SELF} fallback={<PageDeniedFallback/>}>
        <Box maw={720} className="flex flex-col gap-6">
          {header}

          {!user?.employeeId ? (
            <Callout tone="warning" title="No employee profile linked">
              Leave encashment is available once your account is linked to an employee record.
            </Callout>
          ) : (
          <QueryState
            query={balancesQuery}
            skeleton={<FormPageSkeleton fields={2} showHeader={false}/>}
            errorTitle="Couldn't load your leave balances"
          >
            {(balances) => (
              <>
                <form
                  onSubmit={handleSubmit((data) => encashMutation.mutate(data))}
                  noValidate
                  className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6"
                >
                  <NativeSelect
                    id="encash-leave-balance"
                    label="Leave balance"
                    withAsterisk
                    error={errors.leaveBalanceId?.message}
                    {...register('leaveBalanceId')}
                    data={[
                      {value: '', label: 'Select leave type'},
                      ...balances
                        .filter((b) => b.available > 0)
                        .map((b) => ({
                          value: String(b.id),
                          label: `${b.leaveTypeName ?? b.leaveTypeId}: ${b.available} days available`,
                        })),
                    ]}
                  />
                  <Controller
                    name="daysToEncash"
                    control={control}
                    render={({field}) => (
                      <NumberInput
                        id="encash-days"
                        label="Days to encash"
                        withAsterisk
                        placeholder="e.g. 5"
                        step={0.5}
                        min={0.5}
                        decimalScale={1}
                        value={field.value ?? ''}
                        onChange={(v) => field.onChange(typeof v === 'number' ? v : Number.NaN)}
                        onBlur={field.onBlur}
                        error={errors.daysToEncash?.message}
                      />
                    )}
                  />
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      type="submit"
                      leftSection={<Coins size={16} aria-hidden="true"/>}
                      loading={encashMutation.isPending}
                      disabled={encashMutation.isPending}
                    >
                      Submit Encashment Request
                    </Button>
                  </div>
                </form>

                {balances.length > 0 && (
                  <section aria-labelledby="encash-balances-title" className="flex flex-col gap-2">
                    <h2 id="encash-balances-title" className="text-base font-semibold text-text-1">Current balances</h2>
                    <ul className="divide-y divide-border-subtle rounded-lg border border-border bg-card">
                      {balances.map((b) => (
                        <li key={b.id} className="flex items-center justify-between px-4 py-2">
                          <span className="text-sm font-medium text-text-1">{b.leaveTypeName ?? b.leaveTypeId}</span>
                          <span className="text-sm tabular-nums text-text-2">{b.available} days</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </QueryState>
          )}
        </Box>
      </PermissionGate>
    </AppLayout>
  );
}
