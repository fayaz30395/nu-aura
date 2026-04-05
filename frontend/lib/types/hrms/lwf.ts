export type LWFFrequency = 'MONTHLY' | 'HALF_YEARLY' | 'YEARLY';
export type LWFDeductionStatus = 'CALCULATED' | 'DEDUCTED' | 'REMITTED';

export interface LWFConfiguration {
  id: string;
  stateCode: string;
  stateName: string;
  employeeContribution: number;
  employerContribution: number;
  frequency: LWFFrequency;
  applicableMonths: string; // JSON array e.g. "[6,12]"
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  salaryThreshold?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LWFConfigurationRequest {
  stateCode: string;
  stateName: string;
  employeeContribution: number;
  employerContribution: number;
  frequency: LWFFrequency;
  applicableMonths: string;
  isActive?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  salaryThreshold?: number;
}

export interface LWFDeduction {
  id: string;
  employeeId: string;
  payrollRunId?: string;
  stateCode: string;
  employeeAmount: number;
  employerAmount: number;
  frequency: LWFFrequency;
  deductionMonth: number;
  deductionYear: number;
  status: LWFDeductionStatus;
  grossSalary?: number;
  createdAt?: string;
}

export interface LWFCalculationRequest {
  payrollRunId?: string;
  month: number;
  year: number;
}

export interface LWFStateWiseSummary {
  stateCode: string;
  stateName: string;
  employeeTotal: number;
  employerTotal: number;
  total: number;
  employeeCount: number;
}

export interface LWFRemittanceReport {
  month: number;
  year: number;
  totalEmployeeContribution: number;
  totalEmployerContribution: number;
  grandTotal: number;
  totalEmployees: number;
  stateWiseSummary: LWFStateWiseSummary[];
}

/** Display-friendly frequency labels */
export const FREQUENCY_LABELS: Record<LWFFrequency, string> = {
  MONTHLY: 'Monthly',
  HALF_YEARLY: 'Half-Yearly',
  YEARLY: 'Yearly',
};

/** Display-friendly status labels with colors */
export const STATUS_CONFIG: Record<LWFDeductionStatus, { label: string; color: string }> = {
  CALCULATED: {label: 'Calculated', color: 'blue'},
  DEDUCTED: {label: 'Deducted', color: 'orange'},
  REMITTED: {label: 'Remitted', color: 'green'},
};
