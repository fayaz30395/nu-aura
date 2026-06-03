'use client';

import React from 'react';
import {Payslip} from '@/lib/types/hrms/payroll';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Calendar, DollarSign, Download} from 'lucide-react';
import {formatCurrency} from '@/lib/utils';
import {formatDate as formatDateCanonical} from '@/lib/utils/format/date';

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

  const formatDate = (dateString: string) => formatDateCanonical(dateString);

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
        <div className="bg-[var(--accent)] p-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold truncate">{payslip.employeeName}</h3>
              <p className="text-sm text-[var(--accent)]/70 truncate mt-1">
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
          <div className="flex items-center gap-2 text-sm text-[var(--text-2)] mb-4 num">
            <Calendar className="h-4 w-4"/>
            <span>
              {formatDate(payslip.payrollPeriodStart)} - {formatDate(payslip.payrollPeriodEnd)}
            </span>
          </div>

          {/* Salary Breakdown */}
          <div className="space-y-4 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--text-2)]">Base Salary</span>
              <span className="font-medium text-[var(--text-1)] num">
                {formatCurrency(payslip.baseSalary)}
              </span>
            </div>

            {payslip.allowances > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-2)]">Allowances</span>
                <span className="font-medium text-[var(--ok-fg)] num">
                  +{formatCurrency(payslip.allowances)}
                </span>
              </div>
            )}

            {payslip.deductions > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-2)]">Deductions</span>
                <span className="font-medium text-[var(--err-fg)] num">
                  -{formatCurrency(payslip.deductions)}
                </span>
              </div>
            )}

            {/* Gross Amount */}
            <div
              className="flex justify-between items-center text-sm pt-2 border-t border-[var(--border)]">
              <span className="text-[var(--text-2)]">Gross Amount</span>
              <span className="font-medium text-[var(--text-1)] num">
                {formatCurrency(payslip.grossAmount)}
              </span>
            </div>

            {/* Net Amount */}
            <div
              className="flex justify-between items-center pt-4 border-t-2 border-[var(--border)]">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[var(--accent)]"/>
                <span className="font-semibold text-[var(--text-1)]">
                  Net Amount
                </span>
              </div>
              <span className="text-xl font-bold text-[var(--accent)] num">
                {formatCurrency(payslip.netAmount)}
              </span>
            </div>
          </div>

          {/* Payment Date */}
          <div className="mb-4 p-4 bg-[var(--surface-aura-2)] rounded-[var(--r-md)]">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--text-2)]">Payment Date</span>
              <span className="font-medium text-[var(--text-1)] num">
                {formatDate(payslip.paymentDate)}
              </span>
            </div>
          </div>

          {/* Download Button */}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Download className="h-4 w-4"/>}
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
