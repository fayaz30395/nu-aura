'use client';

import React from 'react';
import { Banknote } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { PayrollRun, PayrollRunStatus, formatCurrency, formatDate, getStatusColor } from './types';

interface PayrollRunsTabProps {
  payrollRuns: PayrollRun[];
  loading: boolean;
  payrollRunFilter: PayrollRunStatus | 'ALL';
  onFilterChange: (filter: PayrollRunStatus | 'ALL') => void;
  onCreateRun: () => void;
  onEditRun: (run: PayrollRun) => void;
  onProcessRun: (run: PayrollRun) => void;
  onApproveRun: (run: PayrollRun) => void;
  onDeleteRun: (run: PayrollRun) => void;
}

export function PayrollRunsTab({
  payrollRuns,
  loading,
  payrollRunFilter,
  onFilterChange,
  onCreateRun,
  onEditRun,
  onProcessRun,
  onApproveRun,
  onDeleteRun,
}: PayrollRunsTabProps) {
  const filtered = payrollRuns.filter(
    (run) => payrollRunFilter === 'ALL' || run.status === payrollRunFilter
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Filter by Status
            </label>
            <select
              value={payrollRunFilter}
              onChange={(e) => onFilterChange(e.target.value as PayrollRunStatus | 'ALL')}
              className="input-aura px-3 py-2 rounded-lg"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PROCESSING">Processing</option>
              <option value="PROCESSED">Processed</option>
              <option value="APPROVED">Approved</option>
              <option value="LOCKED">Locked</option>
            </select>
          </div>
        </div>
        <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
          <button
            onClick={onCreateRun}
            className="btn-primary px-4 py-2 rounded-lg"
          >
            Create Payroll Run
          </button>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading payroll runs...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-8 w-8" />}
          title="No Payroll Runs Yet"
          description="Create your first payroll run to manage employee salaries and payments"
          action={{ label: 'Create Payroll Run', onClick: onCreateRun }}
          iconColor="blue"
        />
      ) : (
        <div className="skeuo-card overflow-x-auto rounded-xl border border-[var(--border-main)]">
          <table className="table-aura w-full">
            <thead>
              <tr>
                <th className="skeuo-table-header px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Run Name</th>
                <th className="skeuo-table-header px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Period</th>
                <th className="skeuo-table-header px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="skeuo-table-header px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Employees</th>
                <th className="skeuo-table-header px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Gross Amount</th>
                <th className="skeuo-table-header px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.id} className="border-b hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                  <td className="px-6 py-4 text-sm font-medium">{run.runName}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {formatDate(run.payrollPeriodStart)} - {formatDate(run.payrollPeriodEnd)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`badge-status px-2 py-1 rounded text-xs font-medium ${getStatusColor(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{run.totalEmployees}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(run.totalGrossAmount)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {run.status === 'DRAFT' && (
                        <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                          <button
                            onClick={() => onProcessRun(run)}
                            disabled={loading}
                            className="px-2 py-1 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 rounded text-xs hover:bg-sky-100 disabled:opacity-50"
                          >
                            Process
                          </button>
                        </PermissionGate>
                      )}
                      {run.status === 'PROCESSED' && (
                        <PermissionGate permission={Permissions.PAYROLL_APPROVE}>
                          <button
                            onClick={() => onApproveRun(run)}
                            disabled={loading}
                            className="px-2 py-1 bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded text-xs hover:bg-green-100 dark:hover:bg-green-900/60 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </PermissionGate>
                      )}
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => onEditRun(run)}
                          className="px-2 py-1 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 rounded text-xs hover:bg-sky-100"
                        >
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => onDeleteRun(run)}
                          className="px-2 py-1 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded text-xs hover:bg-red-100 dark:hover:bg-red-900/60"
                        >
                          Delete
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
