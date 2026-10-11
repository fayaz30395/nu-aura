import type {RunPayslip} from '@/lib/types/hrms/payroll';

export interface PayslipLine {
  name: string;
  amount: number;
}

/** What the payslips page renders, derived from the API's RunPayslip (payDate, netSalary, ...). */
export interface PayslipView {
  id: string;
  employeeId: string;
  /** The API does not send employee names; stays undefined until it does. */
  employeeName?: string;
  year: number;
  month: number;
  /** First day of the pay period (YYYY-MM-01), used to label the period. */
  periodDate: string;
  payDate: string;
  baseSalary: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  allowanceDetails: PayslipLine[];
  deductionDetails: PayslipLine[];
}

const amount = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const nonZero = (lines: PayslipLine[]): PayslipLine[] => lines.filter((line) => line.amount > 0);

export function toPayslipView(p: RunPayslip): PayslipView {
  const month = p.payPeriodMonth;
  const year = p.payPeriodYear;
  return {
    id: p.id,
    employeeId: p.employeeId,
    year,
    month,
    periodDate: `${year}-${String(month).padStart(2, '0')}-01`,
    payDate: p.payDate,
    baseSalary: amount(p.basicSalary),
    grossAmount: amount(p.grossSalary),
    deductions: amount(p.totalDeductions),
    netAmount: amount(p.netSalary),
    allowanceDetails: nonZero([
      {name: 'House Rent Allowance', amount: amount(p.hra)},
      {name: 'Conveyance Allowance', amount: amount(p.conveyanceAllowance)},
      {name: 'Medical Allowance', amount: amount(p.medicalAllowance)},
      {name: 'Special Allowance', amount: amount(p.specialAllowance)},
      {name: 'Other Allowances', amount: amount(p.otherAllowances)},
    ]),
    deductionDetails: nonZero([
      {name: 'Provident Fund', amount: amount(p.providentFund)},
      {name: 'Professional Tax', amount: amount(p.professionalTax)},
      {name: 'Income Tax', amount: amount(p.incomeTax)},
      {name: 'Other Deductions', amount: amount(p.otherDeductions)},
    ]),
  };
}
