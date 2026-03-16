'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Users, Percent } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface ConflictResult {
  employeeId: string;
  projectIdA: string;
  projectIdB?: string;
  overlapStart: string;
  overlapEnd?: string;
  totalAllocationPct: number;
  message: string;
}

interface ConflictLog {
  id: string;
  employee_id: string;
  project_id_a: string;
  project_id_b: string;
  overlap_start_date: string;
  overlap_end_date?: string;
  total_allocation_pct: number;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  detected_at: string;
}

export default function ResourceConflictsPage() {
  const queryClient = useQueryClient();
  const [scanResults, setScanResults] = useState<ConflictResult[] | null>(null);

  const { data: openConflicts, isLoading } = useQuery<ConflictLog[]>({
    queryKey: ['resource-conflicts', 'open'],
    queryFn: () => apiClient.get<ConflictLog[]>('/resource-management/conflicts/open').then(r => r.data),
  });

  const scanMutation = useMutation({
    mutationFn: () => apiClient.post<ConflictResult[]>('/resource-management/conflicts/scan').then(r => r.data),
    onSuccess: (data: ConflictResult[]) => {
      setScanResults(data);
      queryClient.invalidateQueries({ queryKey: ['resource-conflicts'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/resource-management/conflicts/${id}/resolve`, { resolvedBy: 'current' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource-conflicts'] }),
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Resource Conflicts</h1>
            <p className="text-[var(--text-muted)] mt-1">Detect and resolve over-allocated employees across projects</p>
          </div>
          <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
            <RefreshCw className={`w-4 h-4 mr-2 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
            {scanMutation.isPending ? 'Scanning...' : 'Run Conflict Scan'}
          </Button>
        </div>

        {/* Scan results */}
        {scanResults !== null && (
          <Card className={scanResults.length === 0 ? 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-950' : 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-950'}>
            <CardContent className="pt-4">
              <div className="flex gap-3">
                {scanResults.length === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-success-700 dark:text-success-300 font-medium">
                      No allocation conflicts found. All resources are within 100% capacity.
                    </p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-warning-700 dark:text-warning-300">
                      <strong>{scanResults.length} conflict(s) detected</strong> and logged below.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Open conflicts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning-500" />
              Open Conflicts ({openConflicts?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
            ) : (openConflicts?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-success-400" />
                <p>No open conflicts. All allocations are within bounds.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                    <th className="px-4 py-3 text-left font-medium">Employee</th>
                    <th className="px-4 py-3 text-left font-medium">Project A</th>
                    <th className="px-4 py-3 text-left font-medium">Project B</th>
                    <th className="px-4 py-3 text-left font-medium">Overlap</th>
                    <th className="px-4 py-3 text-left font-medium">Total %</th>
                    <th className="px-4 py-3 text-left font-medium">Detected</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openConflicts?.map((c: ConflictLog) => (
                    <tr key={c.id} className="border-b hover:bg-[var(--bg-surface)]">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span className="font-mono text-xs">{c.employee_id.slice(0, 8)}…</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{c.project_id_a.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.project_id_b?.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-xs">
                        {c.overlap_start_date}
                        {c.overlap_end_date && ` → ${c.overlap_end_date}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-danger-600 dark:text-danger-400 font-bold">
                          <Percent className="w-3.5 h-3.5" />
                          {c.total_allocation_pct}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {new Date(c.detected_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" className="text-success-700 border-success-200 dark:text-success-400 dark:border-success-700 text-xs"
                          onClick={() => resolveMutation.mutate(c.id)}>
                          Resolve
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
