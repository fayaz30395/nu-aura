'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fnfService, FnFAdjustmentPayload } from '@/lib/services/hrms/fnf.service';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const fnfKeys = {
  all: ['fnf'] as const,
  list: (page: number, size: number) => [...fnfKeys.all, 'list', { page, size }] as const,
  detail: (exitProcessId: string) => [...fnfKeys.all, 'detail', exitProcessId] as const,
};

// ─── Query Hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch paginated F&F settlements list (HR admin view).
 */
export function useFnFList(page = 0, size = 20) {
  return useQuery({
    queryKey: fnfKeys.list(page, size),
    queryFn: () => fnfService.getAll(page, size),
  });
}

/**
 * Fetch or auto-calculate F&F for a specific exit process.
 */
export function useFnFDetail(exitProcessId: string, enabled = true) {
  return useQuery({
    queryKey: fnfKeys.detail(exitProcessId),
    queryFn: () => fnfService.getOrCalculate(exitProcessId),
    enabled: enabled && !!exitProcessId,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

/**
 * Apply HR adjustments to an F&F calculation.
 */
export function useFnFAdjust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exitProcessId, data }: { exitProcessId: string; data: FnFAdjustmentPayload }) =>
      fnfService.adjust(exitProcessId, data),
    onSuccess: (_, { exitProcessId }) => {
      qc.invalidateQueries({ queryKey: fnfKeys.detail(exitProcessId) });
      qc.invalidateQueries({ queryKey: fnfKeys.all });
    },
  });
}

/**
 * Approve a F&F settlement by exit process ID.
 */
export function useFnFApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exitProcessId: string) => fnfService.approve(exitProcessId),
    onSuccess: (_, exitProcessId) => {
      qc.invalidateQueries({ queryKey: fnfKeys.detail(exitProcessId) });
      qc.invalidateQueries({ queryKey: fnfKeys.all });
    },
  });
}
