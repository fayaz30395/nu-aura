// Payroll Management TypeScript Types

export type PayrollRunStatus = 'DRAFT' | 'PROCESSING' | 'PROCESSED' | 'APPROVED' | 'LOCKED';

export interface PayrollRun {
  id: string;
  runName: string;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  paymentDate: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGrossAmount: number;
  totalDeductions: number;
  totalNetAmount: number;
  processedBy?: string;
  processedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollRunRequest {
  runName: string;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  paymentDate: string;
  status?: PayrollRunStatus;
  notes?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName?: string;
  payrollRunId: string;
  payrollRunName?: string;
  paymentDate: string;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  grossAmount: number;
  netAmount: number;
  status: 'DRAFT' | 'FINALIZED' | 'PAID' | 'PENDING';
  processedAt?: string;
  paidAt?: string;
  allowanceDetails?: AllowanceDeduction[];
  deductionDetails?: AllowanceDeduction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PayslipRequest {
  employeeId: string;
  payrollRunId: string;
  paymentDate: string;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  baseSalary: number;
  allowances?: number;
  deductions?: number;
  status?: 'DRAFT' | 'FINALIZED' | 'PAID' | 'PENDING';
}

export interface AllowanceDeduction {
  id?: string;
  name: string;
  amount: number;
  type: 'ALLOWANCE' | 'DEDUCTION';
  percentage?: number;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  employeeName?: string;
  effectiveDate: string;
  baseSalary: number;
  allowances: SalaryComponent[];
  deductions: SalaryComponent[];
  totalAllowances: number;
  totalDeductions: number;
  totalCTC: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  approvedBy?: string;
  approvedDate?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryComponent {
  id?: string;
  name: string;
  amount: number;
  percentage?: number;
  type: 'FIXED' | 'VARIABLE';
  description?: string;
}

export interface SalaryStructureRequest {
  employeeId: string;
  effectiveDate: string;
  baseSalary: number;
  allowances?: SalaryComponent[];
  deductions?: SalaryComponent[];
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  empty: boolean;
}

// ─── Payroll Components (formula-based salary building blocks) ────────────────

export type ComponentType = 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';

export interface PayrollComponent {
  id: string;
  code: string;
  name: string;
  componentType: ComponentType;
  /** SpEL formula referencing other component codes, e.g. "basic * 0.4" */
  formula?: string;
  /** Fixed fallback value when no formula */
  defaultValue?: number;
  evaluationOrder: number;
  isActive: boolean;
  isTaxable: boolean;
  description?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollComponentRequest {
  code: string;
  name: string;
  componentType: ComponentType;
  formula?: string;
  defaultValue?: number;
  isActive?: boolean;
  isTaxable?: boolean;
  description?: string;
}

export interface EvaluateComponentsResponse {
  [code: string]: number;
}
