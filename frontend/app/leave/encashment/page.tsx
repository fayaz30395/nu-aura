'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useToast } from '@/components/notifications/ToastProvider';
import { useAuth } from '@/lib/hooks/useAuth';
import { leaveService } from '@/lib/services/hrms/leave.service';
import { Coins } from 'lucide-react';

const encashSchema = z.object({
  leaveBalanceId: z.string().min(1, 'Leave balance is required'),
  daysToEncash: z.number({ invalid_type_error: 'Must be a number' }).min(0.5, 'Minimum 0.5 days').max(365),
});

type EncashFormData = z.infer<typeof encashSchema>;

export default function LeaveEncashmentPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasPermission: _hasPermission, isReady: permReady } = usePermissions();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EncashFormData>({ resolver: zodResolver(encashSchema) });

  const { data: balances = [], isLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      reset();
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to submit encashment request'
      );
    },
  });

  if (!permReady) {
    return (
      <AppLayout activeMenuItem="leave">
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="skeuo-card p-4 animate-pulse">
              <div className="h-4 bg-[var(--skeleton-base)] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[var(--skeleton-base)] rounded w-2/3" />
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leave">
      <PermissionGate
        permission={Permissions.LEAVE_VIEW_SELF}
        fallback={
          <div className="p-6">
            <p className="text-danger-600">You do not have permission to view this page.</p>
          </div>
        }
      >
        <div className="p-6 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 flex items-center gap-2 mb-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2 mb-8">
            <Coins className="h-7 w-7 text-accent-600" />
            <div>
              <h1 className="text-xl font-bold skeuo-emboss">Leave Encashment</h1>
              <p className="text-[var(--text-secondary)] text-sm mt-1 skeuo-deboss">
                Convert unused leave days to cash compensation
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="skeuo-card p-6 animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-[var(--skeleton-base)] rounded" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit((data) => encashMutation.mutate(data))} className="skeuo-card p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Leave Balance
                </label>
                <select {...register('leaveBalanceId')} className="input-aura">
                  <option value="">Select leave type</option>
                  {balances
                    .filter((b) => b.available > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.leaveTypeName ?? b.leaveTypeId} — {b.available} days available
                      </option>
                    ))}
                </select>
                {errors.leaveBalanceId && (
                  <p className="text-danger-500 text-xs mt-1">{errors.leaveBalanceId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Days to Encash
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  {...register('daysToEncash', { valueAsNumber: true })}
                  className="input-aura"
                  placeholder="e.g. 5"
                />
                {errors.daysToEncash && (
                  <p className="text-danger-500 text-xs mt-1">{errors.daysToEncash.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={encashMutation.isPending}
                className="w-full"
              >
                {encashMutation.isPending ? 'Submitting...' : 'Submit Encashment Request'}
              </Button>
            </form>
          )}

          {balances.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
                Current Balances
              </h2>
              <div className="space-y-2">
                {balances.map((b) => (
                  <div key={b.id} className="skeuo-card p-4 flex items-center justify-between">
                    <span className="text-sm font-medium">{b.leaveTypeName ?? b.leaveTypeId}</span>
                    <span className="text-sm text-[var(--text-secondary)]">{b.available} days</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
