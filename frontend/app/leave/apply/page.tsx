'use client';

import {useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Box, Checkbox, Group, NativeSelect, Radio, Textarea} from '@mantine/core';
import {DateInput} from '@mantine/dates';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {PageHeader} from '@/components/ui/PageHeader';
import {useAuth} from '@/lib/hooks/useAuth';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useActiveLeaveTypes, useCreateLeaveRequest, useEmployeeBalancesForYear} from '@/lib/hooks/queries/useLeaves';
import {HalfDayPeriod} from '@/lib/types/hrms/leave';
import {useToast} from '@/components/notifications/ToastProvider';
import {useUnsavedChanges} from '@/lib/hooks/useUnsavedChanges';
import {LeaveBalanceSummary} from './_components/LeaveBalanceSummary';

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(['FIRST_HALF', 'SECOND_HALF']).optional(),
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must not exceed 1000 characters'),
  documentPath: z.string().optional(),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

const BREADCRUMBS = [{label: 'Leave', href: '/leave'}, {label: 'Apply'}];

export default function ApplyLeavePage() {
  const toast = useToast();
  const router = useRouter();
  const {user, hasHydrated} = useAuth();
  const year = new Date().getFullYear();

  const {data: leaveTypes = []} = useActiveLeaveTypes();
  const {data: balances = []} = useEmployeeBalancesForYear(user?.employeeId || '', year, Boolean(hasHydrated && user?.employeeId));
  const createLeaveRequest = useCreateLeaveRequest();

  const {register, control, handleSubmit, watch, formState: {errors, isSubmitting, isDirty}, reset} = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      isHalfDay: false,
      halfDayPeriod: undefined,
      reason: '',
      documentPath: '',
    },
  });

  useUnsavedChanges(isDirty);

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const isHalfDay = watch('isHalfDay');
  const leaveTypeId = watch('leaveTypeId');

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : diffDays;
  };

  const onSubmit = async (data: LeaveFormData) => {
    try {
      if (!user?.employeeId) {
        toast.warning('No employee profile linked to your account');
        return;
      }

      const totalDays = calculateDays();

      await createLeaveRequest.mutateAsync({
        employeeId: user.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays,
        isHalfDay: data.isHalfDay,
        halfDayPeriod: data.isHalfDay ? (data.halfDayPeriod as HalfDayPeriod) : undefined,
        reason: data.reason,
        documentPath: data.documentPath || undefined,
      });

      toast.success('Leave request submitted successfully!');
      reset();
      router.push('/leave');
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  const balance = leaveTypeId ? balances.find(b => b.leaveTypeId === leaveTypeId) : undefined;
  const totalDays = calculateDays();
  const pending = createLeaveRequest.isPending || isSubmitting;
  const insufficientBalance = Boolean(balance) && totalDays > (balance?.available ?? 0);

  return (
    <AppLayout activeMenuItem="leave">
      <Box maw={720} className="flex flex-col gap-6">
        <PageHeader
          title="Apply for Leave"
          description="Submit a leave request for your manager's approval."
          breadcrumbs={BREADCRUMBS}
        />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <NativeSelect
              id="leave-type"
              label="Leave type"
              withAsterisk
              error={errors.leaveTypeId?.message}
              {...register('leaveTypeId')}
              data={[
                {value: '', label: 'Select leave type'},
                ...leaveTypes.map((type) => ({
                  value: type.id,
                  label: `${type.leaveName} ${type.isPaid ? '(Paid)' : '(Unpaid)'}`,
                })),
              ]}
            />
            {balance && <LeaveBalanceSummary balance={balance} requestedDays={totalDays}/>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller
              name="startDate"
              control={control}
              render={({field}) => (
                <DateInput
                  id="leave-start-date"
                  label="Start date"
                  withAsterisk
                  value={field.value || null}
                  onChange={(d) => field.onChange(d ?? '')}
                  onBlur={field.onBlur}
                  valueFormat="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  clearable
                  error={errors.startDate?.message}
                />
              )}
            />
            <Controller
              name="endDate"
              control={control}
              render={({field}) => (
                <DateInput
                  id="leave-end-date"
                  label="End date"
                  withAsterisk
                  value={field.value || null}
                  onChange={(d) => field.onChange(d ?? '')}
                  onBlur={field.onBlur}
                  minDate={startDate || undefined}
                  valueFormat="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  clearable
                  error={errors.endDate?.message}
                />
              )}
            />
          </div>

          <Checkbox label="Half day leave" {...register('isHalfDay')}/>

          {isHalfDay && (
            <Controller
              name="halfDayPeriod"
              control={control}
              render={({field}) => (
                <Radio.Group
                  label="Half day period"
                  withAsterisk
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v as LeaveFormData['halfDayPeriod'])}
                  error={errors.halfDayPeriod?.message}
                >
                  <Group gap="md" mt="xs">
                    <Radio value="FIRST_HALF" label="First half (morning)"/>
                    <Radio value="SECOND_HALF" label="Second half (afternoon)"/>
                  </Group>
                </Radio.Group>
              )}
            />
          )}

          <div className="flex items-center justify-between rounded-md border border-border bg-surface-aura-sunken px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-3">Total days requested</span>
            <span className="font-mono text-base font-semibold tabular-nums text-text-1">{totalDays} days</span>
          </div>

          <Textarea
            id="leave-reason"
            label="Reason"
            withAsterisk
            autosize
            minRows={4}
            placeholder="Please provide a reason for your leave..."
            error={errors.reason?.message}
            {...register('reason')}
          />

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {insufficientBalance && (
              <p className="mr-auto text-xs font-medium text-status-err-fg">
                Insufficient balance for {totalDays} days
              </p>
            )}
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <PermissionGate permission={Permissions.LEAVE_REQUEST}>
              <Button type="submit" variant="primary" isLoading={pending} disabled={pending || !leaveTypeId || insufficientBalance}>
                Submit Leave Request
              </Button>
            </PermissionGate>
          </div>
        </form>
      </Box>
    </AppLayout>
  );
}
