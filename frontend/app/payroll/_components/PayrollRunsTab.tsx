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
              className="input-aura px-4 py-2 rounded-lg"
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
                <th className="skeuo-table-header px-6 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">Run Name</th>
                <th className="skeuo-table-header px-6 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">Period</th>
                <th className="skeuo-table-header px-6 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="skeuo-table-header px-6 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">Employees</th>
                <th className="skeuo-table-header px-6 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">Gross Amount</th>
                <th className="skeuo-table-header px-6 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">Actions</th>
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
                            className="px-2 py-1 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400 rounded text-xs hover:bg-accent-100 disabled:opacity-50"
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
                            className="px-2 py-1 bg-success-50 dark:bg-success-900/40 text-success-600 dark:text-success-400 rounded text-xs hover:bg-success-100 dark:hover:bg-success-900/60 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </PermissionGate>
                      )}
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => onEditRun(run)}
                          className="px-2 py-1 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400 rounded text-xs hover:bg-accent-100"
                        >
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => onDeleteRun(run)}
                          className="px-2 py-1 bg-danger-50 dark:bg-danger-900/40 text-danger-600 dark:text-danger-400 rounded text-xs hover:bg-danger-100 dark:hover:bg-danger-900/60"
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
