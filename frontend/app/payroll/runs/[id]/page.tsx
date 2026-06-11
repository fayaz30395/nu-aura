'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, CheckCircle, Download, FileText, Lock, Play} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui';
import {Skeleton} from '@/components/ui/Skeleton';
import {
  useApprovePayrollRun,
  useDownloadPayslipPdf,
  useLockPayrollRun,
  usePayrollRun,
  useProcessPayrollRun,
  useRunPayslipDetails,
} from '@/lib/hooks/queries/usePayroll';
import {useEmployees} from '@/lib/hooks/queries/useEmployees';
import type {PayrollRunStatus, RunPayslip} from '@/lib/types/hrms/payroll';
import {formatCurrency, formatDate} from '@/lib/utils';
import {getStatusColor} from '../../_components/types';

const PAYSLIP_STATE_BY_RUN_STATUS: Record<PayrollRunStatus, string> = {
  DRAFT: 'Pending',
  PROCESSING: 'Processing',
  PROCESSED: 'Generated',
  APPROVED: 'Approved',
  LOCKED: 'Locked',
};

function apiErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

function sum(payslips: RunPayslip[], pick: (p: RunPayslip) => number): number {
  return payslips.reduce((acc, p) => acc + (Number.isFinite(pick(p)) ? pick(p) : 0), 0);
}

