'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/lib/hooks/useAuth';
import { useActiveLeaveTypes, useEmployeeBalancesForYear, useCreateLeaveRequest } from '@/lib/hooks/queries/useLeaves';
import { HalfDayPeriod } from '@/lib/types/leave';
import { useToast } from '@/components/notifications/ToastProvider';

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(['MORNING', 'AFTERNOON']).optional(),
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must not exceed 1000 characters'),
  documentPath: z.string().optional(),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

export default function ApplyLeavePage() {
  const toast = useToast();
  const router = useRouter();
  const { user, hasHydrated } = useAuth();
  const year = new Date().getFullYear();

  const { data: leaveTypes = [] } = useActiveLeaveTypes();
  const { data: balances = [] } = useEmployeeBalancesForYear(user?.employeeId || '', year, Boolean(hasHydrated && user?.employeeId));
  const createLeaveRequest = useCreateLeaveRequest();

  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting }, reset } = useForm<LeaveFormData>({
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

  const dataLoading = !hasHydrated;
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
        toast.error('No employee profile linked to your account');
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
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const balance = getAvailableBalance();
  const totalDays = calculateDays();

  return (
    <AppLayout activeMenuItem="leave">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Apply for Leave</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Leave Type *
              </label>
              <select
                {...register('leaveTypeId')}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.leaveName} {type.isPaid ? '(Paid)' : '(Unpaid)'}
                  </option>
                ))}
              </select>
              {errors.leaveTypeId && <p className="text-red-500 text-sm mt-1">{errors.leaveTypeId.message}</p>}
              {balance && (
                <div className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                  Available Balance: <span className="font-semibold">{balance.available} days</span>
                </div>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
              />
              {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                End Date *
              </label>
              <input
                type="date"
                {...register('endDate')}
                min={startDate}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
              />
              {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>}
            </div>

            {/* Half Day */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isHalfDay')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Half Day Leave</span>
              </label>
            </div>

            {/* Half Day Period */}
            {isHalfDay && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Half Day Period *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="MORNING"
                      {...register('halfDayPeriod')}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">First Half (Morning)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="AFTERNOON"
                      {...register('halfDayPeriod')}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Second Half (Afternoon)</span>
                  </label>
                </div>
                {errors.halfDayPeriod && <p className="text-red-500 text-sm mt-1">{errors.halfDayPeriod.message}</p>}
              </div>
            )}

            {/* Total Days */}
            <div className="md:col-span-2 bg-primary-50 dark:bg-primary-950/30 p-4 rounded-lg">
              <div className="text-sm text-surface-700 dark:text-surface-300">Total Days Requested:</div>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{totalDays} days</div>
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Reason *
              </label>
              <textarea
                {...register('reason')}
                rows={4}
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-gray-900 dark:text-white"
                placeholder="Please provide a reason for your leave..."
              />
              {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={createLeaveRequest.isPending || isSubmitting || !leaveTypeId}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-semibold"
            >
              {createLeaveRequest.isPending || isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </AppLayout>
  );
}
