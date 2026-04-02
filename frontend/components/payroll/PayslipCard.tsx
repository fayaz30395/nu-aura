'use client';

import React from 'react';
import { Payslip } from '@/lib/types/hrms/payroll';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Download, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PayslipCardProps {
  payslip: Payslip;
  onDownload: () => void;
  loading?: boolean;
}

export const PayslipCard: React.FC<PayslipCardProps> = ({
  payslip,
  onDownload,
  loading = false,
}) => {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'default' | 'primary' => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'FINALIZED':
        return 'primary';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card variant="elevated" hover className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-500 to-accent-700 p-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold truncate">{payslip.employeeName}</h3>
              <p className="text-sm text-accent-100 truncate mt-1">
                {payslip.payrollRunName}
              </p>
            </div>
            <Badge
              variant={getStatusVariant(payslip.status)}
              className="ml-2 bg-white/20 text-white border-white/30"
            >
              {payslip.status}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Period */}
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400 mb-4">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(payslip.payrollPeriodStart)} - {formatDate(payslip.payrollPeriodEnd)}
            </span>
          </div>

          {/* Salary Breakdown */}
          <div className="space-y-4 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-surface-600 dark:text-surface-400">Base Salary</span>
              <span className="font-medium text-surface-900 dark:text-surface-50">
                {formatCurrency(payslip.baseSalary)}
              </span>
            </div>

            {payslip.allowances > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-600 dark:text-surface-400">Allowances</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  +{formatCurrency(payslip.allowances)}
                </span>
              </div>
            )}

            {payslip.deductions > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-600 dark:text-surface-400">Deductions</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">
                  -{formatCurrency(payslip.deductions)}
                </span>
              </div>
            )}

            {/* Gross Amount */}
            <div className="flex justify-between items-center text-sm pt-2 border-t border-surface-200 dark:border-surface-700">
              <span className="text-surface-600 dark:text-surface-400">Gross Amount</span>
              <span className="font-medium text-surface-900 dark:text-surface-50">
                {formatCurrency(payslip.grossAmount)}
              </span>
            </div>

            {/* Net Amount */}
            <div className="flex justify-between items-center pt-4 border-t-2 border-surface-300 dark:border-surface-600">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent-500" />
                <span className="font-semibold text-surface-900 dark:text-surface-50">
                  Net Amount
                </span>
              </div>
              <span className="text-xl font-bold text-accent-700 dark:text-accent-400">
                {formatCurrency(payslip.netAmount)}
              </span>
            </div>
          </div>

          {/* Payment Date */}
          <div className="mb-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-surface-600 dark:text-surface-400">Payment Date</span>
              <span className="font-medium text-surface-900 dark:text-surface-50">
                {formatDate(payslip.paymentDate)}
              </span>
            </div>
          </div>

          {/* Download Button */}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={onDownload}
            disabled={loading}
            isLoading={loading}
            className="w-full"
          >
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
