'use client';

import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {DateInput} from '@mantine/dates';
import {AppLayout} from '@/components/layout';
import {useAuth} from '@/lib/hooks/useAuth';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useActiveLeaveTypes, useCreateLeaveRequest, useEmployeeBalancesForYear} from '@/lib/hooks/queries/useLeaves';
import {HalfDayPeriod} from '@/lib/types/hrms/leave';
import {useToast} from '@/components/notifications/ToastProvider';
import {useUnsavedChanges} from '@/lib/hooks/useUnsavedChanges';

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

  const getAvailableBalance = () => {
    if (!leaveTypeId) return null;
    return balances.find(b => b.leaveTypeId === leaveTypeId);
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
    } catch (error: unknown) {
      toast.error((error as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const balance = getAvailableBalance();
  const totalDays = calculateDays();

  return (
    <AppLayout activeMenuItem="leave">
      <motion.div
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-xl font-bold">Apply for Leave</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="skeuo-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave Type */}
            <div className="md:col-span-2">
              <label htmlFor="leave-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Leave Type *
              </label>
              <select
                id="leave-type"
                aria-label="Leave Type"
                {...register('leaveTypeId')}
                className="input-aura"
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.leaveName} {type.isPaid ? '(Paid)' : '(Unpaid)'}
                  </option>
                ))}
              </select>
              {errors.leaveTypeId && <p className="text-danger-500 text-sm mt-1">{errors.leaveTypeId.message}</p>}
              {balance && (() => {
                const total = balance.available + balance.used + balance.pending;
                const circ = 2 * Math.PI * 18;
                const avail = total > 0 ? (balance.available / total) * circ : 0;
                const pend = total > 0 ? (balance.pending / total) * circ : 0;
                const used = total > 0 ? (balance.used / total) * circ : 0;
                return (
                  <div className="mt-3 flex items-center gap-4 p-3 rounded-[var(--r-md)] bg-[var(--surface-sunken)] border border-[var(--border-soft)]">
                    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                      {/* Background */}
                      <circle cx="22" cy="22" r="18" fill="none"
                        stroke="var(--border)" strokeWidth="6"/>
                      {/* Used (red) — starts at top */}
                      {used > 0 && (
                        <circle cx="22" cy="22" r="18" fill="none"
                          stroke="var(--danger-500,#ef4444)" strokeWidth="6"
                          strokeDasharray={`${used} ${circ - used}`}
                          strokeDashoffset={circ * 0.25}
                          strokeLinecap="butt"/>
                      )}
                      {/* Pending (amber) — after used */}
                      {pend > 0 && (
                        <circle cx="22" cy="22" r="18" fill="none"
                          stroke="var(--warning-500,#f59e0b)" strokeWidth="6"
                          strokeDasharray={`${pend} ${circ - pend}`}
                          strokeDashoffset={circ * 0.25 - used}
                          strokeLinecap="butt"/>
                      )}
                      {/* Available (green) — remaining */}
                      {avail > 0 && (
                        <circle cx="22" cy="22" r="18" fill="none"
                          stroke="var(--success-500,#22c55e)" strokeWidth="6"
                          strokeDasharray={`${avail} ${circ - avail}`}
                          strokeDashoffset={circ * 0.25 - used - pend}
                          strokeLinecap="butt"/>
                      )}
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="flex items-center gap-1.5 text-[var(--success-600,#16a34a)] font-semibold">
                          <span className="inline-block w-2 h-2 rounded-full bg-[var(--success-500,#22c55e)]"/>
                          {balance.available}d available
                        </span>
                        {balance.pending > 0 && (
                          <span className="flex items-center gap-1.5 text-[var(--warning-600,#d97706)]">
                            <span className="inline-block w-2 h-2 rounded-full bg-[var(--warning-500,#f59e0b)]"/>
                            {balance.pending}d pending
                          </span>
                        )}
                        {balance.used > 0 && (
                          <span className="flex items-center gap-1.5 text-[var(--text-3)]">
                            <span className="inline-block w-2 h-2 rounded-full bg-[var(--danger-500,#ef4444)]"/>
                            {balance.used}d used
                          </span>
                        )}
                      </div>
                      {totalDays > 0 && (
                        <p className={`text-xs mt-1 font-medium ${totalDays > balance.available ? 'text-[var(--danger-500,#ef4444)]' : 'text-[var(--text-2)]'}`}>
                          {totalDays > balance.available
                            ? `⚠ Requesting ${totalDays}d exceeds ${balance.available}d available`
                            : `${balance.available - totalDays}d remaining after this request`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="leave-start-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Start Date *
              </label>
              <Controller
                name="startDate"
                control={control}
                render={({field}) => (
                  <DateInput
                    id="leave-start-date"
                    value={field.value || null}
                    onChange={(d) => field.onChange(d ?? '')}
                    valueFormat="YYYY-MM-DD"
                    placeholder="YYYY-MM-DD"
                    clearable
                    size="sm"
                  />
                )}
              />
              {errors.startDate && <p className="text-danger-500 text-sm mt-1">{errors.startDate.message}</p>}
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="leave-end-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                End Date *
              </label>
              <Controller
                name="endDate"
                control={control}
                render={({field}) => (
                  <DateInput
                    id="leave-end-date"
                    value={field.value || null}
                    onChange={(d) => field.onChange(d ?? '')}
                    minDate={startDate ? new Date(startDate) : undefined}
                    valueFormat="YYYY-MM-DD"
                    placeholder="YYYY-MM-DD"
                    clearable
                    size="sm"
                  />
                )}
              />
              {errors.endDate && <p className="text-danger-500 text-sm mt-1">{errors.endDate.message}</p>}
            </div>

            {/* Half Day */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isHalfDay')}
                  className="w-4 h-4 text-accent-700"
                />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Half Day Leave</span>
              </label>
            </div>

            {/* Half Day Period */}
            {isHalfDay && (
              <div className="md:col-span-2">
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Half Day Period *
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="FIRST_HALF"
                      {...register('halfDayPeriod')}
                      className="w-4 h-4 text-accent-700"
                    />
                    <span className="text-body-secondary">First Half (Morning)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="SECOND_HALF"
                      {...register('halfDayPeriod')}
                      className="w-4 h-4 text-accent-700"
                    />
                    <span className="text-body-secondary">Second Half (Afternoon)</span>
                  </label>
                </div>
                {errors.halfDayPeriod && <p className="text-danger-500 text-sm mt-1">{errors.halfDayPeriod.message}</p>}
              </div>
            )}

            {/* Total Days */}
            <div className="md:col-span-2 bg-accent-50 dark:bg-accent-950/30 p-4 rounded-lg">
              <div className="text-body-secondary">Total Days Requested:</div>
              <div className="text-xl font-bold text-accent-700 dark:text-accent-400">{totalDays} days</div>
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label htmlFor="leave-reason" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Reason *
              </label>
              <textarea
                id="leave-reason"
                {...register('reason')}
                rows={4}
                className="input-aura"
                placeholder="Please provide a reason for your leave..."
              />
              {errors.reason && <p className="text-danger-500 text-sm mt-1">{errors.reason.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <PermissionGate permission={Permissions.LEAVE_REQUEST}>
              <button
                type="submit"
                disabled={createLeaveRequest.isPending || isSubmitting || !leaveTypeId}
                className="btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {createLeaveRequest.isPending || isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </PermissionGate>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </AppLayout>
  );
}