export default function PayrollRunDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const runId = params?.id ?? '';
  const {hasPermission, isReady: permReady} = usePermissions();

  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.PAYROLL_VIEW)) {
      router.replace('/me/dashboard');
    }
  }, [permReady, hasPermission, router]);

  const [error, setError] = useState<string | null>(null);

  const runQuery = usePayrollRun(runId);
  const payslipsQuery = useRunPayslipDetails(runId);
  // Resolve employee names for payslip rows (payslips carry employeeId only)
  const employeesQuery = useEmployees(0, 200);

  const processMutation = useProcessPayrollRun();
  const approveMutation = useApprovePayrollRun();
  const lockMutation = useLockPayrollRun();
  const downloadPdfMutation = useDownloadPayslipPdf();

  if (!permReady || !hasPermission(Permissions.PAYROLL_VIEW)) {
    return null;
  }

  const run = runQuery.data;
  const payslips = payslipsQuery.data?.content ?? [];
  const employeeNames = new Map<string, string>(
    (employeesQuery.data?.content ?? []).map((e): [string, string] => [e.id, e.fullName])
  );

  const actionPending =
    processMutation.isPending || approveMutation.isPending || lockMutation.isPending;

  const runAction = (
    mutate: (id: string, opts: { onError: (err: unknown) => void }) => void,
    failureMessage: string
  ) => {
    setError(null);
    mutate(runId, {
      onError: (err: unknown) => setError(apiErrorMessage(err, failureMessage)),
    });
  };

  const handleDownloadPdf = (payslip: RunPayslip) => {
    setError(null);
    downloadPdfMutation.mutate(payslip.id, {
      onSuccess: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `payslip_${payslip.payPeriodYear}_${payslip.payPeriodMonth}_${payslip.employeeId}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      onError: (err: unknown) => setError(apiErrorMessage(err, 'Failed to download payslip PDF')),
    });
  };

  const totalGross = sum(payslips, (p) => p.grossSalary);
  const totalDeductions = sum(payslips, (p) => p.totalDeductions);
  const totalNet = sum(payslips, (p) => p.netSalary);
  const payslipState = run ? PAYSLIP_STATE_BY_RUN_STATUS[run.status] : '';

  return (
    <AppLayout activeMenuItem="payroll">
      <PermissionGate
        permission={Permissions.PAYROLL_VIEW}
        fallback={
          <div className="p-6">
            <p className="text-danger-600">You do not have permission to view payroll runs.</p>
          </div>
        }
      >
        <PageTransition className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb / back */}
            <Link
              href="/payroll/runs"
              className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true"/>
              Back to payroll runs
            </Link>

            {error && (
              <div
                className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/40 border border-danger-200 dark:border-danger-800 text-danger-800 dark:text-danger-300 rounded-lg">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-4 text-sm underline hover:no-underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {runQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton height={96} className="rounded-md"/>
                <Skeleton height={320} className="rounded-md"/>
              </div>
            ) : runQuery.isError || !run ? (
              <EmptyState
                icon={<FileText className="h-8 w-8"/>}
                title="Payroll run not found"
                description="The payroll run does not exist or you do not have access to it."
                action={{label: 'Back to runs', onClick: () => router.push('/payroll/runs')}}
                iconColor="cyan"
              />
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-4">
                      <h1 className="text-xl font-bold">{run.runName}</h1>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] mt-2 text-sm">
                      Period{' '}
                      <span className="font-medium tabular-nums">
                        {formatDate(run.payrollPeriodStart)} – {formatDate(run.payrollPeriodEnd)}
                      </span>
                      {' · '}pay date{' '}
                      <span className="font-medium tabular-nums">{formatDate(run.paymentDate)}</span>
                    </p>
                    {run.notes && (
                      <p className="text-[var(--text-secondary)] mt-1 text-sm">{run.notes}</p>
                    )}
                  </div>

                  {/* Lifecycle actions */}
                  <div className="flex gap-2">
                    {run.status === 'DRAFT' && (
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <Button
                          variant="primary"
                          leftIcon={<Play className="h-4 w-4"/>}
                          disabled={actionPending}
                          onClick={() =>
                            runAction(
                              (id, opts) => processMutation.mutate(id, opts),
                              'Failed to process payroll run'
                            )
                          }
                        >
                          Process run
                        </Button>
                      </PermissionGate>
                    )}
                    {run.status === 'PROCESSING' && (
                      <Button variant="ghost" disabled>
                        Processing…
                      </Button>
                    )}
                    {run.status === 'PROCESSED' && (
                      <PermissionGate permission={Permissions.PAYROLL_APPROVE}>
                        <Button
                          variant="primary"
                          leftIcon={<CheckCircle className="h-4 w-4"/>}
                          disabled={actionPending}
                          onClick={() =>
                            runAction(
                              (id, opts) => approveMutation.mutate(id, opts),
                              'Failed to approve payroll run'
                            )
                          }
                        >
                          Approve run
                        </Button>
                      </PermissionGate>
                    )}
                    {run.status === 'APPROVED' && (
                      <PermissionGate permission={Permissions.PAYROLL_APPROVE}>
                        <Button
                          variant="primary"
                          leftIcon={<Lock className="h-4 w-4"/>}
                          disabled={actionPending}
                          onClick={() =>
                            runAction(
                              (id, opts) => lockMutation.mutate(id, opts),
                              'Failed to lock payroll run'
                            )
                          }
                        >
                          Lock run
                        </Button>
                      </PermissionGate>
                    )}
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    {label: 'Payslips', value: String(payslips.length)},
                    {label: 'Total gross', value: formatCurrency(totalGross)},
                    {label: 'Total deductions', value: formatCurrency(totalDeductions)},
                    {label: 'Total net pay', value: formatCurrency(totalNet)},
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-elevated)] p-4"
                    >
                      <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                      <p className="text-lg font-semibold tabular-nums mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Payslip list */}
                <h2 className="text-lg font-semibold mb-3">Employee payslips</h2>
                {payslipsQuery.isLoading ? (
                  <Skeleton height={280} className="rounded-md"/>
                ) : payslips.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-8 w-8"/>}
                    title="No payslips yet"
                    description={
                      run.status === 'DRAFT'
                        ? 'Process this run to generate payslips for all active employees.'
                        : 'No payslips were generated for this run.'
                    }
                    iconColor="cyan"
                  />
                ) : (
                  <div
                    className="bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-elevated)] overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                      <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border-main)]">
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium text-right">Working days</th>
                        <th className="px-4 py-3 font-medium text-right">Present</th>
                        <th className="px-4 py-3 font-medium text-right">Leave</th>
                        <th className="px-4 py-3 font-medium text-right">Gross</th>
                        <th className="px-4 py-3 font-medium text-right">Deductions</th>
                        <th className="px-4 py-3 font-medium text-right">Net pay</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium" aria-label="Actions"/>
                      </tr>
                      </thead>
                      <tbody>
                      {payslips.map((payslip) => (
                        <tr
                          key={payslip.id}
                          className="border-b border-[var(--border-main)] last:border-b-0"
                        >
                          <td className="px-4 py-3 font-medium">
                            {employeeNames.get(payslip.employeeId) ?? payslip.employeeId}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {payslip.workingDays ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {payslip.presentDays ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {payslip.leaveDays ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(payslip.grossSalary)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-danger-600">
                            {formatCurrency(payslip.totalDeductions)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">
                            {formatCurrency(payslip.netSalary)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(run.status)}`}>
                              {payslipState}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Download payslip for ${employeeNames.get(payslip.employeeId) ?? payslip.employeeId}`}
                              disabled={downloadPdfMutation.isPending}
                              onClick={() => handleDownloadPdf(payslip)}
                            >
                              <Download className="h-4 w-4" aria-hidden="true"/>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </PageTransition>
      </PermissionGate>
    </AppLayout>
  );
}
