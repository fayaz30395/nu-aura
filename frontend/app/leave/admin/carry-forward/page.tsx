'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useToast } from '@/components/notifications/ToastProvider';
import { leaveService } from '@/lib/services/hrms/leave.service';
import { ArrowRight, CalendarDays } from 'lucide-react';

export default function LeaveCarryForwardPage() {
  const router = useRouter();
  const toast = useToast();
  const { isReady: permReady } = usePermissions();
  const currentYear = new Date().getFullYear();
  const [fromYear, setFromYear] = useState(currentYear - 1);
  const [result, setResult] = useState<{ fromYear: number; toYear: number; balancesCarried: number } | null>(null);

  const carryForwardMutation = useMutation({
    mutationFn: () => leaveService.carryForwardBalances(fromYear),
    onSuccess: (data) => {
      setResult({ fromYear: data.fromYear, toYear: data.toYear, balancesCarried: data.balancesCarried });
      toast.success(`Carry-forward complete: ${data.balancesCarried} balances moved from ${data.fromYear} to ${data.toYear}`);
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Carry-forward failed'
      );
    },
  });

  if (!permReady) {
    return (
      <AppLayout activeMenuItem="leave">
        <div className="p-6 max-w-xl mx-auto space-y-4">
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
        permission={Permissions.LEAVE_VIEW_ALL}
        fallback={
          <div className="p-6">
            <p className="text-danger-600">You do not have permission to perform leave carry-forward.</p>
          </div>
        }
      >
        <div className="p-6 max-w-xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 flex items-center gap-2 mb-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2 mb-8">
            <CalendarDays className="h-7 w-7 text-accent-600" />
            <div>
              <h1 className="text-xl font-bold skeuo-emboss">Leave Carry-Forward</h1>
              <p className="text-[var(--text-secondary)] text-sm mt-1 skeuo-deboss">
                Move unused leave balances from one year to the next
              </p>
            </div>
          </div>

          <div className="skeuo-card p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Carry Forward From Year
              </label>
              <select
                value={fromYear}
                onChange={(e) => setFromYear(Number(e.target.value))}
                className="input-aura"
              >
                {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 p-4 bg-accent-50 dark:bg-accent-950/30 rounded-lg border border-accent-200 dark:border-accent-800">
              <span className="text-sm font-semibold text-accent-700 dark:text-accent-400">{fromYear}</span>
              <ArrowRight className="h-4 w-4 text-accent-500" />
              <span className="text-sm font-semibold text-accent-700 dark:text-accent-400">{fromYear + 1}</span>
              <span className="text-xs text-[var(--text-muted)] ml-auto">Eligible balances will be transferred</span>
            </div>

            <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
              <p className="text-sm text-warning-800 dark:text-warning-400">
                <strong>Note:</strong> This operation will carry forward unused leave balances for all employees according to the leave type carry-forward rules. Only leave types with carry-forward enabled will be affected.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              disabled={carryForwardMutation.isPending}
              onClick={() => carryForwardMutation.mutate()}
              className="w-full"
            >
              {carryForwardMutation.isPending ? 'Processing...' : `Carry Forward ${fromYear} → ${fromYear + 1}`}
            </Button>
          </div>

          {result && (
            <div className="mt-6 skeuo-card p-6 border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20">
              <h2 className="text-sm font-semibold text-success-800 dark:text-success-400 mb-3">
                Carry-Forward Complete
              </h2>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>From Year</span>
                  <span className="font-medium">{result.fromYear}</span>
                </div>
                <div className="flex justify-between">
                  <span>To Year</span>
                  <span className="font-medium">{result.toYear}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balances Carried</span>
                  <span className="font-medium text-success-700 dark:text-success-400">{result.balancesCarried}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
