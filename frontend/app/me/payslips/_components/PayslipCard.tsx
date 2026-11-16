'use client';

import React from 'react';
import {Calendar, Download} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {formatCurrency} from '@/lib/utils';
import {formatDate, formatMonthYear} from '@/lib/utils/format/date';
import type {PayslipView} from '../payslipView';

interface PayslipCardProps {
  payslip: PayslipView;
  isAdminView: boolean;
  downloading: boolean;
  onDownload: (payslip: PayslipView) => void;
}

function AmountRow({label, amount, negative = false}: {label: string; amount: number; negative?: boolean}) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-text-2">{label}</dt>
      <dd className={`font-medium tabular-nums ${negative ? 'text-status-err-fg' : 'text-text-1'}`}>
        {negative ? '-' : ''}{formatCurrency(amount)}
      </dd>
    </div>
  );
}

export function PayslipCard({payslip, isAdminView, downloading, onDownload}: PayslipCardProps) {
  const hasBreakdown = payslip.allowanceDetails.length > 0 || payslip.deductionDetails.length > 0;

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
            <Calendar className="h-4 w-4" aria-hidden="true"/>
          </div>
          <div>
            {isAdminView && payslip.employeeName && (
              <p className="mb-1 text-xs font-medium text-accent">{payslip.employeeName}</p>
            )}
            <h3 className="text-base font-semibold text-text-1">{formatMonthYear(payslip.periodDate)}</h3>
            <p className="mt-1 text-xs text-text-2">Pay Date: {formatDate(payslip.payDate)}</p>
            {/* Everything the self view receives is released. Release is not payment, so no PAID. */}
            {!isAdminView && (
              <span className="mt-2 inline-flex h-5 items-center rounded-full bg-status-info-bg px-2 text-2xs font-semibold text-status-info-fg">
                Released
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-col gap-1 md:items-end">
            <p className="text-xs text-text-2">Net Salary</p>
            <p className="text-xl font-semibold tabular-nums text-status-ok-fg">{formatCurrency(payslip.netAmount)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums text-text-2">
            <span>Gross: {formatCurrency(payslip.grossAmount)}</span>
            <span aria-hidden="true">•</span>
            <span>Deductions: {formatCurrency(payslip.deductions)}</span>
          </div>
          <Button
            variant="soft"
            size="xs"
            onClick={() => onDownload(payslip)}
            disabled={downloading}
            isLoading={downloading}
            loadingText="Downloading..."
            aria-label={`Download payslip for ${formatMonthYear(payslip.periodDate)}`}
            data-testid="payslip-download"
            leftIcon={<Download className="h-4 w-4" aria-hidden="true"/>}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {hasBreakdown && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 md:grid-cols-2">
          {payslip.allowanceDetails.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-text-1">Earnings</h4>
              <dl className="flex flex-col gap-1">
                <AmountRow label="Base Salary" amount={payslip.baseSalary}/>
                {payslip.allowanceDetails.map((allowance, idx) => (
                  <AmountRow key={idx} label={allowance.name} amount={allowance.amount}/>
                ))}
              </dl>
            </div>
          )}
          {payslip.deductionDetails.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-text-1">Deductions</h4>
              <dl className="flex flex-col gap-1">
                {payslip.deductionDetails.map((deduction, idx) => (
                  <AmountRow key={idx} label={deduction.name} amount={deduction.amount} negative/>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
