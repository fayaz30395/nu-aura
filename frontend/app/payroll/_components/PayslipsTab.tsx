'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { Payslip, formatCurrency, formatDate, getStatusColor } from './types';

interface PayslipsTabProps {
  payslips: Payslip[];
  loading: boolean;
  payslipSearchMonth: string;
  payslipSearchEmployee: string;
  onMonthChange: (month: string) => void;
  onEmployeeSearch: (query: string) => void;
  onCreatePayslip: () => void;
  onEditPayslip: (payslip: Payslip) => void;
  onDeletePayslip: (payslip: Payslip) => void;
}

export function PayslipsTab({
  payslips,
  loading,
  payslipSearchMonth,
  payslipSearchEmployee,
  onMonthChange,
  onEmployeeSearch,
  onCreatePayslip,
  onEditPayslip,
  onDeletePayslip,
}: PayslipsTabProps) {
  const filtered = payslips.filter((payslip) => {
    const payslipMonth = payslip.paymentDate.substring(0, 7);
    const employeeMatch =
      payslipSearchEmployee === '' ||
      (payslip.employeeName?.toLowerCase() || '').includes(payslipSearchEmployee.toLowerCase());
    const monthMatch = payslipSearchMonth === '' || payslipMonth === payslipSearchMonth;
    return employeeMatch && monthMatch;
  });

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Month</label>
            <input
              type="month"
              value={payslipSearchMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Employee Name</label>
            <input
              type="text"
              placeholder="Search by employee..."
              value={payslipSearchEmployee}
              onChange={(e) => onEmployeeSearch(e.target.value)}
              className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>
        <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
          <button
            onClick={onCreatePayslip}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Create Payslip
          </button>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading payslips...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No Payslips Found"
          description="Generate payslips for your employees to view their salary details and deductions"
          action={{ label: 'Create Payslip', onClick: onCreatePayslip }}
          iconColor="cyan"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((payslip) => (
            <div key={payslip.id} className="bg-[var(--bg-card)] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{payslip.employeeName}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{payslip.payrollRunName}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payslip.status)}`}>
                  {payslip.status}
                </span>
              </div>

              <div className="mb-4 pb-4 border-b">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-secondary)]">Period</span>
                  <span className="font-medium">
                    {formatDate(payslip.payrollPeriodStart)} -{' '}
                    {formatDate(payslip.payrollPeriodEnd)}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Base Salary</span>
                  <span className="font-medium">{formatCurrency(payslip.baseSalary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Allowances</span>
                  <span className="text-success-600 font-medium">{formatCurrency(payslip.allowances)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Deductions</span>
                  <span className="text-danger-600 font-medium">{formatCurrency(payslip.deductions)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-sm font-semibold">
                  <span className="text-[var(--text-primary)]">Net Amount</span>
                  <span className="text-accent-700 dark:text-accent-400">{formatCurrency(payslip.netAmount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                  <button
                    onClick={() => onEditPayslip(payslip)}
                    className="flex-1 px-4 py-2 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400 rounded hover:bg-accent-100 text-sm font-medium"
                  >
                    Edit
                  </button>
                </PermissionGate>
                <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                  <button
                    onClick={() => onDeletePayslip(payslip)}
                    className="flex-1 px-4 py-2 bg-danger-50 dark:bg-danger-900/40 text-danger-600 dark:text-danger-400 rounded hover:bg-danger-100 dark:hover:bg-danger-900/60 text-sm font-medium"
                  >
                    Delete
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
